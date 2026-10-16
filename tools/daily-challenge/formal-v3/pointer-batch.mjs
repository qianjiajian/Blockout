import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {fileSha256} from './emit-catalog.mjs';
import {VIEWPORTS,loadVerifiedRuntimeDataset,currentPointerBindings,assertCurrentBindings,validateFinalPointerEvidence,validateScreenshotFiles} from './final-acceptance.mjs';

export function planPointerJobs(dataset){
  if(dataset.expected.length!==450||dataset.entries.size!==450)throw Error('Formal Pointer batch requires the complete 450 runtime objects');
  const jobs=dataset.expected.flatMap(slot=>{
    const entry=dataset.entries.get(slot.formalId);if(!entry)throw Error(`Missing runtime proof ${slot.formalId}`);
    return VIEWPORTS.map(viewport=>({file:entry.file,receiptSha256:entry.receiptSha256,formalId:slot.formalId,levelSha256:entry.receipt.levelSha256,viewport}));
  });
  if(jobs.length!==900||new Set(jobs.map(job=>`${job.formalId}:${job.viewport}`)).size!==900)throw Error('Duplicate/missing formal Pointer jobs');return jobs;
}

export async function pointerBatch(runtimeDirectory,output,workers=4){
  if(!Number.isSafeInteger(workers)||workers<1||workers>8)throw Error('Pointer workers must be 1..8');
  const dataset=await loadVerifiedRuntimeDataset(runtimeDirectory),jobs=planPointerJobs(dataset),pointerBindings=await currentPointerBindings();
  const batchToolSha256=fileSha256(await fs.readFile('tools/daily-challenge/formal-v3/pointer-batch.mjs'));
  await fs.mkdir(output,{recursive:false});const rows=[];let next=0,progressWrite=Promise.resolve();
  const childRun=job=>new Promise(resolve=>{
    const folder=path.join(output,`${job.formalId}-${job.viewport}`).replaceAll('\\','/'),reportFile=`${folder}/report.json`;
    const child=spawn(process.execPath,['tools/daily-challenge/formal-v3/pointer.mjs',job.file,folder,job.viewport,'--formal'],
      {stdio:['ignore','pipe','pipe'],windowsHide:true});let log='',spawnError,timedOut=false;
    child.stdout.on('data',bytes=>{log+=bytes;});child.stderr.on('data',bytes=>{log+=bytes;});
    const timeout=setTimeout(()=>{timedOut=true;child.kill();},Math.min(600000,Math.max(180000,(dataset.entries.get(job.formalId).receipt.level.timeSeconds+60)*1000)));
    child.on('error',error=>{spawnError=error.message;log+=error.stack;});
    child.on('close',async(code,signal)=>{
      clearTimeout(timeout);let report,reportSha256,failure=spawnError;
      try{
        await fs.writeFile(`${folder}.log`,log,{flag:'wx'});
        const bytes=await fs.readFile(reportFile);report=JSON.parse(bytes);reportSha256=fileSha256(bytes);
        if(code!==0||signal!==null||timedOut||spawnError)throw Error(`Pointer process failed: ${code}/${signal}${timedOut?'/timeout':''}`);
        validateFinalPointerEvidence(report,dataset.entries.get(job.formalId).receipt,{...job,report:reportFile},dataset.report);
        for(const [file,hash]of Object.entries(pointerBindings))if(report.files?.[file]!==hash)throw Error(`Pointer implementation mismatch ${file}`);
        if(fileSha256(await fs.readFile(job.file))!==job.receiptSha256)throw Error('Runtime receipt changed during run');
        await validateScreenshotFiles(report);
      }catch(error){failure=error.message;}
      resolve({...job,code,signal,timedOut,report:reportFile,reportSha256,status:failure?'FAILED_FORMAL_POINTER_VERIFICATION':report.status,
        failure,wallSeconds:report?.wallSeconds});
    });
  });
  await Promise.all(Array.from({length:workers},async()=>{
    while(next<jobs.length){
      const row=await childRun(jobs[next++]);rows.push(row);
      await fs.writeFile(`${output}/worker-${row.formalId}-${row.viewport}.json`,JSON.stringify(row,null,2)+'\n',{flag:'wx'});
      const snapshot=JSON.stringify({schemaVersion:3,requested:900,completed:rows.length,passed:rows.filter(row=>row.status==='FORMAL_POINTER_NATURAL_TIME_PASS').length,rows},null,2)+'\n';
      progressWrite=progressWrite.then(()=>fs.writeFile(`${output}/progress.json`,snapshot));await progressWrite;
      console.log(JSON.stringify({completed:rows.length,total:jobs.length,...row}));
    }
  }));
  let bindingFailure;try{
    await assertCurrentBindings({...dataset.report.bindings,...pointerBindings});
    if(fileSha256(await fs.readFile(dataset.reportFile))!==dataset.reportSha256||fileSha256(await fs.readFile(dataset.indexFile))!==dataset.indexSha256)throw Error('Runtime dataset changed');
  }catch(error){bindingFailure=error.message;}
  const passed=rows.filter(row=>row.status==='FORMAL_POINTER_NATURAL_TIME_PASS').length;
  const report={schemaVersion:3,scope:450,requested:900,viewports:VIEWPORTS,workers,playerSaveTouched:false,naturalClock:true,formalReady:false,
    status:passed===900&&!bindingFailure?'FORMAL_V3_POINTER_BATCH_COMPLETE':'FORMAL_V3_POINTER_BATCH_FAILED',
    runtimeReport:dataset.reportFile,runtimeReportSha256:dataset.reportSha256,runtimeIndexSha256:dataset.indexSha256,
    catalogRevision:dataset.report.catalogRevision,pointerBindings,batchToolSha256,rows,passed,failed:900-passed,bindingFailure};
  await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const[directory,output,count='4']=process.argv.slice(2);if(!directory||!output)throw Error('Usage: pointer-batch.mjs complete-runtime-directory new-output-directory [workers1..8]');
  const report=await pointerBatch(directory,output,Number(count));console.log(JSON.stringify({requested:report.requested,passed:report.passed,failed:report.failed,status:report.status}));
  if(report.status!=='FORMAL_V3_POINTER_BATCH_COMPLETE')process.exitCode=1;
}
