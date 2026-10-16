import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SELF,VERSION,PINS,ZERO_ACTIONS,preflightSelection162,buildSelection162Metadata,assertOriginalN20,assertSelectionPrefix,assertSelection162Bridge} from './admit-reviewed-n20-selection-162.mjs';

const TEST='tools/daily-challenge/formal-v4/admit-reviewed-n20-selection-162.metadata.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function testSelection162Metadata(outputDirectory){
 const results=[],readPaths=[];
 const evidence=await preflightSelection162({readBytes:async p=>{assert(!p.replaceAll('\\','/').endsWith('/checkpoint.json'));readPaths.push(p);return fs.readFile(p);}});
 const{x,receipts}=evidence;
 results.push({name:'real-original-bindings-and-owner-history-evidence',passed:true,priorReceiptCount:receipts.length,boundFiles:Object.keys(evidence.reader.bindings).length,noCheckpointRead:true});
 // Deliberately nonexistent metadata-only output identity; never written or
 // presented as an actual merge audit. No LevelSpec is changed or constructed.
 const inMemoryAudit={path:'METADATA_TEST_ONLY_NOT_WRITTEN/merge-audit.json',sha256:sha('metadata-only-not-written')};
 const index=buildSelection162Metadata(evidence,inMemoryAudit);
 assertSelection162Bridge(index,x.baseSelection,x.candidate);assert.deepEqual(index.files.slice(0,161),x.baseSelection.files);
 results.push({name:'one-original-receipt-appended-in-memory',passed:true,candidateCount:162,oldPrefix:161,newOriginalReceipts:1,finalIndexWritten:false});
 const rejects=[];function refusal(name,fn){assert.throws(fn);rejects.push(name);}
 for(const k of ['designValidated','catalogEligible','formalReady'])refusal('original-'+k+'-cannot-be-upgraded',()=>assertOriginalN20({...x.candidate,[k]:true}));
 refusal('wrong-route-hash',()=>assertOriginalN20({...x.candidate,routeSha256:'0'.repeat(64)}));
 refusal('different-slot',()=>assertOriginalN20({...x.candidate,slot:4}));
 results.push({name:'original-candidate-facts-and-false-flags',passed:true,refusals:rejects.splice(0)});
 refusal('duplicate-original-slot',()=>assertSelectionPrefix(x.baseSelection,receipts.map((r,i)=>i===0?{...r,value:{...r.value,formalId:receipts[1].value.formalId}}:r),x.candidate));
 refusal('occupied-new-slot',()=>assertSelectionPrefix(x.baseSelection,receipts.map((r,i)=>i===0?{...r,value:{...r.value,formalId:x.candidate.formalId}}:r),x.candidate));
 refusal('unadapted-base-already-selected',()=>assertSelectionPrefix(x.baseSelection,receipts.map((r,i)=>i===0?{...r,value:{...r.value,levelSha256:x.baseCandidate.levelSha256}}:r),x.candidate));
 refusal('wrong-original-receipt-sha',()=>assertSelectionPrefix(x.baseSelection,receipts.map((r,i)=>i===0?{...r,sha256:'0'.repeat(64)}:r),x.candidate));
 refusal('reordered-prefix',()=>assertSelection162Bridge({...index,files:[index.files[1],index.files[0],...index.files.slice(2)]},x.baseSelection,x.candidate));
 results.push({name:'original-prefix-and-independent-slot-refusals',passed:true,refusals:rejects.splice(0)});
 refusal('unsupported-pointer-claim',()=>assertSelection162Bridge({...index,candidatePointerValidatedForNewEntries:true},x.baseSelection,x.candidate));
 refusal('unsupported-formal-claim',()=>assertSelection162Bridge({...index,formalReady:true},x.baseSelection,x.candidate));
 refusal('history-role-grant',()=>assertSelection162Bridge({...index,selectionEvidenceBridge:{...index.selectionEvidenceBridge,historyRoleAuthorizationGranted:true}},x.baseSelection,x.candidate));
 refusal('detached-root-decision',()=>assertSelection162Bridge({...index,rootDesignApproval:PINS.designReview},x.baseSelection,x.candidate));
 refusal('fake-index-count',()=>assertSelection162Bridge({...index,candidateCount:163},x.baseSelection,x.candidate));
 results.push({name:'bridge-does-not-invent-pointer-formal-or-history-authority',passed:true,refusals:rejects.splice(0)});
 await assert.rejects(()=>preflightSelection162({readBytes:async p=>p===PINS.candidate.path?Buffer.from('{}'):evidence.reader.bytes.get(p)??fs.readFile(p)}),/Changed bound bytes/);
 results.push({name:'wrong-original-bytes-rejected-before-admission',passed:true});
 await evidence.reader.recheck();
 const files={...evidence.reader.bindings};for(const p of [SELF,TEST])files[p]=sha(await fs.readFile(p));
 const frozen='deliverables/daily-formal-v4-20261008/frozen-workspace-4588';
 for(const p of [SELF,TEST]){const fp=path.resolve(frozen,p);assert.equal(sha(await fs.readFile(fp)),files[p]);files[fp]=files[p];}
 const report={schemaVersion:1,status:'N20_SELECTION_162_METADATA_TOOL_PREFLIGHT_PASS',version:VERSION,scope:'Metadata append tool and saved evidence only; final selection and its independent review do not yet exist',tests:results,passed:results.length,errors:[],priorSelection:PINS.baseSelection,candidate:PINS.candidate,rootDesignApproval:PINS.rootDesignApproval,expectedSelection:{candidateCount:162,missing:138,bands:{1:84,2:56,3:22},designAccepted:81,held:73,pending:8,formalAccepted:0},selectionWritten:false,originalCandidateFlagsPreserved:true,historyEvidenceMode:'Only original small delta/owner/report bytes and checkpoint independent evidence; no checkpoint read, history consume, merge, or live membership scan',originalMathematicsRecomputed:false,rootFrozenSourcesEqual:true,readOperations:readPaths.length,toolBindings:{[SELF]:files[SELF],[TEST]:files[TEST]},fileBindings:files,...ZERO_ACTIONS};
 const out=path.resolve(outputDirectory);assert(out.startsWith(path.resolve('deliverables/daily-formal-v4-20261008/proof')+path.sep));await fs.mkdir(out,{recursive:false});const p=path.join(out,'report.json'),b=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b),passed:results.length,fileBindings:Object.keys(files).length,selectionWritten:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv[2]);console.log(JSON.stringify(await testSelection162Metadata(process.argv[2])));}
