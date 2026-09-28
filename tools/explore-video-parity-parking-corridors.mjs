import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Small deterministic design probe for the Lv17/Lv32 isolated floor search.
// It does not emit or modify campaign data; it measures candidate corridor
// gadgets with the current exact solver before they are independently proven.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await build({
  stdin: {
    contents: `
      export { validateLevel } from "./src/core/PuzzleModel.ts";
      export { solveLevelOptimally } from "./src/core/levelSolver.ts";
    `,
    resolveDir: root,
    sourcefile: "parking-corridor-probe.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const playable = (width, height) => Array.from({ length: height }, (_row, y) => (
  Array.from({ length: width }, (_cell, x) => [x, y])
)).flat();

const corridor = (sequence) => ({
  id: 990100 + sequence.length,
  name: `corridor-${sequence}`,
  difficulty: "hard",
  timeSeconds: 180,
  reward: 1,
  width: 3,
  height: sequence.length,
  playable: playable(3, sequence.length),
  blocked: [],
  gates: [
    { id: "top-red", side: "top", offset: 1, size: 1, color: "red" },
    { id: "bottom-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
  ],
  blocks: [...sequence].map((direction, y) => ({
    id: `block-${y + 1}`,
    x: 1,
    y,
    shape: [[0, 0]],
    color: direction === "T" ? "red" : "blue",
  })),
});

const maxLength = Number(process.argv[2] ?? 8);
const maxStates = Number(process.argv[3] ?? 1_000_000);
const results = [];
for (let length = 2; length <= maxLength; length += 1) {
  for (let bits = 1; bits < (1 << length) - 1; bits += 1) {
    const sequence = Array.from({ length }, (_entry, index) => ((bits >> index) & 1) ? "T" : "B").join("");
    const level = corridor(sequence);
    runtime.validateLevel(level);
    const solved = runtime.solveLevelOptimally(level, maxStates);
    if (!solved.solved) continue;
    results.push({
      sequence,
      overhead: solved.repositionOverhead,
      drags: solved.minimumDrags,
      states: solved.exploredStates,
      route: solved.drags,
    });
  }
}
results.sort((left, right) => right.overhead - left.overhead
  || left.sequence.length - right.sequence.length
  || left.states - right.states
  || left.sequence.localeCompare(right.sequence));
console.log(JSON.stringify(results.slice(0, 40), null, 2));

for (const lanes of [2, 3, 4]) {
  const width = lanes + 2;
  const height = 5;
  const level = {
    id: 990200 + lanes,
    name: `lane-pairs-${lanes}`,
    difficulty: "hard",
    timeSeconds: 180,
    reward: 1,
    width,
    height,
    playable: playable(width, height),
    blocked: [],
    gates: [
      { id: "top-red", side: "top", offset: 1, size: lanes, color: "red" },
      { id: "bottom-blue", side: "bottom", offset: 1, size: lanes, color: "blue" },
    ],
    blocks: Array.from({ length: lanes }, (_entry, index) => ([
      { id: `blue-${index}`, x: index + 1, y: 0, shape: [[0, 0]], color: "blue" },
      { id: `red-${index}`, x: index + 1, y: height - 1, shape: [[0, 0]], color: "red" },
    ])).flat(),
  };
  runtime.validateLevel(level);
  const solved = runtime.solveLevelOptimally(level, maxStates);
  console.log(JSON.stringify({
    gadget: level.name,
    solved: solved.solved,
    overhead: solved.repositionOverhead,
    drags: solved.minimumDrags,
    states: solved.exploredStates,
    route: solved.drags,
  }, null, 2));
}

const L4 = [
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
];
const variants = {
  H2: [[[0, 0], [1, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  L4,
};
const fits = (shape, x, y, width, height) => shape.every(([dx, dy]) => (
  x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height
));
const overlap = (left, right) => {
  const occupied = new Set(left.shape.map(([dx, dy]) => `${left.x + dx},${left.y + dy}`));
  return right.shape.some(([dx, dy]) => occupied.has(`${right.x + dx},${right.y + dy}`));
};

if (process.argv.includes("--pairs")) {
  const width = 6;
  const height = 9;
  const gatePairs = [
    {
      name: "tb-0-3",
      gates: [
        { id: "a", side: "top", offset: 0, size: 3, color: "red" },
        { id: "b", side: "bottom", offset: 0, size: 3, color: "blue" },
      ],
    },
    {
      name: "lr-0-3",
      gates: [
        { id: "a", side: "left", offset: 0, size: 3, color: "red" },
        { id: "b", side: "right", offset: 0, size: 3, color: "blue" },
      ],
    },
    {
      name: "tr-0-3",
      gates: [
        { id: "a", side: "top", offset: 0, size: 3, color: "red" },
        { id: "b", side: "right", offset: 0, size: 3, color: "blue" },
      ],
    },
  ];
  const best = [];
  let tested = 0;
  for (const gatePair of gatePairs) {
    for (const [leftKind, leftVariants] of Object.entries(variants)) {
      for (const [rightKind, rightVariants] of Object.entries(variants)) {
        for (const leftShape of leftVariants) for (const rightShape of rightVariants) {
          for (let leftY = 0; leftY < height; leftY += 1) for (let leftX = 0; leftX < width; leftX += 1) {
            if (!fits(leftShape, leftX, leftY, width, height)) continue;
            for (let rightY = 0; rightY < height; rightY += 1) for (let rightX = 0; rightX < width; rightX += 1) {
              if (!fits(rightShape, rightX, rightY, width, height)) continue;
              const blocks = [
                { id: "red", x: leftX, y: leftY, shape: leftShape, color: "red" },
                { id: "blue", x: rightX, y: rightY, shape: rightShape, color: "blue" },
              ];
              if (overlap(blocks[0], blocks[1])) continue;
              const level = {
                id: 990300,
                name: "pair-search",
                difficulty: "hard",
                timeSeconds: 180,
                reward: 1,
                width,
                height,
                playable: playable(width, height),
                blocked: [],
                gates: gatePair.gates,
                blocks,
              };
              tested += 1;
              const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 20_000));
              const minimumPairFloor = process.argv.includes("--pair-floor1") ? 1 : 2;
              if (!solved.solved || solved.repositionOverhead < minimumPairFloor) continue;
              best.push({
                gate_pair: gatePair.name,
                left_kind: leftKind,
                right_kind: rightKind,
                blocks,
                overhead: solved.repositionOverhead,
                states: solved.exploredStates,
                route: solved.drags,
              });
              best.sort((left, right) => right.overhead - left.overhead || left.states - right.states);
              best.length = Math.min(best.length, 20);
            }
          }
        }
      }
    }
  }
  console.log(JSON.stringify({ pair_search_tested: tested, best }, null, 2));
}

if (process.argv.includes("--triples")) {
  let randomState = 0x1732_F100;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  const width = 6;
  const height = 9;
  const gateSets = [
    {
      name: "tb-0-3",
      colors: ["red", "blue"],
      gates: [
        { id: "a", side: "top", offset: 0, size: 3, color: "red" },
        { id: "b", side: "bottom", offset: 0, size: 3, color: "blue" },
      ],
    },
    {
      name: "tbr-0-3",
      colors: ["red", "blue", "green"],
      gates: [
        { id: "a", side: "top", offset: 0, size: 3, color: "red" },
        { id: "b", side: "bottom", offset: 0, size: 3, color: "blue" },
        { id: "c", side: "right", offset: 0, size: 3, color: "green" },
      ],
    },
    {
      name: "tblr-mixed",
      colors: ["red", "blue", "green", "orange"],
      gates: [
        { id: "a", side: "top", offset: 0, size: 3, color: "red" },
        { id: "b", side: "bottom", offset: 0, size: 3, color: "blue" },
        { id: "c", side: "left", offset: 0, size: 3, color: "green" },
        { id: "d", side: "right", offset: 0, size: 3, color: "orange" },
      ],
    },
  ];
  const shapes = Object.entries(variants).flatMap(([kind, entries]) => entries.map((shape) => ({ kind, shape })));
  const placements = shapes.flatMap(({ kind, shape }) => Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => ({ kind, shape, x, y }))
  )).flat().filter((entry) => fits(entry.shape, entry.x, entry.y, width, height)));
  const iterations = Number(process.argv[process.argv.indexOf("--triples") + 1] ?? 100_000);
  const best = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const gateSet = choose(gateSets);
    const selected = [];
    for (let guard = 0; selected.length < 3 && guard < 100; guard += 1) {
      const placement = choose(placements);
      const block = {
        id: `block-${selected.length + 1}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        color: choose(gateSet.colors),
      };
      if (selected.every((other) => !overlap(other, block))) selected.push({ ...block, kind: placement.kind });
    }
    if (selected.length !== 3 || new Set(selected.map((block) => block.color)).size < 2) continue;
    const level = {
      id: 990400,
      name: "triple-search",
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: gateSet.gates,
      blocks: selected.map(({ kind: _kind, ...block }) => block),
    };
    const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 100_000));
    if (!solved.solved || solved.repositionOverhead < 2) continue;
    best.push({
      gate_set: gateSet.name,
      blocks: selected,
      overhead: solved.repositionOverhead,
      states: solved.exploredStates,
      route: solved.drags,
    });
    best.sort((left, right) => right.overhead - left.overhead || left.states - right.states);
    best.length = Math.min(best.length, 20);
    if (best.some((entry) => entry.overhead >= 3)) break;
  }
  console.log(JSON.stringify({ triple_search_iterations: iterations, best }, null, 2));
}

if (process.argv.includes("--groups")) {
  let randomState = 0x32_17_A11C;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  const argumentIndex = process.argv.indexOf("--groups");
  const count = Number(process.argv[argumentIndex + 1] ?? 6);
  const iterations = Number(process.argv[argumentIndex + 2] ?? 10_000);
  const width = 6;
  const height = 9;
  const gates = [
    { id: "top-red", side: "top", offset: 0, size: 3, color: "red" },
    { id: "bottom-blue", side: "bottom", offset: 0, size: 3, color: "blue" },
    { id: "left-green", side: "left", offset: 0, size: 3, color: "green" },
    { id: "right-orange", side: "right", offset: 0, size: 3, color: "orange" },
  ];
  const redAtLeastIndex = process.argv.indexOf("--red-at-least");
  const redAtLeast = redAtLeastIndex >= 0 ? Number(process.argv[redAtLeastIndex + 1]) : null;
  const horizontalMajority = process.argv.includes("--horizontal-majority");
  const majorityColor = horizontalMajority ? "orange" : "red";
  const colors = horizontalMajority
    ? ["orange", "orange", "orange", "orange", "orange", "green"]
    : process.argv.includes("--red-majority") || redAtLeast !== null
      ? ["red", "red", "red", "red", "red", "blue", "green", "orange"]
    : gates.map((gate) => gate.color);
  const interiorOnly = process.argv.includes("--interior");
  const placements = L4.flatMap((shape, orientation) => Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => ({ shape, orientation, x, y }))
  )).flat().filter((entry) => fits(entry.shape, entry.x, entry.y, width, height)
    && (!interiorOnly || entry.shape.every(([dx]) => entry.x + dx > 0 && entry.x + dx < width - 1))));
  const best = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const blocks = [];
    for (let guard = 0; blocks.length < count && guard < 1_000; guard += 1) {
      const placement = choose(placements);
      const block = {
        id: `block-${blocks.length + 1}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        color: choose(colors),
        orientation: placement.orientation,
      };
      if (blocks.every((other) => !overlap(other, block))) blocks.push(block);
    }
    if (blocks.length !== count || new Set(blocks.map((block) => block.color)).size < 2) continue;
    if (process.argv.includes("--red-majority")
      && blocks.filter((block) => block.color === "red").length < count - 1) continue;
    if (redAtLeast !== null && blocks.filter((block) => block.color === "red").length < redAtLeast) continue;
    if (horizontalMajority && blocks.filter((block) => block.color === majorityColor).length < count - 2) continue;
    const level = {
      id: 990500,
      name: `group-${count}`,
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates,
      blocks: blocks.map(({ orientation: _orientation, ...block }) => block),
    };
    const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 300_000));
    if (!solved.solved || solved.repositionOverhead <= 0) continue;
    const entry = {
      blocks,
      overhead: solved.repositionOverhead,
      states: solved.exploredStates,
      route: solved.drags,
    };
    best.push(entry);
    best.sort((left, right) => right.overhead - left.overhead || left.states - right.states);
    best.length = Math.min(best.length, 10);
    if (best[0]?.overhead >= (process.argv.includes("--red-majority") ? count - 1
      : redAtLeast !== null || horizontalMajority ? Math.max(1, count - 1) : count)) break;
  }
  console.log(JSON.stringify({
    group_count: count,
    iterations,
    best: process.argv.includes("--compact") ? best.slice(0, 1) : best,
  }, null, 2));
}

