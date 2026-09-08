// src/core/types.ts
var COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
var rect = (width, height) => {
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push([x, y]);
  }
  return cells;
};
var shape = (...rows) => {
  const cells = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell !== ".") cells.push([x, y]);
    });
  });
  return cells;
};

// src/core/boardTopology.ts
var key = (x, y) => `${x},${y}`;
var DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
var enclosedBoardVoids = (rows, width, height) => {
  const isVoid = (x, y) => rows[y]?.[x] !== "#";
  const outside = /* @__PURE__ */ new Set();
  const queue = [];
  const addOutside = (x, y) => {
    const cell = key(x, y);
    if (!isVoid(x, y) || outside.has(cell)) return;
    outside.add(cell);
    queue.push([x, y]);
  };
  for (let x = 0; x < width; x += 1) {
    addOutside(x, 0);
    addOutside(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    addOutside(0, y);
    addOutside(width - 1, y);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      addOutside(nx, ny);
    }
  }
  const enclosed = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isVoid(x, y) && !outside.has(key(x, y))) enclosed.push([x, y]);
    }
  }
  return enclosed;
};
var fillEnclosedBoardVoids = (rows, width, height) => {
  const enclosed = new Set(enclosedBoardVoids(rows, width, height).map(([x, y]) => key(x, y)));
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_2, x) => rows[y]?.[x] === "#" || enclosed.has(key(x, y)) ? "#" : ".").join(""));
};

// src/core/boardShapes.ts
var RAW_BOARD_SHAPE_ROWS = {
  // Level 1: corner-notches
  1: ["#####", "#####", "#####", "##.##", "#####"],
  // Level 2: hourglass
  2: ["..###.", "######", "######", "######", "######", ".#####"],
  // Level 3: vertical-dumbbell
  3: ["..####", ".#####", ".#####", "######", "######", "######"],
  // Level 4: crossroads
  4: [".#######", ".#######", "########", "########", "########", ".#######", "..######"],
  // Level 5: descending-steps
  5: [".######.", "#######.", "#######.", ".#######", "########", "########", "########", "#######."],
  // Level 6: ascending-steps
  6: ["#######", "#######", "#######", "#######", "######.", "######.", ".#####."],
  // Level 7: twin-chambers
  7: [".######", "#######", "#######", "..#####", "..#####", "#######", "#######", "#######"],
  // Level 8: top-hammer
  8: [".#######.", ".#######.", "#########", "#########", "#########", "#########", "########.", "########."],
  // Level 9: u-bay
  9: ["..######.", ".#######.", "#########", "#########", "#########", "#########", "#########", "########."],
  // Level 10: s-bend
  10: ["..######", "..######", "..######", "########", "########", "########", "########", "########", "########"],
  // Level 11: side-bays
  11: ["######.", "#######", "#######", "..#####", ".######", "#######", ".######"],
  // Level 12: narrow-bridge
  12: ["..######", ".#######", "########", "..######", "########", "########", ".#######"],
  // Level 13: corner-notches
  13: ["...####..", ".#######.", "#########", "#########", "#########", "#########", "#########", "#########"],
  // Level 14: hourglass
  14: ["..######..", ".########.", "##########", "##########", "##########", "##########", ".#########", ".#########"],
  // Level 15: vertical-dumbbell
  15: ["..####.", ".######", "#######", "#######", "#######", "#######", "######."],
  // Level 16: crossroads
  16: ["######.", "#######", "#######", "#######", "#######", "..#####", "..#####"],
  // Level 17: descending-steps
  17: ["...###..", ".######.", "########", "########", "########", "########", "########", "########", "########"],
  // Level 18: ascending-steps
  18: ["#######..", "########.", "#########", "#########", "#########", "#########", "########.", "######..."],
  // Level 19: twin-chambers
  19: ["##.####..", "#######..", ".########", ".########", "#########", "#########", "#########", "#########", "########.", "########."],
  // Level 20: top-hammer
  20: ["..########", ".#########", ".#########", ".#########", "..########", ".#########", "##########", "##########", "##########", "#########."],
  // Level 21: u-bay
  21: ["#######.", "#######.", "#######.", "########", "########", "########", "########", "########", "...#####"],
  // Level 22: s-bend
  22: ["..#####..", ".######..", "#######..", "#########", "#########", "#########", "#########", "#########", "#########", "########."],
  // Level 23: side-bays
  23: ["...##...", ".######.", "########", "########", "########", "########", "########", "########"],
  // Level 24: narrow-bridge
  24: ["##########", "##########", "##########", "##########", "..########", "..########", "##########", "##########", "...#######", "....######"],
  // Level 25: corner-notches
  25: ["...####..", "..######.", ".########", "#########", "#########", "#########", "#########", "#########", "#########"],
  // Level 26: hourglass
  26: ["...#######", ".#########", ".#########", "##########", "#########.", "#########.", "##########", ".#########", ".#########", ".########."],
  // Level 27: vertical-dumbbell
  27: ["###.##..##", "##########", "#########.", "##########", "##########", "##########", "##########", "########..", "..######.."],
  // Level 28: crossroads
  28: ["######....", "#######...", "##########", "##########", "##########", "##########", "##########", "##########", "..########", "..########"],
  // Level 29: descending-steps
  29: ["..#####..", ".#######.", "########.", "#########", "#########", ".########", "#########", "#########", "########."],
  // Level 30: ascending-steps
  30: ["######.....", "######.....", "#######.###", "###########", "###########", "###########", "###########", "###########", "##########.", "##########."],
  // Level 31: twin-chambers
  31: ["#########", "#########", "#########", "...######", "...######", "...######", "#########", "#########", "#########"],
  // Level 32: top-hammer
  32: ["########", "########", "########", "########", "########", "...##.##", "...##.##", "...##.##"],
  // Level 33: u-bay
  33: ["###...##.", "###...##.", "###...###", "#########", "#########", "#########", "#########", "#########", "#########", "########."],
  // Level 34: s-bend
  34: ["......#####", ".....######", "###########", "###########", "###########", "###########", "###########", "##########.", "##########.", "##########."],
  // Level 35: side-bays
  35: ["..#######", ".########", ".########", ".########", ".########", "#########", "#########", "#########", ".########", "...######"],
  // Level 36: narrow-bridge
  36: ["##..######", "##########", "##########", "##########", "##########", "..########", "..########", "..########", "..######.."],
  // Level 37: corner-notches
  37: ["....######.", "..########.", "###########", "###########", "###########", "###########", "###########", "##########.", "#########..", "########..."],
  // Level 38: hourglass
  38: [".########", ".########", ".########", ".########", "#########", "#########", "..#######", "..#######", "..#######", "..#######"],
  // Level 39: vertical-dumbbell
  39: ["##########.", "##########.", "##########.", "###########", "###########", "###########", "###########", "####...####", ".###..#####", "...#..#####"],
  // Level 40: crossroads
  40: ["....###....", "...########", "###########", "###########", "###########", "###########", "##########.", "###########", "##.########"],
  // Level 41: descending-steps
  41: ["#####....", "#######..", "########.", "#########", "#########", "########.", "########.", "#######.."],
  // Level 42: ascending-steps
  42: ["##.####..", "##.####..", "...######", ".########", "#########", "#########", ".########", "#########", "########.", "########."],
  // Level 43: twin-chambers
  43: ["..########.", ".#########.", ".##########", ".##########", "...########", "...########", "###########", "###########", "##########.", "#########.."],
  // Level 44: top-hammer
  44: ["....######", ".#########", ".#########", "##########", "#########.", "#########.", "#########.", "...#######", ".#########", ".########."],
  // Level 45: u-bay
  45: ["...####..", ".#######.", ".########", "#########", "#########", "#########", "########.", "#######.."],
  // Level 46: s-bend
  46: ["##########.", "##########.", "##########.", "###########", "###########", "##########.", "#########..", "########...", "..######..."],
  // Level 47: side-bays
  47: ["##########", "##########", "##########", "##########", "##########", "##########", "##...#####", "##...#####", "....######", "....######"],
  // Level 48: narrow-bridge
  48: ["##....##.", "##.#####.", "########.", "########.", "#########", "#########", "#########", "#########", "#######..", "#######.."],
  // Level 49: corner-notches
  49: ["####......", "####......", "##########", "##########", "##########", "##########", "##########", "##########", ".#########", ".#########"],
  // Level 50: hourglass
  50: ["##..######", "##########", ".#########", "##########", "##########", "..########", "..########", "..########", "..######.."],
  // Level 51: vertical-dumbbell
  51: [".##...###", ".##...###", "#########", "#########", "#########", "#########", "#########", "###.#####", ".##.#####", "..#.#####"],
  // Level 52: crossroads
  52: ["##.##...", "#######.", "#######.", "########", "########", "...##...", "...####.", "...####."],
  // Level 53: descending-steps
  53: ["######....", "######....", "#####...##", "#######.##", "########..", "########..", "##########", "##########", "##########", "##########"],
  // Level 54: ascending-steps
  54: ["....##....", "..########", "##########", "#########.", "#########.", "#########.", "#########.", "##########", "##########"],
  // Level 55: twin-chambers
  55: ["#######.", "########", "########", "...####.", "...####.", "########", "########", "#######."],
  // Level 56: top-hammer
  56: ["......####", "......####", "##########", "##########", "##########", "##########", "##########", "##########", "#########.", "#########."],
  // Level 57: u-bay
  57: ["##.####..", "#######..", ".######..", ".######..", "#########", "#########", ".########", "#########", "########.", "########."],
  // Level 58: s-bend
  58: ["....######", "....######", "##########", "##########", "..########", "..########", "##########", "##########", "##########", "##########"],
  // Level 59: side-bays
  59: ["....#####", "...######", "..#######", ".########", "#########", "#########", ".########", ".########", ".########", ".########"],
  // Level 60: narrow-bridge
  60: ["############", "############", "############", "############", "....########", "....########", ".###########", "..##########", "..##########", "..##########"],
  // Level 61: corner-notches
  61: ["...#####", ".#######", ".#######", "########", "########", ".#######", ".#######", ".#######"],
  // Level 62: hourglass
  62: ["###.##..##", "######..##", "######....", "##########", "##########", ".#########", "##########", "########..", "..######.."],
  // Level 63: vertical-dumbbell
  63: ["#########.", "#########.", "##########", "##########", "##########", "##########", "##########", "##########", "......####", "......####"],
  // Level 64: crossroads
  64: ["##.#####..", "##.#####..", "########..", "##########", "##########", "##########", "##########", "#######...", "#######...", "#######..."],
  // Level 65: descending-steps
  65: ["######..", "#######.", "#######.", ".#######", ".#######", ".#######", ".#######", "..#####."],
  // Level 66: ascending-steps
  66: ["..########.", "..########.", "..#########", "..#########", "..########.", "..########.", "###########", "###########", "..########.", "##########.", "##########."],
  // Level 67: twin-chambers
  67: ["###########", "###########", "##########.", "#########..", "########...", "########...", ".##########", ".##########", "...######.."],
  // Level 68: top-hammer
  68: ["##########", "##########", "##########", "##########", ".....#####", ".....#####", "##...#####", "##....####", "##########", "##########"],
  // Level 69: u-bay
  69: [".##....##", ".##....##", "#########", "#########", "#########", "#########", ".########", ".########", "..#######", "..#######"],
  // Level 70: s-bend
  70: ["####..######", "####.#######", "############", "############", ".#########..", ".#########..", "##########..", "##########..", "##..######..", "##..######.."],
  // Level 71: side-bays
  71: ["....##.....", "....#######", "###########", "#########..", "#########..", "#########..", "###########", "###########", "###########"],
  // Level 72: narrow-bridge
  72: ["......##", "..######", ".#######", "########", "########", "########", "########", "...#####"],
  // Level 73: corner-notches
  73: ["####.......", "#####......", "##########.", "##########.", "###########", "###########", "##########.", "##########.", ".#########.", ".#########."],
  // Level 74: hourglass
  74: ["##.####..", "##.######", "...######", "...######", "#########", "#########", ".######..", "#######..", "########.", "########."],
  // Level 75: vertical-dumbbell
  75: ["...#####.", "..######.", ".#######.", "########.", "########.", "########.", "#########", "#########"],
  // Level 76: crossroads
  76: ["######....", "#########.", "##########", "##########", "#########.", "#########.", "##########", "##########", "##########", "##########"],
  // Level 77: descending-steps
  77: [".#########", ".#########", ".########.", ".########.", "#########.", "#########.", ".#########", "...#######", ".#########", ".####..##."],
  // Level 78: ascending-steps
  78: ["##########", "##########", "##########", "##########", "##########", "##########", "#########.", "#########.", "########..", "########.."],
  // Level 79: twin-chambers
  79: ["###.##..##", "###.##..##", "###.##....", "##########", "##########", "##########", "##########", "########..", "..######.."],
  // Level 80: top-hammer
  80: ["......####", "......####", "##..######", "##.#######", "##.#######", "##.#######", "##.#######", "##.#######", "##.#######", "##.#######", "##########", "##########"],
  // Level 81: u-bay
  81: [".######.", ".######.", ".######.", "########", "########", ".#######", "########", "#######."],
  // Level 82: s-bend
  82: ["##....##.", "##....##.", "#########", "#########", "#########", "#########", "#######..", "#######..", "#######..", "#######.."],
  // Level 83: side-bays
  83: ["....######.", "....######.", "##...######", "##...######", "##########.", "##########.", "##########.", "##########.", "##########.", "##########."],
  // Level 84: narrow-bridge
  84: ["##..##.####", "##.########", ".#########.", "##########.", "##########.", "..########.", "..#########", "..#########", "..######..."],
  // Level 85: corner-notches
  85: ["...###..", "...###..", "..####..", "########", "########", "########", ".#######", "########", "########"],
  // Level 86: hourglass
  86: ["#########.", "#########.", "#########.", "##########", "##########", "##########", "#######.##", "####....##", "......####", "......####"],
  // Level 87: vertical-dumbbell
  87: [".##....##.", ".##....###", "##########", "##########", "##########", "##########", "..########", "..#######.", "..########", "..########"],
  // Level 88: crossroads
  88: ["..########.", "..########.", "..#########", "..#########", "...#######.", "...#######.", "##.########", "##.########", "##########.", "##########."],
  // Level 89: descending-steps
  89: ["..######..", "..########", "..########", "..#######.", "##########", "##########", "...#######", "##.#######", "##..##.###"],
  // Level 90: ascending-steps
  90: ["############", "############", "############", "############", "############", "############", "##.##.##.##.", "##.##.##.##.", "##.##.##.##.", "##.##.##.##.", "##.##.##.##.", "##.##.##.##."],
  // Level 91: twin-chambers
  91: ["##.####...", "#######...", ".######...", ".######...", "##########", "##########", ".########.", "#########.", "########..", "########.."],
  // Level 92: top-hammer
  92: ["########", "########", "########", "########", "########", "...#####", "....#.##", "......##"],
  // Level 93: u-bay
  93: ["##########", "##########", "##########", "##########", "##########", "##########", "##....####", "##....####", "....######", "....######"],
  // Level 94: s-bend
  94: ["....##.##", "....#####", ".######..", ".######..", "#########", "#########", "#########", "#########", ".########", ".###...##"],
  // Level 95: side-bays
  95: [".####..", ".####..", ".####..", "#######", "#######", ".######", "#######", "#######"],
  // Level 96: narrow-bridge
  96: ["####.......", "####.......", "##########.", "##########.", "###########", "###########", "##########.", "##########.", "..########.", "..########."],
  // Level 97: corner-notches
  97: ["###.##..##.", "###.##..##.", "###.######.", "###########", "###########", "##########.", "########...", "########...", "..######..."],
  // Level 98: hourglass
  98: ["######.....", "######.....", "######..###", "######..###", "#######....", "#######....", "###########", "###########", "##########.", "##########."],
  // Level 99: vertical-dumbbell
  99: ["##....##..", "####..##..", "####..##..", "##########", "##########", "##########", "#########.", "#########.", "########..", "#######..."],
  // Level 100: crossroads
  100: ["..######....", "..######....", "..##########", "..##########", "############", "############", "############", "############", "##########..", "##########..", "....######..", "....######.."]
};
var BOARD_SHAPE_ROWS = Object.fromEntries(
  Object.entries(RAW_BOARD_SHAPE_ROWS).map(([id, rows]) => [
    Number(id),
    fillEnclosedBoardVoids(rows, Math.max(...rows.map((row) => row.length)), rows.length)
  ])
);
var BOARD_PAR_OVERRIDES = {};
var boardShapeForLevel = (levelId, width, height) => {
  const stored = BOARD_SHAPE_ROWS[levelId];
  const dimensionsMatch = width === void 0 || height === void 0 || stored?.length === height && stored.every((row) => row.length === width);
  const rows = dimensionsMatch && stored ? stored : width !== void 0 && height !== void 0 ? Array.from({ length: height }, () => "#".repeat(width)) : stored;
  if (!rows) return void 0;
  const cells = [];
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "#") cells.push([x, y]);
  }));
  return cells;
};
var boardParForLevel = (levelId) => BOARD_PAR_OVERRIDES[levelId];

