process.env.STATIC_PUBLISH_MODE = "true";
process.env.VERCEL = "1";
process.env.RSS_MAX_POSTS_PER_RUN ||= "1";
process.env.RSS_ENABLE_AI_IMAGE_GENERATION ||= "false";
process.env.RSS_DEFAULT_IMAGE_POLICY ||= "reference_only";

const dryRun = ["1", "true", "sim", "yes"]
  .includes(String(process.env.DRY_RUN || "false").toLowerCase());

const { runRssCronOnce } = await import("../api/server.ts");
const result = await runRssCronOnce({ dryRun, maxPosts: 1 });

console.log(JSON.stringify({
  status: result.success ? "success" : "error",
  dryRun,
  created: result.totalImported || 0,
  details: result.importedDetails || [],
  previewPost: result.previewPost || null,
  message: result.message || null
}, null, 2));

if (!result.success) {
  process.exitCode = 1;
}
