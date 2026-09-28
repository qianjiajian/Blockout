import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const levelsPath = resolve(root, process.env.DEBUG_LEVELS_RELATIVE);
const routesPath = resolve(root, process.env.DEBUG_ROUTES_RELATIVE);
const id = Number(process.env.DEBUG_LEVEL_ID);
const bundled = await build({
  stdin: {
    contents: `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(levelsPath)}; export { PuzzleModel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const module = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString("base64")}`);
const routeArtifact = JSON.parse(await readFile(routesPath, "utf8"));
const routeEntry = (routeArtifact.levels ?? routeArtifact).find((entry) => Number(entry.level?.id ?? String(entry.level_id).replace(/^Lv/i, "")) === id);
const model = new module.PuzzleModel(module.levels.find((level) => level.id === id));
const concise = () => {
  const snapshot = model.snapshot();
  return { cleared: snapshot.cleared, gates: snapshot.gates, blocks: snapshot.blocks.map(({ id, x, y, shape, color, layers, frozen }) => ({ id, x, y, shape, color, layers, frozen })) };
};
for (const [index, event] of (routeEntry.events ?? routeEntry.route).entries()) {
  let failedStep = null;
  for (const point of event.path ?? []) {
    if (!model.moveBlock(event.blockId, point[0], point[1])) { failedStep = point; break; }
  }
  if (failedStep) {
    console.log(JSON.stringify({ index, event, failedStep, snapshot: concise() }, null, 2));
    process.exit(1);
  }
  if (event.exitSide) {
    const status = model.exitAttemptStatus(event.blockId, event.exitSide);
    if (status !== "ok") {
      console.log(JSON.stringify({ index, event, status, snapshot: concise() }, null, 2));
      process.exit(1);
    }
    model.tryExit(event.blockId, event.exitSide);
  }
}
console.log(JSON.stringify({ complete: model.snapshot().complete, blocks: model.snapshot().blocks.length }, null, 2));
