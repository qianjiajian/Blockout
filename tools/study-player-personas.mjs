import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/player-difficulty-study/", import.meta.url));
const reportPath = resolve(output, "player-persona-browser-report.json");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const sampledLevels = [1, 3, 8, 19, 30, 40, 54, 58, 60, 68, 73, 78, 80, 86, 88, 90, 95, 98];
const personas = ["goal-first", "space-first", "one-step-planner"];
const maxGestures = 45;
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clearLoad = (state) => state.puzzle.blocks.reduce((sum, block) => sum + block.layers.length, 0);

// This planner deliberately stays below a level solver. It sees only the live
// board, enumerates legal destinations for one chosen piece, and scores the
// immediate result. It has no authored route, no multi-move search and no
// knowledge of future generator cargo.
const visiblePlans = (persona) => page.evaluate(async (selectedPersona) => {
  const { createContinuousCollisionValidator } = await import("/src/game/continuousDrag.ts");
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const snapshot = state.puzzle;
  const closedShutters = new Set(snapshot.shutters.filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const activeBlocks = snapshot.blocks.filter((block) => (
    block.frozen <= 0 && (!block.shutterId || !closedShutters.has(block.shutterId))
  ));
  const activeIds = new Set(activeBlocks.map((block) => block.id));
  const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
  const shutterCells = new Set();
  for (const shutter of snapshot.shutters) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(`${x},${y}`);
    }
  }
  const stateKey = JSON.stringify({
    blocks: snapshot.blocks.map((block) => [block.id, block.x, block.y, block.layers, block.frozen]),
    gates: snapshot.gates.map((gate) => [gate.id, gate.frozen]),
    shutters: snapshot.shutters.map((shutter) => [shutter.id, shutter.count]),
  });
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const blockCells = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const activeColor = (block) => block.layers[0] ?? block.color;
  const openGates = (block) => snapshot.gates.filter((gate) => (
    gate.frozen <= 0 && gate.color === activeColor(block) && (!block.star || gate.star)
  ));
  const intervalGap = (minimum, maximum, gateMinimum, gateMaximum) => (
    maximum < gateMinimum ? gateMinimum - maximum : minimum > gateMaximum ? minimum - gateMaximum : 0
  );
  const placementDistance = (block, x, y) => {
    const gates = openGates(block);
    if (!gates.length) return 999;
    const cells = blockCells(block, x, y);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return Math.min(...gates.map((gate) => {
      const gateMinimum = gate.offset;
      const gateMaximum = gate.offset + gate.size - 1;
      if (gate.side === "top") return minY + intervalGap(minX, maxX, gateMinimum, gateMaximum);
      if (gate.side === "bottom") return snapshot.height - 1 - maxY + intervalGap(minX, maxX, gateMinimum, gateMaximum);
      if (gate.side === "left") return minX + intervalGap(minY, maxY, gateMinimum, gateMaximum);
      return snapshot.width - 1 - maxX + intervalGap(minY, maxY, gateMinimum, gateMaximum);
    }));
  };
  const positionsWith = (movingId, x, y) => new Map(activeBlocks.map((block) => [
    block.id,
    block.id === movingId ? { x, y } : { x: block.x, y: block.y },
  ]));
  const occupiedWithout = (excludedId, positions) => {
    const occupied = new Set(shutterCells);
    for (const block of activeBlocks) {
      if (block.id === excludedId) continue;
      const position = positions.get(block.id);
      for (const [cellX, cellY] of blockCells(block, position.x, position.y)) occupied.add(`${cellX},${cellY}`);
    }
    return occupied;
  };
  const canPlaceAt = (block, x, y, positions) => {
    const occupied = occupiedWithout(block.id, positions);
    return blockCells(block, x, y).every(([cellX, cellY]) => (
      playable.has(`${cellX},${cellY}`) && !occupied.has(`${cellX},${cellY}`)
    ));
  };
  const boardOptions = (positions) => {
    let mobility = 0;
    let progress = 0;
    let directNext = 0;
    let contacts = 0;
    const occupied = new Map();
    for (const block of activeBlocks) {
      const position = positions.get(block.id);
      for (const [x, y] of blockCells(block, position.x, position.y)) occupied.set(`${x},${y}`, block.id);
    }
    const contactPairs = new Set();
    for (const [key, blockId] of occupied) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of directions) {
        const otherId = occupied.get(`${x + dx},${y + dy}`);
        if (otherId && otherId !== blockId) contactPairs.add([blockId, otherId].sort().join("|"));
      }
    }
    contacts = contactPairs.size;
    for (const block of activeBlocks) {
      const position = positions.get(block.id);
      const distance = placementDistance(block, position.x, position.y);
      for (const [dx, dy] of directions) {
        const x = position.x + dx;
        const y = position.y + dy;
        if (!canPlaceAt(block, x, y, positions)) continue;
        mobility += 1;
        const nextDistance = placementDistance(block, x, y);
        if (nextDistance < distance) progress += 1;
        if (nextDistance === 0) directNext += 1;
      }
    }
    return { mobility, progress, directNext, contacts };
  };
  const initialPositions = new Map(activeBlocks.map((block) => [block.id, { x: block.x, y: block.y }]));
  const baseline = boardOptions(initialPositions);
  const plans = [];
  for (const block of activeBlocks) {
    if (!openGates(block).length || !activeIds.has(block.id)) continue;
    const valid = createContinuousCollisionValidator(snapshot, block.id);
    const startKey = `${block.x},${block.y}`;
    const nodes = new Map([[startKey, { x: block.x, y: block.y }]]);
    const queue = [startKey];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const key = queue[cursor];
      const node = nodes.get(key);
      for (const [dx, dy] of directions) {
        const x = node.x + dx;
        const y = node.y + dy;
        const nextKey = `${x},${y}`;
        if (nodes.has(nextKey) || !valid(x, y)) continue;
        nodes.set(nextKey, { x, y, parent: key });
        queue.push(nextKey);
      }
    }
    const startDistance = placementDistance(block, block.x, block.y);
    for (const [destinationKey, destination] of nodes) {
      if (destinationKey === startKey) continue;
      const path = [];
      let cursor = destinationKey;
      while (cursor !== startKey) {
        const node = nodes.get(cursor);
        path.push([node.x, node.y]);
        cursor = node.parent;
      }
      path.reverse();
      const finalDistance = placementDistance(block, destination.x, destination.y);
      const reachesGate = finalDistance === 0;
      const options = boardOptions(positionsWith(block.id, destination.x, destination.y));
      const mobilityGain = options.mobility - baseline.mobility;
      const progressGain = options.progress - baseline.progress;
      const directNextGain = options.directNext - baseline.directNext;
      const contactsFreed = baseline.contacts - options.contacts;
      const improvement = startDistance - finalDistance;
      const pathTurns = path.reduce((sum, point, index) => {
        if (index < 2) return sum;
        const before = path[index - 2];
        const previous = path[index - 1];
        return sum + Number((previous[0] - before[0]) !== (point[0] - previous[0])
          || (previous[1] - before[1]) !== (point[1] - previous[1]));
      }, 0);
      const seed = [...`${selectedPersona}:${block.id}:${destinationKey}`]
        .reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
      const noise = (seed % 101) / 100;
      let score = reachesGate ? 100000 : 0;
      if (selectedPersona === "goal-first") {
        score += improvement * 190 + directNextGain * 250 + progressGain * 25 + mobilityGain * 8;
      } else if (selectedPersona === "space-first") {
        score += mobilityGain * 120 + contactsFreed * 90 + progressGain * 55 + improvement * 35;
      } else {
        score += directNextGain * 1400 + progressGain * 240 + mobilityGain * 50 + improvement * 90 + contactsFreed * 35;
      }
      score -= path.length * 1.5 + pathTurns * 2;
      score += noise;
      plans.push({
        blockId: block.id,
        path,
        reachesGate,
        startDistance,
        finalDistance,
        improvement,
        mobilityGain,
        progressGain,
        directNextGain,
        contactsFreed,
        score,
        actionKey: `${block.id}:${destinationKey}`,
      });
    }
  }
  plans.sort((left, right) => right.score - left.score
    || Number(right.reachesGate) - Number(left.reachesGate)
    || right.improvement - left.improvement
    || left.path.length - right.path.length
    || left.actionKey.localeCompare(right.actionKey));
  return { stateKey, baseline, plans: plans.slice(0, 120) };
}, persona);

