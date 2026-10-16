import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildGlobalCandidate, digest, orbitFootprintArea, bodyFootprint, plainGameplayFingerprint, inventorySummary, boardCells, withDesignGeometry, FACTORY_VERSION } from './design-layout-factory.mjs';
import { loadLeagueProofRuntime, probePlainLeagueLevel } from './proof-contract.mjs';
import { buildRepartitionCandidate } from './design-repartition.mjs';
import { findLateGeneratorSites } from './design-generator-sites.mjs';

const root = 'deliverables/league-v2-20261008/design';
const label = process.env.LEAGUE_DESIGN_LABEL ?? 'global-01';
const out = `${root}/${label}`;
if (fs.existsSync(out)) throw Error('Use a fresh batch label; never erase earlier failures');
const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json'));
if (manifest.activeVersion !== '1.155.0') throw Error('Review changed active rule before running');
const catalog = JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const runtime = await withDesignGeometry(await loadLeagueProofRuntime());
const ids = (process.env.LEAGUE_DESIGN_SOURCES ?? '3,7,9,12,13,14,18,19,31,33,42,50,52,80,82,85,86,96,100,118,122,151,155,163,170,180,187,195,196,197,200').split(',').map(Number);
const rounds = Number(process.env.LEAGUE_DESIGN_ROUNDS ?? 24);
const searchUpper = Number(process.env.LEAGUE_DESIGN_SEARCH_UPPER ?? 30);
if (![20,30].includes(searchUpper)) throw Error('Choose the confirmed hard or super upper bound');
const searchFloor = Number(process.env.LEAGUE_DESIGN_SEARCH_FLOOR ?? 16);
if (![16,21].includes(searchFloor)||searchFloor>searchUpper) throw Error('Choose the confirmed difficulty floor');
const irregular = process.env.LEAGUE_DESIGN_IRREGULAR === '1';
const strategy = process.env.LEAGUE_DESIGN_STRATEGY ?? 'whole-board';
const density = Number(process.env.LEAGUE_DESIGN_AVERAGE_AREA ?? 0);
const paletteSize=Number(process.env.LEAGUE_DESIGN_PALETTE??8),reserveRimSpans=Number(process.env.LEAGUE_DESIGN_RESERVE_RIM??0);
const openingColourBias=process.env.LEAGUE_DESIGN_OPENING_BIAS==='1',requirePalette=process.env.LEAGUE_DESIGN_REQUIRE_PALETTE==='1';
const axisExitBias=process.env.LEAGUE_DESIGN_AXIS_BIAS==='1';
const protectOpening=process.env.LEAGUE_DESIGN_PROTECT_OPENING==='1';
const refinementPaths=(process.env.LEAGUE_DESIGN_REFINEMENT_PATHS??'').split(';').filter(Boolean);
const refinements=refinementPaths.map(path=>({path,packet:JSON.parse(fs.readFileSync(path))}));
if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 1000) throw Error('Finite rounds required');
const rows = [], accepted = [], pool = [], seenGameplay = new Set(), seenPartitions = new Set(), priorBySource = new Map();
const colorSignature = l => digest(Object.entries(l.blocks.reduce((a,b)=>(a[b.color]=(a[b.color]??0)+1,a),{})).sort());
const shapeSignature = l => digest(l.blocks.map(b=>digest([...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0]))).sort());
const walk = d => {
  for (const item of fs.readdirSync(d,{withFileTypes:true})) {
    const p=`${d}/${item.name}`;
    if(item.isDirectory())walk(p);
    else if(/^candidate-.*\.json$/.test(item.name)) {
      const packet=JSON.parse(fs.readFileSync(p));if(!packet.level)continue;
      seenGameplay.add(plainGameplayFingerprint(packet.level));seenPartitions.add(digest(packet.level.blocks.map(bodyFootprint).sort()));
      if(packet.accepted)pool.push(packet.level);
    }
  }
};
walk(root);
fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(`${root}/physical-attempts`,{recursive:true});
const files=['tools/league-v2/design-layout-factory.mjs','tools/league-v2/design-global-pool.mjs','tools/league-v2/design-repartition.mjs','tools/league-v2/proof-contract.mjs'];
const bindings=files.map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')}));
for(const path of files)fs.copyFileSync(path,`${out}/${path.split('/').at(-1)}.snapshot`);
const save=status=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status,ruleVersion:manifest.activeVersion,
  factoryVersion:FACTORY_VERSION,productionChanged:false,formalReady:false,
  exploratoryPolicy:{maxSourceFootprintRatio:.7,maxPoolFootprintRatio:.7,allEightGlobalSymmetries:true,notUserSpecifiedThresholds:true},
  sourceIds:ids,rounds,searchFloor,searchUpper,irregular,strategy,density,paletteSize,reserveRimSpans,openingColourBias,requirePalette,axisExitBias,protectOpening,refinementPaths,rows,accepted,inputBindings:bindings},null,2)+'\n');
