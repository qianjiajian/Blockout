import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {fileSha256} from './emit-catalog.mjs';
import {loadVerifiedRuntimeDataset,validatePointerBatch,validateFinalPointerEvidence,validateScreenshotFiles,currentPointerBindings} from './final-acceptance.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const labels={1:'难',2:'超难',3:'超超难'};
const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalized=file=>file.replaceAll('\\','/');

/** Export the actual final Pointer images before visual acceptance. This tool
 * never writes a visual PASS: each of the 45 sheets must actually be inspected. */
export async function exportContactSheets(runtimeDirectory,pointerDirectory,output){
 const dataset=await loadVerifiedRuntimeDataset(runtimeDirectory);
 const batchFile=`${pointerDirectory}/report.json`,batchBytes=await fs.readFile(batchFile),batch=JSON.parse(batchBytes);
 validatePointerBatch(batch,dataset.expected);
 if(batch.catalogRevision!==dataset.report.catalogRevision||batch.runtimeReportSha256!==dataset.reportSha256||batch.runtimeIndexSha256!==dataset.indexSha256)
  throw Error('Pointer images do not belong to the verified runtime dataset');
 if(levelSha256(batch.pointerBindings)!==levelSha256(await currentPointerBindings()))throw Error('Stale Pointer implementation');
 const selected=batch.rows.filter(row=>row.viewport==='496x1078');
 if(selected.length!==450)throw Error('All 450 large viewport opening images are required');
 const groups=[],stages=dataset.runtime.MECHANISM_GUIDE;
 for(const [index,stage]of stages.entries())for(const difficulty of [1,2,3]){
  const stageKey=`mechanisms-${stage.id}-${stage.unlockLevel}`;
  const rows=selected.filter(row=>{const receipt=dataset.receipts.get(row.formalId);return receipt.stageKey===stageKey&&receipt.difficulty===difficulty;});
  if(rows.length!==10)throw Error(`Incomplete group ${stageKey}/${difficulty}`);
  rows.sort((a,b)=>dataset.receipts.get(a.formalId).slot-dataset.receipts.get(b.formalId).slot);
  const items=[];
  for(const row of rows){
   const entry=dataset.entries.get(row.formalId),reportBytes=await fs.readFile(row.report),report=JSON.parse(reportBytes);
   if(fileSha256(reportBytes)!==row.reportSha256||entry.file!==row.file||entry.receiptSha256!==row.receiptSha256)
    throw Error(`Stale Pointer receipt ${row.formalId}`);
   validateFinalPointerEvidence(report,entry.receipt,row,dataset.report);await validateScreenshotFiles(report);
   const png=await fs.readFile(report.screenshots.opening.path);
   items.push({formalId:row.formalId,levelSha256:entry.receipt.levelSha256,opening:report.screenshots.opening,
    code:`${String(index+1).padStart(2,'0')}-D${difficulty}-${String(entry.receipt.slot).padStart(2,'0')}`,
    sourceLevelId:entry.receipt.sourceLevelId,L:entry.receipt.L,U:entry.receipt.U,png});
  }
  groups.push({stageKey,difficulty,title:stage.title,code:`${String(index+1).padStart(2,'0')}-D${difficulty}`,items});
 }
 if(groups.length!==45)throw Error('Exactly 45 groups required');
 await fs.mkdir(output,{recursive:false});
 const browser=await chromium.launch({headless:true}),reviewGroups=[];
 try{
  const page=await browser.newPage({viewport:{width:2480,height:2700},deviceScaleFactor:1});
  for(const group of groups){
   await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:2480px;padding:40px;background:#f3f0f8;color:#30263d;font-family:"Microsoft YaHei",sans-serif}
    h1{margin:0 0 12px;font-size:42px}p{font-size:22px;color:#74647e;margin:0 0 24px}
    main{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px}.card{overflow:hidden;background:white;border:1px solid #ded5e8;border-radius:12px}
    .head{padding:14px;font-size:24px;font-weight:700}.card img{display:block;width:100%;height:auto;aspect-ratio:496/1078;object-fit:contain}
    .meta{padding:14px;font-size:20px;line-height:1.7}</style>
    <h1>${escape(group.code)} · ${escape(group.title)} / ${labels[group.difficulty]}</h1>
    <p>正式运行开局原图 · 同阶段同难度10关 · 待逐图审阅</p><main>${group.items.map(item=>
     `<section class="card"><div class="head">${escape(item.code)}</div><img src="data:image/png;base64,${item.png.toString('base64')}" alt="${escape(item.formalId)}"><div class="meta">主线基底 ${item.sourceLevelId}<br>已证必挪下界 ${item.L} · 完整路线必挪 ${item.U}</div></section>`).join('')}</main>`);
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));});
   const sheetPath=normalized(path.join(output,`${group.code}.jpg`));
   await page.screenshot({path:sheetPath,fullPage:true,type:'jpeg',quality:92});
   const sheetBytes=await fs.readFile(sheetPath);
   reviewGroups.push({stageKey:group.stageKey,difficulty:group.difficulty,contactSheet:{path:sheetPath,sha256:fileSha256(sheetBytes)},
    review:{method:'actual-image-inspection',reviewer:null,reviewedAt:null,conclusion:'PENDING',findings:[],observations:[]},
    items:group.items.map(({formalId,levelSha256,opening})=>({formalId,levelSha256,opening}))});
   console.log(JSON.stringify({exported:reviewGroups.length,total:45,sheet:sheetPath}));
  }
 }finally{await browser.close();}
 const result={schemaVersion:3,scope:450,catalogRevision:dataset.report.catalogRevision,overviewViewport:'496x1078',
  status:'CONTACT_SHEETS_AWAITING_ACTUAL_REVIEW',formalReady:false,groups:reviewGroups,
  provenance:{runtimeReport:dataset.reportFile,runtimeReportSha256:dataset.reportSha256,pointerBatch:batchFile,pointerBatchSha256:fileSha256(batchBytes),
   exportTool:'tools/daily-challenge/formal-v3/export-contact-sheets.mjs',exportToolSha256:fileSha256(await fs.readFile('tools/daily-challenge/formal-v3/export-contact-sheets.mjs'))}};
 await fs.writeFile(`${output}/review-pending.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 await fs.writeFile(`${output}/index.html`,`<!doctype html><meta charset="utf-8"><title>每日挑战450关布局审阅</title><style>body{font:18px "Microsoft YaHei",sans-serif;margin:30px;background:#f4f1f8}img{display:block;width:100%;height:auto}article{margin-bottom:40px}a{color:#54318b}</style><h1>每日挑战450关布局审阅</h1><p>45组正式运行开局截图；导出不代表视觉验收通过。</p>${groups.map(group=>`<article><h2>${escape(group.code)} · ${escape(group.title)} / ${labels[group.difficulty]}</h2><a href="${group.code}.jpg" target="_blank"><img loading="lazy" src="${group.code}.jpg" alt="${escape(group.title)}"></a></article>`).join('')}`,{flag:'wx'});
 return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[runtimeDirectory,pointerDirectory,output]=process.argv.slice(2);
 if(!runtimeDirectory||!pointerDirectory||!output)throw Error('Usage: export-contact-sheets.mjs runtime-directory pointer-directory new-output-directory');
 const result=await exportContactSheets(runtimeDirectory,pointerDirectory,output);
 console.log(JSON.stringify({groups:result.groups.length,status:result.status,formalReady:false}));
}
