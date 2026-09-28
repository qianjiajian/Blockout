// Native HTML/CSS comparison of unchanged screenshot pixels; no generated art.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {BASELINE,IDS,OUTPUT,ruleGate,loadApi,assertBaseline,writeNew} from './layout-originality-v140.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const read=p=>JSON.parse(fs.readFileSync(p));
const pointerPath=process.argv[2];assert(pointerPath,'Pass a completed formal Pointer report');
const p=read(pointerPath),b=read(BASELINE),{api}=await loadApi();assertBaseline(b);assert.equal(p.status,'PASS');assert(p.fullBatchValidated);
assert.deepEqual(p.requestedIds,IDS);assert.deepEqual(p.viewport,{width:496,height:1078});
const drift=()=>Object.entries(p.bindings).filter(([f,h])=>digest(fs.readFileSync(f))!==h);
assert.deepEqual(drift(),[],'Capture source drift');
const oldDir='deliverables/comparison21-30-v139-1790224273067',old=read(`${oldDir}/comparison-data.json`);
assert.equal(old.campaignSha256,b.campaignSha256);
const output=path.resolve(OUTPUT,`comparison-${Date.now()}`);fs.mkdirSync(output);fs.mkdirSync(path.join(output,'originals'));
const descriptions={
 21:'三片卷帘改为顶部对齐的三列阶梯仓；横向色块按两格列宽组织，通路和出口重新设计。',
 22:'大帘置上、操作区置下，红双格移到内部。隐藏区改为中央双冰柱与两侧对齐方块，出口重新安排。',
 23:'双帘改为左侧上下排列，右侧形成纵向操作带；保留横、竖长壳及原形状配对。',
 28:'由三条横带改成L形分区：底部横帘、左侧竖帘、右侧六行横条。',
};
const bounds={21:'简单 · 已证必挪5–8',22:'普通 · 必挪11',23:'普通 · 已证必挪11–15',28:'简单 · 已证必挪5–8'};
const rows=[];
for(const id of IDS){
 const prior=old.rows.find(r=>r.id===id),current=p.rows.find(r=>r.id===id),level=api.LEVELS[id-1];
 assert.equal(current.status,'PASS');assert.equal(digest(level),current.levelSha256);assert.equal(prior.ours.levelSha256,b.levels[id-1].sha256);
 assert.equal(current.opening.moves,0);assert.equal(current.opening.cleared,0);
 const copy=(source,file,expected)=>{const bytes=fs.readFileSync(source),sha256=digest(bytes);if(expected)assert.equal(sha256,expected);fs.copyFileSync(source,path.join(output,file));return {source,file,sha256};};
 const source={...prior.source,...copy(`${oldDir}/${prior.source.file}`,`originals/source-${id}.jpg`,prior.source.sha256)};
 const before={...prior.ours,...copy(`${oldDir}/${prior.ours.file}`,`originals/before-${id}.png`,prior.ours.sha256)};
 const after={...prior.ours,...copy(path.join(path.dirname(pointerPath),`lv${id}-opening.png`),`originals/after-${id}.png`),levelSha256:current.levelSha256};
 rows.push({id,source,before,after,description:descriptions[id],bound:bounds[id]});
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function board(a){const c=a.crop,scale=Math.min(356/c.width,460/c.height);return `<div class="crop" style="width:${c.width*scale}px;height:${c.height*scale}px"><img alt="未修改像素的棋盘截图" src="${a.file}" style="width:${a.width*scale}px;height:${a.height*scale}px;left:${-c.x*scale}px;top:${-c.y*scale}px"></div>`;}
const css=`*{box-sizing:border-box}body{margin:0;background:#edf0f7;color:#25304a;font-family:'Microsoft YaHei',sans-serif}main{width:1200px;padding:28px;background:#edf0f7}h1{font-size:30px;margin:0 0 12px}p{font-size:16px;line-height:1.7;margin:8px 0 20px;color:#59667d}article{background:#fff;padding:22px;border-radius:14px;margin-bottom:22px}.heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}h2{font-size:26px;margin:0}.badge{color:#6250a4;background:#f0edfc;padding:9px 13px;border-radius:8px;font-size:16px}.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.label{font-size:18px;font-weight:600;margin-bottom:9px}.frame{height:476px;display:flex;align-items:center;justify-content:center;background:#211c50;border-radius:9px;overflow:hidden}.crop{position:relative;overflow:hidden;flex-shrink:0}.crop img{position:absolute;max-width:none}.note{margin-top:14px;font-size:17px;line-height:1.65}.caution{font-size:14px;color:#7b622e;margin-top:8px}.foot{font-size:13px;color:#738095;line-height:1.8;margin-top:16px}a{color:#574794}nav{padding:14px 28px;background:#fff;font-size:16px}nav a{margin-right:18px}`;
const card=r=>`<article id="lv${r.id}"><div class="heading"><h2>第${r.id}关</h2><span class="badge">${r.bound}次</span></div><div class="trio">${[['竞品开局',r.source],['我方 · 修改前',r.before],['我方 · 当前正式版',r.after]].map(([label,asset])=>`<section><div class="label">${label}</div><div class="frame">${board(asset)}</div></section>`).join('')}</div><div class="note">${r.description}</div>${r.id===22?'<div class="caution">42格隐藏库存限定卷帘为6×7，单格数量与相邻异色也保留，因此仍保留棋格节奏；并非仅整体翻转。隐藏内部变化不在开局截图中透视展示。</div>':''}</article>`;
const doc=body=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21/22/23/28 · 原创布局对照</title><style>${css}</style><body>${body}</body></html>`;
const note='<div class="foot">保棋盘、每块类型/属性/批次、机关数量和初值、原时间三星奖励；其它196关不变。截图等比例裁切展示，原图字节保留。<br>区间为有效下界至完整路线腾挪上界，22上下界同为11；不冒称真人难度标定或手机实测。旧图与新图的UI表现取自各自捕获时点，以棋盘布局为对照重点。</div>';
fs.writeFileSync(path.join(output,'index.html'),doc(`<nav><a href="overview.png">总览PNG</a>${IDS.map(id=>`<a href="lv${id}.html">第${id}关大图</a>`).join('')}</nav><main><h1>21、22、23、28关 · 原创布局调整</h1><p>左：竞品原帧；中：上一版正式布局；右：本次已接入的正式布局。<br>采用规整的行列边界和分区，不要求同色镜像，也不以整体翻转代替重排。</p>${rows.map(card).join('')}${note}</main>`));
for(const r of rows)fs.writeFileSync(path.join(output,`lv${r.id}.html`),doc(`<nav><a href="index.html">返回总览</a><a href="lv${r.id}.png">保存PNG</a></nav><main>${card(r)}${note}</main>`));
const browser=await chromium.launch({headless:true}),validation=[];
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of [null,...IDS]){
  const file=id===null?'index.html':`lv${id}.html`,png=id===null?'overview.png':`lv${id}.png`;
  await page.goto(pathToFileURL(path.join(output,file)).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  assert.equal(await page.locator('img').count(),id===null?12:3);assert(!await page.locator('main').evaluate(e=>e.scrollWidth>e.clientWidth));
  await page.locator('main').screenshot({path:path.join(output,png)});validation.push({file,png,sha256:digest(fs.readFileSync(path.join(output,png)))});
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
assert.deepEqual(drift(),[]);
writeNew(path.join(output,'comparison-data.json'),{status:'PASS',ruleVersion:'1.40.0',createdAt:new Date().toISOString(),pointerPath,pointerSha256:digest(fs.readFileSync(pointerPath)),campaignSha256:digest(api.LEVELS),rows,validation,rendererSha256:digest(fs.readFileSync('tools/render-layout-originality-v140.mjs')),imagesAltered:false,playerSaveTouched:false,releaseApproved:false});
console.log(JSON.stringify({output,status:'PASS',pages:5,originals:12}));
