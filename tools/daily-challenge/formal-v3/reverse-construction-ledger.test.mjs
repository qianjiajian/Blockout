import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createReverseConstructionLedger,reverseTemplateFingerprints} from './design-reverse-construction-ledger.mjs';

const fixture=()=>({id:997622,name:'new qualification stock',width:2,height:2,timeSeconds:180,difficulty:'super',reward:0,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:0,y:1,color:'blue',shape:[[0,0],[1,0]]}],
  gates:[{id:'r',side:'left',offset:0,size:1,color:'red'},{id:'b',side:'left',offset:1,size:1,color:'blue'}]});
const budget={maxStates:10000,maxMicroStates:1000000,maxTransitions:3000000,maxMilliseconds:30000};
const context=()=>({sourceLevelId:997622,seed:1,budget});
const newLedger=async()=>createReverseConstructionLedger(await fs.mkdtemp(path.join(os.tmpdir(),'blockout-reverse-ledger-qualification-')));
const failure={ok:false,status:'REVERSE_CONSTRUCTION_STOPPED',reason:'construction-max-raw-board-states',construction:{rawDiscoveredStates:10000,rawExpandedStates:9911}};

test('construction input identity ignores names, IDs, discarded placements and ordering of shape cells',()=>{
  const level=fixture(),mutated=structuredClone(level);mutated.id=12;mutated.name='renamed';
  mutated.blocks.reverse();mutated.gates.reverse();
  for(const b of mutated.blocks){b.id=`renamed-${b.id}`;b.y=1-b.y;b.shape.reverse();}
  const a=reverseTemplateFingerprints(level),b=reverseTemplateFingerprints(mutated);
  assert.equal(a.inputSha256,b.inputSha256,'no same-shape cell-order escape');
  assert.equal(a.shapeInventorySha256,b.shapeInventorySha256);
  assert.equal(a.colourInventorySha256,b.colourInventorySha256);
  assert.notEqual(a.templateLevelSha256,b.templateLevelSha256,'full archived template still distinguishes metadata');
});

test('pending or failed stock cannot resume under a new seed, larger budgets or metadata',async()=>{
  const ledger=await newLedger(),level=fixture(),attempt=await ledger.claim(level,context());
  await assert.rejects(()=>ledger.claim({...level,name:'pending rename'},{...context(),seed:2}));
  await ledger.finish(attempt,failure);
  await assert.rejects(()=>ledger.claim({...level,name:'failed rename'},{...context(),seed:3,budget:{...budget,maxStates:20000}}));
});

test('failure requires new physical shapes and new colours; gates or reordered cells cannot substitute',async()=>{
  const ledger=await newLedger(),level=fixture(),attempt=await ledger.claim(level,context());await ledger.finish(attempt,failure);
  for(const mutate of [
    l=>{l.blocks[0].color='green';l.blocks[1].color='pink';l.gates[0].color='green';l.gates[1].color='pink';},
    l=>{l.blocks.forEach((b,i)=>{b.shape=[[0,0],[0,1]];b.x=i;b.y=0;});},
    l=>{l.gates.forEach(g=>g.side='right');},
    l=>{l.blocks.forEach(b=>b.shape.reverse());l.blocks[0].color='green';l.gates[0].color='green';},
  ]){const altered=structuredClone(level);mutate(altered);await assert.rejects(()=>ledger.claim(altered,{...context(),seed:8}),/both new shape inventory and new colour inventory/);}
  const redesign=structuredClone(level);redesign.blocks.forEach((b,i)=>{b.shape=[[0,0],[0,1]];b.x=i;b.y=0;b.color=i?'pink':'green';});
  redesign.gates=[{id:'green',color:'green',side:'top',offset:0,size:1},{id:'pink',color:'pink',side:'bottom',offset:1,size:1}];
  const fresh=await ledger.claim(redesign,{...context(),seed:9});assert.notEqual(fresh.inputSha256,attempt.inputSha256);
  assert.notEqual(fresh.shapeInventorySha256,attempt.shapeInventorySha256);assert.notEqual(fresh.colourInventorySha256,attempt.colourInventorySha256);
});

test('public construction result preserves its full claimed stock and never claims a lower bound or formal pass',async()=>{
  const ledger=await newLedger(),level=fixture(),attempt=await ledger.claim(level,context());await ledger.finish(attempt,failure);
  const claim=JSON.parse(await fs.readFile(`${attempt.path}/claim.json`,'utf8')),result=JSON.parse(await fs.readFile(`${attempt.path}/result.json`,'utf8'));
  assert.deepEqual(claim.constructionTemplateLevel,level);assert.equal(result.constructed,false);assert.equal(result.formalReady,false);
  assert.equal(result.construction.rawDiscoveredStates,10000);assert.equal(result.reason,failure.reason);assert(!('L' in result));
});

test('legacy noncanonical claims remain blocked without changing historical bytes',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-reverse-ledger-legacy-qualification-')),oldPath=`${directory}/legacy-shape-order-id`,level=fixture();
  level.blocks.forEach(b=>b.shape.reverse());await fs.mkdir(oldPath);
  const claimText=JSON.stringify({sourceLevelId:997622,inputSha256:'legacy-shape-order-id',shapeInventorySha256:'legacy-shape',colourInventorySha256:'legacy-colour',constructionTemplateLevel:level});
  await fs.writeFile(`${oldPath}/claim.json`,claimText);await fs.writeFile(`${oldPath}/result.json`,JSON.stringify(failure));
  await fs.writeFile(`${directory}/source-997622-last-failure.json`,JSON.stringify({inputSha256:'legacy-shape-order-id',shapeInventorySha256:'legacy-shape',colourInventorySha256:'legacy-colour',resultPath:`${oldPath}/result.json`}));
  const ledger=await createReverseConstructionLedger(directory);
  await assert.rejects(()=>ledger.claim(fixture(),context()),/already claimed/);
  const onlyColour=fixture();onlyColour.blocks[0].color='green';onlyColour.gates[0].color='green';
  await assert.rejects(()=>ledger.claim(onlyColour,context()),/both new shape inventory and new colour inventory/);
  assert.equal(await fs.readFile(`${oldPath}/claim.json`,'utf8'),claimText);
});
