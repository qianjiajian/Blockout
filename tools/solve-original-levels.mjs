import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const positional = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
const INPUT = path.resolve(
  ROOT,
  positional[0] ?? 'deliverables/original-levels/blockout-original-levels-101-120.json',
);
const inputStem = path.basename(INPUT, path.extname(INPUT));
const OUT_DIR = path.resolve(ROOT, valueAfter('--out-dir') ?? 'deliverables/original-levels/solver');
const JSON_OUT = path.join(OUT_DIR, `${inputStem}-solve-results.json`);
const CSV_OUT = path.join(OUT_DIR, `${inputStem}-solve-results.csv`);
const MD_OUT = path.join(OUT_DIR, `${inputStem}-solve-report.md`);
const MAX_STATES = Number(valueAfter('--max-states') ?? process.env.BLOCKOUT_SOLVER_MAX_STATES ?? 300_000);
const FROM_LEVEL = Number(valueAfter('--from') ?? Number.NEGATIVE_INFINITY);
const TO_LEVEL = Number(valueAfter('--to') ?? Number.POSITIVE_INFINITY);
const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'cyan', 'pink'];
const SIDES = ['N', 'E', 'S', 'W'];
const DIRS = [[-1, 0, 'N'], [0, 1, 'E'], [1, 0, 'S'], [0, -1, 'W']];

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const cellKey = (r, c) => `${r},${c}`;
const popcount = (mask) => {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
};

class MinHeap {
  values = [];
  push(value) {
    this.values.push(value);
    let i = this.values.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.values[p], value) <= 0) break;
      this.values[i] = this.values[p];
      i = p;
    }
    this.values[i] = value;
  }
  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (!this.values.length || !last) return first;
    let i = 0;
    while (true) {
      const left = i * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      let child = left;
      if (right < this.values.length && this.compare(this.values[right], this.values[left]) < 0) child = right;
      if (this.compare(last, this.values[child]) <= 0) break;
      this.values[i] = this.values[child];
      i = child;
    }
    this.values[i] = last;
    return first;
  }
  compare(a, b) {
    return a.f - b.f || b.cleared - a.cleared || a.g - b.g;
  }
  get size() { return this.values.length; }
}

function parseCell(text) {
  const match = /^r(\d+)c(\d+)$/i.exec(text);
  return match ? [Number(match[1]) - 1, Number(match[2]) - 1] : null;
}

function parseRange(text) {
  const match = /r(\d+)c(\d+)-r(\d+)c(\d+)/i.exec(text || '');
  if (!match) return null;
  return {
    r1: Number(match[1]) - 1,
    c1: Number(match[2]) - 1,
    r2: Number(match[3]) - 1,
    c2: Number(match[4]) - 1
  };
}

function classifyShape(block) {
  if (block.cells.length === 1) return '单格';
  const rows = new Set(block.shape.map(([r]) => r));
  const cols = new Set(block.shape.map(([, c]) => c));
  if (rows.size === 1 || cols.size === 1) return '长条';
  const area = rows.size * cols.size;
  if (block.shape.length === 3 && area === 4) return 'L形';
  if (block.shape.length < area) return '异形';
  return '矩形';
}

