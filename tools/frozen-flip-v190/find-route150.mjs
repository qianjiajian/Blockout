import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '../..');
const sha = data => createHash('sha256').update(data).digest('hex');
const compiled = await build({ stdin: { resolveDir: root, contents: `
  export { LEVELS } from './src/core/levels.ts';
  export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
` }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true });
const bindings = {};
for (const file of Object.keys(compiled.metafile.inputs).filter(file => file !== '<stdin>')) {
  bindings[file] = sha(await readFile(path.resolve(root, file)));
}
const { LEVELS, replayRevisedRoute } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const level = LEVELS.find(level => level.id === 150);
assert.equal(level.mechanismRules, 'revised-2026-09-27-v1.5', 'Wait for the real new runtime and final formal migration');
const fixturePath = 'tests/fixtures/remake141to150-v173.json';
const fixtureBytes = await readFile(path.join(root, fixturePath));
const old = JSON.parse(fixtureBytes).rows.find(row => row.id === 150);
const oldReplay = replayRevisedRoute(level, old.drags);
// The first seven removals are unchanged. The thaw event now leaves yellow
// open: clear yellow before red. A later three-cell yellow reaches its open
// mouth in one drag, removing the old separate wait/release gesture.
const ordering = [...Array.from({ length: 15 }, (_, i) => i + 1), 17, 16, 18, 19, 20, 23, 22, 25, 24, 26];
const drags = ordering.map(step => ({ ...structuredClone(old.drags[step - 1]), ...(step === 19 ? { exitSide: 'left' } : {}) }));
const replay = replayRevisedRoute(level, drags);
const drift = [];
for (const [file, expected] of Object.entries(bindings)) {
  const actual = sha(await readFile(path.resolve(root, file)));
  if (actual !== expected) drift.push({ file, expected, actual });
}
const report = { kind: 'v190-lv150-reordered-spatial-witness', createdAt: new Date().toISOString(),
  scope: 'Fresh canonical model replay; no lower-bound proof or actual GUI/time/three-star certification',
  status: replay.valid && replay.complete && !drift.length ? 'PASS' : 'FAIL',
  levelId: level.id, profile: level.mechanismRules, levelSha256: sha(JSON.stringify(level)), level,
  oldWitness: { path: fixturePath, sha256: sha(fixtureBytes), routeLength: old.drags.length, replay: oldReplay },
  construction: { originalStepOrder: ordering, mergedExitOriginalStep: 19 }, drags, replay, bindings, drift };
const directory = path.join(root, 'playtest-results/frozen-flip-v190/review');
await mkdir(directory, { recursive: true });
const reportPath = path.join(directory, `route150-${Date.now()}.json`);
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reportPath, status: report.status, oldReplay, replay, drift }, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
