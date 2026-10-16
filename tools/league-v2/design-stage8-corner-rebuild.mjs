import fs from 'node:fs';
import {localRetiles,fixColors} from '../daily-challenge/formal-v2/design-layout-factory.mjs';
import {loadLeagueProofRuntime,probePlainLeagueLevel,designFingerprints} from './proof-contract.mjs';
import {digest,plainGameplayFingerprint,inventorySummary,random,rectangular,bodyFootprint} from './design-layout-factory.mjs';
import {candidateDiversity} from './diversity-contract.mjs';

// A single alternative to the successful large-inventory rectangle. Never
// retain both near-identical alternatives in the selected 100. This changes
// the actual symmetric outer silhouette, native footprints and real colours.
const root='deliverables/league-v2-20261008/design';
const basePath=`${root}/ice-inventory-01/candidate-00753.json`;
const label=process.env.LEAGUE_DESIGN_LABEL??'stage8-corner-rebuild-01',out=`${root}/${label}`;
const contourMode=process.env.LEAGUE_DESIGN_CONTOUR??'corners';
if(fs.existsSync(out))throw Error('Preserve previous finite attempts');
const source=JSON.parse(fs.readFileSync(basePath)),runtime=await loadLeagueProofRuntime(),r=random(8819818);
const baselineCatalog=JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const mainline=baselineCatalog.rows.find(x=>x.sourceLevelId===source.sourceLevelId).level;
const allAccepted=[];
for(const item of fs.readdirSync(root,{withFileTypes:true})){
  if(!item.isDirectory()||!fs.existsSync(`${root}/${item.name}/report.json`))continue;
  const report=JSON.parse(fs.readFileSync(`${root}/${item.name}/report.json`));
  for(const row of report.accepted??[]){if(row.path===basePath)continue;const p=JSON.parse(fs.readFileSync(row.path));allAccepted.push({index:allAccepted.length,sourceLevelId:p.sourceLevelId,level:p.level});}
}
const variants=[];
for(const depth of [1,2]){
  const level=structuredClone(source.level),removedCells=[];
  if(contourMode==='outer-centre'){
    removedCells.push([Math.floor(level.width/2),0]);
    if(depth===2)removedCells.push([Math.floor(level.width/2),level.height-1]);
  }else for(let y=0;y<depth;y++)removedCells.push([0,y],[level.width-1,y]);
  const excluded=new Set(removedCells.map(p=>p.join(',')));
  level.playable=level.playable.filter(p=>!excluded.has(p.join(',')));
  const changedIds=[];
  level.blocks=level.blocks.flatMap(b=>{
    const keep=b.shape.map(([x,y])=>[b.x+x,b.y+y]).filter(p=>!excluded.has(p.join(',')));
    if(keep.length===b.shape.length)return[b];changedIds.push(b.id);
    if(!keep.length)return[];
    const x=Math.min(...keep.map(p=>p[0])),y=Math.min(...keep.map(p=>p[1]));
    return[{...b,x,y,shape:keep.map(([xx,yy])=>[xx-x,yy-y])}];
  });
  variants.push({level,changedIds,removedCells});
  for(const v of localRetiles(level,{irregular:true,maxUnion:16}))variants.push({...v,removedCells});
}
variants.sort((a,b)=>a.changedIds.length-b.changedIds.length);
fs.mkdirSync(out,{recursive:true});const rows=[],accepted=[],seenPartitions=new Set();let previous;
const save=()=>fs.writeFileSync(`${out}/report.json`,JSON.stringify({status:'FINITE_STAGE8_SILHOUETTE_ALTERNATIVE',ruleVersion:'1.155.0',productionChanged:false,formalReady:false,
  policy:'Only one of this alternative and its original rectangular base may be selected. This is a disclosed source-silhouette adaptation, not a claim of exact source-mask retention.',
  mustNotCoSelect:[basePath],rows,accepted},null,2)+'\n');
