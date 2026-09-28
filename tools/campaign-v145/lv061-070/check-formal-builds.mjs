import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {OUTPUT,ruleGate,writeNew} from './remake61to70-v146.mjs';
import {computeWechatSourceFingerprint} from '../../../scripts/wechat-build-integrity.mjs';

const lock=ruleGate(),stamp=Date.now(),outputRoot=`.codex-temp/lv061-070-formal-build-${stamp}`;
const evidence=`${OUTPUT}/formal-build-${stamp}`;
fs.mkdirSync(evidence,{recursive:true});
assert(path.resolve(outputRoot).startsWith(path.resolve('.codex-temp')+path.sep));
assert(!fs.existsSync(outputRoot),'Use a fresh isolated build output');
const before=await computeWechatSourceFingerprint(process.cwd()),steps=[];
async function run(name,args,env={}){
 const start=Date.now(),stream=fs.createWriteStream(`${evidence}/${name}.log`,{flags:'wx'});
 const child=spawn(process.execPath,args,{cwd:process.cwd(),env:{...process.env,...env},stdio:['ignore','pipe','pipe'],windowsHide:true});
 child.stdout.on('data',b=>stream.write(b));child.stderr.on('data',b=>stream.write(b));
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 await new Promise(r=>stream.end(r));
 const row={name,command:[process.execPath,...args],environment:env,exitCode:code,durationMs:Date.now()-start,log:`${evidence}/${name}.log`};
 steps.push(row);console.log(JSON.stringify(row));assert.equal(code,0,`${name} failed`);
}
try{
 await run('web',['node_modules/vite/bin/vite.js','build','--outDir',`${outputRoot}/web`]);
 const env={WECHAT_OUTPUT_DIR:`${outputRoot}/wechat`};
 await run('wechat',['scripts/build-wechat.mjs'],env);
 await run('wechat-verify',['tools/verify-wechat-project.mjs'],env);
 const after=await computeWechatSourceFingerprint(process.cwd());
 assert.equal(after,before,'Build source inputs changed during verification');
 writeNew(`${evidence}/report.json`,{status:'PASS',ruleVersion:lock.activeVersion,outputRoot,sourceFingerprint:before,steps,published:false});
 console.log(JSON.stringify({status:'PASS',report:`${evidence}/report.json`,outputRoot}));
}catch(error){
 writeNew(`${evidence}/report.json`,{status:'FAIL',ruleVersion:lock.activeVersion,outputRoot,sourceFingerprintBefore:before,sourceFingerprintAfter:await computeWechatSourceFingerprint(process.cwd()),steps,error:error.stack,published:false});
 throw error;
}