// src/core/campaignComposition.ts
var COMPETITOR_VISIBLE_BLOCK_TARGETS = [
  5,
  5,
  5,
  6,
  6,
  8,
  7,
  9,
  10,
  6,
  7,
  9,
  8,
  10,
  5,
  8,
  9,
  10,
  13,
  13,
  5,
  7,
  8,
  9,
  5,
  8,
  9,
  10,
  8,
  10,
  6,
  8,
  9,
  10,
  4,
  9,
  8,
  10,
  8,
  11,
  6,
  8,
  9,
  10,
  6,
  9,
  8,
  10,
  9,
  6,
  7,
  9,
  10,
  11,
  7,
  10,
  9,
  11,
  10,
  11,
  7,
  8,
  10,
  11,
  7,
  10,
  9,
  9,
  10,
  5,
  8,
  10,
  11,
  9,
  8,
  11,
  10,
  12,
  8,
  12,
  8,
  10,
  11,
  12,
  8,
  11,
  10,
  12,
  8,
  12,
  9,
  11,
  12,
  13,
  9,
  12,
  11,
  12,
  12,
  14
];
var VALIDATED_ROUTE_PAR_MOVES = [
  2,
  3,
  12,
  7,
  6,
  9,
  9,
  11,
  12,
  4,
  8,
  11,
  10,
  12,
  6,
  9,
  10,
  14,
  14,
  12,
  7,
  8,
  10,
  10,
  7,
  11,
  11,
  12,
  12,
  10,
  11,
  13,
  12,
  10,
  7,
  10,
  15,
  12,
  11,
  13,
  10,
  10,
  15,
  15,
  12,
  11,
  15,
  14,
  15,
  9,
  11,
  19,
  19,
  23,
  12,
  21,
  13,
  18,
  14,
  16,
  13,
  14,
  22,
  17,
  11,
  18,
  13,
  16,
  17,
  10,
  12,
  19,
  20,
  21,
  15,
  22,
  16,
  27,
  26,
  25,
  17,
  18,
  23,
  19,
  17,
  29,
  18,
  23,
  27,
  17,
  16,
  24,
  33,
  23,
  21,
  35,
  21,
  36,
  24,
  31
];
var key2 = (x, y) => `${x},${y}`;
var STRATEGY_PLAYABLE_ADDITIONS = {
  62: [[6, 2], [7, 2], [8, 2], [9, 2]],
  68: [[5, 7]],
  79: [[6, 2], [7, 2], [8, 2], [9, 2]]
};
var addStrategyParkingCells = (input) => {
  const additions = STRATEGY_PLAYABLE_ADDITIONS[input.id];
  if (!additions?.length) return input;
  const playable = new Map((input.playable ?? []).map(([x, y]) => [key2(x, y), [x, y]]));
  for (const [x, y] of additions) playable.set(key2(x, y), [x, y]);
  return { ...input, playable: [...playable.values()] };
};
var COMPACT_SHAPES = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]]
];
var VERTICAL_EXIT_SHAPES = [
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2]]
];
var STRATEGY_GATE_GUARDS = {
  42: [{ id: "strategy-guard-a", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "purple" }],
  62: [{ id: "strategy-guard-a", x: 8, y: 1, shape: [[0, 0], [1, 0]], color: "cyan" }],
  74: [{ id: "strategy-guard-a", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "red" }],
  79: [{ id: "strategy-guard-a", x: 8, y: 1, shape: [[0, 0], [1, 0]], color: "purple" }],
  89: [
    { id: "strategy-guard-a", x: 0, y: 8, shape: [[0, 0], [1, 0]], color: "purple" },
    { id: "strategy-guard-b", x: 9, y: 7, shape: [[0, 0], [0, 1]], color: "red" }
  ]
};
var transpose = (shape2) => shape2.map(([x, y]) => [y, x]);
var shapeForGate = (side, index) => {
  const vertical = VERTICAL_EXIT_SHAPES[index % VERTICAL_EXIT_SHAPES.length];
  return (side === "top" || side === "bottom" ? vertical : transpose(vertical)).map(([x, y]) => [x, y]);
};
var isTwoByTwoSquare = (shape2) => {
  const cells = new Set(shape2.map(([x, y]) => key2(x, y)));
  return cells.size === 4 && [key2(0, 0), key2(1, 0), key2(0, 1), key2(1, 1)].every((cell) => cells.has(cell));
};
var closedShutterCells = (level) => {
  const cells = /* @__PURE__ */ new Set();
  for (const shutter of level.shutters ?? []) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.add(key2(x, y));
    }
  }
  return cells;
};
var addStrategyGateGuards = (input) => {
  const guards = STRATEGY_GATE_GUARDS[input.id];
  if (!guards?.length) return input;
  const playable = new Set((input.playable ?? []).map(([x, y]) => key2(x, y)));
  const occupied = new Set(input.blocks.flatMap((block) => block.shape.map(([dx, dy]) => key2(block.x + dx, block.y + dy))));
  const blocks = [...input.blocks];
  for (const guard of guards) {
    const cell = key2(guard.x, guard.y);
    if (!playable.has(cell) || occupied.has(cell)) continue;
    const cells = guard.shape.map(([dx, dy]) => key2(guard.x + dx, guard.y + dy));
    if (!cells.every((candidate) => playable.has(candidate) && !occupied.has(candidate))) continue;
    blocks.push({ ...guard, shape: guard.shape.map(([x, y]) => [x, y]) });
    for (const candidate of cells) occupied.add(candidate);
  }
  return { ...input, blocks };
};
var placementTouchesGate = (level, shape2, gate, x, y) => shape2.some(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  if (gate.side === "top") return cellY === 0 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "bottom") return cellY === level.height - 1 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "left") return cellX === 0 && cellY >= gate.offset && cellY < gate.offset + gate.size;
  return cellX === level.width - 1 && cellY >= gate.offset && cellY < gate.offset + gate.size;
});
var placementFitsGate = (level, shape2, gate, x, y) => {
  const cells = shape2.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};
var canReachGateIgnoringBlocks = (level, shape2, gate, startX, startY) => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => key2(x, y)));
  const canPlace = (x, y) => shape2.every(([dx, dy]) => playable.has(key2(x + dx, y + dy)));
  if (!canPlace(startX, startY)) return false;
  const queue = [[startX, startY]];
  const visited = /* @__PURE__ */ new Set([key2(startX, startY)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (placementFitsGate(level, shape2, gate, x, y)) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const cell = key2(nextX, nextY);
      if (visited.has(cell) || !canPlace(nextX, nextY)) continue;
      visited.add(cell);
      queue.push([nextX, nextY]);
    }
  }
  return false;
};
var addVisibleBlocks = (input) => {
  const target = Math.max(5, COMPETITOR_VISIBLE_BLOCK_TARGETS[input.id - 1] ?? input.blocks.length);
  const level = { ...input, blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape] })) };
  const closedIds = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const visible = () => level.blocks.filter((block) => !block.shutterId || !closedIds.has(block.shutterId));
  if (visible().length >= target) return level;
  const playable = new Set((level.playable ?? []).map(([x, y]) => key2(x, y)));
  const shutterCells = closedShutterCells(level);
  const occupied = new Set(visible().flatMap((block) => block.shape.map(([dx, dy]) => key2(block.x + dx, block.y + dy))));
  const reservedCells = /* @__PURE__ */ new Set();
  const openGates = level.gates.filter((gate) => (gate.frozen ?? 0) === 0);
  const candidateGates = openGates.length ? openGates : level.gates;
  let added = 0;
  while (visible().length < target && candidateGates.length) {
    let placed;
    for (let gateOffset = 0; gateOffset < candidateGates.length && !placed; gateOffset += 1) {
      const gate = candidateGates[(level.id + added + gateOffset) % candidateGates.length];
      const shapeCandidateCount = VERTICAL_EXIT_SHAPES.length;
      for (let shapeOffset = 0; shapeOffset < shapeCandidateCount && !placed; shapeOffset += 1) {
        const shape2 = shapeForGate(gate.side, level.id + added + shapeOffset);
        const destinations = [];
        for (let y = 0; y < level.height; y += 1) {
          for (let x = 0; x < level.width; x += 1) {
            const ownCells = new Set(shape2.map(([dx, dy]) => key2(x + dx, y + dy)));
            if (![...ownCells].every((cell) => playable.has(cell) && !shutterCells.has(cell) && !occupied.has(cell) && !reservedCells.has(cell))) continue;
            if (placementTouchesGate(level, shape2, gate, x, y)) continue;
            if (!canReachGateIgnoringBlocks(level, shape2, gate, x, y)) continue;
            const canMove = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([moveX, moveY]) => shape2.every(([dx, dy]) => {
              const destination = key2(x + moveX + dx, y + moveY + dy);
              return playable.has(destination) && !shutterCells.has(destination) && (!occupied.has(destination) || ownCells.has(destination));
            }));
            if (!canMove) continue;
            let contacts = 0;
            for (const cell of ownCells) {
              const [cellX, cellY] = cell.split(",").map(Number);
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (occupied.has(key2(cellX + dx, cellY + dy))) contacts += 1;
              }
            }
            const width = Math.max(...shape2.map(([dx]) => dx)) + 1;
            const height = Math.max(...shape2.map(([, dy]) => dy)) + 1;
            const centerDistance = Math.abs(x + width / 2 - level.width / 2) + Math.abs(y + height / 2 - level.height / 2);
            const gateDistance = gate.side === "top" ? y : gate.side === "bottom" ? level.height - y - height : gate.side === "left" ? x : level.width - x - width;
            const noise = (x * 17 + y * 29 + level.id * 11 + added * 7) % 13;
            destinations.push({ x, y, score: contacts * 24 + gateDistance * 5 - centerDistance * 2 + noise });
          }
        }
        destinations.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
        if (destinations[0]) placed = { ...destinations[0], shape: shape2, gate };
      }
    }
    if (!placed) break;
    const color = placed.gate.color;
    const block = {
      id: `composition-${level.id}-${added + 1}`,
      x: placed.x,
      y: placed.y,
      shape: placed.shape,
      color
    };
    level.blocks.push(block);
    for (const [dx, dy] of block.shape) occupied.add(key2(block.x + dx, block.y + dy));
    added += 1;
  }
  if (added > 0) level.parMoves = (level.parMoves ?? input.blocks.length) + added;
  return level;
};
var diversifySquares = (input) => ({
  ...input,
  blocks: input.blocks.map((block, index) => {
    if (input.id === 10 || !isTwoByTwoSquare(block.shape)) return { ...block, shape: [...block.shape] };
    const variant = COMPACT_SHAPES[(input.id + index * 5) % COMPACT_SHAPES.length];
    return { ...block, shape: variant.map(([x, y]) => [x, y]) };
  })
});
var applyCompetitiveComposition = (input) => {
  const level = addVisibleBlocks(addStrategyGateGuards(diversifySquares(addStrategyParkingCells(input))));
  return { ...level, parMoves: VALIDATED_ROUTE_PAR_MOVES[level.id - 1] ?? level.parMoves };
};

