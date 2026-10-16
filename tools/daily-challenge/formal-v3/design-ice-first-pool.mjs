import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,exploreBoundedIceCandidate,designFingerprints} from './bounded-proof.mjs';
import {assertIceProofDomain} from './bounded-ice-proof.mjs';
import {compareLayouts} from './diversity.mjs';
import {digest,orbitFootprintArea,bodyFootprint,plainGameplayFingerprint} from './diversity-layout-factory.mjs';
import {buildIceFirstCandidate,ICE_FIRST_FACTORY_VERSION} from './design-ice-first-factory.mjs';

const root='deliverables/daily-formal-v3-20261008/design';
const label=process.env.DESIGN_V3_LABEL;
if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Explicit new batch label required');
const directory=`${root}/${label}`;
if(fs.existsSync(directory))throw Error('Keep prior evidence; use a new label');
const runtime=await loadBoundedRuntime();
const manifest=JSON.parse(fs.readFileSync('docs/rules/manifest.json'));
if(!['1.154.0','1.155.0'].includes(manifest.activeVersion))throw Error('Review newly active rules');
const baseline=JSON.parse(fs.readFileSync(`${root}/mainline-baseline-catalog.json`));
const ids=(process.env.DESIGN_V3_SOURCES??'7,18,29,35,50,100,118,124,198,200').split(',').map(Number);
const attemptsPerSource=Number(process.env.DESIGN_V3_ATTEMPTS??10);
const acceptedQuota=Number(process.env.DESIGN_V3_ACCEPTED_QUOTA??20);
const mechanism=process.env.DESIGN_V3_ICE_MECHANISM??'numeric-ice';
const targetDifficulty=Number(process.env.DESIGN_V3_ICE_DIFFICULTY??3);
const irregular=process.env.DESIGN_V3_IRREGULAR==='1';
const shapeProfile=process.env.DESIGN_V3_SHAPE_PROFILE??'bar-mix';
const primaryExitQuota=Number(process.env.DESIGN_V3_PRIMARY_EXITS??3);
const budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
if(!Number.isSafeInteger(attemptsPerSource)||attemptsPerSource<1||ids.length*attemptsPerSource>1000)throw Error('At most 1000 finite construction inputs per batch');
if(![1,2,3].includes(targetDifficulty))throw Error('Unknown design target');
const rows=[],accepted=[],seen=new Set(),seenPartitions=new Set(),compared=[],oldPool=[],failedParents=new Map();
function readPrior(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const path=`${dir}/${entry.name}`;
    if(entry.isDirectory())readPrior(path);
    else if(/^candidate-.*\.json$/.test(entry.name)){
      let p;try{p=JSON.parse(fs.readFileSync(path));}catch{continue;}
      if(!p.level)continue;
      seen.add(plainGameplayFingerprint(p.level));seenPartitions.add(digest(p.level.blocks.map(bodyFootprint).sort()));
      if(p.accepted)compared.push(p.level);
    }
  }
}
readPrior(root);
for(const entry of JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/final-qualified/index.json')).entries)oldPool.push(JSON.parse(fs.readFileSync(entry.path)).level);
const filters={sourceSimilarityCeiling:.55,poolSimilarityCeiling:.65,oldPoolSimilarityCeiling:.75,allEightGlobalSymmetries:true};
const hashFile=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const moduleNames=['design-ice-first-factory.mjs','design-ice-first-pool.mjs','diversity-layout-factory.mjs','bounded-proof.mjs','bounded-ice-proof.mjs','mechanism-intensity.mjs','diversity.mjs'];
const inputBindings=[...moduleNames.map(name=>`tools/daily-challenge/formal-v3/${name}`),`${root}/mainline-baseline-catalog.json`].map(path=>({path,sha256:hashFile(path)}));
fs.mkdirSync(directory,{recursive:true});
for(const name of moduleNames)fs.copyFileSync(`tools/daily-challenge/formal-v3/${name}`,`${directory}/${name}.snapshot`);
function write(status){fs.writeFileSync(`${directory}/report.json`,JSON.stringify({status,factoryVersion:ICE_FIRST_FACTORY_VERSION,
  ruleVersion:manifest.activeVersion,formalReady:false,productionChanged:false,sourceIds:ids,attemptsPerSource,acceptedQuota,
  mechanism,targetDifficulty,shapeProfile,primaryExitQuota,irregular,budgets:budget,exploratoryDiversityFilters:filters,
  proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,inputBindings,
  strategyDeclaredBeforeInputSearch:'ice-joint',plainSearchInvocations:0,rows,accepted},null,2)+'\n');}
function finishPacket(path,packet,row){packet.failureReason=row.reason;fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});write('FINITE_ICE_BATCH_RUNNING');}
for(let round=0;round<attemptsPerSource;round++)for(const sourceId of ids){
  if(acceptedQuota&&accepted.length>=acceptedQuota){write('FINITE_ICE_BATCH_FINISHED_AT_QUOTA');process.exit(0);}
  if(fs.existsSync(`${root}/STOP`)){write('STOPPED_BY_COORDINATOR');process.exit(0);}
  const source=baseline.rows.find(r=>r.sourceLevelId===sourceId)?.level;
  if(!source||digest(source)!==digest(runtime.LEVELS.find(l=>l.id===sourceId)))throw Error('Source differs from archived actual mainline '+sourceId);
  const seed=createHash('sha256').update(`${label}:${sourceId}:${round}:ice-first`).digest().readUInt32LE(0);
  const candidate=buildIceFirstCandidate(source,runtime,{seed,mechanism,targetDifficulty,irregular,shapeProfile,primaryExitQuota,maxNodes:10000,maxTransitions:10000});
  const serial=rows.length,row={serial,sourceLevelId:sourceId,seed,status:'REJECTED_CONSTRUCTION',reason:candidate.reason??null,
    construction:candidate.construction??{phase:candidate.phase,partitionSearch:candidate.partitionSearch,colouringSearch:candidate.colouringSearch}};
  rows.push(row);
  if(!candidate.ok){write('FINITE_ICE_BATCH_RUNNING');continue;}
  const {level}=candidate;
  assertIceProofDomain(level);
  const partition=digest(level.blocks.map(bodyFootprint).sort()),fingerprint=plainGameplayFingerprint(level);
  Object.assign(row,{fingerprint,partitionSha256:partition,sourceFootprintAreaRetained:orbitFootprintArea(source,level),
    nearestExistingPoolArea:Math.max(0,...compared.map(x=>compareLayouts(x,level).footprintSimilarity)),
    nearestOldV2PoolArea:Math.max(0,...oldPool.map(x=>compareLayouts(x,level).footprintSimilarity))});
  const path=`${directory}/candidate-${String(serial).padStart(4,'0')}.json`;
  row.path=path;
  const packet={status:'UNVERIFIED_NEW_ICE_FIRST_RELAYOUT',accepted:false,formalReady:false,sourceLevelId:sourceId,
    sourceLevelSha256:candidate.sourceLevelSha256,level,levelSha256:candidate.levelSha256,factoryVersion:ICE_FIRST_FACTORY_VERSION,
    provenance:candidate.construction,ruleVersion:manifest.activeVersion,proofToolchainSha256:runtime.toolchainSha256,
    inputBindings,attemptedProof:false,pointerValidated:false,timeValidated:false};
  if(seen.has(fingerprint)||seenPartitions.has(partition))row.reason='duplicate-gameplay-input-or-partition';
  else if(row.sourceFootprintAreaRetained>filters.sourceSimilarityCeiling)row.reason='source-too-similar';
  else if(row.nearestExistingPoolArea>filters.poolSimilarityCeiling)row.reason='pool-too-similar';
  else if(row.nearestOldV2PoolArea>filters.oldPoolSimilarityCeiling)row.reason='old-v2-pool-too-similar';
  else{
    seen.add(fingerprint);seenPartitions.add(partition);
    const fingerprints=designFingerprints(level),previous=failedParents.get(sourceId);
    if(previous&&(previous.shapeSha256===fingerprints.shapeSha256||previous.colorSha256===fingerprints.colorSha256))row.reason='failed-source-requires-new-shapes-and-colours';
    else{
      let result;
      try{
        // This wrapper owns claim, exactly one joint search, double actual
        // replay, and ledger.finish. Never claim or rerun the object outside it.
        result=await exploreBoundedIceCandidate(runtime,{sourceLevelId:sourceId,level},{floor:16,searchUpper:64,budget,
          ...(previous?{redesignOf:previous.designSha256}:{})});
      }catch(error){row.reason=error.message;row.status='LEDGER_OR_DOMAIN_REJECTED';}
      if(result){
        Object.assign(packet,result,{attemptedProof:true});
        const p=result.proof;
        if(p.rawFullBoardStates>10000||p.rawExploredStates>10000||p.rawFullBoardStates!==p.discoveredStates||p.rawExploredStates!==p.exploredStates)throw Error('Raw complete-board budget contract mismatch');
        Object.assign(row,{status:result.status,reason:result.accepted?null:p.routeTermination??p.termination,
          difficulty:result.difficulty,L:result.L,U:result.U,
          proof:{status:p.status,states:p.discoveredStates,expanded:p.exploredStates,rawFullBoardStates:p.rawFullBoardStates,
            rawExploredStates:p.rawExploredStates,quotientDiscoveredStates:p.quotientDiscoveredStates,quotientExploredStates:p.quotientExploredStates,
            transitions:p.attemptedTransitions,microStates:p.microDiscoveredStates,microExpanded:p.microExploredStates,
            termination:p.routeTermination??p.termination,U:p.cost??null,certifiedFloor:p.certifiedFloor}});
        if(result.accepted){accepted.push({path,sourceLevelId:sourceId,difficulty:result.difficulty,L:result.L,U:result.U,partitionSha256:partition,mechanism});compared.push(level);}
        else failedParents.set(sourceId,fingerprints);
      }
    }
  }
  finishPacket(path,packet,row);
  if(packet.accepted||serial%20===0)console.log(JSON.stringify({label,serial,sourceId,status:row.status,reason:row.reason,proof:row.proof,accepted:accepted.length}));
}
write('FINITE_ICE_BATCH_FINISHED');
console.log(JSON.stringify({label,attempts:rows.length,completeObjects:rows.filter(r=>r.path).length,accepted:accepted.length,bands:[1,2,3].map(d=>({difficulty:d,count:accepted.filter(x=>x.difficulty===d).length}))}));
