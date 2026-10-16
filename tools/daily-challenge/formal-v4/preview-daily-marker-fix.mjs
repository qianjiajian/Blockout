import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {levelSha256} from '../formal-v2/contract.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: preview-daily-marker-fix.mjs isolated-index new-output-directory');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(input),index=JSON.parse(bytes),candidates=[];
for(const file of index.files){const b=await fs.readFile(file),q=JSON.parse(b);assert(q.accepted);assert.equal(levelSha256(q.level),q.levelSha256);candidates.push({file,sha256:hash(b),q});}
await fs.mkdir(output,{recursive:false});
const bindings={};
async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else bindings[p]=hash(await fs.readFile(p));}}
await bindTree('src');
for(const p of ['tools/daily-challenge/formal-v4/preview-daily-marker-fix.mjs','tools/daily-challenge/formal-v2/contract.mjs','tools/daily-challenge/formal-v3/pointer.html','tools/daily-challenge/formal-v3/pointer-browser.mjs'])bindings[p]=hash(await fs.readFile(p));
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),rows=[],sheets=[];
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{window.__STORAGE_VIOLATIONS__.push(m);throw Error('No persistent storage');};indexedDB.open=()=>{throw Error('No player database');};});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/daily-challenge/formal-v3/pointer.html`);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
  await page.evaluate(()=>{
   const g=window.__COLOR_ESCAPE__,original=g.drawBlockMechanicMarkers.bind(g);
   g.drawBlockMechanicMarkers=function(block,cells,board){
    const draws=[],labels=[],ctx=this.ctx,draw=ctx.drawImage,label=this.label;
    ctx.drawImage=function(img,...coords){draws.push({src:img.src,coords});return draw.call(this,img,...coords);};
    this.label=function(...args){labels.push(args);return label.apply(this,args);};
    try{return original(block,cells,board);}finally{ctx.drawImage=draw;this.label=label;
     if(block.keyId||block.lockedBy)window.__MARKER_DRAWS__[block.id]={block:structuredClone(block),cells,board,draws,labels};}
   };
  });
  for(const item of candidates){
   await page.evaluate(q=>{window.__MARKER_DRAWS__={};window.__DAILY_CANDIDATE__.load({...q,schemaVersion:3},false);},item.q);
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
   const audit=await page.evaluate(async()=>{
    const g=window.__COLOR_ESCAPE__,{dailyKeyLockMarkerLayout}=await import('/src/game/dailyKeyLockMarkerLayout.ts');
    const markerRows=Object.values(window.__MARKER_DRAWS__).map(row=>{
     const layout=dailyKeyLockMarkerLayout(row.cells,row.board,row.block.keyId?'key':'lock',1,Boolean(row.block.movementAxis));
     const allBitmapsContained=row.draws.every(({coords:[x,y,w,h]})=>x>=layout.clip.x-1e-7&&y>=layout.clip.y-1e-7&&x+w<=layout.clip.x+layout.clip.width+1e-7&&y+h<=layout.clip.y+layout.clip.height+1e-7);
     return {...row,cell:layout.cell,clip:layout.clip,anchor:layout.anchor,allBitmapsContained};
    });
    return {daily:Boolean(g.dailyChallengeRunInfo()),level:g.model.level,debug:g.getDebugState(),markers:markerRows,storage:window.__STORAGE_VIOLATIONS__};
   });
   assert.equal(levelSha256(audit.level),item.q.levelSha256);assert(audit.daily);assert.deepEqual(errors,[]);assert.deepEqual(audit.storage,[]);assert(audit.markers.every(m=>m.allBitmapsContained));
   const imagePath=`${output}/${item.q.formalId}-${viewport.width}x${viewport.height}.png`;
   await page.screenshot({path:imagePath});
   rows.push({formalId:item.q.formalId,viewport,receipt:{path:item.file,sha256:item.sha256},levelSha256:item.q.levelSha256,image:{path:imagePath,sha256:hash(await fs.readFile(imagePath))},markers:audit.markers,board:audit.debug.board,missingWholeBlockIds:audit.debug.art.formalGameplay.missingWholeBlockIds,dailyMode:true});
  }
  await page.close();
 }
 const sheet=await browser.newPage({viewport:{width:2100,height:1400}});
 for(const viewportWidth of [320,496]){
  const list=rows.filter(r=>r.viewport.width===viewportWidth),cards=[];
  for(const r of list)cards.push(`<article><header>${r.formalId}<br>${r.viewport.width}×${r.viewport.height}</header><img src="data:image/png;base64,${(await fs.readFile(r.image.path)).toString('base64')}"></article>`);
  await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#eee;color:#211836;font:14px sans-serif}main{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}article{background:white}header{padding:8px;overflow-wrap:anywhere}img{display:block;width:100%;height:auto}</style><h1>Current UI · daily candidate injection · ${viewportWidth}px · not formal Pointer</h1><main>${cards.join('')}</main>`);
  await sheet.evaluate(()=>Promise.all([...document.images].map(x=>x.decode())));
  const p=`${output}/sheet-${viewportWidth}.jpg`;await sheet.screenshot({path:p,fullPage:true,type:'jpeg',quality:94});sheets.push({path:p,sha256:hash(await fs.readFile(p))});
 }
 for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h,`Source drift ${p}`);
 await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'CURRENT_DAILY_MARKERS_CAPTURED',input:{path:input,sha256:hash(bytes)},sourceBindings:bindings,rows,sheets,candidateInjection:true,formalRegistryIdentity:false,formalPointerPass:false,naturalTimeCompletion:false,newGameplaySearches:0,publicClaimsStarted:0,playerSaveTouched:false,harnessMetadataSchemaOverride:3,physicalLevelUnchanged:true},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({captures:rows.length,markers:rows.reduce((n,r)=>n+r.markers.length,0),sheets,status:'CURRENT_DAILY_MARKERS_CAPTURED'}));
}finally{await browser.close();await server.close();}
