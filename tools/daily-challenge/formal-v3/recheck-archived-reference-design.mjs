import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {compareLayouts,DIVERSITY_POLICY} from './diversity.mjs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';

// Inspection of immutable archived references only. No proof task or ledger API.
const [seedIndexPath,selectionPath,output]=process.argv.slice(2);
assert(seedIndexPath&&selectionPath&&output&&!fs.existsSync(output),'Supply seed index, current selection and unused output directory');
const daily='deliverables/daily-formal-v3-20261008',league='deliverables/league-v2-20261008';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const binding=p=>({path:p,sha256:sha(p)}),inputs=new Map(),errors=[],comparisons=new Map(),acceptedRoots=new Set(),unknownLineages=[];
const bind=p=>{const r=binding(p);inputs.set(p,r);return r;};
const lineage=createReferenceLineageReader({onError:e=>errors.push(e)});
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
assert.equal(DIVERSITY_POLICY.version,'daily-diversity-v3.2');
const seeds=read(seedIndexPath),selection=read(selectionPath);bind(seedIndexPath);bind(selectionPath);
assert.deepEqual(seeds.referenceCostRange,[8,11]);
const add=(file,record,category)=>{
 if(!record?.level)return;
 const levelHash=levelSha256(record.level);
 if(record.levelSha256&&record.levelSha256!==levelHash){errors.push({path:file,reason:'success-object-hash-mismatch'});throw Error('Malformed successful input: '+file);}
 const b=bind(file),key=levelHash,group=comparisons.get(key)??{level:record.level,levelSha256:levelHash,bindings:[]};
 if(!group.bindings.some(x=>x.path===file))group.bindings.push({...b,category});comparisons.set(key,group);
 if(record.accepted===true||record.proof?.accepted===true){const r=lineage.inspect(file);for(const root of r.roots)acceptedRoots.add(root);
  if(r.unknownReasons.length)unknownLineages.push({path:file,...r});}
};
for(const file of selection.files)add(file,read(file),'current-daily-134');
const leagueIndex=`${league}/selection/render-current-100/selection.json`;bind(leagueIndex);
for(const row of read(leagueIndex).selections)add(row.proofFile,read(row.proofFile),'formal-league-100');
function walk(dir,fn){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=`${dir}/${e.name}`;if(e.isDirectory()){if(e.name!=='identities'&&e.name!=='archive')walk(p,fn);}else if(e.name.endsWith('.json'))fn(p,e.name);
}}
function scanSuccess(){
 for(const base of [daily,league])for(const section of ['design','proof','selection'])walk(`${base}/${section}`,(p,n)=>{
  if(n.endsWith('.request.json')||n.endsWith('.blocked.json')||n==='report.json'||n==='all-pairs.json'||n==='audit.json')return;
  let c;try{c=read(p);}catch(error){errors.push({path:p,reason:'incomplete-json-skipped',error:error.message});return;}
  if((c.accepted===true||c.proof?.accepted===true)&&c.level)add(p,c,'successful-pool');
 });
}
scanSuccess();
const visualIds=new Set(),visualFamilies=[],visualBindings=[];
for(const file of [`${daily}/proof/visual-family-audit-next18-v1.json`,`${daily}/proof/visual-family-audit-nearest122-v1.json`]){
 const review=read(file);visualBindings.push(bind(file));
 for(const r of review.records.filter(r=>r.recommendation==='EXCLUDE_FOR_VISUAL_FAMILY_REPETITION')){
  assert.equal(sha(r.receipt.path),r.receipt.sha256);const c=read(r.receipt.path);add(r.receipt.path,c,'visually-rejected-family');
  for(const b of c.level.blocks)visualIds.add(b.id);
 }
 for(const f of review.families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)visualFamilies.push({...f,review:file});
}
const source2Review=`${daily}/design/reverse-source2-pair-01/visual-review.json`;
const source2=read(source2Review);visualBindings.push(bind(source2Review));assert.equal(source2.viewedActualCanvasPair,true);assert.equal(sha(source2.actualPairImage),source2.pairSha256);bind(source2.actualPairImage);
const source2Candidate=read(source2.candidate);add(source2.candidate,source2Candidate,'preselection-visual-rejected');
for(const b of source2Candidate.level.blocks)visualIds.add(b.id);
const preselection=`${daily}/proof/preselection-visual-exclusions.json`;
if(fs.existsSync(preselection)){bind(preselection);for(const row of read(preselection).records){assert.equal(sha(row.reviewFile),row.reviewSha256);const review=read(row.reviewFile);bind(row.reviewFile);
 assert.equal(sha(review.candidate.path),review.candidate.sha256);add(review.candidate.path,read(review.candidate.path),'preselection-visual-rejected');}}