function compileLevel(raw) {
  const errors = [];
  const mechanisms = new Set(raw.mechanism || []);
  const config = raw.mechanism_config || {};
  for (const forbidden of ['钥匙方块', '钥匙与锁', '双向箭头方块']) {
    if (mechanisms.has(forbidden) || Object.hasOwn(config, forbidden)) errors.push(`${forbidden}机制已停用`);
  }
  const retiredExitFields = ['locked', 'unlock_counter_id', 'required_key'];
  if ((raw.exits || []).some((exit) => retiredExitFields.some((field) => Object.hasOwn(exit, field)))) {
    errors.push('出口仍含已停用的钥匙锁结构字段');
  }
  if ((raw.number_elements || []).some((element) => element.role === 'exit_lock' || Object.hasOwn(element, 'locks_exit_id'))) {
    errors.push('数字元素仍含已停用的出口锁关联字段');
  }
  const rows = raw.board.split('\n');
  if (rows.length !== 6 || rows.some((row) => row.length !== 8)) errors.push('board 不是 6x8');
  const height = rows.length;
  const width = rows[0]?.length || 0;
  const playable = new Set();
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) if (rows[r][c] !== '_') playable.add(cellKey(r, c));
  }

  const colorByLetter = new Map();
  for (const color of COLORS) {
    const ids = raw.board_legend?.[color] || [];
    for (const id of ids) {
      if (colorByLetter.has(id)) errors.push(`色块 ${id} 被重复分配颜色`);
      colorByLetter.set(id, color);
    }
  }

  const letters = [...new Set((raw.board.match(/[A-Z]/g) || []))].sort();
  const blocks = letters.map((id, index) => {
    const cells = [];
    for (let r = 0; r < height; r += 1) {
      for (let c = 0; c < width; c += 1) if (rows[r][c] === id) cells.push([r, c]);
    }
    const minR = Math.min(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    const shape = cells.map(([r, c]) => [r - minR, c - minC]);
    if (!colorByLetter.has(id)) errors.push(`色块 ${id} 缺少颜色`);
    const block = { id, index, r: minR, c: minC, shape, cells, color: colorByLetter.get(id), size: cells.length };
    block.shapeClass = classifyShape(block);
    return block;
  });
  const blockIndex = new Map(blocks.map((block) => [block.id, block.index]));

  const exits = (raw.exits || []).map((exit, index) => {
    const offset = Number(exit.index) - 1;
    let r;
    let c;
    if (exit.edge === 'N') [r, c] = [0, offset];
    else if (exit.edge === 'S') [r, c] = [height - 1, offset];
    else if (exit.edge === 'W') [r, c] = [offset, 0];
    else if (exit.edge === 'E') [r, c] = [offset, width - 1];
    else errors.push(`出口 ${index} 边 ${exit.edge} 无效`);
    const valid = Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < height && c >= 0 && c < width && playable.has(cellKey(r, c));
    if (!valid) errors.push(`出口 ${exit.edge}${exit.index} 位于棋盘外形空洞 '_'`);
    return { ...exit, index0: offset, r, c, valid, key: `${exit.edge}${exit.index}` };
  });
  for (const color of new Set(blocks.map((block) => block.color))) {
    if (!exits.some((exit) => exit.valid && exit.color === color)) errors.push(`${color} 色块没有有效同色出口`);
  }

  const numericBlocks = new Map();
  const edgeCounters = [];
  const shapeCounters = [];
  for (const element of raw.number_elements || []) {
    if (element.type === '数字方块') {
      if (!blockIndex.has(element.block)) errors.push(`数字方块引用不存在的色块 ${element.block}`);
      else numericBlocks.set(blockIndex.get(element.block), Math.max(numericBlocks.get(blockIndex.get(element.block)) || 0, Number(element.value)));
    } else if (element.type === '形状计数装置') {
      shapeCounters.push({ ...element, value: Number(element.value) });
    } else {
      edgeCounters.push({
        ...element,
        value: Number(element.value),
        exitKey: element.position,
        gatedExitId: element.gates_exit_id,
      });
    }
  }

  const frozen = new Set();
  for (const id of config['冰冻效果'] || []) {
    if (!blockIndex.has(id)) errors.push(`冰冻效果引用不存在的色块 ${id}`);
    else frozen.add(blockIndex.get(id));
  }
  let nested = null;
  if (config['嵌套方块']) {
    const outer = blockIndex.get(config['嵌套方块'].outer_block);
    const inner = blockIndex.get(config['嵌套方块'].inner_block);
    if (outer == null || inner == null || outer === inner) errors.push('嵌套方块 outer_block/inner_block 无效');
    else nested = { outer, inner };
  }
  const pattern = new Set();
  for (const id of config['图案方块'] || []) {
    if (!blockIndex.has(id)) errors.push(`图案方块引用不存在的色块 ${id}`);
    else pattern.add(blockIndex.get(id));
  }
  const verticalCells = new Set();
  for (const text of config['纵向通道'] || []) {
    const parsed = parseCell(text);
    if (!parsed || !playable.has(cellKey(...parsed))) errors.push(`纵向通道格 ${text} 无效`);
    else verticalCells.add(cellKey(...parsed));
  }
  for (const text of config['中部通道'] || []) {
    if (typeof text !== 'string') continue;
    const single = parseCell(text);
    const range = parseRange(text);
    if (single && !playable.has(cellKey(...single))) errors.push(`中部通道格 ${text} 无效`);
    if (!single && !range) errors.push(`中部通道描述 ${text} 无法解析`);
  }

  let ringCore = null;
  if (config['环形通道']) {
    ringCore = parseRange(config['环形通道']);
    if (!ringCore) errors.push('环形通道缺少可解析的内核坐标');
  }
  let tChannel = null;
  if (config['T形通道']) {
    const stem = /c(\d+)-c(\d+)/i.exec(config['T形通道'].stem || '');
    const bar = /r(\d+)-r(\d+)/i.exec(config['T形通道'].bar || '');
    if (!stem || !bar) errors.push('T形通道 stem/bar 无法解析');
    else tChannel = { c1: Number(stem[1]) - 1, c2: Number(stem[2]) - 1, r1: Number(bar[1]) - 1, r2: Number(bar[2]) - 1 };
  }

  const shapeConfig = config['形状计数装置'] || [];
  for (let i = 0; i < shapeCounters.length; i += 1) {
    const text = shapeConfig[i] || '';
    shapeCounters[i].shape = String(text).split(':')[0] || null;
    if (!shapeCounters[i].shape) errors.push('形状计数装置缺少形状类型');
  }

  return {
    raw, rows, width, height, playable, blocks, exits, errors, numericBlocks, edgeCounters,
    shapeCounters, frozen, nested, pattern, verticalCells, ringCore, tChannel
  };
}

