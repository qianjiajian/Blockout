// Evidence-gate negative controls; these do not certify route or difficulty.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {IDS,TARGETS,BEFORE_SHA,clean,validateScoringData} from './verification.mjs';
const beforeFile='deliverables/star-targets71-80-20260927/before-write.json';
assert.equal(digest(fs.readFileSync(beforeFile)),BEFORE_SHA);
const before=JSON.parse(fs.readFileSync(beforeFile)),levels=clean(before.priorLevels),fixture=clean(before.fixture);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const id of IDS)levels[id-1].preservedMoveTarget=TARGETS[id];
const witnesses=JSON.parse(fs.readFileSync('deliverables/star-targets71-80-20260927/route-witnesses.json'));
assert(validateScoringData(before,fixture,witnesses,levels,api).passed);
const cases=[
 ['other level',(b,f,w,l)=>l[0].name+='changed'],
 ['unmodified batch level',(b,f,w,l)=>l[71].preservedMoveTarget++],
 ['gameplay',(b,f,w,l)=>l[70].blocks[0].x++],
 ['time target',(b,f,w,l)=>l[70].timeSeconds++],
 ['historical fixture route',(b,f)=>f.rows.find(r=>r.id===72).drags.pop()],
 ['witness route hash',(b,f,w)=>w.rows[0].routeSha256='0'.repeat(64)],
 ['historical route changed',(b,f,w)=>{const row=w.rows.find(r=>r.id===75);row.drags[0].blockId='other';row.routeSha256=digest(row.drags);}],
 ['historical par moves',(b,f,w,l)=>l[70].parMoves++],
 ['before hash',(b,f,w)=>w.beforeSha256='0'.repeat(64)],
 ['witness formal object',(b,f,w)=>w.rows[0].level.name+='changed'],
 ['missing requested level',(b,f,w)=>w.rows.pop()],
 ['76 fallback restored',(b,f,w,l)=>{delete l[75].preservedMoveTarget;w.rows.find(r=>r.id===76).level=clean(l[75]);}],
];
const rows=cases.map(([name,mutate])=>{const inputs=clean([before,fixture,witnesses,levels]);mutate(...inputs);assert.throws(()=>validateScoringData(...inputs,api),undefined,name);return{name,rejected:true};});
const output='deliverables/star-targets71-80-20260927/pointer-support/scope-selfcheck-'+Date.now()+'.json';fs.mkdirSync('deliverables/star-targets71-80-20260927/pointer-support',{recursive:true});fs.writeFileSync(output,JSON.stringify({status:'PASS',positiveScoringGate:true,negativeChecks:rows,routeValidated:false,pointerValidated:false},null,2));console.log(JSON.stringify({output,status:'PASS',negativeChecks:rows.length}));
