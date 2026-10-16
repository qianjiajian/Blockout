import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';

// A review gallery of accepted compiled entries only; pending registrations and
// historical candidates never appear as completed levels.
const [output]=process.argv.slice(2);assert(output,'New gallery output directory required');
const base='deliverables/daily-formal-v4-20261008/proof';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async(p,h)=>{const b=await fs.readFile(p);if(h)assert.equal(sha(b),h,p);return JSON.parse(b);};
const source=await fs.readFile('src/core/formalDailyChallenge300Data.ts','utf8');
const marker='export const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze(';
const entries=JSON.parse(source.slice(source.indexOf(marker)+marker.length,source.lastIndexOf(');')));
assert.equal(levelSha256(entries),source.match(/FORMAL_DAILY_300_REVISION = "([a-f0-9]{64})"/)[1]);
const accepted=new Map();
for(const file of await fs.readdir(base))if(/^(n20-formal-acceptance-01|incremental-\d+-.+-acceptance-\d+)\.json$/.test(file)){
 const p=path.posix.join(base,file),q=await read(p);
 if(q.status==='FORMAL_DATA_ACCEPTED')accepted.set(q.formalId,{...q,acceptancePath:p,acceptanceSha256:sha(await fs.readFile(p))});
}
const rows=[];
for(const entry of entries){
 const a=accepted.get(entry.formalId);if(!a)continue;
 assert.equal(a.levelSha256,entry.layoutSha256);assert.equal(a.admittedInRevision,entry.admittedInRevision);
 const run=await read(a.formalPointer.path,a.formalPointer.sha256);
 const view=run.results.find(r=>r.viewport.width===320&&r.viewport.height===568);assert(view);
 const report=await read(view.report.path,view.report.sha256);assert(report.pointerValidated&&report.timeValidated&&report.settlementValidated);
 const image=report.screenshots.opening,b=await fs.readFile(image.path);assert.equal(sha(b),image.sha256);
 rows.push({formalId:entry.formalId,stageKey:entry.stageKey,difficulty:entry.difficulty,slot:entry.slot,source:entry.sourceLevelId,
  L:entry.proof.lowerBound,U:entry.proof.upperBound,totalDrags:a.totalDrags,levelSha256:entry.layoutSha256,
  admittedInRevision:entry.admittedInRevision,acceptance:{path:a.acceptancePath,sha256:a.acceptanceSha256},
  originalScreenshot:image,image:`${entry.formalId}.png`,bytes:b});
}
assert(rows.length);await fs.mkdir(output,{recursive:false});
for(const row of rows)await fs.writeFile(path.join(output,row.image),row.bytes,{flag:'wx'});
const stages={'basic-combined':'基础合并','mechanisms-multilayer-shell-15':'外壳','mechanisms-generator-35':'生成器',
 'mechanisms-axis-block-50':'轴向','mechanisms-key-lock-59':'钥匙锁','mechanisms-layered-lift-65':'升降台',
 'mechanisms-star-100':'星标','mechanisms-bomb-120':'炸弹','mechanisms-flip-door-150':'翻转门','mechanisms-colored-grid-200':'彩色地格'};
const stageOrder=Object.keys(stages);
assert(rows.every(row=>stageOrder.includes(row.stageKey)),'Every accepted entry needs a known unlock stage');
rows.sort((a,b)=>stageOrder.indexOf(a.stageKey)-stageOrder.indexOf(b.stageKey)||a.difficulty-b.difficulty||a.slot-b.slot);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=rows.map(r=>`<article data-stage="${esc(r.stageKey)}" data-difficulty="${r.difficulty}"><img loading="lazy" src="${r.image}" alt="${esc(r.formalId)}"><h2>${stages[r.stageKey]} · ${['','难','超难','超超难'][r.difficulty]} · ${r.slot}</h2><p>必挪证明 ${r.L}–${r.U} 次 · 通关路线 ${r.totalDrags} 拖</p><small>主线基准 ${r.source} · 已正式接入</small><code>${esc(r.formalId)}</code></article>`).join('\n');
const options=Object.entries(stages).filter(([key])=>rows.some(r=>r.stageKey===key)).map(([key,name])=>`<option value="${key}">${name}</option>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>每日挑战正式关卡布局</title><style>body{margin:0;background:#12102b;color:#faf7ff;font:16px system-ui}header{padding:24px;position:sticky;top:0;background:#191536ed;z-index:1}h1{font-size:26px;margin:0 0 10px}header p{color:#c9c3e8}select{font:inherit;margin-right:12px;padding:8px;background:#33285c;color:white;border:1px solid #675a94;border-radius:8px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;padding:24px}article{background:#211b41;border:1px solid #413765;border-radius:16px;overflow:hidden;padding-bottom:16px}article img{display:block;width:100%;max-height:568px;object-fit:contain;background:#20194e}h2,p,small,code{margin:12px 16px}h2{font-size:18px}small,code{display:block;color:#bcb2da}code{font-size:11px;overflow-wrap:anywhere}article[hidden]{display:none}</style><header><h1>每日挑战正式关卡：${rows.length}/300</h1><p>仅展示完成真实双屏通关与正式入口验收的关卡。图片为游戏实际开局截图；其余关卡仍在制作。</p><select id="stage"><option value="">全部机制阶段</option>${options}</select><select id="difficulty"><option value="">全部难度</option><option value="1">难</option><option value="2">超难</option><option value="3">超超难</option></select></header><main>${cards}</main><script>const filters=[document.getElementById('stage'),document.getElementById('difficulty')];for(const f of filters)f.addEventListener('change',()=>{for(const c of document.querySelectorAll('article'))c.hidden=filters.some(x=>x.value&&c.dataset[x.id]!==x.value)});</script></html>`;
await fs.writeFile(path.join(output,'index.html'),html,{flag:'wx'});
const report={createdAt:new Date().toISOString(),formalAccepted:rows.length,registered:entries.length,target:300,
 partial:true,originalScreenshotsUnmodified:true,rows:rows.map(({bytes,...r})=>r)};
await fs.writeFile(path.join(output,'index.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({gallery:path.join(output,'index.html'),formalAccepted:rows.length,target:300}));
