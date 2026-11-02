import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sanitizeRssPost } from '../src/lib/rss-editorial.js';
import { repairSelectedPosts } from '../src/lib/editorial-protection.js';

const option = (name: string) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || '';
const ids = option('ids').split(',').map(value => value.trim()).filter(Boolean);
const fields = option('fields').split(',').map(value => value.trim()).filter(Boolean);
if (!ids.length || !fields.length) throw new Error('Informe --ids=ID e --fields=campo. O reparo global está desativado. Nenhuma alteração foi feita.');

const databasePath = path.join(process.cwd(), 'db.json');
const original = fs.readFileSync(databasePath, 'utf8');
const database = JSON.parse(original);
let changedPosts = 0;
const before = database.posts || [];
database.posts = repairSelectedPosts(before, ids, fields, sanitizeRssPost, process.argv.includes('--allow-manual'));
changedPosts = database.posts.filter((post: any, index: number) => post !== before[index]).length;
const updated = JSON.stringify(database, null, 2);
if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(database)) {
  const backupPath = path.join(os.tmpdir(), `storecenter-db-before-editorial-${Date.now()}.json`);
  fs.writeFileSync(backupPath, original, 'utf8');
  fs.writeFileSync(databasePath, updated, 'utf8');
  console.log(`[REPARO] Backup: ${backupPath}`);
}
console.log(`[REPARO] ${changedPosts} matérias corrigidas. IDs autorizados: ${ids.join(', ')}. Campos autorizados: ${fields.join(', ')}.`);