function positionsKey(positions) {
  return positions.map(([r, c]) => `${r},${c}`).join('|');
}

function removedMaskOf(positions) {
  let mask = 0n;
  for (let i = 0; i < positions.length; i += 1) if (positions[i][0] < 0) mask |= 1n << BigInt(i);
  return mask;
}

function clearedCellsOf(level, mask) {
  let count = 0;
  for (const block of level.blocks) if (mask & (1n << BigInt(block.index))) count += block.size;
  return count;
}

function cellsAt(block, position) {
  return block.shape.map(([dr, dc]) => [position[0] + dr, position[1] + dc]);
}

function canPlace(level, block, position, occupied) {
  return cellsAt(block, position).every(([r, c]) => level.playable.has(cellKey(r, c)) && !occupied.has(cellKey(r, c)));
}

function occupiedWithout(level, positions, excluded) {
  const occupied = new Set();
  for (const block of level.blocks) {
    if (block.index === excluded || positions[block.index][0] < 0) continue;
    for (const [r, c] of cellsAt(block, positions[block.index])) occupied.add(cellKey(r, c));
  }
  return occupied;
}

function movementAllowed(level, block, from, to, direction) {
  if ((level.verticalCells.has(cellKey(...from)) || level.verticalCells.has(cellKey(...to))) && direction !== 'N' && direction !== 'S') return false;
  if (level.ringCore) {
    const { r1, c1, r2, c2 } = level.ringCore;
    if (to[0] >= Math.min(r1, r2) && to[0] <= Math.max(r1, r2) && to[1] >= Math.min(c1, c2) && to[1] <= Math.max(c1, c2)) return false;
  }
  if (level.tChannel) {
    const t = level.tChannel;
    const inBar = (r) => r >= t.r1 && r <= t.r2;
    const inStem = (c) => c >= t.c1 && c <= t.c2;
    if (!inBar(from[0]) && inStem(from[1]) && direction !== 'N' && direction !== 'S') return false;
    if (!inBar(to[0]) && inStem(to[1]) && direction !== 'N' && direction !== 'S') return false;
  }
  return true;
}

