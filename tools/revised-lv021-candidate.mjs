// Isolated original prototype. The 300s clock is not a calibrated three-star target.
// No formal LEVELS import/write. Seed identifies this deterministic construction.
export function buildRevisedLv21Candidate() {
  const cell = (id, x, y, color, extra = {}) => ({ id, x, y, color, shape: [[0, 0]], ...extra });
  const rectangle = (width, height) =>
    Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => [x, y])).flat();
  const H2 = rectangle(2, 1);
  const blocks = [
    cell("red-pivot", 3, 5, "red", { shape: rectangle(3, 4) }),
    cell("blue-starter", 5, 3, "blue"),
    cell("park-0", 0, 3, "green"),
    cell("park-1", 2, 3, "yellow"),
  ];
  // Ten distinct survivors must vacate the red pivot's sole full exit footprint.
  for (let y = 5; y < 9; y++) {
    for (let x = 0; x < 3; x++) {
      if (y !== 5 || x === 1) blocks.push(cell(`obligation-${x}-${y}`, x, y, (x + y) % 2 ? "yellow" : "green"));
    }
  }
  // Preserve each source cover's count, cohort size, ice values and shell attachment.
  blocks.push(
    cell("c10-ice", 0, 1, "green", { shape: H2, frozen: 6, shutterId: "c10" }),
    cell("c10-shell-a", 2, 1, "yellow", { layers: ["yellow", "green"], shutterId: "c10" }),
    cell("c10-shell-b", 0, 2, "green", { layers: ["green", "purple"], shutterId: "c10" }),
    cell("c10-plain", 1, 2, "purple", { shutterId: "c10" }),
    cell("c17-ice-shell", 3, 1, "purple", { shape: H2, frozen: 2, layers: ["purple", "green"], shutterId: "c17" }),
    cell("c17-shell", 5, 1, "yellow", { layers: ["yellow", "purple"], shutterId: "c17" }),
    cell("c17-plain-a", 3, 2, "green", { shutterId: "c17" }),
    cell("c17-plain-b", 4, 2, "yellow", { shutterId: "c17" }),
    cell("c19-plain-a", 2, 0, "green", { shutterId: "c19" }),
    cell("c19-plain-b", 3, 0, "yellow", { shutterId: "c19" }),
  );
  const level = {
    id: 21,
    name: "Lv21 original parking-lock research",
    width: 6,
    height: 9,
    difficulty: "normal",
    mechanismRules: "revised-2026-09-21-v1.2",
    timeSeconds: 300,
    reward: 0,
    playable: rectangle(6, 9).filter(([x, y]) => y !== 0 || (x !== 0 && x !== 5)),
    blocks,
    gates: [
      { id: "red", side: "left", offset: 5, size: 4, color: "red" },
      { id: "blue", side: "right", offset: 3, size: 1, color: "blue" },
      { id: "green", side: "right", offset: 4, size: 1, color: "green", frozen: 2 },
      { id: "yellow", side: "left", offset: 3, size: 2, color: "yellow", frozen: 6 },
      { id: "purple", side: "top", offset: 1, size: 4, color: "purple", frozen: 13 },
    ],
    shutters: [
      { id: "c10", x: 0, y: 1, width: 3, height: 2, count: 10 },
      { id: "c17", x: 3, y: 1, width: 3, height: 2, count: 17 },
      { id: "c19", x: 2, y: 0, width: 2, height: 1, count: 19 },
    ],
  };
  return { schemaVersion: 1, ruleVersion: "1.2.1", levelId: 21, seed: "lv021-obligated-parking-v1", level };
}

/** Renderable research variant; retained old prototype is a visual rejection fixture. */
export function buildRevisedLv21DualSquareCandidate() {
  const proposal = buildRevisedLv21Candidate();
  proposal.seed = "lv021-dual-sq3-cyclic-parking-v1";
  const level = proposal.level;
  level.blocks = level.blocks.filter((block) => ["red-pivot", "blue-starter"].includes(block.id) || block.shutterId);
  const square = () => Array.from({ length: 3 }, (_, y) => Array.from({ length: 3 }, (_, x) => [x, y])).flat();
  Object.assign(level.blocks[0], { x: 3, y: 6, shape: square() });
  Object.assign(level.blocks[1], { x: 0, y: 3, shape: square() });
  for (const [minX, minY] of [[0, 6], [4, 3]]) {
    for (let y = minY; y < minY + 3; y++) for (let x = minX; x < minX + 2; x++) {
      level.blocks.push({ id: `s-${x}-${y}`, x, y, color: (x + y) % 2 ? "yellow" : "green", shape: [[0, 0]] });
    }
  }
  Object.assign(level.gates[0], { offset: 6, size: 3 });
  Object.assign(level.gates[1], { offset: 3, size: 3 });
  level.gates[2].offset = 7;
  return proposal;
}
