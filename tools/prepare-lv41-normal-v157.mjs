import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {search as queueSearch} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const SOURCE = 'deliverables/remake41-47-v151-20260925/candidate41-competitor-regenerated-v151-1790308522304.json';
const OUT_DIR = 'deliverables/remake41-v157-20260925';
const TARGET = path.join(OUT_DIR, 'candidate41-normal-v157.json');

const d = JSON.parse(fs.readFileSync(SOURCE));
const level = structuredClone(d.level);
level.difficulty = 'normal';

// The v151 layout is already a genuine non-isometric re-layout of the old
// Lv41 opening.  Only the difficulty contract and its fresh route are changed
// here; board geometry, curtains, generators, gates, colors and q0 shapes stay
// byte-for-byte from the reviewed re-layout.
const normalizeShapes = l => ({
  ...l,
  blocks: l.blocks.map(b => {
    const minX = Math.min(...b.shape.map(([x]) => x));
    const minY = Math.min(...b.shape.map(([, y]) => y));
    return (minX || minY)
      ? { ...b, x: b.x + minX, y: b.y + minY, shape: b.shape.map(([x, y]) => [x - minX, y - minY]) }
      : b;
  }),
});

const searchable = normalizeShapes(level);
const found = queueSearch(searchable, {
  floor: 16,
  maxStates: 3_000_000,
  maxMilliseconds: 90_000,
  maxTransitions: 30_000_000,
  weight: 1000,
  orderSeed: 0,
});
assert.equal(found.status, 'witness', JSON.stringify(found));
assert(found.cost >= 11 && found.cost <= 15, `route cost ${found.cost} outside normal 11-15`);

const { api } = await loadApi();
const replay = api.replayRevisedRoute(level, found.drags);
assert(replay.valid && replay.complete, JSON.stringify(replay));
assert(replay.nonClearingDrags >= 11 && replay.nonClearingDrags <= 15,
  `runtime route cost ${replay.nonClearingDrags} outside normal 11-15`);

const candidate = {
  ...d,
  activeRuleVersion: '1.57.0',
  ruleVersion: '1.57.0',
  seed: `lv41-normal-v157-queue-search-${Date.now()}`,
  level,
  drags: found.drags,
  U: replay.nonClearingDrags,
  replay,
  found: {
    ...found,
    runtimeReplay: { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags },
  },
  regeneration: {
    ...(d.regeneration ?? {}),
    ruleVersion: '1.57.0',
    reason: '用户明确第41关改为普通难度；沿用已审阅的非等距重新布局，重新搜索并通过U≤15的完整无道具路线。',
    sourceLayout: SOURCE,
    changedFields: ['difficulty', 'drags', 'U', 'replay', 'found'],
    preservedFields: ['width', 'height', 'playable', 'blocked', 'seams', 'gates', 'shutters', 'generators', 'blocks'],
  },
  design: {
    ...(d.design ?? {}),
    primaryMechanism: '双卷帘揭层与双生成器FIFO在中央通道的顺序配合（普通难度版）。',
    concreteDecision: '先利用底部开放位建立两条颜色出口，再按帘8→帘14的揭层时序安排生成器落点；总必挪控制在11–15次。',
  },
  evidence: {
    ...(d.evidence ?? {}),
    normalBand: { lowerTarget: 11, upperTarget: 15, witnessUpper: replay.nonClearingDrags, lowerBoundStatus: 'pending-fresh-proof' },
    layoutAudit: { previousCandidate: SOURCE, nonIsometricRelayout: true, geometryPreserved: true },
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(TARGET, JSON.stringify(candidate, null, 2) + '\n', { flag: 'w' });
console.log(JSON.stringify({ target: TARGET, status: 'witness', U: replay.nonClearingDrags, drags: replay.effectiveDrags, levelSha256: digest(level), routeSha256: digest(replay) }, null, 2));