if (process.argv.includes("--same-color")) {
  let randomState = 0x51A6_C010;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  const argumentIndex = process.argv.indexOf("--same-color");
  const count = Number(process.argv[argumentIndex + 1] ?? 4);
  const iterations = Number(process.argv[argumentIndex + 2] ?? 50_000);
  const width = 6;
  const height = 9;
  const shapes = [
    { kind: "H2", shape: [[0, 0], [1, 0]] },
    { kind: "V3", shape: [[0, 0], [0, 1], [0, 2]] },
  ];
  const placements = shapes.flatMap(({ kind, shape }) => Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => ({ kind, shape, x, y }))
  )).flat().filter((entry) => fits(entry.shape, entry.x, entry.y, width, height)));
  const best = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const blocks = [];
    for (let guard = 0; blocks.length < count && guard < 500; guard += 1) {
      const placement = choose(placements);
      const block = {
        id: `block-${blocks.length + 1}`,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        color: "red",
        kind: placement.kind,
      };
      if (blocks.every((other) => !overlap(other, block))) blocks.push(block);
    }
    if (blocks.length !== count) continue;
    const level = {
      id: 990600,
      name: `same-color-${count}`,
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [{ id: "top-red", side: "top", offset: 0, size: 3, color: "red" }],
      blocks: blocks.map(({ kind: _kind, ...block }) => block),
    };
    const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 300_000));
    if (!solved.solved || solved.repositionOverhead <= 0) continue;
    best.push({ blocks, overhead: solved.repositionOverhead, states: solved.exploredStates, route: solved.drags });
    best.sort((left, right) => right.overhead - left.overhead || left.states - right.states);
    best.length = Math.min(best.length, 10);
    if (best[0]?.overhead >= Math.ceil(count / 2)) break;
  }
  console.log(JSON.stringify({ same_color_count: count, iterations, best }, null, 2));
}

