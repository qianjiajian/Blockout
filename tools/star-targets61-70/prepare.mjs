// Reproduce the reviewed Pointer loop in this batch's owned tools. No source
// runtime or prior tool/evidence file is written by this generator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from '../revised-preview-validation-v160.mjs';
const root='tools/star-targets61-70',previous='tools/star-targets41-50';
const upstream={
 'playtest.mjs':'d91ae50462cd4ca8d3fc2078424fae1976b2c538f59bd1de224e639fb06c1ecd',
 'browser.mjs':'8c2c24051da5677e8fcc77025faeddcbcb81a5fc2cb67ada89f442d09f40386e',
 'index.html':'e3d44390f6c6b13080c0db1f4f6db4adb0777fc3f67683550ce54cc3fdad26f5',
};
for(const[file,sha]of Object.entries(upstream))assert.equal(digest(fs.readFileSync(previous+'/'+file)),sha);
const header=fs.readFileSync(root+'/playtest-header.txt','utf8'),prior=fs.readFileSync(previous+'/playtest.mjs','utf8');
assert(prior.includes('const snapshotRoot='));
const loop=prior.slice(prior.indexOf('const snapshotRoot='))
 .replaceAll('star-targets41-50','star-targets61-70')
 .replaceAll('allSevenScoringLevelsValidated','allRequestedScoringLevelsValidated');
fs.writeFileSync(root+'/playtest.mjs',header+'\n'+loop);
fs.writeFileSync(root+'/browser.mjs',fs.readFileSync(previous+'/browser.mjs','utf8')
 .replace('[41,43,44,46,47,48,50]','[61,62,63,64,65,66,67,68,69,70]')
 .replace('Only the seven explicitly authorized scoring verifications','Only the 61-70 batch; the runner further restricts exact approved IDs'));
fs.writeFileSync(root+'/index.html',fs.readFileSync(previous+'/index.html','utf8')
 .replaceAll('star-targets41-50','star-targets61-70').replaceAll('41/43/44/46/47/48/50','61–70'));
console.log(JSON.stringify({generated:[root+'/playtest.mjs',root+'/browser.mjs',root+'/index.html'],upstream}));
