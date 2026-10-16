import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {compareLayouts,DIVERSITY_POLICY} from './diversity.mjs';
import {inspectHardRegionStatic} from './design-hard-region-pool.mjs';

// This module performs no proof task, route search, ledger write, or mutation.
const daily='deliverables/daily-formal-v3-20261008',league='deliverables/league-v2-20261008';
const [selectionFile=`${daily}/selection/multistep01-selected/index.json`,out=`${daily}/design/high-route-roots-survey-01`]=process.argv.slice(2);
if(fs.existsSync(out))throw Error('Never overwrite a prior survey');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const binding=p=>({path:p,fileSha256:sha(p)}),binds=new Map(),bind=p=>{const b=binding(p);binds.set(p,b);return b;};
const errors=[],lineage=createReferenceLineageReader({onError:e=>errors.push(e)}),successes=new Map(),acceptedRoots=new Set(),unknownSuccesses=[],highPackets=[];
let scannedJson=0,levelPackets=0;
function walk(dir,fn){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=`${dir}/${e.name}`;if(e.isDirectory()){if(!['identities','archive'].includes(e.name))walk(p,fn);}else if(e.name.endsWith('.json'))fn(p,e.name);
}}
const routeOf=b=>b.drags??b.proof?.drags??b.proof?.lower?.drags??b.lowerBound?.result?.drags;
const canonicalOf=b=>b.replay??b.route?.canonicalReplay??b.proof?.route?.canonicalReplay;
const hintOf=b=>b.U??canonicalOf(b)?.nonClearingDrags??b.proof?.U??b.proof?.cost??b.proof?.lower?.cost??b.lowerBound?.result?.cost;
function addSuccess(p,b){const key=levelSha256(b.level);if(!successes.has(key))successes.set(key,{...bind(p),level:b.level,levelSha256:key});
 const a=lineage.inspect(p);for(const root of a.roots)acceptedRoots.add(root);if(a.unknownReasons.length)unknownSuccesses.push({path:p,...a,ids:b.level.blocks.map(x=>x.id)});
}
for(const base of [daily,league])for(const section of ['design','mechanisms','proof','selection'])walk(`${base}/${section}`,(p,n)=>{
 if(n.endsWith('.request.json')||n.endsWith('.blocked.json')||n.startsWith('audit')||['report.json','all-pairs.json','references.json','references-qualified-v32.json','index.json'].includes(n))return;
 scannedJson++;let b;try{b=read(p);}catch(error){errors.push({path:p,error:error.message});return;}
 if(!b.level?.blocks)return;levelPackets++;
 if(b.accepted===true||b.proof?.accepted===true){addSuccess(p,b);return;}
 const drags=routeOf(b),hint=hintOf(b);if(!Array.isArray(drags)||!Number.isFinite(hint)||hint<21)return;
 highPackets.push({path:p,packet:b,drags,hint,levelSha256:levelSha256(b.level)});
});
const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!=='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804'||DIVERSITY_POLICY.version!=='daily-diversity-v3.2')throw Error('Unexpected frozen proof or design comparator');
const selected=read(selectionFile).files.map(p=>({...bind(p),level:read(p).level}));bind(selectionFile);
const oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldIndex).entries.map(e=>({path:e.path,level:read(e.path).level}));bind(oldIndex);
const reservedRoots=new Set(),reservationFiles=[];
for(const file of [`${daily}/design/shared-independent-08-11-selected-20/report.json`,...[1,2,3].map(i=>`${daily}/design/nearband-multistep-0${i}/references.json`)]){
 if(!fs.existsSync(file))continue;reservationFiles.push(bind(file));const r=read(file);
 for(const row of r.chosen??r.selected??[]){if(row.rootIndependentSeed)reservedRoots.add(row.rootIndependentSeed);else for(const root of lineage.inspect(row.path).roots)reservedRoots.add(root);}
}
const visual=[],visualIds=new Set(),visualFamilies=[];
const addVisual=p=>{const b=read(p);if(!b.level)return;visual.push({...bind(p),level:b.level});for(const body of b.level.blocks)visualIds.add(body.id);};
for(const file of [`${daily}/proof/visual-family-audit-next18-v1.json`,`${daily}/proof/visual-family-audit-nearest122-v1.json`]){
 const r=read(file);bind(file);for(const row of r.records??[])if(row.recommendation==='EXCLUDE_FOR_VISUAL_FAMILY_REPETITION')addVisual(row.receipt.path);
 for(const f of r.families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)visualFamilies.push({...f,review:file});
}
const source2Review=`${daily}/design/reverse-source2-pair-01/visual-review.json`;if(fs.existsSync(source2Review)){bind(source2Review);addVisual(read(source2Review).candidate);}
const preselection=`${daily}/proof/preselection-visual-exclusions.json`;if(fs.existsSync(preselection)){bind(preselection);for(const r of read(preselection).records??[]){bind(r.reviewFile);addVisual(read(r.reviewFile).candidate.path);}}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gateKey=g=>JSON.stringify(g.map(({side,offset,size,color})=>({side,offset,size,color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
function nearest(level,records,limit){let maximum=0,path=null;for(const e of records){const v=compareLayouts(e.level,level).footprintSimilarity;if(v>maximum){maximum=v;path=e.path;}}return{pass:maximum<=limit,maximum,limit,path};}
function allComparisons(level){return{selected:nearest(level,selected,.65),successful:nearest(level,[...successes.values()],.65),visual:nearest(level,visual,.65),old450:nearest(level,old,.75)};}
const replayCache=new Map(),rows=[];
for(const h of highPackets){
 const b=h.packet,reasons=[],a=lineage.inspect(h.path);bind(h.path);
 const routeHash=levelSha256({level:h.levelSha256,drags:h.drags,timeSchedule:b.timeSchedule??null});let replay=replayCache.get(routeHash);
 if(!replay){try{const canonical=runtime.replayRevisedRoute(b.level,h.drags),independent=independentReplay(runtime,b.level,h.drags,{timeSchedule:b.timeSchedule});
  replay={canonical,independent,valid:canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed&&canonical.nonClearingDrags===independent.nonClearingDrags,U:canonical.nonClearingDrags};
 }catch(error){replay={valid:false,error:error.message};}replayCache.set(routeHash,replay);}
 if(!replay.valid)reasons.push('COMPLETE_ACTUAL_DOUBLE_REPLAY_FAILED');else if(replay.U<21)reasons.push('ACTUAL_U_BELOW_21');
 if(a.roots.length!==1||a.unknownReasons.length)reasons.push('INDEPENDENT_WHOLEBOARD_ANCESTRY_UNKNOWN');
 if(a.roots.some(p=>acceptedRoots.has(p)))reasons.push('ROOT_HAS_ACCEPTED_OBJECT_OR_DESCENDANT');
 if(a.roots.some(p=>reservedRoots.has(p)))reasons.push('ROOT_RESERVED_PRIOR_BATCH_OR_PARALLEL_LOW_U');
 if(successes.has(h.levelSha256))reasons.push('SAME_ACTUAL_OBJECT_ALREADY_ACCEPTED');
 if(b.level.blocks.some(x=>visualIds.has(x.id)))reasons.push('VISUALLY_REJECTED_ENTITY_LINEAGE');
 const anchors=new Set(b.level.blocks.map(anchor)),gates=gateKey([...(b.level.gates??[]),...(b.level.flipDoors??[])]);
 if(visualFamilies.some(f=>gateKey(f.gateTopologyAndColourEvidence.canonicalTopology)===gates&&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(x=>anchors.has(anchor(x)))))reasons.push('VISUALLY_REJECTED_ANCHOR_AND_GATE_FAMILY');
 const ids=new Set(b.level.blocks.map(x=>x.id)),unknownOverlaps=unknownSuccesses.filter(x=>x.ids.some(id=>ids.has(id))).map(({ids,...x})=>x);
 if(unknownOverlaps.length)reasons.push('UNRESOLVED_SUCCESS_ANCESTRY_SHARES_BODY_IDENTITIES');
 let plain=true;try{assertPlainProofDomain(b.level,runtime);}catch{plain=false;reasons.push('NOT_SUPPORTED_BY_PLAIN_REFINEMENT_WRAPPER');}
 const source=runtime.LEVELS.find(x=>x.id===b.sourceLevelId),staticAudit=source?inspectHardRegionStatic(b.level,source,runtime):{valid:false,reasons:['source-not-found']};if(!staticAudit.valid)reasons.push('SOURCE_NATIVE_FULL_COVER_STATIC_FAILURE');
 const comparisons=allComparisons(b.level);if(Object.values(comparisons).some(x=>!x.pass))reasons.push('REFERENCE_SYMMETRIC_PROXIMITY_REJECTION');
 let rootComparisons=null;if(a.roots.length===1&&!a.unknownReasons.length){rootComparisons=allComparisons(read(a.roots[0]).level);if(Object.values(rootComparisons).some(x=>!x.pass))reasons.push('ROOT_SYMMETRIC_PROXIMITY_REJECTION');bind(a.roots[0]);}
 const attemptId=b.attempt?.id??b.proof?.attempt?.id,blocked=attemptId&&`${daily}/proof/attempts/${attemptId}.blocked.json`;
 if(!attemptId||!fs.existsSync(blocked))reasons.push('NO_BOUND_PUBLIC_FAILED_ATTEMPT');else bind(blocked);
 rows.push({...binding(h.path),sourceLevelId:b.sourceLevelId,levelSha256:h.levelSha256,claimedUpper:h.hint,U:replay.valid?replay.U:null,acceptedBefore:false,statusBefore:b.status,
  ancestry:a,plain,staticAudit,comparisons,rootComparisons,attemptId,publicBlocked:blocked&&fs.existsSync(blocked)?binding(blocked):null,unknownOverlaps,
  reasons:[...new Set(reasons)],freshDoubleReplay:replay,fullBoardSearchInvocations:0});
}
function census(list){return{packets:list.length,actualObjects:new Set(list.map(r=>r.levelSha256)).size,
 resolvedIndependentRoots:new Set(list.flatMap(r=>r.ancestry.unknownReasons.length?[]:r.ancestry.roots)).size,sources:new Set(list.map(r=>r.sourceLevelId)).size,sourceIds:[...new Set(list.map(r=>r.sourceLevelId))].sort((a,b)=>a-b)};}
const complete=rows.filter(r=>r.freshDoubleReplay.valid&&r.U>=21),noAccepted=complete.filter(r=>!r.reasons.includes('ROOT_HAS_ACCEPTED_OBJECT_OR_DESCENDANT')&&!r.reasons.includes('SAME_ACTUAL_OBJECT_ALREADY_ACCEPTED')&&!r.reasons.includes('INDEPENDENT_WHOLEBOARD_ANCESTRY_UNKNOWN'));
const eligible=rows.filter(r=>!r.reasons.length),proposal=[],rootsUsed=new Set(),sourcesUsed=new Set();
for(const r of eligible.sort((a,b)=>b.U-a.U||a.sourceLevelId-b.sourceLevelId)){if(proposal.length>=20)break;const root=r.ancestry.roots[0];if(rootsUsed.has(root)||sourcesUsed.has(r.sourceLevelId))continue;proposal.push(r.path);rootsUsed.add(root);sourcesUsed.add(r.sourceLevelId);}
const bandCounts=list=>({U21to30:census(list.filter(r=>r.U>=21&&r.U<=30)),U31plus:census(list.filter(r=>r.U>=31))});
const report={status:proposal.length>=20?'READ_ONLY_HIGH_ROUTE_20_ROOTS_PROPOSED':'INSUFFICIENT_INDEPENDENT_HIGH_ROUTE_ROOTS_NO_SEARCH',formalReady:false,
 scope:'Immutable daily and league design/mechanisms/proof/selection packets; nested legacy proof routes inspected, canonical and independent route replay only. No old input search or ledger mutation.',
 scannedJson,levelPackets,highRouteHintPackets:highPackets.length,freshRouteReplays:replayCache.size,currentSelection:{...binding(selectionFile),count:selected.length},
 designPolicy:DIVERSITY_POLICY,comparisonTool:binding('tools/daily-challenge/formal-v3/diversity.mjs'),tool:binding('tools/daily-challenge/formal-v3/inspect-high-route-roots.mjs'),proofToolchainSha256:runtime.toolchainSha256,
 successfulComparisonObjects:successes.size,acceptedRootCount:acceptedRoots.size,unknownSuccessfulLineages:unknownSuccesses.map(({ids,...r})=>r),reservationFiles,
 completeRouteCensus:bandCounts(complete),resolvedNeverSuccessfulRootCensus:bandCounts(noAccepted),fullyEligibleCensus:bandCounts(eligible),proposal,
 requiredToStart:20,newSearchInvocations:0,ledgerWrites:0,inputBindings:[...binds.values()],parseErrors:errors,rows};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${out}/index.json`,JSON.stringify({status:report.status,formalReady:false,referenceReport:binding(`${out}/report.json`),files:proposal,newSearchInvocations:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,scannedJson,highRouteHintPackets:highPackets.length,completeRouteCensus:report.completeRouteCensus,resolvedNeverSuccessfulRootCensus:report.resolvedNeverSuccessfulRootCensus,fullyEligibleCensus:report.fullyEligibleCensus,proposal}));