if (process.argv.includes("--lv32-specific")) {
  const width = 6;
  const height = 9;
  const l4Blocks = [
    { id: "l4-1", x: 2, y: 5, shape: L4[3], color: "blue" },
    { id: "l4-2", x: 1, y: 5, shape: L4[1], color: "blue" },
    { id: "l4-3", x: 1, y: 0, shape: L4[2], color: "blue" },
    { id: "l4-4", x: 1, y: 2, shape: L4[3], color: "green" },
    { id: "l4-5", x: 3, y: 0, shape: L4[2], color: "green" },
    { id: "l4-6", x: 2, y: 3, shape: L4[3], color: "blue" },
  ];
  for (const gateSize of [3, 6, 9]) {
    const l4Level = {
      id: 990701 + gateSize,
      name: `lv32-l4-gate-${gateSize}`,
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [
        { id: "left-green", side: "left", offset: 0, size: gateSize, color: "green" },
        { id: "right-blue", side: "right", offset: 0, size: gateSize, color: "blue" },
      ],
      blocks: l4Blocks,
    };
    const solved = runtime.solveLevelOptimally(l4Level, maxStates);
    console.log(JSON.stringify({ probe: l4Level.name, ...solved }, null, 2));
  }
  for (const gateSize of [3, 9]) for (const y of [0, 3, 6]) {
    const pairLevel = {
      id: 990750 + gateSize + y,
      name: `lv32-v3-pair-gate-${gateSize}-y-${y}`,
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [
        { id: "left-green", side: "left", offset: 0, size: gateSize, color: "green" },
        { id: "right-blue", side: "right", offset: 0, size: gateSize, color: "blue" },
      ],
      blocks: [
        { id: "blue-v3", x: 0, y, shape: variants.V3[0], color: "blue" },
        { id: "green-v3", x: 5, y, shape: variants.V3[0], color: "green" },
      ],
    };
    const solved = runtime.solveLevelOptimally(pairLevel, maxStates);
    console.log(JSON.stringify({ probe: pairLevel.name, ...solved }, null, 2));
  }
  for (const offset of [0, 3, 6]) {
    const v3Level = {
      id: 990780 + offset,
      name: `lv32-v3-six-gate-3-offset-${offset}`,
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [
        { id: "left-green", side: "left", offset, size: 3, color: "green" },
        { id: "right-blue", side: "right", offset, size: 3, color: "blue" },
      ],
      blocks: [0, 3, 6].flatMap((y) => ([
        { id: `blue-v3-${y}`, x: 0, y, shape: variants.V3[0], color: "blue" },
        { id: `green-v3-${y}`, x: 5, y, shape: variants.V3[0], color: "green" },
      ])),
    };
    const solved = runtime.solveLevelOptimally(v3Level, maxStates);
    console.log(JSON.stringify({ probe: v3Level.name, ...solved }, null, 2));
  }
}