function blockActive(level, index, mask) {
  if (level.nested?.inner === index && !(mask & (1n << BigInt(level.nested.outer)))) return false;
  if (level.frozen.has(index)) {
    const others = mask & ~(1n << BigInt(index));
    if (others === 0n) return false;
  }
  return true;
}

function shapeProgress(level, shape, mask) {
  let count = 0;
  for (const block of level.blocks) {
    if ((mask & (1n << BigInt(block.index))) && block.shapeClass === shape) count += block.size;
  }
  return count;
}

function gateUnlocked(level, exit, mask) {
  if (!exit.valid) return false;
  const clearedCells = clearedCellsOf(level, mask);
  for (const counter of level.edgeCounters) {
    const controlsExit = counter.role === 'exit_count_gate'
      ? counter.gatedExitId === exit.id
      : counter.exitKey === exit.key;
    if (controlsExit && clearedCells < counter.value) return false;
  }
  for (const counter of level.shapeCounters) {
    if (counter.exitKey === exit.key && shapeProgress(level, counter.shape, mask) < counter.value) return false;
  }
  return true;
}

function blockCanExit(level, block, mask) {
  const clearedCells = clearedCellsOf(level, mask);
  if (clearedCells < (level.numericBlocks.get(block.index) || 0)) return false;
  if (level.pattern.has(block.index)) {
    const normalSameColor = level.blocks.filter((candidate) => candidate.color === block.color && !level.pattern.has(candidate.index));
    const prerequisiteMet = normalSameColor.length
      ? normalSameColor.some((candidate) => mask & (1n << BigInt(candidate.index)))
      : level.blocks.some((candidate) => !level.pattern.has(candidate.index) && (mask & (1n << BigInt(candidate.index))));
    if (!prerequisiteMet) return false;
  }
  return true;
}

function touchingExit(level, block, position, mask) {
  if (!blockCanExit(level, block, mask)) return null;
  const cells = new Set(cellsAt(block, position).map(([r, c]) => cellKey(r, c)));
  return level.exits.find((exit) => exit.color === block.color && gateUnlocked(level, exit, mask) && cells.has(cellKey(exit.r, exit.c))) || null;
}

function terminalCountersMet(level, mask) {
  const clearedCells = clearedCellsOf(level, mask);
  for (const counter of level.edgeCounters) {
    const controlsExit = counter.role === 'exit_count_gate'
      ? level.exits.some((exit) => exit.id === counter.gatedExitId)
      : level.exits.some((exit) => exit.key === counter.exitKey);
    if (!controlsExit && clearedCells < counter.value) return false;
  }
  for (const counter of level.shapeCounters) {
    if (!level.exits.some((exit) => exit.key === counter.exitKey) && shapeProgress(level, counter.shape, mask) < counter.value) return false;
  }
  return true;
}

function countTurns(directions) {
  let turns = 0;
  for (let i = 1; i < directions.length; i += 1) if (directions[i] !== directions[i - 1]) turns += 1;
  return turns;
}

function triggerCount(level, beforeMask, afterMask, removedIndex) {
  let triggers = 0;
  const beforeCells = clearedCellsOf(level, beforeMask);
  const afterCells = clearedCellsOf(level, afterMask);
  if (level.nested?.outer === removedIndex) triggers += 1;
  if (beforeMask === 0n && level.frozen.size) triggers += level.frozen.size;
  for (const counter of level.edgeCounters) if (beforeCells < counter.value && afterCells >= counter.value) triggers += 1;
  for (const counter of level.shapeCounters) {
    if (shapeProgress(level, counter.shape, beforeMask) < counter.value && shapeProgress(level, counter.shape, afterMask) >= counter.value) triggers += 1;
  }
  for (const index of level.pattern) {
    const block = level.blocks[index];
    const normal = level.blocks.filter((candidate) => candidate.color === block.color && !level.pattern.has(candidate.index));
    if (normal.some((candidate) => candidate.index === removedIndex)) triggers += 1;
  }
  return triggers;
}

