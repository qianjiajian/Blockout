import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {projectStaticConstraints,CONSTRAINT_PROJECTION_METHOD} from '../formal-v2/constraint-projection.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {guardedPlainTask,guardAllowanceFor,FROZEN_PROOF_SHA} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {assertStaticStarDomain,assertSource200StarStock} from './reverse-star-suffix-blueprint-v2.mjs';
export const SELF='tools/daily-challenge/formal-v4/reverse-star-suffix-lower-v2.mjs';
export const VERSION='star-only-single-projection-archived-lower-envelope-v2';
export const METHOD='v3-'+CONSTRAINT_PROJECTION_METHOD;
export const LIMITS=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
export const PREPAID_WORLDS=9;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const descriptor=d=>assert(d&&typeof d.path==='string'&&d.path.length&&/^[a-f0-9]{64}$/.test(d.sha256),'Archive must return an exact descriptor');
const integer=(n,min,max)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,'Finite quoted domain required');
function domain(level,{qualificationOnly=false}={}){
 integer(level.width,2,6);integer(level.height,2,8);const A=level.width*level.height;integer(A,4,48);integer(level.blocks?.length,1,17);integer(level.gates?.length,1,10);
 assertStaticStarDomain(level);
 for(const b of level.blocks){assert(!Object.hasOwn(b,'layers')&&!Object.hasOwn(b,'frozen'),'Only star fields may be erased');integer(b.shape.length,1,6);assert(b.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));
  const W=1+Math.max(...b.shape.map(p=>p[0])),H=1+Math.max(...b.shape.map(p=>p[1]));assert.equal(Math.min(...b.shape.map(p=>p[0])),0);assert.equal(Math.min(...b.shape.map(p=>p[1])),0);assert.equal(new Set(b.shape.map(p=>p.join(','))).size,W*H);assert.equal(b.shape.length,W*H);
 }
 for(const g of level.gates){assert(!Object.hasOwn(g,'frozen'));integer(g.size,1,3);}
 assert(level.blocks.some(b=>b.star===true)&&level.gates.some(g=>g.star===true),'Actual star restriction required');
 if(qualificationOnly)assert(level.id>=990000&&A<=16&&level.blocks.length<=8,'Tiny qualification only');
 else{assert.equal(level.id,200);assert.equal(level.width,6);assert.equal(level.height,8);assertSource200StarStock(level.blocks,level.gates);}
 return{A,B:level.blocks.length,S:6,G:level.gates.length,J:3};
}
/** Prepaid finite source-loop/copy envelope, NOT an exact distinct-world count.
 * Worlds: input1; projection clone1 + all-body replacement1 + all-gate
 * replacement1; compile initial map Array1 + spread Array1 + typed Array1; model1
 * + snapshot1. No additional projected LevelSpec is built for comparison.
 * Static validation allocates no whole model. The original kernel owns all
 * later raw states, including closure intermediates, plus terminal allowance1.
 * V covers one validation. Original validation + compile + model = three V.
 * Compile iterates <=B*A anchors, four frontier/gate tests, four neighbours,
 * then B^2 state/snapshot checks. The extra term covers projection and binding
 * field scans; archive byte I/O is covered by the common wall deadline.
 */