if (process.argv.includes("--lv32-residual")) {
  let randomState = 0x32F1_0088;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  const shuffle = (values) => {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  };
  const width = 6;
  const height = 9;
  const l4Blocks = [
    { x: 2, y: 5, shape: L4[3] },
    { x: 1, y: 5, shape: L4[1] },
    { x: 1, y: 0, shape: L4[2] },
    { x: 1, y: 2, shape: L4[3] },
    { x: 3, y: 0, shape: L4[2] },
    { x: 2, y: 3, shape: L4[3] },
  ];
  const residualCore7 = process.argv.includes("--core7");
  const shapeKinds = [
    ...Array.from({ length: 6 }, () => ({ kind: "V3", shape: variants.V3[0] })),
    ...Array.from({ length: residualCore7 ? 1 : 2 }, () => ({ kind: "H2", shape: variants.H2[0] })),
  ];
  const allPlacements = new Map(shapeKinds.map(({ kind, shape }) => [kind,
    Array.from({ length: height }, (_row, y) => (
      Array.from({ length: width }, (_cell, x) => ({ x, y, shape }))
    )).flat().filter((entry) => fits(shape, entry.x, entry.y, width, height)
      && l4Blocks.every((block) => !overlap(block, entry))),
  ]));
  const argIndex = process.argv.indexOf("--lv32-residual");
  const iterations = Number(process.argv[argIndex + 1] ?? 50_000);
  let best = null;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const placements = [];
    for (const descriptor of shuffle(shapeKinds)) {
      const options = shuffle(allPlacements.get(descriptor.kind));
      const placement = options.find((candidate) => placements.every((other) => !overlap(other, candidate)));
      if (!placement) break;
      placements.push({ ...placement, kind: descriptor.kind });
    }
    if (placements.length !== shapeKinds.length) continue;
    const colors = residualCore7
      ? shuffle(["blue", "blue", "blue", "blue", "green", "green", "green"])
      : shuffle(["purple", "purple", "purple", "purple", "blue", "blue", "green", "green"]);
    const blocks = placements.map((entry, index) => ({
      id: `residual-${index + 1}`,
      x: entry.x,
      y: entry.y,
      shape: entry.shape,
      color: colors[index],
      kind: entry.kind,
    }));
    const topOffset = choose([0, 3]);
    const level = {
      id: 990800,
      name: "lv32-residual-search",
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [
        { id: "top-purple", side: "top", offset: topOffset, size: 3, color: "purple" },
        { id: "bottom-cyan", side: "bottom", offset: topOffset, size: 3, color: "cyan" },
        { id: "left-green", side: "left", offset: 0, size: 3, color: "green" },
        { id: "right-blue", side: "right", offset: 0, size: 3, color: "blue" },
      ],
      blocks: blocks.map(({ kind: _kind, ...block }) => block),
    };
    const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 300_000));
    if (!solved.solved) continue;
    const entry = { iteration, topOffset, blocks, ...solved };
    if (!best || entry.repositionOverhead > best.repositionOverhead
      || (entry.repositionOverhead === best.repositionOverhead && entry.exploredStates < best.exploredStates)) best = entry;
    if (best?.repositionOverhead >= 3) break;
  }
  console.log(JSON.stringify({ residual_iterations: iterations, best }, null, 2));
}