// src/core/campaignStrategyLayouts.ts
var STRATEGY_LAYOUT_OVERRIDES = {
  "1": {
    "parMoves": 8,
    "positions": {
      "red-a": [
        1,
        3
      ],
      "blue-a": [
        1,
        0
      ],
      "composition-1-1": [
        0,
        0
      ],
      "composition-1-2": [
        2,
        1
      ],
      "composition-1-3": [
        0,
        3
      ]
    }
  },
  "2": {
    "parMoves": 8,
    "positions": {
      "red-l": [
        2,
        2
      ],
      "yellow-t": [
        1,
        4
      ],
      "blue-l": [
        4,
        1
      ],
      "composition-2-1": [
        3,
        0
      ],
      "composition-2-2": [
        4,
        3
      ]
    }
  },
  "3": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        2,
        2
      ],
      "blue-load": [
        2,
        0
      ],
      "composition-3-1": [
        4,
        0
      ],
      "composition-3-2": [
        1,
        2
      ],
      "composition-3-3": [
        3,
        3
      ]
    }
  },
  "4": {
    "parMoves": 9,
    "positions": {
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        2,
        0
      ],
      "composition-4-1": [
        3,
        1
      ],
      "composition-4-2": [
        1,
        0
      ],
      "composition-4-3": [
        6,
        3
      ],
      "composition-4-4": [
        1,
        2
      ]
    }
  },
  "5": {
    "parMoves": 9,
    "positions": {
      "red-target": [
        1,
        5
      ],
      "blue-load": [
        2,
        2
      ],
      "composition-5-1": [
        2,
        0
      ],
      "composition-5-2": [
        1,
        3
      ],
      "composition-5-3": [
        4,
        0
      ],
      "composition-5-4": [
        4,
        3
      ]
    }
  },
  "6": {
    "parMoves": 11,
    "positions": {
      "yellow-a": [
        0,
        0
      ],
      "red-a": [
        2,
        6
      ],
      "blue-a": [
        3,
        0
      ],
      "green-a": [
        3,
        3
      ],
      "composition-6-1": [
        0,
        3
      ],
      "composition-6-2": [
        6,
        0
      ],
      "composition-6-3": [
        1,
        1
      ],
      "composition-6-4": [
        5,
        2
      ]
    }
  },
  "7": {
    "parMoves": 10,
    "positions": {
      "red-target": [
        3,
        2
      ],
      "blue-load": [
        3,
        0
      ],
      "composition-7-1": [
        2,
        3
      ],
      "composition-7-2": [
        2,
        6
      ],
      "composition-7-3": [
        4,
        4
      ],
      "composition-7-4": [
        4,
        1
      ],
      "composition-7-5": [
        1,
        0
      ]
    }
  },
  "8": {
    "parMoves": 14,
    "positions": {
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        2,
        0
      ],
      "green-target": [
        0,
        2
      ],
      "yellow-load": [
        7,
        2
      ],
      "composition-8-1": [
        1,
        3
      ],
      "composition-8-2": [
        3,
        1
      ],
      "composition-8-3": [
        0,
        5
      ],
      "composition-8-4": [
        4,
        3
      ],
      "composition-8-5": [
        2,
        1
      ]
    }
  },
  "9": {
    "parMoves": 14,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        7,
        3
      ],
      "composition-9-1": [
        2,
        3
      ],
      "composition-9-2": [
        4,
        4
      ],
      "composition-9-3": [
        3,
        2
      ],
      "composition-9-4": [
        1,
        4
      ],
      "composition-9-5": [
        6,
        1
      ],
      "composition-9-6": [
        6,
        5
      ]
    }
  },
  "10": {
    "parMoves": 9,
    "positions": {
      "yellow-a": [
        3,
        0
      ],
      "red-ice": [
        0,
        4
      ],
      "blue-ice": [
        3,
        2
      ],
      "green-ice": [
        3,
        4
      ],
      "composition-10-1": [
        0,
        1
      ],
      "composition-10-2": [
        5,
        0
      ]
    }
  },
  "11": {
    "parMoves": 10,
    "positions": {
      "cyan-opener": [
        2,
        1
      ],
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        6,
        3
      ],
      "composition-11-1": [
        4,
        2
      ],
      "composition-11-2": [
        6,
        4
      ],
      "composition-11-3": [
        1,
        1
      ],
      "composition-11-4": [
        4,
        5
      ]
    }
  },
  "12": {
    "parMoves": 12,
    "positions": {
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        3,
        0
      ],
      "composition-12-1": [
        5,
        4
      ],
      "composition-12-2": [
        6,
        4
      ],
      "composition-12-3": [
        2,
        4
      ],
      "composition-12-4": [
        5,
        0
      ],
      "composition-12-5": [
        2,
        1
      ],
      "composition-12-6": [
        7,
        2
      ],
      "composition-12-7": [
        7,
        5
      ]
    }
  },
  "13": {
    "parMoves": 11,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        7,
        2
      ],
      "yellow-load": [
        0,
        2
      ],
      "composition-13-1": [
        4,
        3
      ],
      "composition-13-2": [
        2,
        3
      ],
      "composition-13-3": [
        1,
        2
      ],
      "composition-13-4": [
        1,
        4
      ]
    }
  },
  "14": {
    "parMoves": 15,
    "positions": {
      "red-target": [
        4,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        7,
        3
      ],
      "yellow-load": [
        0,
        3
      ],
      "composition-14-1": [
        6,
        4
      ],
      "composition-14-2": [
        4,
        3
      ],
      "composition-14-3": [
        6,
        0
      ],
      "composition-14-4": [
        3,
        1
      ],
      "composition-14-5": [
        3,
        2
      ],
      "composition-14-6": [
        7,
        5
      ]
    }
  },
  "15": {
    "parMoves": 12,
    "positions": {
      "layer-a": [
        2,
        2
      ],
      "layer-b": [
        4,
        0
      ],
      "composition-15-1": [
        1,
        0
      ],
      "composition-15-2": [
        0,
        2
      ],
      "composition-15-3": [
        4,
        2
      ]
    }
  },
  "16": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "composition-16-1": [
        4,
        5
      ],
      "composition-16-2": [
        1,
        6
      ],
      "composition-16-3": [
        6,
        7
      ],
      "composition-16-4": [
        2,
        8
      ],
      "composition-16-5": [
        2,
        4
      ],
      "composition-16-6": [
        3,
        2
      ]
    }
  },
  "17": {
    "parMoves": 12,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        2,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        5,
        2
      ],
      "composition-17-1": [
        1,
        4
      ],
      "composition-17-2": [
        2,
        5
      ],
      "composition-17-3": [
        0,
        2
      ],
      "composition-17-4": [
        1,
        5
      ],
      "composition-17-5": [
        1,
        1
      ]
    }
  },
  "18": {
    "parMoves": 16,
    "positions": {
      "red-target": [
        2,
        2
      ],
      "blue-load": [
        7,
        2
      ],
      "green-target": [
        3,
        0
      ],
      "yellow-load": [
        3,
        7
      ],
      "composition-18-1": [
        3,
        1
      ],
      "composition-18-2": [
        2,
        0
      ],
      "composition-18-3": [
        4,
        2
      ],
      "composition-18-4": [
        5,
        3
      ],
      "composition-18-5": [
        2,
        5
      ],
      "composition-18-6": [
        1,
        5
      ]
    }
  },
  "19": {
    "parMoves": 16,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        5,
        0
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        2
      ],
      "composition-19-1": [
        4,
        2
      ],
      "composition-19-2": [
        5,
        4
      ],
      "composition-19-3": [
        2,
        4
      ],
      "composition-19-4": [
        4,
        6
      ],
      "composition-19-5": [
        4,
        7
      ],
      "composition-19-6": [
        6,
        5
      ],
      "composition-19-7": [
        1,
        2
      ]
    }
  },
  "20": {
    "parMoves": 17,
    "positions": {
      "cyan-open": [
        1,
        5
      ],
      "green-open": [
        5,
        8
      ],
      "pink-open": [
        2,
        3
      ],
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        3,
        0
      ],
      "orange-target": [
        1,
        1
      ],
      "yellow-load": [
        8,
        5
      ],
      "composition-20-1": [
        3,
        6
      ],
      "composition-20-2": [
        5,
        5
      ],
      "composition-20-3": [
        2,
        7
      ],
      "composition-20-4": [
        6,
        2
      ],
      "composition-20-5": [
        2,
        2
      ],
      "composition-20-6": [
        5,
        1
      ]
    }
  },
  "21": {
    "parMoves": 9,
    "positions": {
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        6,
        1
      ],
      "green-target": [
        1,
        5
      ],
      "yellow-load": [
        7,
        3
      ],
      "composition-21-1": [
        4,
        3
      ]
    }
  },
  "22": {
    "parMoves": 11,
    "positions": {
      "yellow-open": [
        4,
        4
      ],
      "green-open": [
        1,
        6
      ],
      "red-target": [
        3,
        2
      ],
      "blue-load": [
        3,
        1
      ],
      "composition-22-1": [
        1,
        4
      ],
      "composition-22-2": [
        1,
        7
      ],
      "composition-22-3": [
        3,
        6
      ]
    }
  },
  "23": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        1
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        6,
        3
      ],
      "composition-23-1": [
        0,
        4
      ],
      "composition-23-2": [
        2,
        3
      ],
      "composition-23-3": [
        3,
        3
      ],
      "composition-23-4": [
        0,
        6
      ]
    }
  },
  "24": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        5,
        5
      ],
      "green-open": [
        4,
        3
      ],
      "pink-open": [
        6,
        3
      ],
      "red-target": [
        5,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        7,
        5
      ],
      "yellow-load": [
        0,
        0
      ],
      "composition-24-1": [
        7,
        4
      ],
      "composition-24-2": [
        1,
        3
      ]
    }
  },
  "25": {
    "parMoves": 10,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        2
      ],
      "composition-25-1": [
        4,
        3
      ],
      "composition-25-2": [
        6,
        6
      ],
      "composition-25-3": [
        5,
        4
      ]
    }
  },
  "26": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        7,
        2
      ],
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-26-1": [
        8,
        1
      ],
      "composition-26-2": [
        6,
        1
      ]
    }
  },
  "27": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        5,
        1
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        7,
        1
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        5,
        7
      ],
      "purple-final": [
        6,
        5
      ],
      "composition-27-1": [
        4,
        2
      ],
      "composition-27-2": [
        7,
        5
      ],
      "composition-27-3": [
        3,
        5
      ]
    }
  },
  "28": {
    "parMoves": 13,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "green-open": [
        2,
        5
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        6,
        4
      ],
      "blue-load": [
        8,
        4
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        3,
        8
      ],
      "composition-28-1": [
        2,
        1
      ],
      "composition-28-2": [
        3,
        3
      ],
      "composition-28-3": [
        5,
        5
      ]
    }
  },
  "29": {
    "parMoves": 14,
    "positions": {
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "green-target": [
        7,
        3
      ],
      "yellow-load": [
        0,
        3
      ],
      "composition-29-1": [
        1,
        3
      ],
      "composition-29-2": [
        3,
        5
      ],
      "composition-29-3": [
        4,
        4
      ],
      "composition-29-4": [
        1,
        5
      ]
    }
  },
  "30": {
    "parMoves": 13,
    "positions": {
      "cyan-open": [
        4,
        1
      ],
      "green-open": [
        5,
        2
      ],
      "pink-open": [
        0,
        3
      ],
      "red-target": [
        4,
        6
      ],
      "blue-load": [
        3,
        8
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        7,
        3
      ],
      "composition-30-1": [
        4,
        7
      ],
      "composition-30-2": [
        3,
        5
      ],
      "composition-30-3": [
        3,
        3
      ]
    }
  },
  "31": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        2,
        3
      ],
      "blue-load": [
        5,
        5
      ],
      "composition-31-1": [
        7,
        2
      ],
      "composition-31-2": [
        4,
        2
      ],
      "composition-31-3": [
        3,
        0
      ],
      "composition-31-4": [
        6,
        0
      ]
    }
  },
  "32": {
    "parMoves": 14,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        6,
        3
      ],
      "yellow-load": [
        0,
        3
      ],
      "composition-32-1": [
        2,
        3
      ],
      "composition-32-2": [
        5,
        2
      ],
      "composition-32-3": [
        2,
        0
      ],
      "composition-32-4": [
        5,
        1
      ]
    }
  },
  "33": {
    "parMoves": 13,
    "positions": {
      "cyan-open": [
        0,
        6
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        3,
        8
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        6
      ],
      "composition-33-1": [
        4,
        5
      ],
      "composition-33-2": [
        1,
        7
      ],
      "composition-33-3": [
        6,
        5
      ]
    }
  },
  "34": {
    "parMoves": 13,
    "positions": {
      "cyan-open": [
        6,
        6
      ],
      "green-open": [
        7,
        6
      ],
      "pink-open": [
        7,
        7
      ],
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        1,
        3
      ],
      "orange-target": [
        3,
        2
      ],
      "yellow-load": [
        1,
        8
      ],
      "composition-34-1": [
        5,
        2
      ],
      "composition-34-2": [
        4,
        4
      ],
      "composition-34-3": [
        7,
        4
      ]
    }
  },
  "35": {
    "parMoves": 11,
    "positions": {
      "yellow-open": [
        3,
        4
      ],
      "green-open": [
        2,
        4
      ],
      "red-target": [
        4,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "composition-35-1": [
        3,
        6
      ],
      "composition-35-2": [
        1,
        6
      ],
      "composition-35-3": [
        5,
        4
      ]
    }
  },
  "36": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        3,
        1
      ],
      "red-target": [
        5,
        3
      ],
      "blue-load": [
        0,
        1
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        7
      ],
      "purple-final": [
        2,
        5
      ],
      "composition-36-1": [
        4,
        5
      ],
      "composition-36-2": [
        2,
        4
      ],
      "composition-36-3": [
        1,
        3
      ]
    }
  },
  "37": {
    "parMoves": 18,
    "positions": {
      "cyan-open": [
        6,
        2
      ],
      "green-open": [
        3,
        1
      ],
      "pink-open": [
        6,
        4
      ],
      "red-target": [
        4,
        6
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        6,
        6
      ],
      "yellow-load": [
        0,
        6
      ],
      "composition-37-1": [
        8,
        3
      ],
      "composition-37-2": [
        5,
        3
      ],
      "composition-37-3": [
        5,
        1
      ],
      "composition-37-4": [
        2,
        3
      ],
      "composition-37-5": [
        8,
        2
      ]
    }
  },
  "38": {
    "parMoves": 14,
    "positions": {
      "cyan-open": [
        7,
        6
      ],
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        6,
        8
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        6
      ],
      "composition-38-1": [
        6,
        3
      ],
      "composition-38-2": [
        3,
        7
      ],
      "composition-38-3": [
        4,
        6
      ],
      "composition-38-4": [
        3,
        3
      ]
    }
  },
  "39": {
    "parMoves": 14,
    "positions": {
      "cyan-open": [
        4,
        0
      ],
      "green-open": [
        4,
        2
      ],
      "pink-open": [
        6,
        2
      ],
      "red-target": [
        8,
        3
      ],
      "blue-load": [
        0,
        4
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        2,
        0
      ],
      "composition-39-1": [
        4,
        4
      ],
      "composition-39-2": [
        6,
        3
      ],
      "composition-39-3": [
        7,
        5
      ],
      "composition-39-4": [
        4,
        1
      ]
    }
  },
  "40": {
    "parMoves": 16,
    "positions": {
      "cyan-open": [
        2,
        7
      ],
      "red-target": [
        5,
        4
      ],
      "blue-load": [
        0,
        6
      ],
      "green-target": [
        4,
        7
      ],
      "yellow-load": [
        4,
        0
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-40-1": [
        5,
        1
      ],
      "composition-40-2": [
        7,
        3
      ],
      "composition-40-3": [
        1,
        4
      ],
      "composition-40-4": [
        4,
        2
      ],
      "composition-40-5": [
        2,
        5
      ]
    }
  },
  "41": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        0,
        3
      ],
      "blue-load": [
        5,
        6
      ],
      "green-target": [
        1,
        0
      ],
      "yellow-load": [
        3,
        5
      ],
      "composition-41-1": [
        1,
        1
      ],
      "composition-41-2": [
        1,
        5
      ]
    }
  },
  "42": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        0,
        2
      ],
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        2
      ],
      "strategy-guard-a": [
        0,
        0
      ],
      "composition-42-1": [
        1,
        3
      ]
    }
  },
  "43": {
    "parMoves": 16,
    "positions": {
      "cyan-open": [
        3,
        6
      ],
      "green-open": [
        6,
        6
      ],
      "pink-open": [
        6,
        4
      ],
      "red-target": [
        4,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        8,
        2
      ],
      "composition-43-1": [
        5,
        5
      ],
      "composition-43-2": [
        4,
        4
      ],
      "composition-43-3": [
        8,
        4
      ],
      "composition-43-4": [
        4,
        8
      ],
      "composition-43-5": [
        2,
        6
      ],
      "composition-43-6": [
        7,
        7
      ]
    }
  },
  "44": {
    "parMoves": 16,
    "positions": {
      "cyan-open": [
        6,
        2
      ],
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        7,
        0
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-44-1": [
        4,
        2
      ],
      "composition-44-2": [
        1,
        3
      ],
      "composition-44-3": [
        6,
        5
      ],
      "composition-44-4": [
        4,
        6
      ]
    }
  },
  "45": {
    "parMoves": 13,
    "positions": {
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "composition-45-1": [
        3,
        5
      ],
      "composition-45-2": [
        5,
        3
      ],
      "composition-45-3": [
        5,
        1
      ],
      "composition-45-4": [
        4,
        2
      ]
    }
  },
  "46": {
    "parMoves": 13,
    "positions": {
      "cyan-open": [
        6,
        0
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        8,
        1
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        5,
        7
      ],
      "purple-final": [
        6,
        5
      ],
      "composition-46-1": [
        3,
        0
      ],
      "composition-46-2": [
        4,
        2
      ],
      "composition-46-3": [
        7,
        3
      ]
    }
  },
  "47": {
    "parMoves": 17,
    "positions": {
      "cyan-open": [
        6,
        5
      ],
      "green-open": [
        3,
        6
      ],
      "pink-open": [
        2,
        4
      ],
      "red-target": [
        4,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        0,
        2
      ],
      "composition-47-1": [
        4,
        4
      ],
      "composition-47-2": [
        4,
        6
      ],
      "composition-47-3": [
        5,
        4
      ],
      "composition-47-4": [
        2,
        5
      ],
      "composition-47-5": [
        6,
        7
      ]
    }
  },
  "48": {
    "parMoves": 17,
    "positions": {
      "cyan-open": [
        0,
        6
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        1,
        8
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        6
      ],
      "composition-48-1": [
        0,
        5
      ],
      "composition-48-2": [
        2,
        4
      ],
      "composition-48-3": [
        3,
        5
      ],
      "composition-48-4": [
        6,
        3
      ]
    }
  },
  "49": {
    "parMoves": 20,
    "positions": {
      "cyan-open": [
        4,
        3
      ],
      "green-open": [
        2,
        4
      ],
      "pink-open": [
        2,
        2
      ],
      "red-target": [
        0,
        1
      ],
      "blue-load": [
        8,
        4
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        6,
        8
      ],
      "composition-49-1": [
        1,
        1
      ],
      "composition-49-2": [
        0,
        4
      ],
      "composition-49-3": [
        3,
        5
      ],
      "composition-49-4": [
        0,
        6
      ],
      "composition-49-5": [
        1,
        8
      ]
    }
  },
  "50": {
    "parMoves": 10,
    "positions": {
      "cyan-open": [
        3,
        1
      ],
      "red-target": [
        5,
        3
      ],
      "blue-load": [
        1,
        0
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        3
      ],
      "purple-final": [
        2,
        5
      ]
    }
  },
  "51": {
    "parMoves": 12,
    "positions": {
      "cyan-open": [
        7,
        6
      ],
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        6,
        8
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        6
      ],
      "composition-51-1": [
        6,
        3
      ]
    }
  },
  "52": {
    "parMoves": 21,
    "positions": {
      "red-target": [
        3,
        2
      ],
      "blue-load": [
        3,
        6
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        6,
        3
      ],
      "composition-52-1": [
        4,
        2
      ],
      "composition-52-2": [
        0,
        2
      ],
      "composition-52-3": [
        5,
        1
      ],
      "composition-52-4": [
        2,
        1
      ],
      "composition-52-5": [
        1,
        0
      ]
    }
  },
  "53": {
    "parMoves": 24,
    "positions": {
      "cyan-open": [
        1,
        2
      ],
      "green-open": [
        4,
        2
      ],
      "pink-open": [
        2,
        4
      ],
      "red-target": [
        4,
        6
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        8,
        6
      ],
      "composition-53-1": [
        0,
        3
      ],
      "composition-53-2": [
        2,
        5
      ],
      "composition-53-3": [
        4,
        4
      ],
      "composition-53-4": [
        0,
        1
      ],
      "composition-53-5": [
        3,
        1
      ],
      "composition-53-6": [
        0,
        5
      ],
      "composition-53-7": [
        5,
        2
      ]
    }
  },
  "54": {
    "parMoves": 24,
    "positions": {
      "cyan-open": [
        2,
        7
      ],
      "red-target": [
        5,
        4
      ],
      "blue-load": [
        0,
        6
      ],
      "green-target": [
        4,
        7
      ],
      "yellow-load": [
        4,
        0
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-54-1": [
        4,
        2
      ],
      "composition-54-2": [
        4,
        3
      ],
      "composition-54-3": [
        7,
        4
      ],
      "composition-54-4": [
        1,
        4
      ],
      "composition-54-5": [
        6,
        1
      ]
    }
  },
  "55": {
    "parMoves": 15,
    "positions": {
      "cyan-opener": [
        2,
        2
      ],
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        4,
        0
      ],
      "composition-55-1": [
        5,
        2
      ],
      "composition-55-2": [
        4,
        5
      ],
      "composition-55-3": [
        6,
        2
      ],
      "composition-55-4": [
        1,
        6
      ]
    }
  },
  "56": {
    "parMoves": 22,
    "positions": {
      "cyan-open": [
        6,
        2
      ],
      "green-open": [
        6,
        5
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        0,
        4
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        2,
        8
      ],
      "composition-56-1": [
        5,
        4
      ],
      "composition-56-2": [
        4,
        6
      ],
      "composition-56-3": [
        5,
        7
      ],
      "composition-56-4": [
        6,
        0
      ],
      "composition-56-5": [
        5,
        8
      ],
      "composition-56-6": [
        8,
        2
      ],
      "composition-56-7": [
        8,
        6
      ]
    }
  },
  "57": {
    "parMoves": 16,
    "positions": {
      "cyan-open": [
        0,
        3
      ],
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        2
      ],
      "composition-57-1": [
        2,
        4
      ],
      "composition-57-2": [
        4,
        4
      ],
      "composition-57-3": [
        1,
        1
      ]
    }
  },
  "58": {
    "parMoves": 27,
    "positions": {
      "cyan-open": [
        6,
        4
      ],
      "green-open": [
        6,
        2
      ],
      "pink-open": [
        8,
        4
      ],
      "red-target": [
        7,
        0
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        6,
        6
      ],
      "yellow-load": [
        0,
        6
      ],
      "composition-58-1": [
        5,
        2
      ],
      "composition-58-2": [
        5,
        0
      ],
      "composition-58-3": [
        4,
        5
      ],
      "composition-58-4": [
        2,
        4
      ],
      "composition-58-5": [
        8,
        6
      ],
      "composition-58-6": [
        7,
        3
      ],
      "composition-58-7": [
        2,
        2
      ]
    }
  },
  "59": {
    "parMoves": 17,
    "positions": {
      "cyan-open": [
        7,
        2
      ],
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        6,
        1
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-59-1": [
        2,
        4
      ],
      "composition-59-2": [
        1,
        6
      ],
      "composition-59-3": [
        5,
        3
      ],
      "composition-59-4": [
        4,
        2
      ]
    }
  },
  "60": {
    "parMoves": 17,
    "positions": {
      "red-target": [
        0,
        2
      ],
      "blue-load": [
        0,
        0
      ],
      "orange-target": [
        4,
        2
      ],
      "yellow-load": [
        4,
        0
      ],
      "pink-target": [
        8,
        2
      ],
      "green-load": [
        8,
        1
      ],
      "composition-60-1": [
        5,
        2
      ],
      "composition-60-2": [
        2,
        0
      ],
      "composition-60-3": [
        6,
        1
      ],
      "composition-60-4": [
        6,
        3
      ],
      "composition-60-5": [
        7,
        4
      ]
    }
  },
  "61": {
    "parMoves": 17,
    "positions": {
      "red-target": [
        5,
        3
      ],
      "blue-load": [
        0,
        3
      ],
      "green-target": [
        3,
        0
      ],
      "yellow-load": [
        3,
        6
      ],
      "composition-61-1": [
        5,
        0
      ],
      "composition-61-2": [
        3,
        2
      ],
      "composition-61-3": [
        6,
        0
      ]
    }
  },
  "62": {
    "parMoves": 14,
    "positions": {
      "cyan-open": [
        6,
        0
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        8,
        3
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        7
      ],
      "purple-final": [
        6,
        5
      ],
      "strategy-guard-a": [
        8,
        1
      ],
      "composition-62-1": [
        6,
        2
      ]
    }
  },
  "63": {
    "parMoves": 26,
    "positions": {
      "cyan-open": [
        6,
        5
      ],
      "green-open": [
        6,
        2
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        2,
        2
      ],
      "blue-load": [
        0,
        2
      ],
      "orange-target": [
        2,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "composition-63-1": [
        5,
        4
      ],
      "composition-63-2": [
        8,
        3
      ],
      "composition-63-3": [
        6,
        0
      ],
      "composition-63-4": [
        4,
        3
      ],
      "composition-63-5": [
        5,
        6
      ],
      "composition-63-6": [
        8,
        6
      ],
      "composition-63-7": [
        7,
        7
      ]
    }
  },
  "64": {
    "parMoves": 19,
    "positions": {
      "cyan-open": [
        0,
        6
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        0,
        8
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        6,
        4
      ],
      "purple-final": [
        5,
        6
      ],
      "composition-64-1": [
        2,
        3
      ],
      "composition-64-2": [
        1,
        6
      ],
      "composition-64-3": [
        3,
        5
      ],
      "composition-64-4": [
        4,
        6
      ],
      "composition-64-5": [
        4,
        4
      ]
    }
  },
  "65": {
    "parMoves": 12,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        7,
        3
      ],
      "orange-target": [
        5,
        6
      ],
      "purple-load": [
        1,
        6
      ],
      "composition-65-1": [
        3,
        6
      ]
    }
  },
  "66": {
    "parMoves": 24,
    "positions": {
      "cyan-open": [
        2,
        5
      ],
      "green-open": [
        6,
        6
      ],
      "pink-open": [
        3,
        7
      ],
      "red-target": [
        4,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        8,
        2
      ],
      "composition-66-1": [
        3,
        6
      ],
      "composition-66-2": [
        5,
        5
      ],
      "composition-66-3": [
        8,
        7
      ],
      "composition-66-4": [
        3,
        9
      ],
      "composition-66-5": [
        5,
        4
      ],
      "composition-66-6": [
        7,
        5
      ],
      "composition-66-7": [
        2,
        7
      ]
    }
  },
  "67": {
    "parMoves": 15,
    "positions": {
      "cyan-open": [
        2,
        0
      ],
      "red-target": [
        5,
        3
      ],
      "blue-load": [
        1,
        1
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        6
      ],
      "purple-final": [
        2,
        5
      ],
      "composition-67-1": [
        3,
        5
      ],
      "composition-67-2": [
        4,
        2
      ],
      "composition-67-3": [
        5,
        0
      ]
    }
  },
  "68": {
    "parMoves": 29,
    "positions": {
      "cyan-open": [
        6,
        4
      ],
      "green-open": [
        6,
        6
      ],
      "pink-open": [
        8,
        5
      ],
      "red-target": [
        8,
        8
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        0,
        2
      ],
      "composition-68-1": [
        6,
        8
      ],
      "composition-68-2": [
        3,
        8
      ],
      "composition-68-3": [
        1,
        7
      ],
      "composition-68-4": [
        7,
        4
      ],
      "composition-68-5": [
        5,
        4
      ]
    }
  },
  "69": {
    "parMoves": 22,
    "positions": {
      "cyan-open": [
        7,
        6
      ],
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        4,
        8
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        6
      ],
      "composition-69-1": [
        6,
        3
      ],
      "composition-69-2": [
        2,
        5
      ],
      "composition-69-3": [
        5,
        5
      ],
      "composition-69-4": [
        7,
        8
      ]
    }
  },
  "70": {
    "parMoves": 10,
    "positions": {
      "red-target": [
        10,
        2
      ],
      "blue-load": [
        10,
        1
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        0,
        1
      ],
      "pink-target": [
        2,
        4
      ],
      "green-load": [
        1,
        6
      ]
    }
  },
  "71": {
    "parMoves": 15,
    "positions": {
      "cyan-open": [
        2,
        7
      ],
      "red-target": [
        5,
        4
      ],
      "blue-load": [
        0,
        7
      ],
      "green-target": [
        4,
        7
      ],
      "yellow-load": [
        5,
        3
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-71-1": [
        4,
        6
      ],
      "composition-71-2": [
        4,
        3
      ]
    }
  },
  "72": {
    "parMoves": 24,
    "positions": {
      "red-target": [
        3,
        1
      ],
      "blue-load": [
        3,
        5
      ],
      "green-target": [
        6,
        3
      ],
      "yellow-load": [
        0,
        4
      ],
      "composition-72-1": [
        2,
        1
      ],
      "composition-72-2": [
        2,
        4
      ],
      "composition-72-3": [
        4,
        2
      ],
      "composition-72-4": [
        0,
        5
      ],
      "composition-72-5": [
        5,
        4
      ],
      "composition-72-6": [
        5,
        1
      ]
    }
  },
  "73": {
    "parMoves": 30,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "green-open": [
        2,
        5
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        6,
        4
      ],
      "blue-load": [
        8,
        4
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        6,
        8
      ],
      "composition-73-1": [
        3,
        4
      ],
      "composition-73-2": [
        4,
        5
      ],
      "composition-73-3": [
        1,
        4
      ],
      "composition-73-4": [
        3,
        6
      ],
      "composition-73-5": [
        2,
        0
      ],
      "composition-73-6": [
        1,
        3
      ],
      "composition-73-7": [
        1,
        0
      ],
      "composition-73-8": [
        1,
        7
      ]
    }
  },
  "74": {
    "parMoves": 19,
    "positions": {
      "cyan-open": [
        0,
        2
      ],
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        8,
        4
      ],
      "purple-final": [
        5,
        2
      ],
      "strategy-guard-a": [
        0,
        0
      ],
      "composition-74-1": [
        7,
        3
      ],
      "composition-74-2": [
        5,
        5
      ]
    }
  },
  "75": {
    "parMoves": 17,
    "positions": {
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        0,
        3
      ],
      "green-target": [
        3,
        6
      ],
      "yellow-load": [
        3,
        0
      ],
      "composition-75-1": [
        3,
        2
      ],
      "composition-75-2": [
        4,
        1
      ],
      "composition-75-3": [
        4,
        4
      ],
      "composition-75-4": [
        5,
        4
      ]
    }
  },
  "76": {
    "parMoves": 25,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "green-open": [
        5,
        1
      ],
      "pink-open": [
        2,
        4
      ],
      "red-target": [
        4,
        6
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        8,
        6
      ],
      "composition-76-1": [
        3,
        4
      ],
      "composition-76-2": [
        5,
        2
      ],
      "composition-76-3": [
        3,
        2
      ],
      "composition-76-4": [
        2,
        1
      ],
      "composition-76-5": [
        7,
        2
      ],
      "composition-76-6": [
        1,
        0
      ],
      "composition-76-7": [
        0,
        1
      ],
      "composition-76-8": [
        0,
        4
      ]
    }
  },
  "77": {
    "parMoves": 18,
    "positions": {
      "cyan-open": [
        7,
        2
      ],
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        6,
        0
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-77-1": [
        2,
        4
      ],
      "composition-77-2": [
        3,
        4
      ],
      "composition-77-3": [
        4,
        1
      ],
      "composition-77-4": [
        5,
        2
      ]
    }
  },
  "78": {
    "parMoves": 25,
    "positions": {
      "cyan-open": [
        4,
        5
      ],
      "green-open": [
        6,
        2
      ],
      "pink-open": [
        4,
        3
      ],
      "red-target": [
        8,
        2
      ],
      "blue-load": [
        0,
        4
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        2,
        8
      ],
      "composition-78-1": [
        8,
        3
      ],
      "composition-78-2": [
        5,
        2
      ],
      "composition-78-3": [
        6,
        4
      ],
      "composition-78-4": [
        8,
        4
      ],
      "composition-78-5": [
        5,
        6
      ],
      "composition-78-6": [
        4,
        7
      ],
      "composition-78-7": [
        4,
        1
      ],
      "composition-78-8": [
        3,
        0
      ]
    }
  },
  "79": {
    "parMoves": 17,
    "positions": {
      "cyan-open": [
        6,
        0
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        8,
        3
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        7
      ],
      "purple-final": [
        6,
        5
      ],
      "strategy-guard-a": [
        8,
        1
      ],
      "composition-79-1": [
        7,
        2
      ]
    }
  },
  "80": {
    "parMoves": 25,
    "positions": {
      "red-target": [
        6,
        0
      ],
      "blue-load": [
        8,
        0
      ],
      "orange-target": [
        6,
        4
      ],
      "yellow-load": [
        8,
        4
      ],
      "pink-target": [
        6,
        8
      ],
      "green-load": [
        8,
        8
      ],
      "composition-80-1": [
        7,
        7
      ],
      "composition-80-2": [
        6,
        6
      ],
      "composition-80-3": [
        5,
        2
      ],
      "composition-80-4": [
        7,
        9
      ],
      "composition-80-5": [
        7,
        3
      ],
      "composition-80-6": [
        5,
        10
      ]
    }
  },
  "81": {
    "parMoves": 18,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        6,
        3
      ],
      "composition-81-1": [
        2,
        3
      ],
      "composition-81-2": [
        5,
        1
      ],
      "composition-81-3": [
        2,
        5
      ],
      "composition-81-4": [
        5,
        4
      ]
    }
  },
  "82": {
    "parMoves": 23,
    "positions": {
      "cyan-open": [
        2,
        6
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        0,
        5
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        6
      ],
      "composition-82-1": [
        2,
        4
      ],
      "composition-82-2": [
        5,
        3
      ],
      "composition-82-3": [
        6,
        3
      ],
      "composition-82-4": [
        1,
        7
      ]
    }
  },
  "83": {
    "parMoves": 28,
    "positions": {
      "cyan-open": [
        6,
        1
      ],
      "green-open": [
        3,
        2
      ],
      "pink-open": [
        6,
        3
      ],
      "red-target": [
        4,
        6
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        6,
        6
      ],
      "yellow-load": [
        0,
        6
      ],
      "composition-83-1": [
        4,
        1
      ],
      "composition-83-2": [
        6,
        4
      ],
      "composition-83-3": [
        3,
        4
      ],
      "composition-83-4": [
        8,
        2
      ],
      "composition-83-5": [
        8,
        4
      ],
      "composition-83-6": [
        1,
        2
      ],
      "composition-83-7": [
        6,
        5
      ],
      "composition-83-8": [
        4,
        5
      ]
    }
  },
  "84": {
    "parMoves": 22,
    "positions": {
      "cyan-open": [
        2,
        0
      ],
      "red-target": [
        5,
        3
      ],
      "blue-load": [
        0,
        3
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        7
      ],
      "purple-final": [
        2,
        5
      ],
      "composition-84-1": [
        3,
        1
      ],
      "composition-84-2": [
        4,
        4
      ],
      "composition-84-3": [
        6,
        5
      ],
      "composition-84-4": [
        4,
        2
      ],
      "composition-84-5": [
        1,
        1
      ],
      "composition-84-6": [
        6,
        1
      ]
    }
  },
  "85": {
    "parMoves": 21,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        6,
        3
      ],
      "composition-85-1": [
        1,
        5
      ],
      "composition-85-2": [
        2,
        3
      ],
      "composition-85-3": [
        1,
        6
      ],
      "composition-85-4": [
        5,
        4
      ]
    }
  },
  "86": {
    "parMoves": 42,
    "positions": {
      "cyan-open": [
        6,
        5
      ],
      "green-open": [
        6,
        2
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        2,
        4
      ],
      "blue-load": [
        0,
        4
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        2,
        0
      ],
      "composition-86-1": [
        5,
        3
      ],
      "composition-86-2": [
        6,
        7
      ],
      "composition-86-3": [
        6,
        4
      ],
      "composition-86-4": [
        8,
        5
      ],
      "composition-86-5": [
        8,
        2
      ],
      "composition-86-6": [
        9,
        5
      ],
      "composition-86-7": [
        7,
        8
      ],
      "composition-86-8": [
        6,
        0
      ]
    }
  },
  "87": {
    "parMoves": 22,
    "positions": {
      "cyan-open": [
        5,
        8
      ],
      "red-target": [
        4,
        3
      ],
      "blue-load": [
        8,
        8
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        1,
        2
      ],
      "purple-final": [
        2,
        6
      ],
      "composition-87-1": [
        3,
        2
      ],
      "composition-87-2": [
        5,
        3
      ],
      "composition-87-3": [
        3,
        5
      ],
      "composition-87-4": [
        5,
        5
      ]
    }
  },
  "88": {
    "parMoves": 30,
    "positions": {
      "cyan-open": [
        8,
        8
      ],
      "green-open": [
        6,
        8
      ],
      "pink-open": [
        6,
        6
      ],
      "red-target": [
        6,
        4
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        2,
        2
      ],
      "yellow-load": [
        8,
        2
      ],
      "composition-88-1": [
        5,
        4
      ],
      "composition-88-2": [
        7,
        6
      ],
      "composition-88-3": [
        6,
        9
      ],
      "composition-88-4": [
        3,
        7
      ],
      "composition-88-5": [
        3,
        5
      ],
      "composition-88-6": [
        1,
        6
      ],
      "composition-88-7": [
        3,
        8
      ],
      "composition-88-8": [
        8,
        5
      ]
    }
  },
  "89": {
    "parMoves": 19,
    "positions": {
      "cyan-open": [
        2,
        7
      ],
      "red-target": [
        5,
        4
      ],
      "blue-load": [
        5,
        3
      ],
      "green-target": [
        4,
        7
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "strategy-guard-a": [
        0,
        8
      ],
      "strategy-guard-b": [
        5,
        6
      ]
    }
  },
  "90": {
    "parMoves": 19,
    "positions": {
      "red-target": [
        1,
        2
      ],
      "blue-load": [
        0,
        1
      ],
      "orange-target": [
        3,
        3
      ],
      "yellow-load": [
        3,
        1
      ],
      "pink-target": [
        7,
        3
      ],
      "green-load": [
        6,
        0
      ],
      "cyan-target": [
        9,
        3
      ],
      "purple-load": [
        9,
        1
      ],
      "composition-90-1": [
        6,
        2
      ],
      "composition-90-2": [
        8,
        1
      ],
      "composition-90-3": [
        4,
        2
      ],
      "composition-90-4": [
        1,
        4
      ]
    }
  },
  "91": {
    "parMoves": 18,
    "positions": {
      "cyan-open": [
        2,
        1
      ],
      "red-target": [
        3,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        1,
        6
      ],
      "purple-final": [
        5,
        2
      ],
      "composition-91-1": [
        4,
        2
      ],
      "composition-91-2": [
        5,
        4
      ],
      "composition-91-3": [
        1,
        2
      ]
    }
  },
  "92": {
    "parMoves": 24,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        6,
        3
      ],
      "yellow-load": [
        0,
        3
      ],
      "composition-92-1": [
        2,
        3
      ],
      "composition-92-2": [
        5,
        2
      ],
      "composition-92-3": [
        2,
        0
      ],
      "composition-92-4": [
        5,
        1
      ],
      "composition-92-5": [
        4,
        3
      ],
      "composition-92-6": [
        6,
        5
      ],
      "composition-92-7": [
        0,
        1
      ]
    }
  },
  "93": {
    "parMoves": 35,
    "positions": {
      "cyan-open": [
        6,
        6
      ],
      "green-open": [
        3,
        7
      ],
      "pink-open": [
        6,
        4
      ],
      "red-target": [
        4,
        2
      ],
      "blue-load": [
        4,
        0
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        0,
        2
      ],
      "composition-93-1": [
        5,
        5
      ],
      "composition-93-2": [
        6,
        7
      ],
      "composition-93-3": [
        1,
        8
      ],
      "composition-93-4": [
        5,
        8
      ],
      "composition-93-5": [
        4,
        5
      ],
      "composition-93-6": [
        2,
        6
      ],
      "composition-93-7": [
        3,
        4
      ],
      "composition-93-8": [
        0,
        5
      ],
      "composition-93-9": [
        8,
        6
      ]
    }
  },
  "94": {
    "parMoves": 28,
    "positions": {
      "cyan-open": [
        7,
        2
      ],
      "red-target": [
        4,
        5
      ],
      "blue-load": [
        4,
        0
      ],
      "green-target": [
        7,
        4
      ],
      "yellow-load": [
        0,
        4
      ],
      "purple-final": [
        2,
        2
      ],
      "composition-94-1": [
        4,
        2
      ],
      "composition-94-2": [
        2,
        4
      ],
      "composition-94-3": [
        6,
        2
      ],
      "composition-94-4": [
        8,
        1
      ],
      "composition-94-5": [
        6,
        5
      ],
      "composition-94-6": [
        1,
        5
      ],
      "composition-94-7": [
        2,
        6
      ]
    }
  },
  "95": {
    "parMoves": 25,
    "positions": {
      "red-target": [
        3,
        4
      ],
      "blue-load": [
        3,
        0
      ],
      "green-target": [
        0,
        3
      ],
      "yellow-load": [
        5,
        3
      ],
      "composition-95-1": [
        2,
        2
      ],
      "composition-95-2": [
        2,
        3
      ],
      "composition-95-3": [
        2,
        6
      ],
      "composition-95-4": [
        5,
        5
      ],
      "composition-95-5": [
        2,
        7
      ]
    }
  },
  "96": {
    "parMoves": 32,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "green-open": [
        2,
        5
      ],
      "pink-open": [
        4,
        2
      ],
      "red-target": [
        6,
        4
      ],
      "blue-load": [
        8,
        4
      ],
      "orange-target": [
        6,
        2
      ],
      "yellow-load": [
        6,
        8
      ],
      "composition-96-1": [
        5,
        2
      ],
      "composition-96-2": [
        2,
        4
      ],
      "composition-96-3": [
        4,
        5
      ],
      "composition-96-4": [
        1,
        1
      ],
      "composition-96-5": [
        0,
        3
      ],
      "composition-96-6": [
        4,
        7
      ],
      "composition-96-7": [
        2,
        7
      ],
      "composition-96-8": [
        1,
        0
      ],
      "composition-96-9": [
        0,
        1
      ]
    }
  },
  "97": {
    "parMoves": 25,
    "positions": {
      "cyan-open": [
        5,
        0
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        8,
        3
      ],
      "green-target": [
        4,
        0
      ],
      "yellow-load": [
        4,
        7
      ],
      "purple-final": [
        6,
        5
      ],
      "composition-97-1": [
        3,
        6
      ],
      "composition-97-2": [
        5,
        2
      ],
      "composition-97-3": [
        7,
        1
      ],
      "composition-97-4": [
        2,
        4
      ],
      "composition-97-5": [
        2,
        7
      ]
    }
  },
  "98": {
    "parMoves": 41,
    "positions": {
      "cyan-open": [
        2,
        2
      ],
      "green-open": [
        4,
        3
      ],
      "pink-open": [
        2,
        4
      ],
      "red-target": [
        0,
        3
      ],
      "blue-load": [
        4,
        8
      ],
      "orange-target": [
        2,
        6
      ],
      "yellow-load": [
        8,
        6
      ],
      "composition-98-1": [
        1,
        1
      ],
      "composition-98-2": [
        3,
        1
      ],
      "composition-98-3": [
        5,
        2
      ],
      "composition-98-4": [
        0,
        5
      ],
      "composition-98-5": [
        0,
        1
      ],
      "composition-98-6": [
        1,
        6
      ],
      "composition-98-7": [
        8,
        2
      ],
      "composition-98-8": [
        4,
        0
      ]
    }
  },
  "99": {
    "parMoves": 30,
    "positions": {
      "cyan-open": [
        0,
        6
      ],
      "red-target": [
        3,
        3
      ],
      "blue-load": [
        3,
        8
      ],
      "green-target": [
        0,
        4
      ],
      "yellow-load": [
        7,
        4
      ],
      "purple-final": [
        5,
        6
      ],
      "composition-99-1": [
        4,
        5
      ],
      "composition-99-2": [
        4,
        3
      ],
      "composition-99-3": [
        2,
        4
      ],
      "composition-99-4": [
        6,
        4
      ],
      "composition-99-5": [
        0,
        3
      ],
      "composition-99-6": [
        1,
        7
      ]
    }
  },
  "100": {
    "parMoves": 31,
    "positions": {
      "red-target": [
        2,
        2
      ],
      "blue-load": [
        2,
        0
      ],
      "orange-target": [
        8,
        2
      ],
      "yellow-load": [
        10,
        2
      ],
      "pink-target": [
        8,
        8
      ],
      "green-load": [
        8,
        10
      ],
      "cyan-target": [
        2,
        8
      ],
      "purple-load": [
        0,
        8
      ],
      "composition-100-1": [
        10,
        3
      ],
      "composition-100-2": [
        2,
        1
      ],
      "composition-100-3": [
        4,
        0
      ],
      "composition-100-4": [
        7,
        4
      ],
      "composition-100-5": [
        8,
        5
      ],
      "composition-100-6": [
        3,
        3
      ]
    }
  }
};
var applyStrategyLayoutOverride = (level) => {
  const override = STRATEGY_LAYOUT_OVERRIDES[level.id];
  if (!override) return level;
  const blockIds = new Set(level.blocks.map((block) => block.id));
  if (blockIds.size !== Object.keys(override.positions).length || Object.keys(override.positions).some((blockId) => !blockIds.has(blockId))) return level;
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const invalidPlacement = level.blocks.some((block) => {
    const [x, y] = override.positions[block.id];
    return block.shape.some(([dx, dy]) => !playable.has(`${x + dx},${y + dy}`));
  });
  if (invalidPlacement) return level;
  return {
    ...level,
    parMoves: override.parMoves,
    blocks: level.blocks.map((block) => {
      const position = override.positions[block.id];
      return position ? { ...block, x: position[0], y: position[1] } : block;
    })
  };
};

