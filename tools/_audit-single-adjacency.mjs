import { build } from "esbuild";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { writeFile, rm } from "node:fs/promises";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = resolve(root, ".codex-temp/single-adjacency-bundle.mjs");
await build({
  stdin: {
    contents: `
      import { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))};
      import { VIDEO_PARITY_LEVELS } from ${JSON.stringify(resolve(root, "src/core/videoParityLevels.generated.ts"))};
      import { VIDEO_PARITY_LEVELS_101_TO_200 } from ${JSON.stringify(resolve(root, "src/core/videoParityLevels101To200.generated.ts"))};
      export { LEVELS, VIDEO_PARITY_LEVELS, VIDEO_PARITY_LEVELS_101_TO_200 };
    `,
    resolveDir: root,
    sourcefile: "single-adjacency-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "silent",
});
const mod = await import(pathToFileURL(out).href + `?t=${Date.now()}`);
const shapeCells = (block) => block.shape.length === 1 && block.shape[0][0] === 0 && block.shape[0][1] === 0;
const cells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const audit = (levels, source) => {
  const rows = [];
  for (const level of levels) {
    const singles = level.blocks.filter(shapeCells);
    const byCell = new Map();
    for (const block of singles) for (const [x, y] of cells(block)) byCell.set(`${x},${y}`, block);
    const pairs = [];
    for (const block of singles) {
      const [x, y] = cells(block)[0];
      for (const [dx, dy, dir] of [[1,0,"right"],[0,1,"down"]]) {
        const other = byCell.get(`${x + dx},${y + dy}`);
        if (other && other.color === block.color) pairs.push({a:block.id,b:other.id,color:block.color,aCell:[x,y],bCell:[x+dx,y+dy],dir});
      }
    }
    if (pairs.length) rows.push({ levelId: level.id, source, singles: singles.map((b)=>({id:b.id,x:b.x,y:b.y,color:b.color,layers:b.layers})), pairs });
  }
  return rows;
};
const raw100 = mod.VIDEO_PARITY_LEVELS;
const raw101 = mod.VIDEO_PARITY_LEVELS_101_TO_200;
const runtime = mod.LEVELS;
console.log(JSON.stringify({
  raw100: audit(raw100, "raw-video-1-100"),
  raw101: audit(raw101, "raw-video-101-200"),
  runtime: audit(runtime, "runtime-levels"),
  counts: { raw100: raw100.length, raw101: raw101.length, runtime: runtime.length },
}, null, 2));
await rm(out, { force: true });
