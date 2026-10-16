import fs from 'node:fs';
import { localRetiles, fixColors } from '../daily-challenge/formal-v2/design-layout-factory.mjs';
import { loadLeagueProofRuntime, probePlainLeagueLevel, designFingerprints } from './proof-contract.mjs';
import { digest, random, plainGameplayFingerprint, bodyFootprint, inventorySummary, rectangular, orbitFootprintArea } from './design-layout-factory.mjs';
import { candidateDiversity } from './diversity-contract.mjs';

const root='deliverables/league-v2-20261008/design';
const label=process.env.LEAGUE_DESIGN_LABEL??'nearband-01',out=`${root}/${label}`;
if(fs.existsSync(out))throw Error('Preserve every prior batch; choose a new label');
const runtime=await loadLeagueProofRuntime(),catalog=JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const minCost=Number(process.env.LEAGUE_NEARBAND_MIN??10),cap=Number(process.env.LEAGUE_NEARBAND_PER_SEED??24);
const searchUpper=Number(process.env.LEAGUE_DESIGN_SEARCH_UPPER??30);
if(![20,30].includes(searchUpper))throw Error('Choose the confirmed hard or super upper bound');
const seedBatches=(process.env.LEAGUE_NEARBAND_BATCHES??'').split(',').filter(Boolean);
if(!Number.isSafeInteger(cap)||cap<1||cap>100)throw Error('Finite per-seed cap required');
const seeds=[],allAccepted=[],seen=new Set(),partitions=new Set();
for(const item of fs.readdirSync(root,{withFileTypes:true})){
  if(!item.isDirectory()||!fs.existsSync(`${root}/${item.name}/report.json`))continue;
  const report=JSON.parse(fs.readFileSync(`${root}/${item.name}/report.json`));
  for(const row of report.rows??[]){
    if(!row.path||!fs.existsSync(row.path))continue;
    const packet=JSON.parse(fs.readFileSync(row.path));if(!packet.level)continue;
    seen.add(plainGameplayFingerprint(packet.level));partitions.add(digest(packet.level.blocks.map(bodyFootprint).sort()));
    if(packet.accepted)allAccepted.push({index:allAccepted.length,sourceLevelId:packet.sourceLevelId,level:packet.level});
    if((!seedBatches.length||seedBatches.includes(item.name))&&row.proof?.U>=minCost&&row.proof.U<16&&packet.replay?.valid&&packet.replay?.complete)
      seeds.push({path:row.path,packet,cost:row.proof.U});
  }
}
seeds.sort((a,b)=>b.cost-a.cost||a.packet.sourceLevelId-b.packet.sourceLevelId);
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(`${root}/physical-attempts`,{recursive:true});
const rows=[],accepted=[];
const save=status=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status,ruleVersion:'1.155.0',productionChanged:false,formalReady:false,
  strategy:'bounded-local-improvement-on-many-distinct-global-repartitions',minCost,cap,searchUpper,seedBatches,seedCount:seeds.length,
  policy:'Do not copy old passed pool. Each seed is a distinct whole-board/new-region repartition with a complete under-band route. Retile native bodies and change real colours; reject near-duplicates of every accepted level.',
  seeds:seeds.map(s=>({path:s.path,cost:s.cost,sourceLevelId:s.packet.sourceLevelId})),rows,accepted},null,2)+'\n');
