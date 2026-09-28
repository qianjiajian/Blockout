import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const strict = process.argv.includes("--strict");
const writeReport = process.argv.includes("--write");
const detailLevelId = Number(process.argv.find((argument) => argument.startsWith("--level="))?.split("=")[1] ?? 0);
const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS } from "./src/core/levels.ts";
      export { auditOrdinaryShutterCoverage } from "./src/core/shutterCoverage.ts";
    `,
    resolveDir: root,
    sourcefile: "audit-shutter-regions-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const diagnosticRows = runtime.LEVELS.flatMap((level) => {
  const issues = runtime.auditOrdinaryShutterCoverage(level);
  return issues.length ? [{
    levelId: level.id,
    shutterIds: [...new Set(issues.map(({ shutterId }) => shutterId))],
    issueCount: issues.length,
    issues,
  }] : [];
});
const rows = diagnosticRows.flatMap((row) => {
  const issues = row.issues.filter(({ kind }) => kind !== "missing-hidden-cohort");
  return issues.length ? [{
    ...row,
    shutterIds: [...new Set(issues.map(({ shutterId }) => shutterId))],
    issueCount: issues.length,
    issues,
  }] : [];
});
const emptyCoverRows = diagnosticRows.flatMap((row) => {
  const issues = row.issues.filter(({ kind }) => kind === "missing-hidden-cohort");
  return issues.length ? [{ levelId: row.levelId, shutterIds: [...new Set(issues.map(({ shutterId }) => shutterId))] }] : [];
});
const report = {
  policy: "ordinary-shutter-visible-reserved-region-consistency-v2",
  emptyCoverPolicy: "diagnostic-only: a countdown panel may intentionally unlock manoeuvring space without owning cargo",
  auditedLevels: runtime.LEVELS.length,
  affectedLevels: rows.length,
  affectedLevelIds: rows.map(({ levelId }) => levelId),
  issueCount: rows.reduce((sum, row) => sum + row.issueCount, 0),
  emptyCoverDiagnostics: emptyCoverRows,
  levels: rows,
  ...(detailLevelId > 0 ? {
    detail: runtime.LEVELS.filter(({ id }) => id === detailLevelId).map((level) => ({
      levelId: level.id,
      width: level.width,
      height: level.height,
      playable: level.playable,
      shutters: level.shutters,
      blocks: level.blocks.map(({ id, x, y, shape, color, shutterId }) => ({ id, x, y, shape, color, shutterId })),
      generators: level.generators,
    })),
  } : {}),
};
console.log(JSON.stringify(report, null, 2));
if (writeReport) {
  const outputDir = resolve(root, "playtest-results", "mechanism-audit-2026-09-19");
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "shutter-regions.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
if (strict && rows.length) process.exitCode = 1;