const reserved=new Set(),reservedBindings=[];
for(const label of ['nearband-multistep-01','nearband-multistep-02','nearband-multistep-03']){
 const file=`${daily}/design/${label}/references.json`;if(!fs.existsSync(file))continue;reservedBindings.push(bind(file));
 for(const r of read(file).chosen)reserved.add(r.rootIndependentSeed);
}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gateKey=gates=>JSON.stringify(gates.map(({side,offset,size,color})=>({side,offset,size,color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const sameMask=(a,b)=>a.width===b.width&&a.height===b.height&&JSON.stringify(boardCells(a).map(p=>p.join(',')).sort())===JSON.stringify(boardCells(b).map(p=>p.join(',')).sort());
const rows=[];
for(const file of seeds.files){
 const seed=read(file),reasons=[],original=seed.sourceLedger.snapshots.candidate.original;bind(file);
 assert.equal(seed.accepted,false);assert.equal(seed.L,null);assert(seed.U>=8&&seed.U<=11);assert.equal(seed.levelSha256,levelSha256(seed.level));assert.equal(seed.routeSha256,routeSha256(seed.drags));
 for(const record of Object.values(seed.sourceLedger.snapshots))for(const b of [record.original,record.archive]){assert.equal(sha(b.path),b.sha256);bind(b.path);}
 for(const key of ['publicRequest','publicResult','publicIdentity','publicBlocked']){const b=seed.sourceLedger[key];assert.equal(sha(b.path),b.sha256);bind(b.path);}
 const ancestry=lineage.inspect(original.path);assert(ancestry.directWholeBoard&&ancestry.roots.length===1&&!ancestry.unknownReasons.length);
 if(ancestry.roots.some(p=>acceptedRoots.has(p)))reasons.push('root-now-has-accepted-descendant');
 if(ancestry.roots.some(p=>reserved.has(p)))reasons.push('parallel-reserved-root');
 if(seed.level.blocks.some(b=>visualIds.has(b.id)))reasons.push('visually-rejected-entity-lineage');
 const anchors=new Set(seed.level.blocks.map(anchor)),gates=gateKey([...(seed.level.gates??[]),...(seed.level.flipDoors??[])]);
 const family=visualFamilies.find(f=>gateKey(f.gateTopologyAndColourEvidence.canonicalTopology)===gates&&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(anchor(b))));
 if(family)reasons.push('visually-rejected-anchor-and-gate-family');
 const source=runtime.LEVELS.find(x=>x.id===seed.sourceLevelId);assert.equal(seed.sourceLevelSha256,levelSha256(source));assert(sameMask(seed.level,source));
 assert.equal(inventorySummary(seed.level,runtime).nonNativeOrMissingArtIds.length,0);
 const canonical=runtime.replayRevisedRoute(seed.level,seed.drags),independent=independentReplay(runtime,seed.level,seed.drags);
 for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===seed.U);
 rows.push({file,...binding(file),original,sourceLevelId:seed.sourceLevelId,levelSha256:seed.levelSha256,routeSha256:seed.routeSha256,
  U:seed.U,L:null,accepted:false,redesignParentId:seed.redesignParentId,ancestry,reasons,normalSourceMask:true,nativeArtValidated:true,canonicalReplay:canonical,independentReplay:independent,level:seed.level});
}
// Include successes completed while reading/replaying; incomplete JSON never counts as acceptance.
scanSuccess();
const snapshotAt=new Date().toISOString();
for(const row of rows){
 let nearest=null;for(const c of comparisons.values()){const match=compareLayouts(row.level,c.level);if(!nearest||match.footprintSimilarity>nearest.footprintSimilarity)nearest={levelSha256:c.levelSha256,bindings:c.bindings,...match};}
 row.nearest=nearest;if(nearest.footprintSimilarity>.65+1e-12)row.reasons.push('symmetric-near-success-over-0.65');
 if(row.ancestry.roots.some(p=>acceptedRoots.has(p))&&!row.reasons.includes('root-now-has-accepted-descendant'))row.reasons.push('root-now-has-accepted-descendant');
 const ids=new Set(row.level.blocks.map(b=>b.id));
 const unknownOverlap=unknownLineages.filter(x=>{const c=read(x.path);return c.level?.blocks?.some(b=>ids.has(b.id));});
 if(unknownOverlap.length){row.reasons.push('unresolved-success-lineage-with-shared-body-identities');row.unknownOverlaps=unknownOverlap;}
}
const usable=[],usedSources=new Set();
for(const row of rows){
 if(row.reasons.length)continue;
 if(usedSources.has(row.sourceLevelId)){row.reasons.push('duplicate-source');continue;}
 const conflict=usable.find(r=>compareLayouts(r.level,row.level).footprintSimilarity>.65+1e-12);
 if(conflict){row.reasons.push('near-another-reference');continue;}usable.push(row);usedSources.add(row.sourceLevelId);
}
for(const b of inputs.values())assert.equal(sha(b.path),b.sha256,'Input changed during inspection: '+b.path);
const report={schemaVersion:1,status:'ARCHIVED_REFERENCE_DESIGN_RECHECK_ONLY',createdAt:snapshotAt,policy:DIVERSITY_POLICY,
 originalCount:rows.length,usableCount:usable.length,referenceCostRange:[8,11],maximumFootprintSimilarity:.65,currentSelected:selection.files.length,
 successfulComparisonObjects:comparisons.size,acceptedRootCount:acceptedRoots.size,reservedRootCount:reserved.size,
 referenceIndex:binding(seedIndexPath),currentSelection:binding(selectionPath),tool:binding('tools/daily-challenge/formal-v3/recheck-archived-reference-design.mjs'),
 comparisonTool:binding('tools/daily-challenge/formal-v3/diversity.mjs'),proofToolchainSha256:runtime.toolchainSha256,
 inputBindings:[...inputs.values()],visualBindings,reservedBindings,unknownSuccessfulLineages:unknownLineages,parseErrors:errors,
 rows:rows.map(({level,...r})=>r),usableFiles:usable.map(r=>r.path),
 newSearchInvocations:0,ledgerWrites:0,originalEvidenceChanged:false,formalReady:false,accepted:false,
 limitations:['Reference U remains only a verified original complete upper bound, not a lower bound.',
  'Original failed inputs remain blocked; future inputs must actually change both shape and colour.',
  'Numeric and recorded-family checks are not a new actual screenshot review of redesigned descendants.']};
fs.mkdirSync(output,{recursive:false});
fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${output}/index.json`,JSON.stringify({schemaVersion:3,status:'ARCHIVED_REFERENCES_RECHECKED_UNDER_SYMMETRIC_V32',accepted:false,formalReady:false,
 priorSeedIndex:seedIndexPath,referenceCostRange:[8,11],files:usable.map(r=>r.path),count:usable.length,
 designRecheck:{path:`${output}/report.json`,sha256:sha(`${output}/report.json`)},newSearchInvocations:0,ledgerWrites:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,usable:usable.length,total:rows.length,successObjects:comparisons.size,rejected:rows.filter(r=>r.reasons.length).map(({path,reasons})=>({path,reasons})),parseErrors:errors.length}));