if (process.argv.includes("--lv32-pair-pack")) {
  const width = 6;
  const height = 9;
  const l4Blocks = [
    { id: "l4-1", x: 1, y: 3, shape: L4[1], color: "purple" },
    { id: "l4-2", x: 1, y: 0, shape: L4[3], color: "cyan" },
    { id: "l4-3", x: 1, y: 6, shape: L4[2], color: "purple" },
    { id: "l4-4", x: 2, y: 3, shape: L4[3], color: "purple" },
    { id: "l4-5", x: 2, y: 5, shape: L4[2], color: "purple" },
    { id: "l4-6", x: 2, y: 1, shape: L4[3], color: "cyan" },
  ];
  const gates = [
    { id: "top-purple", side: "top", offset: 0, size: 3, color: "purple" },
    { id: "bottom-cyan", side: "bottom", offset: 0, size: 3, color: "cyan" },
    { id: "left-green", side: "left", offset: 3, size: 3, color: "green" },
    { id: "right-blue", side: "right", offset: 3, size: 3, color: "blue" },
  ];
  const descriptors = [
    { kind: "V3", shape: variants.V3[0] },
    { kind: "H2", shape: variants.H2[0] },
  ];
  const placements = descriptors.flatMap(({ kind, shape }) => (
    Array.from({ length: height }, (_row, y) => (
      Array.from({ length: width }, (_cell, x) => ({ kind, shape, x, y }))
    )).flat().filter((entry) => fits(shape, entry.x, entry.y, width, height)
      && l4Blocks.every((block) => !overlap(block, entry)))
  ));
  const pairCandidates = [];
  let testedPairs = 0;
  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    const left = placements[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const right = placements[rightIndex];
      if (overlap(left, right)) continue;
      for (const [leftColor, rightColor] of [
        ["purple", "cyan"], ["cyan", "purple"],
        ["purple", "green"], ["green", "purple"],
        ["cyan", "green"], ["green", "cyan"],
      ]) {
        const blocks = [
          { id: "pair-a", x: left.x, y: left.y, shape: left.shape, color: leftColor, kind: left.kind },
          { id: "pair-b", x: right.x, y: right.y, shape: right.shape, color: rightColor, kind: right.kind },
        ];
        const level = {
          id: 990900,
          name: "lv32-pair-pack-probe",
          difficulty: "hard",
          timeSeconds: 180,
          reward: 1,
          width,
          height,
          playable: playable(width, height),
          blocked: [],
          gates,
          blocks: blocks.map(({ kind: _kind, ...block }) => block),
        };
        testedPairs += 1;
        const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 20_000));
        if (!solved.solved || solved.repositionOverhead < 1) continue;
        pairCandidates.push({ blocks, overhead: solved.repositionOverhead, states: solved.exploredStates, route: solved.drags });
      }
    }
  }
  pairCandidates.sort((left, right) => right.overhead - left.overhead || left.states - right.states);
  const cellsOf = (blocks) => new Set(blocks.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
  const l4Cells = cellsOf(l4Blocks);
  const findFill = (selected) => {
    const used = cellsOf(selected.flatMap((entry) => entry.blocks));
    const counts = selected.flatMap((entry) => entry.blocks).reduce((acc, block) => {
      acc[block.kind] += 1;
      return acc;
    }, { V3: 0, H2: 0 });
    const needs = [
      ...Array.from({ length: 6 - counts.V3 }, () => "V3"),
      ...Array.from({ length: 2 - counts.H2 }, () => "H2"),
    ];
    const fill = [];
    const visit = (index) => {
      if (index === needs.length) return true;
      for (const placement of placements) {
        if (placement.kind !== needs[index]) continue;
        const cells = cellsOf([placement]);
        if ([...cells].some((cell) => used.has(cell) || l4Cells.has(cell))) continue;
        fill.push(placement);
        for (const cell of cells) used.add(cell);
        if (visit(index + 1)) return true;
        fill.pop();
        for (const cell of cells) used.delete(cell);
      }
      return false;
    };
    return visit(0) ? fill : null;
  };
  let packed = null;
  const selected = [];
  const selectedCells = new Set();
  const dfs = (start) => {
    if (selected.length === 3) {
      const fill = findFill(selected);
      if (fill) packed = { selected: [...selected], fill };
      return Boolean(packed);
    }
    for (let index = start; index < pairCandidates.length; index += 1) {
      const candidate = pairCandidates[index];
      const counts = [...selected, candidate].flatMap((entry) => entry.blocks).reduce((acc, block) => {
        acc[block.kind] += 1;
        return acc;
      }, { V3: 0, H2: 0 });
      if (counts.V3 > 6 || counts.H2 > 2) continue;
      const cells = cellsOf(candidate.blocks);
      if ([...cells].some((cell) => selectedCells.has(cell))) continue;
      selected.push(candidate);
      for (const cell of cells) selectedCells.add(cell);
      if (dfs(index + 1)) return true;
      selected.pop();
      for (const cell of cells) selectedCells.delete(cell);
    }
    return false;
  };
  dfs(0);
  console.log(JSON.stringify({ testedPairs, viablePairs: pairCandidates.length, packed }, null, 2));
}

