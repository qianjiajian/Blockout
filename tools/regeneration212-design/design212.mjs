import fs from 'node:fs';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../remake201to210-v123-floor.mjs';
import { digest } from '../revised-preview-validation-v160.mjs';
import { auditOpeningCoverage } from '../revised-opening-coverage.mjs';
import { auditHiddenCoverage } from '../revised-hidden-coverage.mjs';
import { replay } from '../remake191-200/replay.mjs';
import { guidedSearch } from './guided.mjs';

export const OUT = 'deliverables/continue211-220-20260930/design212-new';
const S = [[0, 0]], H2 = [[0, 0], [1, 0]], V2 = [[0, 0], [0, 1]], Q2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const point = ([x, y]) => `${x},${y}`;
const cells = b => b.shape.map(([dx, dy]) => [b.x + dx, b.y + dy]);
const block = (id, color, x, y, shape, extra = {}) => ({ id: `l212-${id}`, color, x, y, shape, ...extra });
const color = b => b.layers?.[0] ?? b.color;
export function adjacency(blocks) {
  const board = new Map();
  for (const b of blocks) for (const p of cells(b)) board.set(point(p), b);
  const pairs = new Set();
  for (const [p, a] of board) {
    const [x, y] = p.split(',').map(Number);
    for (const q of [[x + 1, y], [x, y + 1]]) {
      const b = board.get(point(q));
      if (b && a.id !== b.id && color(a) === color(b)) pairs.add([a.id, b.id].sort().join('/'));
    }
  }
  return [...pairs];
}