for(const [seedIndex,seed]of seeds.entries()){
  if(fs.existsSync(`${root}/STOP`)){save('STOPPED_BETWEEN_CANDIDATES');process.exit(0);}
  const {level:baseline,sourceLevelId}=seed.packet,actualSource=catalog.rows.find(x=>x.sourceLevelId===sourceLevelId).level;
  const r=random(714839+seedIndex*8171+[...label].reduce((n,c)=>n+c.charCodeAt(0)*9991,0));
  const variants=localRetiles(baseline,{irregular:true,maxUnion:16}).map(x=>({...x,order:r()})).sort((a,b)=>a.order-b.order);
  let previous,solves=0;
  for(const [variantIndex,variant]of variants.entries()){
    if(solves>=cap)break;
    const level=structuredClone(variant.level),originalFingerprint=designFingerprints(baseline);
    if(!fixColors(level,variant.changedIds,Math.floor(r()*4294967296),runtime,{keepProbability:.15}))continue;
    const fingerprint=plainGameplayFingerprint(level),partition=digest(level.blocks.map(bodyFootprint).sort());
    if(seen.has(fingerprint)||partitions.has(partition))continue;
    const f=designFingerprints(level);
    if(f.shapeSha256===originalFingerprint.shapeSha256||f.colorSha256===originalFingerprint.colorSha256)continue;
    if(!baseline.blocks.some(b=>level.blocks.find(x=>x.id===b.id)?.color!==b.color))continue;
    if(previous&&(f.shapeSha256===previous.shapeSha256||f.colorSha256===previous.colorSha256||!level.blocks.some(b=>previous.colorById.get(b.id)!==b.color)))continue;
    if(level.blocks.filter(b=>!rectangular(b.shape)).length/level.blocks.length>.3)continue;
    const inventory=inventorySummary(level,runtime);
    if(inventory.nonNativeOrMissingArtIds.length)continue;
    try{runtime.validateLevel(level);}catch{continue;}
    const diversity=candidateDiversity({index:0,sourceLevelId,level},allAccepted);
    if(!diversity.accepted)continue;
    if(orbitFootprintArea(actualSource,level)>.7)continue;
    const serial=rows.length,path=`${out}/candidate-${String(serial).padStart(5,'0')}.json`,claim=`${root}/physical-attempts/${fingerprint}.json`;
    try{fs.writeFileSync(claim,JSON.stringify({label,serial,path,sourceLevelId,levelSha256:digest(level)})+'\n',{flag:'wx'});}
    catch(error){if(error.code==='EEXIST')continue;throw error;}
    seen.add(fingerprint);partitions.add(partition);solves++;
    const proof=await probePlainLeagueLevel(runtime,{level,sourceLevelId,attemptKey:`${label}-seed-${seedIndex}`},
      {floor:16,searchUpper,ledgerDirectory:`${out}/ledger`,budget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:5000}});
    previous={...f,colorById:new Map(level.blocks.map(b=>[b.id,b.color]))};
    const packet={status:proof.status,accepted:proof.accepted,formalReady:false,level,sourceLevelId,sourceLevelSha256:digest(actualSource),levelSha256:digest(level),proof,
      provenance:{factoryVersion:'league-independent-underband-refinement-v2.1',baselinePath:seed.path,baselineLevelSha256:digest(baseline),baselineExactCost:seed.cost,
        changedBodyIds:variant.changedIds,shapeAndColoursChanged:true,sourceBoardExactlyRetained:true,sourceTemplateFootprintSimilarity:orbitFootprintArea(actualSource,level),
        reservedGeneratorRim:seed.packet.provenance?.reservedGeneratorRim,
        selectionDiversity:diversity,sourceInventoryPolicy:'Distinct globally rebuilt under-band seed, then finite native union refinement. Source/mainline board remains exact. No old passed pool copied.'}};
    if(proof.drags){packet.drags=proof.drags;packet.replay=proof.canonicalReplay;packet.L=proof.L;packet.U=proof.U;packet.difficulty=proof.U<=20?'hard':'super';}
    else if(proof.lower?.drags){packet.drags=proof.lower.drags;packet.replay=runtime.replayRevisedRoute(level,packet.drags);}
    const row={serial,seedIndex,variantIndex,sourceId:sourceLevelId,path,status:packet.status,
      proof:{status:proof.status,states:proof.lower?.discoveredStates,rawStates:proof.lower?.rawFullBoardStates,expanded:proof.lower?.exploredStates,
        U:proof.U??proof.lower?.cost,L:proof.L??proof.lower?.certifiedFloor,termination:proof.lower?.routeTermination??proof.lower?.termination}};
    rows.push(row);
    if(packet.accepted){
      accepted.push({path,sourceLevelId,L:packet.L,U:packet.U,difficulty:packet.difficulty,partitionSha256:partition});
      allAccepted.push({index:allAccepted.length,sourceLevelId,level});
    }
    fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});save('FINITE_NEARBAND_REFINEMENT_RUNNING');
    if(packet.accepted||serial%20===0)console.log(JSON.stringify({label,serial,seedIndex,sourceLevelId,...row.proof,accepted:accepted.length}));
    if(packet.accepted)break; // Spread successful designs across distinct global seeds.
  }
}
save('FINITE_NEARBAND_REFINEMENT_FINISHED');
console.log(JSON.stringify({label,seeds:seeds.length,attempts:rows.length,accepted:accepted.length}));
