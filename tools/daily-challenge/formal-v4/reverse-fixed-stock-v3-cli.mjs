import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadV4Runtime} from './runtime.mjs';
import {prepareReverseStockTask,runReverseStockTask} from './reverse-fixed-stock-task-v3.mjs';

// Thin single-call CLI only. No stock creation, review, retry, fallback, history
// export or mathematical implementation. Run from the frozen workspace with
// DAILY_EXECUTION_POLICY_REVIEW set to the actually reviewed current policy.
// prepare config: {context:{path,sha256},planFile}
// run config: {plan:{path,sha256},planReview:{path,sha256},outputDirectory}
const hash=b=>createHash('sha256').update(b).digest('hex');
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));
async function absent(p){try{await fs.access(p);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Existing output: '+p);}
export async function reverseFixedStockCli(command,configuration){
 assert(['prepare','run'].includes(command),'Use prepare or run');
 assert(process.env.DAILY_EXECUTION_POLICY_REVIEW,'Explicit current execution policy review required');
 const c=JSON.parse(await fs.readFile(configuration,'utf8'));
 assert.deepEqual(Object.keys(c).sort(),command==='prepare'?['context','planFile']:['outputDirectory','plan','planReview']);
 if(command==='prepare'){descriptor(c.context);assert(typeof c.planFile==='string');await absent(c.planFile);}
 else{descriptor(c.plan);descriptor(c.planReview);assert(typeof c.outputDirectory==='string');await absent(c.outputDirectory);}
 const runtime=await loadV4Runtime();
 if(command==='prepare'){
  const plan=await prepareReverseStockTask(runtime,c.context);
  const bytes=Buffer.from(JSON.stringify(plan,null,2)+'\n');
  await fs.mkdir(path.dirname(c.planFile),{recursive:true});
  await fs.writeFile(c.planFile,bytes,{flag:'wx'});
  return{plan:{path:c.planFile,sha256:hash(bytes)},preparedOnly:true};
 }
 const q=await runReverseStockTask(runtime,c.plan,c.outputDirectory,{planReview:c.planReview});
 const completionPath=path.join(c.outputDirectory,'completion.json');
 return{completion:{path:completionPath,sha256:hash(await fs.readFile(completionPath))},status:q.status,accepted:q.accepted,L:q.L,U:q.U};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: node reverse-fixed-stock-v3-cli.mjs prepare|run CONFIG.json');
 console.log(JSON.stringify(await reverseFixedStockCli(process.argv[2],process.argv[3])));
}
