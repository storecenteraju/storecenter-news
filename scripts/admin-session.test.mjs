import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'storecenter-session-'));
fs.writeFileSync(path.join(temp, 'db.json'), JSON.stringify({ posts: [{ id: 'exact-post', title: 'Original' }], settings: {}, feeds: [], ads: [] }));
process.chdir(temp);
process.env.STATIC_PUBLISH_MODE = 'true';
process.env.ADMIN_SESSION_SECRET = 'isolated-test-secret';
process.env.ADMIN_USER = 'test-editor';
process.env.ADMIN_PASSWORD = 'test-password-only';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const { app } = await import('../api/server.ts');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

test('persistent login restores from a signed cookie, rejects tampering, and logout clears it', async () => {
  try {
    assert.equal((await fetch(`${base}/api/session`)).status, 401);
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test-editor', password: 'test-password-only' }) });
    assert.equal(login.status, 200);
    const header = login.headers.get('set-cookie');
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    assert.match(header, /Max-Age=34560000/);
    const cookie = header.split(';')[0];
    const restored = await fetch(`${base}/api/session`, { headers: { cookie } });
    assert.deepEqual(await restored.json(), { authenticated: true, username: 'test-editor' });
    assert.ok(restored.headers.get('set-cookie'));
    const payload = Buffer.from(JSON.stringify({ sub: 'test-editor', exp: Date.now() - 1 })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
    assert.equal((await fetch(`${base}/api/session`, { headers: { cookie: `storecenter_admin_session=${payload}.${signature}` } })).status, 401);
    assert.equal((await fetch(`${base}/api/session`, { headers: { cookie: cookie + 'tampered' } })).status, 401);
    const saved = await fetch(`${base}/api/posts/exact-post`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Edited' }) });
    assert.equal(saved.status, 503);
    assert.match((await saved.json()).error, /permanente/);
    const logout = await fetch(`${base}/api/logout`, { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /storecenter_admin_session=;/);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'db.json'), 'utf8')).posts[0].title, 'Original');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    process.chdir(originalCwd);
    try {
      fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (error) {
      console.warn('Pasta temporaria ainda em uso; limpeza adiada:', temp, error.code);
    }
  }
});
