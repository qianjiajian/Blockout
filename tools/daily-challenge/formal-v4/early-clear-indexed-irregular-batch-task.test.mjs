import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {declaredHistoryMembership as oldMembership} from './early-clear-replaced-irregular-batch-task.mjs';
import {declaredHistoryMembership,SELF,VERSION,PROPOSAL_REVIEW_STATUS,REVIEW_STATUS,TARGETS} from './early-clear-indexed-irregular-batch-task.mjs';
import {assertPlanHistoryMembers as oldMembers} from './plan-history-adapter-v4.mjs';
import {assertPlanHistoryMembers as newMembers} from './plan-history-adapter-v5.mjs';

const out=process.env.EARLY_CLEAR_INDEXED_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const hash=x=>createHash('sha256').update(x).digest('hex'),oldFile='tools/daily-challenge/formal-v4/early-clear-replaced-irregular-batch-task.mjs';
const tests=[],evidenceBindings={};
const check=(name,fn)=>test(name,async()=>{tests.push({name,...await fn(),passed:true});});
const inheritedQualification={path:'deliverables/daily-formal-v4-20261008/proof/replaced-irregular-reference-independent-01/report.json',sha256:'32d6e89fb3765d3f46e02be6faf93f2ae893ea0c4e0e4a05499754abd3e5c7ea'};
const indexedHistoryReview={path:'deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v5-independent-01/report.json',sha256:'ceeebb22f9998ec4cef5e5170eda5383f42556db2febbdc8cecc191f53eda5ab'};
const compiledPathReview={path:'deliverables/daily-formal-v4-20261008/proof/canonical-history-path-compiled-independent-01/report.json',sha256:'2379dd22c16fd64c12fcf9154e392b1a7355f945f0e5feaa7d5d25720afd9be6'};
async function bound(d){const raw=await fs.readFile(d.path);assert.equal(hash(raw),d.sha256);evidenceBindings[d.path]=d.sha256;return JSON.parse(raw);}

check('only declared indexed-history wiring and honest new entry names change',async()=>{
 const old=await fs.readFile(oldFile,'utf8'),actual=await fs.readFile(SELF,'utf8');assert.equal(hash(old),'59875b2af0c53e43e0e4b17727572166d3d5e599dce3ef85d00a1394c3cab634');
 let expected=old;const replacements=[['early-clear-replaced-irregular-batch-task.mjs','early-clear-indexed-irregular-batch-task.mjs'],['finite-early-clear-replaced-irregular-batch-task-v1','finite-early-clear-indexed-irregular-batch-task-v1'],['EarlyClearReplacedIrregularBatch','EarlyClearIndexedIrregularBatch'],['EARLY_CLEAR_REPLACED_IRREGULAR_','EARLY_CLEAR_INDEXED_IRREGULAR_'],['plan-history-adapter-v4.mjs','plan-history-adapter-v5.mjs']];
 for(const [a,b]of replacements){assert(expected.includes(a));expected=expected.replaceAll(a,b);}
 expected=expected.replaceAll('INDEPENDENT_EARLY_CLEAR_INDEXED_IRREGULAR_PROPOSAL_PASS','INDEPENDENT_EARLY_CLEAR_REPLACED_IRREGULAR_PROPOSAL_PASS').replaceAll('READONLY_EARLY_CLEAR_INDEXED_IRREGULAR_PROPOSAL_NOT_EXECUTABLE','READONLY_EARLY_CLEAR_REPLACED_IRREGULAR_PROPOSAL_NOT_EXECUTABLE');
 const nl=old.includes('\r\n')?'\r\n':'\n',importLine="import {canonicalHistoryPath} from './sealed-history-contract.mjs';";
 expected=expected.replace(importLine,importLine+nl+"import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';");
 const original="export function declaredHistoryMembership(h,delta){const scope=h.bundle.scope,listing=Object.fromEntries(scope.roots.map(x=>[x.id,[]])),seen=new Set();"+nl+" for(const f of [...h.bundle.files,...delta.files])if(f.rootId!==null){assert(Object.hasOwn(listing,f.rootId));const c=canonicalHistoryPath(f.path,scope);assert(!seen.has(c),'Duplicate declared history member');seen.add(c);listing[f.rootId].push(f.path);}return listing;}";
 assert(expected.includes(original));expected=expected.replace(original,original.replace('seen=new Set();','seen=new Set(),compiler=compileCanonicalHistoryPath(scope);').replace('canonicalHistoryPath(f.path,scope)','compiler.canonical(f.path)'));
 expected=expected.replace("'tools/daily-challenge/formal-v4/plan-history-adapter-v5.mjs'])assert(q.toolBindings[f])","'tools/daily-challenge/formal-v4/plan-history-adapter-v5.mjs','tools/daily-challenge/formal-v4/canonical-history-path-compiled.mjs'])assert(q.toolBindings[f])");
 assert.equal(actual,expected,'Unexpected change outside the declared history/name substitutions');assert.equal(PROPOSAL_REVIEW_STATUS,'INDEPENDENT_EARLY_CLEAR_REPLACED_IRREGULAR_PROPOSAL_PASS');assert.equal(VERSION,'finite-early-clear-indexed-irregular-batch-task-v1');
 for(const k of ['plan','static','actual'])assert(REVIEW_STATUS[k].includes('_INDEXED_IRREGULAR_'));assert.deepEqual([TARGETS[2].floor,TARGETS[2].upper,TARGETS[3].floor,TARGETS[3].upper],[21,30,31,null]);
 const q=await bound(inheritedQualification);assert.equal(q.status,'INDEPENDENT_EARLY_CLEAR_REPLACED_IRREGULAR_BATCH_TASK_PASS');assert.deepEqual(q.errors,[]);await bound(indexedHistoryReview);await bound(compiledPathReview);
 return{oldSourceSha256:hash(old),newSourceSha256:hash(actual),completeSourceEquivalentAfterDeclaredSubstitutions:true,proposalAndPhysicalRecipeDataUnchanged:true,oldQualificationNotRelabelled:true};
});