if (process.argv.includes("--lv32-reserved-pairs")) {
  let randomState = 0x3208_1732;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  const shuffle = (values) => {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  };
  const width = 6;
  const height = 9;
  const reservedV3 = [0, 1, 2].flatMap((x) => ([
    { x, y: 0, shape: variants.V3[0] },
    { x, y: 6, shape: variants.V3[0] },
  ]));
  const candidatePlacements = L4.flatMap((shape, orientation) => (
    Array.from({ length: height }, (_row, y) => (
      Array.from({ length: width }, (_cell, x) => ({ x, y, shape, orientation }))
    )).flat().filter((entry) => fits(shape, entry.x, entry.y, width, height)
      && reservedV3.every((reserved) => !overlap(reserved, entry)))
  ));
  const h2Placements = Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => ({ x, y, shape: variants.H2[0] }))
  )).flat().filter((entry) => fits(entry.shape, entry.x, entry.y, width, height)
    && reservedV3.every((reserved) => !overlap(reserved, entry)));
  const argIndex = process.argv.indexOf("--lv32-reserved-pairs");
  const iterations = Number(process.argv[argIndex + 1] ?? 100_000);
  let best = null;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const blocks = [];
    for (let guard = 0; blocks.length < 6 && guard < 1_000; guard += 1) {
      const placement = choose(candidatePlacements);
      if (blocks.every((block) => !overlap(block, placement))) blocks.push({ ...placement });
    }
    if (blocks.length !== 6) continue;
    const freeH2 = h2Placements.filter((placement) => blocks.every((block) => !overlap(block, placement)));
    let fill = null;
    for (let leftIndex = 0; leftIndex < freeH2.length && !fill; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < freeH2.length; rightIndex += 1) {
        if (!overlap(freeH2[leftIndex], freeH2[rightIndex])) {
          fill = [freeH2[leftIndex], freeH2[rightIndex]];
          break;
        }
      }
    }
    if (!fill) continue;
    const colors = shuffle(["purple", "purple", "purple", "purple", "cyan", "cyan"]);
    const colored = blocks.map((block, index) => ({
      id: `l4-${index + 1}`,
      x: block.x,
      y: block.y,
      shape: block.shape,
      orientation: block.orientation,
      color: colors[index],
    }));
    const level = {
      id: 991000,
      name: "lv32-reserved-pairs-l4",
      difficulty: "hard",
      timeSeconds: 180,
      reward: 1,
      width,
      height,
      playable: playable(width, height),
      blocked: [],
      gates: [
        { id: "top-purple", side: "top", offset: 0, size: 3, color: "purple" },
        { id: "bottom-cyan", side: "bottom", offset: 0, size: 3, color: "cyan" },
      ],
      blocks: colored.map(({ orientation: _orientation, ...block }) => block),
    };
    const solved = runtime.solveLevelOptimally(level, Math.min(maxStates, 500_000));
    if (!solved.solved) continue;
    const entry = { iteration, blocks: colored, h2Fill: fill, ...solved };
    if (!best || entry.repositionOverhead > best.repositionOverhead
      || (entry.repositionOverhead === best.repositionOverhead && entry.exploredStates < best.exploredStates)) best = entry;
    if (best?.repositionOverhead >= 5) break;
  }
  console.log(JSON.stringify({ reserved_pair_iterations: iterations, best }, null, 2));
}