for(let round=0;round<rounds;round++)for(const sourceId of ids){
  if(fs.existsSync(`${root}/STOP`)){save('STOPPED_BETWEEN_CANDIDATES');process.exit(0);}
  const actualSource=catalog.rows.find(r=>r.sourceLevelId===sourceId)?.level;
  if(!actualSource)throw Error('Unknown source '+sourceId);
  const availableRefinements=refinements.filter(x=>x.packet.sourceLevelId===sourceId);
  const refinement=availableRefinements[round%Math.max(1,availableRefinements.length)];
  const source=refinement?.packet.level??actualSource;
  const protectedBodyIds=[];
  if(protectOpening&&refinement){let clears=0;const seen=new Set();for(const drag of refinement.packet.drags){if(!seen.has(drag.blockId)){seen.add(drag.blockId);if(clears<=1)protectedBodyIds.push(drag.blockId);}if(drag.exitSide)clears++;}}
  const serial=rows.length,seed=(Math.imul(sourceId+931,8191)+round*16057+[...label].reduce((n,c)=>n+c.charCodeAt(0)*997,0))>>>0;
  const construct=strategy==='large-region'?buildRepartitionCandidate:buildGlobalCandidate;
  const result=construct(source,runtime,{seed,maxNodes:10000,maxTransitions:10000,irregular,paletteSize,reserveRimSpans,openingColourBias,requirePalette,axisExitBias,protectedBodyIds,...(protectOpening?{keepColourProbability:.8}:{}),
    ...(density>0?{bodyCount:Math.max(7,Math.round(boardCells(source).length/density))}:{})});
  if(result.ok&&refinement){result.sourceLevelSha256=digest(actualSource);Object.assign(result.construction,
    {refinementSeedPath:refinement.path,refinementSeedSha256:digest(source),actualTemplateBodyCount:actualSource.blocks.length,
      refinementSeedBodyCount:source.blocks.length,sourceBoardExactlyRetained:true,protectedOpeningBodyIds:protectedBodyIds});}
  const row={serial,sourceId,round,seed,status:'CONSTRUCTION_REJECTED',reason:result.reason??null,
    construction:result.construction??{nodes:result.nodes,transitions:result.transitions,partitionSearch:result.partitionSearch,colouringSearch:result.colouringSearch}};
  rows.push(row);
  if(!result.ok){save('FINITE_GLOBAL_SEARCH_RUNNING');continue;}
  const level=result.level,partition=digest(level.blocks.map(bodyFootprint).sort()),fingerprint=plainGameplayFingerprint(level);
  const previous=priorBySource.get(sourceId),colorKey=colorSignature(level),shapeKey=shapeSignature(level);
  Object.assign(row,{levelSha256:digest(level),partitionSha256:partition,fingerprint,sourceSimilarity:orbitFootprintArea(source,level),
    nearestPoolSimilarity:Math.max(0,...pool.map(x=>orbitFootprintArea(x,level))),
    changeFromPrevious:previous?{previousLevelSha256:previous.sha256,colorMultisetChanged:colorKey!==previous.colorKey,shapeMultisetChanged:shapeKey!==previous.shapeKey}:null});
  const path=`${out}/candidate-${String(serial).padStart(5,'0')}.json`;
  row.path=path;
  const packet={status:'UNVERIFIED_GLOBAL_RELAYOUT',accepted:false,formalReady:false,sourceLevelId:sourceId,sourceLevelSha256:result.sourceLevelSha256,
    level,levelSha256:row.levelSha256,provenance:result.construction,inventory:inventorySummary(level,runtime),attemptedProof:false};
  if(seenGameplay.has(fingerprint)||seenPartitions.has(partition))row.reason='duplicate-gameplay-or-partition';
  else if(row.sourceSimilarity>.7)row.reason='source-too-similar';
  else if(row.nearestPoolSimilarity>.7)row.reason='pool-too-similar';
  else if(previous&&(colorKey===previous.colorKey||shapeKey===previous.shapeKey))row.reason='must-change-real-colours-and-shape-multisets-before-next-solve';
  else{
    seenGameplay.add(fingerprint);seenPartitions.add(partition);
    const physicalClaim=`${root}/physical-attempts/${fingerprint}.json`;
    try{fs.writeFileSync(physicalClaim,JSON.stringify({label,serial,path,levelSha256:row.levelSha256,sourceId})+'\n',{flag:'wx'});}
    catch(error){if(error.code!=='EEXIST')throw error;row.reason='physical-input-already-claimed-by-another-batch';packet.failureReason=row.reason;fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});save('FINITE_GLOBAL_SEARCH_RUNNING');continue;}
    const proof=await probePlainLeagueLevel(runtime,{level,sourceLevelId:sourceId,attemptKey:`${label}-source-${sourceId}`},
      {floor:searchFloor,searchUpper,ledgerDirectory:`${out}/ledger`,budget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:5000}});
    packet.attemptedProof=true;packet.proof=proof;
    priorBySource.set(sourceId,{sha256:row.levelSha256,colorKey,shapeKey});
    const lower=proof.lower??proof.proof??proof;
    const drags=proof.drags??lower.drags;
    row.proof={status:proof.status,states:lower.discoveredStates,expanded:lower.exploredStates,U:lower.cost??null,L:lower.certifiedFloor??null,termination:lower.routeTermination??lower.termination};
    if(drags){
      packet.drags=drags;packet.replay=runtime.replayRevisedRoute(level,drags);
      if(packet.provenance?.reservedGeneratorRim?.length)packet.generatorSites=findLateGeneratorSites(level,drags,packet.provenance.reservedGeneratorRim,runtime);
      const U=proof.U,L=proof.L;
      if(proof.accepted===true&&packet.replay.valid&&packet.replay.complete&&packet.replay.nonClearingDrags===U&&L>=16&&L===U&&U<=30){
        Object.assign(packet,{status:'PLAIN_EXACT_LU_CANDIDATE_PENDING_MECHANISMS_AND_FINAL_AUDIT',accepted:true,L,U,difficulty:U<=20?'hard':'super'});
        Object.assign(row,{status:packet.status,L,U,difficulty:packet.difficulty,reason:null});
        accepted.push({path,sourceLevelId:sourceId,L,U,difficulty:packet.difficulty,partitionSha256:partition});pool.push(level);
      }else{row.status='ROUTE_OUTSIDE_BAND_OR_INVALID';row.reason='full-model-replay-or-exact-target-band';}
    }else{row.status='NO_COMPLETE_UPPER';row.reason=lower.routeTermination??lower.termination??proof.status;}
    if(!packet.accepted)packet.status=row.status;
  }
  packet.failureReason=row.reason;fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  save('FINITE_GLOBAL_SEARCH_RUNNING');
  if(packet.accepted||serial%20===0)console.log(JSON.stringify({label,serial,sourceId,status:row.status,proof:row.proof,accepted:accepted.length}));
}
save('FINITE_GLOBAL_SEARCH_FINISHED');
console.log(JSON.stringify({label,attempts:rows.length,candidates:rows.filter(r=>r.path).length,accepted:accepted.length,hard:accepted.filter(x=>x.difficulty==='hard').length,super:accepted.filter(x=>x.difficulty==='super').length}));
