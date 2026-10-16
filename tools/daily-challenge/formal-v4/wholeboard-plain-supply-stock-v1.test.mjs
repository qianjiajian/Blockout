import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {colourAndPlaceExits,RECTANGLE_SHAPES,digest} from '../formal-v3/diversity-layout-factory.mjs';
import {colourAndPlaceExitsFirstFull,SELF as COLOUR} from './wholeboard-plain-first-full-colour-v1.mjs';
import {constructWholeboardPlainSupply,inspectWholeboardSupply,SELF as STOCK} from './wholeboard-plain-supply-stock-v1.mjs';

const SELF='tools/daily-challenge/formal-v4/wholeboard-plain-supply-stock-v1.test.mjs';
const OUT=process.env.PLAIN_SUPPLY_TEST_OUT;assert(OUT);await fs.mkdir(OUT,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[],evidence=[],activity={newRealConstructions:0,newModels:0,newSearches:0,newReplays:0,newClaims:0,syntheticColourInvocations:0,oldColourOracleInvocations:0,syntheticStockInvocations:0};
async function save(name,q){const p=path.join(OUT,name);await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});bindings[p]=sha(await fs.readFile(p));return{path:p,sha256:bindings[p]};}
const b=await build({stdin:{contents:"export {GAME_ART} from './src/game/artManifest.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const p of Object.keys(b.metafile.inputs).filter(p=>p!=='<stdin>'))bindings[p]=sha(await fs.readFile(p));
const rt={...await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64')),mechanismsUsedByDailyLevel:()=>[]};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),frame=()=>({id:998201,name:'tiny only',width:3,height:2,difficulty:'super',reward:0,timeSeconds:120,parMoves:30,mechanismRules:'revised-2026-09-27-v1.5',blocks:[0,1,2].map(x=>({id:'b'+x,x,y:0,shape:rect(1,2)})),gates:[]});
function paint(level=frame(),options={}){let reserved=0,observed=0,world=null;activity.syntheticColourInvocations++;const q=colourAndPlaceExitsFirstFull(level,rt,{seed:1,paletteSize:2,shapeProfile:'balanced',qualificationOnly:true,...options,reserveFullWorld(){if(options.refuseReserve)throw Error('tiny-reservation-refused');reserved++;assert.equal(reserved,1);},onFullWorld(l){observed++;assert.equal(observed,1);world=l;if(options.callbackThrow)throw Error('tiny-observer-failed');}});assert.equal(!!q.level,observed===1);if(q.level)assert.equal(q.level,world);const row={q,reserved,observed};evidence.push(row);return row;}
function source(){return{...frame(),blocks:[0,1].map(y=>({id:'original'+y,x:0,y,shape:rect(3,1),color:['red','blue'][y]})),gates:[{id:'old-red',color:'red',side:'left',offset:0,size:1},{id:'old-blue',color:'blue',side:'left',offset:1,size:1}]};}
function recipe(){return{recipeId:'qualification-plain-supply',sourceLevelId:998201,seed:1,colourSeed:1,bodyCount:3,shapeProfile:'balanced',primaryExitQuota:2,paletteSize:3,reservedGeneratorBerths:0,irregular:false,minimumIrregular:0,fixedBlocks:[],targetDifficulty:2,searchFloor:21,searchUpper:30,maximumPartitions:1,maximumColourCsp:1,maximumFirstFullInputs:1,maximumJointCalls:1,failedSameRecipeContinuationAllowed:false};}
function stock(options={}){activity.syntheticStockInvocations++;const q=constructWholeboardPlainSupply(source(),rt,recipe(),{qualificationOnly:true,...options});evidence.push({stock:q});return q;}
let fatal=null;
try{
 // Finite predeclared synthetic seeds. Old oracle may discard its own tiny
 // complete leaf; no production source or puzzle model is loaded here.
 const rows=[];let matching=0;for(let seed=1;seed<=8;seed++){
  activity.oldColourOracleInvocations++;const old=colourAndPlaceExits(frame(),rt,{seed,paletteSize:2,shapeProfile:'balanced'}),q=paint(frame(),{seed});
  if(old.ok){assert(q.q.ok);assert.deepEqual(q.q.level.blocks,old.blocks);assert.deepEqual(q.q.level.gates,old.gates);matching++;}rows.push({seed,old,new:q});
 }
 assert(matching>0);checks.push({name:'unchanged-domain-order-first-success-equivalence',pass:true,cases:8,matching});await save('colour-oracle.json',rows);
 const first=rows.find(r=>r.new.q.level);assert(first);const full=first.new;
 const fail=paint(frame(),{seed:first.seed,callbackThrow:true});assert(fail.q.level);assert.equal(fail.q.reason,'tiny-observer-failed');assert.deepEqual(fail.q.level,full.q.level);assert.equal(fail.reserved,1);
 const refused=paint(frame(),{seed:first.seed,refuseReserve:true});assert.equal(refused.q.level,null);assert.equal(refused.reserved,0);assert.equal(refused.observed,0);
 const deadline=paint(frame(),{seed:first.seed,maxNodes:2});assert(deadline.q.level);assert.equal(deadline.q.reason,'colouring-budget-after-first-full');assert.deepEqual(deadline.q.level,full.q.level);
 const no=paint(frame(),{seed:first.seed,maxTransitions:0});assert.equal(no.q.level,null);assert.equal(no.reserved,0);
 checks.push({name:'reserve-before-last-assignment-and-terminal-callback-node-cap',pass:true});
 const single={...frame(),width:2,height:1,blocks:[{id:'only',x:0,y:0,shape:rect(2,1)}]},singleRows=[];
 for(let seed=1;seed<=4;seed++)singleRows.push(paint(single,{seed,paletteSize:1}));
 const singleFull=singleRows.find(r=>r.q.level);assert(singleFull);assert.equal(singleFull.q.reason,'clearing-start-leaves-no-movable-body');assert.equal(singleFull.reserved,1);assert.equal(singleFull.q.leafCount,1);
 checks.push({name:'opening-assignment-is-complete-and-no-mobility-world-retained',pass:true});
 const minimumRows=[];for(let seed=1;seed<=4;seed++)minimumRows.push(paint(frame(),{seed,paletteSize:4}));
 assert(minimumRows.some(r=>r.q.reason==='first-full-minimum-colours-not-met'));for(const r of minimumRows)assert((r.q.leafCount??0)<=1);
 checks.push({name:'minimum-colour-rejection-retains-first-full-without-second-leaf',pass:true});
 const base=stock();assert(base.found,JSON.stringify(base));assert.equal(base.accounting.fullWorldReservations,1);assert.deepEqual(base.constructionCalls,{retile:1,colour:1});
 const thrown=stock({onFullWorld(){throw Error('tiny-stock-observer-failed');}});assert(thrown.found);assert.equal(thrown.levelSha256,base.levelSha256);assert.match(thrown.reason,/tiny-stock-observer-failed/);assert.equal(thrown.accounting.fullWorldReservations,1);
 let now=0;const timed=stock({now:()=>now,onFullWorld(){now=30000;}});assert(timed.found);assert.equal(timed.levelSha256,base.levelSha256);assert.match(timed.reason,/Construction deadline/);assert.equal(timed.accounting.fullWorldReservations,1);
 await save('stock-first-full-and-terminal.json',{base,thrown,timed});checks.push({name:'stock-full-retained-after-observer-and-clock-failure',pass:true});
 assert.throws(()=>constructWholeboardPlainSupply({...source(),seams:[{orientation:'horizontal',offset:1,start:0,size:1}]},rt,recipe(),{qualificationOnly:true}),/seams/);
 if(base.ok){inspectWholeboardSupply(base.level,source(),rt,{qualificationOnly:true});assert.throws(()=>inspectWholeboardSupply({...base.level,width:4},source(),rt,{qualificationOnly:true}));}
 checks.push({name:'seam-and-dimension-drift-rejected',pass:true});
}catch(e){fatal={message:e.message,stack:e.stack};process.exitCode=1;}
await save('all-tiny-evidence.json',{activity,evidence});
const bundle=await build({entryPoints:[STOCK],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(bundle.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));Object.assign(bindings,toolBindings);bindings[SELF]=sha(await fs.readFile(SELF));
await save('report.json',{status:fatal?'WHOLEBOARD_PLAIN_SUPPLY_FACTORY_TINY_FAIL':'WHOLEBOARD_PLAIN_SUPPLY_FACTORY_TINY_PASS',fatal,checks,activity,toolBindings,fileBindings:{...bindings},syntheticOnly:true,maximumSyntheticArea:6,maximumSyntheticBodies:3,originalColourOracleIsNotMathematicalSearch:true,productionQualified:false,ordering:'Same original domains/random order through first full. Minimum-colour/post-node/mobility rejection now terminates and preserves the object instead of backtracking or dropping it.'});
console.log(JSON.stringify({out:OUT,checks:checks.length,fatal,activity}));
