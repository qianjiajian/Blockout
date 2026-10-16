import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const output='deliverables/daily-formal-v3-20261008/design/reverse-source2-pair-01';
const inputs=[{label:'旧 source2 成功原型 · L31/U40',name:'reference',file:'deliverables/daily-formal-v2-20261007/design-lab/irregular-bottom-split-d3-candidate-44.json'},
 {label:'新逆构造候选 · L21/U30 · 尚未入选',name:'candidate',file:'deliverables/daily-formal-v3-20261008/design/reverse-legacy6-07/candidate-000.json'}];
const hash=b=>createHash('sha256').update(b).digest('hex'),bindings={};
async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else bindings[p]=hash(await fs.readFile(p));}}
await bindTree('src');await fs.mkdir(output,{recursive:false});
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),rows=[];
try{
 for(const input of inputs){
  const bytes=await fs.readFile(input.file),packet=JSON.parse(bytes),page=await browser.newPage({viewport:{width:496,height:1078}}),errors=[];
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{window.__STORAGE_VIOLATIONS__.push(m);throw Error('No player storage');};indexedDB.open=()=>{throw Error('No player database');};});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/daily-challenge/formal-v3/pointer.html`);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
  await page.evaluate(level=>{const game=window.__COLOR_ESCAPE__;game.loadLevel(level.id,false,false,level);game.updateToastVisible=false;game.screen='playing';game.dirty=true;game.scheduleFrame();},packet.level);
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
  const state=await page.evaluate(()=>({debug:window.__COLOR_ESCAPE__.getDebugState(),storage:window.__STORAGE_VIOLATIONS__}));
  if(errors.length||state.storage.length)throw Error('Actual opening capture error/storage access');
  const image=`${output}/${input.name}.png`;await page.screenshot({path:image});
  rows.push({...input,fileSha256:hash(bytes),levelSha256:packet.levelSha256,image,imageSha256:hash(await fs.readFile(image)),errors,storage:state.storage,
   missingWholeBlockIds:state.debug.art.formalGameplay.missingWholeBlockIds,board:state.debug.board});
  if(hash(await fs.readFile(input.file))!==hash(bytes))throw Error('Input changed');await page.close();
 }
 const sheet=await browser.newPage({viewport:{width:1032,height:1160}}),cards=[];
 for(const row of rows)cards.push(`<article><header>${row.label}</header><img src="data:image/png;base64,${(await fs.readFile(row.image)).toString('base64')}"></article>`);
 await sheet.setContent(`<style>body{margin:0;padding:12px;background:#f0eff3;font:20px sans-serif}main{display:flex;gap:16px}article{width:496px;background:white}header{height:45px;display:flex;align-items:center;justify-content:center}img{display:block;width:496px}</style><main>${cards.join('')}</main>`);
 await sheet.evaluate(()=>Promise.all([...document.images].map(x=>x.decode())));const pair=`${output}/pair.png`;await sheet.screenshot({path:pair,fullPage:true});
 for(const[p,sha]of Object.entries(bindings))if(hash(await fs.readFile(p))!==sha)throw Error('Production source changed during capture');
 await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'ACTUAL_CANVAS_OPENINGS_CAPTURED_NO_SELECTION_OR_POINTER_CLAIM',formalReady:false,
  candidateOnly:true,sourceBindings:bindings,rows,pair,pairSha256:hash(await fs.readFile(pair)),newSearches:0,routeReplayed:false,
  playerSaveTouched:false,toolSha256:hash(await fs.readFile('tools/daily-challenge/formal-v3/design-preview-source2-pair.mjs'))},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,pair,rows:rows.length}));
}finally{await browser.close();await server.close();}