export function quoteStarSuffixLower(level,options={}){
 const p=domain(level,options),{A,B,S,G,J}=p,V=64*(1+A+B*S+G*(A+4*J+1)+B+G+4*S);
 const transitions=3*V+64*(A+B*B+B*G+B*S)+B*A*(16*S+4*(8*S+G*(2*S+3))+8)+64*(A+B*S+G*(J+1)+B+G),micro=B*A+2*B;
 assert(transitions<LIMITS.maxTransitions&&micro<LIMITS.maxMicroStates);
 return{version:VERSION,parameters:p,worlds:PREPAID_WORLDS,worldComponents:{originalInput:1,projectionClone:1,projectionBodyReplacement:1,projectionGateReplacement:1,compilerInitialMapArray:1,compilerInitialSpreadArray:1,compilerTypedInitialArray:1,compilerModel:1,compilerSnapshot:1},transitions,micro,validationEnvelope:V,exactCountClaimed:false};
}
/** Binding-only inspection. Never creates a second projected complete object. */
export function assertStarOnlyProjection(original,p){
 assert.equal(p.method,CONSTRAINT_PROJECTION_METHOD);assert.equal(p.sourceLevelSha256,levelSha256(original));assert.equal(p.projectedLevelSha256,levelSha256(p.projectedLevel));
 assert.equal(p.preservesBodies,true);assert.equal(p.preservesGateResolutionOrder,true);assert.equal(p.upperBoundTransfer,false);const target=p.projectedLevel;
 assert.deepEqual(Object.keys(target).sort(),Object.keys(original).sort());for(const k of Object.keys(original))if(k!=='blocks'&&k!=='gates')assert.deepEqual(target[k],original[k],k);
 const erased=[];for(const field of ['blocks','gates']){assert.equal(target[field].length,original[field].length);for(let i=0;i<original[field].length;i++){const a=original[field][i],b=target[field][i];assert.deepEqual(Object.keys(b).sort(),Object.keys(a).filter(k=>k!=='star').sort());for(const k of Object.keys(b))assert.deepEqual(b[k],a[k],field+':'+i+':'+k);if(a.star!==undefined)erased.push({owner:a.id,field:'star',value:a.star});}}
 assert.deepEqual(p.erased,erased);assertPlainProofDomain(target);return true;
}
export function assertStarSuffixLowerReceipt(q,original,{qualificationOnly=false}={}){
 const quote=quoteStarSuffixLower(original,{qualificationOnly});assert.equal(q.version,VERSION);assert.equal(q.method,METHOD);assert.equal(q.inputLevelSha256,levelSha256(original));assert.deepEqual(q.accounting.prepaid,quote);assert(q.accepted===false&&q.upperBoundTransfer===false);assert(!Object.hasOwn(q,'U')&&!Object.hasOwn(q,'route'),'A projected lower receipt cannot publish an original U');
 integer(q.requiredFloor,qualificationOnly?1:16,16);assert.equal(q.accounting.exactCountClaimed,false);integer(q.accounting.projectionCalls,0,1);integer(q.accounting.elapsedMilliseconds,0,Number.MAX_SAFE_INTEGER);
 for(const d of Object.values(q.archives))if(d)descriptor(d);
 if(q.projection){assert.equal(q.accounting.projectionCalls,1);assertStarOnlyProjection(original,q.projection);assert.equal(q.projectedLevelSha256,q.projection.projectedLevelSha256);}else{assert.equal(q.projectedLevelSha256,null);assert.equal(q.archives.projection,null);}
 if(q.searchBudget){integer(q.searchBudget.maxStates,1,9999-PREPAID_WORLDS);if(!qualificationOnly)assert.equal(q.searchBudget.maxStates,9999-PREPAID_WORLDS);assert.equal(q.searchBudget.maxTransitions,LIMITS.maxTransitions-quote.transitions);assert.equal(q.searchBudget.maxMicroStates,LIMITS.maxMicroStates-quote.micro);assert.equal(q.searchBudget.maxDragStates,LIMITS.maxDragStates);integer(q.searchBudget.maxMilliseconds,1,LIMITS.maxMilliseconds);}
 if(q.result){assert(q.projection&&q.archives.original&&q.archives.projection);assert.equal(q.accounting.searchCalls,1);assert.equal(q.result.sourceLevelSha256,q.projectedLevelSha256);assert.equal(q.result.floor,q.requiredFloor);assert.deepEqual(q.result.budget,q.searchBudget);assert.deepEqual(inspectSearchAccounting(q.result,'star-projected-lower'),[]);assert.deepEqual(q.result.guardAllowance,guardAllowanceFor(q.result));
  assert(q.searchBudget.maxStates<=9999-PREPAID_WORLDS);assert.equal(q.accounting.worldsUpperBound,PREPAID_WORLDS+q.result.guardAllowance.conservativeFullBoardStateUpperBound);assert.equal(q.accounting.transitions,quote.transitions+q.result.attemptedTransitions);assert.equal(q.accounting.micro,quote.micro+q.result.microDiscoveredStates);
  if(q.result.thresholdProven){assert.equal(q.result.status,'threshold-proven');assert.equal(q.result.termination,'below-threshold-exhausted');assert.equal(q.result.certifiedFloor,q.requiredFloor);}
 }else{
  assert([0,1].includes(q.accounting.searchCalls));
  if(q.accounting.searchCalls){assert(q.terminal&&q.searchBudget,'A thrown search is terminal, never a zero-work claim');assert.equal(q.accounting.worldsUpperBound,PREPAID_WORLDS+q.searchBudget.maxStates+1);assert.equal(q.accounting.transitions,10000000);assert.equal(q.accounting.micro,3000000);}
  else{assert.equal(q.searchBudget,null);assert.equal(q.accounting.worldsUpperBound,PREPAID_WORLDS);assert.equal(q.accounting.transitions,quote.transitions);assert.equal(q.accounting.micro,quote.micro);}
 }
 assert(q.accounting.worldsUpperBound<=10000&&q.accounting.transitions<=10000000&&q.accounting.micro<=3000000);
 if(q.mathematicalLowerValidated){assert.equal(q.status,'STAR_PROJECTED_LOWER_THRESHOLD_PROVEN');assert(q.result?.thresholdProven);assert.equal(q.terminal,null);assert(q.accounting.elapsedMilliseconds<30000);}
 if(q.terminal)assert.equal(q.mathematicalLowerValidated,false);return true;
}
/** Exactly one projection and at most one existing lower kernel invocation.
 * The explicit archive hook must only persist the supplied object; it must not
 * build another world, run a model/search, or return before durable completion.
 * The future task owns/authenticates those files and the original public claim.
 * This module creates no claim, chooses no U and grants no production authority.
 */
