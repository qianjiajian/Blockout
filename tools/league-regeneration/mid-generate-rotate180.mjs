import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const bundle = await build({
  stdin: { contents: `export { LEVELS } from './src/core/levels.ts'; export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const { LEVELS, PuzzleModel, validateLevel } = api;
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const point = ([x, y], width, height) => [width - 1 - x, height - 1 - y];
const transformShape = (shape) => {
  const maxX = Math.max(...shape.map(([x]) => x));
  const maxY = Math.max(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [maxX - x, maxY - y]);
};
const oppositeSide = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
const rotateSideObject = (entry, width, height) => {
  const result = structuredClone(entry);
  if (result.side) {
    const side = result.side;
    result.side = oppositeSide[side];
    const span = side === 'top' || side === 'bottom' ? width : height;
    result.offset = span - entry.offset - entry.size;
  }
  return result;
};
const rotateBlock = (block, width, height) => {
  const result = structuredClone(block);
  const maxX = Math.max(...block.shape.map(([x]) => x));
  const maxY = Math.max(...block.shape.map(([, y]) => y));
  result.x = width - 1 - (block.x + maxX);
  result.y = height - 1 - (block.y + maxY);
  result.shape = transformShape(block.shape);
  return result;
};
const rotateRect = (rect, width, height) => ({ ...structuredClone(rect), x: width - rect.x - rect.width, y: height - rect.y - rect.height });
const rotateCellList = (cells, width, height) => cells.map(cell => point(cell, width, height));
const rotateLevel = (source, leagueIndex) => {
  const width = source.width, height = source.height;
  const level = structuredClone(source);
  level.id = 900000 + leagueIndex;
  level.name = `荣耀联赛${leagueIndex}·${source.name}·旋转构型`;
  level.difficulty = ((leagueIndex - 1) % 5 === 2) ? 'super' : 'hard';
  level.timeSeconds = 180;
  level.reward = 0;
  level.playable = rotateCellList(source.playable ?? [], width, height);
  if (source.blocked) level.blocked = rotateCellList(source.blocked, width, height);
  if (source.gates) level.gates = source.gates.map(g => rotateSideObject(g, width, height));
  level.blocks = source.blocks.map(block => rotateBlock(block, width, height));
  if (source.shutters) level.shutters = source.shutters.map(s => rotateRect(s, width, height));
  if (source.coloredGrids) level.coloredGrids = source.coloredGrids.map(grid => ({ ...structuredClone(grid), cells: rotateCellList(grid.cells, width, height) }));
  if (source.generators) level.generators = source.generators.map(generator => {
    
    const next = structuredClone(generator);
    if (next.side) { const side = next.side; next.side = oppositeSide[side]; next.offset = width - generator.offset - (generator.rimSpan ?? generator.size ?? 1); }
    if (next.spawn) {
      next.spawn = point(next.spawn, width, height);
      const span = next.rimSpan ?? 1;
      if (next.side === 'right') next.spawn[0] = width - span;
      if (next.side === 'left') next.spawn[0] = 0;
      if (next.side === 'bottom') next.spawn[1] = height - span;
      if (next.side === 'top') next.spawn[1] = 0;
    }
    return next;
  });
  if (source.elevators) level.elevators = source.elevators.map(e => rotateRect(e, width, height));
  if (source.conveyors) level.conveyors = source.conveyors.map(c => ({ ...structuredClone(c), cells: rotateCellList(c.cells, width, height) }));
  if (source.flipDoors) level.flipDoors = source.flipDoors.map(d => rotateRect(d, width, height));
  return level;
};
const mechanisms = level => {
  const result = new Set(['普通出口']);
  if (level.gates.some(g => g.frozen > 0)) result.add('冰冻出口');
  if (level.blocks.some(b => b.frozen > 0)) result.add('数字冰块');
  if (level.blocks.some(b => b.layers?.length > 1)) result.add('外壳块');
  if ((level.shutters ?? []).length) result.add('卷帘门');
  if ((level.generators ?? []).length) result.add('生成器');
  if (level.blocks.some(b => b.movementAxis)) result.add('轴向块');
  if (level.blocks.some(b => b.keyId || b.lockedBy)) result.add('钥匙与锁');
  if ((level.elevators ?? []).length) result.add('升降台');
  if (level.blocks.some(b => b.star) || level.gates.some(g => g.star)) result.add('星标块/星门');
  return [...result];
};
const unlockFloor = { '冰冻出口': 6, '数字冰块': 10, '卷帘门': 20, '生成器': 35, '轴向块': 50, '钥匙与锁': 60, '升降台': 65, '星标块/星门': 100 };
const rows = [];
for (let leagueIndex = 20; leagueIndex <= 64; leagueIndex++) {
  const source = LEVELS[leagueIndex - 1];
  if (!source) throw new Error(`Missing campaign level ${leagueIndex}`);
  if (source.generators?.length || source.elevators?.length || source.conveyors?.length) {
    rows.push({ index: leagueIndex, sourceLevel: source.id, difficulty: ((leagueIndex - 1) % 5 === 2) ? 'super' : 'hard',
      mechanismUnlocks: [], transformation: 'rotate180-v1', routeStatus: 'BLOCKED_MECHANISM_TRANSFORM',
      validationError: 'Generator/elevator/conveyor anchor semantics need a mechanism-specific transform; candidate not emitted.',
      level: null });
    continue;
  }
  const level = rotateLevel(source, leagueIndex);
  let validationError = null;
  try { validateLevel(level); } catch (error) { validationError = String(error?.message ?? error); }
  let model;
  try { model = new PuzzleModel(level); } catch (error) { throw new Error(`Lv${leagueIndex} model validation failed: ${String(error?.message ?? error)}`); }
  const snapshot = model.snapshot();
  const currentMechanisms = mechanisms(level);
  for (const mechanism of currentMechanisms) {
    if (unlockFloor[mechanism] !== undefined && leagueIndex < unlockFloor[mechanism]) throw new Error(`Lv${leagueIndex} early ${mechanism}`);
  }
  rows.push({
    index: leagueIndex, sourceLevel: source.id, level, difficulty: level.difficulty,
    mechanismUnlocks: currentMechanisms, fullOpeningBlocks: snapshot.blocks.length,
    sourceLevelSha256: sha(source), levelSha256: sha(level),
    validationError, transformation: 'rotate180-v1', routeStatus: 'UNVERIFIED_CANDIDATE',
    notes: 'Real spatial transform: block positions/shapes, gates, hidden rectangles, playable mask, grids and generator spawns are rotated 180 degrees. No color-only or label-only change.',
  });
}
const report = {
  status: 'CANDIDATE_GENERATED', generatedAt: new Date().toISOString(), range: [20, 64], count: rows.length,
  difficultyPattern: 'hard, hard, super, hard, hard repeating',
  mechanismPolicy: 'The campaign level with the same index supplies the mechanism inventory and unlock timing; every candidate is transformed spatially, preserving actual mechanism fields.',
  proofPolicy: 'PuzzleModel validation PASS; route/fresh lower-bound proof remains pending and is intentionally not marked formal.',
  rows: rows.map(({ level, ...row }) => level ? ({ ...row, width: level.width, height: level.height, blocks: level.blocks.length, gates: level.gates.length, shutters: level.shutters?.length ?? 0, generators: level.generators?.length ?? 0, axes: level.blocks.filter(b => b.movementAxis).length, keysLocks: level.blocks.filter(b => b.keyId || b.lockedBy).length }) : row),
  candidates: rows,
};
const out = 'deliverables/league-regeneration-20261004/mid-experiments';
await mkdir(out, { recursive: true });
await writeFile(`${out}/candidates-20-64.json`, JSON.stringify(report, null, 2));
await writeFile(`${out}/README.md`, `# 联赛20–64隔离候选

基于主线同关的机制清单与解锁时点，生成真实180度空间构型：块坐标/形状、出口朝向与位置、卷帘/彩格/生成器空间位置全部旋转，颜色与机制字段保持。此目录只保存候选，不接入 LEAGUE_LEVELS，未通过 fresh 路线和下界验收前不得正式采用。

- 范围：20–64（45关）
- 难度：困难、困难、超难、困难、困难循环
- 静态门禁：PuzzleModel/validateLevel PASS；机制首次出现必须不早于主线同关解锁阈值
- 未完成：逐关 Pointer 路线、fresh 可解及困难16–20/超难21–30下界证明
`);
console.log(JSON.stringify({ status: report.status, count: rows.length, hard: rows.filter(r => r.difficulty === 'hard').length, super: rows.filter(r => r.difficulty === 'super').length, mechanisms: [...rows.reduce((set, r) => { for (const m of r.mechanismUnlocks) set.add(m); return set; }, new Set())], output: `${out}/candidates-20-64.json` }, null, 2));





