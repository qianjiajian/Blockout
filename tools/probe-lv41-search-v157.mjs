import fs from 'node:fs';
import { loadApi } from './native-block-repair-v143.mjs';
import { search as queueSearch } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';

const raw = JSON.parse(fs.readFileSync(process.argv[2] || '.codex-temp/lv41-current.json', 'utf8'));
const level = structuredClone(raw.level ?? raw);
if (process.env.NORMALIZE === '1') {
  for (const block of level.blocks) {
    const minX = Math.min(...block.shape.map(([x]) => x));
    const minY = Math.min(...block.shape.map(([, y]) => y));
    block.shape = block.shape.map(([x, y]) => [x - minX, y - minY]);
    block.x += minX;
    block.y += minY;
  }
}
const { api } = await loadApi();
for (const budget of [
  { maxStates: 100_000, maxMilliseconds: 2_000 },
  { maxStates: 1_000_000, maxMilliseconds: 15_000 },
]) {
  const found = queueSearch(level, { floor: 11, ...budget });
  console.log(JSON.stringify({ budget, status: found.status, cost: found.cost, states: found.states, explored: found.explored, transitions: found.transitions, ms: found.ms }, null, 2));
}