function fixture(){const ids=['public','late','reverse','vacancy','capacity','early','earlyPrefix'],scope={baseDirectory:'C:/fixture',roots:ids.map(id=>({id,physicalPath:`D:/history/${id}`,aliases:[`C:/fixture/${id}`,`E:/mirror/${id}`]}))};
 const files=ids.map((rootId,i)=>({path:i%2?`E:\\mirror\\${rootId}\\one.lock`:`${rootId}/one.json`,rootId}));files.push({path:'C:/outputs/baseline.json',rootId:null});
 return{h:{bundle:{scope,files}},delta:{files:[{path:'c:/fixture/public/TWO.lock',rootId:'public'},{path:'E:/mirror/late/nested/two.json',rootId:'late'},{path:'C:/outputs/new.json',rootId:null}]}};
}
check('compiled declaration preserves every root, member order, alias and external-file exclusion',()=>{
 const {h,delta}=fixture(),saved=structuredClone({h,delta}),expected=oldMembership(h,delta),actual=declaredHistoryMembership(h,delta);assert.deepEqual(actual,expected);assert.deepEqual({h,delta},saved);assert.equal(Object.values(actual).flat().length,9);assert.equal(Object.keys(actual).length,7);
 const merged={bundle:{scope:h.bundle.scope,files:[...h.bundle.files,...delta.files]}};assert.equal(oldMembers(merged,actual),true);assert.equal(newMembers(merged,actual),true);
 // A different scope gets a new local compiler, with no cross-operation cache.
 const other=fixture();other.h.bundle.scope.roots[0].physicalPath='F:/different/public';assert.deepEqual(declaredHistoryMembership(other.h,other.delta),oldMembership(other.h,other.delta));
 return{roots:7,members:9,rootIdNullFiles:2,oldAndNewListingExactlyEqual:true,inputsUnchanged:true,scopeReplacementRecompiled:true};
});
check('duplicate aliases, unknown roots, deleted members and undeclared additions remain rejected',()=>{
 const f=fixture(),duplicate=structuredClone(f.delta);duplicate.files.push({path:'D:/HISTORY/PUBLIC/one.json',rootId:'public'});
 for(const fn of [oldMembership,declaredHistoryMembership]){assert.throws(()=>fn(f.h,duplicate),/Duplicate declared history member/);assert.throws(()=>fn(f.h,{files:[{path:'C:/unknown/a',rootId:'unknown'}]}));}
 const listing=declaredHistoryMembership(f.h,f.delta),state={bundle:{scope:f.h.bundle.scope,files:[...f.h.bundle.files,...f.delta.files]}};
 for(const fn of [oldMembers,newMembers]){const deleted=structuredClone(listing);deleted.public.pop();assert.throws(()=>fn(state,deleted),/Deleted or renamed sealed member/);const repeated=structuredClone(listing);repeated.public.push('D:/HISTORY/PUBLIC/one.json');assert.throws(()=>fn(state,repeated),/Duplicate membership alias/);const added=structuredClone(listing);added.public.push('D:/history/public/unknown.lock');assert.throws(()=>fn(state,added),/Unknown owner\/member/);const missingRoot=structuredClone(listing);delete missingRoot.earlyPrefix;assert.throws(()=>fn(state,missingRoot));}
 return{negativeKinds:6,bothImplementationsReject:true,noLiveHistoryRead:true};
});

test.after(async()=>{
 const old=await bound(inheritedQualification),toolBindings={};
 for(const [file,expected]of Object.entries(old.toolBindings)){const digest=hash(await fs.readFile(file));assert.equal(digest,expected,file);toolBindings[file]=digest;}
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs)){const digest=hash(await fs.readFile(file));if(toolBindings[file])assert.equal(toolBindings[file],digest,file);toolBindings[file]=digest;}
 const testFile='tools/daily-challenge/formal-v4/early-clear-indexed-irregular-batch-task.test.mjs',fileBindings={...toolBindings,...evidenceBindings,[testFile]:hash(await fs.readFile(testFile))};
 const report={status:tests.length===3?'EARLY_CLEAR_INDEXED_IRREGULAR_BATCH_TASK_PRIVATE_PASS':'INCOMPLETE',testsPassed:tests.length,tests,errors:[],inheritedQualification,indexedHistoryReview,compiledPathReview,toolBindings,fileBindings,
  scope:'Future entry only: identical irregular replacement, finite recipes, stocks, mathematics and scheduler; indexed history and compiled declared membership only.',
  searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,oldQualificationNotRelabelled:true,existingToolsChanged:false,physicalRecipeDataChanged:false,
  newModelReplays:0,newRealReferenceReplays:0,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,newLedgerClaims:0,newHistoryScans:0,newActualPlans:0,formalReady:false};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