export async function runStarSuffixLower(runtime,original,{qualificationOnly=false,qualificationFloor=1,qualificationMaxStates,archiveFullWorld,now=Date.now}={}){
 assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);assert.equal(typeof archiveFullWorld,'function');assert(qualificationOnly||now===Date.now,'Production uses the actual wall clock');
 const started=now();const prepaid=quoteStarSuffixLower(original,{qualificationOnly});integer(started,0,Number.MAX_SAFE_INTEGER);const floor=qualificationOnly?qualificationFloor:16;integer(floor,1,16);
 if(!qualificationOnly)assert(qualificationMaxStates===undefined&&qualificationFloor===1,'No production search override');
 const maxStates=qualificationMaxStates??9999-PREPAID_WORLDS;integer(maxStates,1,9999-PREPAID_WORLDS);
 const q={version:VERSION,method:METHOD,inputLevelSha256:levelSha256(original),projectedLevelSha256:null,projection:null,requiredFloor:floor,result:null,searchBudget:null,archives:{original:null,projection:null},status:'STAR_LOWER_PREPAID',terminal:null,accepted:false,upperBoundTransfer:false,mathematicalLowerValidated:false,accounting:{prepaid,searchCalls:0,projectionCalls:0,worldsUpperBound:PREPAID_WORLDS,transitions:prepaid.transitions,micro:prepaid.micro,elapsedMilliseconds:0,exactCountClaimed:false}};
 let latest=started;function guard(){const t=now();assert(Number.isSafeInteger(t)&&t>=latest,'Invalid lower wall clock');latest=t;q.accounting.elapsedMilliseconds=t-started;if(t-started>=30000)throw Error('star-lower-overall-deadline');}
 async function archive(kind,level,hash){const d=await archiveFullWorld({kind,level,levelSha256:hash,inputLevelSha256:q.inputLevelSha256,upperBoundTransfer:false});descriptor(d);q.archives[kind]=d;assert.equal(levelSha256(level),hash,'Archive changed the original physical object');}
 try{
  guard();await archive('original',original,q.inputLevelSha256);guard();runtime.validateLevel(original);guard();
  q.accounting.projectionCalls=1;q.projection=projectStaticConstraints(original);q.projectedLevelSha256=q.projection.projectedLevelSha256;freeze(q.projection);
  // Persist immediately after the one constructor returns, before validation,
  // another guard, or any search. Failure retains the same projected object.
  await archive('projection',q.projection.projectedLevel,q.projectedLevelSha256);guard();assertStarOnlyProjection(original,q.projection);guard();
  q.searchBudget={maxStates,maxTransitions:10000000-prepaid.transitions,maxMicroStates:3000000-prepaid.micro,maxDragStates:10000,maxMilliseconds:30000-(latest-started)};
  q.accounting.searchCalls=1;
  // If an exceptional helper failure provides no raw receipt, retain the
  // entire finite reservation instead of inventing zero search work.
  q.accounting.worldsUpperBound=PREPAID_WORLDS+maxStates+1;q.accounting.transitions=10000000;q.accounting.micro=3000000;
  q.result=guardedPlainTask(q.projection.projectedLevel,runtime,{floor,searchUpper:null,...q.searchBudget});
  // Raw proof is retained before the post-call deadline or receipt check.
  q.accounting.worldsUpperBound=PREPAID_WORLDS+q.result.guardAllowance.conservativeFullBoardStateUpperBound;q.accounting.transitions=prepaid.transitions+q.result.attemptedTransitions;q.accounting.micro=prepaid.micro+q.result.microDiscoveredStates;
  guard();assert.equal(levelSha256(original),q.inputLevelSha256);assertStarOnlyProjection(original,q.projection);
  q.status=q.result.thresholdProven?'STAR_PROJECTED_LOWER_THRESHOLD_PROVEN':'STAR_PROJECTED_LOWER_NOT_PROVEN';q.mathematicalLowerValidated=q.result.thresholdProven===true;assertStarSuffixLowerReceipt(q,original,{qualificationOnly});
 }catch(e){q.terminal=e.message;q.status='STAR_LOWER_TERMINAL';q.mathematicalLowerValidated=false;}
 return q;
}
