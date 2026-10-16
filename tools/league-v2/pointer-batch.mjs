import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const[input,output,workersArg='3']=process.argv.slice(2),formal=process.argv.includes('--formal');
if(!input||!output)throw Error('Usage: node pointer-batch.mjs explicit-selection.json new-directory [workers] [--formal]');
const workers=Number(workersArg);if(!Number.isSafeInteger(workers)||workers<1||workers>12)throw Error('1–12 browser workers required');
const bytes=await fs.readFile(input),selected=JSON.parse(bytes).selections;
if(!Array.isArray(selected)||new Set(selected.map(r=>r.index)).size!==selected.length)throw Error('One explicit selection per slot required');
await fs.mkdir(output,{recursive:false});
const queue=selected.flatMap(row=>['320x568','496x1078'].map(viewport=>({...row,viewport}))),rows=[];
const baseline={input,inputSha256:createHash('sha256').update(bytes).digest('hex'),expectedRuns:queue.length,workers,formalRegistry:formal,
 complete100:selected.length===100,formalReady:false,playerSaveTouched:false};
let cursor=0;
const save=()=>fs.writeFile(path.join(output,'batch.json'),JSON.stringify({...baseline,status:rows.length===queue.length?'BATCH_FINISHED':'RUNNING',rows},null,2)+'\n');
await save();
async function worker(){
 while(cursor<queue.length){
  const row=queue[cursor++],tag=String(row.index).padStart(3,'0')+'-'+row.viewport,dir=path.join(output,tag),args=['tools/league-v2/pointer.mjs',row.proofFile,dir,row.viewport,...(formal?['--formal']:[])];
  const log=await fs.open(path.join(output,tag+'.log'),'wx');
  let code;
  try{code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore',log.fd,log.fd]});child.once('error',reject);child.once('exit',resolve);});}
  finally{await log.close();}
  let result;try{result=JSON.parse(await fs.readFile(path.join(dir,'report.json'),'utf8'));}catch{}
  rows.push({index:row.index,viewport:row.viewport,proofFile:row.proofFile,reportFile:path.join(dir,'report.json').replaceAll('\\','/'),exitCode:code,status:result?.status??'NO_REPORT',failure:result?.failure??null});
  await save();console.log(JSON.stringify({done:rows.length,total:queue.length,index:row.index,viewport:row.viewport,status:result?.status,failure:result?.failure}));
 }
}
await Promise.all(Array.from({length:workers},worker));await save();
if(rows.some(r=>r.exitCode!==0||r.status==='FAIL'))process.exitCode=1;
console.log(JSON.stringify({output,runs:rows.length,failed:rows.filter(r=>r.exitCode!==0).length,formalReady:false}));
