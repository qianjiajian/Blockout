import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=resolve(root,'playtest-results/gate-rim72-20260927/ui');
const before=JSON.parse(await readFile(resolve(output,'before/report.json')));
const after=JSON.parse(await readFile(resolve(output,'after/report.json')));
const report={scope:'Same exact formal level data/layout, with natural-clock seconds compared separately. Pixel regions decoded from original browser PNG captures; no images edited.',cases:[]};
const browser=await chromium.launch({headless:true});
try{
 assert.equal(before.passed,true);assert.equal(after.passed,true);assert.equal(before.sourceUnchanged,true);assert.equal(after.sourceUnchanged,true);
 report.changedSources=Object.keys(before.before).filter(p=>before.before[p]!==after.before[p]);
 assert.deepEqual(report.changedSources.sort(),['src/game/ColorEscapeGame.ts','src/game/boardRim.ts']);
 const page=await browser.newPage();
 for(const a of after.cases){
  const b=before.cases.find(c=>c.name===a.name);if(!a.screenshot)continue;
  assert.deepEqual(a.level,b.level);assert.deepEqual(a.board,b.board);assert.deepEqual(a.transform,b.transform);
  const clean=s=>{const copy=structuredClone(s);delete copy.remainingSeconds;return copy;};assert.deepEqual(clean(a.snapshot),clean(b.snapshot));
  const files=await Promise.all(['before','after'].map(stage=>readFile(resolve(output,stage,a.screenshot))));
  const regions=a.portals.map(p=>{const r=p.rect,t=a.transform;return{gateId:p.gateId,color:p.color,side:p.portal.side,x:Math.floor(r.x*t.scale+t.offsetX)-3,y:Math.floor(r.y*t.scale+t.offsetY)-3,width:Math.ceil(r.width*t.scale)+6,height:Math.ceil(r.height*t.scale)+6};});
  const pixels=await page.evaluate(async({images,regions})=>{const decoded=await Promise.all(images.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);resolve({width:canvas.width,height:canvas.height,rgba:ctx.getImageData(0,0,canvas.width,canvas.height).data});};image.onerror=reject;image.src=src;})));const [before,after]=decoded;return regions.map(r=>{let changed=0,total=0;for(let y=Math.max(0,r.y);y<Math.min(before.height,r.y+r.height);y++)for(let x=Math.max(0,r.x);x<Math.min(before.width,r.x+r.width);x++){const i=(y*before.width+x)*4;total++;if([0,1,2,3].some(c=>before.rgba[i+c]!==after.rgba[i+c]))changed++;}return{...r,changedPixels:changed,totalPixels:total};});},{images:files.map(f=>'data:image/png;base64,'+f.toString('base64')),regions});
  const selected=a.portals.filter(p=>a.level.id!==72||['blue','pink'].includes(p.color));
  const row={name:a.name,levelSha256:a.levelSha256,modelExceptClockUnchanged:true,naturalRemainingSeconds:{before:b.snapshot.remainingSeconds,after:a.snapshot.remainingSeconds},imageBytesEqual:files[0].equals(files[1]),pixels,portals:selected.map(p=>({color:p.color,size:p.portal.size,rect:p.rect,depthBefore:b.portals.find(q=>q.gateId===p.gateId&&JSON.stringify(q.portal)===JSON.stringify(p.portal)).depth,depthAfter:p.depth,samplesBefore:b.samples.find(q=>q.gateId===p.gateId),samplesAfter:a.samples.find(q=>q.gateId===p.gateId)}))};
  if(a.level.id===72){for(const p of row.portals){assert.equal(p.size,3);assert.equal(p.depthBefore,95.001);assert.equal(p.depthAfter,379.999);}if(a.forcedOpacity===0)assert.ok(pixels.filter(p=>['blue','pink'].includes(p.color)).every(p=>p.changedPixels===0),'Retired gate rim/corners exactly preserved');else assert.ok(pixels.filter(p=>['blue','pink'].includes(p.color)).every(p=>p.changedPixels>0),'Formerly covered lower mouth changes');}
  if(a.level.id===1)assert.ok(pixels.every(p=>p.changedPixels===0),'Lv1 mouth and lower seam preserved');
  if(a.level.id===111)assert.ok(pixels.filter(p=>p.side==='bottom').every(p=>p.changedPixels===0),'Lv111 bottom mouths/corner margins preserved');
  report.cases.push(row);
 }
 report.beforeAfterSourceStable=true;report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}finally{await writeFile(resolve(output,'comparison.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.map(c=>({name:c.name,imageBytesEqual:c.imageBytesEqual,pixels:c.pixels.filter(p=>['blue','pink'].includes(p.color)||p.side==='bottom')})),error:report.error},null,2));
