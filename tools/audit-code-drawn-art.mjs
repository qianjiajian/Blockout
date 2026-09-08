import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve(import.meta.dirname, "../src/game/ColorEscapeGame.ts");
const lines = (await readFile(sourcePath, "utf8")).split(/\r?\n/);
const forbidden = [
  ["linear-gradient", /createLinearGradient\s*\(/g],
  ["radial-gradient", /createRadialGradient\s*\(/g],
  ["rounded-path", /this\.roundRect\s*\(/g],
  ["filled-rectangle", /\.fillRect\s*\(/g],
  ["path-begin", /\.beginPath\s*\(/g],
  ["path-arc", /\.arc\s*\(/g],
  ["path-line", /\.(?:moveTo|lineTo|arcTo|closePath)\s*\(/g],
  ["path-fill", /\.fill\s*\(/g],
  ["path-stroke", /\.stroke\s*\(/g],
];

const byMethod = new Map();
const byPrimitive = new Map();
let currentMethod = "module";

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  const method = line.match(/^\s*private\s+(draw[A-Za-z0-9_]+)\s*\(/)?.[1];
  if (method) currentMethod = method;
  if (!currentMethod.startsWith("draw")) continue;
  for (const [name, pattern] of forbidden) {
    const count = [...line.matchAll(pattern)].length;
    if (!count) continue;
    byPrimitive.set(name, (byPrimitive.get(name) ?? 0) + count);
    const entry = byMethod.get(currentMethod) ?? { total: 0, lines: [] };
    entry.total += count;
    entry.lines.push({ line: index + 1, primitive: name, count });
    byMethod.set(currentMethod, entry);
  }
}

const total = [...byPrimitive.values()].reduce((sum, value) => sum + value, 0);
console.log(`Code-drawn art audit: ${total} primitive calls remain across ${byMethod.size} draw methods.`);
console.log("By primitive:");
for (const [name, count] of [...byPrimitive.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count}`);
}
console.log("By draw method:");
for (const [name, entry] of [...byMethod.entries()].sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${name}: ${entry.total}`);
}

if (process.argv.includes("--strict") && total > 0) {
  throw new Error(`${total} code-drawn art primitive calls remain; ImageGen-only renderer is not complete.`);
}
