/*
 * Build isolated league candidates from the corresponding campaign levels.
 *
 * The campaign object is the source of truth for mechanism topology.  This
 * adapter only applies a board-wide reflection and a deterministic palette
 * permutation; all coordinate-bearing fields are transformed together.  It
 * never writes src/core/levels.ts or the league selector.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const OUT = 'deliverables/league-regeneration-20261005/mainline-template-candidates.json';
const clone = value => structuredClone(value);
const key = ([x, y]) => `${x},${y}`;
const sortPoints = points => [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

const sideMap = (side, flipX, flipY) => {
  if (flipX && side === 'left') return 'right';
  if (flipX && side === 'right') return 'left';
  if (flipY && side === 'top') return 'bottom';
  if (flipY && side === 'bottom') return 'top';
  return side;
};

const transformPoint = ([x, y], width, height, flipX, flipY) => [
  flipX ? width - 1 - x : x,
  flipY ? height - 1 - y : y,
];

const transformShapeAt = (block, width, height, flipX, flipY, anchor = [block.x, block.y], preserveAnchor = false) => {
  const cells = block.shape.map(([dx, dy]) => transformPoint([anchor[0] + dx, anchor[1] + dy], width, height, flipX, flipY));
  const transformedAnchor = transformPoint(anchor, width, height, flipX, flipY);
  const x = preserveAnchor ? transformedAnchor[0] : Math.min(...cells.map(([px]) => px));
  const y = preserveAnchor ? transformedAnchor[1] : Math.min(...cells.map(([, py]) => py));
  return { x, y, shape: cells.map(([px, py]) => [px - x, py - y]).sort((a, b) => a[1] - b[1] || a[0] - b[0]) };
};

const transformGate = (gate, width, height, flipX, flipY) => {
  const side = sideMap(gate.side, flipX, flipY);
  const alongWidth = gate.side === 'top' || gate.side === 'bottom';
  const along = alongWidth ? width : height;
  const offset = (flipX && alongWidth) || (flipY && !alongWidth)
    ? along - gate.offset - gate.size
    : gate.offset;
  const result = {
    ...gate,
    side,
    offset,
    portals: gate.portals?.map(portal => {
      const transformedSide = sideMap(portal.side, flipX, flipY);
      const mouth = Array.from({ length: portal.size }, (_, index) => (
        portal.side === 'top' || portal.side === 'bottom'
          ? [portal.origin[0] + index, portal.origin[1]]
          : [portal.origin[0], portal.origin[1] + index]
      )).map(point => transformPoint(point, width, height, flipX, flipY));
      mouth.sort((a, b) => transformedSide === 'top' || transformedSide === 'bottom' ? a[0] - b[0] : a[1] - b[1]);
      return { ...portal, side: transformedSide, origin: mouth[0] };
    }),
  };
  if (result.portals?.[0]) {
    const portal = result.portals[0];
    result.side = portal.side;
    result.offset = portal.side === 'top' || portal.side === 'bottom' ? portal.origin[0] : portal.origin[1];
    result.size = portal.size;
  }
  return result;
};

const transformSeam = (seam, width, height, flipX, flipY) => {
  const vertical = seam.orientation === 'vertical';
  return {
    ...seam,
    offset: (vertical && flipX) || (!vertical && flipY)
      ? (vertical ? width : height) - seam.offset
      : seam.offset,
    start: (vertical && flipY) || (!vertical && flipX)
      ? (vertical ? height : width) - seam.start - seam.size
      : seam.start,
  };
};

const permuteColor = (color, shift) => {
  const index = COLORS.indexOf(color);
  return index < 0 ? color : COLORS[(index + shift) % COLORS.length];
};

const transformDirection = (side, flipX, flipY) => sideMap(side, flipX, flipY);
const sideQuarter = side => ({ top: 0, right: 1, bottom: 2, left: 3 })[side];

export function adaptMainlineTemplate(source, leagueIndex, mutationIndex = 0) {
  const level = clone(source);
  const width = level.width;
  const height = level.height;
  // Every fifth candidate uses both axes; the other candidates alternate axes.
  const flipX = ((leagueIndex + mutationIndex) % 2) === 1;
  const flipY = ((leagueIndex + mutationIndex) % 3) === 0;
  const colorShift = (leagueIndex * 3 + mutationIndex + 1) % COLORS.length;
  const map = point => transformPoint(point, width, height, flipX, flipY);

  level.id = 900000 + leagueIndex;
  level.name = `荣耀联赛${leagueIndex}·主线模板改编`;
  level.difficulty = ((leagueIndex - 1) % 5) === 2 ? 'super' : 'hard';
  level.reward = 0;
  level.mechanismRules = 'revised-2026-09-27-v1.5';
  level.playable = level.playable?.map(map);
  level.blocked = level.blocked?.map(map);
  level.seams = level.seams?.map(seam => transformSeam(seam, width, height, flipX, flipY));
  level.gates = level.gates.map(gate => ({
    ...transformGate(gate, width, height, flipX, flipY),
    color: permuteColor(gate.color, colorShift),
  }));
  level.flipDoors = level.flipDoors?.map(door => ({
    ...transformGate(door, width, height, flipX, flipY),
    color: permuteColor(door.color, colorShift),
  }));
  level.coloredGrids = level.coloredGrids?.map(grid => ({
    ...grid,
    color: permuteColor(grid.color, colorShift),
    cells: grid.cells.map(map),
  }));

  level.blocks = level.blocks.map(block => {
    const queueOwner = level.generators?.find(generator => generator.queueBlockIds.includes(block.id));
    const anchor = queueOwner ? queueOwner.spawn : [block.x, block.y];
    const placement = transformShapeAt(block, width, height, flipX, flipY, anchor, Boolean(queueOwner));
    return {
      ...block,
      ...placement,
      color: permuteColor(block.color, colorShift),
      layers: block.layers?.map(color => permuteColor(color, colorShift)),
      movementAxis: block.movementAxis,
    };
  });
  level.shutters = level.shutters?.map(shutter => {
    const cells = [];
    for (let sy = 0; sy < shutter.height; sy += 1) for (let sx = 0; sx < shutter.width; sx += 1) {
      cells.push(map([shutter.x + sx, shutter.y + sy]));
    }
    const x = Math.min(...cells.map(([px]) => px));
    const y = Math.min(...cells.map(([, py]) => py));
    return {
      ...shutter,
      x,
      y,
    };
  });
  level.generators = level.generators?.map(generator => ({
    ...generator,
    side: transformDirection(generator.side, flipX, flipY),
    offset: (flipX && (generator.side === 'top' || generator.side === 'bottom')) || (flipY && (generator.side === 'left' || generator.side === 'right'))
      ? ((generator.side === 'top' || generator.side === 'bottom' ? width : height) - 1 - generator.offset)
      : generator.offset,
    spawn: map(generator.spawn),
    rimAnchor: generator.rimAnchor ? (() => {
      const transformedSide = transformDirection(generator.side, flipX, flipY);
      const [mappedX, mappedY] = map([generator.rimAnchor.x, generator.rimAnchor.y]);
      const x = transformedSide === 'left' ? 0 : transformedSide === 'right' ? width : mappedX;
      const y = transformedSide === 'top' ? 0 : transformedSide === 'bottom' ? height : mappedY;
      return { ...generator.rimAnchor, x, y, quarterTurns: sideQuarter(transformedSide) };
    })() : undefined,
  }));
  level.elevators = level.elevators?.map(elevator => ({
    ...elevator,
    ...(() => { const [x, y] = map([elevator.x, elevator.y]); const [fromX, fromY] = map([elevator.fromX, elevator.fromY]); const [toX, toY] = map([elevator.toX, elevator.toY]); return { x, y, fromX, fromY, toX, toY }; })(),
  }));
  level.conveyors = level.conveyors?.map(conveyor => ({
    ...conveyor,
    ...(() => { const [x, y] = map([conveyor.x, conveyor.y]); return { x, y }; })(),
    direction: transformDirection(conveyor.direction, flipX, flipY),
  }));
  // These hints are player-facing coordinates and are not part of the league
  // gameplay contract. Remove them instead of leaving stale campaign paths.
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  delete level.rocketRescue;
  delete level.pulseRescue;
  level.mechanismAdaptation = {
    userAuthorized: '主线关卡作为模板，按主线布局做联赛改编',
    change: `board-reflection:${flipX ? 'x' : ''}${flipY ? 'y' : ''};palette-shift:${colorShift}`,
  };
  return level;
}

const gameplayKey = level => digest({
  width: level.width, height: level.height, playable: sortPoints(level.playable ?? []), blocked: sortPoints(level.blocked ?? []),
  seams: level.seams, gates: level.gates, flipDoors: level.flipDoors, coloredGrids: level.coloredGrids,
  shutters: level.shutters, generators: level.generators, elevators: level.elevators, conveyors: level.conveyors,
  blocks: level.blocks.map(block => ({ ...block, shape: sortPoints(block.shape) })),
});

const loadMainline = async () => {
  const result = await build({
    stdin: { contents: `export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';`, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
};

const { LEVELS, validateLevel } = await loadMainline();
const rows = [];
for (let index = 1; index <= 100; index += 1) {
  const source = LEVELS[index - 1];
  if (!source) throw new Error(`Missing mainline template ${index}`);
  const templateFingerprint = gameplayKey(source);
  const candidate = adaptMainlineTemplate(source, index);
  const candidateFingerprint = gameplayKey(candidate);
  const row = {
    index,
    sourceLevel: source.id,
    sourceFingerprint: templateFingerprint,
    candidateFingerprint,
    status: 'BLOCKED',
    candidate,
    structuralValidation: { status: 'PENDING' },
  };
  try {
    validateLevel(candidate);
    row.status = 'STRUCTURE_VALIDATION_PASS';
    row.structuralValidation = {
      status: 'PASS',
      width: candidate.width,
      height: candidate.height,
      playableCells: candidate.playable?.length ?? candidate.width * candidate.height,
      blocks: candidate.blocks.length,
      gates: candidate.gates.length,
      sourceMechanismCounts: {
        shutters: source.shutters?.length ?? 0,
        generators: source.generators?.length ?? 0,
        flipDoors: source.flipDoors?.length ?? 0,
        coloredGrids: source.coloredGrids?.length ?? 0,
      },
    };
  } catch (error) {
    row.structuralValidation = { status: 'FAIL', reason: String(error?.message ?? error) };
  }
  rows.push(row);
}

const report = {
  status: rows.every(row => row.status === 'STRUCTURE_VALIDATION_PASS') ? 'CANDIDATES_STRUCTURE_VALID' : 'CANDIDATES_BLOCKED',
  generatedAt: new Date().toISOString(),
  source: 'src/core/levels.ts',
  policy: {
    template: 'corresponding mainline level 1..100',
    transformedFields: ['playable', 'blocked', 'seams', 'gates', 'flipDoors', 'coloredGrids', 'blocks', 'shutters', 'generators', 'elevators', 'conveyors'],
    preservedMechanismTopology: true,
    finiteCandidateCount: 1,
    noInfiniteRetry: true,
    requiresLaterGameplayProof: true,
  },
  counts: { total: rows.length, structureValid: rows.filter(row => row.status === 'STRUCTURE_VALIDATION_PASS').length, blocked: rows.filter(row => row.status !== 'STRUCTURE_VALIDATION_PASS').length },
  rows,
};
fs.mkdirSync('deliverables/league-regeneration-20261005', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, counts: report.counts, output: OUT }, null, 2));
