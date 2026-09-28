// Evidence-gate negative checks; not a route, clock, or difficulty certificate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {BEFORE_FILE,WITNESSES_FILE} from './config.mjs';
import {IDS,ALL_IDS,TARGETS,BEFORE_SHA,clean,validateScoringData} from './verification.mjs';
assert.equal(digest(fs.readFileSync(BEFORE_FILE)),BEFORE_SHA);
const before=JSON.parse(fs.readFileSync(BEFORE_FILE)),levels=clean(before.priorLevels),fixture=clean(before.fixture);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const id of IDS)levels[id-1].preservedMoveTarget=TARGETS[id];
const witnesses=JSON.parse(fs.readFileSync(WITNESSES_FILE));
assert(validateScoringData(before,fixture,witnesses,levels,api).passed);
const first=IDS[0]-1,unmodified=ALL_IDS.find(id=>!IDS.includes(id))-1;
const cases=[
 ['other level',(b,f,w,l)=>l[0].name+='changed'],
 ['unmodified batch level',(b,f,w,l)=>l[unmodified].preservedMoveTarget=999],
 ['gameplay',(b,f,w,l)=>l[first].blocks[0].x++],
 ['time target',(b,f,w,l)=>l[first].timeSeconds++],
 ['historical fixture route',(b,f)=>f.rows[0].drags.pop()],
 ['witness route hash',(b,f,w)=>w.rows[0].routeSha256='0'.repeat(64)],
 ['witness drag count',(b,f,w)=>{w.rows[0].drags.pop();w.rows[0].routeSha256=digest(w.rows[0].drags);}],
 ['historical par moves',(b,f,w,l)=>l[first].parMoves++],
 ['before hash',(b,f,w)=>w.beforeSha256='0'.repeat(64)],
 ['witness formal object',(b,f,w)=>w.rows[0].level.name+='changed'],
 ['missing requested level',(b,f,w)=>w.rows.pop()],
 ['forbidden tighter target',(b,f,w,l)=>l[first].preservedMoveTarget=1],
];
const rows=cases.map(([name,mutate])=>{const inputs=clean([before,fixture,witnesses,levels]);mutate(...inputs);assert.throws(()=>validateScoringData(...inputs,api),undefined,name);return{name,rejected:true};});
const directory='deliverables/star-targets91-100-20260927/pointer-support',output=directory+'/scope-selfcheck-'+Date.now()+'.json';
fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(output,JSON.stringify({status:'PASS',positiveScoringGate:true,negativeChecks:rows,routeValidated:false,pointerValidated:false},null,2));
console.log(JSON.stringify({output,status:'PASS',negativeChecks:rows.length}));