if (process.argv.includes("--lv17-column-pack")) {
  const width = 6;
  const height = 8;
  const shapes = {
    SINGLE: [[0, 0]],
    H2: variants.H2[0],
    V2: [[0, 0], [0, 1]],
    H3: [[0, 0], [1, 0], [2, 0]],
    SQ2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  };
  const remaining = { SINGLE: 4, H2: 3, V2: 4, H3: 6, SQ2: 1 };
  const occupied = new Set(Array.from({ length: height }, (_entry, y) => `0,${y}`));
  const placements = [];
  let nodes = 0;
  const visit = () => {
    nodes += 1;
    let first = null;
    for (let y = 0; y < height && !first; y += 1) for (let x = 1; x < width; x += 1) {
      if (!occupied.has(`${x},${y}`)) { first = [x, y]; break; }
    }
    if (!first) return Object.values(remaining).every((count) => count === 0);
    for (const kind of ["H3", "SQ2", "H2", "V2", "SINGLE"]) {
      if (remaining[kind] <= 0) continue;
      const shape = shapes[kind];
      const [x, y] = first;
      const cells = shape.map(([dx, dy]) => [x + dx, y + dy]);
      if (cells.some(([cellX, cellY]) => cellX >= width || cellY >= height || occupied.has(`${cellX},${cellY}`))) continue;
      remaining[kind] -= 1;
      placements.push({ kind, x, y, shape });
      for (const [cellX, cellY] of cells) occupied.add(`${cellX},${cellY}`);
      if (visit()) return true;
      for (const [cellX, cellY] of cells) occupied.delete(`${cellX},${cellY}`);
      placements.pop();
      remaining[kind] += 1;
    }
    return false;
  };
  const solved = visit();
  console.log(JSON.stringify({ solved, nodes, placements }, null, 2));
}
