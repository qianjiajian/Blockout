import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const [folder]=process.argv.slice(2);assert(folder,'Gallery directory required');
const index=JSON.parse(await fs.readFile(path.join(folder,'index.json'),'utf8'));
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:920}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(pathToFileURL(path.resolve(folder,'index.html')).href);
 await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode();}));});
 assert.equal(await page.locator('article:visible').count(),index.formalAccepted);
 assert(await page.locator('h1').innerText().then(s=>s.includes(`${index.formalAccepted}/300`)));
 const filters=[];
 for(const field of ['stage','difficulty']){
  const values=[...new Set(index.rows.map(r=>String(field==='stage'?r.stageKey:r.difficulty)))];
  for(const value of values){await page.locator(`#${field}`).selectOption(value);
   const expected=index.rows.filter(r=>String(field==='stage'?r.stageKey:r.difficulty)===value).length;
   const actual=await page.locator('article:visible').count();assert.equal(actual,expected);filters.push({field,value,expected,actual});}
  await page.locator(`#${field}`).selectOption('');
 }
 const imageChecks=await page.locator('img').evaluateAll(imgs=>imgs.map(x=>({complete:x.complete,width:x.naturalWidth,height:x.naturalHeight})));
 assert(imageChecks.every(x=>x.complete&&x.width===320&&x.height===568));assert.deepEqual(errors,[]);
 const screenshot=path.join(folder,'gallery.png');await page.screenshot({path:screenshot,fullPage:true});
 const report={status:'GALLERY_RENDER_AND_FILTERS_PASS',formalAccepted:index.formalAccepted,filters,imageChecks,errors,
  screenshot:{path:screenshot,sha256:createHash('sha256').update(await fs.readFile(screenshot)).digest('hex')},
  gameplayExecuted:false,playerSaveTouched:false};
 await fs.writeFile(path.join(folder,'render-check.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,formalAccepted:index.formalAccepted,screenshot}));
}finally{await browser.close();}