for(const v of variants){
  if(rows.length>=36||accepted.length)break;
  const level=structuredClone(v.level),ids=[...new Set([...v.changedIds,...level.blocks.filter(b=>b.color!=='purple'&&r()<.1).map(b=>b.id)])];
  if(!fixColors(level,ids,Math.floor(r()*2**32),runtime,{keepProbability:contourMode==='outer-centre'?.85:.15}))continue;
  if(new Set(level.blocks.map(b=>b.color)).size!==8)continue;
  const fp=designFingerprints(level),partition=digest(level.blocks.map(bodyFootprint).sort());
  if(seenPartitions.has(partition))continue;
  const initial=designFingerprints(source.level);
  if(fp.shapeSha256===initial.shapeSha256||fp.colorSha256===initial.colorSha256)continue;
  if(previous&&(fp.shapeSha256===previous.shapeSha256||fp.colorSha256===previous.colorSha256))continue;
  if(level.blocks.filter(b=>!rectangular(b.shape)).length/level.blocks.length>.3)continue;
  const inventory=inventorySummary(level,runtime);if(inventory.nonNativeOrMissingArtIds.length)continue;
  try{runtime.validateLevel(level);}catch{continue;}
  const diversity=candidateDiversity({index:8,sourceLevelId:source.sourceLevelId,level},allAccepted);if(!diversity.accepted)continue;
  const serial=rows.length,path=`${out}/candidate-${String(serial).padStart(5,'0')}.json`;
  const physicalFingerprint=plainGameplayFingerprint(level),claim=`${root}/physical-attempts/${physicalFingerprint}.json`;
  try{fs.writeFileSync(claim,JSON.stringify({label,serial,path,sourceLevelId:source.sourceLevelId,levelSha256:digest(level)})+'\n',{flag:'wx'});}catch(e){if(e.code==='EEXIST')continue;throw e;}
  seenPartitions.add(partition);
  const proof=await probePlainLeagueLevel(runtime,{level,sourceLevelId:source.sourceLevelId,attemptKey:label},{floor:21,searchUpper:30,ledgerDirectory:`${out}/ledger`,budget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:5000}});
  previous=fp;
  const packet={status:proof.status,accepted:proof.accepted,formalReady:false,level,sourceLevelId:source.sourceLevelId,sourceLevelSha256:digest(mainline),levelSha256:digest(level),proof,
    provenance:{factoryVersion:'league-symmetric-corner-alternative-v1',baselinePath:basePath,baselineLevelSha256:source.levelSha256,sourceBoardExactlyRetained:false,
      actualSourceAdaptation:contourMode==='outer-centre'?'Remove the top outer-centre cell, optionally the matching bottom cell, preserving left/right reflection. Rebuild affected native bodies and a local union. Exterior notches only; no interior wall or isolated chamber.':'Remove the mirrored top outer-corner cells and rebuild affected native bodies plus a local body union. No interior walls, chambers or seams.',removedCells:v.removedCells,
      changedBodyIds:ids,sourceInventoryPolicy:'Original large-board candidate is an alternative only, not a second selected near-duplicate.',mustNotCoSelect:[basePath],selectionDiversity:diversity}};
  if(proof.drags){packet.drags=proof.drags;packet.replay=proof.canonicalReplay;packet.L=proof.L;packet.U=proof.U;packet.difficulty='super';}
  if(packet.accepted){accepted.push({path,sourceLevelId:source.sourceLevelId,L:packet.L,U:packet.U,difficulty:'super',partitionSha256:partition});}
  fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  rows.push({serial,path,sourceId:source.sourceLevelId,status:proof.status,proof:{U:proof.U,L:proof.L,states:proof.lower?.discoveredStates,termination:proof.lower?.termination}});save();
  console.log(JSON.stringify(rows.at(-1)));
}
save();console.log(JSON.stringify({attempts:rows.length,accepted:accepted.length,out}));
