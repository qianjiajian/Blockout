import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertLowTwentyProposal,assertLowTwentyFailedParent,assertNoFailedDescendant} from './prepare-low-twenty.mjs';
import {readBound,readFile,sha,write,exists,PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,mergeBindings,checkBindings} from './low-twenty-io.mjs';

const own='tools/daily-challenge/formal-v4/draft-low-twenty-context-readonly.mjs',base='deliverables/daily-formal-v4-20261008/';
/** Only existing evidence and metadata. This intentionally cannot produce a
 * prepare-ready context: future constructor qualification and selection stay null. */
export async function draftLowTwentyContext(output){
 assert(!(await exists(output)));const bindings={},read=p=>readFile(p,bindings),bound=d=>readBound(d,bindings);
 const describe=async p=>{const b=await fs.readFile(p),d={path:p,sha256:sha(b)};mergeBindings(bindings,{[p]:d.sha256});return d;};
 const proposal=await describe(base+'design/low-band-diverse-twenty-proposal-02/proposal.json'),p=await bound(proposal);assertLowTwentyProposal(p);
 const proposalReview=await describe(base+'proof/low-band-diverse-twenty-proposal-independent-final-01.json'),pr=await bound(proposalReview);
 assert.equal(pr.status,'INDEPENDENT_DIVERSE_LOW_BAND_TWENTY_PROPOSAL_PASS');assert.deepEqual(pr.proposal,proposal);assert.deepEqual(pr.errors,[]);
 const names=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),requests=[];
 for(let start=0;start<names.length;start+=100)requests.push(...await Promise.all(names.slice(start,start+100).map(n=>read(path.join(PUBLIC_LEDGER,n)))));
 const failedParents=[],verifiedParents=[];
 for(const r of p.references){const anchor=r.knownSealedParent,q=await bound(anchor.candidate),request=await bound(anchor.request),result=await bound(anchor.result);
  assert.equal(q.sourceLevelId??q.level.id,r.sourceLevelId);assert.equal(q.accepted,false);assert.equal(q.levelSha256,levelSha256(q.level));
  assert.deepEqual(request,q.attempt??q.proof?.attempt);assert.equal(request.id,anchor.attemptId);assert.equal(request.levelSha256,q.levelSha256);
  assertLowTwentyFailedParent(q,result);const blocked=await bound(anchor.blocked),identityBlocked=await bound(anchor.identityBlocked);
  assert.equal(blocked.attemptId,request.id);assert.equal(blocked.status,q.status);assert.equal(identityBlocked.attemptId,request.id);assert.equal(identityBlocked.status,q.status);
  const lineage=await assertNoFailedDescendant(request.id,requests,id=>read(`${PUBLIC_LEDGER}/${id}.result.json`));
  failedParents.push({sourceLevelId:r.sourceLevelId,receipt:anchor.candidate});
  verifiedParents.push({sourceLevelId:r.sourceLevelId,...anchor,levelSha256:q.levelSha256,status:q.status,requestStartedAt:request.startedAt,resultFinishedAt:result.finishedAt,
   exactRequestCandidateMatch:true,exactResultCandidateFailureMatch:true,attemptAndIdentityBlocked:true,lineage,
   latestConfirmedInDeclaredBranchAtDraft:true,globallyLatestAmongUnrelatedSameSourceBranchesClaimed:false,needsLiveRefreshAgainAtPrepare:true});
 }
 const historyCheckpoint=await describe(base+'proof/low-band-thirtytwo-actual-independent-01/report.json'),hc=await bound(historyCheckpoint);
 assert.equal(hc.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(hc.errors,[]);assert.equal(hc.newSearches,0);assert.equal(hc.newLedgerClaims,0);
 const completion=await bound(hc.completion),historyPlan=completion.batchPlan,oldPlan=await bound(historyPlan);assert.equal(oldPlan.version,'finite-reviewed-low-band-batch-v1');
 const lowBandQualification=await describe(base+'proof/low-band-prefix-tail-independent-01/report.json'),mathq=await bound(lowBandQualification);assert.equal(mathq.status,'INDEPENDENT_LOW_BAND_PREFIX_TAIL_PASS');assert.deepEqual(mathq.errors,[]);
 const additionalHistoryReviews=[];for(const file of ['proof/early-frozen-four-actual-independent-02/report.json','proof/early-prefix-four-actual-independent-01/report.json']){
  const d=await describe(base+file),a=await bound(d);assert.deepEqual(a.errors,[]);assert.equal(a.newSearches,0);assert.equal(a.newLedgerClaims,0);additionalHistoryReviews.push(d);
  if(a.completion)await bound(a.completion);
 }
 const knownSelection152=await describe(base+'selection/completed-basic-and-advanced-152-01/index.json'),knownSelectionReview152=await describe(base+'proof/completed152-quick-independent-01.json');
 const sr=await bound(knownSelectionReview152);assert.deepEqual(sr.selection,knownSelection152);assert.equal(sr.status,'INDEPENDENT_152_MERGE_QUICK_CHECK_PASS');assert.deepEqual(sr.errors,[]);
 const latestAdvancedActualReview=await describe(base+'proof/low-band-thirtytwo-advanced-actual-independent-02/report.json');await bound(latestAdvancedActualReview);
 const constructorAuthorQualification=await describe(base+'proof/low-twenty-private-03/report.json');
 const context={proposal,proposalReview,constructorQualification:null,selection:null,selectionReview:null,historyCheckpoint,historyPlan,lowBandQualification,additionalHistoryReviews,failedParents};
 const currentNames=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(currentNames,names,'Public membership drift during readonly draft; no refresh was silently substituted');
 const requestSnapshot=names.map(n=>{const f=path.join(PUBLIC_LEDGER,n);return{path:f,sha256:bindings[f]};});
 mergeBindings(bindings,{[own]:sha(await fs.readFile(own))});await checkBindings(bindings);
 const report={status:'LOW_TWENTY_CONTEXT_DRAFT_NOT_EXECUTABLE',executable:false,context,
  pending:{constructorQualification:'Independent new-tool qualification is still pending; author report cannot substitute.',selection:'Use the actual final152 or153 descriptor only after iced flip terminal/admission decision.',selectionReview:'A real latest quick review and, for153, a narrowly qualified new schema adapter are required.'},
  knownSelection152,knownSelectionReview152,latestAdvancedActualReview,constructorAuthorQualification,
  verifiedParents,closedLow32:{plan:historyPlan,completion:hc.completion,actualInputs:completion.results.length,continued:false,quotaExtended:false},
  historyRoots:HISTORY_LEDGER_ROOTS,historySnapshotCaptured:false,historyMustBeCapturedLiveByPrepare:true,
  publicObservation:{requests:names.length,requestMembersAndBytesSha256:levelSha256(requestSnapshot),allRequestsReadForDeclaredBranchDescendants:true,claimedGloballyLatestSameSource:false},
  fileBindings:bindings,errors:[],newConstructions:0,newSearches:0,newLedgerClaims:0,newPrepareCalls:0,newWitnessReplays:0,formalReady:false};
 await fs.mkdir(output,{recursive:false});const file=path.join(output,'context-draft.json');await write(file,report);return{path:file,sha256:sha(await fs.readFile(file))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert(process.argv[2]);console.log(JSON.stringify(await draftLowTwentyContext(process.argv[2])));}
