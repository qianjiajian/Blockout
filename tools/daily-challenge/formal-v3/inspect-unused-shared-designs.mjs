import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadV3CatalogRuntime } from './catalog-contract.mjs';
import { levelSha256 } from '../formal-v2/contract.mjs';
import { boardBaselineSha256 } from '../formal-v2/geometry.mjs';
import { replayDecorated } from '../formal-v2/mechanism-decorate.mjs';
import { compareLayouts } from './diversity.mjs';
import { designFingerprints } from './bounded-proof.mjs';

// Read successful, unused campaign-derived construction objects. This does not
// reuse another activity's proof or modify its data; daily qualification is later.
const [selectionFile,label]=process.argv.slice(2);
if(!selectionFile||!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply daily selection and a new report label');
const directory=`deliverables/daily-formal-v3-20261008/design/${label}`;
await fs.mkdir(directory,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const runtime=await loadV3CatalogRuntime(),selection=await read(selectionFile);
const daily=await Promise.all(selection.files.map(read));
const leagueSelection=await read('deliverables/league-v2-20261008/selection/render-current-100/selection.json');
const league=await Promise.all(leagueSelection.selections.map(s=>read(s.proofFile)));
const paths=[];
async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){
 const p=`${dir}/${item.name}`;
 if(item.isDirectory()&&!['ledger','physical-attempts'].includes(item.name))await walk(p);
 else if(item.isFile()&&/^candidate-.*\.json$/.test(item.name))paths.push(p);
}}
await walk('deliverables/league-v2-20261008/design');
const rows=[],records=[];
for(const p of paths){
 const bytes=await fs.readFile(p),base=JSON.parse(bytes);
 if(!base.accepted||!base.level||!base.drags)continue;
 const source=runtime.LEVELS.find(s=>s.id===base.sourceLevelId);
 const row={input:p,inputFileSha256:sha(bytes),sourceLevelId:base.sourceLevelId,L:base.L,U:base.U,reasons:[]};
 rows.push(row);
 if(!source||boardBaselineSha256(base.level)!==boardBaselineSha256(source))row.reasons.push('source-board-not-retained');
 if(base.levelSha256!==levelSha256(base.level)||base.sourceLevelSha256!==levelSha256(source))row.reasons.push('source-or-layout-binding');
 row.leagueNearest=Math.max(...league.map(r=>compareLayouts(base.level,r.level).footprintSimilarity));
 row.dailyNearest=Math.max(...daily.map(r=>compareLayouts(base.level,r.level).footprintSimilarity));
 if(row.leagueNearest>.75)row.reasons.push('already-used-or-near-formal-league-layout');
 if(row.dailyNearest>.65)row.reasons.push('near-selected-daily-layout');
 const f=designFingerprints(base.level),retry=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 if(await fs.stat(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${retry}.blocked.json`).then(()=>true).catch(()=>false))row.reasons.push('previous-daily-failed-design');
 if(row.reasons.length)continue;
 const replay=replayDecorated(runtime,base.level,base.drags,base.timeSchedule);
 if(!replay.complete||!replay.valid||replay.failed||replay.nonClearingDrags!==base.U){row.reasons.push('actual-complete-replay');continue;}
 const difficulty=base.U<=20?1:base.U<=30?2:3;
 if(base.L<(difficulty===1?16:difficulty===2?21:31)){row.reasons.push('no-in-band-exploratory-evidence');continue;}
 // League prototypes use 180 s. Daily retains the recorded campaign clock;
 // these plain candidates have no timed mechanism affected by this metadata.
 if((base.level.blocks??[]).some(b=>b.timedBombSeconds)||base.timeSchedule){row.reasons.push('timed-prototype-needs-separate-design');continue;}
 const level={...structuredClone(base.level),timeSeconds:source.timeSeconds};
 const packet={...base,level,levelSha256:levelSha256(level),difficulty,status:'SHARED_UNUSED_DESIGN_ROUTE_REPLAYED_DAILY_PROOF_PENDING',
  formalReady:false,provenance:{...base.provenance,sharedConstructionSource:p,sharedConstructionSha256:sha(bytes),
   sharedConstructionLevelSha256:base.levelSha256,clockAdaptation:{prior:base.level.timeSeconds,current:source.timeSeconds},
   sourcePolicy:'Previously constructed from the recorded normal mainline board; not used by the league registry. Daily uses the source clock. No league proof is adopted as a daily proof.'}};
 const target=`${directory}/candidate-${String(records.length+1).padStart(4,'0')}.json`;
 const targetBytes=JSON.stringify(packet,null,2)+'\n';await fs.writeFile(target,targetBytes,{flag:'wx'});
 row.selectedPath=target;
 records.push({path:target,fileSha256:sha(targetBytes),sourceLevelId:base.sourceLevelId,difficulty,L:base.L,U:base.U});
}
await fs.writeFile(`${directory}/index.json`,JSON.stringify({status:'UNUSED_SHARED_BASES_FOR_DAILY_FRESH_QUALIFICATION',formalReady:false,records},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${directory}/report.json`,JSON.stringify({status:'READONLY_SHARED_POOL_AUDIT',formalReady:false,selectionFile,successfulInspected:rows.length,eligible:records.length,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory,inspected:rows.length,eligible:records.length,records}));
