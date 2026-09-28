/**
 * Specialized optional-exit gesture-superset graph for complete rectangles,
 * fixed unique-color ordinary/ice gates, <=2 layers, countdown curtains and
 * numbered ice. No keys, axes, timers, flip doors, lifts, generators or grids.
 * Both turns and arbitrarily many unit steps within ONE held drag cost 1 only
 * when the gesture does not clear/peel. A path ending in clear/peel costs zero.
 *
 * In this domain all spatial automatic events are caused by clears. Closed
 * curtains exclude all outside blocks, so a group's reveal is exactly at its
 * initial countdown. Each hidden block's ice equals max(0, initialIce - clears
 * since that reveal), excluding the reveal event itself. The number of clears
 * is derivable from current remaining body/shell stages. Every reachable held
 * position can therefore be enumerated in a small static BFS while other
 * blocks/covers remain fixed. Two 32-bit masks implement exact cell occupancy.
 * Optional gate contact and unlimited time are relaxations of actual inputs.
 * Every budget failure is UNKNOWN, not a bound. Solvability stays independent.
 */
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const SIDES = ["top", "right", "bottom", "left"];
const require = (condition, reason) => { if (!condition) throw new Error(reason); };
const integer = (n) => Number.isSafeInteger(n);
const pointKey = ([x, y]) => `${x},${y}`;
const maskOf = (cells, width) => {
  let lo = 0, hi = 0;
  for (const [x, y] of cells) { const n = y * width + x; if (n < 32) lo |= 1 << n; else hi |= 1 << (n - 32); }
  return [lo, hi];
};
const overlap = (a, b) => Boolean((a[0] & b[0]) || (a[1] & b[1]));
const REMOVED = 255;

