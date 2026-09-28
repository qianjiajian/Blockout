import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stableOpeningBlocks } from './stable-opening-blocks.mjs';

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const bundlePath = resolve(root, `.codex-temp/all-block-adjacency-verifier-${process.pid}.mjs`);

const outerColor = (block) => block.layers?.[0] ?? block.color;
const occupiedCells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);

let Model;
const openingVisibleBlocks = level => stableOpeningBlocks(level,Model);

const violationsFor = (level) => {
  const blocks = openingVisibleBlocks(level);
  const occupants = new Map();
  for (const block of blocks) {
    for (const [x, y] of occupiedCells(block)) {
      const key = `${x},${y}`;
      occupants.set(key, [...(occupants.get(key) ?? []), block]);
    }
  }

  const violations = new Map();
  for (const block of blocks) {
    for (const [x, y] of occupiedCells(block)) {
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        for (const neighbour of occupants.get(`${x + dx},${y + dy}`) ?? []) {
          if (block.id === neighbour.id || outerColor(block) !== outerColor(neighbour)) continue;
          const [firstBlockId, secondBlockId] = [block.id, neighbour.id].sort();
          const key = `${firstBlockId}|${secondBlockId}`;
          if (violations.has(key)) continue;
          violations.set(key, {
            color: outerColor(block),
            firstBlockId,
            secondBlockId,
            firstCell: [x, y],
            secondCell: [x + dx, y + dy],
          });
        }
      }
    }
  }
  return [...violations.values()];
};

await mkdir(dirname(bundlePath), { recursive: true });
try {
  await build({
    stdin: {
      contents: `
        import { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))};
        export { PuzzleModel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
        export { LEVELS };
      `,
      resolveDir: root,
      sourcefile: "all-block-adjacency-verifier-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundlePath,
    logLevel: "silent",
  });
  const { LEVELS, PuzzleModel } = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`);
  Model=PuzzleModel;
  const rows = LEVELS
    .map((level) => {
      const violations = violationsFor(level);
      return violations.length > 0 ? {
        levelId: level.id,
        openingVisibleBlockCount: openingVisibleBlocks(level).length,
        violationCount: violations.length,
        violations,
      } : null;
    })
    .filter(Boolean);
  const report = {
    policy: "opening-visible-distinct-block-orthogonal-contact-outer-colour-v1",
    levelCount: LEVELS.length,
    affectedLevelCount: rows.length,
    violationCount: rows.reduce((sum, row) => sum + row.violationCount, 0),
    affectedLevelIds: rows.map((row) => row.levelId),
    levels: rows,
  };

  if (LEVELS.length !== 200 || rows.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} finally {
  await rm(bundlePath, { force: true });
}
