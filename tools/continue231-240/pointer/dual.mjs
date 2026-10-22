import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const args=process.argv.slice(2);
assert(args.length,'Provide qualified JSON files, or --smoke');
for(const [width,height]of [[320,568],[496,1078]]){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tools/continue231-240/pointer/run.mjs',...args],{
   cwd:process.cwd(),windowsHide:true,stdio:'inherit',env:{...process.env,REMAKE_VIEWPORT_WIDTH:String(width),REMAKE_VIEWPORT_HEIGHT:String(height)},
  });
  child.once('error',reject);
  child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${width}×${height} failed: ${signal??code}`)));
 });
}