export function makeLayout(seed) {
  let randomState = seed | 0;
  const random = n => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) % n; };
  const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = random(i + 1); [list[i], list[j]] = [list[j], list[i]]; } return list; };
  const blocked = [[0, 3], [6, 3], [0, 4], [6, 4], [0, 5], [6, 5]];
  const legal = new Set(Array.from({ length: 63 }, (_, p) => [p % 7, Math.floor(p / 7)]).filter(p => !blocked.some(q => point(p) === point(q))).map(point));
  const shutters = [
    { id: 'l212-cover10', x: 0, y: 0, width: 7, height: 2, count: 10, skin: 'shutter' },
    { id: 'l212-cover1', x: 1, y: 4, width: 2, height: 2, count: 1, skin: 'shutter' },
  ];
  const fixed = [
    block('shell-red-blue', 'blue', 0, 7, V2, { layers: ['red', 'blue'] }),
    block('shell-green-red', 'red', 3, 7, H2, { layers: ['green', 'red'] }),
    block('ice11', 'red', 4, 4, H2, { frozen: 11 }),
    block('blue-start', 'blue', 5, 6, Q2),
    block('small-top', 'green', 1, 4, H2, { shutterId: 'l212-cover1' }),
    block('small-bottom', 'yellow', 1, 5, H2, { shutterId: 'l212-cover1' }),
  ];
  const covered = new Set(fixed.flatMap(cells).map(point));
  for (const shutter of shutters) for (let y = shutter.y; y < shutter.y + shutter.height; y++) for (let x = shutter.x; x < shutter.x + shutter.width; x++) covered.add(`${x},${y}`);
  const available = new Set([...legal].filter(p => !covered.has(p)));
  let nodes = 0;
  function fill(remaining, singleCount, blueDominoCount, otherDominoCount, made) {
    if (++nodes > 80000) return null;
    if (!remaining.size) return singleCount + blueDominoCount + otherDominoCount === 0 ? made : null;
    const candidates = shuffle([...remaining]);
    let choices = null;
    for (const cell of candidates) {
      const [cx, cy] = cell.split(',').map(Number), options = [];
      const shapes = singleCount ? [S, H2, V2] : [H2, V2];
      for (const shape of shapes) for (const [dx, dy] of shape) {
        const x = cx - dx, y = cy - dy;
        const occupied = shape.map(([sx, sy]) => `${x + sx},${y + sy}`);
        if (!occupied.every(p => remaining.has(p))) continue;
        const colors = shape.length === 1 ? ['blue'] : [...(blueDominoCount ? ['blue'] : []), ...(otherDominoCount ? ['red', 'yellow', 'green'] : [])];
        for (const paint of colors) {
          const next = block(`tile-${made.length}`, paint, x, y, shape);
          if (adjacency([...fixed, ...made, next]).length) continue;
          options.push({ next, occupied });
        }
      }
      if (!options.length) return null;
      if (!choices || options.length < choices.length) choices = options;
    }
    for (const { next, occupied } of shuffle(choices)) {
      const pending = new Set(remaining); occupied.forEach(p => pending.delete(p));
      const singleton = next.shape.length === 1, blue = next.color === 'blue';
      const result = fill(pending, singleCount - Number(singleton), blueDominoCount - Number(!singleton && blue), otherDominoCount - Number(!singleton && !blue), [...made, next]);
      if (result) return result;
    }
    return null;
  }
  const opening = fill(available, 7, 2, 9, []);
  if (!opening) return { seed, nodes, status: 'no-native-opening-tiling' };
  // The original top blue H2 bomb is retained at its observed coordinates.
  const bomb = block('top-bomb40', 'blue', 2, 0, H2, { shutterId: 'l212-cover10', timedBombSeconds: 40 });
  const topAvailable = new Set(Array.from({ length: 14 }, (_, p) => `${p % 7},${Math.floor(p / 7)}`).filter(p => !cells(bomb).map(point).includes(p)));
  function topFill(remaining, made) {
    if (!remaining.size) return made;
    const [cx, cy] = [...remaining][0].split(',').map(Number);
    const options = [];
    for (const shape of [H2, V2]) for (const [dx, dy] of shape) {
      const x = cx - dx, y = cy - dy, occupied = shape.map(([sx, sy]) => `${x + sx},${y + sy}`);
      if (!occupied.every(p => remaining.has(p))) continue;
      for (const paint of shuffle(['red', 'yellow', 'green', 'blue'])) {
        const next = block(`top-${made.length}`, paint, x, y, shape, { shutterId: 'l212-cover10' });
        if (adjacency([...fixed, ...opening, bomb, ...made, next]).length) continue;
        options.push({ next, occupied });
      }
    }
    for (const { next, occupied } of shuffle(options)) {
      const pending = new Set(remaining); occupied.forEach(p => pending.delete(p));
      const result = topFill(pending, [...made, next]);
      if (result) return result;
    }
    return null;
  }
  const hidden = topFill(topAvailable, []);
  if (!hidden) return { seed, nodes, status: 'no-native-hidden-tiling' };
  const level = {
    id: 212, name: '双帘错位·212', difficulty: 'normal', mechanismRules: 'revised-2026-09-27-v1.5',
    width: 7, height: 9, playable: [...legal].map(p => p.split(',').map(Number)),
    timeSeconds: 95, reward: 200, parMoves: 8, preservedMoveTarget: 34,
    designTargets: { formulaVersion: 'blockout-d1', calibratedDifficulty: 1.3, minimumRepositionOverhead: 11 },
    gates: [
      { id: 'l212-green', color: 'green', side: 'top', offset: 2, size: 3, frozen: 19 },
      { id: 'l212-red', color: 'red', side: 'left', offset: 0, size: 2, frozen: 16 },
      { id: 'l212-yellow', color: 'yellow', side: 'left', offset: 6, size: 2, frozen: 11 },
      { id: 'l212-blue', color: 'blue', side: 'right', offset: 6, size: 2 },
    ],
    shutters, blocks: [...fixed, ...opening, bomb, ...hidden],
    mechanismAdaptation: {
      userAuthorized: '211–220上下界持续失败后换色换形及必要布局重生成；满足规则后正式接入',
      change: '源7×9沙漏56格；填平内部单孔(3,4)成为无内墙57格。保2帘10/1、2壳红→蓝/绿→红、红H2冰11、隐藏蓝H2炸弹40秒及绿19/红16/黄11冰口和蓝普通口。源蓝彩格与外壳冲突，保2壳省略2彩格。单格过多及非原向L3改为原向S/H2/V2/Q2并重排换色；小帘未知3格补真实隐藏块，已知黄色库存以黄色H2适配保留。',
    },
  };
  return { seed, nodes, status: 'authored-source-adaptation', level };
}

