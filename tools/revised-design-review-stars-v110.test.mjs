import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource,verifyReviewedDesign,auditStarSourceMetadata} from './revised-design-review-stars-v110.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'blockout-star-contract-'));
const evidence=path.join(dir,'unit-fixture.txt');
fs.writeFileSync(evidence,'Synthetic source contract fixture, never competitor evidence.');
const sha=p=>digest(fs.readFileSync(p)),cells=[[0,0],[1,0],[0,1],[1,1]],{api}=await loadPreviewCore();
const mechanisms={exits:{ordinaryCount:3,frozenCount:0,frozenValues:[],starCount:1,starFrozenCount:1,starFrozenValues:[1],flipCount:0},
 generators:{count:0,queueLengths:[]},covers:{count:0,values:[],hiddenBatchCounts:[]},numericIce:{count:0,values:[],postMeltShellCount:0},shells:{count:0},axisBlocks:{count:0,axes:[]},keysLocks:{keyCount:0,lockCount:0,lockValues:[],groups:[]},starBlocks:{count:1},flipDoors:{count:0,initialStates:[]},coloredGrid:{regionCount:0,cellCount:0},bombs:{count:0,values:[]},elevators:{count:0,hiddenBatchCounts:[]},irregularBlocks:{openingCount:0,fullCount:0}};
const names=['generators','axisBlocks','keyLocks','starBlocks','flipDoors','coloredGrids','bombs','covers','lifts','ordinaryExits','irregularBlocks','irregularBoard','frozenExits','numericIce','shells'];
const review={levelId:100,testFixtureOnly:true,sourceNormalizedFacts:{width:2,height:2,opening:4,full:4,mechanisms},
 sourceBoard:{levelId:100,kind:'normal',width:2,height:2,cells,components:1,hasSeams:false},
 sourceInventory:Object.fromEntries(names.map((name,i)=>[name,{mechanismId:'M'+String(i+1).padStart(2,'0'),count:name==='ordinaryExits'?3:['starBlocks','frozenExits'].includes(name)?1:0,reason:'Explicit synthetic observed inventory',evidencePaths:[evidence]}])),
 sourceFacts:{numericIce:{items:[]},elevators:{items:[]}},evidence:[{path:evidence,sha256:sha(evidence)}],stableOpeningEvidence:evidence,bindings:{[evidence]:sha(evidence)},unresolved:[],unsupported:[]};
const level={id:100,name:'Synthetic ordinary/star color pair',width:2,height:2,playable:cells,mechanismRules:'revised-2026-09-21-v1.2',difficulty:'normal',timeSeconds:300,reward:0,
 blocks:[{id:'s',x:0,y:0,color:'red',star:true,shape:[[0,0]]},{id:'b',x:1,y:0,color:'blue',shape:[[0,0]]},{id:'g',x:0,y:1,color:'green',shape:[[0,0]]},{id:'r',x:1,y:1,color:'red',shape:[[0,0]]}],
 gates:[{id:'star',side:'top',offset:0,size:1,color:'red',star:true,frozen:1},{id:'red',side:'left',offset:0,size:1,color:'red'},{id:'blue',side:'right',offset:0,size:1,color:'blue'},{id:'green',side:'left',offset:1,size:1,color:'green'}]};
const drags=[{blockId:'b',path:[],exitSide:'right'},{blockId:'s',path:[],exitSide:'top'},{blockId:'g',path:[],exitSide:'left'},{blockId:'r',path:[[1,0],[0,0]],exitSide:'left'}];
let n=0;async function load(value=review){const p=path.join(dir,`fixture-${n++}.json`);fs.writeFileSync(p,JSON.stringify(value));return(await loadReviewedDesignSource(p,sha(p))).source;}
test('star ice is one physical port, not a duplicate ordinary ice door',async()=>{
 const source=await load(),ports=source.sourceContract.mechanisms.exits;
 assert.equal(ports.length,4);assert.equal(ports.filter(p=>p.star).length,1);assert.equal(ports.filter(p=>p.frozen).length,1);
 const result=verifyReviewedDesign({level,drags},source,api);assert(result.sourceAligned&&result.replay.complete);assert.equal(result.proposedFacts.mechanisms.exits.starCount,1);
});
test('star block cannot exit through same-color nonstar door',()=>{
 const m=new api.PuzzleModel(level);m.start();assert.equal(m.tryExit('s','left').ok,false);
 m.beginAction();assert(m.tryExit('b','right').ok);m.commitAction();
 m.beginAction();assert(m.tryExit('s','top').ok);m.commitAction();
 assert.equal(m.snapshot().gates.find(g=>g.id==='star').star,true);
});
test('ordinary block can use the same-color star door',()=>{
 const m=new api.PuzzleModel(level);m.start();
 for(const [id,side]of [['b','right'],['s','top'],['g','left']]){m.beginAction();assert(m.tryExit(id,side).ok);m.commitAction();}
 m.beginAction();assert(m.moveBlockStep('r',1,0));assert(m.moveBlockStep('r',0,0));assert(m.tryExit('r','top').ok);m.commitAction();
 assert.equal(m.snapshot().complete,true);
});
test('changed star ice initial value does not pass source comparison',async()=>{
 const l=structuredClone(level);l.gates[0].frozen=2;assert.throws(()=>verifyReviewedDesign({level:l,drags},awaitSource,api));
});
const awaitSource=await load();
test('cannot remove star marking or add second nonstar red gate',async()=>{
 const l=structuredClone(level);delete l.blocks[0].star;assert.throws(()=>verifyReviewedDesign({level:l,drags},awaitSource,api),/Source alignment/);
 const d=structuredClone(level);d.gates.push({id:'duplicate',side:'bottom',offset:1,size:1,color:'red'});assert.throws(()=>verifyReviewedDesign({level:d,drags},awaitSource,api));
});
test('reject star ice count beyond physical total and unknown ice values',()=>{
 const a=structuredClone(mechanisms);a.exits.starFrozenCount=2;assert.throws(()=>auditStarSourceMetadata(a),/subset/);
 const b=structuredClone(mechanisms);b.exits.starFrozenValues=[null];assert.throws(()=>auditStarSourceMetadata(b),/Known positive/);
 const c=structuredClone(mechanisms);c.exits.starCount=9;assert.throws(()=>auditStarSourceMetadata(c),/capacity/);
});
test('incomplete star route is not a solution',()=>assert.throws(()=>verifyReviewedDesign({level,drags:drags.slice(0,2)},awaitSource,api),/complete replay/));
