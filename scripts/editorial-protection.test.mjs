import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { changedPostFields, persistManualUpdate, applyManualOverrides, repairSelectedPosts, automaticPostUpdate } from '../src/lib/editorial-protection.ts';
import { sanitizeRssPost } from '../src/lib/rss-editorial.ts';
import { normalizePost } from '../src/types.ts';
import { loadManualEditsForBuild } from './load-manual-edits.mjs';

test('opening an RSS article preserves manually chosen text, title, category and image exactly', () => {
  const post = { id: 'a', title: 'Meu título manual Fonte 2', content: 'Minha introdução\n\nO que aconteceu', category: 'Economia', image: 'manual.jpg', rssOriginalTitle: 'Outro título', tags: ['Meu assunto'], status: 'published', date: '2026-11-01T12:00:00.000Z' };
  const result = normalizePost(post);
  for (const field of ['title', 'content', 'category', 'image', 'tags']) assert.deepEqual(result[field], post[field]);
});

test('changing only the image sends only image; a stale form cannot overwrite another edit', async () => {
  const original = { id: 'a', title: 'Original', category: 'Economia', image: 'old.jpg', content: 'Texto', seoTitle: '' };
  const changes = changedPostFields(original, { ...original, image: 'new.jpg' });
  assert.deepEqual(changes, { image: 'new.jpg' });
  const cloud = { ...original, title: 'Título atualizado em outra sessão' };
  const store = { collection: name => { assert.equal(name, 'posts'); return { doc: id => { assert.equal(id, 'a'); return { set: async (update, options) => { assert.deepEqual(options, { merge: true }); Object.assign(cloud, update); } }; } }; } };
  await persistManualUpdate(store, original, changes, '2026-11-01T22:00:00Z');
  assert.equal(cloud.image, 'new.jpg');
  assert.equal(cloud.title, 'Título atualizado em outra sessão');
  assert.equal(cloud.category, 'Economia');
  assert.equal(cloud.manualFields.image, true);
  assert.equal(original.image, 'old.jpg');
});

test('failed persistence never reports a saved edit or modifies the cached article', async () => {
  const original = { id: 'a', image: 'manual.jpg' };
  const store = { collection: () => ({ doc: () => ({ set: async () => { throw new Error('Firestore indisponível'); } }) }) };
  await assert.rejects(persistManualUpdate(store, original, { image: 'new.jpg' }, 'now'), /indisponível/);
  await assert.rejects(persistManualUpdate(null, original, { image: 'new.jpg' }, 'now'), /permanente/);
  assert.deepEqual(original, { id: 'a', image: 'manual.jpg' });
});

test('repairs require selected IDs and fields and cannot touch protected fields implicitly', () => {
  const posts = [{ id: 'a', title: 'Bolsa Família: o que muda para os próximos jogos?', rssOriginalTitle: 'Bolsa Família: veja calendário', content: 'Texto manual', image: 'manual.jpg' }, { id: 'b', title: 'Outra notícia', image: 'outra-manual.jpg' }];
  assert.throws(() => repairSelectedPosts(posts, [], ['title'], sanitizeRssPost), /explicitamente/);
  const result = repairSelectedPosts(posts, ['a'], ['title'], sanitizeRssPost);
  assert.equal(result[0].title, 'Bolsa Família: calendário');
  assert.equal(result[0].content, posts[0].content);
  assert.equal(result[0].image, posts[0].image);
  assert.equal(result[1], posts[1]);
  assert.throws(() => repairSelectedPosts([{ ...posts[0], manualFields: { title: true } }], ['a'], ['title'], sanitizeRssPost), /protegido/);
  assert.throws(() => repairSelectedPosts(posts, ['missing'], ['title'], sanitizeRssPost), /ID não encontrado/);
});

test('static fallback applies only fields approved by manual edits to their exact IDs', () => {
  const posts = [{ id: 'a', image: 'automatic.svg', title: 'Título', content: 'Conteúdo' }, { id: 'b', image: 'manual-b.jpg' }];
  const result = applyManualOverrides(posts, [{ id: 'a', fields: { image: '/assets/manual/a.jpg' }, editedAt: 'now' }]);
  assert.equal(result[0].image, '/assets/manual/a.jpg');
  assert.equal(result[0].title, posts[0].title);
  assert.equal(result[0].content, posts[0].content);
  assert.equal(result[1], posts[1]);
  assert.throws(() => applyManualOverrides(posts, [{ id: 'a', fields: { id: 'b' } }]), /não autorizados/);
  const newer = { ...posts[0], image: 'manual-mais-nova.jpg', manualEditedAt: '2026-11-02T12:00:00Z' };
  assert.equal(applyManualOverrides([newer], [{ id: 'a', fields: { image: 'antiga.jpg' }, editedAt: '2026-11-01T12:00:00Z' }])[0], newer);
});

test('automatic writes retain manual image/title; an explicitly due schedule can still publish', () => {
  const current = { image: 'manual.jpg', title: 'Manual', status: 'scheduled', publishAt: '2020-01-01', manualFields: { image: true, title: true, status: true } };
  const update = automaticPostUpdate(current, { image: 'fallback.svg', title: 'Mudado', status: 'published', date: '2026-11-01', manualFields: {} });
  assert.equal(update.image, undefined);
  assert.equal(update.title, undefined);
  assert.equal(update.manualFields, undefined);
  assert.equal(update.status, 'published');
});

test('build refuses to publish an unverified manual-edit snapshot on service failure', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storecenter-manual-'));
  const previous = process.env.MANUAL_EDITS_SYNC;
  delete process.env.MANUAL_EDITS_SYNC;
  try {
    fs.writeFileSync(path.join(root, 'manual-overrides.json'), JSON.stringify([{ id: 'a', fields: { image: 'manual.jpg' } }]));
    await assert.rejects(loadManualEditsForBuild(root, async () => new Response('', { status: 503 })), /interrompida/);
    const result = await loadManualEditsForBuild(root, async () => Response.json({ version: 1, overrides: [{ id: 'a', fields: { title: 'Manual novo' } }] }));
    assert.deepEqual(result[0].fields, { image: 'manual.jpg', title: 'Manual novo' });
    const bootstrap = await loadManualEditsForBuild(root, async () => new Response('', { status: 404 }));
    assert.equal(bootstrap[0].fields.image, 'manual.jpg');
  } finally {
    if (previous === undefined) delete process.env.MANUAL_EDITS_SYNC; else process.env.MANUAL_EDITS_SYNC = previous;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('running the repair command without a scope leaves the database bytes untouched', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storecenter-scope-'));
  try {
    const original = '{"posts":[{"id":"a","image":"manual.jpg"}]}';
    fs.writeFileSync(path.join(root, 'db.json'), original);
    const script = path.resolve('scripts/repair-rss-editorial.ts');
    const loader = pathToFileURL(path.resolve('node_modules/tsx/dist/loader.mjs')).href;
    const result = spawnSync(process.execPath, ['--import', loader, script], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reparo global está desativado/);
    assert.equal(fs.readFileSync(path.join(root, 'db.json'), 'utf8'), original);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
