import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';
import {inspectHardRegionStatic} from './design-hard-region-pool.mjs';
const [directory='deliverables/daily-formal-v3-20261008/design/nearband-multistep-01',selectedIndex='deliverables/daily-formal-v3-20261008/selection/nearband19-selected/index.json',artifactTag='latest128-v2']=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(artifactTag))throw Error('Invalid output artifact tag');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const similarityBoth=(a,b)=>Math.max(compareLayouts(a,b).footprintSimilarity,compareLayouts(b,a).footprintSimilarity);
const report=read(`${directory}/report.json`),refs=read(report.referenceFile);
if(report.status!=='FINITE_MULTISTEP_BATCH_FINISHED')throw Error('Audit only the completed finite batch');
const runtime=await loadBoundedRuntime(),selected=read(selectedIndex).files.map(p=>({path:p,level:read(p).level,fileSha256:sha(p)}));
const issues=[],rows=[],sourceCounts=new Map(),rootSuccesses=new Map(),priorFailed=new Map(),records=[];
const originalRootComparators=[...refs.selectedBindings,...refs.successfulBindings,...refs.visualExclusions.excluded.map(e=>({path:e.baseInputFile}))]
 .map(e=>({path:e.path,level:read(e.path).level}));
const rootEligibility=new Map();
for(const ref of refs.chosen){let maximum=0,nearest=null;const rootLevel=read(ref.rootIndependentSeed).level;
 for(const e of [...originalRootComparators,...selected]){const v=similarityBoth(rootLevel,e.level);if(v>maximum){maximum=v;nearest=e.path;}}
 rootEligibility.set(ref.rootIndependentSeed,{pass:maximum<=.65,maximum,limit:.65,nearest});
}
if(report.proofToolchainSha256!==runtime.toolchainSha256)issues.push('Frozen proof binding changed');
if(sha(report.referenceFile)!==report.referenceFileSha256)issues.push('Reference evidence binding changed');
if(refs.chosen.length>20||new Set(refs.chosen.map(r=>r.sourceLevelId)).size!==refs.chosen.length)issues.push('Reference scope invalid');
let maxRaw=0,maxExpanded=0,maxTransitions=0,maxMicro=0,maxMilliseconds=0;
for(const row of report.rows){const b=read(row.path),ref=refs.chosen.find(r=>r.path===row.reference),f=designFingerprints(b.level),p=b.proof,local=[];
 const prior=priorFailed.get(b.sourceLevelId)??{id:read(ref.path).attempt.id,fingerprints:designFingerprints(read(ref.path).level)};
 if(sha(row.path)!==row.fileSha256||levelSha256(b.level)!==b.levelSha256) local.push('Object/file SHA mismatch');
 if(b.proofToolchainSha256!==runtime.toolchainSha256||p?.sourceLevelSha256!==b.levelSha256||b.attempt.levelSha256!==b.levelSha256)local.push('Proof/attempt object or current tool binding mismatch');
 if(b.attempt.id!==f.designSha256||b.attempt.redesignOf!==prior.id) local.push('Failed-parent ledger chain mismatch');
 if(f.shapeSha256===prior.fingerprints.shapeSha256||f.colorSha256===prior.fingerprints.colorSha256)local.push('Shape and color must both change from immediate failed parent');
 if(b.provenance.rootIndependentSeed!==ref.rootIndependentSeed||b.provenance.rootIndependentSeedSha256!==sha(ref.rootIndependentSeed))local.push('Whole-board root binding mismatch');
 const ledgerBase=`deliverables/daily-formal-v3-20261008/proof/attempts/${b.attempt.id}`;
 const ledgerBindings={};for(const suffix of ['request','result',...(b.accepted?[]:['blocked'])]){const path=`${ledgerBase}.${suffix}.json`;
  if(!fs.existsSync(path))local.push(`Missing ledger ${suffix}`);else ledgerBindings[suffix]={path,fileSha256:sha(path)};}
 if(ledgerBindings.result&&read(ledgerBindings.result.path).accepted!==b.accepted)local.push('Ledger outcome mismatch');
 if(!p||p.rawFullBoardStates!==p.discoveredStates||p.rawExploredStates!==p.exploredStates||p.rawFullBoardStates>10000||p.rawExploredStates>10000||p.attemptedTransitions>10000000||p.microDiscoveredStates>3000000)local.push('Raw/action/micro budget mismatch');
 maxRaw=Math.max(maxRaw,p?.rawFullBoardStates??0);maxExpanded=Math.max(maxExpanded,p?.rawExploredStates??0);maxTransitions=Math.max(maxTransitions,p?.attemptedTransitions??0);maxMicro=Math.max(maxMicro,p?.microDiscoveredStates??0);maxMilliseconds=Math.max(maxMilliseconds,p?.elapsedMilliseconds??0);
 const staticAudit=inspectHardRegionStatic(b.level,runtime.LEVELS.find(l=>l.id===b.sourceLevelId),runtime);if(!staticAudit.valid)local.push('Fresh source/native/coverage audit failed');
 let nearest=null,similarity=0;for(const selectedRow of selected){const v=similarityBoth(b.level,selectedRow.level);if(v>similarity){similarity=v;nearest=selectedRow.path;}}
 const latestSelectionPass=similarity<=.65;let replay=null;
 if(b.accepted){const a=runtime.replayRevisedRoute(b.level,b.drags),c=independentReplay(runtime,b.level,b.drags,{});replay={canonical:a,independent:c};
  if(!a.valid||!a.complete||!c.valid||!c.complete||c.failed||a.nonClearingDrags!==b.U||c.nonClearingDrags!==b.U||b.L<[0,16,21,31][b.difficulty]||b.U<b.L||(b.difficulty===1&&b.U>20)||(b.difficulty===2&&b.U>30))local.push('Accepted candidate actual complete L/U mismatch');
  rootSuccesses.set(ref.rootIndependentSeed,(rootSuccesses.get(ref.rootIndependentSeed)??0)+1);
 }else priorFailed.set(b.sourceLevelId,{id:b.attempt.id,fingerprints:f});
 sourceCounts.set(b.sourceLevelId,(sourceCounts.get(b.sourceLevelId)??0)+1);
 for(const issue of local)issues.push({path:row.path,issue});
 const rootGate=rootEligibility.get(ref.rootIndependentSeed),eligible=b.accepted&&latestSelectionPass&&rootGate.pass&&!local.length;
 if(eligible)records.push({path:row.path,fileSha256:sha(row.path),sourceLevelId:b.sourceLevelId,difficulty:b.difficulty,L:b.L,U:b.U,rootIndependentSeed:ref.rootIndependentSeed});
 rows.push({path:row.path,fileSha256:sha(row.path),acceptedByOriginalSearch:b.accepted,eligibleAfterLatestSelection:eligible,L:b.L,U:b.U,rootGate,latestSelectionPass,similarity,nearest,ledgerBindings,staticAudit,replay,issues:local});
}
if([...sourceCounts.values()].some(n=>n>8)||report.rows.length>160)issues.push('Finite source/global search quota exceeded');
if([...rootSuccesses.values()].some(n=>n>1))issues.push('More than one success from a root');
const audit={status:issues.length?'AUDIT_FAILED':'AUDIT_PASS_WITH_LATEST_SELECTION_FILTER',formalReady:false,scope:'Read-only same objects, no searches, no edits to original evidence',comparisonPolicy:'Maximum of both compareLayouts argument orders; cross-size origin-anchored symmetry transforms can otherwise produce asymmetric ratios.',
 originalReport:{path:`${directory}/report.json`,fileSha256:sha(`${directory}/report.json`)},originalSelection:refs.selectionFile,
 latestSelection:{path:selectedIndex,fileSha256:sha(selectedIndex),count:selected.length,bindings:selected.map(({level,...r})=>r)},
 currentProofToolchainSha256:runtime.toolchainSha256,searches:report.rows.length,originalAccepted:report.accepted.length,eligible:records.length,
 limits:{raw:10000,expanded:10000,actions:10000000,micro:3000000,milliseconds:30000},maxima:{maxRaw,maxExpanded,maxTransitions,maxMicro,maxMilliseconds},
 rootEligibility:Object.fromEntries(rootEligibility),scopeRejectedSearches:rows.filter(r=>!r.rootGate.pass).length,
 scopeCorrection:'Original v1 reference scanner applied proximity to the failed descendant only. This independent audit additionally checks the original whole-board root; out-of-scope roots are rejected without changing their original search or ledger outcomes.',
 sourceCounts:Object.fromEntries(sourceCounts),rootSuccesses:Object.fromEntries(rootSuccesses),issues,rows};
fs.writeFileSync(`${directory}/audit-${artifactTag}.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${directory}/eligible-${artifactTag}-index.json`,JSON.stringify({status:issues.length?'AUDIT_FAILED':'EXPLORATORY_PENDING_V3_CONTRACT',formalReady:false,auditFile:`${directory}/audit-${artifactTag}.json`,auditFileSha256:sha(`${directory}/audit-${artifactTag}.json`),records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:audit.status,searches:audit.searches,originalAccepted:audit.originalAccepted,eligible:records.length,maxima:audit.maxima,issues,records}));