export async function run({ count = 48, startSeed = 212010, layoutFunction = makeLayout, guided = false, extendedFamily = false } = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  if(fs.existsSync(`${OUT}/history212-seed${startSeed}.json`))throw new Error('This finite batch already has evidence; use a new structural/color seed without overwriting it.');
  const api = await loadSpatialApi();
  const compiled = await build({ stdin: { resolveDir: process.cwd(), contents: `export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';export {auditRevisedMechanismContract} from './src/core/revisedMechanismContract.ts';` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  Object.assign(api, {});
  const extra = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
  const runtime = { ...api, ...extra };
  const seen = new Set(fs.readdirSync(OUT).filter(name=>/^candidate212.*\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(`${OUT}/${name}`)).levelSha256)), history = [];
  for (let index = 0; index < count; index++) {
    const generated = layoutFunction(startSeed + index);
    if (!generated.level) { history.push(generated); console.log(index, generated.status, generated.nodes); continue; }
    const { level } = generated, sha = digest(level);
    if (seen.has(sha)) { history.push({ index, status: 'duplicate-layout', sha }); continue; }
    seen.add(sha);
    const audit = {
      opening: auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),
      hidden: auditHiddenCoverage(level), adjacency: adjacency(level.blocks),
      nativeQ0: level.blocks.every(b => api.matchFormalBlockShape(b.shape, 'native-only')?.quarterTurns === 0),
      singleRatio: level.blocks.filter(b => b.shape.length === 1).length / level.blocks.length,
      mechanismIssues: extra.auditRevisedMechanismContract(level),
    };
    const passed = audit.opening.passed && audit.hidden.passed && !audit.adjacency.length && audit.nativeQ0 && !audit.mechanismIssues.length;
    const entry = { index, seed: generated.seed, levelSha256: sha, status: passed ? 'STRUCTURAL_PASS' : 'STRUCTURAL_FAIL', audit };
    history.push(entry);
    const packet = { level, levelSha256: sha, seed: generated.seed, sourceStatus: 'KNOWN_FACTS_PRESERVED_EXPLICIT_ADAPTATIONS', audit, formalAdopted: false, pointerValidated: false };
    fs.writeFileSync(`${OUT}/candidate212-seed${generated.seed}.json`, JSON.stringify(packet, null, 2));
    if (!passed) { console.log(index, entry.status, JSON.stringify(audit.mechanismIssues)); continue; }
    const relaxed = structuredClone(level);
    relaxed.blocks.forEach(b => delete b.timedBombSeconds);
    packet.searchBudget={milliseconds:extendedFamily?4000:1000,maxStates:extendedFamily?80000:10000,floor:extendedFamily?'unconstrained-witness':16};
    const result = guided ? guidedSearch(relaxed,api,{orderSeed:index,maxMilliseconds:1000}) : searchSpatial(relaxed, api, { floor: extendedFamily?Infinity:16, normalize: extendedFamily, orderSeed: index, maxMilliseconds: extendedFamily?4000:1000, maxStates: extendedFamily?80000:10000, maxTransitions: extendedFamily?600000:180000, diagnosticTrace: true });
    entry.search = { ...result, drags: undefined, partialDrags: undefined, partialState: undefined };
    packet.search = result;
    if (result.status === 'witness') {
      try { packet.strictTimedReplay = replay(level, result.drags, runtime, { timed: true, complete: true, requirePointerCompatible: true }); }
      catch (error) { packet.strictTimedReplay = { valid: false, complete: false, error: error.message }; }
      entry.strictTimedReplay = { ...packet.strictTimedReplay, final: undefined, finalStateKey: undefined };
      const U = packet.strictTimedReplay.nonClearingDrags;
      if (packet.strictTimedReplay.complete && U >= 11 && U <= 15) {
        const proof = searchSpatial(relaxed, api, { floor: 11, prove: true, maxMilliseconds: 3000, maxStates: 50000, maxTransitions: 500000 });
        packet.lowerBound = { ...proof, originalLevelSha256: sha, projection: 'Time-free bomb removes only failure deadline; the full inventory and all spatial restrictions remain, so it is a cost-nonincreasing relaxation.' };
        entry.lowerBound = packet.lowerBound;
        if (proof.thresholdProven) entry.status = 'SPATIAL_BOUNDS_PASSED_TIMED_MODEL_ONLY';
      }
    }
    fs.writeFileSync(`${OUT}/candidate212-seed${generated.seed}.json`, JSON.stringify(packet, null, 2));
    fs.writeFileSync(`${OUT}/history212-seed${startSeed}.json`, JSON.stringify({ finiteCap: count, sameFingerprintRetry: false, history }, null, 2));
    console.log(index, entry.status, result.status, result.cost, result.maxClearsSeen, packet.strictTimedReplay?.error ?? '', entry.lowerBound?.status ?? '');
    if (entry.status === 'SPATIAL_BOUNDS_PASSED_TIMED_MODEL_ONLY') break;
  }
  fs.writeFileSync(`${OUT}/history212-seed${startSeed}.json`, JSON.stringify({ finiteCap: count, sameFingerprintRetry: false, history }, null, 2));
}

if (process.argv[1]?.endsWith('design212.mjs')) await run({ count: Number(process.argv[2] ?? 48), startSeed: Number(process.argv[3] ?? 212010) });
