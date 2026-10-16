import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [indexFile,output,workersArg='4',viewportArg='496x1078']=process.argv.slice(2);
const workers=Number(workersArg);
if(!indexFile||!output||!Number.isSafeInteger(workers)||workers<1||workers>8)throw Error('Usage: pointer-batch.mjs explicit-index.json new-output-directory [workers1..8] [496x1078|both]');
const index=JSON.parse(await fs.readFile(indexFile,'utf8'));
if(!Array.isArray(index.files)||index.files.length<1)throw Error('Explicit proof files required');
const viewports=viewportArg==='both'?['320x568','496x1078']:[viewportArg];
const queue=[];
for(const file of index.files){const r=JSON.parse(await fs.readFile(file,'utf8'));if(!r.accepted)throw Error(`Unqualified candidate ${file}`);
  for(const viewport of viewports)queue.push({file,formalId:r.formalId,levelSha256:r.levelSha256,viewport});}
await fs.mkdir(output,{recursive:false});
const rows=[];let next=0;
const childRun=job=>new Promise(resolve=>{
  const folder=path.join(output,`${job.formalId}-${job.viewport}`);
  const child=spawn(process.execPath,['tools/daily-challenge/formal-v2/pointer.mjs',job.file,folder,job.viewport,'--formal'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let log='';child.stdout.on('data',bytes=>log+=bytes);child.stderr.on('data',bytes=>log+=bytes);
  const timeout=setTimeout(()=>{child.kill();},180000);
  child.on('error',error=>{log+=error.stack;});
  child.on('close',async(code,signal)=>{clearTimeout(timeout);await fs.writeFile(`${folder}.log`,log);
    const report=await fs.readFile(path.join(folder,'report.json'),'utf8').then(JSON.parse).catch(()=>null);
    resolve({...job,code,signal,report:path.join(folder,'report.json').replaceAll('\\','/'),status:report?.status??'PROCESS_FAILED',failure:report?.failure,wallSeconds:report?.wallSeconds});});
});
// Each worker owns a separate browser/context and volatile MemoryHost. No
// machine-wide clock overrides or real save access are used.
await Promise.all(Array.from({length:workers},async()=>{
  while(next<queue.length){const job=queue[next++],row=await childRun(job);rows.push(row);console.log(JSON.stringify({completed:rows.length,total:queue.length,...row}));
    await fs.writeFile(path.join(output,`worker-${job.formalId}-${job.viewport}.json`),JSON.stringify(row,null,2)+'\n',{flag:'wx'});}
}));
const report={scope:450,requested:queue.length,viewports,workers,playerSaveTouched:false,naturalClock:true,rows,
  passed:rows.filter(row=>row.status==='FORMAL_POINTER_NATURAL_TIME_PASS').length,failed:rows.filter(row=>row.status!=='FORMAL_POINTER_NATURAL_TIME_PASS').length};
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(report.failed)process.exitCode=1;
console.log(JSON.stringify({output,requested:report.requested,passed:report.passed,failed:report.failed}));
