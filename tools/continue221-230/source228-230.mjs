import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const out=path.resolve('deliverables/continue221-230-20260930/source228-230');
fs.mkdirSync(out,{recursive:true});
const video='C:/Users/Administrator/Desktop/block out/参考视频/221-230.mp4';
const seconds=(process.argv[2]??'681,682,683,684,685,686,687,688,689,690,775,776,777,778,779,780,848,850,852,854,856,858,860,862').split(',').map(Number);
const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
try{
 const page=await browser.newPage(); await page.goto(pathToFileURL(video).href);
 await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const records=[];
 for(const second of seconds){
  const data=await page.locator('video').evaluate(async(v,t)=>{
   v.pause();if(Math.abs(v.currentTime-t)>.01)await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});
   const c=document.createElement('canvas');c.width=810;c.height=1080;c.getContext('2d').drawImage(v,555,0,810,1080,0,0,810,1080);return c.toDataURL('image/png').split(',')[1];
  },second);
  const bytes=Buffer.from(data,'base64'),file=`frame-${second}.png`;fs.writeFileSync(path.join(out,file),bytes);records.push({second,file,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 fs.writeFileSync(path.join(out,`extraction-${seconds[0]}-${seconds.at(-1)}.json`),JSON.stringify({video,videoSha256:createHash('sha256').update(fs.readFileSync(video)).digest('hex'),crop:{x:555,y:0,width:810,height:1080},records},null,2));
 console.log(JSON.stringify({out,frames:records.length}));
}finally{await browser.close();}
