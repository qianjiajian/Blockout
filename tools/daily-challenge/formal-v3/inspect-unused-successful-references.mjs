import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {compareLayouts,describeLayout} from './diversity.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';

// Read-only survey of external, directly whole-board-created successful inputs.
// No solver, ledger mutation, mechanism decoration or candidate rewrite.
const [output,dailyIndex]=process.argv.slice(2);
assert(output&&dailyIndex,'Usage: inspect-unused-successful-references.mjs NEW_OUTPUT_DIRECTORY DAILY_SELECTION_INDEX');
assert(!fs.existsSync(output),'Preserve previous evidence');
const DAILY='deliverables/daily-formal-v3-20261008',LEAGUE='deliverables/league-v2-20261008';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p,sha256:sha(p)});
const walk=(dir,fn)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())walk(p,fn);else if(e.name.endsWith('.json'))fn(p,e.name);}};
const runtime=await loadBoundedRuntime();
assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const candidates=[],comparisons=[],parseErrors=[],excludedFamilyIds=new Set(),seenComparison=new Set();
const safe=p=>{try{return read(p);}catch(error){parseErrors.push({path:p,error:error.message});return null;}};
const add=(p,c,category)=>{if(!c?.level||seenComparison.has(p))return;seenComparison.add(p);comparisons.push({...bind(p),category,level:c.level,levelSha256:levelSha256(c.level)});};
for(const p of read(dailyIndex).files)add(p,read(p),'current-daily-selection');
const leagueIndex=`${LEAGUE}/selection/render-current-100/selection.json`;
for(const r of read(leagueIndex).selections)add(r.proofFile,read(r.proofFile),'formal-league-100');
const visualPath=`${DAILY}/proof/visual-family-audit-next18-v1.json`;
for(const r of read(visualPath).records.filter(r=>r.recommendation==='EXCLUDE_FOR_VISUAL_FAMILY_REPETITION')){
 const c=read(r.receipt.path);assert.equal(sha(r.receipt.path),r.receipt.sha256);
 for(const b of c.level.blocks)excludedFamilyIds.add(b.id);
 add(r.receipt.path,c,'visually-excluded-family');
}
// All accepted daily design bases are already in use, even before assignment.
// Their foreign origins must not become a second sibling family here.
walk(`${DAILY}/design`,(p,n)=>{if(!/^candidate-.*\.json$/.test(n))return;const c=safe(p);if(c?.accepted||c?.proof?.accepted)add(p,c,'current-daily-accepted-base');});
for(const suffix of ['01','02','03','04']){
 const index=`${DAILY}/design/shared-underband-seeds-${suffix}/index.json`;
 if(fs.existsSync(index))for(const p of read(index).files)add(p,read(p),'previous-underband-reference');
}
walk(`${LEAGUE}/design`,(p,n)=>{
 if(!/^candidate-.*\.json$/.test(n))return;const c=safe(p);if(!c?.level)return;
 const U=c.U??c.proof?.U??c.proof?.cost??c.proof?.lower?.cost??c.replay?.nonClearingDrags;
 if((c.accepted||c.proof?.accepted)&&Number.isSafeInteger(U)&&U>=16&&U<=30)candidates.push({path:p,c,U});
});
const sim=(a,b)=>{const x=compareLayouts(a,b),y=compareLayouts(b,a);return {...(x.footprintSimilarity>=y.footprintSimilarity?x:y),direction:'maximum-of-both-directions'};};
const nearest=(level,pool)=>{let winner=null;for(const r of pool){const s=sim(level,r.level);if(!winner||s.footprintSimilarity>winner.footprintSimilarity)winner={path:r.path,category:r.category,levelSha256:r.levelSha256,...s};}return winner;};
const mask=l=>boardCells(l).map(p=>p.join(',')).sort();
const results=[],eligible=[];let replayCount=0;
for(const{path:p,c,U}of candidates){
 const row={...bind(p),sourceLevelId:c.sourceLevelId,U,levelSha256:levelSha256(c.level),status:'REJECTED_REFERENCE'};
 try{
  const provenance=c.provenance;
  assert(provenance?.partitionSearch&&provenance.colouringSearch&&provenance.sourceTemplateCopied===false&&provenance.sourceBoardExactlyRetained===true&&provenance.sourceShapeMultisetChanged===true,'Not a directly documented whole-board shape-and-color reconstruction');
  row.directWholeBoardConstruction=true;
  assert(!c.level.blocks.some(b=>excludedFamilyIds.has(b.id)),'Visually excluded entity lineage');
  assert.equal(c.levelSha256,row.levelSha256,'Full candidate object binding');
  assertPlainProofDomain(c.level);runtime.validateLevel(c.level);
  const source=runtime.LEVELS.find(l=>l.id===c.sourceLevelId);assert(source,'Current source exists');
  assert.equal(c.sourceLevelSha256,levelSha256(source),'Current source SHA');
  assert.equal(c.level.width,source.width);assert.equal(c.level.height,source.height);assert.deepEqual(mask(c.level),mask(source));
  assert.equal(inventorySummary(c.level,runtime).nonNativeOrMissingArtIds.length,0);
  const drags=c.drags??c.proof?.drags??c.proof?.lower?.drags;assert(Array.isArray(drags));
  row.routeSha256=routeSha256(drags);row.totalDrags=drags.length;row.sourceLevelSha256=c.sourceLevelSha256;
  const historicalPath=c.proof?.proofReceipt;assert(historicalPath,'Bound original proof file required');
  const old=read(historicalPath);assert.equal(old.accepted,true);assert.equal(old.levelSha256,row.levelSha256);assert.equal(levelSha256(old.level),row.levelSha256);
  assert.equal(old.U,U);assert.equal(routeSha256(old.drags),row.routeSha256);
  row.historicalProof=bind(historicalPath);row.historicalL=old.L;row.historicalOnly=true;
  const near=nearest(c.level,comparisons);row.nearestUsedLayout=near;
  assert(!near||near.footprintSimilarity<=.65,'Too near a formal, accepted, visually excluded or already-used reference');
  replayCount++;
  const canonical=runtime.replayRevisedRoute(c.level,drags),independent=independentReplay(runtime,c.level,drags);
  for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,U);}
  row.canonicalReplay=canonical;row.independentReplay=independent;row.normalSourceMaskValidated=true;row.nativeArtValidated=true;
  row.status='UNUSED_SUCCESSFUL_WHOLE_BOARD_REFERENCE_REQUIRES_NEW_SHAPE_AND_COLOR';
  row.partitionSha256=describeLayout(c.level).exactPartitionSha256;row.level=c.level;row.drags=drags;eligible.push(row);
 }catch(error){row.rejection=error.message;}
 results.push(row);
}
// Include newly completed daily candidates without reading partial files as PASS.
const initialComparisonCount=comparisons.length;
walk(`${DAILY}/design`,(p,n)=>{if(!/^candidate-.*\.json$/.test(n))return;const c=safe(p);if(c?.accepted||c?.proof?.accepted)add(p,c,'newly-completed-daily-base');});
for(let i=eligible.length-1;i>=0;i--){const r=eligible[i],near=nearest(r.level,comparisons.slice(initialComparisonCount));if(near&&near.footprintSimilarity>.65){r.status='REJECTED_REFERENCE';r.rejection='Too near newly completed daily base';r.nearestUsedLayout=near;eligible.splice(i,1);}}
eligible.sort((a,b)=>b.U-a.U||(a.nearestUsedLayout?.footprintSimilarity??0)-(b.nearestUsedLayout?.footprintSimilarity??0));
const selected=[],usedSources=new Set();for(const r of eligible){if(usedSources.has(r.sourceLevelId))continue;const near=nearest(r.level,selected);if(near&&near.footprintSimilarity>.65)continue;selected.push(r);usedSources.add(r.sourceLevelId);}
const compact=r=>{const{level,drags,...rest}=r;return rest;};
const report={schemaVersion:1,status:'READ_ONLY_UNUSED_SUCCESSFUL_REFERENCE_SURVEY',ruleVersion:'1.155.0',createdAt:new Date().toISOString(),
 scope:'External league design U16–30 successes with direct whole-board construction records; current daily accepted bases are exclusion inputs, not fresh reference supply.',
 totalHistoricalSuccessPackets:candidates.length,directWholeBoardPackets:results.filter(r=>r.directWholeBoardConstruction).length,eligiblePackets:eligible.length,distinctSources:usedSources.size,
 dailySelection:bind(dailyIndex),formalLeagueSelection:bind(leagueIndex),visualExclusion:bind(visualPath),script:bind('tools/daily-challenge/formal-v3/inspect-unused-successful-references.mjs'),
 comparisonCount:comparisons.length,comparisonBindings:comparisons.map(({level,...r})=>r),freshReplayCount:replayCount,
 records:results.map(compact),selected:selected.map(compact),parseErrors,newSearchInvocations:0,ledgerWrites:0,newLowerBoundsCertified:0,formalReady:false,
 limitation:'A historical successful L is not a new candidate proof. Any redesign must change actual shapes and colours, claim its own allowed ledger input and satisfy current bounded proof, mechanism, design and Pointer gates.'};
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(`${output}/index.json`,JSON.stringify({schemaVersion:1,accepted:false,formalReady:false,files:selected.map(r=>r.path),count:selected.length,report:bind(`${output}/report.json`),newSearchInvocations:0,ledgerWrites:0},null,2)+'\n');
console.log(JSON.stringify({output,total:candidates.length,directWholeBoard:report.directWholeBoardPackets,eligible:eligible.length,sources:selected.length,replays:replayCount,rejections:results.reduce((a,r)=>(a[r.rejection??'ELIGIBLE']=(a[r.rejection??'ELIGIBLE']??0)+1,a),{}),parseErrors:parseErrors.length}));
