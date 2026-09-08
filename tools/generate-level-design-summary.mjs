import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const documentPath = resolve(root, "docs/level-design-100.md");
const reportPath = resolve(root, "playtest-results/latest-100-level-pointer-report.json");
const summaryPath = resolve(root, "playtest-results/latest-level-design-summary.json");
const checkOnly = process.argv.includes("--check");
const startMarker = "<!-- LEVEL-DESIGN-GENERATED:START -->";
const endMarker = "<!-- LEVEL-DESIGN-GENERATED:END -->";

const vite = await createServer({ root, logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
try {
  const [{ LEVELS }, summaryModule] = await Promise.all([
    vite.ssrLoadModule("/src/core/levels.ts"),
    vite.ssrLoadModule("/src/core/levelDesignSummary.ts"),
  ]);
  const summary = summaryModule.buildLevelDesignSummary(LEVELS);
  const pointerReport = JSON.parse(await readFile(reportPath, "utf8"));
  const pointer = summaryModule.buildPointerCampaignEvidence(pointerReport, LEVELS);
  const generated = summaryModule.renderLevelDesignGeneratedMarkdown(summary, pointer);
  const document = await readFile(documentPath, "utf8");
  const start = document.indexOf(startMarker);
  const end = document.indexOf(endMarker);
  if (start < 0 || end < start) throw new Error("Level design document is missing generated-section markers");
  const expected = `${document.slice(0, start + startMarker.length)}\n\n${generated}\n\n${document.slice(end)}`;
  if (checkOnly) {
    if (document !== expected) throw new Error("Level design document drifted; run pnpm docs:levels after a current full-campaign replay");
    const storedSummary = JSON.parse(await readFile(summaryPath, "utf8"));
    if (JSON.stringify(storedSummary) !== JSON.stringify({ summary, pointer })) {
      throw new Error("Level design JSON summary drifted; run pnpm docs:levels");
    }
    console.log(`Verified generated level design: ${summary.levelCount} levels, ${summary.uniqueSilhouettes} silhouettes, ${pointer.pointerGestures} Pointer gestures.`);
  } else {
    await writeFile(documentPath, expected, "utf8");
    await writeFile(summaryPath, `${JSON.stringify({ summary, pointer }, null, 2)}\n`, "utf8");
    console.log(`Generated current 100-level design document and ${summaryPath}.`);
  }
} finally {
  await vite.close();
}
