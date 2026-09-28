// Read-only v1.22 authoring subcheck on the FINAL campaign, not a runtime gate.
// Does not fill maps or certify solvability, difficulty, input, or publication.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi} from './remake21to30-v120.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';

export function auditCampaignHiddenCoverage(levels) {
  const rows = levels.map(level => ({levelId: level.id, levelSha256: digest(level), ...auditHiddenCoverage(level)}));
  return {schemaVersion: 1, ruleVersion: '1.22.0', createdAt: new Date().toISOString(),
    campaignSha256: digest(levels), levelsChecked: levels.length,
    passed: rows.every(row => row.passed),
    affectedLevelIds: rows.filter(row => !row.passed).map(row => row.levelId),
    rows, mapsModified: false, solvabilityValidated: false, difficultyValidated: false,
    pointerValidated: false, releaseApproved: false};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const lock = verifyRulesLock();
  assert(lock.ok, lock.errors.join('\n'));
  // v1.23–v1.27 retain the same v1.22 hidden-layout contract.
  // remains identical. Keep the audit contract version separate from active rules.
  assert(['1.22.0', '1.23.0', '1.24.0', '1.25.0', '1.26.0', '1.27.0'].includes(lock.activeVersion), 'Reassess this versioned audit after a rule change');
  const {api} = await loadApi();
  const result = auditCampaignHiddenCoverage(api.LEVELS);
  console.log(JSON.stringify({...result, activeRulesVersion: lock.activeVersion}));
  if (!result.passed) process.exitCode = 1;
}
