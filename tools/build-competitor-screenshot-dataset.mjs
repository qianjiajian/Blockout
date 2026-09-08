import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = resolve(root, "deliverables", "competitor-dataset");
const outputPath = resolve(outputDirectory, "blockout-lv001-lv100-screenshot-extraction.json");

const UNCLEAR = "unclear";

const boardDimensions = [
  [5, 5], [6, 5], [6, 6], [6, 5], [6, 4], [5, 5], [8, 5], [8, 6], [8, 6], [9, 6],
  [7, 6], [9, 6], [9, 6], [7, 5], [8, 6], [7, 6], [8, 6], [7, 5], [9, 6], [8, 5],
  [9, 6], [10, 6], [8, 6], [10, 6], [9, 6], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [10, 6], [10, 7], [9, 8],
  [8, 6], [9, 6], [10, 8], [10, 7], [8, 6], [9, 6], [10, 8], [9, 6], [UNCLEAR, UNCLEAR], [7, 7],
  [10, 7], [9, 5], [10, 7], [11, 7], [9, 5], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [10, 7], [UNCLEAR, UNCLEAR], [9, 6],
  [7, 6], [7, 6], [7, 6], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [10, 8], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [7, 5],
  [11, 7], [10, 7], [8, 6], [UNCLEAR, UNCLEAR], [8, 8], [10, 8], [UNCLEAR, UNCLEAR], [9, 6], [UNCLEAR, UNCLEAR], [6, 5],
  [9, 6], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [8, 6], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [7, 5],
  [9, 6], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [9, 6], [9, 5], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [11, 7],
  [10, 7], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [UNCLEAR, UNCLEAR], [8, 6],
];

const visibleColorCounts = [
  3, 5, 5, 8, 3, 4, 3, 4, 5, 4,
  5, 4, 6, 4, 5, 5, 6, 5, 7, 5,
  5, 3, 5, 3, 7, 5, 2, 5, 3, 3,
  5, 4, 6, 3, 1, 4, 6, 4, 5, 5,
  2, 4, 4, 4, 6, 6, 6, 4, 4, 5,
  6, 6, 7, 6, 6, 7, 4, 7, 7, 4,
  6, 7, 8, 5, 7, 6, 6, 5, 5, 1,
  5, 8, 6, 6, 6, 4, 6, 7, 6, 4,
  4, 8, 5, 5, 6, 6, 6, 6, 7, 2,
  5, 5, 3, 5, 5, 8, 5, 7, 7, 3,
];

if (boardDimensions.length !== 100 || visibleColorCounts.length !== 100) {
  throw new Error("Expected exactly 100 screenshot extraction entries");
}

const records = Array.from({ length: 100 }, (_, index) => ({
  source: "Block Out! - Color Sort Puzzle",
  level_id: `Level ${index + 1}`,
  board: {
    rows: boardDimensions[index][0],
    cols: boardDimensions[index][1],
  },
  goals: null,
  max_moves: null,
  obstacles: null,
  blockers: null,
  specials: null,
  color_count: visibleColorCounts[index],
  blocked_cells_ratio: null,
  player_stats: {
    first_pass_rate: null,
    avg_attempts: null,
  },
}));

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");

console.log(outputPath);
