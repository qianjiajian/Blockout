import assert from 'node:assert/strict';
import { loadStrict21to30Catalog as loadCatalog, verifyStrict21to30Candidate as verifyCandidate } from './revised-preview-validation-v170.mjs';
import { auditGateSpanLimits } from './revised-gate-span-limits.mjs';

export { loadPreviewCore, BASELINE, BASELINE_SHA } from './revised-preview-validation-v170.mjs';
export const loadStrict21to30Catalog = (root = process.cwd()) => loadCatalog(root, { ruleVersion: '1.8.0' });
export function verifyStrict21to30Candidate(raw, source, api) {
  const gateSpanAudit = auditGateSpanLimits(raw.level);
  assert(gateSpanAudit.passed, `v1.8 exit width Lv${raw.level.id}: ${JSON.stringify(gateSpanAudit.issues)}`);
  const result = verifyCandidate(raw, source, api);
  return { ...result, ruleVersion: '1.8.0', gateSpanAudit };
}
