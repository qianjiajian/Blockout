import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {compareLayouts} from './diversity.mjs';
import {geometricDirectionAudit,firstClearAudit} from './mechanism-axial-ice-pilot.mjs';
import {inspectHardRegionStatic} from './design-hard-region-pool.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

// Independent read-only checks. No solver primitive or ledger mutation.
const root='deliverables/daily-formal-v3-20261008';
const [directory=`${root}/mechanisms/axial-ice-native-01`,selectionFile=`${root}/selection/nearband21-selected/index.json`]=process.argv.slice(2);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,fileSha256:sha(p)});
const report=read(`${directory}/report.json`),scope=read(`${directory}/scope.json`),selected=read(selectionFile).files.map(p=>({...bind(p),level:read(p).level}));
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,scope.proofToolchainSha256);assert.equal(report.status,'FINITE_PILOT_COMPLETE');assert(report.rows.length<=8);
const rows=[];for(const r of report.rows){
 if(!r.attemptId){rows.push({...r,audited:false,reason:'never-searched'});continue;}
 const packet=read(r.path),issues=[],check=(value,message)=>{if(!value)issues.push(message);},p=packet.proof,source=runtime.LEVELS.find(l=>l.id===r.sourceLevelId);
 check(sha(r.path)===r.fileSha256,'candidate-file-sha');check(levelSha256(packet.level)===packet.levelSha256&&r.levelSha256===packet.levelSha256,'full-object-sha');
 check(designFingerprints(packet.level).designSha256===r.attemptId,'public-attempt-physical-identity');
 const ledger=['request','result','blocked'].map(s=>bind(`${root}/proof/attempts/${r.attemptId}.${s}.json`)),request=read(ledger[0].path),result=read(ledger[1].path),blocked=read(ledger[2].path);
 check(request.levelSha256===packet.levelSha256&&request.redesignOf===null,'new-global-first-input-claim');check(result.levelSha256===packet.levelSha256&&!result.accepted&&blocked.attemptId===r.attemptId,'failed-ledger-bound');
 // The public result stores status/hash only; full proof is in the separately
 // SHA-bound candidate packet, not an invented ledger field.
 check(p.sourceLevelSha256===packet.levelSha256&&p.iceProofSha256===runtime.iceProofSha256&&levelSha256(p.iceBindings)===levelSha256(runtime.iceBindings),'full-proof-input-and-frozen-tool-binding');
 check(r.proof.rawFullBoardStates===p.rawFullBoardStates&&r.proof.rawExploredStates===p.rawExploredStates&&r.proof.actions===p.attemptedTransitions,'report-bound-proof-counts');
 check(p.rawFullBoardStates===p.discoveredStates&&p.rawFullBoardStates<=10000&&p.rawExploredStates===p.exploredStates&&p.rawExploredStates<=10000,'raw-state-cap');
 check(p.attemptedTransitions<=10000000&&p.microDiscoveredStates<=3000000&&p.elapsedMilliseconds<=30000,'finite-secondary-budgets');
 check(!packet.drags&&!packet.accepted&&!packet.earlyParking.actualSevenClearPathVerified,'no-witness-not-accepted');
 const staticAudit=inspectHardRegionStatic(packet.level,source,runtime),geometry=geometricDirectionAudit(packet.level,packet.provenance.geometry.axis),opening=firstClearAudit(runtime,packet.level,packet.provenance.axisPaint.knownOpening);
 check(staticAudit.valid&&geometry.pass&&opening.pass,'fresh-static-native-opening');
 let max=0,nearest=null;for(const s of selected){const v=compareLayouts(packet.level,s.level).footprintSimilarity;if(v>max){max=v;nearest=s.path;}}
 check(max<=.65,'latest148-symmetric-proximity');
 const exhausted=p.routeTermination==='search-upper-exhausted'&&p.certifiedFloor<packet.searchUpper;
 rows.push({...bind(r.path),sourceLevelId:r.sourceLevelId,levelSha256:packet.levelSha256,attemptId:r.attemptId,ledger,passed:issues.length===0,issues,
  latestSelection:{maximum:max,nearest,limit:.65},staticAudit,geometry,opening,
  ordinaryEventInventory:packet.provenance.eventInventory.initialUnconstrainedBodies,actualSevenClearPathVerified:false,
  diagnosis:exhausted?'OPTIONAL_ICE_REACHABLE_GRAPH_EXHAUSTED_WITHOUT_COMPLETION':p.termination==='max-raw-board-states'?'RAW_10000_UNKNOWN':'OTHER_UNKNOWN',
  diagnosisScope:'Inferred from this single qualified search termination and certifiedFloor < finite window. No second search; no complete actual path or D3 certificate.',
  ledgerScope:'Public result binds status and full-object hash; full search evidence is the independently SHA-bound immutable candidate packet.',
  proof:{rawFullBoardStates:p.rawFullBoardStates,rawExploredStates:p.rawExploredStates,actions:p.attemptedTransitions,micro:p.microDiscoveredStates,elapsedMilliseconds:p.elapsedMilliseconds,certifiedFloor:p.certifiedFloor,termination:p.termination,routeTermination:p.routeTermination}});
}
const legacyPath=`${root}/mechanisms/early-ice-01/report.json`,legacy=read(legacyPath),prior=legacy.rows.filter(r=>r.proof),tests='tools/daily-challenge/formal-v3/mechanism-axial-ice-pilot.test.mjs';
const output={status:rows.every(r=>r.passed)?'READ_ONLY_FAILED_INPUT_AND_LATEST148_AUDIT_PASS':'AUDIT_FAILED',formalReady:false,acceptedCandidates:0,
 replacesAuditAssumption:{prior:bind(`${directory}/audit-latest148.json`),reason:'v1 incorrectly expected full proof in compact public ledger result. v2 checks the actual status/hash summary plus the independently bound full candidate proof. Original v1 and all failed inputs remain unchanged.'},
 scope:bind(`${directory}/scope.json`),originalReport:bind(`${directory}/report.json`),selection:{...bind(selectionFile),count:selected.length},selectedBindings:selected.map(({level,...r})=>r),
 tools:[bind('tools/daily-challenge/formal-v3/mechanism-axial-ice-audit.mjs'),bind('tools/daily-challenge/formal-v3/mechanism-axial-ice-pilot.mjs'),bind(tests),bind('tools/daily-challenge/formal-v3/diversity.mjs')],
 proofToolchainSha256:runtime.toolchainSha256,searchesDuringThisAudit:0,ledgerWritesDuringThisAudit:0,
 previousPilot:{...bind(legacyPath),searched:prior.length,reasons:prior.reduce((m,r)=>(m[r.proof.termination]=(m[r.proof.termination]??0)+1,m),{})},
 findings:{newInputs:rows.length,distinctNormalMasks:new Set(rows.map(r=>{const b=read(r.path).level;return `${b.width}x${b.height}`;})).size,
  rawBudgetUnknown:rows.filter(r=>r.diagnosis==='RAW_10000_UNKNOWN').length,exhaustedGraphs:rows.filter(r=>r.diagnosis==='OPTIONAL_ICE_REACHABLE_GRAPH_EXHAUSTED_WITHOUT_COMPLETION').length,
  actualSevenClearPaths:0,sourceStockReuse:false,allFirstClearsActual:rows.every(r=>r.opening?.pass),axisMechanicAdded:false,
  conclusion:'Four 7/8/9/10 frozen exits plus orthogonal geometric bar restrictions did not yield a complete witness in this finite pilot. First-clear mobility and >=7 ordinary inventory are insufficient to establish a spatially executable thaw chain. Do not expand the same random parameters or retry these stocks.'},
 nextDesignProposal:{implemented:false,searches:0,strategy:'Fresh inventory reverse construction with a prescribed seven-clear ordinary-event prefix and interleaved parking of frozen-colour bars. Fix four gate counts before the first search, derive every prefix action from an actually replayable authored route, and only then submit the immutable opening once to the existing exact-ice L31 checker. Prefix existence must be constructed, not inferred from count capacity; any construction search shares one raw-state meter. Keep normal masks, native material, full cover and the same diversity gates.',doesNotAuthorizeRetryOfEightFailedStocks:true},rows};
const out=`${directory}/audit-latest148-v2.json`;fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:out,sha256:sha(out),status:output.status,findings:output.findings}));
