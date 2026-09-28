import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadApi } from '../native-block-repair-v143.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

const root = 'deliverables/lv11-remake-20260927';
const hash = value => createHash('sha256').update(
  Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value),
).digest('hex');
const lock = verifyRulesLock();
assert(lock.ok, JSON.stringify(lock.errors));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'baseline.json')));
const { api } = await loadApi();
const changedLevels = api.LEVELS.filter(level =>
  baseline.levelHashes.find(row => row.id === level.id)?.sha256 !== hash(level),
).map(level => level.id);
const changedSharedFiles = Object.entries(baseline.files).filter(([file, expected]) =>
  hash(fs.readFileSync(file)) !== expected,
).map(([file]) => file);
const level = api.LEVELS.find(level => level.id === 11);
assert.equal(hash(level), baseline.levelSha256, 'Candidate work must not replace Lv11');
const found = [];
const counts = { nativeSolved: 0, nativeUnknown: 0, nativeOther: 0, completeWitnessFiles: 0 };
const visit = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.includes('native-runs')) visit(file);
      continue;
    }
    if (!entry.name.endsWith('.json') || !/^(attempt-|route-|witness-|best-)/.test(entry.name)) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(file)); } catch { continue; }
    if (data.level?.id !== 11) continue;
    const native = data.native;
    if (native) {
      if (Number.isFinite(native.relaxedNonClearingDrags)) counts.nativeSolved++;
      else if (native.status === 'unknown') counts.nativeUnknown++;
      else counts.nativeOther++;
    }
    const result = data.result;
    const drags = data.drags ?? result?.relaxedRoute;
    if (drags?.length) {
      counts.completeWitnessFiles++;
      found.push({ file: file.replaceAll('\\', '/'), sourceCost: result?.cost ?? result?.relaxedNonClearingDrags,
        totalDrags: drags.length, multi: data.multi, single: data.single,
        verificationStatus: 'NOT_INDEPENDENTLY_ACCEPTED_BY_THIS_AGGREGATOR' });
    }
  }
};
visit(root);
const report = { generatedAt: new Date().toISOString(), activeVersion: lock.activeVersion,
  status: 'INCOMPLETE_NO_FORMAL_CHANGE', changedLevels, changedSharedFiles,
  formalLevel11Sha256: hash(level), originalStars: baseline.stars,
  scoringDecision: 'PENDING_USER_REPLY', difficultyAcceptance: 'NOT_YET_CERTIFIED',
  counts, routeFiles: found, note: 'Search-file summaries are not lower-bound or runtime acceptance certificates.' };
const output = path.join(root, `progress-audit-${Date.now()}.json`);
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, ...report, routeFiles: found.map(row => ({ ...row })) }));
