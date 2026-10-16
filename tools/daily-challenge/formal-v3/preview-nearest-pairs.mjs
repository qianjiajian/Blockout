import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {compareLayouts} from './diversity.mjs';

// Prior actual Canvas captures only. This makes comparison sheets, not a
// visual PASS or a substitute for final production Pointer acceptance.
const [indexFile,output,...captureReports]=process.argv.slice(2);
if(!indexFile||!output||!captureReports.length)throw Error('selection-index new-output-directory capture-report...');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const indexBytes=await fs.readFile(indexFile),index=JSON.parse(indexBytes);
const entries=await Promise.all(index.files.map(async p=>({receipt:p,...await read(p)})));
const captures=new Map(),bindings={};
for(const p of captureReports){const bytes=await fs.readFile(p);bindings[p]=sha(bytes);
 for(const row of JSON.parse(bytes).rows)captures.set(row.levelSha256,row);}
for(const entry of entries){const image=captures.get(entry.levelSha256)?.image;
 if(!image||sha(await fs.readFile(image.path))!==image.sha256)throw Error(`Missing or changed actual capture ${entry.formalId}`);}
const comparisons=[];
for(let a=0;a<entries.length;a++)for(let b=a+1;b<entries.length;b++){
 const similarity=compareLayouts(entries[a].level,entries[b].level);
 comparisons.push({a:entries[a],b:entries[b],...similarity});}
comparisons.sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity||b.gateGeometrySimilarity-a.gateGeometrySimilarity);
const chosen=comparisons.slice(0,12),sheets=[];
await fs.mkdir(output,{recursive:false});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:2400,height:1600}});
 for(let start=0;start<chosen.length;start+=3){
  const rows=chosen.slice(start,start+3),cards=[];
  for(const row of rows){const sides=[];
   for(const side of ['a','b']){const entry=row[side],capture=captures.get(entry.levelSha256);
    const uri=`data:image/png;base64,${(await fs.readFile(capture.image.path)).toString('base64')}`;
    sides.push(`<figure><figcaption>${entry.newestMechanism} D${entry.difficulty}-${entry.slot}<br>source ${entry.sourceLevelId}</figcaption><img src="${uri}"></figure>`);}
   cards.push(`<article><header>共有整块足迹 ${(row.footprintSimilarity*100).toFixed(1)}% · 出口 ${(row.gateGeometrySimilarity*100).toFixed(1)}%</header><div>${sides.join('')}</div></article>`);}
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#f1edf6;font:22px sans-serif;color:#342443}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}article{background:white}header{padding:12px}article>div{display:grid;grid-template-columns:1fr 1fr}figure{margin:0}figcaption{padding:10px}img{width:100%;display:block}</style><h1>当前候选最近似配对 ${start+1}–${start+rows.length}：等待实际审阅</h1><main>${cards.join('')}</main>`);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  const p=`${output}/pairs-${String(sheets.length+1).padStart(2,'0')}.jpg`;
  await page.screenshot({path:p,fullPage:true,type:'jpeg',quality:93});
  sheets.push({path:p,sha256:sha(await fs.readFile(p)),pairs:rows.map(({a,b,...similarity})=>({a:a.formalId,b:b.formalId,...similarity}))});
 }
}finally{await browser.close();}
const report={status:'ACTUAL_CAPTURE_PAIR_SHEETS_AWAITING_REVIEW',formalReady:false,indexFile,indexSha256:sha(indexBytes),captureReportBindings:bindings,
 count:entries.length,sheets,rows:chosen.map(({a,b,...similarity})=>({...similarity,a:{formalId:a.formalId,levelSha256:a.levelSha256,receipt:a.receipt,image:captures.get(a.levelSha256).image},b:{formalId:b.formalId,levelSha256:b.levelSha256,receipt:b.receipt,image:captures.get(b.levelSha256).image}}))};
await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({compared:entries.length,pairs:chosen.length,sheets:sheets.length,formalReady:false}));