export function compileLevel(level) {
  require(level?.mechanismRules === "revised-2026-09-23-v1.4", "Only explicit v1.4 profile qualified");
  const { width: W, height: H } = level;
  require(integer(W) && integer(H) && W >= 2 && H >= 2 && W * H <= 64, "Requires rectangular 2+ by 2+ board with at most 64 cells");
  for (const name of ["blocked", "seams", "generators", "flipDoors", "coloredGrids", "elevators", "conveyors"]) {
    require(level[name] === undefined || Array.isArray(level[name]) && level[name].length === 0, `Unsupported ${name}`);
  }
  const legalPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(integer)
    && p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < H;
  if (level.playable !== undefined) require(Array.isArray(level.playable) && level.playable.length === W * H
    && level.playable.every(legalPoint) && new Set(level.playable.map(pointKey)).size === W * H, "Requires full rectangular playable mask");
  require(Array.isArray(level.blocks) && level.blocks.length > 0 && level.blocks.length <= 64, "Requires 1..64 blocks");
  require(Array.isArray(level.gates) && level.gates.length > 0, "Requires gates");
  const ids = new Set();
  const addId = (id) => { require(typeof id === "string" && id.length && !ids.has(id), "Duplicate/malformed id"); ids.add(id); };
  const gateByColor = new Map();
  const gateRail = new Set();
  const gates = level.gates.map((g) => {
    addId(g.id);
    require(COLORS.includes(g.color) && !gateByColor.has(g.color), "Gate colors must be unique palette colors");
    require(SIDES.includes(g.side) && integer(g.offset) && integer(g.size) && g.size > 0 && g.offset >= 0
      && g.offset + g.size <= (g.side === "top" || g.side === "bottom" ? W : H), "Gate geometry outside board");
    require(g.portals === undefined && !g.star, "Portals/star gates unsupported");
    require(g.frozen === undefined || integer(g.frozen) && g.frozen > 0, "Malformed gate ice");
    for (let i = g.offset; i < g.offset + g.size; i++) { const k = `${g.side}:${i}`; require(!gateRail.has(k), "Gate rail overlap"); gateRail.add(k); }
    const gate = { ...g, frozen: g.frozen ?? 0 }; gateByColor.set(g.color, gate); return gate;
  });
  const coverById = new Map();
  const covers = (level.shutters ?? []).map((s) => {
    addId(s.id);
    require((s.skin === undefined || s.skin === "shutter") && s.triggerBlockIds === undefined, "Only plain countdown covers supported");
    require([s.x, s.y, s.width, s.height, s.count].every(integer) && s.width > 0 && s.height > 0 && s.count > 0
      && s.x >= 0 && s.y >= 0 && s.x + s.width <= W && s.y + s.height <= H, "Malformed cover");
    const cells = [];
    for (let y = s.y; y < s.y + s.height; y++) for (let x = s.x; x < s.x + s.width; x++) cells.push([x, y]);
    const cover = { ...s, mask: maskOf(cells, W), members: [] }; coverById.set(s.id, cover); return cover;
  });
  for (let a = 0; a < covers.length; a++) for (let b = 0; b < a; b++) require(!overlap(covers[a].mask, covers[b].mask), "Cover overlap");
  const blocks = level.blocks.map((b, index) => {
    addId(b.id);
    for (const field of ["movementAxis", "keyId", "lockedBy", "lockCount", "timedBombSeconds"]) require(b[field] === undefined, `Unsupported block ${field}`);
    require(!b.star && !b.rotationBadge, "Star/rotation unsupported");
    require(COLORS.includes(b.color) && integer(b.x) && integer(b.y), "Malformed block color/anchor");
    const layers = b.layers ?? [b.color];
    require(Array.isArray(layers) && layers.length > 0 && layers.length <= 2 && layers.every((c) => COLORS.includes(c)), "Malformed layers");
    require(layers.length === 1 || layers[0] !== layers[1], "Identical shell/body colors");
    require(layers.every((c) => gateByColor.has(c)), "Block layer lacks matching gate");
    require(b.frozen === undefined || integer(b.frozen) && b.frozen > 0, "Malformed block ice");
    require(Array.isArray(b.shape) && b.shape.length > 0 && b.shape.every((p) => Array.isArray(p) && p.length === 2 && p.every(integer) && p.every((n) => n >= 0))
      && new Set(b.shape.map(pointKey)).size === b.shape.length, "Malformed nonnegative shape");
    const bw = 1 + Math.max(...b.shape.map(([x]) => x)), bh = 1 + Math.max(...b.shape.map(([, y]) => y));
    require(Math.min(...b.shape.map(([x]) => x)) === 0 && Math.min(...b.shape.map(([, y]) => y)) === 0, "Requires normalized shape");
    const connected = new Set([pointKey(b.shape[0])]);
    for (let pass = 0; pass < b.shape.length; pass++) for (const [x, y] of b.shape) if ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some((p) => connected.has(pointKey(p)))) connected.add(`${x},${y}`);
    require(connected.size === b.shape.length, "Disconnected shape");
    const poses = Array(W * H).fill(null);
    for (let y = 0; y <= H - bh; y++) for (let x = 0; x <= W - bw; x++) {
      const p = y * W + x, exits = layers.map((color) => {
        const g = gateByColor.get(color), horizontal = g.side === "top" || g.side === "bottom";
        const edge = g.side === "left" ? x === 0 : g.side === "right" ? x + bw === W : g.side === "top" ? y === 0 : y + bh === H;
        const tangent = horizontal ? x : y, span = horizontal ? bw : bh;
        return edge && tangent >= g.offset && tangent + span <= g.offset + g.size ? g : null;
      });
      poses[p] = { mask: maskOf(b.shape.map(([dx, dy]) => [x + dx, y + dy]), W), exits,
        neighbors: [y > 0 ? p - W : -1, x + bw < W ? p + 1 : -1, y + bh < H ? p + W : -1, x > 0 ? p - 1 : -1].filter((p) => p >= 0) };
    }
    const initial = b.y * W + b.x;
    require(b.x >= 0 && b.y >= 0 && b.x + bw <= W && b.y + bh <= H && poses[initial], "Initial block outside board");
    const cover = b.shutterId === undefined ? null : coverById.get(b.shutterId);
    require(b.shutterId === undefined || cover, "Unknown cover reference");
    if (cover) {
      require(b.shape.every(([dx, dy]) => b.x + dx >= cover.x && b.x + dx < cover.x + cover.width && b.y + dy >= cover.y && b.y + dy < cover.y + cover.height), "Hidden block not contained in cover");
      cover.members.push(index);
    } else for (const c of covers) require(!overlap(poses[initial].mask, c.mask), "Opening block overlaps a cover");
    return { ...b, layers: [...layers], initial, poses, revealAt: cover?.count ?? 0, ice: b.frozen ?? 0, cover };
  });
  for (const c of covers) require(c.members.length > 0, "Empty real cover");
  for (let a = 0; a < blocks.length; a++) for (let b = 0; b < a; b++) {
    if (blocks[a].cover === blocks[b].cover) require(!overlap(blocks[a].poses[blocks[a].initial].mask, blocks[b].poses[blocks[b].initial].mask), "Same-layer block overlap");
  }
  return { W, H, gates, covers, blocks, totalClears: blocks.reduce((n, b) => n + b.layers.length, 0),
    initial: Uint8Array.from(blocks.map((b) => b.initial)), profile: level.mechanismRules };
}

export function clearCount(compiled, state) {
  let n = 0;
  for (let i = 0; i < state.length; i++) n += state[i] === REMOVED ? compiled.blocks[i].layers.length : state[i] >> 6;
  return n;
}
export const stateKey = (state) => String.fromCharCode(...state);

