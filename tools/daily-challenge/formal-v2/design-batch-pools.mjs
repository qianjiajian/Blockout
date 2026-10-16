import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {levelSha256} from './contract.mjs';
import {rectangular} from './design-layout-factory.mjs';
const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const label=process.env.DESIGN_BATCH_LABEL??'factory-round1';
const maxBatches=Number(process.env.DESIGN_MAX_BATCHES??48),cap=Number(process.env.DESIGN_CAP??48);
const candidateQuota=Number(process.env.DESIGN_ACCEPTED_QUOTA??0);
const reportPath=`${OUT}/${label}-batch.json`;
if(fs.existsSync(reportPath))throw new Error('Batch evidence already exists; choose a fresh label');
const rows=[],used=new Set(),start=new Date().toISOString();
const modes=(process.env.DESIGN_MODES??'plain,plain,irregular,concave').split(',');
if(modes.some(m=>!['plain','irregular','concave','frozen'].includes(m)))throw new Error('Unsupported design mode');
for(const file of fs.readdirSync(OUT).filter(n=>n.endsWith('-batch.json'))){const old=JSON.parse(fs.readFileSync(`${OUT}/${file}`));for(const row of old.rows??[])if(row.seed&&fs.existsSync(row.seed)){const seed=JSON.parse(fs.readFileSync(row.seed));if(seed.level)used.add(`${row.mode}:${levelSha256(seed.level)}`);}}
const readCandidates=()=>fs.readdirSync(OUT).filter(n=>n.endsWith('.json')).flatMap(name=>{
 const c=JSON.parse(fs.readFileSync(`${OUT}/${name}`));return c.accepted&&c.level&&c.drags?[{path:`${OUT}/${name}`,candidate:c}]:[];
});
const seeds=[42,195,197,180,170,33,9].map(id=>`${OUT}/source-board-${id}-seed.json`);
const write=()=>fs.writeFileSync(reportPath,JSON.stringify({status:rows.length<maxBatches?'FINITE_BATCH_RUNNING':'FINITE_BATCH_FINISHED',startedAt:start,updatedAt:new Date().toISOString(),productionChanged:false,maxBatches,perCandidateBudget:{maxStates:160000,maxTransitions:900000,maxMilliseconds:5000},perBatchCandidateCap:cap,rows},null,2)+'\n');
for(let batch=0;batch<maxBatches;batch++){
 if(candidateQuota&&rows.reduce((n,r)=>n+(r.counts??[]).reduce((s,c)=>s+c.count,0),0)>=candidateQuota){rows.push({batch,status:'ACCEPTED_CANDIDATE_QUOTA_MET',candidateQuota});break;}
 const mode=modes[batch%modes.length],all=readCandidates(),stageKey=mode==='plain'?'mechanisms-color-exit-1':mode==='frozen'?'mechanisms-frozen-exit-6':mode==='irregular'?'mechanisms-irregular-block-5':'mechanisms-irregular-board-8';
 let candidates=all.filter(({candidate:c})=>mode==='plain'||mode==='frozen'?c.stageKey==='mechanisms-color-exit-1'&&c.level.id===2&&c.level.blocks.every(b=>rectangular(b.shape)):mode==='irregular'?c.level.id===2&&['mechanisms-color-exit-1','mechanisms-irregular-block-5'].includes(c.stageKey):c.stageKey===stageKey);
 if(mode==='concave')candidates.push(...seeds.map(path=>({path,candidate:JSON.parse(fs.readFileSync(path))})));
 // Newest successful seeds are explored first; alternation keeps both bands.
 candidates=candidates.filter(x=>!used.has(`${mode}:${levelSha256(x.candidate.level)}`)&&(!process.env.DESIGN_TARGET_BANDS||!x.candidate.accepted||process.env.DESIGN_TARGET_BANDS.split(',').map(Number).includes(x.candidate.difficulty)));
 candidates.sort((a,b)=>{
  const target=process.env.DESIGN_TARGET_BANDS?Number(process.env.DESIGN_TARGET_BANDS.split(',')[batch%process.env.DESIGN_TARGET_BANDS.split(',').length]):batch%3===0?2:1;
  return Number(b.candidate.difficulty===target)-Number(a.candidate.difficulty===target)
   ||Number(b.candidate.stageKey===stageKey)-Number(a.candidate.stageKey===stageKey)
   ||b.path.localeCompare(a.path);
 });
 const next=candidates[0];if(!next){rows.push({batch,mode,status:'NO_NEW_SEED'});write();continue;}
 used.add(`${mode}:${levelSha256(next.candidate.level)}`);
 const childLabel=`${label}-${mode}-${String(batch).padStart(2,'0')}`;
 const env={...process.env,DESIGN_BASE:next.path,DESIGN_LABEL:childLabel,DESIGN_CAP:String(cap),DESIGN_STAGE:stageKey,DESIGN_IRREGULAR:mode==='plain'||mode==='frozen'?'0':'1',DESIGN_RECOLOR_ALL:mode==='concave'?'1':'0',DESIGN_DECORATE:mode==='frozen'?'frozen-exit':''};
 const run=spawnSync(process.execPath,['tools/daily-challenge/formal-v2/design-stage-pool.mjs'],{env,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
 fs.writeFileSync(`${OUT}/${childLabel}-run.txt`,`${run.stdout??''}${run.stderr??''}`);
 const path=`${OUT}/${childLabel}-report.json`,report=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
 const row={batch,mode,seed:next.path,reportPath:report?path:null,exitCode:run.status,status:run.status===0?'FINITE_BATCH_DONE':'PROCESS_FAILED',tried:report?.attemptedCandidates??report?.rows.filter(r=>r.levelSha256).length??0,counts:[1,2,3].map(d=>({difficulty:d,count:report?.candidates.filter(c=>c.difficulty===d).length??0}))};
 rows.push(row);write();console.log(JSON.stringify(row));
}
write();
if(rows.some(r=>r.status==='ACCEPTED_CANDIDATE_QUOTA_MET')){const report=JSON.parse(fs.readFileSync(reportPath));report.status='FINITE_BATCH_FINISHED_AT_CANDIDATE_QUOTA';fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
