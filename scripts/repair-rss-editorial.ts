import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sanitizeRssPost } from '../src/lib/rss-editorial.js';
import { withSupplementalRssFeeds } from '../src/lib/rss-sources.js';

const databasePath = path.join(process.cwd(), 'db.json');
const original = fs.readFileSync(databasePath, 'utf8');
const database = JSON.parse(original);
let changedPosts = 0;
database.posts = (database.posts || []).map((post: any) => {
  const repaired = sanitizeRssPost(post);
  if (JSON.stringify(repaired) !== JSON.stringify(post)) changedPosts++;
  return repaired;
});
const previousFeedCount = (database.feeds || []).length;
database.feeds = withSupplementalRssFeeds(database.feeds || []);
const updated = JSON.stringify(database, null, 2);
if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(database)) {
  const backupPath = path.join(os.tmpdir(), `storecenter-db-before-editorial-${Date.now()}.json`);
  fs.writeFileSync(backupPath, original, 'utf8');
  fs.writeFileSync(databasePath, updated, 'utf8');
  console.log(`[REPARO] Backup: ${backupPath}`);
}
console.log(`[REPARO] ${changedPosts} matérias corrigidas; ${database.feeds.length - previousFeedCount} feeds adicionados. IDs, URLs, imagens e origens preservados.`);
