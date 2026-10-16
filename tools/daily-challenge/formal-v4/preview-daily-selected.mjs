import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {levelSha256} from '../formal-v2/contract.mjs';

// V4 full-object candidate-only visual inspection. No formal registry, route, settlement or
// mathematical acceptance is claimed by an opening screenshot.
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: preview-daily-selected.mjs selection-index new-output-directory');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const indexBytes=await fs.readFile(input),index=JSON.parse(indexBytes);
const candidates=[];
for(const file of index.files){const bytes=await fs.readFile(file),receipt=JSON.parse(bytes);
 if(!receipt.accepted||levelSha256(receipt.level)!==receipt.levelSha256)throw Error(`Invalid candidate ${file}`);
 candidates.push({file,receipt,receiptSha256:hash(bytes)});}
await fs.mkdir(output,{recursive:false});
const sourceBindings={};
async function bindTree(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name).replaceAll('\\','/');if(entry.isDirectory())await bindTree(file);else sourceBindings[file]=hash(await fs.readFile(file));}}
await bindTree('src');
for(const f of ['tools/daily-challenge/formal-v4/preview-daily-selected.mjs','tools/daily-challenge/formal-v3/pointer-browser.mjs','tools/daily-challenge/formal-v3/pointer.html'])sourceBindings[f]=hash(await fs.readFile(f));
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),rows=[];let next=0;
try{
 await Promise.all(Array.from({length:3},async()=>{
  const page=await browser.newPage({viewport:{width:496,height:1078}});
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=()=>{window.__STORAGE_VIOLATIONS__.push(method);throw Error('No player storage');};indexedDB.open=()=>{throw Error('No player database');};});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/daily-challenge/formal-v3/pointer.html`);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
  while(next<candidates.length){
   const item=candidates[next++],candidate=item.receipt;
   const loaded=await page.evaluate(candidate=>window.__DAILY_CANDIDATE__.load({...candidate,schemaVersion:3},false),candidate);
   if(levelSha256(loaded.level)!==candidate.levelSha256||loaded.formalRegistryIdentity)throw Error('Daily opening object mismatch');
   if(!await page.evaluate(()=>Boolean(window.__COLOR_ESCAPE__.dailyChallengeRunInfo())))throw Error('Daily presentation branch is not active');
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
   const imagePath=`${output}/${candidate.formalId}.png`;
   await page.screenshot({path:imagePath});
   const state=await page.evaluate(()=>({debug:window.__COLOR_ESCAPE__.getDebugState(),storage:window.__STORAGE_VIOLATIONS__}));
   if(errors.length||state.storage.length)throw Error('Preview encountered errors or persistent storage');
   rows.push({formalId:candidate.formalId,stageKey:candidate.stageKey,difficulty:candidate.difficulty,slot:candidate.slot,
    sourceLevelId:candidate.sourceLevelId,L:candidate.L,U:candidate.U,levelSha256:candidate.levelSha256,
    receipt:item.file,receiptSha256:item.receiptSha256,image:{path:imagePath,sha256:hash(await fs.readFile(imagePath))},
    missingWholeBlockIds:state.debug.art.formalGameplay.missingWholeBlockIds,board:state.debug.board});
   if(rows.length%10===0)console.log(JSON.stringify({openings:rows.length,total:candidates.length}));
  }await page.close();
 }));
 for(const[file,sha]of Object.entries(sourceBindings))if(hash(await fs.readFile(file))!==sha)throw Error(`Source changed during capture: ${file}`);
 rows.sort((a,b)=>a.formalId.localeCompare(b.formalId));
 const sheetPage=await browser.newPage({viewport:{width:2480,height:2700}}),sheets=[];
 for(let offset=0;offset<rows.length;offset+=10){
  const batch=rows.slice(offset,offset+10),cards=[];
  for(const row of batch)cards.push(`<article><header>${row.stageKey.replace('mechanisms-','')} D${row.difficulty}-${row.slot}<br>源${row.sourceLevelId} · L${row.L}/U${row.U}</header><img src="data:image/png;base64,${(await fs.readFile(row.image.path)).toString('base64')}"></article>`);
  await sheetPage.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:30px;width:2480px;background:#f4f1f9;color:#382842;font:22px sans-serif}main{display:grid;grid-template-columns:repeat(5,1fr);gap:18px}article{background:white}header{padding:12px;line-height:1.4}img{width:100%;height:auto;display:block}</style><h1>候选开局审阅 ${offset+1}–${offset+batch.length}（尚未正式接入）</h1><main>${cards.join('')}</main>`);
  await sheetPage.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
  const file=`${output}/sheet-${String(sheets.length+1).padStart(2,'0')}.jpg`;
  await sheetPage.screenshot({path:file,fullPage:true,type:'jpeg',quality:91});sheets.push({path:file,sha256:hash(await fs.readFile(file)),formalIds:batch.map(row=>row.formalId)});
 }
 await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'CANDIDATE_OPENINGS_CAPTURED_NOT_FORMAL',input,inputSha256:hash(indexBytes),candidateInjection:true,dailyPresentationBranch:true,receiptMetadataOverride:{schemaVersion:3,originalReceiptsUnchanged:true},
  formalRegistryIdentity:false,formalReady:false,routeValidated:false,playerSaveTouched:false,sourceBindings,rows,sheets},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({openings:rows.length,sheets:sheets.length,formalReady:false}));
}finally{await browser.close();await server.close();}
