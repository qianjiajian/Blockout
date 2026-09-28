import fs from 'node:fs';
import { loadApi, BASELINE, auditCandidate } from './remake41to50-v146.mjs';
import { checkOptionalEmittedFloor } from './remake41to50-optional-emitted-floor-v146.mjs';
import { search } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';

const BASE = 'deliverables/remake41-47-v151-20260925/candidate47-competitor-regenerated-v151-1790308522304.json';
const OUT = 'deliverables/remake41-47-v151-20260925/search-v151';
const configs = [];
for (const redOffset of [1, 2, 3, 4]) {
  for (const redSize of [2, 3]) {
    for (const blueOffset of [1, 2, 4, 5, 6]) {
      for (const yellowOffset of [1, 2, 4, 5, 6]) {
        if (blueOffset === yellowOffset || (redOffset <= blueOffset && blueOffset < redOffset + redSize) || (redOffset <= yellowOffset && yellowOffset < redOffset + redSize)) continue;
        configs.push([redOffset, redSize, blueOffset, yellowOffset]);
      }
    }
  }
}
const rng = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
configs.sort(() => rng(470947)() - 0.5);

const base = JSON.parse(fs.readFileSync(BASE));
const baseline = JSON.parse(fs.readFileSync(BASELINE));
const { api } = await loadApi();
fs.mkdirSync(OUT, { recursive: true });
const summary = { tried: 0, staticRejected: 0, noWitness: 0, belowU11: 0, unknown: 0, relaxed: 0, threshold: 0, saved: [] };
for (let i = 0; i < Math.min(configs.length, 48); i++) {
  const [redOffset, redSize, blueOffset, yellowOffset] = configs[i];
  const data = structuredClone(base);
  const level = data.level;
  Object.assign(level.gates.find(g => g.color === 'red'), { offset: redOffset, size: redSize });
  level.gates.find(g => g.color === 'blue').offset = blueOffset;
  level.gates.find(g => g.color === 'yellow').offset = yellowOffset;
  try {
    api.validateLevel(level);
    auditCandidate(data, baseline, api);
  } catch {
    summary.staticRejected++;
    continue;
  }
  summary.tried++;
  const found = search(level, { floor: 16, maxStates: 110000, maxMilliseconds: 1000, orderSeed: i % 31 });
  if (found.status !== 'witness') { summary.noWitness++; continue; }
  const replay = api.replayRevisedRoute(level, found.drags);
  if (!replay.valid || !replay.complete || replay.nonClearingDrags < 11) { summary.belowU11++; continue; }
  data.drags = found.drags;
  data.replay = replay;
  data.found = found;
  data.seed = `v151-47-layout-search-${i}`;
  data.searchConfig = { redOffset, redSize, blueOffset, yellowOffset };
  const floor = checkOptionalEmittedFloor(level, api, { floor: 11, maxStates: 250000, maxMilliseconds: 2500 });
  data.isolatedFloorDiagnostic = floor;
  if (floor.status === 'threshold-proven') summary.threshold++;
  else if (floor.status === 'relaxed-shortcut') summary.relaxed++;
  else summary.unknown++;
  const file = `${OUT}/candidate47-search-${String(i).padStart(2, '0')}.json`;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  summary.saved.push({ file, U: replay.nonClearingDrags, floor: { status: floor.status, thresholdProven: floor.thresholdProven, discoveredStates: floor.discoveredStates, termination: floor.termination, relaxedNonClearingDrags: floor.relaxedNonClearingDrags } });
  console.log(JSON.stringify(summary.saved.at(-1)));
  if (floor.status === 'threshold-proven') break;
}
fs.writeFileSync(`${OUT}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
