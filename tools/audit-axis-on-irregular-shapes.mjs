import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const source = `export { LEVELS } from ${JSON.stringify(path.resolve(root, 'src/core/levels.ts'))};`;
const bundle = await build({
  stdin: { contents: source, resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const temp = path.join(tmpdir(), `axis-shape-audit-${process.pid}-${Date.now()}.mjs`);
fs.writeFileSync(temp, bundle.outputFiles[0].text, 'utf8');
const { LEVELS } = await import(pathToFileURL(temp).href);
fs.rmSync(temp, { force: true });

const normalize = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY]);
};
const shapeInfo = (shape) => {
  const cells = normalize(shape);
  const maxX = Math.max(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const expected = (maxX + 1) * (maxY + 1);
  const keys = new Set(cells.map(([x, y]) => `${x},${y}`));
  return { width: maxX + 1, height: maxY + 1, area: cells.length, rectangular: cells.length === expected && keys.size === expected };
};

const rows = LEVELS.flatMap((level) => level.blocks
  .filter((block) => block.movementAxis)
  .map((block) => ({
    levelId: level.id,
    blockId: block.id,
    movementAxis: block.movementAxis,
    shape: block.shape,
    ...shapeInfo(block.shape),
    stage: block.shutterId ?? ((level.generators ?? []).some((g) => g.queueBlockIds.includes(block.id)) ? 'generator' : 'opening'),
  })));
const violations = rows.filter((row) => !row.rectangular);
const report = {
  status: violations.length === 0 ? 'PASS' : 'VIOLATIONS_FOUND',
  rule: 'movementAxis blocks must use rectangular silhouettes; irregular silhouettes may not carry movementAxis',
  levelCount: LEVELS.length,
  axisBlockCount: rows.length,
  violationCount: violations.length,
  violations,
  checked: rows,
};
const outDir = path.join(root, 'deliverables', 'axis-shape-audit-20260926');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `report-${Date.now()}.json`);
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ out, status: report.status, levelCount: report.levelCount, axisBlockCount: report.axisBlockCount, violationCount: report.violationCount, violations }));
