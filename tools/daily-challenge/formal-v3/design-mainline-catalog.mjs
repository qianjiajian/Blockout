import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadRuntime } from '../formal-v2/contract.mjs';
import { inventorySummary, boardCells, digest } from './diversity-layout-factory.mjs';

const out = 'deliverables/daily-formal-v3-20261008/design';
const path = `${out}/mainline-baseline-catalog.json`;
if (fs.existsSync(path)) throw Error('Do not overwrite source audit');
const runtime = await loadRuntime(), groups = new Map();
const rows = runtime.LEVELS.map(level => {
  const inventory = inventorySummary(level, runtime), maskSha256 = digest([level.width, level.height, boardCells(level)]);
  groups.set(maskSha256, [...(groups.get(maskSha256) ?? []), level.id]);
  return { sourceLevelId: level.id, sourceLevelSha256: digest(level), width: level.width, height: level.height, maskSha256,
    inventory, plainGlobalFactoryEligible: inventory.components === 1 && !inventory.hasSeams && !inventory.hiddenCount && !inventory.queuedCount && !inventory.shellCount,
    stage1GlobalFactoryEligible: inventory.rectangularBoard && inventory.components === 1 && !inventory.hasSeams && !inventory.hiddenCount && !inventory.queuedCount && !inventory.shellCount,
    level };
});
const report = { status: 'MAINLINE_BASELINES_INSPECTED_NOT_CANDIDATES', generatedAt: new Date().toISOString(), scope: rows.length,
  productionChanged: false, uniqueExactBoardMasks: groups.size,
  plainGlobalFactoryEligible: rows.filter(r => r.plainGlobalFactoryEligible).map(r => r.sourceLevelId),
  stage1GlobalFactoryEligible: rows.filter(r => r.stage1GlobalFactoryEligible).map(r => r.sourceLevelId),
  sourceNativeArtPass: rows.filter(r => !r.inventory.nonNativeOrMissingArtIds.length).length,
  sourceInventoryCaveat: 'Inventory-rich sources remain available for later cohort-aware construction. This audit records every body, layer and queue; early plain prototypes never erase hidden/queue/shell inventory.',
  groups: [...groups].map(([maskSha256, ids]) => ({ maskSha256, sourceLevelIds: ids })), rows,
  inputBindings: ['src/core/levels.ts', 'src/game/formalBlockShapes.ts', 'tools/daily-challenge/formal-v3/diversity-layout-factory.mjs'].map(path => ({ path, sha256: createHash('sha256').update(fs.readFileSync(path)).digest('hex') })) };
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ path, scope: report.scope, uniqueExactBoardMasks: report.uniqueExactBoardMasks, plainEligible: report.plainGlobalFactoryEligible.length, stage1Eligible: report.stage1GlobalFactoryEligible, sourceNativeArtPass: report.sourceNativeArtPass }));
