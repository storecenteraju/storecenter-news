import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { applyManualOverrides } from '../src/lib/editorial-protection.js';

const option = (name: string) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || '';
const ids = option('ids').split(',').map(value => value.trim()).filter(Boolean);
if (!ids.length) throw new Error('Informe os IDs exatos das capas autorizadas.');
const databasePath = path.join(process.cwd(), 'db.json');
const snapshotPath = path.join(process.cwd(), 'manual-overrides.json');
const original = fs.readFileSync(databasePath, 'utf8');
const database = JSON.parse(original);
let source: any;
const fallback = option('fallback-file') ? JSON.parse(fs.readFileSync(option('fallback-file'), 'utf8')) : { posts: [] };
if (option('source-file')) source = JSON.parse(fs.readFileSync(option('source-file'), 'utf8'));
else {
  try {
    const response = await fetch('https://www.storecenter.com.br/api/portal-data', { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    source = await response.json();
  } catch (error) {
    if (!option('fallback-file')) throw error;
    source = { posts: [] };
    console.log('[MANUAL] API indisponível; usando somente as três capas recuperadas para esta solicitação.');
  }
}
const overrides: any[] = [];
const assets: { file: string; bytes: Buffer }[] = [];
for (const id of ids) {
  if (!database.posts.some((post: any) => String(post.id) === id)) throw new Error(`ID não encontrado na base local: ${id}`);
  const post = source.posts?.find((post: any) => String(post.id) === id);
  let image = String(post?.image || '');
  if (!image || image.startsWith('/assets/editorial/')) {
    const recovered = fallback.posts?.find((post: any) => String(post.id) === id);
    if (recovered?.image) {
      image = recovered.image;
      console.log(`[MANUAL] Recuperando a capa previamente salva de ${id}; a API retornou a reserva antiga.`);
    }
  }
  const match = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw new Error(`A capa manual de ${id} não foi recuperada. Nenhuma alteração foi aplicada.`);
  const bytes = Buffer.from(match[2], 'base64');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const asset = `/assets/manual/${id}-${hash}.${extension}`;
  assets.push({ file: path.join(process.cwd(), 'public', asset), bytes });
  overrides.push({ id, fields: { image: asset }, editedAt: new Date().toISOString() });
}
// Validate every requested image before writing any file. Never import a whole
// remote post: title, text, category and the other publications stay untouched.
const before = database.posts;
database.posts = applyManualOverrides(before, overrides);
for (let index = 0; index < before.length; index++) {
  const a = before[index], b = database.posts[index];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (ids.includes(String(a.id)) && ['image', 'manualFields', 'manuallyEdited', 'manualEditedAt'].includes(key)) continue;
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) throw new Error(`Alteração fora do escopo: ${a.id}/${key}`);
  }
}
const saved = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) : [];
const records = new Map(saved.map((record: any) => [String(record.id), record]));
for (const override of overrides) records.set(override.id, override);
const backup = path.join(os.tmpdir(), `storecenter-before-manual-image-protection-${Date.now()}.json`);
fs.writeFileSync(backup, original, 'utf8');
for (const asset of assets) {
  fs.mkdirSync(path.dirname(asset.file), { recursive: true });
  fs.writeFileSync(asset.file, asset.bytes);
}
fs.writeFileSync(snapshotPath, JSON.stringify(Array.from(records.values()), null, 2) + '\n', 'utf8');
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
console.log(`[MANUAL] ${ids.length} capas preservadas. Apenas imagem e marcadores de proteção foram alterados nos IDs: ${ids.join(', ')}.`);
console.log(`[MANUAL] Backup: ${backup}`);
