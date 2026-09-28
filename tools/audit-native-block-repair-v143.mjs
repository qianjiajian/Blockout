import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,OUTPUT,IDS,writeNew} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/native-block-repair-v143.json'));
const changed=api.LEVELS.filter(l=>digest(l)!==baseline.levels[l.id-1].sha256).map(l=>l.id);
assert.deepEqual(changed,IDS);
assert.equal(digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),baseline.other195Sha256);
const all=api.LEVELS.map(level=>({id:level.id,blocks:level.blocks.map(block=>({id:block.id,stage:block.shutterId??'opening',match:api.matchFormalBlockShape(block.shape)}))}));
assert(all.every(l=>l.blocks.every(b=>b.match)));
const rotated=all.flatMap(l=>l.blocks.filter(b=>b.match.quarterTurns!==0).map(b=>({level:l.id,...b})));
assert.equal(rotated.filter(b=>b.level<=30).length,3);assert(rotated.filter(b=>b.level<=30).every(b=>b.level===5));
for(const row of fixture.rows)assert.deepEqual(api.LEVELS[row.id-1],row.level);
const report={status:'PASS',ruleVersion:'1.43.0',campaignSha256:digest(api.LEVELS),changedIds:changed,
 other195Unchanged:true,level5Unchanged:true,first30Blocks:all.slice(0,30).reduce((n,l)=>n+l.blocks.length,0),
 first30Rotations:rotated.filter(b=>b.level<=30),laterLegacyRotations:rotated.filter(b=>b.level>30).length,
 allLevels:all,wholeSpriteMissing:0,pointerValidation:'recorded separately',humanBlindTested:false,published:false};
const file=OUTPUT+'/formal-orientation-audit-'+Date.now()+'.json';writeNew(file,report);
console.log(JSON.stringify({file,...report,allLevels:undefined}));
