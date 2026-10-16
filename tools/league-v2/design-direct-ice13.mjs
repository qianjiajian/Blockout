import fs from 'node:fs';
import {loadLeagueIceProofRuntime,verifyLeagueIceCandidate} from './proof-ice-contract.mjs';
import {designFingerprints} from './proof-contract.mjs';
import {buildGlobalCandidate,digest,plainGameplayFingerprint,random,inventorySummary} from './design-layout-factory.mjs';
import {candidateDiversity} from './diversity-contract.mjs';
import {buildRepartitionCandidate} from './design-repartition.mjs';

const root='deliverables/league-v2-20261008/design',label=process.env.LEAGUE_DESIGN_LABEL??'direct-ice13-01',out=`${root}/${label}`;
const lateRegion=process.env.LEAGUE_DESIGN_ICE_LATE_REGION==='1';
if(fs.existsSync(out))throw Error('Never reuse a failed batch');
const runtime=await loadLeagueIceProofRuntime(),catalog=JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const sourceIds=lateRegion?[187]:[11,13,19,31,52,118,155,180,187,195,196,200],pool=[];
const regionBase=lateRegion?JSON.parse(fs.readFileSync(`${root}/ice-inventory-01/candidate-00753.json`)):null,firstClears=new Map();
if(regionBase){let n=0;for(const d of regionBase.drags){if(!firstClears.has(d.blockId))firstClears.set(d.blockId,n);if(d.exitSide)n++;}}
const protectedBodyIds=[...firstClears].filter(([,n])=>n<=1).map(([id])=>id);
for(const d of fs.readdirSync(root,{withFileTypes:true})){
  if(!d.isDirectory()||!fs.existsSync(`${root}/${d.name}/report.json`))continue;
  const p=JSON.parse(fs.readFileSync(`${root}/${d.name}/report.json`));
  for(const a of p.accepted??[]){const q=JSON.parse(fs.readFileSync(a.path));pool.push({index:pool.length,sourceLevelId:q.sourceLevelId,level:q.level});}
}
fs.mkdirSync(out,{recursive:true});const rows=[],accepted=[];let previous;
const save=()=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status:'FINITE_DIRECT_ICE13_NEW_GRAPH_SEARCH',ruleVersion:'1.155.0',productionChanged:false,formalReady:false,
  method:'Construct a never-attempted global shape-and-colour layout, add three ice gates and five numeric-ice bodies, then a SINGLE native static-ice held-gesture search proves L and constructs U. No plain search first, no alternate solver retry.',rows,accepted},null,2)+'\n');
const gateDistance=(b,g,l)=>g.side==='top'?b.y:g.side==='bottom'?l.height-1-b.y-Math.max(...b.shape.map(p=>p[1])):g.side==='left'?b.x:l.width-1-b.x-Math.max(...b.shape.map(p=>p[0]));
for(let design=0;design<360&&!accepted.length;design++){
  const sourceLevelId=sourceIds[design%sourceIds.length],source=catalog.rows.find(r=>r.sourceLevelId===sourceLevelId).level,seed=19011871+design*8171,r=random(seed);
  const result=lateRegion?buildRepartitionCandidate(regionBase.level,runtime,{seed,irregular:true,protectedBodyIds,keepColourProbability:.8}):buildGlobalCandidate(source,runtime,{seed,maxNodes:10000,maxTransitions:10000,irregular:true,paletteSize:8,requirePalette:true,openingColourBias:true,bodyCount:Math.max(18,Math.round((source.playable?.length??source.width*source.height)/2.1))});
  if(!result.ok)continue;
  const level=result.level,plainFingerprint=plainGameplayFingerprint(level),fp=designFingerprints(level);
  if(previous&&(fp.shapeSha256===previous.shapeSha256||fp.colorSha256===previous.colorSha256))continue;
  if(fs.existsSync(`${root}/physical-attempts/${plainFingerprint}.json`))continue;
  const diversity=candidateDiversity({index:13,sourceLevelId,level},pool);if(!diversity.accepted)continue;
  const plain=new runtime.PuzzleModel(level),opening=level.blocks.filter(b=>plain.possibleExitSides(plain.getBlock(b.id)).length);
  if(!opening.length)continue;
  const warmColour=opening[0].color;
  const gateChoices=level.gates.filter(g=>g.color!==warmColour).map(g=>({g,score:Math.min(...level.blocks.filter(b=>b.color===g.color).map(b=>gateDistance(b,g,level)))+r()*2})).sort((a,b)=>b.score-a.score);
  for(const [i,x]of gateChoices.slice(0,3).entries())x.g.frozen=lateRegion?5:[5,8,11][i];
  const bodyChoices=level.blocks.filter(b=>!opening.some(x=>x.id===b.id)&&b.color!==warmColour).map(b=>({b,score:gateDistance(b,level.gates.find(g=>g.color===b.color),level)+r()*4})).sort((a,b)=>b.score-a.score);
  if(bodyChoices.length<5)continue;
  if(lateRegion){for(const b of level.blocks)if(!protectedBodyIds.includes(b.id)){const first=firstClears.get(b.id);b.frozen=first<14?11:first<20?12:13;}}
  else for(const [i,x]of bodyChoices.slice(0,5).entries())x.b.frozen=[3,4,5,7,9][i];
  level.id=900013;level.name='荣耀联赛13·直接真实冰序候选';level.difficulty='super';level.timeSeconds=180;level.reward=0;
  const inventory=inventorySummary(level,runtime);if(inventory.nonNativeOrMissingArtIds.length)continue;
  try{runtime.validateLevel(level);}catch{continue;}
  const serial=rows.length,path=`${out}/candidate-${String(serial).padStart(5,'0')}.json`;
  try{fs.writeFileSync(`${root}/physical-attempts/${plainFingerprint}.json`,JSON.stringify({label,serial,path,sourceLevelId,plainLayoutClaim:true,levelSha256:digest(level)})+'\n',{flag:'wx'});}catch(e){if(e.code==='EEXIST')continue;throw e;}
  const proof=await verifyLeagueIceCandidate(runtime,{index:13,sourceLevelId,level,requiredMechanisms:['frozen-exit','numeric-ice']},{budget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000},attemptKey:label,ledgerDirectory:`${out}/ledger`});
  previous=fp;
  const packet={status:proof.status,accepted:proof.accepted,formalReady:false,sourceLevelId,sourceLevelSha256:digest(source),level,levelSha256:digest(level),proof,drags:proof.drags,L:proof.L,U:proof.U,difficulty:'super',specials:proof.specials,
    provenance:{...result.construction,...(lateRegion?{sourceLevelSha256:digest(source),refinementBasePath:`${root}/ice-inventory-01/candidate-00753.json`,protectedOpeningBodyIds:protectedBodyIds}:{}),nativeIceDesign:{gateCount:3,bodyCount:level.blocks.filter(b=>b.frozen).length,openingWarmColour:warmColour,plainSearchPerformed:false,oneNativeSearch:true},selectionDiversity:diversity}};
  const row={serial,design,path,sourceLevelId,status:proof.status,proof:{L:proof.L,U:proof.U,states:proof.lowerBound?.result?.discoveredStates,termination:proof.lowerBound?.result?.termination},reasons:proof.reasons};
  rows.push(row);if(packet.accepted)accepted.push({path,sourceLevelId,L:packet.L,U:packet.U,difficulty:'super',requiresMechanismAudit:true});
  fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});save();console.log(JSON.stringify(row));
}
save();console.log(JSON.stringify({out,attempts:rows.length,accepted:accepted.length}));
