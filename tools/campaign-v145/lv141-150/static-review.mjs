import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const files=process.argv.slice(2);assert(files.length);
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const reports=[];
for(const file of files){
 const data=JSON.parse(fs.readFileSync(file)),level=data.level,id=level.id,b=baseline.levels[id-1];assert(id>=141&&id<=150);
 const failures=[];const test=(name,fn)=>{try{fn();return {status:'PASS'};}catch(e){failures.push(name);return {status:'FAIL',error:String(e.message)};}};
 const preservation=test('baseline preservation',()=>{assert.deepEqual(geometry(level),b.geometry);assert.deepEqual(api.levelStarTargets(level),b.starTargets);for(const k of ['id','name','timeSeconds','reward'])assert.deepEqual(level[k],b.level[k],k);});
 const modelValidation=test('model validation',()=>api.validateLevel(level));
 const model=new api.PuzzleModel(level),snapshot=model.snapshot(),visible=snapshot.blocks.filter(x=>model.isBlockActive(model.getBlock(x.id)));
 const opening=auditOpeningCoverage(snapshot),hidden=auditHiddenCoverage(level),span=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level);
 for(const [name,result]of Object.entries({opening,hidden,span,art}))if(!result.passed)failures.push(name);
 const q0=test('native whole shapes',()=>{for(const x of level.blocks){const m=api.matchFormalBlockShape(x.shape,'native-only');assert(m&&m.quarterTurns===0,x.id);}});
 const adjacent=test('visible neighboring colors',()=>{const occupancy=new Map();for(const x of visible)for(const [dx,dy]of x.shape)occupancy.set(`${x.x+dx},${x.y+dy}`,x);for(const [p,x]of occupancy){const [cx,cy]=p.split(',').map(Number);for(const [dx,dy]of [[1,0],[0,1]]){const y=occupancy.get(`${cx+dx},${cy+dy}`);assert(!y||x.id===y.id||x.color!==y.color,`${x.id}/${y?.id}`);}}});
 const nonrect=x=>{const W=Math.max(...x.shape.map(p=>p[0]))+1,H=Math.max(...x.shape.map(p=>p[1]))+1;return x.shape.length!==W*H;};
 const shapeRatio=test('nonrectangular at most 30 percent',()=>{for(const group of [visible,level.blocks])assert(group.filter(nonrect).length<=group.length*.3);});
 const ratio={opening:{nonrectangular:visible.filter(nonrect).length,total:visible.length},full:{nonrectangular:level.blocks.filter(nonrect).length,total:level.blocks.length}};
 reports.push({id,candidate:file,levelSha256:digest(level),routeSha256:digest(data.drags??[]),status:failures.length?'FAIL':'PASS',failures,preservation,modelValidation,opening,hidden,span,art,q0,adjacent,shapeRatio,ratio,scope:'static only; source, difficulty and route are separate gates'});
}
const own=['tools/campaign-v145/lv141-150/static-review.mjs','tools/revised-preview-validation-v160.mjs','tools/native-block-repair-v143.mjs','tools/revised-opening-coverage.mjs','tools/revised-hidden-coverage.mjs','tools/revised-gate-span-limits.mjs','docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`,'deliverables/remake31-200-v145-20260924/baseline.json'];
const report={ruleVersion:lock.activeVersion,reports,bindings:Object.fromEntries([...new Set([...files,...inputs,...own])].map(p=>[p,digest(fs.readFileSync(p))])),formalAdopted:false};
const out=`deliverables/remake31-200-v145-20260924/batches/lv141-150/static-review-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,rows:reports.map(({id,status,failures})=>({id,status,failures}))}));
