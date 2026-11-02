import fs from "node:fs";
import path from "node:path";
import { applyManualOverrides } from "../src/lib/editorial-protection.ts";
import { loadManualEditsForBuild } from './load-manual-edits.mjs';

const rootDir = process.cwd();
const databasePath = path.join(rootDir, "db.json");
const outputDir = path.join(rootDir, "public", "data");
const outputPath = path.join(outputDir, "site-data.json");

const database = JSON.parse(fs.readFileSync(databasePath, "utf8"));
const manualEdits = await loadManualEditsForBuild(rootDir);
const publicData = {
  generatedAt: new Date().toISOString(),
  posts: applyManualOverrides(Array.isArray(database.posts) ? database.posts : [], manualEdits),
  feeds: Array.isArray(database.feeds) ? database.feeds : [],
  ads: Array.isArray(database.ads) ? database.ads : [],
  settings: database.settings && typeof database.settings === "object" ? database.settings : {}
};

// Copy only fields explicitly marked as manual edits into the deployment
// baseline. This is a literal synchronization, never an editorial cleanup.
if (JSON.stringify(database.posts) !== JSON.stringify(publicData.posts)) {
  database.posts = publicData.posts;
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(publicData, null, 2)}\n`, "utf8");
console.log(`[STATIC] ${publicData.posts.length} matérias preparadas em ${outputPath}.`);
