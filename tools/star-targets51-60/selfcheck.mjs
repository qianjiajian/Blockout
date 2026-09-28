// Exercise independent rejection paths in the scope guard, without browser claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {IDS,TARGETS,BEFORE_SHA,clean,validateScoringData} from './verification.mjs';
const beforeFile='deliverables/star-targets51-60-20260927/before.json';
assert.equal(digest(fs.readFileSync(beforeFile)),BEFORE_SHA);
const before=JSON.parse(fs.readFileSync(beforeFile)),levels=clean(before.priorLevels),fixture=clean(before.fixture);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const id of IDS)levels[id-1].preservedMoveTarget=TARGETS[id];
const witnesses=JSON.parse(fs.readFileSync('deliverables/star-targets51-60-20260927/route-witnesses.json'));
assert(validateScoringData(before,fixture,witnesses,levels,api).passed);
const cases=[
 ['other level',(b,f,w,l)=>l[0].name+='changed'],
 ['gameplay',(b,f,w,l)=>l[51].blocks[0].x++],
 ['time target',(b,f,w,l)=>l[51].timeSeconds++],
 ['historical fixture route',(b,f)=>f.rows.find(r=>r.id===52).drags.pop()],
 ['route hash',(b,f,w)=>w.rows[0].routeSha256='0'.repeat(64)],
 ['route content',(b,f,w)=>{w.rows[0].drags[0].blockId='other';w.rows[0].routeSha256=digest(w.rows[0].drags);}],
 ['historical par moves',(b,f,w,l)=>l[51].parMoves++],
 ['before hash',(b,f,w)=>w.beforeSha256='0'.repeat(64)],
 ['witness formal object',(b,f,w)=>w.rows[0].level.name+='changed'],
 ['missing requested level',(b,f,w)=>w.rows.pop()],
 ['unauthorized exception upgrade',(b,f)=>f.rows.find(r=>r.id===59).lowerBound=16],
];
const rows=cases.map(([name,mutate])=>{const inputs=clean([before,fixture,witnesses,levels]);mutate(...inputs);assert.throws(()=>validateScoringData(...inputs,api),undefined,name);return{name,rejected:true};});
const output='deliverables/star-targets51-60-20260927/pointer-support/scope-selfcheck-'+Date.now()+'.json';
fs.mkdirSync('deliverables/star-targets51-60-20260927/pointer-support',{recursive:true});
fs.writeFileSync(output,JSON.stringify({status:'PASS',positiveScoringGate:true,negativeChecks:rows,routeValidated:false,pointerValidated:false},null,2));
console.log(JSON.stringify({output,status:'PASS',negativeChecks:rows.length}));
