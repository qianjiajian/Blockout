import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const documentPath = resolve(root, "docs/economy-balance.md");
const reportPath = resolve(root, "playtest-results/latest-100-level-pointer-report.json");
const summaryPath = resolve(root, "playtest-results/latest-economy-balance.json");
const checkOnly = process.argv.includes("--check");

const vite = await createServer({ root, logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
try {
  const [{ LEVELS }, economyModule] = await Promise.all([
    vite.ssrLoadModule("/src/core/levels.ts"),
    vite.ssrLoadModule("/src/core/economyBalance.ts"),
  ]);
  const pointerReport = JSON.parse(await readFile(reportPath, "utf8"));
  if (!Array.isArray(pointerReport.levels) || pointerReport.levels.length !== LEVELS.length) {
    throw new Error("Economy report requires a current complete 100-level Pointer report");
  }
  const minimumRemaining = pointerReport.levels.reduce((minimum, level) => (
    level.remainingSeconds < minimum.remainingSeconds ? level : minimum
  ));
  const minimumRemainingLevels = pointerReport.levels
    .filter((level) => level.remainingSeconds === minimumRemaining.remainingSeconds)
    .map((level) => level.levelId);
  const pointer = {
    levelsPassed: pointerReport.levelsPassed,
    pointerGestures: pointerReport.pointerGestures,
    pointerGridSteps: pointerReport.pointerGridSteps,
    minimumRemainingSeconds: minimumRemaining.remainingSeconds,
    minimumRemainingLevel: minimumRemaining.levelId,
    minimumRemainingLevels,
  };
  const summary = economyModule.buildEconomyBalance(LEVELS);
  const document = economyModule.renderEconomyBalanceMarkdown(summary, pointer);
  const json = `${JSON.stringify({ summary, pointer }, null, 2)}\n`;

  if (checkOnly) {
    const [storedDocument, storedSummary] = await Promise.all([
      readFile(documentPath, "utf8"),
      readFile(summaryPath, "utf8"),
    ]);
    if (storedDocument !== document || storedSummary !== json) {
      throw new Error("Economy balance evidence drifted; run pnpm docs:economy after a current full-campaign replay");
    }
    console.log(`Verified economy balance: ${summary.campaignReward} campaign coins, ${summary.averagePricePurchases} average-price purchases, Lv ${summary.unlocks.map((item) => item.level).join("/")} unlocks.`);
  } else {
    await Promise.all([
      writeFile(documentPath, document, "utf8"),
      writeFile(summaryPath, json, "utf8"),
    ]);
    console.log(`Generated ${documentPath} and ${summaryPath}.`);
  }
} finally {
  await vite.close();
}
