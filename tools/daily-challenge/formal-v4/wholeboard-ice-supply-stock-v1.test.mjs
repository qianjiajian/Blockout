import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {partialIceColourSupport,colourAndPlaceIceExitsFirstFull,SELF as COLOUR} from './wholeboard-ice-first-full-colour-v1.mjs';
import {constructWholeboardIceSupply,assertIceSupplyRecipe,inspectWholeboardIceSupply,SELF as STOCK} from './wholeboard-ice-supply-stock-v1.mjs';
const SELF='tools/daily-challenge/formal-v4/wholeboard-ice-supply-stock-v1.test.mjs',OUT=process.env.ICE_SUPPLY_TEST_OUT;
assert(OUT);await fs.mkdir(OUT,{recursive:false});const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[],activity={newRealConstructions:0,newModels:0,newSearches:0,newReplays:0,newClaims:0,syntheticColourInvocations:0,syntheticStockInvocations:0};
async function save(name,v){const p=path.join(OUT,name);await fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});bindings[p]=sha(await fs.readFile(p));return{path:p,sha256:bindings[p]};}
const art=await build({stdin:{contents:"export {GAME_ART} from './src/game/artManifest.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(art.metafile.inputs).filter(p=>p!=='<stdin>'))bindings[p]=sha(await fs.readFile(p));
const rt={...await import('data:text/javascript;base64,'+Buffer.from(art.outputFiles[0].text).toString('base64')),mechanismsUsedByDailyLevel:()=>[]};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const frame=()=>({id:998301,name:'ice tiny only',width:3,height:2,difficulty:'super',reward:0,timeSeconds:120,parMoves:30,mechanismRules:'revised-2026-09-27-v1.5',blocks:[0,1,2].map(x=>({id:'b'+x,x,y:0,shape:rect(1,2)})),gates:[]});
const source=()=>({...frame(),blocks:[0,1].map(y=>({id:'old'+y,x:0,y,shape:rect(3,1),color:['red','blue'][y]})),gates:[{id:'old-r',color:'red',side:'left',offset:0,size:1},{id:'old-b',color:'blue',side:'left',offset:1,size:1}]});
const recipe=colourSeed=>({recipeId:'qualification-ice-'+colourSeed,sourceLevelId:998301,seed:1,colourSeed,bodyCount:3,shapeProfile:'balanced',primaryExitQuota:2,paletteSize:3,reservedGeneratorBerths:0,irregular:false,minimumIrregular:0,fixedBlocks:[],targetDifficulty:3,searchFloor:31,searchUpper:128,gateIceCounts:[1,2],maximumPartitions:1,maximumColourCsp:1,maximumFirstFullInputs:1,maximumJointCalls:1,failedSameRecipeContinuationAllowed:false});
function paint(seed,extra={}){let reserved=0,observed=0,world=null;activity.syntheticColourInvocations++;const q=colourAndPlaceIceExitsFirstFull(frame(),rt,{seed,paletteSize:3,gateIceCounts:[1,2],qualificationOnly:true,...extra,reserveFullWorld(){if(extra.refuseReserve)throw Error('tiny-reserve-refused');assert.equal(reserved++,0);},onFullWorld(l){assert.equal(observed++,0);world=l;assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen),[1,2]);assert(l.blocks.every(b=>!b.frozen&&!b.movementAxis));if(extra.callbackThrow)throw Error('tiny-observer-failure');}});assert.equal(!!q.level,observed===1);if(q.level)assert.equal(q.level,world);return{q,reserved,observed};}
function stock(seed,extra={}){activity.syntheticStockInvocations++;return constructWholeboardIceSupply(source(),rt,recipe(seed),{qualificationOnly:true,...extra});}
let fatal=null;
try{
 const colours=['o','a','b'],gates=[{color:'o'},{color:'a',frozen:1},{color:'b',frozen:2}],subsets=Array.from({length:7},(_,i)=>colours.filter((_,j)=>(i+1)&(1<<j)));let domainSets=0,completeAssignments=0,supportChecks=0;
 for(let n=1;n<=4;n++){
  const domains=[];const visitDomains=i=>{if(i<n){for(const d of subsets){domains.push(d);visitDomains(i+1);domains.pop();}return;}
   domainSets++;const naive=[],pruned=[],a=Array(n).fill(null);
   const valid=xs=>new Set(xs).size===3&&xs.filter(c=>c==='o').length>=1&&xs.filter(c=>c!=='b').length>=2;
   const walk=(j,usePrune,out)=>{if(j===n){if(!usePrune)completeAssignments++;if(valid(a))out.push(a.join(''));return;}
    for(const c of domains[j]){if(usePrune&&!partialIceColourSupport(a,domains,gates,3,{index:j,color:c},()=>supportChecks++))continue;a[j]=c;walk(j+1,usePrune,out);a[j]=null;}};
   walk(0,false,naive);walk(0,true,pruned);assert.deepEqual(pruned,naive);
  };visitDomains(0);
 }
 const impossible=partialIceColourSupport(['o',null],[['o'],['a','b']],[...gates],3);assert.equal(impossible,false);
 await save('necessary-support-complete-set-equivalence.json',{domainSets,completeAssignments,supportChecks,maxBodies:4,maxColours:3,allCompleteAssignmentSetsEqual:true,minimumColourShortfallRejected:true,scalarAssignmentsNotWorlds:true});checks.push({name:'necessary-event-capacity-and-minimum-colours-full-set-equivalence',pass:true});
 const coloursRows=[];for(let seed=1;seed<=8;seed++)coloursRows.push({seed,...paint(seed)});await save('predeclared-eight-colour-tiny.json',coloursRows);
 const first=coloursRows.find(r=>r.q.level);assert(first,'At least one of the declared tiny seeds must form a full');const normal=paint(first.seed),thrown=paint(first.seed,{callbackThrow:true}),refused=paint(first.seed,{refuseReserve:true}),capped=paint(first.seed,{maxNodes:first.q.fullFacts.nodes});
 assert.deepEqual(thrown.q.level,normal.q.level);assert.equal(thrown.q.leafCount,1);assert.match(thrown.q.reason,/observer/);assert.equal(refused.q.level,null);assert.equal(refused.reserved,0);assert.equal(capped.q.leafCount,1);assert(capped.q.level);assert.match(capped.q.reason,/after-first-full/);
 const nofull=paint(first.seed,{maxTransitions:0});assert.equal(nofull.q.level,null);assert.equal(nofull.reserved,0);
 await save('colour-first-full-terminals.json',{normal,thrown,refused,capped,nofull});checks.push({name:'ice-present-before-first-full-observer-reservation-and-postfull-cap-terminal',pass:true});
 const stockRows=[];for(let seed=1;seed<=8;seed++)stockRows.push({recipe:recipe(seed),q:stock(seed)});await save('predeclared-eight-stock-tiny.json',stockRows);const chosen=stockRows.find(r=>r.q.found);assert(chosen,'Declared tiny stock must include a full');
 let t=0;const base=chosen.q,thrownStock=stock(chosen.recipe.colourSeed,{onFullWorld(){throw Error('tiny-stock-observer');}}),timedStock=stock(chosen.recipe.colourSeed,{now:()=>t,onFullWorld(){t=30000;}});
 for(const q of [base,thrownStock,timedStock]){assert(q.found);assert.equal(q.accounting.fullWorldReservations,1);assert.deepEqual(q.level,base.level);assert.equal(q.paint.leafCount,1);}
 assert.match(thrownStock.reason,/observer/);assert.match(timedStock.reason,/deadline/);if(base.ok)inspectWholeboardIceSupply(base.level,source(),rt,{qualificationOnly:true});
 await save('stock-first-full-and-terminals.json',{source:source(),recipe:chosen.recipe,base,thrown:thrownStock,timed:timedStock});checks.push({name:'stock-callback-and-timeout-retain-exact-first-ice-world',pass:true});
 const prod={...recipe(1),sourceLevelId:29,bodyCount:20,paletteSize:8,gateIceCounts:[7,10],source:{width:7,height:9,playableCells:63,seamCount:0,levelSha256:'0'.repeat(64),boardBaselineSha256:'0'.repeat(64)}};assertIceSupplyRecipe(prod);assert.throws(()=>assertIceSupplyRecipe({...prod,gateIceCounts:[1,2]}));assert.throws(()=>assertIceSupplyRecipe({...prod,targetDifficulty:2}));assert.throws(()=>assertIceSupplyRecipe({...prod,searchUpper:30}));assert.throws(()=>assertIceSupplyRecipe({...prod,source:{...prod.source,seamCount:1}}));checks.push({name:'production-two-ice-7-10-D3-no-seam-contract-private-small-values-isolated',pass:true});
}catch(e){fatal={message:e.message,stack:e.stack};process.exitCode=1;}
const bundled=await build({entryPoints:[STOCK],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(bundled.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));Object.assign(bindings,toolBindings);bindings[SELF]=sha(await fs.readFile(SELF));
await save('report.json',{status:fatal?'WHOLEBOARD_ICE_SUPPLY_FACTORY_TINY_FAIL':'WHOLEBOARD_ICE_SUPPLY_FACTORY_TINY_PASS',fatal,checks,activity,toolBindings,fileBindings:{...bindings},productionQualified:false,realSourcesGenerated:0,historyLoads:0,scope:'Only synthetic <=16-cell <=8-body fixtures and scalar colour-domain sets. No old candidate retry, model, replay or proof.'});console.log(JSON.stringify({out:OUT,checks:checks.length,fatal,activity}));
