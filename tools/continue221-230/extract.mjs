import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const video='C:/Users/Administrator/Desktop/block out/参考视频/221-230.mp4';
const out=process.argv[2], times=process.argv.slice(3).map(Number);
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
try{
 const page=await browser.newPage();await page.goto(pathToFileURL(video).href);
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 for(const t of times){
  const raw=await page.locator('video').evaluate(async(v,t)=>{
   v.pause();if(Math.abs(v.currentTime-t)>0.001){await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});}
   const c=document.createElement('canvas');c.width=810;c.height=1080;
   c.getContext('2d').drawImage(v,555,0,810,1080,0,0,810,1080);return c.toDataURL('image/png').split(',')[1];
  },t);
  fs.writeFileSync(path.join(out,`frame-${t}.png`),Buffer.from(raw,'base64'));
 }
}finally{await browser.close();}
