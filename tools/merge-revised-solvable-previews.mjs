import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from './verify-rules-lock.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputPaths=process.argv.slice(2);
assert(inputPaths.length,'Usage: node tools/merge-revised-solvable-previews.mjs review.json ...');
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.5.0');
const sha=b=>createHash('sha256').update(b).digest('hex');
const files={},rows=[],parents=[];
async function bind(p,expected){const digest=sha(await readFile(path.resolve(root,p)));if(expected)assert.equal(digest,expected,`Input drift: ${p}`);if(files[p])assert.equal(files[p].sha256,digest);files[p]={sha256:digest};}
await bind('tools/merge-revised-solvable-previews.mjs');
const sourceAuditPath='.codex-temp/solvable-previews-source-audit/report.json';
const sourceAudit=JSON.parse(await readFile(path.resolve(root,sourceAuditPath),'utf8'));
assert.equal(sourceAudit.ruleVersion,'1.5.0');
await bind(sourceAuditPath);
for(const source of sourceAudit.sources)await bind(source.file,source.sha256);
const sourceNotesPath='docs/level-generation/solvable-preview-source-readiness-2026-09-22.md';
await bind(sourceNotesPath);
for(const p of inputPaths){
  const report=JSON.parse(await readFile(path.resolve(root,p),'utf8'));
  assert.equal(report.status,'partial-batch-verified');assert.equal(report.ruleVersion,'1.5.0');assert.deepEqual(report.errors,[]);assert.equal(report.completePreviewCount,report.rows.length);
  for(const [f,b]of Object.entries(report.files))await bind(f,b.sha256);
  await bind(p);parents.push({path:p,sha256:files[p].sha256});
  for(const row of report.rows){
    assert(row.replay.valid&&row.replay.complete&&row.renderVerified&&row.pointerReplayValidated,`Incomplete evidence Lv${row.levelId}`);
    assert(!rows.some(r=>r.levelId===row.levelId),`Duplicate Lv${row.levelId}`);
    const name=`level-${String(row.levelId).padStart(3,'0')}`;
    const assets=[`boards/${name}.png`,`boards/${name}-complete.png`,`levels/${name}.html`,`levels/${name}.png`,`levels/${name}.json`];
    for(const asset of assets){
      assert(report.outputFiles?.[asset]?.sha256,`Missing output binding: ${asset}`);
      await bind(`${path.dirname(p).replaceAll('\\','/')}/${asset}`,report.outputFiles[asset].sha256);
    }
    rows.push({...row,parentReport:p,assets});
  }
}
rows.sort((a,b)=>a.levelId-b.levelId);
const compiled=await build({absWorkingDir:root,stdin:{contents:'export {replayRevisedRoute} from "./src/core/revisedLevelSearch.ts";',resolveDir:root,sourcefile:'merge-preview-check.mjs'},bundle:true,format:'esm',platform:'node',write:false});
const {replayRevisedRoute}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
for(const row of rows){const replay=replayRevisedRoute(row.level,row.drags);assert(replay.valid&&replay.complete,`Merged fresh replay Lv${row.levelId}`);assert.deepEqual(replay,row.replay);}
const relative=`deliverables/revised-solvable-preview-gallery-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`;
const out=path.join(root,relative);await mkdir(path.join(out,'boards'),{recursive:true});await mkdir(path.join(out,'levels'),{recursive:true});
await copyFile(path.resolve(root,sourceAuditPath),path.join(out,'source-readiness.json'));
await copyFile(path.resolve(root,sourceNotesPath),path.join(out,'source-readiness.md'));
for(const r of rows)for(const asset of r.assets)await copyFile(path.resolve(root,path.dirname(r.parentReport),asset),path.join(out,asset));
const remaining=Array.from({length:180},(_,i)=>i+21).filter(id=>!rows.some(r=>r.levelId===id));
const css=`:root{--bg:#14112e;--panel:#25204b;--ink:#f9f0d5;--gold:#e9be65;--muted:#c4bee8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Microsoft YaHei",sans-serif}header,footer{padding:26px 36px}h1{margin:8px 0}small,a{color:var(--gold)}p{color:var(--muted)}nav{display:flex;gap:18px;flex-wrap:wrap}.gallery{padding:0 36px 24px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px}.card{background:var(--panel);border:1px solid #554775;border-radius:18px;padding:16px;text-decoration:none;color:var(--ink)}.card img{display:block;width:100%;height:460px;object-fit:contain;background:#211c58;border-radius:10px}.card h2{font-size:24px;margin:0 0 12px}.good{color:#9fe6bc}.notice{border-left:3px solid var(--gold);padding-left:14px}summary{cursor:pointer;color:var(--gold)}@media(max-width:1200px){.gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){header,footer{padding:20px}.gallery{padding:0 20px 20px;grid-template-columns:1fr}.card img{height:560px}h1{font-size:26px}}`;
const cards=rows.map(r=>{const name=`level-${String(r.levelId).padStart(3,'0')}`;return `<a class="card" href="levels/${name}.html"><h2>第 ${r.levelId} 关</h2><img loading="lazy" src="boards/${name}.png" alt="第${r.levelId}关开局"><p class="good">整关模型与真实拖动通关通过</p><small>${r.level.width}×${r.level.height} · 开局${r.audit.measurements.openingBlockCount} / 全关${r.level.blocks.length}块<br>满铺100% · ${r.replay.effectiveDrags}拖可完成</small></a>`;}).join('');
await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–200关可解预览 · 已完成${rows.length}关</title><style>${css}</style><header><small>BLOCK OUT! / SOLVABLE PREVIEWS · v1.5</small><h1>21–200关 · 可解预览图集</h1><p>本批已完成 ${rows.length}/180 关。以下图片均有完整通关路线，不以“开局能动”代替整关验证。</p><p>保留满铺、数量、空间和机制要求；本轮不考核必要腾挪，未替换正式地图。点击关卡查看大图与数据。</p><nav><a href="overview.png">打开本批总览图</a><a href="review.json">完整检查记录</a><a href="source-readiness.md">31–200关来源冲突说明</a></nav></header><main class="gallery">${cards}</main><footer><p class="notice">未完成的关卡不作可解承诺。部分来源存在出口颜色容量冲突或未知数量，不能通过删机制、猜数量或复用旧图凑成180关。</p><details><summary>查看尚未完成的${remaining.length}关</summary><p>${remaining.join('、')}</p></details><p>时间、三星、全季首次引入来源和正式接入另行验收。当前图片是实际Canvas截图，不是正式发布图。</p></footer></html>`,{flag:'wx'});
const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:2000,height:1400}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`${origin}/${relative}/index.html`,{waitUntil:'networkidle'});
  await page.locator('img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth));
  await page.screenshot({path:path.join(out,'overview.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Gallery overflow');
  for(const r of rows){await page.goto(`${origin}/${relative}/levels/level-${String(r.levelId).padStart(3,'0')}.html`,{waitUntil:'networkidle'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Detail overflow ${r.levelId}`);}
  assert.deepEqual(errors,[]);
  for(const [p,b]of Object.entries(files))assert.equal(sha(await readFile(path.resolve(root,p))),b.sha256,`Input changed: ${p}`);
  const outputFiles={};for(const r of rows)for(const p of r.assets)outputFiles[p]={sha256:sha(await readFile(path.join(out,p)))};
  for(const p of ['index.html','overview.png','source-readiness.json','source-readiness.md'])outputFiles[p]={sha256:sha(await readFile(path.join(out,p)))};
  await writeFile(path.join(out,'review.json'),JSON.stringify({status:'verified-partial-gallery',ruleVersion:'1.5.0',requestedCount:180,completedCount:rows.length,completedLevelIds:rows.map(r=>r.levelId),remainingLevelIds:remaining,parents,files,outputFiles,rows,errors,lowerBoundCertified:false,timeValidated:false,releaseApproved:false},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:relative,completedCount:rows.length,remainingCount:remaining.length,errors}));
}finally{await browser.close();await server.close();}