export function forEachGesture(c, state, visit) {
  const cleared = clearCount(c, state), { blocks, covers, W } = c;
  let lo = 0, hi = 0;
  for (const cover of covers) if (cleared < cover.count) { lo |= cover.mask[0]; hi |= cover.mask[1]; }
  for (let i = 0; i < blocks.length; i++) if (state[i] !== REMOVED && cleared >= blocks[i].revealAt) {
    const mask = blocks[i].poses[state[i] & 63].mask; lo |= mask[0]; hi |= mask[1];
  }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], value = state[i];
    if (value === REMOVED || cleared < b.revealAt || b.ice > cleared - b.revealAt) continue;
    const start = value & 63, stage = value >> 6, mask = b.poses[start].mask;
    const occupiedLo = lo ^ mask[0], occupiedHi = hi ^ mask[1];
    const parents = new Int16Array(c.W * c.H).fill(-1), queue = [start]; parents[start] = start;
    const drag = (pose, exitSide) => {
      const path = [];
      while (pose !== start) { path.push([pose % W, Math.floor(pose / W)]); pose = parents[pose]; }
      return { blockId: b.id, path: path.reverse(), ...(exitSide ? { exitSide } : {}) };
    };
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], pose = b.poses[p], gate = pose.exits[stage];
      if (p !== start && visit(i, p | stage << 6, 1, () => drag(p)) === false) return;
      if (gate && cleared >= gate.frozen) {
        const nextValue = stage + 1 < b.layers.length ? p | (stage + 1) << 6 : REMOVED;
        if (visit(i, nextValue, 0, () => drag(p, gate.side)) === false) return;
      }
      for (const next of pose.neighbors) if (parents[next] === -1) {
        const m = b.poses[next].mask;
        if (!(m[0] & occupiedLo) && !(m[1] & occupiedHi)) { parents[next] = p; queue.push(next); }
      }
    }
  }
}

export function checkFastFloor(level, options = {}) {
  const floor = options.floor ?? 15, maxStates = options.maxStates ?? 200000, maxMilliseconds = options.maxMilliseconds ?? 30000;
  const result = { status: "unknown", thresholdProven: false, floor, exploredStates: 0, discoveredStates: 0,
    attemptedTransitions: 0, abstraction: "lv21-rect-countdown-optional-exit-v1", solvabilityValidated: false, timeValidated: false, pointerReplayValidated: false };
  if (![floor, maxStates, maxMilliseconds].every((n) => integer(n) && n > 0)) return { ...result, status: "invalid", reason: "Invalid positive integer budget" };
  let c;
  try { c = compileLevel(level); } catch (error) { return { ...result, status: "unsupported", reason: error.message }; }
  const deadline = Date.now() + maxMilliseconds, initialKey = stateKey(c.initial), distances = new Map([[initialKey, 0]]);
  const nodes = [{ state: c.initial, key: initialKey, cost: 0, parent: -1, next: -1 }];
  let front = 0, back = 0, stopped = null;
  const routeTo = (index) => { const route = []; while (nodes[index].parent !== -1) { route.push(nodes[index].drag); index = nodes[index].parent; } return route.reverse(); };
  while (front !== -1) {
    if (Date.now() >= deadline) { stopped = "deadline"; break; }
    const parent = front, node = nodes[parent]; front = node.next; if (front === -1) back = -1;
    if (distances.get(node.key) !== node.cost) continue;
    result.exploredStates++;
    if (clearCount(c, node.state) === c.totalClears) return { ...result, discoveredStates: distances.size,
      status: "relaxed-shortcut", relaxedNonClearingDrags: node.cost, relaxedRoute: routeTo(parent), termination: "relaxed-completion" };
    forEachGesture(c, node.state, (index, value, edgeCost, getDrag) => {
      result.attemptedTransitions++;
      const cost = node.cost + edgeCost;
      if (cost >= floor) return;
      const state = node.state.slice(); state[index] = value;
      const key = stateKey(state), prior = distances.get(key);
      if (prior !== undefined && prior <= cost) return;
      if (prior === undefined && distances.size >= maxStates) { stopped = "max-states"; return false; }
      if (Date.now() >= deadline) { stopped = "deadline"; return false; }
      distances.set(key, cost);
      const id = nodes.length;
      nodes.push({ state, key, cost, parent, drag: getDrag(), next: -1 });
      if (edgeCost === 0) { nodes[id].next = front; front = id; if (back === -1) back = id; }
      else { if (back !== -1) nodes[back].next = id; else front = id; back = id; }
    });
    if (stopped) break;
  }
  result.discoveredStates = distances.size;
  return stopped ? { ...result, termination: stopped } : { ...result, status: "threshold-proven", thresholdProven: true, termination: "below-threshold-exhausted" };
}

export function stateFromSnapshot(c, snapshot) {
  return Uint8Array.from(c.blocks.map((b) => {
    const actual = snapshot.blocks.find((s) => s.id === b.id);
    return actual ? actual.y * c.W + actual.x | (b.layers.length - actual.layers.length) << 6 : REMOVED;
  }));
}