function reachableMacros(level, positions, block, mask) {
  const start = positions[block.index];
  const occupied = occupiedWithout(level, positions, block.index);
  const startKey = cellKey(...start);
  const queue = [start];
  const reached = new Map([[startKey, { distance: 0, directions: [] }]]);
  const successors = [];
  const directExit = touchingExit(level, block, start, mask);
  if (directExit) successors.push({ to: [-1, -1], cost: 1, turns: 0, exit: directExit.key, directions: ['OUT'] });

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const info = reached.get(cellKey(...current));
    if (info.distance > 0 && touchingExit(level, block, current, mask)) continue;
    for (const [dr, dc, direction] of DIRS) {
      const next = [current[0] + dr, current[1] + dc];
      const key = cellKey(...next);
      if (reached.has(key) || !movementAllowed(level, block, current, next, direction) || !canPlace(level, block, next, occupied)) continue;
      const directions = [...info.directions, direction];
      const nextInfo = { distance: info.distance + 1, directions };
      reached.set(key, nextInfo);
      queue.push(next);
      const exit = touchingExit(level, block, next, mask);
      if (exit) successors.push({ to: [-1, -1], cost: nextInfo.distance, turns: countTurns(directions), exit: exit.key, directions });
      else successors.push({ to: next, cost: nextInfo.distance, turns: countTurns(directions), exit: null, directions });
    }
  }

  const unique = new Map();
  for (const successor of successors) {
    const key = `${successor.to[0]},${successor.to[1]}`;
    const prior = unique.get(key);
    if (!prior || successor.cost < prior.cost || (successor.cost === prior.cost && successor.turns < prior.turns)) unique.set(key, successor);
  }
  return [...unique.values()];
}

