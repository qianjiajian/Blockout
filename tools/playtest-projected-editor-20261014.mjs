import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const probe=JSON.parse(await readFile(process.argv[2]??'.codex-temp/perf-five-20261014/projection-probe-1791970162109/report.json','utf8'));
if(process.argv[3])probe.viteMetrics.projected.outDir=resolve(process.argv[3]);
const output=resolve(`playtest-results/projected-editor-20261014/${Date.now()}`);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),report={status:'RUNNING',scope:'Vite production editor UI and real Worker smoke tests; synthetic localStorage map only; no save endpoint or solving. Deliberately one-cell candidate rows exercise validation without expensive search.',directories:Object.fromEntries(Object.entries(probe.viteMetrics).map(([name,value])=>[name,value.outDir])),rows:[]};
try{for(const variant of ['before','projected']){
 const root=probe.viteMetrics[variant].outDir;
 const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/__board-editor/status'){res.writeHead(200,{'Content-Type':'application/json'}).end('{"ok":false}');return;}const file=resolve(root,'.'+p);assert(file.startsWith(root+sep));const bytes=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css'}[extname(file)]??'application/octet-stream'}).end(bytes);}catch(e){res.writeHead(404).end(String(e));}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{const data=new Map();window.__SYNTHETIC_STORAGE_CALLS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(k,v){window.__SYNTHETIC_STORAGE_CALLS__.push({n,k});if(n==='getItem')return data.get(k)??null;if(n==='setItem')data.set(k,String(v));if(n==='removeItem')data.delete(k);if(n==='clear')data.clear();};});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 try{await page.goto(origin+'/board-editor.html');await page.waitForSelector('#level-select option',{state:'attached'});assert.equal(await page.locator('#level-select option').count(),200);const row={variant,levels:[]};report.rows.push(row);
  const worker=probe.viteMetrics[variant].files.find(f=>f.file.includes('boardEditorWorker')).file;
  for(const id of [1,200]){await page.selectOption('#level-select',String(id));const level=await page.evaluate(()=>({heading:document.querySelector('#level-heading').textContent,payload:JSON.parse(document.querySelector('#shape-code').value),gridCells:document.querySelector('#board-grid').children.length}));assert.equal(level.payload.levelId,id);
   level.worker=await page.evaluate(async({file,id,width,height})=>await new Promise((done,fail)=>{const w=new Worker('/'+file);const timer=setTimeout(()=>{w.terminate();fail(Error('worker timeout'));},10000);w.onerror=e=>{clearTimeout(timer);w.terminate();fail(Error(e.message));};w.onmessage=e=>{clearTimeout(timer);w.terminate();done(e.data);};w.postMessage({levelId:id,revision:'smoke-'+id,rows:Array.from({length:height},(_,y)=>y===0?'#'+'.'.repeat(width-1):'.'.repeat(width))});}),{file:worker,id,width:level.payload.width,height:level.payload.height});
   assert.equal(level.worker.revision,'smoke-'+id);assert.equal(level.worker.accepted,false);assert(level.worker.errors.length>0);await page.screenshot({path:resolve(output,`${variant}-${id}.png`)});row.levels.push(level);
  }row.storage=await page.evaluate(()=>window.__SYNTHETIC_STORAGE_CALLS__);assert.deepEqual(errors,[]);
 }finally{await context.close();await new Promise(done=>server.close(done));}
}assert.deepStrictEqual(report.rows[1].levels,report.rows[0].levels);report.status='PASS';}catch(e){report.status='FAIL';report.error=String(e.stack??e);}finally{await browser.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,output,error:report.error}));if(report.status!=='PASS')process.exitCode=1;}
