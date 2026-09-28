// Factual HTML/CSS layout of original screenshots, not reconstructed/AI boards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {verifySourceCatalog,shapeClass,auditSourceAlignment} from './remake21to30-source-v139.mjs';
import {INVENTORY_REVIEWS} from './revised-source-inventory.mjs';

const output=path.resolve(process.argv[2]??'');
assert(path.basename(output).startsWith('comparison21-30-v139-'));
const read=p=>JSON.parse(fs.readFileSync(p));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.39.0');
const base='deliverables/remake21-30-v139-20260924';
const baseline=read(`${base}/baseline.json`),capture=read(path.join(output,'capture-report.json'));
const checks=read(`${base}/formal-verification-1790222337379.json`);
assert.equal(capture.status,'PASS');assert.equal(capture.campaignSha256,checks.campaignSha256);
verifySourceCatalog(baseline.sources);
// The legacy catalog validates reviewed board dimensions, but does not merge
// board masks. Use the bound pixel review for playable cells (Lv23 has two walls).
const boardReviews=new Map(INVENTORY_REVIEWS.flatMap(file=>read(file).levels.map(r=>[r.level,{file,board:r.boardReference??r.board??r.mechanisms.irregularBoard}])));
assert.deepEqual(Object.entries(capture.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[],'Source drift after opening capture');
const frameSpec={
 21:[8,10,184,430,620],22:[76,16,173,416,636],23:[119,8,216,432,549],24:[176,28,174,395,636],25:[258,8,183,432,612],
 26:[306,8,172,432,640],27:[379,8,190,432,610],28:[414,8,190,432,612],29:[473,8,216,432,554],30:[548,6,246,434,494],
};
const notes={
 21:'开局与各隐藏批次的块数、形状数量保留；位置、配色分布和出口重新设计。',
 22:'开局17块、全关29块及分批形状数量保留；重新排布出口与色块，卷帘初值仍为17。',
 23:'竞品6×8外框含2格固定墙，可玩46格。我方保留42格：去掉2个普通横2块；2件L形外壳换为同面积条形，层色与4件外壳保留。',
 24:'源棋盘37格、色块实际占32格。我方保留41格：通过扩形与补块增加9格；两帘及隐藏冰/壳数量保留。',
 25:'源42格→我方50格：新增2个竖3块和2个单格块；增加第8种货物色以配合8个唯一有效出口，7个冰门初值不变。',
 26:'源53格→我方69格：开局扩形增加14格、隐藏补1个横2块；按唯一出口规则，普通口8→4，三冰门初值保持。',
 27:'源36格→我方48格：开局9个单格改为6个单格＋5个竖3块；隐藏9个横3块与卷帘初值9保留。',
 28:'开局6个横3块及两批隐藏形状数量保留；重新排布位置、颜色与出口，卷帘初值仍为3、7。',
 29:'开局21块及其形状数量保留；隐藏5件异形外壳因缺整块素材换成同面积方块，另1件横2壳换竖2；仍为8件外壳。',
 30:'源36格→我方60格：保留源16个开局块和5个隐藏块，新增6个普通2×2方块；普通口5→3，卷帘12、冰门9不变。',
};
const shortNotes={21:'块数 / 分批形状数量保留',22:'块数 / 分批形状数量保留',23:'容量减4格；异形外壳适配',24:'实际块面积补9格',25:'补8格；增加1种货物色',26:'补16格；普通出口合并',27:'补12格；开局扩形补块',28:'块数 / 分批形状数量保留',29:'开局保留；隐藏外壳适配',30:'补6个2×2方块，共24格'};
const shapeNames={SINGLE:'单格',H2:'横2',V2:'竖2',H3:'横3',V3:'竖3',SQ2:'2×2',L3:'L形3格',L4:'L形4格',T4:'T形4格'};
const colorNames={black:'黑',white:'白',red:'红',blue:'蓝',green:'绿',yellow:'黄',purple:'紫',orange:'橙',pink:'粉',cyan:'青',magenta:'品红','light-blue':'浅蓝','dark-blue':'深蓝'};
const difficultyNames={easy:'简单',normal:'普通',hard:'困难',super:'超难'};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const hist=blocks=>blocks.reduce((a,b)=>{const k=shapeClass(b.shape);a[k]=(a[k]??0)+1;return a;},{});
const prettyHist=h=>Object.entries(h).sort(([a],[b])=>a.localeCompare(b)).map(([s,n])=>`${shapeNames[s]??s} ×${n}`).join(' · ');
const values=a=>a.length?[...a].sort((a,b)=>a-b).join(' / '):'无';
const time=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
const rows=[];
for(let id=21;id<=30;id++){
 const c=capture.rows.find(r=>r.id===id),check=checks.rows.find(r=>r.id===id);
 const candidate=read(`${base}/batch-1790222202466/lv${id}.json`),level=candidate.level,s=baseline.sources.records[id];
 const reviewed=boardReviews.get(id),sourceBoard=reviewed.board;
 const sourcePlayable=sourceBoard.playable_cell_count??sourceBoard.playableCellCount;
 const sourceMask=sourceBoard.source_playable_mask??sourceBoard.mask??sourceBoard.sourcePlayableMask;
 assert.equal(sourcePlayable,sourceMask.join('').replaceAll('.','').length,'Reviewed playable-mask count');
 assert.equal(digest(level),c.levelSha256);assert.equal(check.levelSha256,c.levelSha256);
 auditSourceAlignment(level,baseline.sources,candidate.sourceAdaptation);
 assert.equal(digest(fs.readFileSync(path.join(output,c.file))),c.sha256);
 const [sec,x,y,width,height]=frameSpec[id],sourcePath=`.codex-temp/video-audit-21-30-independent/frames-1fps/sec-${String(sec).padStart(4,'0')}.jpg`;
 const sourceSha=digest(fs.readFileSync(sourcePath));assert.equal(sourceSha,baseline.sources.bindings[sourcePath]?.sha256);
 const sourceFile=`originals/competitor-lv${id}.jpg`;fs.copyFileSync(sourcePath,path.join(output,sourceFile));
 const opening=level.blocks.filter(b=>!b.shutterId),layers=b=>b.layers??[b.color];
 const ourColorCount=new Set(opening.map(b=>layers(b)[0])).size;
 const facts=[
  ['棋盘可玩格',sourcePlayable,level.playable?.length??level.width*level.height],
  ['全关色块占格',s.composition.source_occupied_cell_count,level.blocks.reduce((n,b)=>n+b.shape.length,0)],
  ['开局 / 全关块数',`${s.composition.opening_piece_count} / ${s.composition.source_full_piece_count}`,`${opening.length} / ${level.blocks.length}`],
  ['开局颜色种类',s.composition.opening_color_count,ourColorCount],
  ['开局形状',prettyHist(s.composition.opening_shape_histogram),prettyHist(hist(opening))],
  ['卷帘初值',values(s.mechanisms.covers.values),values((level.shutters??[]).map(t=>t.count))],
  ['冰冻出口初值',values(s.mechanisms.directional_exits.frozen_values),values(level.gates.filter(g=>g.frozen>0).map(g=>g.frozen))],
  ['数字冰 / 外壳（全关）',`${s.mechanisms.numeric_ice.count} / ${s.mechanisms.shells.count}`,`${level.blocks.filter(b=>b.frozen>0).length} / ${level.blocks.filter(b=>layers(b).length>1).length}`],
  ['普通出口数量',s.mechanisms.directional_exits.ordinary_count,level.gates.filter(g=>!(g.frozen>0)).length],
 ];
 const mapping=Object.entries(candidate.sourceAdaptation.colorMapping).filter(([a,b])=>a!==b).map(([a,b])=>`${colorNames[a]??a}→${colorNames[b]??b}`).join('，');
 rows.push({id,source:{path:sourcePath,file:sourceFile,sha256:sourceSha,width:448,height:960,crop:{x,y,width,height},videoTime:time(sec),boardReviewPath:reviewed.file,boardReviewSha256:baseline.sources.bindings[reviewed.file].sha256,reviewedBoard:sourceBoard,note:id===24?'未移动 / 未清除；带选中描边':id===30?'进场动画结束后的稳定帧':'开局布局原帧'},ours:{...c,width:496,height:1078},facts,mapping,adaptation:notes[id],shortAdaptation:shortNotes[id],difficulty:difficultyNames[level.difficulty],lowerBound:check.lowerBound,upperBound:check.upperBound});
}
// CSS viewport crops only; original files are preserved byte-for-byte beside each sheet.
function board(asset,maxWidth,maxHeight){const c=asset.crop,scale=Math.min(maxWidth/c.width,maxHeight/c.height);return `<div class="crop" style="width:${c.width*scale}px;height:${c.height*scale}px"><img alt="开局棋盘原图裁切" src="${asset.file}" style="width:${asset.width*scale}px;height:${asset.height*scale}px;left:${-c.x*scale}px;top:${-c.y*scale}px"></div>`;}
const css=`*{box-sizing:border-box}body{margin:0;background:#edf0f6;color:#182439;font-family:"Microsoft YaHei","Segoe UI",sans-serif}a{color:inherit}.sheet{width:1280px;background:#fff;padding:36px 42px 30px}.eyebrow{font-size:15px;letter-spacing:2px;color:#69758b;font-weight:700}.top{display:flex;align-items:center;justify-content:space-between;margin:8px 0 22px}h1{margin:0;font-size:40px;line-height:1.35}.badge{background:#eef1ff;color:#4b49a3;border-radius:12px;padding:12px 18px;font-size:18px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}.label{display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 12px;font-size:24px;font-weight:700}.label small{font-size:15px;font-weight:400;color:#69758b}.frame{height:660px;display:flex;align-items:center;justify-content:center;border-radius:14px;overflow:hidden;background:#17152f}.frame.ours{background:#211c50}.crop{position:relative;overflow:hidden;flex-shrink:0}.crop img{position:absolute;max-width:none}.caption{font-size:14px;color:#69758b;padding:10px 4px 14px}.stats{width:100%;border-collapse:collapse;margin-top:8px;font-size:17px;table-layout:fixed}.stats th,.stats td{border-bottom:1px solid #e6e9f0;padding:10px 12px;line-height:1.45;text-align:left}.stats th{width:220px;color:#5f6a7c;font-weight:500;background:#f8f9fc}.stats td{width:calc((100% - 220px)/2)}.stats tr.changed td{color:#975315;background:#fff8ed}.notes{margin-top:20px;padding:17px 20px;border-left:4px solid #8d85dd;background:#f4f3fb;font-size:18px;line-height:1.75}.notes strong{display:block;font-size:17px;color:#584f9a}.legend{font-size:14px;line-height:1.8;color:#6a7485;margin-top:14px}.footer{display:flex;justify-content:space-between;border-top:1px solid #dfe4ee;margin-top:18px;padding-top:14px;font-size:13px;color:#7c8596}.overview{width:1600px;background:#f2f4f9;padding:36px}.overview h1{font-size:36px}.intro{font-size:18px;color:#657086;line-height:1.7;margin:10px 0 24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.mini{background:white;padding:18px;border-radius:14px;text-decoration:none;display:block}.minihead{display:flex;justify-content:space-between;margin-bottom:12px;font-size:24px;font-weight:700}.minihead span{font-size:16px;font-weight:400;color:#69758b;align-self:center}.mini .pair{gap:12px}.mini .label{font-size:17px;padding-bottom:8px}.mini .label small{font-size:12px}.mini .frame{height:330px;border-radius:9px}.mini .caption{font-size:13px;padding-bottom:4px}.mininote{font-size:15px;color:#745924;margin-top:10px}.nav{background:white;padding:20px 36px;max-width:1600px;font-size:17px;line-height:2}.nav a{margin-right:18px}.detailnav{margin-bottom:16px;font-size:17px}.download{font-size:15px;margin-top:12px} @media(max-width:900px){body{width:max-content}}`;
const doc=body=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–30关 · 竞品与正式版开局对比</title><style>${css}</style><body>${body}</body></html>`;
function detailed(r){return `<article class="sheet"><div class="eyebrow">BLOCK OUT! / OPENING COMPARISON / 2026.09.24</div><div class="top"><h1>第 ${r.id} 关 · 开局对比</h1><div class="badge">我方 ${r.difficulty} · 必挪 ${r.lowerBound}–${r.upperBound} 次</div></div><div class="pair"><section><div class="label">竞品 <small>本地实录 ${r.source.videoTime}</small></div><div class="frame">${board(r.source,562,642)}</div><div class="caption">${r.source.note}</div></section><section><div class="label">我方正式版 <small>当前 LEVELS · v1.39</small></div><div class="frame ours">${board(r.ours,562,642)}</div><div class="caption">正式入口重新截图 · 0次移动 / 0次清除</div></section></div><table class="stats"><tbody>${r.facts.map(([label,a,b])=>`<tr class="${String(a)===String(b)?'':'changed'}"><th>${escape(label)}</th><td>${escape(a)}</td><td>${escape(b)}</td></tr>`).join('')}</tbody></table><div class="notes"><strong>保留我方棋盘后的适配</strong>${r.adaptation}</div><div class="legend">橙底表示数据有差异。表内左列为竞品、右列为我方；全关统计包含隐藏批次，外壳内芯不重复计块。<br>颜色映射：${r.mapping||'同名颜色对应'}。两侧均等比显示、完整保留出口，但单格像素比例可能不同。<br>图片只展示开局，不透视隐藏内容；必挪为我方已证下界–路线给出的上界，并非精确最优或竞品难度。</div><div class="footer"><span>原始截图与来源时间保留 · 布局非一比一复刻</span><span>21–30正式版 / ${String(r.id-20).padStart(2,'0')} OF 10</span></div></article>`;}
const mini=r=>`<a class="mini" href="lv${r.id}.html"><div class="minihead">第 ${r.id} 关<span>我方${r.difficulty} · 必挪${r.lowerBound}–${r.upperBound}</span></div><div class="pair"><section><div class="label">竞品<small>${r.source.videoTime}</small></div><div class="frame">${board(r.source,334,314)}</div><div class="caption">开局 ${r.facts[2][1].split(' / ')[0]} 块 · ${r.facts[0][1]} 可玩格</div></section><section><div class="label">我方正式版<small>0次移动</small></div><div class="frame ours">${board(r.ours,334,314)}</div><div class="caption">开局 ${r.facts[2][2].split(' / ')[0]} 块 · ${r.facts[0][2]} 可玩格</div></section></div><div class="mininote">${r.shortAdaptation}</div></a>`;
const overview=`<main class="overview"><div class="eyebrow">COMPETITOR × FORMAL LEVELS</div><h1>21–30关 · 竞品 / 我方正式版</h1><p class="intro">每组左侧为竞品原视频开局，右侧为当前我方正式开局。保留我方棋盘结构，必要的补块、扩形与出口适配另列。<br>此图不展示隐藏层；第24关竞品有选中描边但未移动。颜色按我方8色映射，截图均等比展示。</p><div class="grid">${rows.map(mini).join('')}</div><div class="footer"><span>2026-09-24 · v1.39 · 点击卡片查看逐关大图与完整数值</span><span>本地视频原帧 / 当前正式入口</span></div></main>`;
const nav=`<nav class="nav">逐关对比：${rows.map(r=>`<a href="lv${r.id}.html">第${r.id}关</a>`).join('')}<br><a href="overview.png">下载总览 PNG</a> <a href="comparison-data.json">查看来源及数值记录</a></nav>`;
fs.writeFileSync(path.join(output,'index.html'),doc(nav+overview));
for(const r of rows)fs.writeFileSync(path.join(output,`lv${r.id}.html`),doc(`<div class="nav"><a href="index.html">← 返回总览</a><a href="lv${r.id}.png">逐关PNG</a><a href="${r.source.file}">竞品原图</a><a href="${r.ours.file}">我方原图</a></div>`+detailed(r)));
const browser=await chromium.launch({headless:true});
const validation=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 for(const id of [null,...rows.map(r=>r.id)]){
  const html=id===null?'index.html':`lv${id}.html`,selector=id===null?'.overview':'.sheet',png=id===null?'overview.png':`lv${id}.png`;
  await page.goto(pathToFileURL(path.join(output,html)).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  const images=await page.evaluate(()=>[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight})));
  assert.equal(images.length,id===null?20:2);assert(images.every(i=>i.loaded));
  for(const i of images)assert.deepEqual([i.width,i.height],i.src.includes('competitor')?[448,960]:[496,1078]);
  const overflow=await page.locator(selector).evaluate(el=>el.scrollWidth>el.clientWidth);assert(!overflow,`Overflow in ${html}`);
  await page.locator(selector).screenshot({path:path.join(output,png)});
  validation.push({html,png,images:images.length,overflow,sha256:digest(fs.readFileSync(path.join(output,png)))});
 }
 assert.deepEqual(pageErrors,[]);
}finally{await browser.close();}
assert.deepEqual(Object.entries(capture.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const data={status:'PASS',createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,campaignSha256:capture.campaignSha256,sourceCatalogSha256:baseline.sources.sourceHash,sourceVideo:baseline.sources.records[21].provenance.source,rows,validation,rendererSha256:digest(fs.readFileSync('tools/render-comparison21to30-v139.mjs')),mapsModified:false,playerSaveTouched:false,hiddenLayersVisualized:false};
fs.writeFileSync(path.join(output,'comparison-data.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(output,'README.md'),`# 21–30关竞品比对图\n\n- 打开 index.html：总览及逐关入口。\n- overview.png：十关总览；lv21.png 至 lv30.png：逐关高清比对。\n- originals/：完整原始竞品帧及当前正式入口截图；只在HTML/CSS排版时裁切棋盘，未重绘色块或更改计数。\n- comparison-data.json：来源路径/时间/SHA、每关统计、裁切和导出检查。\n- capture-report.json：当前正式入口零移动截图、正式数据SHA、源码/美术绑定及存档隔离检查。\n\n左为竞品，右为我方正式版；保留我方棋盘结构，不宣称一比一复刻。全关数字含隐藏批次，图片仅显示开局；第24关竞品有选中描边但未移动，第30关使用548秒稳定帧。\n\n竞品来源：${data.sourceVideo}（已有本地实录，非本轮联网查找）。我方截图均为独立MemoryHost，无玩家存档读写；本任务未修改关卡、机制或游戏UI，未发布。\n`);
console.log(JSON.stringify({output,status:'PASS',detailImages:10,overview:1,validation:validation.length}));