function staticDistances(level, block) {
  const placements = [];
  const empty = new Set();
  for (let r = 0; r < level.height; r += 1) {
    for (let c = 0; c < level.width; c += 1) if (canPlace(level, block, [r, c], empty)) placements.push([r, c]);
  }
  const distance = new Map();
  const queue = [];
  for (const position of placements) {
    const cells = new Set(cellsAt(block, position).map(([r, c]) => cellKey(r, c)));
    if (level.exits.some((exit) => exit.valid && exit.color === block.color && cells.has(cellKey(exit.r, exit.c)))) {
      const key = cellKey(...position);
      distance.set(key, 0);
      queue.push(position);
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const currentDistance = distance.get(cellKey(...current));
    for (const [dr, dc, direction] of DIRS) {
      const previous = [current[0] - dr, current[1] - dc];
      const key = cellKey(...previous);
      if (distance.has(key) || !canPlace(level, block, previous, empty) || !movementAllowed(level, block, previous, current, direction)) continue;
      distance.set(key, currentDistance + 1);
      queue.push(previous);
    }
  }
  return distance;
}

function solve(level) {
  if (level.errors.length) return { status: '配置错误', solved: false, exact: true, reason: level.errors.join('；'), explored_states: 0 };

  const distanceMaps = level.blocks.map((block) => staticDistances(level, block));
  const unreachable = level.blocks.filter((block) => !distanceMaps[block.index].has(cellKey(block.r, block.c)));
  if (unreachable.length) {
    return { status: '不可解', solved: false, exact: true, reason: `静态卡死：色块 ${unreachable.map((block) => block.id).join(',')} 在忽略其他色块后仍无法接触同色出口`, explored_states: 0 };
  }

  const totalMask = (1n << BigInt(level.blocks.length)) - 1n;
  const startPositions = level.blocks.map((block) => [block.r, block.c]);
  const startKey = positionsKey(startPositions);
  const heuristic = (positions) => {
    let h = 0;
    for (const block of level.blocks) {
      if (positions[block.index][0] < 0) continue;
      const distance = distanceMaps[block.index].get(cellKey(...positions[block.index]));
      if (distance == null) return Number.POSITIVE_INFINITY;
      h += Math.max(1, distance);
    }
    return h;
  };
  const queue = new MinHeap();
  queue.push({ positions: startPositions, key: startKey, g: 0, f: heuristic(startPositions), cleared: 0 });
  const best = new Map([[startKey, 0]]);
  const parent = new Map();
  let explored = 0;
  let deepest = { positions: startPositions, cleared: 0, g: 0, key: startKey };

  while (queue.size && explored < MAX_STATES) {
    const node = queue.pop();
    if (node.g !== best.get(node.key)) continue;
    explored += 1;
    const mask = removedMaskOf(node.positions);
    const cleared = popcount(mask);
    if (cleared > deepest.cleared || (cleared === deepest.cleared && node.g < deepest.g)) deepest = { ...node, cleared };
    if (mask === totalMask && terminalCountersMet(level, mask)) {
      const actions = [];
      let cursor = node.key;
      while (parent.has(cursor)) {
        const entry = parent.get(cursor);
        actions.push(entry.action);
        cursor = entry.previous;
      }
      actions.reverse();
      const turns = actions.reduce((sum, action) => sum + action.turns, 0);
      const clears = actions.filter((action) => action.exit).length;
      const triggers = actions.reduce((sum, action) => sum + action.triggers, 0);
      const estimated = round2(0.55 * node.g + 0.75 * clears + 0.30 * turns + 0.25 * triggers + 2);
      return {
        status: estimated <= level.raw.time_limit_sec ? '可解' : '逻辑可解但超时',
        solved: true,
        exact: true,
        minimum_steps: node.g,
        estimated_clear_time_s: estimated,
        expected_clear_time_s: level.raw.expected_clear_time_s,
        deviation_s: round2(estimated - level.raw.expected_clear_time_s),
        time_limit_sec: level.raw.time_limit_sec,
        within_time: estimated <= level.raw.time_limit_sec,
        turns,
        clears,
        mechanism_triggers: triggers,
        explored_states: explored,
        solution: actions
      };
    }

    for (const block of level.blocks) {
      if (node.positions[block.index][0] < 0 || !blockActive(level, block.index, mask)) continue;
      for (const macro of reachableMacros(level, node.positions, block, mask)) {
        const nextPositions = node.positions.map(([r, c]) => [r, c]);
        nextPositions[block.index] = macro.to;
        const nextKey = positionsKey(nextPositions);
        const nextG = node.g + macro.cost;
        if (nextG >= (best.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
        const nextMask = macro.exit ? mask | (1n << BigInt(block.index)) : mask;
        const triggers = macro.exit ? triggerCount(level, mask, nextMask, block.index) : 0;
        const h = heuristic(nextPositions);
        if (!Number.isFinite(h)) continue;
        best.set(nextKey, nextG);
        parent.set(nextKey, {
          previous: node.key,
          action: { block: block.id, to: macro.to, directions: macro.directions, steps: macro.cost, turns: macro.turns, exit: macro.exit, triggers }
        });
        queue.push({ positions: nextPositions, key: nextKey, g: nextG, f: nextG + h, cleared: popcount(nextMask) });
      }
    }
  }

  const capped = explored >= MAX_STATES;
  const deepestMask = removedMaskOf(deepest.positions);
  const inactive = level.blocks.filter((block) => deepest.positions[block.index][0] >= 0 && !blockActive(level, block.index, deepestMask)).map((block) => block.id);
  const noExit = level.blocks.filter((block) => deepest.positions[block.index][0] >= 0 && !blockCanExit(level, block, deepestMask)).map((block) => block.id);
  return {
    status: capped ? '未判定' : '不可解',
    solved: false,
    exact: !capped,
    minimum_steps: null,
    estimated_clear_time_s: null,
    expected_clear_time_s: level.raw.expected_clear_time_s,
    deviation_s: null,
    time_limit_sec: level.raw.time_limit_sec,
    explored_states: explored,
    deadlock: {
      cleared_blocks: deepest.cleared,
      remaining_blocks: level.blocks.length - deepest.cleared,
      state: deepest.key,
      inactive_blocks: inactive,
      numeric_or_pattern_locked_blocks: noExit
    },
    reason: capped
      ? `达到 ${MAX_STATES} 状态上限；当前最好状态已清除 ${deepest.cleared}/${level.blocks.length} 块`
      : `搜索空间完整耗尽；最深状态清除 ${deepest.cleared}/${level.blocks.length} 块，剩余块无合法清除序列`
  };
}

if (!Number.isInteger(MAX_STATES) || MAX_STATES <= 0) {
  throw new RangeError(`--max-states must be a positive integer, received ${MAX_STATES}`);
}
const rawLevels = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
  .filter((level) => level.level_id >= FROM_LEVEL && level.level_id <= TO_LEVEL);
if (!rawLevels.length) {
  throw new Error(`No levels selected from ${INPUT} for range ${FROM_LEVEL}-${TO_LEVEL}`);
}
const results = [];
for (const raw of rawLevels) {
  const compiled = compileLevel(raw);
  const started = Date.now();
  const result = solve(compiled);
  result.level_id = raw.level_id;
  result.runtime_ms = Date.now() - started;
  results.push(result);
  console.log(`L${raw.level_id} ${result.status} steps=${result.minimum_steps ?? '-'} states=${result.explored_states} ${result.runtime_ms}ms`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify({
  input: INPUT,
  rules: path.join(ROOT, 'docs/original-levels-solver-rules.md'),
  algorithm: '宏动作内部 BFS + 外层 A*（逐格步数为代价，启发式可采纳）',
  max_states_per_level: MAX_STATES,
  selected_range: {
    from: Number.isFinite(FROM_LEVEL) ? FROM_LEVEL : null,
    to: Number.isFinite(TO_LEVEL) ? TO_LEVEL : null,
  },
  results
}, null, 2)}\n`, 'utf8');

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = [
  ['level_id', 'solvability', 'minimum_steps', 'estimated_clear_time_s', 'expected_clear_time_s', 'deviation_s', 'time_limit_sec', 'explored_states', 'reason'].join(','),
  ...results.map((result) => [
    result.level_id, result.status, result.minimum_steps, result.estimated_clear_time_s,
    result.expected_clear_time_s, result.deviation_s, result.time_limit_sec,
    result.explored_states, result.reason || ''
  ].map(csvEscape).join(','))
].join('\n');
fs.writeFileSync(CSV_OUT, `${csv}\n`, 'utf8');

const mdRows = results.map((result) => `| ${result.level_id} | ${result.status} | ${result.minimum_steps ?? '—'} | ${result.estimated_clear_time_s ?? '—'} | ${result.expected_clear_time_s ?? '—'} | ${result.deviation_s == null ? '—' : `${result.deviation_s >= 0 ? '+' : ''}${result.deviation_s}`} |`).join('\n');
const failures = results.filter((result) => !result.solved).map((result) => `- **Level ${result.level_id}**：${result.reason}${result.deadlock ? `；卡死状态 ${result.deadlock.state}` : ''}`).join('\n') || '- 无';
const report = `# 原创关卡求解报告\n\n输入：\`${path.relative(ROOT, INPUT).replaceAll('\\\\', '/')}\`  
关卡：${rawLevels[0].level_id}–${rawLevels.at(-1).level_id}  
算法：宏动作内部 BFS + 外层 A*；最少步数按逐格平移计。完整规则见 [original-levels-solver-rules.md](../../../docs/original-levels-solver-rules.md)。\n\n| level_id | 可解性 | 求解步数 | 估算耗时(s) | expected(s) | 偏差(s) |\n|---:|---|---:|---:|---:|---:|\n${mdRows}\n\n## 不可解、配置错误或未判定\n\n${failures}\n`;
fs.writeFileSync(MD_OUT, report, 'utf8');

console.log(JSON.stringify({ JSON_OUT, CSV_OUT, MD_OUT, summary: Object.fromEntries([...new Set(results.map((result) => result.status))].map((status) => [status, results.filter((result) => result.status === status).length])) }, null, 2));
