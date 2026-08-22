import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const databasePath = path.join(rootDir, "db.json");
const outputDir = path.join(rootDir, "public", "data");
const outputPath = path.join(outputDir, "site-data.json");

const database = JSON.parse(fs.readFileSync(databasePath, "utf8"));
const publicData = {
  generatedAt: new Date().toISOString(),
  posts: Array.isArray(database.posts) ? database.posts : [],
  feeds: Array.isArray(database.feeds) ? database.feeds : [],
  ads: Array.isArray(database.ads) ? database.ads : [],
  settings: database.settings && typeof database.settings === "object" ? database.settings : {}
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(publicData, null, 2)}\n`, "utf8");
console.log(`[STATIC] ${publicData.posts.length} matérias preparadas em ${outputPath}.`);
