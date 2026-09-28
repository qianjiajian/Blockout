import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = resolve(root, "deliverables/axis-retry-20260926/agent101");
await mkdir(out, { recursive: true });
const src = `export {LEVELS} from ${JSON.stringify(resolve(root, "src/core/levels.ts"))}; export {PuzzleModel} from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))}; export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from ${JSON.stringify(resolve(root, "src/game/continuousDrag.ts"))};`;
const bundle = await build({ stdin: { contents: src, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(out, `.state-api-${process.pid}.mjs`);
await writeFile(modulePath, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(modulePath).href);
const raw = JSON.parse(await readFile(resolve(root, "deliverables/remake101-110-v146-20260924/proof101-v152/enriched101-1790326396635.json"), "utf8"));
const live = api.LEVELS.find((level) => level.id === 101);
const hidden = new Map(raw.level.blocks.filter((block) => block.shutterId === "r147-101-cover4").map((block) => [block.id, block]));
const level = { ...live, blocks: live.blocks.map((block) => {
  const source = hidden.get(block.id);
  return source ? { ...block, x: source.x, y: source.y, shape: source.shape.map((cell) => [...cell]), movementAxis: undefined } : block;
}) };
const model = new api.PuzzleModel(level);
model.startCountdown();
const autoExit = (instance, blockId, previous) => {
  const block = instance.getBlock(blockId);
  if (!block || !instance.isBlockActive(block)) return undefined;
  const sides = instance.possibleExitSides(block);
  const snapshot = instance.snapshot();
  const candidates = api.matchingContinuousExitPortals(snapshot, block, sides);
  const [grabX, grabY] = block.shape[0];
  const pointer = { x: block.x + grabX + 0.5, y: block.y + grabY + 0.5 };
  const inferred = previous
    ? block.x < previous[0] ? "left" : block.x > previous[0] ? "right"
      : block.y < previous[1] ? "top" : block.y > previous[1] ? "bottom" : undefined
    : undefined;
  return api.choosePortalReleaseCandidate(candidates, pointer, {
    innerX: 0, innerY: 0, innerWidth: snapshot.width, innerHeight: snapshot.height, cell: 1,
  }, inferred)?.portal.side;
};
const drag = (entry) => {
  model.beginAction();
  let automatic = autoExit(model, entry.blockId);
  if (automatic && entry.path.length) throw new Error(`auto down ${entry.blockId}`);
  for (let i = 0; i < entry.path.length; i += 1) {
    const block = model.getBlock(entry.blockId);
    const previous = block ? [block.x, block.y] : undefined;
    const [x, y] = entry.path[i];
    if (!model.moveBlockStep(entry.blockId, x, y)) throw new Error(`reject ${entry.blockId} ${x},${y}`);
    automatic = autoExit(model, entry.blockId, previous);
    if (automatic && i !== entry.path.length - 1) throw new Error(`auto mid ${entry.blockId} ${automatic}`);
  }
  if (automatic !== entry.exitSide) throw new Error(`exit mismatch ${entry.blockId} ${automatic ?? "none"} vs ${entry.exitSide ?? "none"}`);
  if (entry.exitSide && !model.tryExit(entry.blockId, entry.exitSide).ok) throw new Error(`exit failed ${entry.blockId}`);
  if (!model.commitAction()) throw new Error(`commit ${entry.blockId}`);
};
for (let i = 0; i < 34; i += 1) drag(raw.drags[i]);
await writeFile(resolve(out, "state34-original-hidden.json"), `${JSON.stringify(model.snapshot(), null, 2)}\n`);
console.log(JSON.stringify(model.snapshot(), null, 2));
