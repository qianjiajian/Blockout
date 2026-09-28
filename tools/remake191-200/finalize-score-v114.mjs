import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { digest } from '../revised-preview-validation-v160.mjs';
import { loadApi } from './replay.mjs';
import { ruleGate } from './common.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dir = path.join(root, 'deliverables/star-targets191-196-20260928');
const formalPath = path.join(root, 'deliverables/remake191-200-20260927/formal-verified-1790532671559.json');
const indexPath = path.join(root, 'deliverables/remake191-200-20260927/final-index-1790532720240.json');
const formal = JSON.parse(fs.readFileSync(formalPath));
const index = JSON.parse(fs.readFileSync(indexPath));
const lock = ruleGate();
assert.equal(lock.activeVersion, '1.114.0');
assert.equal(formal.status, 'FORMAL_SUBSET_COMPLETE');
assert.equal(formal.ruleVersion, '1.114.0');
assert.deepEqual(formal.ids, [191, 196]);
assert.equal(index.status, 'FORMAL_TEN_COMPLETE');
const { api } = await loadApi();
const checks = {};
for (const row of formal.rows) {
  assert([191, 196].includes(row.id));
  assert.deepEqual(row.score, row.id === 191 ? { moveTarget: 31, timeTargetSeconds: 129 } : { moveTarget: 27, timeTargetSeconds: 54 });
  assert.equal(row.pointer.length, 2);
  for (const pointer of row.pointer) {
    const report = JSON.parse(fs.readFileSync(pointer.report));
    const pr = report.rows.find(r => r.id === row.id);
    assert.equal(report.status, 'PASS');
    assert.equal(pr.status, 'PASS');
    assert.equal(pr.requiredStars, 3);
    assert.equal(pr.settlement.earnedStars, 3);
    assert.equal(pr.settlement.starConditions.moveTarget, row.score.moveTarget);
    assert.equal(pr.settlement.starConditions.timeTargetSeconds, row.score.timeTargetSeconds);
    assert.equal(pr.storage.save.bestStars[String(row.id)], 3);
    assert.equal(pr.storage.save.bestMoves[String(row.id)], row.drags);
  }
  const level = api.LEVELS[row.id - 1];
  assert.equal(api.levelStarTargets(level).moveTarget, row.score.moveTarget);
  checks[row.id] = { score: row.score, drags: row.drags, pointerReports: row.pointer.map(p => p.report), levelSha256: digest(level) };
}
const out = path.join(dir, 'complete.json');
const result = { status: 'SCORING_COMPLETE_191_196', ruleVersion: '1.114.0', formalReport: formalPath, formalReportSha256: digest(fs.readFileSync(formalPath)), finalIndex: indexPath, finalIndexSha256: digest(fs.readFileSync(indexPath)), checks, playerSaveTouched: false, release: false };
if (fs.existsSync(out)) assert.deepEqual(JSON.parse(fs.readFileSync(out)), result);
else fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ out, status: result.status, checks }, null, 2));