const dragPlan = async (plan, state) => {
  const block = state.puzzle.blocks.find((candidate) => candidate.id === plan.blockId);
  if (!block) throw new Error(`Persona study: missing block ${plan.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const toScreen = (originX, originY) => ({
    x: state.viewportTransform.offsetX + (state.board.innerX + (originX + anchorX + 0.5) * state.board.cell) * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY + (state.board.innerY + (originY + anchorY + 0.5) * state.board.cell) * state.viewportTransform.scale,
  });
  const start = toScreen(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of plan.path) {
    const target = toScreen(x, y);
    await page.mouse.move(target.x, target.y, { steps: 2 });
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
};

const results = [];
for (const persona of personas) {
  for (const levelId of sampledLevels) {
    await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
    await page.waitForTimeout(180);
    let state = await debug();
    const startedAt = Date.now();
    const initialLoad = clearLoad(state);
    const attempted = new Set();
    const stateVisits = new Map();
    let pointerGestures = 0;
    let clearGestures = 0;
    let setupGestures = 0;
    let repeatedStates = 0;
    let firstClearGesture = null;
    let strategyFocusesUsed = 0;
    let strategyNudgesUsed = 0;
    let noClearStreak = 0;
    let maxNoClearStreak = 0;
    let outcome = "gesture-limit";
    for (let gesture = 0; gesture < maxGestures; gesture += 1) {
      state = await debug();
      if (state.puzzle.complete) {
        outcome = "completed";
        break;
      }
      const visible = await visiblePlans(persona);
      const visits = (stateVisits.get(visible.stateKey) ?? 0) + 1;
      stateVisits.set(visible.stateKey, visits);
      if (visits > 1) repeatedStates += 1;
      const nudge = state.strategyNudge?.visible ? state.strategyNudge.guide : undefined;
      const strategyFocusId = state.strategyFocus?.visible ? state.strategyFocus.blockId : undefined;
      const nudgePath = nudge?.origins?.slice(1) ?? [];
      const nudgePlan = nudge?.blockId && nudgePath.length ? {
        blockId: nudge.blockId,
        path: nudgePath,
        actionKey: `strategy-nudge:${nudge.blockId}:${nudgePath.map(([x, y]) => `${x},${y}`).join(";")}`,
      } : undefined;
      const plan = nudgePlan
        ?? (strategyFocusId
          ? visible.plans.find((candidate) => candidate.blockId === strategyFocusId
            && !attempted.has(`${visible.stateKey}|${candidate.actionKey}`))
            ?? visible.plans.find((candidate) => !attempted.has(`${visible.stateKey}|${candidate.actionKey}`))
          : visible.plans.find((candidate) => !attempted.has(`${visible.stateKey}|${candidate.actionKey}`)));
      if (!plan) {
        outcome = "stalled";
        break;
      }
      attempted.add(`${visible.stateKey}|${plan.actionKey}`);
      if (nudgePlan) strategyNudgesUsed += 1;
      else if (strategyFocusId && plan.blockId === strategyFocusId) strategyFocusesUsed += 1;
      const before = clearLoad(state);
      await dragPlan(plan, state);
      pointerGestures += 1;
      await page.waitForTimeout(85);
      const after = await debug();
      if (clearLoad(after) < before) {
        clearGestures += 1;
        firstClearGesture ??= pointerGestures;
        noClearStreak = 0;
        await page.waitForTimeout(120);
      } else {
        setupGestures += 1;
        noClearStreak += 1;
        maxNoClearStreak = Math.max(maxNoClearStreak, noClearStreak);
      }
      if (after.puzzle.complete) {
        outcome = "completed";
        break;
      }
    }
    state = await debug();
    results.push({
      persona,
      levelId,
      name: state.level.name,
      authoredDifficulty: state.level.difficulty,
      outcome,
      pointerGestures,
      clearGestures,
      setupGestures,
      repeatedStates,
      uniqueStates: stateVisits.size,
      firstClearGesture,
      strategyFocusesUsed,
      strategyNudgesUsed,
      maxNoClearStreak,
      initialClearLoad: initialLoad,
      remainingClearLoad: clearLoad(state),
      remainingSeconds: state.puzzle.remainingSeconds,
      wallClockMs: Date.now() - startedAt,
    });
    console.log(`PERSONA ${persona} Lv${levelId} ${outcome} gestures=${pointerGestures} firstClear=${firstClearGesture ?? "none"} remaining=${clearLoad(state)}/${initialLoad}`);
  }
}

const byPersona = Object.fromEntries(personas.map((persona) => {
  const entries = results.filter((result) => result.persona === persona);
  return [persona, {
    completed: entries.filter((entry) => entry.outcome === "completed").length,
    stalled: entries.filter((entry) => entry.outcome === "stalled").length,
    gestureLimit: entries.filter((entry) => entry.outcome === "gesture-limit").length,
    receivedFirstClear: entries.filter((entry) => entry.firstClearGesture !== null).length,
  }];
}));
const levelConsensus = sampledLevels.map((levelId) => {
  const entries = results.filter((entry) => entry.levelId === levelId);
  return {
    levelId,
    completedPersonas: entries.filter((entry) => entry.outcome === "completed").map((entry) => entry.persona),
    noFirstClearPersonas: entries.filter((entry) => entry.firstClearGesture === null).map((entry) => entry.persona),
    medianFirstClearGesture: (() => {
      const values = entries.map((entry) => entry.firstClearGesture).filter(Number.isFinite).sort((a, b) => a - b);
      return values.length ? values[Math.floor(values.length / 2)] : null;
    })(),
  };
});
const report = {
  method: "Three AI-operated first-play personas in internal Chromium at 360x792 CSS / DPR2, all using real Pointer drags. Each persona sees only the current board and scores one legal move at a time. No levelSolver, authored route, booster, future cargo knowledge, or multi-move search is used. This is a behavioral proxy panel, not human participant data.",
  sampledLevels,
  personas,
  maxGesturesPerLevel: maxGestures,
  byPersona,
  levelConsensus,
  results,
  browserErrors: errors,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await page.close();
await browser.close();
if (errors.length) throw new Error(`Persona browser study errors:\n${errors.join("\n")}`);
console.log(`Persona browser study complete: ${results.length} first-play sessions, ${errors.length} browser errors.`);
