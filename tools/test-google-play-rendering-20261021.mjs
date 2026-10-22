import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { instrumentGooglePlayGamePerformance,instrumentGooglePlayHostPerformance } from './google-play-performance-plugin.mjs';
const out=resolve('.codex-temp/google-play-performance-20261021/rendering-pixels');await mkdir(out,{recursive:true});
const source=await readFile('src/platform/WebHost.ts','utf8'),game=await readFile('src/game/ColorEscapeGame.ts','utf8');
assert.equal(instrumentGooglePlayHostPerformance(source).split('Math.min(window.devicePixelRatio || 1, 1.5)').length,3);
assert.throws(()=>instrumentGooglePlayHostPerformance(source.replace('Math.min(window.devicePixelRatio || 1, 2)','Math.min(window.devicePixelRatio || 1, 3)')));
const projected=instrumentGooglePlayGamePerformance(game);assert.ok(projected.includes('if (!this.artReady) {\n        ctx.drawImage(physicalBackdrop'));
const compiled=await build({entryPoints:['src/googlePlay/rendering.ts'],bundle:true,format:'iife',globalName:'gpRendering',write:false,logLevel:'silent'});
const image='data:image/png;base64,'+(await readFile('public/assets/art/backgrounds/gameplay-formal-v1.png')).toString('base64');
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const results=[];
try{await page.setContent('<html><body></body></html>');await page.addScriptTag({content:compiled.outputFiles[0].text});
for(const [width,height,dpr] of [[496,1078,1],[393,852,1.5],[320,568,1.5],[360,840,1.5],[768,1024,1.5],[1024,768,1.5]]){
const result=await page.evaluate(async({width,height,dpr,image})=>{const img=new Image();img.src=image;await img.decode();const scale=Math.min(width/496,height/1078),W=Math.round(width*dpr),H=Math.round(height*dpr);const rect={x:(width-496*scale)/2*dpr,y:(height-1078*scale)/2*dpr,width:496*scale*dpr,height:1078*scale*dpr};let draws=0;const canvases=[false,true].map(optimized=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#211f5e';ctx.fillRect(0,0,W,H);const s=Math.max(W/img.naturalWidth,H/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;const backdrop=()=>{if(optimized)draws++;ctx.drawImage(img,(W-iw)/2,(H-ih)/2,iw,ih);};if(optimized)gpRendering.drawGooglePlayViewportGutters(ctx,W,H,rect,backdrop);else backdrop();ctx.setTransform(scale*dpr,0,0,scale*dpr,rect.x,rect.y);ctx.fillStyle='#211f5e';ctx.fillRect(0,0,496,1078);ctx.drawImage(img,0,0,496,1078);return c;});const a=canvases[0].getContext('2d').getImageData(0,0,W,H).data,b=canvases[1].getContext('2d').getImageData(0,0,W,H).data;let differences=0,maxDelta=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])differences++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]));}return {width,height,dpr,backingWidth:W,backingHeight:H,rect,differences,maxDelta,draws,baseline:canvases[0].toDataURL(),optimized:canvases[1].toDataURL()};},{width,height,dpr,image});
for(const label of ['baseline','optimized']){await writeFile(resolve(out,`${width}x${height}-${label}.png`),Buffer.from(result[label].split(',')[1],'base64'));delete result[label];}results.push(result);assert.equal(result.differences,0,JSON.stringify(result));}
}finally{await browser.close();await writeFile(resolve(out,'report.json'),JSON.stringify({status:results.length===6&&results.every(r=>r.differences===0)?'PASS':'FAIL',scope:'Real Canvas2D compositing of backdrop plus following opaque logical background, including fractional edges; this proves only gutter optimization equivalence, not DPR image equality.',results},null,2));}
console.log(JSON.stringify({out,results},null,2));
