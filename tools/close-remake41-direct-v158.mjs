import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const [installedPath, ...pointerPaths] = process.argv.slice(2);
assert(installedPath && pointerPaths.length >= 2, 'Usage: node tools/close-remake41-direct-v158.mjs INSTALLED.json POINTER...');
const installed = JSON.parse(fs.readFileSync(installedPath));
assert.equal(installed.ruleVersion, '1.58.0');
const pointers = pointerPaths.map(p => JSON.parse(fs.readFileSync(p)));
for (const p of pointers) {
  assert.equal(p.status, 'PASS');
  assert.equal(p.candidateOnly, false);
  assert.equal(p.formalDataValidated, true);
  assert.equal(p.naturalClock, true);
  assert.equal(p.rows.find(r => r.id === 41)?.status, 'PASS');
  assert.equal(p.rows.find(r => r.id === 41)?.nonClearingDrags, 15);
}
const outDir = path.dirname(installedPath);
const closeout = {
  status: 'formal-pointer-pass',
  ruleVersion: '1.58.0',
  candidate: installed.candidate,
  candidatePointer: installed.pointer,
  levelSha256: installed.levelSha256,
  routeSha256: installed.routeSha256,
  lowerBound: null,
  upperBound: 15,
  lowerBoundValidated: false,
  difficultyCertified: false,
  adoptionBasis: 'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED',
  formalPointers: pointerPaths,
  naturalClock: true,
  formalDataValidated: true,
  playerSaveTouched: false,
  released: false,
  notes: 'Lv41 keeps central shutter 41-cover8 and removes top shutter 41-cover14.'
};
const output = path.join(outDir, `formal-adoption-${Date.now()}.json`);
fs.writeFileSync(output, JSON.stringify(closeout, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, status: closeout.status, formalPointers: pointerPaths }));
