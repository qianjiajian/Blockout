import fs from 'node:fs';
import { loadRuntime } from '../daily-challenge/formal-v2/contract.mjs';
import { inventorySummary, boardCells, digest } from './design-layout-factory.mjs';

const out = 'deliverables/league-v2-20261008/design';
const path = `${out}/mainline-baseline-catalog.json`;
if (fs.existsSync(path)) throw Error('Preserve source catalog; use a new version for a changed source');
const runtime = await loadRuntime();
const rows = runtime.LEVELS.map(level => {
  const inventory = inventorySummary(level, runtime);
  return { sourceLevelId: level.id, sourceLevelSha256: digest(level), level,
    maskSha256: digest([level.width, level.height, boardCells(level)]), inventory,
    eligible: inventory.components === 1 && !inventory.hasSeams && !inventory.hiddenCount && !inventory.queuedCount && !inventory.shellCount };
});
const catalog = { status: 'MAINLINE_SOURCE_AUDIT', ruleVersion: '1.155.0', productionChanged: false,
  scope: rows.length, uniqueBoardMasks: new Set(rows.map(r => r.maskSha256)).size,
  eligibleSourceIds: rows.filter(r => r.eligible).map(r => r.sourceLevelId), rows };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ path, scope: catalog.scope, uniqueBoardMasks: catalog.uniqueBoardMasks, eligibleSourceIds: catalog.eligibleSourceIds }));
