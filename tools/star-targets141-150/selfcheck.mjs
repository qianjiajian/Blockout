import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';
import {inspectDisjointWiring} from '../remake111to120-wiring-drift-v147.mjs';
import {IDS,TARGETS,validateScoringData} from './verification.mjs';

const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const clean=v=>JSON.parse(JSON.stringify(v));
const before=JSON.parse(fs.readFileSync('deliverables/star-targets141-150-20260927/before-write.json'));
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake141to150-v173.json'));
// These controlled guard cases use the pinned before archive as their fixture.
// They are not a substitute for the separate full current-LEVELS preflight.
const levels=clean(before.priorLevels),cases=[];
for(const id of IDS)if(id!==142)levels[id-1].preservedMoveTarget=TARGETS[id];
const currentConcurrentIds=clean(api.LEVELS).filter((l,i)=>digest(l)!==digest(levels[i])).map(l=>l.id);
function reject(name,mutate){const b=clean(before),f=clean(fixture),l=clean(levels);mutate(b,f,l);assert.throws(()=>validateScoringData(b,f,l,api),undefined,name);cases.push({name,passed:true,expected:'rejected'});}
const positive=validateScoringData(before,fixture,levels,api);
cases.push({name:'archived-nine-field-change-and-ten-boundaries',passed:true,expected:'accepted'});
reject('gameplay-color-mutation',(_b,_f,l)=>{l[140].blocks[0].color='blue';l[140].blocks[0].x+=1;});
reject('time-target-mutation',(_b,_f,l)=>{l[140].timeSeconds+=10;});
reject('142-redundant-field-addition',(_b,_f,l)=>{l[141].preservedMoveTarget=51;});
reject('route-truncation',(_b,f)=>f.rows[0].drags.pop());
reject('route-path-edit',(_b,f)=>{f.rows[0].drags[0].path.push([99,99]);});
reject('difficulty-bound-relabel',(_b,f)=>{f.rows[0].lowerBound=0;});
reject('candidate-reference-substitution',(_b,f)=>{f.rows[0].candidate='unknown-candidate.json';});
reject('extra-target-change',(_b,_f,l)=>{l[130].preservedMoveTarget=1;});
reject('archived-route-hash-mutation',(b)=>{b.rows[0].routeSha256='0'.repeat(64);});
reject('archived-map-hash-mutation',(b)=>{b.rows[0].gameplaySha256='0'.repeat(64);});
reject('missing-whole-campaign-entry',(b)=>{b.priorLevels.pop();});

// Exercise the reused AST gate in an isolated read adapter. All synthesized
// files exist only in memory; no production path is created or overwritten.
const plain=(first,last,reviewed)=>{
  const keys=Object.keys(reviewed).map(Number);
  return `import type {LevelSpec} from './types';\nexport const REMADE_${first}_${last}_IDS: readonly number[] = ${JSON.stringify(keys)};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(reviewed)};\nexport const applyRemake${first}to${last} = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
};
function inMemory(texts,fn){const original=fs.readFileSync;fs.readFileSync=function(file,...args){if(Object.hasOwn(texts,String(file)))return texts[String(file)];return original.call(this,file,...args);};try{return fn();}finally{fs.readFileSync=original;}}
function gate(name,expected,fn){if(expected==='rejected')assert.throws(fn,undefined,name);else fn();cases.push({name,passed:true,expected});}
const disjoint='src/core/remake151to160.ts',pure=plain(151,160,{151:{id:151,name:'new unrelated data'}});
gate('pure-disjoint-data','accepted',()=>inMemory({[disjoint]:pure},()=>assert(inspectDisjointData(disjoint,IDS).verifiedPureData)));
gate('data-filename-executable-statement','rejected',()=>inMemory({[disjoint]:pure+'\nconsole.log(123);'},()=>inspectDisjointData(disjoint,IDS)));
gate('data-filename-executable-initializer','rejected',()=>inMemory({[disjoint]:pure.replace('{"151":{"id":151,"name":"new unrelated data"}}','globalThis.currentLevels()')},()=>inspectDisjointData(disjoint,IDS)));
gate('data-lookup-function-mutation','rejected',()=>inMemory({[disjoint]:pure.replace('reviewed[level.id] ?? level','reviewed[level.id + 1] ?? level')},()=>inspectDisjointData(disjoint,IDS)));
gate('runtime-file-not-data','rejected',()=>inspectDisjointData('src/core/PuzzleModel.ts',IDS));
const shared='src/core/remake141to150.ts',old=plain(141,150,{141:{id:141,value:1}}),changed=plain(141,150,{141:{id:141,value:2}});
gate('target-entry-shared-data-mutation','rejected',()=>inMemory({[shared]:changed},()=>inspectDisjointData(shared,IDS,old)));
const previous='export const LEVELS: LevelSpec[] = BASE_LEVELS;\n';
const appended="import { applyRemake151to160 } from './remake151to160';\nexport const LEVELS_BEFORE_151_160_REMAKE: LevelSpec[] = BASE_LEVELS;\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_151_160_REMAKE.map(applyRemake151to160);\n";
gate('pure-disjoint-wiring-append','accepted',()=>inMemory({[disjoint]:pure},()=>assert(inspectDisjointWiring('src/core/levels.ts',IDS,previous,appended).allOtherBytesUnchanged)));
gate('wiring-plus-runtime-statement','rejected',()=>inMemory({[disjoint]:pure},()=>inspectDisjointWiring('src/core/levels.ts',IDS,previous,appended+'runNewRuntime();\n')));

const report={passed:true,scope:'scoring-only acceptance guards on controlled archived fixtures',currentConcurrentIds,currentFormalPreflightClaimed:false,positiveBoundaryCases:positive.rows.reduce((n,r)=>n+r.boundaryCases.length,0),cases,files:Object.fromEntries(['tools/star-targets141-150/playtest.mjs','tools/star-targets141-150/browser.mjs','tools/star-targets141-150/verification.mjs','tools/star-targets141-150/selfcheck.mjs','tools/remake91to100-data-drift.mjs','tools/remake111to120-wiring-drift-v147.mjs'].map(p=>[p,digest(fs.readFileSync(p))])),pointerValidated:false,lowerBoundsRecomputed:false};
const file=`deliverables/star-targets141-150-20260927/agent-c/selfcheck-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,passed:true,boundaryCases:report.positiveBoundaryCases,positive:cases.filter(c=>c.expected==='accepted').length,negative:cases.filter(c=>c.expected==='rejected').length}));
