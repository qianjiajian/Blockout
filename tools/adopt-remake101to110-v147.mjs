import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,BASELINE,OUTPUT,ruleGate,baseline as loadBaseline,digest,save as writeNew} from './remake101to110-v146.mjs';
import {verifyCandidate} from './verify-remake101to110-v147.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {collectBindings} from './remake91to100-bindings.mjs';
import {inspectDisjointWiring} from './remake91to100-wiring-drift.mjs';
ruleGate();
const [candidateFile,pointerFile]=process.argv.slice(2);assert(candidateFile&&pointerFile);
const data=JSON.parse(fs.readFileSync(candidateFile)),pointer=JSON.parse(fs.readFileSync(pointerFile));
const baseline=loadBaseline(),{api,inputs}=await loadApi();
const validationBindings=collectBindings([...inputs,candidateFile,pointerFile,BASELINE,'tools/adopt-remake101to110-v147.mjs']);
const wiringTexts=Object.fromEntries(['src/core/levels.ts','src/game/formalBlockShapes.ts'].map(p=>[p,fs.readFileSync(p,'utf8')]));
const verification=await verifyCandidate(data,api,baseline),row=pointer.rows.find(r=>r.id===data.level.id);
const verificationFile=`${OUTPUT}/adoption-calculated-${Date.now()}.json`;writeNew(verificationFile,{candidateFile,verification,validationBindings,bindingsAuditPending:true,formalAdopted:false});
const validationDrift=[];for(const [p,h]of Object.entries(validationBindings))if(digest(fs.readFileSync(p))!==h)validationDrift.push(wiringTexts[p]?inspectDisjointWiring(p,[data.level.id],wiringTexts[p]):inspectDisjointData(p,[data.level.id]));
assert.equal(pointer.status,'PASS');assert(row&&row.status==='PASS');assert.equal(row.levelSha256,digest(data.level));assert.equal(row.routeSha256,digest(data.drags));
assert.equal(pointer.clockFrozen,false);assert.equal(pointer.naturalClock,true);assert.equal(pointer.playerSaveTouched,false);
// Accept no runtime, input, or artwork drift after the pre-adoption input run.
const allowedDataDrift=[];for(const [p,h]of Object.entries(pointer.bindings))if(p.startsWith('src/')||p.startsWith('public/')){if(digest(fs.readFileSync(p))!==h){const prior=fs.readFileSync(path.join(pointer.sourceSnapshot,p),'utf8');allowedDataDrift.push(wiringTexts[p]?inspectDisjointWiring(p,[data.level.id],prior):inspectDisjointData(p,[data.level.id],prior));}}
const immediate=await loadApi(),before=structuredClone(immediate.api.LEVELS),id=data.level.id,stamp=Date.now(),beforePath=`${OUTPUT}/adoption-before-${stamp}.json`;
writeNew(beforePath,{createdAt:new Date().toISOString(),levels:before,sha256:digest(before)});
const modulePath='src/core/remake101to110.ts',levelsPath='src/core/levels.ts',artPath='src/game/formalBlockShapes.ts';
const oldModule=fs.existsSync(modulePath)?fs.readFileSync(modulePath,'utf8'):null;
let reviewed={};if(oldModule){const a=oldModule.indexOf('const reviewed: Record<number,LevelSpec> = '),b=oldModule.indexOf('\n};',a);assert(a>=0&&b>a);reviewed=JSON.parse(oldModule.slice(a+'const reviewed: Record<number,LevelSpec> = '.length,b+2));}
reviewed[id]=data.level;
const ids=Object.keys(reviewed).map(Number).sort((a,b)=>a-b),moduleText=`// Freshly validated v1.47 subset; unreviewed levels retain their prior data.\nimport type {LevelSpec} from './types';\nexport const REMADE_101_110_IDS: readonly number[] = ${JSON.stringify(ids)};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(reviewed,null,2)};\nexport const applyRemake101to110 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
const oldLevels=fs.readFileSync(levelsPath,'utf8'),oldArt=fs.readFileSync(artPath,'utf8');let nextLevels=oldLevels,nextArt=oldArt;
if(!oldLevels.includes('import { applyRemake101to110 }')){
 nextLevels=`import { applyRemake101to110 } from './remake101to110';\n`+nextLevels;
 const declarations=[...nextLevels.matchAll(/^export const LEVELS: LevelSpec\[\] = (.+);$/gm)];assert.equal(declarations.length,1);
 nextLevels=nextLevels.replace(declarations[0][0],`export const LEVELS_BEFORE_101_110_REMAKE: LevelSpec[] = ${declarations[0][1]};\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_101_110_REMAKE.map(applyRemake101to110);`);
}
if(!oldArt.includes('import { REMADE_101_110_IDS }')){
 nextArt=`import { REMADE_101_110_IDS } from '../core/remake101to110';\n`+nextArt;
 const needle=' ? "native-only" : "legacy",';assert.equal(nextArt.split(needle).length,2);nextArt=nextArt.replace(needle,' || REMADE_101_110_IDS.includes(levelId)'+needle);
}
// Synchronous final read-before-write preserves concurrent batches. Never
// restore an old global campaign snapshot into production.
assert.equal(fs.readFileSync(levelsPath,'utf8'),oldLevels);assert.equal(fs.readFileSync(artPath,'utf8'),oldArt);assert.equal(fs.existsSync(modulePath)?fs.readFileSync(modulePath,'utf8'):null,oldModule);
fs.writeFileSync(modulePath,moduleText);if(nextLevels!==oldLevels)fs.writeFileSync(levelsPath,nextLevels);if(nextArt!==oldArt)fs.writeFileSync(artPath,nextArt);
const fresh=await loadApi();assert.equal(digest(fresh.api.LEVELS[id-1]),digest(data.level));
for(const old of before)if(old.id!==id)assert.equal(digest(fresh.api.LEVELS[old.id-1]),digest(old),`Unrelated level changed during adoption: ${old.id}`);
for(let n=1;n<=30;n++)assert.equal(digest(fresh.api.LEVELS[n-1]),baseline.levels[n-1].sha256);
const out=`${OUTPUT}/adoption-${stamp}.json`;writeNew(out,{status:'PASS',id,candidateFile,pointerFile,beforePath,validationBindings,validationDrift,verificationFile,allowedDataDrift,verification,other199Unchanged:true,protected1to30Unchanged:true,productionBindings:Object.fromEntries([modulePath,levelsPath,artPath].map(p=>[p,digest(fs.readFileSync(p))])),formalPointerPending:true,releaseApproved:false});console.log(JSON.stringify({out,id,status:'PASS',formalPointerPending:true}));