// src/core/campaignExpansion.ts
var CHAPTER_NAMES = [
  ["\u542F\u822A\u4E00\u63A8", "\u8F6C\u89D2\u6821\u51C6", "\u56DB\u8272\u7F57\u76D8", "\u53CC\u5411\u5206\u6D41", "\u8F7B\u88C5\u590D\u76D8", "\u5360\u9053\u521D\u8BD5", "\u9519\u4F4D\u6362\u8F68", "\u7A84\u53E3\u4FA7\u6CCA", "\u53CC\u7EBF\u9884\u5224", "\u51B0\u5757\u521D\u9192"],
  ["\u51BB\u57DF\u6392\u5E8F", "\u7A84\u9053\u878D\u971C", "\u56DB\u95E8\u51B0\u94FE", "\u6696\u8231\u7F13\u51B2", "\u5916\u58F3\u521D\u89C1", "\u53CC\u8272\u63A5\u529B", "\u51B0\u5C42\u6362\u5411", "\u68F1\u955C\u5C94\u8DEF", "\u6362\u8272\u9884\u5224", "\u6362\u8272\u8003\u6838"],
  ["\u5916\u58F3\u590D\u4E60", "\u58F3\u540E\u63A5\u529B", "\u53CC\u95E8\u8C03\u5EA6", "\u9690\u85CF\u822A\u9053", "\u4E2D\u6BB5\u6574\u5907", "\u591A\u5411\u7A7F\u68AD", "\u51B0\u8DEF\u5E76\u884C", "\u53CC\u533A\u5206\u6D41", "\u6DF1\u8231\u8FF7\u9635", "\u8054\u5408\u8003\u6838"],
  ["\u5916\u73AF\u8BD5\u822A", "\u4EA4\u9519\u822A\u7EBF", "\u72ED\u9053\u6362\u5411", "\u51B0\u95E8\u7A81\u56F4", "\u751F\u6210\u5668\u521D\u542F", "\u8865\u7ED9\u63A5\u529B", "\u68F1\u955C\u63A5\u529B", "\u9AD8\u538B\u8231\u5BA4", "\u73AF\u7EBF\u5C01\u9501", "\u822A\u9053\u6838\u5FC3"],
  ["\u51BB\u57DF\u521D\u5DE1", "\u878D\u51B0\u5C94\u8DEF", "\u971C\u95E8\u5E8F\u5217", "\u5BD2\u6F6E\u9AD8\u5899", "\u6696\u8231\u6574\u5907", "\u53CC\u51B0\u63A5\u529B", "\u51BB\u5C42\u6298\u8FD4", "\u51B0\u5C42\u5939\u51FB", "\u6781\u5BD2\u56DE\u8DEF", "\u5347\u964D\u53F0\u521D\u89C1"],
  ["\u68F1\u955C\u70ED\u8EAB", "\u53CC\u8272\u6298\u7EBF", "\u4E09\u5C42\u8F6C\u8FD0", "\u6362\u8272\u7981\u533A", "\u5149\u8C31\u4F11\u6574", "\u591A\u5C42\u63A5\u529B", "\u68F1\u955C\u51B0\u9501", "\u4E09\u5411\u6362\u8272", "\u68F1\u955C\u8FF7\u8231", "\u5149\u8C31\u6838\u5FC3"],
  ["\u5DE5\u574A\u5DE1\u68C0", "\u5355\u8231\u8C03\u5EA6", "\u751F\u6210\u5206\u6D41", "\u6697\u8231\u5F00\u542F", "\u673A\u68B0\u4F11\u6574", "\u751F\u6210\u63A5\u529B", "\u9690\u85CF\u51B0\u5757", "\u53CC\u5BA4\u5012\u8BA1", "\u591A\u5C42\u8FF7\u57CE", "\u4F20\u9001\u5E26\u521D\u542F"],
  ["\u7194\u82AF\u8BD5\u822A", "\u70ED\u533A\u6298\u8FD4", "\u51B0\u706B\u6B21\u5E8F", "\u7194\u82AF\u5C01\u9501", "\u51B7\u5374\u7A97\u53E3", "\u591A\u95E8\u8054\u52A8", "\u6362\u8272\u7194\u7089", "\u53CC\u5E18\u70ED\u6D6A", "\u6838\u5FC3\u56DE\u8F6C", "\u7194\u82AF\u4E2D\u67A2"],
  ["\u91CF\u5B50\u6821\u51C6", "\u955C\u50CF\u822A\u9053", "\u9519\u4F4D\u51FA\u53E3", "\u91CF\u5B50\u9AD8\u5899", "\u7A33\u5B9A\u7A97\u53E3", "\u591A\u5C42\u8DC3\u8FC1", "\u51BB\u7ED3\u77E9\u9635", "\u53CC\u5E18\u53E0\u6001", "\u8FF7\u9635\u6536\u675F", "\u91CF\u5B50\u6838\u5FC3"],
  ["\u7EC8\u5C40\u70ED\u8EAB", "\u767E\u95E8\u524D\u54E8", "\u5168\u8272\u8C03\u5EA6", "\u6781\u9650\u51BB\u5C42", "\u51B3\u6218\u8C03\u5EA6", "\u4E09\u5C42\u603B\u7EBF", "\u53CC\u5C42\u603B\u63A7", "\u5168\u57DF\u5C01\u9501", "\u6700\u7EC8\u56DE\u8DEF", "\u661F\u6807\u603B\u63A7"]
];
var SOURCE_LEVELS = [
  // Chapter 1 mirrors the benchmark's onboarding cadence: two direct-reading
  // boards, three single-lane parking lessons, one low-pressure feature intro,
  // then a 1 -> 2 -> 2 -> 2 parking ramp.
  [1, 2, 116, 124, 125, 5, 126, 127, 128, 8],
  // New mechanics get one quiet teaching board, but ordinary stages no longer
  // fall back to zero-decision direct clearing.
  [105, 129, 127, 128, 10, 104, 130, 127, 107, 108],
  [103, 106, 122, 108, 104, 107, 107, 108, 103, 108],
  [104, 122, 107, 108, 106, 107, 108, 107, 108, 107],
  [122, 107, 108, 107, 101, 107, 108, 107, 108, 107],
  [107, 122, 108, 107, 105, 108, 107, 108, 107, 111],
  [122, 107, 108, 107, 123, 108, 107, 108, 107, 112],
  [107, 122, 108, 107, 122, 108, 107, 108, 107, 113],
  [122, 107, 108, 107, 121, 108, 107, 108, 107, 114],
  [107, 122, 108, 107, 119, 108, 107, 108, 107, 115]
];
var TRANSFORMS = [
  "identity",
  "mirror-x",
  "rotate-90",
  "mirror-y",
  "transpose",
  "rotate-180",
  "rotate-270"
];
var DIFFICULTY_WAVE = [
  "normal",
  "hard",
  "hard",
  "super",
  "normal",
  "hard",
  "hard",
  "super",
  "super",
  "super"
];
var OPENING_WAVES = [
  ["normal", "normal", "normal", "normal", "normal", "normal", "normal", "hard", "normal", "hard"],
  ["normal", "hard", "hard", "hard", "normal", "hard", "hard", "hard", "super", "hard"],
  ["normal", "hard", "hard", "super", "normal", "hard", "hard", "super", "super", "super"]
];
var TIME_BY_DIFFICULTY = {
  normal: 180,
  hard: 150,
  super: 120
};
var LEVEL_TIME_OVERRIDES = {
  68: 150
};
var LEVEL_DIFFICULTY_OVERRIDES = {
  86: "super",
  95: "hard"
};
var SIGNATURE_PAD_LEVELS = /* @__PURE__ */ new Set([
  4,
  5,
  6,
  8,
  13,
  14,
  18,
  21,
  26,
  30,
  34,
  37,
  39,
  40,
  41,
  43,
  44,
  45,
  46,
  64,
  66,
  67,
  71,
  73,
  75,
  77,
  83,
  84,
  87,
  88,
  91,
  93,
  96,
  97,
  98,
  99
]);
var SIGNATURE_TALL_LEVELS = /* @__PURE__ */ new Set([66]);
var ELEVATOR_LEVELS = /* @__PURE__ */ new Set([50, 54, 58, 60, 64, 68, 72, 76, 80, 85, 90, 95, 100]);
var CONVEYOR_LEVELS = /* @__PURE__ */ new Set([70, 74, 78, 80, 84, 88, 90, 94, 98, 100]);
var LOW_PRESSURE_MECHANIC_INTROS = /* @__PURE__ */ new Set([35, 50, 70]);
var CHAPTER_CLEAR_LOAD_FLOORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var TWO_ROUTE_SUPER_LEVELS = /* @__PURE__ */ new Set([38, 40, 44, 48, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99]);
var BOTTLENECK_POSITION_OVERRIDES = {
  10: { "yellow-a": [3, 0], "red-ice": [0, 4], "blue-ice": [3, 2], "green-ice": [3, 4] },
  37: { "green-open": [3, 1] },
  39: { "cyan-open": [4, 0], "green-open": [4, 2], "pink-open": [6, 2], "red-target": [8, 2] },
  43: { "cyan-open": [3, 6] },
  47: { "cyan-open": [6, 5], "green-open": [3, 6] },
  49: { "cyan-open": [4, 3], "green-open": [2, 4], "pink-open": [2, 2], "red-target": [0, 1] },
  53: { "cyan-open": [1, 2], "green-open": [4, 2] },
  56: { "green-open": [6, 5] },
  58: { "cyan-open": [6, 4], "green-open": [6, 2], "pink-open": [8, 4], "red-target": [7, 0] },
  63: { "cyan-open": [6, 5] },
  66: { "cyan-open": [2, 5], "pink-open": [3, 7] },
  68: { "cyan-open": [6, 4], "green-open": [6, 6], "pink-open": [8, 5], "red-target": [8, 8] },
  73: { "green-open": [2, 5] },
  76: { "green-open": [5, 1] },
  78: { "cyan-open": [4, 5], "green-open": [6, 2], "pink-open": [4, 3], "red-target": [8, 2] },
  83: { "cyan-open": [6, 1], "green-open": [3, 2], "pink-open": [6, 3] },
  86: { "cyan-open": [6, 5] },
  88: { "cyan-open": [8, 8], "green-open": [6, 8], "pink-open": [6, 6], "red-target": [6, 4] },
  93: { "green-open": [3, 7] },
  96: { "green-open": [2, 5] },
  98: { "cyan-open": [2, 2], "green-open": [4, 3], "pink-open": [2, 4], "red-target": [0, 3] }
};
var GENERATOR_FOOTPRINT_OVERRIDES = {
  63: {
    shutter: { id: "shutter-a", x: 0, y: 2, width: 4, height: 4 },
    cargo: {
      "blue-load": [0, 2],
      "red-target": [2, 2],
      "yellow-load": [0, 4],
      "orange-target": [2, 4]
    }
  }
};
var sourceVariantCounts = /* @__PURE__ */ new Map();
var withoutShutterLink = (block) => {
  const { shutterId: _shutterId, ...rest } = block;
  return rest;
};
var blockFootprint = (block) => ({
  width: Math.max(...block.shape.map(([x]) => x)) + 1,
  height: Math.max(...block.shape.map(([, y]) => y)) + 1
});
var placementFitsGate2 = (level, block, gate, x, y) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};
var reachableGateColorsForBlock = (level, block) => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const canPlace = (x, y) => block.shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`));
  if (!canPlace(block.x, block.y)) return [];
  const queue = [[block.x, block.y]];
  const visited = /* @__PURE__ */ new Set([`${block.x},${block.y}`]);
  const colors = /* @__PURE__ */ new Set();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const gate of level.gates) {
      if (placementFitsGate2(level, block, gate, x, y)) colors.add(gate.color);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key3 = `${nextX},${nextY}`;
      if (visited.has(key3) || !canPlace(nextX, nextY)) continue;
      visited.add(key3);
      queue.push([nextX, nextY]);
    }
  }
  return [...colors];
};
var clearLoad = (level) => level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
var applyProgressiveClearLoad = (input) => {
  if (input.id < 21) return input;
  const chapter = Math.floor((input.id - 1) / 10);
  const currentLoad = clearLoad(input);
  let targetLoad = CHAPTER_CLEAR_LOAD_FLOORS[chapter] + (input.difficulty === "super" ? 1 : 0);
  if (input.id % 10 === 5) targetLoad -= 1;
  if (LOW_PRESSURE_MECHANIC_INTROS.has(input.id)) targetLoad = Math.min(targetLoad, currentLoad + 1);
  if (input.id === 100) targetLoad = 13;
  if (currentLoad >= targetLoad) return input;
  const level = {
    ...input,
    blocks: input.blocks.map((block) => ({ ...block, layers: [...block.layers ?? [block.color]] }))
  };
  const reachableColors = level.blocks.map((block) => reachableGateColorsForBlock(level, block));
  const order = level.blocks.map((_, index) => index);
  const rotation = level.id % Math.max(1, order.length);
  order.push(...order.splice(0, rotation));
  let addedLayers = 0;
  let stalledPasses = 0;
  let cursor = 0;
  while (clearLoad(level) < targetLoad && stalledPasses < order.length) {
    const blockIndex = order[cursor % order.length];
    const block = level.blocks[blockIndex];
    const layers = block.layers ?? [block.color];
    const candidates = reachableColors[blockIndex].filter((color) => color !== layers.at(-1));
    if (layers.length < 3 && candidates.length) {
      const color = candidates[(level.id + blockIndex + layers.length) % candidates.length];
      level.blocks[blockIndex] = { ...block, layers: [...layers, color] };
      addedLayers += 1;
      stalledPasses = 0;
    } else {
      stalledPasses += 1;
    }
    cursor += 1;
  }
  if (addedLayers > 0) level.parMoves = (level.parMoves ?? currentLoad) + addedLayers;
  return level;
};
var deviceLaneFor = (level, excluded = /* @__PURE__ */ new Set()) => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const occupied = new Set(level.blocks.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
  const candidates = [[1, 0, "right"], [-1, 0, "left"], [0, 1, "bottom"], [0, -1, "top"]];
  for (const block of level.blocks) {
    if (excluded.has(block.id) || block.shutterId || (block.frozen ?? 0) > 0) continue;
    const { width, height } = blockFootprint(block);
    const ownCells = new Set(block.shape.map(([sx, sy]) => `${block.x + sx},${block.y + sy}`));
    for (const [dx, dy, direction] of candidates) {
      const toX = block.x + dx;
      const toY = block.y + dy;
      const destinationClear = block.shape.every(([sx, sy]) => {
        const key3 = `${toX + sx},${toY + sy}`;
        return playable.has(key3) && (ownCells.has(key3) || !occupied.has(key3));
      });
      if (destinationClear) return { blockId: block.id, fromX: block.x, fromY: block.y, toX, toY, width, height, direction };
    }
  }
  return void 0;
};
var blockTouchesMatchingGateMouth = (level, block, x = block.x, y = block.y) => {
  const color = block.layers?.[0] ?? block.color;
  return level.gates.some((gate) => {
    if (gate.color !== color || block.star && !gate.star) return false;
    return block.shape.some(([dx, dy]) => {
      const cellX = x + dx;
      const cellY = y + dy;
      if (gate.side === "top") return cellY === 0 && cellX >= gate.offset && cellX < gate.offset + gate.size;
      if (gate.side === "bottom") return cellY === level.height - 1 && cellX >= gate.offset && cellX < gate.offset + gate.size;
      if (gate.side === "left") return cellX === 0 && cellY >= gate.offset && cellY < gate.offset + gate.size;
      return cellX === level.width - 1 && cellY >= gate.offset && cellY < gate.offset + gate.size;
    });
  });
};
var surfaceCounterCargo = (input) => {
  const generatorIds = new Set((input.shutters ?? []).filter((shutter) => shutter.id !== "belt-shutter" && shutter.count > 0).map((shutter) => shutter.id));
  if (!generatorIds.size) return input;
  const targetVisible = input.difficulty === "super" ? 4 : 3;
  const level = { ...input, blocks: input.blocks.map((block) => ({ ...block })) };
  const visible = () => level.blocks.filter((block) => !block.shutterId);
  const hidden = () => level.blocks.filter((block) => block.shutterId && generatorIds.has(block.shutterId));
  while (visible().length < targetVisible && hidden().length > 2) {
    const cargo = hidden().find((block) => (block.frozen ?? 0) === 0) ?? hidden()[0];
    const occupied = new Set(visible().flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
    const closedCells = /* @__PURE__ */ new Set();
    for (const shutter of level.shutters ?? []) {
      if (shutter.count <= 0) continue;
      for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
        for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) closedCells.add(`${x},${y}`);
      }
    }
    const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
    const destinations = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const cells = cargo.shape.map(([dx, dy]) => [x + dx, y + dy]);
        if (!cells.every(([cellX, cellY]) => {
          const key3 = `${cellX},${cellY}`;
          return playable.has(key3) && !occupied.has(key3) && !closedCells.has(key3);
        })) continue;
        if (blockTouchesMatchingGateMouth(level, cargo, x, y)) continue;
        let contact = 0;
        for (const [cellX, cellY] of cells) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (occupied.has(`${cellX + dx},${cellY + dy}`)) contact += 1;
          }
        }
        const { width, height } = blockFootprint(cargo);
        const centerDistance = Math.abs(x + width / 2 - level.width / 2) + Math.abs(y + height / 2 - level.height / 2);
        destinations.push({ x, y, score: contact * 30 - centerDistance * 3 + (x * 7 + y * 11 + level.id) % 9 });
      }
    }
    destinations.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    const destination = destinations[0];
    if (!destination) break;
    level.blocks = level.blocks.map((block) => block.id === cargo.id ? { ...withoutShutterLink(block), x: destination.x, y: destination.y } : block);
  }
  return level;
};
var exposeSecondOpeningRoute = (input) => {
  if (!TWO_ROUTE_SUPER_LEVELS.has(input.id)) return input;
  const closed = new Set((input.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const activeBlocks = input.blocks.filter((block) => (!block.shutterId || !closed.has(block.shutterId)) && (block.frozen ?? 0) === 0);
  const openColors = new Set(input.gates.filter((gate) => (gate.frozen ?? 0) === 0).map((gate) => gate.color));
  const actionable = activeBlocks.filter((block) => openColors.has(block.layers?.[0] ?? block.color)).length;
  if (actionable >= 2) return input;
  const activeColors = new Set(activeBlocks.map((block) => block.layers?.[0] ?? block.color));
  const candidate = input.gates.filter((gate) => (gate.frozen ?? 0) > 0 && activeColors.has(gate.color)).sort((a, b) => (a.frozen ?? 0) - (b.frozen ?? 0) || a.id.localeCompare(b.id))[0];
  if (!candidate) return input;
  return {
    ...input,
    gates: input.gates.map((gate) => gate.id === candidate.id ? { ...gate, frozen: void 0 } : gate)
  };
};
var scrambleMatchingGateStarts = (input) => {
  if (input.id <= 2) return input;
  const level = { ...input, blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape] })) };
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const shutterCells = /* @__PURE__ */ new Set();
  for (const shutter of level.shutters ?? []) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) shutterCells.add(`${x},${y}`);
    }
  }
  for (let blockIndex = 0; blockIndex < level.blocks.length; blockIndex += 1) {
    const block = level.blocks[blockIndex];
    if (block.shutterId || !blockTouchesMatchingGateMouth(level, block)) continue;
    const occupied = /* @__PURE__ */ new Set();
    for (const other of level.blocks) {
      if (other.id === block.id || other.shutterId) continue;
      for (const [dx, dy] of other.shape) occupied.add(`${other.x + dx},${other.y + dy}`);
    }
    const canPlace = (x, y) => block.shape.every(([dx, dy]) => {
      const key3 = `${x + dx},${y + dy}`;
      return playable.has(key3) && !occupied.has(key3) && !shutterCells.has(key3);
    });
    const queue = [{ x: block.x, y: block.y, distance: 0 }];
    const visited = /* @__PURE__ */ new Set([`${block.x},${block.y}`]);
    const destinations = [];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (!blockTouchesMatchingGateMouth(level, block, current.x, current.y) && current.distance >= 1) {
        const placedCells = new Set(block.shape.map(([dx, dy]) => `${current.x + dx},${current.y + dy}`));
        let contact = 0;
        for (const key3 of placedCells) {
          const [cellX, cellY] = key3.split(",").map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (occupied.has(`${cellX + dx},${cellY + dy}`)) contact += 1;
          }
        }
        const { width, height } = blockFootprint(block);
        const edgeDepth = Math.min(current.x, current.y, level.width - current.x - width, level.height - current.y - height);
        const gateDistance = Math.min(...level.gates.filter((gate) => gate.color === (block.layers?.[0] ?? block.color)).map((gate) => gate.side === "top" ? current.y : gate.side === "bottom" ? level.height - current.y - height : gate.side === "left" ? current.x : level.width - current.x - width));
        destinations.push({
          x: current.x,
          y: current.y,
          distance: current.distance,
          score: gateDistance * 20 + contact * 7 + edgeDepth * 4 + Math.min(current.distance, 5)
        });
      }
      if (current.distance >= 6) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = current.x + dx;
        const y = current.y + dy;
        const key3 = `${x},${y}`;
        if (visited.has(key3) || !canPlace(x, y)) continue;
        visited.add(key3);
        queue.push({ x, y, distance: current.distance + 1 });
      }
    }
    destinations.sort((a, b) => b.score - a.score || b.distance - a.distance || a.y - b.y || a.x - b.x);
    const destination = destinations[0];
    if (destination) level.blocks[blockIndex] = { ...block, x: destination.x, y: destination.y };
  }
  return level;
};
var applyAuthoredBottleneckPositions = (input) => {
  const positions = BOTTLENECK_POSITION_OVERRIDES[input.id];
  if (!positions) return input;
  return {
    ...input,
    blocks: input.blocks.map((block) => {
      const position = positions[block.id];
      return position ? { ...block, x: position[0], y: position[1] } : block;
    })
  };
};
var applyGeneratorFootprintOverrides = (input) => {
  const override = GENERATOR_FOOTPRINT_OVERRIDES[input.id];
  if (!override) return input;
  return {
    ...input,
    shutters: input.shutters?.map((shutter) => shutter.id === override.shutter.id ? { ...shutter, ...override.shutter } : shutter),
    blocks: input.blocks.map((block) => {
      const position = override.cargo[block.id];
      return position ? { ...block, x: position[0], y: position[1] } : block;
    })
  };
};
var applyDocumentProgression = (input) => {
  let level = {
    ...input,
    gates: input.gates.map((gate) => ({ ...gate })),
    blocks: input.blocks.map((block) => ({ ...block, shape: [...block.shape], layers: block.layers ? [...block.layers] : void 0 })),
    shutters: input.shutters?.map((shutter) => ({ ...shutter })),
    featureIntro: void 0
  };
  if (level.id < 10) {
    level.gates = level.gates.map((gate) => ({ ...gate, frozen: void 0 }));
    level.blocks = level.blocks.map((block) => ({ ...withoutShutterLink(block), frozen: void 0, layers: void 0 }));
    level.shutters = void 0;
  } else if (level.id < 15) {
    level.blocks = level.blocks.map((block) => ({ ...withoutShutterLink(block), layers: void 0 }));
    level.shutters = void 0;
  } else if (level.id < 35) {
    level.blocks = level.blocks.map(withoutShutterLink);
    level.shutters = void 0;
  }
  if (level.id >= 35 && level.id < 70 && level.shutters?.length) {
    level.shutters = level.shutters.map((shutter) => ({ ...shutter, skin: "generator" }));
  }
  level = applyProgressiveClearLoad(level);
  level = surfaceCounterCargo(level);
  level = exposeSecondOpeningRoute(level);
  level = scrambleMatchingGateStarts(level);
  level = applyAuthoredBottleneckPositions(level);
  level = applyCompetitiveComposition(level);
  level = applyGeneratorFootprintOverrides(level);
  if (level.id === 1) {
    level.onboardingHint = {
      blockId: "red-a",
      path: [[2, 3], [3, 3]]
    };
  }
  if (ELEVATOR_LEVELS.has(level.id)) {
    const lane = deviceLaneFor(level);
    if (lane) {
      level.elevators = [{
        id: "elevator-intro",
        blockId: lane.blockId,
        fromX: lane.fromX,
        fromY: lane.fromY,
        toX: lane.toX,
        toY: lane.toY,
        width: lane.width,
        height: lane.height,
        periodSeconds: 1.65
      }];
    }
  }
  if (CONVEYOR_LEVELS.has(level.id)) {
    const elevatorBlockIds = new Set((level.elevators ?? []).map((elevator) => elevator.blockId));
    const lane = deviceLaneFor(level, elevatorBlockIds);
    if (lane) {
      if (level.id === 70) {
        level.blocks = level.blocks.map((block) => block.id === lane.blockId ? { ...block, shutterId: "belt-shutter" } : block);
        level.shutters = [
          ...level.shutters ?? [],
          { id: "belt-shutter", x: lane.fromX, y: lane.fromY, width: lane.width, height: lane.height, count: 2, skin: "shutter" }
        ];
      }
      level.conveyors = [{
        id: "conveyor-intro",
        blockId: lane.blockId,
        x: Math.min(lane.fromX, lane.toX),
        y: Math.min(lane.fromY, lane.toY),
        width: lane.width + Math.abs(lane.toX - lane.fromX),
        height: lane.height + Math.abs(lane.toY - lane.fromY),
        direction: lane.direction
      }];
    }
  }
  if (level.id === 91 || level.id === 100) {
    const starBlock = level.blocks.find((block) => (block.layers?.length ?? 1) === 1 && level.gates.some((gate) => gate.color === (block.layers?.[0] ?? block.color))) ?? level.blocks.find((block) => level.gates.some((gate) => gate.color === (block.layers?.[0] ?? block.color)));
    if (starBlock) {
      level.blocks = level.blocks.map((block) => block.id === starBlock.id ? { ...block, star: true } : block);
      const requiredStarColors = new Set(starBlock.layers ?? [starBlock.color]);
      const markedColors = /* @__PURE__ */ new Set();
      level.gates = level.gates.map((gate) => {
        if (requiredStarColors.has(gate.color) && !markedColors.has(gate.color)) {
          markedColors.add(gate.color);
          return { ...gate, star: true };
        }
        return gate;
      });
    }
  }
  level = applyStrategyLayoutOverride(level);
  if (level.id === 8) {
    level.strategyNudge = {
      blockId: "blue-load",
      from: [2, 0],
      path: [[3, 0]],
      afterMoves: 3
    };
  }
  const intros = {
    10: { title: "\u6570\u5B57\u51B0\u5757\uFF01", description: "\u5148\u9001\u51FA\u53EF\u7528\u65B9\u5757\u3002\u6BCF\u6210\u529F\u9001\u51FA\u4E00\u4E2A\uFF0C\u51B0\u5757\u6570\u5B57\u51CF\u4E00\uFF0C\u5F52\u96F6\u540E\u624D\u80FD\u79FB\u52A8\u3002", kind: "ice-block" },
    15: { title: "\u53CC\u8272\u5916\u58F3\uFF01", description: "\u5148\u628A\u5916\u5C42\u989C\u8272\u9001\u5F80\u5BF9\u5E94\u51FA\u53E3\uFF0C\u518D\u5904\u7406\u9732\u51FA\u7684\u5185\u5C42\u989C\u8272\u3002", kind: "layer" },
    35: { title: "\u65B9\u5757\u751F\u6210\u5668\uFF01", description: "\u5B8C\u6210\u751F\u6210\u5668\u4E0A\u7684\u6E05\u9664\u6570\uFF0C\u8231\u95E8\u4F1A\u6253\u5F00\u5E76\u653E\u51FA\u4E0B\u4E00\u7EC4\u8272\u5757\u3002", kind: "generator" },
    50: { title: "\u79FB\u52A8\u5347\u964D\u53F0\uFF01", description: "\u5347\u964D\u53F0\u4F1A\u6309\u56FA\u5B9A\u8282\u62CD\u5F80\u8FD4\u3002\u89C2\u5BDF\u7A97\u53E3\uFF0C\u6293\u4F4F\u5408\u9002\u4F4D\u7F6E\u62D6\u8D70\u65B9\u5757\u3002", kind: "elevator" },
    70: { title: "\u4F20\u9001\u5E26\u4E0E\u5377\u5E18\uFF01", description: "\u5148\u5B8C\u6210\u5377\u5E18\u4E0A\u7684\u6E05\u9664\u6570\uFF1B\u5F52\u96F6\u540E\uFF0C\u4F20\u9001\u5E26\u4F1A\u628A\u8F7D\u8377\u63A8\u8FDB\u4E00\u683C\u3002", kind: "conveyor" },
    91: { title: "\u661F\u6807\u65B9\u5757\uFF01", description: "\u5E26\u661F\u65B9\u5757\u53EA\u80FD\u4ECE\u540C\u8272\u661F\u6807\u51FA\u53E3\u79BB\u5F00\uFF1B\u666E\u901A\u540C\u8272\u65B9\u5757\u4ECD\u53EF\u4F7F\u7528\u661F\u6807\u51FA\u53E3\u3002", kind: "star" }
  };
  level.featureIntro = intros[level.id];
  if (level.featureIntro) {
    level.difficulty = "normal";
    level.timeSeconds = 180;
  }
  return level;
};
var EXPANSION_RECIPES = CHAPTER_NAMES.flatMap((names, chapter) => names.map((name, beat) => {
  const difficulty = OPENING_WAVES[chapter]?.[beat] ?? DIFFICULTY_WAVE[beat];
  const id = 1 + chapter * 10 + beat;
  const sourceId = SOURCE_LEVELS[chapter][beat];
  const sourceVariant = sourceVariantCounts.get(sourceId) ?? 0;
  sourceVariantCounts.set(sourceId, sourceVariant + 1);
  return {
    id,
    name,
    sourceId,
    // A source may underpin several beats, but each appearance gets a distinct
    // geometry/color pairing. Color shift deliberately never stays at zero so
    // none of the shipping stages is the untouched prototype layout.
    transform: TRANSFORMS[sourceVariant % TRANSFORMS.length],
    colorShift: Math.floor(sourceVariant / TRANSFORMS.length) % (COLORS.length - 1) + 1,
    difficulty,
    timeSeconds: LEVEL_TIME_OVERRIDES[id] ?? TIME_BY_DIFFICULTY[difficulty],
    reward: id === 100 ? 500 : 20 + chapter * 20 + beat * 5
  };
}));
var transformedDimensions = (width, height, transform) => transform === "rotate-90" || transform === "rotate-270" || transform === "transpose" ? [height, width] : [width, height];
var transformPoint = (x, y, width, height, transform) => {
  if (transform === "mirror-x") return [width - 1 - x, y];
  if (transform === "mirror-y") return [x, height - 1 - y];
  if (transform === "rotate-180") return [width - 1 - x, height - 1 - y];
  if (transform === "rotate-90") return [height - 1 - y, x];
  if (transform === "rotate-270") return [y, width - 1 - x];
  if (transform === "transpose") return [y, x];
  return [x, y];
};
var transformSide = (side, transform) => {
  const maps = {
    identity: { top: "top", right: "right", bottom: "bottom", left: "left" },
    "mirror-x": { top: "top", right: "left", bottom: "bottom", left: "right" },
    "mirror-y": { top: "bottom", right: "right", bottom: "top", left: "left" },
    "rotate-180": { top: "bottom", right: "left", bottom: "top", left: "right" },
    "rotate-90": { top: "right", right: "bottom", bottom: "left", left: "top" },
    "rotate-270": { top: "left", right: "top", bottom: "right", left: "bottom" },
    transpose: { top: "left", right: "bottom", bottom: "right", left: "top" }
  };
  return maps[transform][side];
};
var rotateColor = (color, shift) => {
  const index = COLORS.indexOf(color);
  return COLORS[(index + shift) % COLORS.length];
};
var transformPlacement = (x, y, shape2, width, height, transform) => {
  const cells = shape2.map(([dx, dy]) => transformPoint(x + dx, y + dy, width, height, transform));
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  return {
    x: minX,
    y: minY,
    shape: cells.map(([cellX, cellY]) => [cellX - minX, cellY - minY])
  };
};
var gateCells = (level, gate) => {
  const cells = [];
  for (let index = gate.offset; index < gate.offset + gate.size; index += 1) {
    if (gate.side === "top") cells.push([index, 0]);
    else if (gate.side === "bottom") cells.push([index, level.height - 1]);
    else if (gate.side === "left") cells.push([0, index]);
    else cells.push([level.width - 1, index]);
  }
  return cells;
};
var campaignPlayable = (levelId, width, height, gates, blocks, shutters) => {
  const floor = new Set((boardShapeForLevel(levelId, width, height) ?? []).filter(([x, y]) => x >= 0 && y >= 0 && x < width && y < height).map(([x, y]) => `${x},${y}`));
  const add = (x, y) => {
    if (x >= 0 && y >= 0 && x < width && y < height) floor.add(`${x},${y}`);
  };
  for (const block of blocks) for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy);
  for (const gate of gates) {
    for (const [x, y] of gateCells({ width, height }, gate)) add(x, y);
  }
  for (const shutter of shutters) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) add(x, y);
    }
  }
  const rows = fillEnclosedBoardVoids(
    Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_2, x) => floor.has(`${x},${y}`) ? "#" : ".").join("")),
    width,
    height
  );
  const playable = [];
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "#") playable.push([x, y]);
  }));
  return playable;
};
var transformLevel = (source, recipe) => {
  const [transformedWidth, transformedHeight] = transformedDimensions(source.width, source.height, recipe.transform);
  const width = transformedWidth + (SIGNATURE_PAD_LEVELS.has(recipe.id) ? 1 : 0);
  const height = transformedHeight + (SIGNATURE_TALL_LEVELS.has(recipe.id) ? 1 : 0);
  const gates = source.gates.map((gate) => {
    const side = transformSide(gate.side, recipe.transform);
    const cells = gateCells(source, gate).map(([x, y]) => transformPoint(x, y, source.width, source.height, recipe.transform));
    const offset = side === "top" || side === "bottom" ? Math.min(...cells.map(([x]) => x)) : Math.min(...cells.map(([, y]) => y));
    return { ...gate, side, offset, color: rotateColor(gate.color, recipe.colorShift) };
  });
  const transformedBlocks = source.blocks.map((block) => {
    const placement = transformPlacement(block.x, block.y, block.shape, source.width, source.height, recipe.transform);
    return {
      ...block,
      ...placement,
      color: rotateColor(block.color, recipe.colorShift),
      layers: block.layers?.map((color) => rotateColor(color, recipe.colorShift))
    };
  });
  const shutters = source.shutters?.map((shutter) => {
    const corners = [
      transformPoint(shutter.x, shutter.y, source.width, source.height, recipe.transform),
      transformPoint(shutter.x + shutter.width - 1, shutter.y, source.width, source.height, recipe.transform),
      transformPoint(shutter.x, shutter.y + shutter.height - 1, source.width, source.height, recipe.transform),
      transformPoint(shutter.x + shutter.width - 1, shutter.y + shutter.height - 1, source.width, source.height, recipe.transform)
    ];
    const minX = Math.min(...corners.map(([x]) => x));
    const maxX = Math.max(...corners.map(([x]) => x));
    const minY = Math.min(...corners.map(([, y]) => y));
    const maxY = Math.max(...corners.map(([, y]) => y));
    return { ...shutter, x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  });
  const blocks = transformedBlocks;
  const authoredPar = boardParForLevel(recipe.id) ?? source.parMoves;
  const authored = applyDocumentProgression({
    ...source,
    id: recipe.id,
    name: recipe.name,
    difficulty: recipe.difficulty,
    timeSeconds: recipe.timeSeconds,
    reward: recipe.reward,
    parMoves: authoredPar,
    width,
    height,
    playable: campaignPlayable(recipe.id, width, height, gates, blocks, shutters ?? []),
    // Static interior wall cells conflict with the tray language: every cell
    // inside the visible board must accept movement. Difficulty comes from the
    // outer silhouette, blocks, exits, and temporary mechanic layers instead.
    blocked: [],
    gates,
    blocks,
    shutters,
    featureIntro: void 0
  });
  const difficulty = LEVEL_DIFFICULTY_OVERRIDES[recipe.id] ?? authored.difficulty;
  return {
    ...authored,
    difficulty,
    timeSeconds: LEVEL_TIME_OVERRIDES[recipe.id] ?? TIME_BY_DIFFICULTY[difficulty]
  };
};
var buildExtendedLevels = (baseLevels) => EXPANSION_RECIPES.map((recipe) => {
  const source = baseLevels.find((level) => level.id === recipe.sourceId);
  if (!source) throw new Error(`Missing expansion source level ${recipe.sourceId}`);
  return transformLevel(source, recipe);
});

// src/core/campaignBlueprints.ts
var singleLaneBlueprint = (id, name, width, height) => ({
  id,
  name,
  difficulty: "hard",
  timeSeconds: 150,
  reward: 0,
  parMoves: 3,
  width,
  height,
  gates: [
    { id: "target-top", side: "top", offset: 2, size: 2, color: "red" },
    { id: "load-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 1 }
  ],
  blocks: [
    { id: "red-target", x: 2, y: height - 4, shape: rect(2, 2), color: "red" },
    { id: "blue-load", x: 2, y: 0, shape: rect(2, 2), color: "blue" }
  ]
});
var crossLaneBlueprint = (id, name, width, height) => ({
  id,
  name,
  difficulty: "super",
  timeSeconds: 135,
  reward: 0,
  parMoves: 6,
  width,
  height,
  gates: [
    { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
    { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 },
    { id: "green-right", side: "right", offset: 3, size: 2, color: "green" },
    { id: "yellow-left", side: "left", offset: height - 2, size: 2, color: "yellow", frozen: 2 }
  ],
  blocks: [
    { id: "red-target", x: 3, y: Math.min(4, height - 4), shape: rect(2, 2), color: "red" },
    { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" },
    { id: "green-target", x: 0, y: 3, shape: rect(2, 2), color: "green" },
    { id: "yellow-load", x: width - 2, y: 3, shape: rect(2, 2), color: "yellow" }
  ]
});
var STRATEGY_BLUEPRINT_LEVELS = [
  singleLaneBlueprint(116, "\u5355\u7EBF\u5360\u9053\xB7\u516D\u683C", 6, 6),
  singleLaneBlueprint(117, "\u5355\u7EBF\u5360\u9053\xB7\u957F\u8231", 6, 7),
  singleLaneBlueprint(118, "\u5355\u7EBF\u5360\u9053\xB7\u65B9\u8231", 7, 7),
  crossLaneBlueprint(119, "\u53CC\u5411\u4EA4\u53C9\xB7\u77ED\u8231", 7, 8),
  crossLaneBlueprint(120, "\u53CC\u5411\u4EA4\u53C9\xB7\u957F\u8231", 7, 9),
  crossLaneBlueprint(121, "\u53CC\u5411\u4EA4\u53C9\xB7\u5BBD\u8231", 8, 9),
  crossLaneBlueprint(122, "\u53CC\u5411\u4EA4\u53C9\xB7\u65B9\u8231", 8, 8),
  {
    id: 124,
    name: "\u6A2A\u6761\u4FA7\u6CCA",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 7,
    height: 7,
    gates: [
      { id: "target-top", side: "top", offset: 2, size: 2, color: "red" },
      { id: "load-bottom", side: "bottom", offset: 4, size: 3, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 2, y: 4, shape: shape("XX", "X."), color: "red" },
      { id: "blue-load", x: 2, y: 0, shape: rect(3, 1), color: "blue" }
    ]
  },
  {
    id: 125,
    name: "\u9488\u773C\u4FA7\u6CCA",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 7,
    height: 8,
    gates: [
      { id: "target-top", side: "top", offset: 2, size: 3, color: "red" },
      { id: "load-bottom", side: "bottom", offset: 0, size: 1, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 2, y: 5, shape: shape("XXX", ".X."), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(1, 3), color: "blue" }
    ]
  },
  {
    id: 126,
    name: "\u6298\u94A9\u4FA7\u6CCA",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 7,
    height: 8,
    gates: [
      { id: "target-top", side: "top", offset: 3, size: 1, color: "red" },
      { id: "load-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 4, shape: rect(1, 3), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: shape("XX", "X."), color: "blue" }
    ]
  },
  {
    id: 127,
    name: "\u957F\u77ED\u4EA4\u53C9",
    difficulty: "super",
    timeSeconds: 135,
    reward: 0,
    parMoves: 6,
    width: 8,
    height: 8,
    gates: [
      { id: "red-top", side: "top", offset: 2, size: 3, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 5, size: 3, color: "blue", frozen: 2 },
      { id: "green-right", side: "right", offset: 2, size: 3, color: "green" },
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow", frozen: 2 }
    ],
    blocks: [
      { id: "red-target", x: 2, y: 4, shape: shape("XXX", ".X."), color: "red" },
      { id: "blue-load", x: 2, y: 0, shape: rect(3, 1), color: "blue" },
      { id: "green-target", x: 0, y: 2, shape: rect(1, 3), color: "green" },
      { id: "yellow-load", x: 7, y: 2, shape: rect(1, 3), color: "yellow" }
    ]
  },
  {
    id: 128,
    name: "\u53CC\u94A9\u4EA4\u53C9",
    difficulty: "super",
    timeSeconds: 135,
    reward: 0,
    parMoves: 6,
    width: 9,
    height: 8,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 3, color: "blue", frozen: 2 },
      { id: "green-right", side: "right", offset: 3, size: 2, color: "green" },
      { id: "yellow-left", side: "left", offset: 6, size: 2, color: "yellow", frozen: 2 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 4, shape: shape("X.", "XX"), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: shape("XXX", "X.."), color: "blue" },
      { id: "green-target", x: 0, y: 3, shape: shape("XX", "X."), color: "green" },
      { id: "yellow-load", x: 7, y: 3, shape: shape(".X", "XX"), color: "yellow" }
    ]
  },
  {
    id: 129,
    name: "\u86C7\u5F62\u4FA7\u6CCA",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 8,
    height: 7,
    gates: [
      { id: "target-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "load-bottom", side: "bottom", offset: 6, size: 2, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 3, shape: shape("XX", ".X", "XX"), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 1), color: "blue" }
    ]
  },
  {
    id: 130,
    name: "\u7EC6\u8F74\u4EA4\u53C9",
    difficulty: "super",
    timeSeconds: 135,
    reward: 0,
    parMoves: 6,
    width: 8,
    height: 9,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 1, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 5, size: 3, color: "blue", frozen: 2 },
      { id: "green-right", side: "right", offset: 3, size: 1, color: "green" },
      { id: "yellow-left", side: "left", offset: 6, size: 3, color: "yellow", frozen: 2 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 4, shape: rect(1, 3), color: "red" },
      { id: "blue-load", x: 2, y: 0, shape: rect(3, 1), color: "blue" },
      { id: "green-target", x: 0, y: 3, shape: rect(3, 1), color: "green" },
      { id: "yellow-load", x: 7, y: 2, shape: rect(1, 3), color: "yellow" }
    ]
  },
  {
    id: 123,
    name: "\u4E09\u5411\u5360\u9053\u67A2\u7EBD",
    difficulty: "super",
    timeSeconds: 135,
    reward: 0,
    parMoves: 9,
    width: 9,
    height: 10,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 3 },
      { id: "green-right", side: "right", offset: 3, size: 2, color: "green" },
      { id: "yellow-left", side: "left", offset: 8, size: 2, color: "yellow", frozen: 3 },
      { id: "orange-left", side: "left", offset: 6, size: 2, color: "orange" },
      { id: "purple-right", side: "right", offset: 8, size: 2, color: "purple", frozen: 3 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 4, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "green-target", x: 0, y: 3, shape: rect(2, 2), color: "green" },
      { id: "yellow-load", x: 7, y: 3, shape: rect(2, 2), color: "yellow" },
      { id: "orange-target", x: 5, y: 6, shape: rect(2, 2), color: "orange" },
      { id: "purple-load", x: 0, y: 6, shape: rect(2, 2), color: "purple" }
    ]
  }
];
var CAMPAIGN_BLUEPRINT_LEVELS = [
  {
    id: 101,
    name: "\u7EB5\u5411\u8BA9\u8DEF",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 8,
    height: 8,
    gates: [
      { id: "target-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "load-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 4, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" }
    ]
  },
  {
    id: 102,
    name: "\u6A2A\u5411\u8BA9\u8DEF",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 3,
    width: 8,
    height: 8,
    gates: [
      { id: "target-right", side: "right", offset: 3, size: 2, color: "red" },
      { id: "load-left", side: "left", offset: 0, size: 2, color: "blue", frozen: 1 }
    ],
    blocks: [
      { id: "red-target", x: 1, y: 3, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 6, y: 3, shape: rect(2, 2), color: "blue" }
    ]
  },
  {
    id: 103,
    name: "\u53CC\u8DEF\u8C03\u5EA6",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 },
      { id: "green-right", side: "right", offset: 3, size: 2, color: "green" },
      { id: "yellow-left", side: "left", offset: 6, size: 2, color: "yellow", frozen: 2 }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 5, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "green-target", x: 0, y: 3, shape: rect(2, 2), color: "green" },
      { id: "yellow-load", x: 7, y: 3, shape: rect(2, 2), color: "yellow" }
    ]
  },
  {
    id: 104,
    name: "\u591A\u5C42\u8F6C\u8FD0",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 4,
    width: 9,
    height: 9,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 1 },
      { id: "orange-right", side: "right", offset: 6, size: 2, color: "orange" }
    ],
    blocks: [
      { id: "red-target", x: 3, y: 5, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "orange"] }
    ]
  },
  {
    id: 105,
    name: "\u51BB\u7ED3\u63A5\u529B",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 4,
    width: 8,
    height: 8,
    gates: [
      { id: "cyan-left", side: "left", offset: 0, size: 2, color: "cyan" },
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 }
    ],
    blocks: [
      { id: "cyan-opener", x: 0, y: 0, shape: rect(2, 2), color: "cyan" },
      { id: "red-target", x: 3, y: 4, shape: rect(2, 2), color: "red", frozen: 1 },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" }
    ]
  },
  {
    id: 106,
    name: "\u5E18\u540E\u8F6C\u8FD0",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 0,
    parMoves: 5,
    width: 9,
    height: 10,
    gates: [
      { id: "yellow-left", side: "left", offset: 6, size: 2, color: "yellow" },
      { id: "green-right", side: "right", offset: 6, size: 2, color: "green" },
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 3 }
    ],
    shutters: [{ id: "shutter-a", x: 2, y: 0, width: 5, height: 4, count: 2 }],
    blocks: [
      { id: "yellow-open", x: 0, y: 6, shape: rect(2, 2), color: "yellow" },
      { id: "green-open", x: 5, y: 6, shape: rect(2, 2), color: "green" },
      { id: "red-target", x: 3, y: 2, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue", shutterId: "shutter-a" }
    ]
  },
  {
    id: 107,
    name: "\u4E09\u6BB5\u603B\u7EBF",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 8,
    width: 9,
    height: 10,
    gates: [
      { id: "cyan-left", side: "left", offset: 0, size: 2, color: "cyan" },
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 3 },
      { id: "green-right", side: "right", offset: 4, size: 2, color: "green" },
      { id: "yellow-left", side: "left", offset: 7, size: 2, color: "yellow", frozen: 3 },
      { id: "purple-bottom", side: "bottom", offset: 6, size: 2, color: "purple" }
    ],
    blocks: [
      { id: "cyan-open", x: 0, y: 2, shape: rect(2, 2), color: "cyan" },
      { id: "red-target", x: 3, y: 5, shape: rect(2, 2), color: "red", frozen: 1 },
      { id: "blue-load", x: 3, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "green-target", x: 0, y: 4, shape: rect(2, 2), color: "green", frozen: 2 },
      { id: "yellow-load", x: 7, y: 4, shape: rect(2, 2), color: "yellow" },
      { id: "purple-final", x: 5, y: 2, shape: rect(2, 2), color: "purple", frozen: 5 }
    ]
  },
  {
    id: 108,
    name: "\u53CC\u8DEF\u5377\u5E18",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 9,
    width: 10,
    height: 10,
    gates: [
      { id: "cyan-left", side: "left", offset: 6, size: 2, color: "cyan" },
      { id: "green-right", side: "right", offset: 6, size: 2, color: "green" },
      { id: "pink-bottom", side: "bottom", offset: 4, size: 2, color: "pink" },
      { id: "red-top", side: "top", offset: 4, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 5 },
      { id: "orange-right", side: "right", offset: 2, size: 2, color: "orange" },
      { id: "yellow-bottom", side: "bottom", offset: 2, size: 2, color: "yellow", frozen: 5 }
    ],
    shutters: [{ id: "shutter-a", x: 2, y: 0, width: 8, height: 4, count: 3 }],
    blocks: [
      { id: "cyan-open", x: 2, y: 6, shape: rect(2, 2), color: "cyan" },
      { id: "green-open", x: 6, y: 6, shape: rect(2, 2), color: "green" },
      { id: "pink-open", x: 4, y: 8, shape: rect(2, 2), color: "pink" },
      { id: "red-target", x: 4, y: 2, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "blue-load", x: 4, y: 0, shape: rect(2, 2), color: "blue", shutterId: "shutter-a" },
      { id: "orange-target", x: 2, y: 2, shape: rect(2, 2), color: "orange", shutterId: "shutter-a" },
      { id: "yellow-load", x: 8, y: 2, shape: rect(2, 2), color: "yellow", shutterId: "shutter-a" }
    ]
  },
  {
    id: 109,
    name: "\u4E09\u8DEF\u77E9\u9635",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 9,
    width: 12,
    height: 10,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
      { id: "orange-top", side: "top", offset: 4, size: 2, color: "orange" },
      { id: "pink-top", side: "top", offset: 8, size: 2, color: "pink" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue", frozen: 3 },
      { id: "yellow-bottom", side: "bottom", offset: 6, size: 2, color: "yellow", frozen: 3 },
      { id: "green-bottom", side: "bottom", offset: 10, size: 2, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "red-target", x: 0, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 0, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 4, y: 2, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 4, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 8, y: 2, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 8, y: 0, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 110,
    name: "\u56DB\u8DEF\u7EC8\u9635",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 12,
    width: 16,
    height: 10,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
      { id: "orange-top", side: "top", offset: 4, size: 2, color: "orange" },
      { id: "pink-top", side: "top", offset: 8, size: 2, color: "pink" },
      { id: "cyan-top", side: "top", offset: 12, size: 2, color: "cyan" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue", frozen: 4 },
      { id: "yellow-bottom", side: "bottom", offset: 6, size: 2, color: "yellow", frozen: 4 },
      { id: "green-bottom", side: "bottom", offset: 10, size: 2, color: "green", frozen: 4 },
      { id: "purple-bottom", side: "bottom", offset: 14, size: 2, color: "purple", frozen: 4 }
    ],
    blocks: [
      { id: "red-target", x: 0, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 0, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 4, y: 2, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 4, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 8, y: 2, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 8, y: 0, shape: rect(2, 2), color: "green" },
      { id: "cyan-target", x: 12, y: 2, shape: rect(2, 2), color: "cyan" },
      { id: "purple-load", x: 12, y: 0, shape: rect(2, 2), color: "purple" }
    ]
  },
  {
    id: 111,
    name: "\u5149\u8C31\u4EA4\u53C9\u6E2F",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 9,
    width: 12,
    height: 10,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
      { id: "orange-top", side: "top", offset: 4, size: 2, color: "orange" },
      { id: "pink-top", side: "top", offset: 8, size: 2, color: "pink" },
      { id: "blue-bottom", side: "bottom", offset: 10, size: 2, color: "blue", frozen: 3 },
      { id: "yellow-right", side: "right", offset: 6, size: 2, color: "yellow", frozen: 3 },
      { id: "green-bottom", side: "bottom", offset: 2, size: 2, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "red-target", x: 0, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 0, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 4, y: 2, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 4, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 8, y: 2, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 8, y: 0, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 112,
    name: "\u5DE5\u574A\u56DE\u73AF\u6E2F",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 9,
    width: 12,
    height: 10,
    gates: [
      { id: "red-top", side: "top", offset: 10, size: 2, color: "red" },
      { id: "orange-left", side: "left", offset: 0, size: 2, color: "orange" },
      { id: "pink-left", side: "left", offset: 6, size: 2, color: "pink" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 2, color: "blue", frozen: 3 },
      { id: "yellow-bottom", side: "bottom", offset: 8, size: 2, color: "yellow", frozen: 3 },
      { id: "green-top", side: "top", offset: 6, size: 2, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "red-target", x: 10, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 10, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 2, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 2, y: 6, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 0, y: 6, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 113,
    name: "\u7194\u82AF\u6298\u8FD4\u6E2F",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 9,
    width: 10,
    height: 12,
    gates: [
      { id: "red-right", side: "right", offset: 0, size: 2, color: "red" },
      { id: "orange-right", side: "right", offset: 4, size: 2, color: "orange" },
      { id: "pink-right", side: "right", offset: 8, size: 2, color: "pink" },
      { id: "blue-left", side: "left", offset: 10, size: 2, color: "blue", frozen: 3 },
      { id: "yellow-bottom", side: "bottom", offset: 4, size: 2, color: "yellow", frozen: 3 },
      { id: "green-left", side: "left", offset: 2, size: 2, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "red-target", x: 6, y: 0, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 8, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 6, y: 4, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 8, y: 4, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 6, y: 8, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 8, y: 8, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 114,
    name: "\u91CF\u5B50\u56DB\u5854\u67A2\u7EBD",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 12,
    width: 12,
    height: 12,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
      { id: "orange-top", side: "top", offset: 3, size: 2, color: "orange" },
      { id: "pink-top", side: "top", offset: 6, size: 2, color: "pink" },
      { id: "cyan-top", side: "top", offset: 9, size: 2, color: "cyan" },
      { id: "blue-left", side: "left", offset: 4, size: 2, color: "blue", frozen: 4 },
      { id: "yellow-bottom", side: "bottom", offset: 3, size: 2, color: "yellow", frozen: 4 },
      { id: "green-bottom", side: "bottom", offset: 6, size: 2, color: "green", frozen: 4 },
      { id: "purple-right", side: "right", offset: 4, size: 2, color: "purple", frozen: 4 }
    ],
    blocks: [
      { id: "red-target", x: 0, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 0, y: 0, shape: rect(1, 2), color: "blue" },
      { id: "orange-target", x: 3, y: 2, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 3, y: 0, shape: rect(1, 2), color: "yellow" },
      { id: "pink-target", x: 6, y: 2, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 6, y: 0, shape: rect(1, 2), color: "green" },
      { id: "cyan-target", x: 9, y: 2, shape: rect(2, 2), color: "cyan" },
      { id: "purple-load", x: 9, y: 0, shape: rect(1, 2), color: "purple" }
    ]
  },
  {
    id: 115,
    name: "\u767E\u5173\u56DB\u5411\u603B\u63A7",
    difficulty: "super",
    timeSeconds: 120,
    reward: 0,
    parMoves: 12,
    width: 12,
    height: 12,
    gates: [
      { id: "red-top", side: "top", offset: 2, size: 2, color: "red" },
      { id: "orange-right", side: "right", offset: 2, size: 2, color: "orange" },
      { id: "pink-bottom", side: "bottom", offset: 8, size: 2, color: "pink" },
      { id: "cyan-left", side: "left", offset: 8, size: 2, color: "cyan" },
      { id: "blue-left", side: "left", offset: 4, size: 2, color: "blue", frozen: 4 },
      { id: "yellow-top", side: "top", offset: 6, size: 2, color: "yellow", frozen: 4 },
      { id: "green-right", side: "right", offset: 6, size: 2, color: "green", frozen: 4 },
      { id: "purple-bottom", side: "bottom", offset: 4, size: 2, color: "purple", frozen: 4 }
    ],
    blocks: [
      { id: "red-target", x: 2, y: 2, shape: rect(2, 2), color: "red" },
      { id: "blue-load", x: 2, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "orange-target", x: 8, y: 2, shape: rect(2, 2), color: "orange" },
      { id: "yellow-load", x: 10, y: 2, shape: rect(2, 2), color: "yellow" },
      { id: "pink-target", x: 8, y: 8, shape: rect(2, 2), color: "pink" },
      { id: "green-load", x: 8, y: 10, shape: rect(2, 2), color: "green" },
      { id: "cyan-target", x: 2, y: 8, shape: rect(2, 2), color: "cyan" },
      { id: "purple-load", x: 0, y: 8, shape: rect(2, 2), color: "purple" }
    ]
  },
  ...STRATEGY_BLUEPRINT_LEVELS
];

// src/core/levels.ts
var BASE_LEVELS = [
  {
    id: 1,
    name: "\u7B2C\u4E00\u6B21\u51FA\u9003",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 2,
    width: 5,
    height: 5,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 2, size: 3, color: "blue" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 3, shape: rect(2, 2), color: "red" },
      { id: "blue-a", x: 3, y: 0, shape: rect(2, 2), color: "blue" }
    ]
  },
  {
    id: 2,
    name: "\u8F6C\u4E2A\u5F2F",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 3,
    width: 6,
    height: 6,
    gates: [
      { id: "red-top", side: "top", offset: 3, size: 2, color: "red" },
      { id: "yellow-left", side: "left", offset: 1, size: 3, color: "yellow" },
      { id: "blue-bottom", side: "bottom", offset: 3, size: 3, color: "blue" }
    ],
    blocks: [
      { id: "red-l", x: 0, y: 1, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-t", x: 1, y: 2, shape: shape(".X.", "XXX"), color: "yellow" },
      { id: "blue-l", x: 4, y: 1, shape: shape("XX", ".X"), color: "blue" }
    ]
  },
  {
    id: 3,
    name: "\u56DB\u9762\u51FA\u53E3",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 4,
    width: 6,
    height: 7,
    gates: [
      { id: "green-top", side: "top", offset: 0, size: 4, color: "green" },
      { id: "yellow-right", side: "right", offset: 2, size: 4, color: "yellow" },
      { id: "red-bottom", side: "bottom", offset: 0, size: 2, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 2, color: "blue" }
    ],
    blocks: [
      { id: "green-a", x: 0, y: 0, shape: rect(3, 1), color: "green" },
      { id: "red-a", x: 0, y: 2, shape: rect(2, 3), color: "red" },
      { id: "yellow-a", x: 2, y: 2, shape: rect(1, 4), color: "yellow" },
      { id: "blue-a", x: 3, y: 2, shape: rect(2, 4), color: "blue" }
    ]
  },
  {
    id: 4,
    name: "\u989C\u8272\u8FF7\u9635",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 20,
    parMoves: 4,
    width: 6,
    height: 6,
    gates: [
      { id: "green-top", side: "top", offset: 0, size: 2, color: "green" },
      { id: "yellow-top", side: "top", offset: 4, size: 2, color: "yellow" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue" },
      { id: "red-bottom", side: "bottom", offset: 3, size: 3, color: "red" }
    ],
    blocks: [
      { id: "green-a", x: 0, y: 0, shape: rect(2, 2), color: "green" },
      { id: "yellow-a", x: 4, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 0, y: 4, shape: rect(2, 2), color: "blue" },
      { id: "red-a", x: 4, y: 4, shape: rect(2, 2), color: "red" }
    ]
  },
  {
    id: 5,
    name: "\u51B0\u5C01\u51FA\u53E3",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 30,
    parMoves: 4,
    width: 6,
    height: 7,
    featureIntro: {
      title: "\u51B0\u5C01\u51FA\u53E3\uFF01",
      description: "\u6BCF\u9001\u51FA\u4E00\u4E2A\u65B9\u5757\uFF0C\u51B0\u5C42\u90FD\u4F1A\u51CF\u4E00\u3002\u5148\u8D70\u80FD\u7528\u7684\u51FA\u53E3\uFF01",
      kind: "ice-door"
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red", frozen: 1 },
      { id: "blue-right", side: "right", offset: 0, size: 3, color: "blue", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 2, shape: rect(3, 1), color: "yellow" },
      { id: "red-a", x: 0, y: 4, shape: rect(3, 1), color: "red" },
      { id: "blue-a", x: 3, y: 0, shape: rect(2, 3), color: "blue" },
      { id: "green-a", x: 3, y: 3, shape: rect(2, 3), color: "green" }
    ]
  },
  {
    id: 6,
    name: "\u878D\u51B0\u987A\u5E8F",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 30,
    parMoves: 4,
    width: 7,
    height: 7,
    gates: [
      { id: "orange-left", side: "left", offset: 1, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 2, size: 3, color: "purple", frozen: 1 },
      { id: "blue-right", side: "right", offset: 3, size: 3, color: "blue", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 0, size: 3, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 1, shape: rect(3, 2), color: "orange" },
      { id: "purple-a", x: 2, y: 4, shape: rect(3, 1), color: "purple" },
      { id: "blue-a", x: 5, y: 3, shape: rect(2, 2), color: "blue" },
      { id: "green-a", x: 0, y: 5, shape: rect(3, 2), color: "green" }
    ]
  },
  {
    id: 7,
    name: "\u5CE1\u8C37\u901A\u9053",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 60,
    parMoves: 4,
    width: 7,
    height: 9,
    blocked: [[1, 2], [5, 3], [1, 5], [5, 5]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: 4, size: 3, color: "blue" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 1), color: "yellow" },
      { id: "green-a", x: 3, y: 4, shape: rect(2, 1), color: "green" },
      { id: "blue-a", x: 5, y: 6, shape: shape(".X", "XX"), color: "blue" }
    ]
  },
  {
    id: 8,
    name: "\u51B0\u4E2D\u65B9\u5757",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 40,
    parMoves: 4,
    width: 7,
    height: 7,
    featureIntro: {
      title: "\u51B0\u51BB\u65B9\u5757\uFF01",
      description: "\u6E05\u9664\u5176\u4ED6\u65B9\u5757\u6765\u964D\u4F4E\u51B0\u5757\u6570\u5B57\uFF0C\u5F52\u96F6\u540E\u624D\u80FD\u62D6\u52A8\u3002",
      kind: "ice-block"
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 3, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "blue-right", side: "right", offset: 2, size: 3, color: "blue" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" }
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "red-ice", x: 2, y: 0, shape: rect(2, 2), color: "red", frozen: 1 },
      { id: "blue-ice", x: 5, y: 2, shape: rect(2, 2), color: "blue", frozen: 2 },
      { id: "green-ice", x: 3, y: 5, shape: rect(2, 2), color: "green", frozen: 3 }
    ]
  },
  {
    id: 9,
    name: "\u788E\u51B0\u8FDE\u9501",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 60,
    parMoves: 4,
    width: 7,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 2, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "cyan-bottom", side: "bottom", offset: 2, size: 3, color: "cyan" }
    ],
    blocks: [
      { id: "purple-a", x: 2, y: 0, shape: rect(3, 1), color: "purple" },
      { id: "orange-a", x: 0, y: 2, shape: rect(2, 2), color: "orange", frozen: 1 },
      { id: "pink-a", x: 5, y: 3, shape: rect(2, 2), color: "pink", frozen: 2 },
      { id: "cyan-a", x: 2, y: 6, shape: rect(3, 2), color: "cyan", frozen: 3 }
    ]
  },
  {
    id: 10,
    name: "\u53CC\u5C42\u4F2A\u88C5",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 50,
    parMoves: 4,
    width: 7,
    height: 7,
    featureIntro: {
      title: "\u53CC\u5C42\u65B9\u5757\uFF01",
      description: "\u5148\u628A\u5916\u5C42\u9001\u8FDB\u540C\u8272\u51FA\u53E3\uFF0C\u91CC\u9762\u7684\u989C\u8272\u624D\u4F1A\u663E\u9732\u3002",
      kind: "layer"
    },
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 3, color: "blue" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "red-right", side: "right", offset: 1, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" }
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "yellow"] },
      { id: "layer-b", x: 4, y: 1, shape: rect(2, 2), color: "red", layers: ["red", "green"] }
    ]
  },
  {
    id: 11,
    name: "\u5C42\u5C42\u7A81\u56F4",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 80,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 3, color: "purple" },
      { id: "orange-top", side: "top", offset: 5, size: 3, color: "orange" },
      { id: "cyan-left", side: "left", offset: 2, size: 3, color: "cyan" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 2, size: 4, color: "green" }
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "cyan"] },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "pink"] },
      { id: "green-a", x: 2, y: 5, shape: shape("XXXX", ".XX."), color: "green" }
    ]
  },
  {
    id: 12,
    name: "\u5377\u5E18\u521D\u8BC6",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 9,
    featureIntro: {
      title: "\u795E\u79D8\u5377\u5E18\uFF01",
      description: "\u5B8C\u6210\u5377\u5E18\u4E0A\u7684\u6E05\u9664\u6570\uFF0C\u9690\u85CF\u533A\u57DF\u624D\u4F1A\u6253\u5F00\u3002",
      kind: "shutter"
    },
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 4, size: 4, color: "green" }
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 6, height: 4, count: 2 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 6, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "red-hidden", x: 1, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "green-hidden", x: 4, y: 2, shape: rect(3, 2), color: "green", shutterId: "shutter-a" }
    ]
  },
  {
    id: 13,
    name: "\u51B0\u706B\u4EA4\u9519",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 8,
    blocked: [[3, 2], [4, 2], [3, 5], [4, 5]],
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 3, size: 2, color: "purple", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 1, size: 3, color: "cyan", frozen: 2 },
      { id: "pink-bottom", side: "bottom", offset: 4, size: 3, color: "pink", frozen: 3 }
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "purple-a", x: 3, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "cyan-a", x: 6, y: 1, shape: rect(2, 2), color: "cyan" },
      { id: "pink-a", x: 4, y: 6, shape: rect(3, 2), color: "pink" }
    ]
  },
  {
    id: 14,
    name: "\u53CC\u9053\u5CE1\u8C37",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 70,
    parMoves: 4,
    width: 8,
    height: 9,
    blocked: [[3, 2], [4, 2], [3, 6], [4, 6]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 5, size: 3, color: "blue" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 2), color: "yellow" },
      { id: "green-a", x: 4, y: 4, shape: rect(2, 2), color: "green" },
      { id: "blue-a", x: 5, y: 7, shape: rect(3, 2), color: "blue" }
    ]
  },
  {
    id: 15,
    name: "\u5185\u5916\u6362\u8272",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 70,
    parMoves: 6,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 2, color: "purple" },
      { id: "cyan-top", side: "top", offset: 3, size: 2, color: "cyan" },
      { id: "orange-top", side: "top", offset: 6, size: 2, color: "orange" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "pink-right", side: "right", offset: 3, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" }
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "yellow"] },
      { id: "layer-b", x: 3, y: 0, shape: rect(2, 2), color: "cyan", layers: ["cyan", "green"] },
      { id: "layer-c", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "pink"] }
    ]
  },
  {
    id: 16,
    name: "\u51B0\u5C42\u4F2A\u88C5",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 90,
    parMoves: 4,
    width: 8,
    height: 8,
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 2, color: "yellow" },
      { id: "blue-top", side: "top", offset: 2, size: 2, color: "blue", frozen: 1 },
      { id: "red-right", side: "right", offset: 3, size: 2, color: "red", frozen: 2 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 3 }
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "layer-a", x: 2, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "red"] },
      { id: "green-ice", x: 3, y: 6, shape: rect(3, 2), color: "green", frozen: 3 }
    ]
  },
  {
    id: 17,
    name: "\u5377\u5E18\u521D\u6218",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 90,
    parMoves: 5,
    width: 8,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "orange-bottom", side: "bottom", offset: 0, size: 3, color: "orange" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 4, size: 4, color: "green" }
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 6, height: 4, count: 3 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 6, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "orange-a", x: 0, y: 7, shape: rect(3, 2), color: "orange" },
      { id: "red-hidden", x: 1, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "green-hidden", x: 4, y: 2, shape: rect(3, 2), color: "green", shutterId: "shutter-a" }
    ]
  },
  {
    id: 18,
    name: "\u5341\u5B57\u67A2\u7EBD",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 80,
    parMoves: 5,
    width: 9,
    height: 9,
    blocked: [[4, 2], [4, 3], [4, 5], [4, 6]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 3, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 3, size: 3, color: "blue" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: rect(2, 2), color: "red" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "yellow-a", x: 2, y: 3, shape: rect(2, 1), color: "yellow" },
      { id: "green-a", x: 5, y: 4, shape: rect(2, 1), color: "green" },
      { id: "blue-a", x: 3, y: 7, shape: rect(3, 2), color: "blue" }
    ]
  },
  {
    id: 19,
    name: "\u51B7\u51BB\u53CC\u95E8",
    difficulty: "super",
    timeSeconds: 120,
    reward: 110,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "purple-top", side: "top", offset: 2, size: 2, color: "purple", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 1, size: 3, color: "cyan", frozen: 2 },
      { id: "pink-bottom", side: "bottom", offset: 4, size: 3, color: "pink", frozen: 3 },
      { id: "green-left", side: "left", offset: 5, size: 3, color: "green", frozen: 4 }
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "purple-a", x: 2, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "cyan-a", x: 6, y: 1, shape: rect(2, 2), color: "cyan" },
      { id: "pink-a", x: 4, y: 6, shape: rect(3, 2), color: "pink" },
      { id: "green-a", x: 0, y: 5, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 20,
    name: "\u53CC\u91CD\u5377\u5E18",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 110,
    parMoves: 5,
    width: 9,
    height: 10,
    gates: [
      { id: "yellow-left", side: "left", offset: 6, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 6, size: 3, color: "blue" },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 3, color: "purple" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "orange-top", side: "top", offset: 6, size: 3, color: "orange" }
    ],
    shutters: [
      { id: "shutter-a", x: 0, y: 0, width: 4, height: 4, count: 2 },
      { id: "shutter-b", x: 5, y: 0, width: 4, height: 4, count: 3 }
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 6, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 6, shape: rect(2, 2), color: "blue" },
      { id: "purple-a", x: 3, y: 8, shape: rect(3, 2), color: "purple" },
      { id: "red-hidden", x: 0, y: 0, shape: rect(2, 2), color: "red", shutterId: "shutter-a" },
      { id: "orange-hidden", x: 7, y: 0, shape: rect(2, 2), color: "orange", shutterId: "shutter-b" }
    ]
  },
  {
    id: 21,
    name: "\u4E09\u5C42\u6362\u8F68",
    difficulty: "super",
    timeSeconds: 120,
    reward: 130,
    parMoves: 6,
    width: 8,
    height: 8,
    gates: [
      { id: "purple-top", side: "top", offset: 0, size: 2, color: "purple" },
      { id: "orange-top", side: "top", offset: 6, size: 2, color: "orange" },
      { id: "cyan-left", side: "left", offset: 2, size: 3, color: "cyan" },
      { id: "pink-right", side: "right", offset: 2, size: 3, color: "pink" },
      { id: "yellow-bottom", side: "bottom", offset: 0, size: 3, color: "yellow" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 3, color: "green" }
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "cyan", "yellow"] },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "pink", "green"] }
    ]
  },
  {
    id: 22,
    name: "\u51BB\u7ED3\u4E09\u5C42",
    difficulty: "super",
    timeSeconds: 120,
    reward: 140,
    parMoves: 5,
    width: 8,
    height: 8,
    gates: [
      { id: "blue-left", side: "left", offset: 0, size: 2, color: "blue" },
      { id: "red-top", side: "top", offset: 2, size: 2, color: "red" },
      { id: "purple-right", side: "right", offset: 2, size: 2, color: "purple" },
      { id: "cyan-bottom", side: "bottom", offset: 4, size: 3, color: "cyan" },
      { id: "green-bottom", side: "bottom", offset: 0, size: 2, color: "green" }
    ],
    blocks: [
      { id: "blue-a", x: 0, y: 0, shape: rect(2, 2), color: "blue" },
      { id: "layer-a", x: 2, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "purple", "cyan"], frozen: 1 },
      { id: "green-ice", x: 0, y: 6, shape: rect(2, 2), color: "green", frozen: 4 }
    ]
  },
  {
    id: 23,
    name: "\u73AF\u5F62\u77F3\u67F1",
    difficulty: "hard",
    timeSeconds: 150,
    reward: 100,
    parMoves: 5,
    width: 9,
    height: 10,
    blocked: [[4, 2], [4, 3], [4, 6], [4, 7]],
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "orange-left", side: "left", offset: 3, size: 3, color: "orange" },
      { id: "cyan-right", side: "right", offset: 4, size: 3, color: "cyan" },
      { id: "pink-bottom", side: "bottom", offset: 0, size: 3, color: "pink" },
      { id: "green-bottom", side: "bottom", offset: 6, size: 3, color: "green" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: shape("XX", "X."), color: "red" },
      { id: "orange-a", x: 2, y: 3, shape: shape("XX", "X."), color: "orange" },
      { id: "cyan-a", x: 5, y: 4, shape: shape("XX", ".X"), color: "cyan" },
      { id: "pink-a", x: 0, y: 8, shape: rect(3, 2), color: "pink" },
      { id: "green-a", x: 6, y: 8, shape: rect(3, 2), color: "green" }
    ]
  },
  {
    id: 24,
    name: "\u5E18\u540E\u6362\u8272",
    difficulty: "super",
    timeSeconds: 120,
    reward: 150,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 5, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" }
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 2 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 5, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "layer-a", x: 1, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "orange"], shutterId: "shutter-a" },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "green"], shutterId: "shutter-a" }
    ]
  },
  {
    id: 25,
    name: "\u5F69\u8272\u68C0\u9605",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 80,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "green-right", side: "right", offset: 2, size: 3, color: "green" },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 3, color: "blue" },
      { id: "pink-bottom", side: "bottom", offset: 6, size: 3, color: "pink" }
    ],
    blocks: [
      { id: "red-a", x: 0, y: 0, shape: rect(2, 2), color: "red" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "yellow-a", x: 0, y: 2, shape: rect(2, 2), color: "yellow" },
      { id: "green-a", x: 7, y: 2, shape: rect(2, 2), color: "green" },
      { id: "blue-a", x: 0, y: 7, shape: rect(2, 2), color: "blue" },
      { id: "pink-a", x: 7, y: 7, shape: rect(2, 2), color: "pink" }
    ]
  },
  {
    id: 26,
    name: "\u51B0\u5C01\u8FF7\u5BAB",
    difficulty: "super",
    timeSeconds: 120,
    reward: 150,
    parMoves: 5,
    width: 9,
    height: 9,
    blocked: [[4, 2], [4, 3], [4, 5], [4, 6]],
    gates: [
      { id: "orange-left", side: "left", offset: 0, size: 3, color: "orange" },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red", frozen: 1 },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan", frozen: 2 },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple", frozen: 3 },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green", frozen: 4 }
    ],
    blocks: [
      { id: "orange-a", x: 0, y: 0, shape: rect(2, 2), color: "orange" },
      { id: "red-a", x: 2, y: 0, shape: rect(2, 2), color: "red" },
      { id: "cyan-a", x: 5, y: 3, shape: rect(2, 2), color: "cyan" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "green-a", x: 3, y: 7, shape: rect(3, 2), color: "green" }
    ]
  },
  {
    id: 27,
    name: "\u53CC\u5C42\u63A5\u529B",
    difficulty: "super",
    timeSeconds: 120,
    reward: 160,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "orange-top", side: "top", offset: 3, size: 2, color: "orange" },
      { id: "purple-top", side: "top", offset: 7, size: 2, color: "purple" },
      { id: "yellow-left", side: "left", offset: 3, size: 3, color: "yellow" },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan" },
      { id: "green-bottom", side: "bottom", offset: 3, size: 3, color: "green" }
    ],
    blocks: [
      { id: "layer-a", x: 0, y: 0, shape: rect(2, 2), color: "blue", layers: ["blue", "yellow"] },
      { id: "layer-b", x: 3, y: 0, shape: rect(2, 2), color: "orange", layers: ["orange", "green"] },
      { id: "layer-c", x: 7, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "cyan"] }
    ]
  },
  {
    id: 28,
    name: "\u516D\u95E8\u5012\u8BA1\u65F6",
    difficulty: "super",
    timeSeconds: 120,
    reward: 170,
    parMoves: 6,
    width: 9,
    height: 9,
    gates: [
      { id: "yellow-left", side: "left", offset: 0, size: 2, color: "yellow" },
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red", frozen: 1 },
      { id: "blue-bottom", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 },
      { id: "purple-top", side: "top", offset: 7, size: 2, color: "purple", frozen: 3 },
      { id: "pink-bottom", side: "bottom", offset: 7, size: 2, color: "pink", frozen: 4 },
      { id: "green-right", side: "right", offset: 4, size: 3, color: "green", frozen: 5 }
    ],
    blocks: [
      { id: "yellow-a", x: 0, y: 0, shape: rect(2, 2), color: "yellow" },
      { id: "red-a", x: 2, y: 0, shape: rect(2, 2), color: "red" },
      { id: "blue-a", x: 0, y: 7, shape: rect(2, 2), color: "blue" },
      { id: "purple-a", x: 7, y: 0, shape: rect(2, 2), color: "purple" },
      { id: "pink-a", x: 7, y: 7, shape: rect(2, 2), color: "pink" },
      { id: "green-a", x: 7, y: 4, shape: rect(2, 2), color: "green" }
    ]
  },
  {
    id: 29,
    name: "\u5E18\u5E55\u6838\u5FC3",
    difficulty: "super",
    timeSeconds: 120,
    reward: 180,
    parMoves: 5,
    width: 9,
    height: 9,
    gates: [
      { id: "orange-left", side: "left", offset: 5, size: 3, color: "orange" },
      { id: "blue-right", side: "right", offset: 5, size: 3, color: "blue", frozen: 1 },
      { id: "purple-top", side: "top", offset: 0, size: 3, color: "purple" },
      { id: "yellow-left", side: "left", offset: 2, size: 3, color: "yellow" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" }
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 2 }],
    blocks: [
      { id: "orange-a", x: 0, y: 5, shape: rect(2, 2), color: "orange" },
      { id: "blue-a", x: 7, y: 5, shape: rect(2, 2), color: "blue" },
      { id: "layer-hidden", x: 1, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "yellow"], shutterId: "shutter-a" },
      { id: "green-hidden", x: 5, y: 2, shape: rect(3, 2), color: "green", frozen: 4, shutterId: "shutter-a" }
    ]
  },
  {
    id: 30,
    name: "\u603B\u63A7\u6838\u5FC3",
    difficulty: "super",
    timeSeconds: 120,
    reward: 250,
    parMoves: 8,
    width: 9,
    height: 10,
    gates: [
      { id: "yellow-left", side: "left", offset: 6, size: 3, color: "yellow" },
      { id: "blue-right", side: "right", offset: 6, size: 3, color: "blue", frozen: 1 },
      { id: "pink-bottom", side: "bottom", offset: 2, size: 3, color: "pink", frozen: 2 },
      { id: "red-top", side: "top", offset: 0, size: 3, color: "red" },
      { id: "purple-top", side: "top", offset: 6, size: 3, color: "purple" },
      { id: "orange-left", side: "left", offset: 2, size: 3, color: "orange" },
      { id: "green-bottom", side: "bottom", offset: 5, size: 4, color: "green" },
      { id: "cyan-right", side: "right", offset: 3, size: 3, color: "cyan" }
    ],
    shutters: [{ id: "shutter-a", x: 1, y: 0, width: 7, height: 4, count: 3 }],
    blocks: [
      { id: "yellow-a", x: 0, y: 6, shape: rect(2, 2), color: "yellow" },
      { id: "blue-a", x: 7, y: 6, shape: rect(2, 2), color: "blue" },
      { id: "pink-a", x: 2, y: 8, shape: rect(3, 2), color: "pink" },
      { id: "layer-a", x: 1, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "orange"], shutterId: "shutter-a" },
      { id: "layer-b", x: 6, y: 0, shape: rect(2, 2), color: "purple", layers: ["purple", "green"], shutterId: "shutter-a" },
      { id: "cyan-final", x: 7, y: 4, shape: rect(2, 2), color: "cyan", frozen: 7 }
    ]
  }
];
var LEVELS = buildExtendedLevels([...BASE_LEVELS, ...CAMPAIGN_BLUEPRINT_LEVELS]);
var getLevelStrict = (id) => {
  const normalized = Number(id);
  if (!Number.isInteger(normalized)) throw new RangeError(`Unknown level id ${id}; expected an integer from 1-${LEVELS.length}`);
  const level = LEVELS.find((candidate) => candidate.id === normalized);
  if (!level) throw new RangeError(`Unknown level id ${id}; expected 1-${LEVELS.length}`);
  return level;
};
var getLevel = (id) => getLevelStrict(
  Math.max(1, Math.min(LEVELS.length, Math.floor(Number(id)) || 1))
);
export {
  BASE_LEVELS,
  LEVELS,
  getLevel,
  getLevelStrict
};
