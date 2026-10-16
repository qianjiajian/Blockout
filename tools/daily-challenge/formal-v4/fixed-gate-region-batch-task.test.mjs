import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {SELF,MIXED_SHORT_PREFIX_BATCH_VERSION,TARGETS,UPPER_BUDGET,LOWER_BUDGET,
 constructTargetStock,assertTargetConstructionAccounting,assertTargetInput} from './fixed-gate-region-batch-task.mjs';
import {PUBLIC_LEDGER,sha,write,mergeBindings} from './low-twenty-io.mjs';

const out=process.env.FIXED_GATE_REGION_BATCH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const evidence=[],bindings={},prefix='deliverables/daily-formal-v4-20261008/proof/';
const read=async(p,h)=>{const b=await fs.readFile(p);bindings[p]=sha(b);if(h)assert.equal(bindings[p],h,p);return JSON.parse(b);};
const names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();
const inherited={
 mixed:{path:prefix+'mixed-short-prefix-task-private-04/report.json',sha256:'c38ba22bfe5e9faf46547b17eda25cbf2173cdca11ff54a678f61efdfc52ce50'},
 factory:{path:prefix+'fixed-gate-region-stock-private-02/report.json',sha256:'4a7f5861442ccf9bee0c52b0e656eb617f4ce9a2035db2002f9a386f0b406ac9'},
 factoryIndependent:{path:prefix+'fixed-gate-region-stock-independent-01/report.json',sha256:'63ff1beb39869aefa55db4d0d8e390c4fe13c81dd2eab757b42a23f80bd97c16'}
};
const oldReport=await read(inherited.mixed.path,inherited.mixed.sha256);
for(const d of [inherited.factory,inherited.factoryIndependent])await read(d.path,d.sha256);

test('exact five substitutions retain targets, mathematics, accounting and shared identity; invalid dispatch never reaches a factory',async()=>{
 const old='tools/daily-challenge/formal-v4/mixed-short-prefix-batch-task.mjs';
 let source=await fs.readFile(old,'utf8');assert.equal(sha(source),'bc0db25623d213ccffb10a5dab9f963534a1d04f43571e1a772ea4fb0ca7b60b');bindings[old]=sha(source);
 const replacements=[
  ["import {constructLowTwentyRegionStock} from './low-twenty-region-factory.mjs';","import {constructPlainFixedGateRegionStock,constructIcedFixedGateRegionStock} from './fixed-gate-region-stock.mjs';"],
  ["import {constructEarlyPrefixStock} from './early-six-task-factory.mjs';\n",''],
  ['finite-mixed-short-prefix-reference-band2-task-v1','finite-fixed-gate-region-reference-band2-task-v1'],
  [old,SELF],
  ['?constructEarlyPrefixStock(runtime,b,options):constructLowTwentyRegionStock(runtime,b,options);','?constructIcedFixedGateRegionStock(runtime,b,options):constructPlainFixedGateRegionStock(runtime,b,options);']
 ];
 for(const[a,b]of replacements){assert.equal(source.split(a).length,2);source=source.replace(a,b);}
 assert.equal(await fs.readFile(SELF,'utf8'),source,'No undeclared outer changes');
 assert.equal(MIXED_SHORT_PREFIX_BATCH_VERSION,'finite-fixed-gate-region-reference-band2-task-v1');
 assert.equal(UPPER_BUDGET.maxStates,10000);assert.equal(LOWER_BUDGET.maxStates,9999);
 assert.equal(TARGETS[3].iceCount,2);assert.equal(TARGETS[2].iceCount,0);
 let calls=0;const sentinel=new Error('Validation probe only; no stock is formed');
 const runtime={assertPlainProofDomain(){calls++;throw sentinel;}};
 for(const b of [{finalTargetDifficulty:1,iceCount:0},{finalTargetDifficulty:3,iceCount:4},{finalTargetDifficulty:2,iceCount:2}])assert.throws(()=>constructTargetStock(runtime,b,{seed:1}));
 assert.equal(calls,0);
 for(const band of [3,2])assert.throws(()=>constructTargetStock(runtime,{finalTargetDifficulty:band,iceCount:TARGETS[band].iceCount},{seed:1}),e=>e===sentinel);
 assert.equal(calls,2);
 evidence.push({name:'five-declared-text-substitutions-and-before-stock-dispatch-negatives',passed:true,privateFactoryValidationProbes:2,stockEnumerationCalls:0});
});

test('saved qualified region-only toy outputs satisfy unchanged outer accounting/input consumers; relabel and undercharge reject without CSP',async()=>{
 for(const [band,count]of [[2,0],[3,2]]){
  const file=prefix+`fixed-gate-region-stock-private-02/private-stock-${count}.json`,built=await read(file);
  assert.equal(built.partitionScope.notGameplayLevel,true);assert.equal(built.partition.blocks.length,built.partitionScope.regionBodyCount);
  assert.equal(built.level.blocks.length,built.partitionScope.finalBodyCount);assert(built.partition.blocks.length<built.level.blocks.length);
  assertTargetConstructionAccounting(built,band);
  const changed=new Set(built.iceDeclaration?.regionBlockIds??built.partition.blocks.map((_,i)=>built.level.blocks[built.partitionScope.retainedBodies+i].id));
  const b={finalTargetDifficulty:band,fixedBlocks:built.level.blocks.filter(x=>!changed.has(x.id))};
  const q={...built,finalTargetDifficulty:band,targetDifficulty:band,referenceBand:2};assertTargetInput(q,b);
  const wrong=structuredClone(built);wrong.constructionAccounting.completeWorldReservations++;assert.throws(()=>assertTargetConstructionAccounting(wrong,band));
  const other=band===3?2:3;assert.throws(()=>assertTargetInput({...q,targetDifficulty:other,finalTargetDifficulty:other},b));
 }
 evidence.push({name:'actual-prior-toy-output-schema-and-accounting-negative-controls',passed:true,newStockConstructionCalls:0,newCspCalls:0});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const toolBindings={...oldReport.toolBindings};
 for(const f of Object.keys(compiled.metafile.inputs))mergeBindings(toolBindings,{[f.replaceAll('\\','/')]:sha(await fs.readFile(f))});
 for(const[p,h]of Object.entries(toolBindings))assert.equal(sha(await fs.readFile(p)),h,p);
 const testPath='tools/daily-challenge/formal-v4/fixed-gate-region-batch-task.test.mjs',after=await names();assert.deepEqual(after,before);
 await write(out+'/report.json',{status:evidence.length===2?'FIXED_GATE_REGION_BATCH_TASK_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===2?[]:['Focused check incomplete'],evidence,inheritedQualification:inherited,
  inheritedMixedTests:5,inheritedFactoryTests:4,inheritedTestsRerun:false,toolBindings,fileBindings:{...toolBindings,...bindings,[testPath]:sha(await fs.readFile(testPath))},
  policyReviewedAtPreparation:oldReport.policyReviewedAtPreparation,historicalDesignPolicy:oldReport.historicalDesignPolicy,mathematicalContract:oldReport.mathematicalContract,proofToolchainSha256:oldReport.proofToolchainSha256,
  newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,publicRequestCountBeforeAfter:[before.length,after.length],
  newStockEnumerationCalls:0,newCspCalls:0,newReplayCalls:0,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,qualificationOnly:true,formalReady:false});
});
