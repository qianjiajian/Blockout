/*
 * Verify the isolated mainline-template league batch.
 *
 * This is deliberately separate from formalLeagueCandidateData adoption: the
 * batch proves template provenance and structural validity, while formal league
 * entry still needs the independent same-object route, L/U and score-timing
 * evidence required by the active contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const candidatePath = 'deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';

const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const report = JSON.parse(fs.readFileSync(path.resolve(candidatePath), 'utf8'));
const entries = report.entries ?? [];
const errors = [];
const expectedDifficulty = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const ids = new Set();

if (entries.length !== 100) errors.push(`expected 100 entries, got ${entries.length}`);
for (let index = 1; index <= 100; index += 1) {
  const entry = entries.find(row => row.index === index);
  if (!entry) {
    errors.push(`missing league index ${index}`);
    continue;
  }
  if (entry.templateSource?.levelId !== LEVELS[index - 1]?.id) errors.push(`index ${index}: template source is not mainline LEVELS[${index - 1}]`);
  if (entry.level?.id !== 900000 + index) errors.push(`index ${index}: unexpected isolated id ${entry.level?.id}`);
  if (ids.has(entry.level.id)) errors.push(`duplicate isolated id ${entry.level.id}`);
  ids.add(entry.level.id);
  if (entry.difficulty !== expectedDifficulty(index)) errors.push(`index ${index}: cadence mismatch`);
  if (entry.level?.difficulty !== expectedDifficulty(index)) errors.push(`index ${index}: level difficulty mismatch`);
  if (entry.level?.mechanismRules !== 'revised-2026-09-27-v1.5') errors.push(`index ${index}: league runtime profile mismatch`);
  if (entry.level?.timeSeconds !== 180 || entry.level?.reward !== 0) errors.push(`index ${index}: league timing/reward override mismatch`);
  if (entry.formalEligibility !== false) errors.push(`index ${index}: candidate must remain formalEligibility=false`);
  if (!Array.isArray(entry.specials) || entry.specials.length < 1 || entry.specials.length > 3) errors.push(`index ${index}: score block count outside 1–3`);
  const blockIds = new Set((entry.level?.blocks ?? []).map(block => block.id));
  for (const id of entry.specials ?? []) if (!blockIds.has(id)) errors.push(`index ${index}: score block ${id} is missing from candidate`);
  try {
    validateLevel(entry.level);
  } catch (error) {
    errors.push(`index ${index}: structural validation failed: ${String(error?.message ?? error)}`);
  }
}

if (report.validTemplateCount !== 100 || report.blockedTemplateCount !== 0) {
  errors.push(`summary count mismatch: valid=${report.validTemplateCount}, blocked=${report.blockedTemplateCount}`);
}
if (!/independent same-object route\/L\/U\/late-score proof/i.test(report.formalEligibility ?? '')) {
  errors.push('report does not retain the formal-evidence gate');
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', candidatePath, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'PASS', candidatePath, entries: entries.length, structurallyValid: 100, formalEligibility: false, layoutChanged: entries.filter(entry => entry.mutation?.layoutChanged).length, paletteOnly: entries.filter(entry => !entry.mutation?.layoutChanged).map(entry => entry.index) }, null, 2));
}
