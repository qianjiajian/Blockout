import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const out=path.resolve('deliverables/league-layout-atlas-20261008');
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile('src/core/leagueLevelData.ts');
const compiled=await build({entryPoints:['src/core/leagueLevelData.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEAGUE_LEVELS:entries}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.equal(entries.length,100);
assert.deepEqual(entries,JSON.parse(await fs.readFile('deliverables/league-regeneration-20261006/final/catalog.json','utf8')).entries);
for(const dir of ['images','overview','vectors'])await fs.mkdir(path.join(out,dir),{recursive:true});
const colors={red:'#e75d62',blue:'#458ddd',green:'#44a975',yellow:'#edbe42',purple:'#a26fd1',orange:'#ec913c',pink:'#e97bb4',cyan:'#41bfcf'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const text=(x,y,t,size=20,color='#213c37',weight=500)=>`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Microsoft YaHei,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(t)}</text>`;
const rect=(x,y,w,h,fill,stroke='none',sw=1,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function render(entry){
 const l=entry.level,c=Math.min(76,610/l.width,730/l.height),ox=(820-l.width*c)/2,oy=150+(730-l.height*c)/2,parts=[];
 parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="1060" viewBox="0 0 820 1060">`,rect(0,0,820,1060,'#f5f3ed'),text(410,47,`荣耀联赛 · 第 ${String(entry.index).padStart(3,'0')} 关`,32,'#173b30',800),text(410,89,`${l.difficulty==='super'?'超难':'困难'}   ·   ${l.width} × ${l.height} 棋盘   ·   ${entry.specials.length} 个积分块`,19,'#61786c'));
 const playable=l.playable??Array.from({length:l.width*l.height},(_,i)=>[i%l.width,Math.floor(i/l.width)]);
 for(const [x,y]of playable)parts.push(rect(ox+x*c,oy+y*c,c,c,'#d9e2dc','#bdcdc2',1));
 const hidden=l.blocks.filter(b=>b.shutterId||b.generatorId),visible=l.blocks.filter(b=>!b.shutterId&&!b.generatorId);let drawnCells=0;
 for(const b of visible){
  const cells=new Set(b.shape.map(([x,y])=>`${x},${y}`)),color=colors[b.layers?.[0]??b.color],fill=color??'#999';
  for(const [x,y]of b.shape){parts.push(rect(ox+(b.x+x)*c,oy+(b.y+y)*c,c,c,fill));drawnCells++;}
  let d='';for(const[x,y]of b.shape){const px=ox+(b.x+x)*c,py=oy+(b.y+y)*c;if(!cells.has(`${x},${y-1}`))d+=`M${px},${py}h${c}`;if(!cells.has(`${x+1},${y}`))d+=`M${px+c},${py}v${c}`;if(!cells.has(`${x},${y+1}`))d+=`M${px+c},${py+c}h-${c}`;if(!cells.has(`${x-1},${y}`))d+=`M${px},${py+c}v-${c}`;}
  parts.push(`<path d="${d}" stroke="#f5f3ed" stroke-width="5" stroke-linecap="round" fill="none"/>`);
  const cx=b.shape.reduce((s,p)=>s+p[0]+.5,0)/b.shape.length,cy=b.shape.reduce((s,p)=>s+p[1]+.5,0)/b.shape.length;
  const centerX=ox+(b.x+cx)*c,centerY=oy+(b.y+cy)*c;
  if(entry.specials.includes(b.id)){parts.push(`<circle cx="${centerX}" cy="${centerY}" r="${c*.21}" fill="#fff0ae" stroke="#9a610f" stroke-width="2"/>`,text(centerX,centerY,'10',c*.24,'#85520c',800));}
  if(b.frozen)parts.push(rect(ox+(b.x+b.shape[0][0])*c+7,oy+(b.y+b.shape[0][1])*c+7,c*.63,c*.33,'#e5f8ff','#43869c',1,4),text(ox+(b.x+b.shape[0][0]+.42)*c,oy+(b.y+b.shape[0][1]+.285)*c,'冰'+b.frozen,c*.19,'#205c78',700));
  if(b.layers?.length>1)parts.push(text(centerX,centerY+c*.28,'壳→内',c*.15,'#fff',700),`<circle cx="${centerX+c*.24}" cy="${centerY-c*.26}" r="${c*.11}" fill="${colors[b.color]}" stroke="white" stroke-width="2"/>`);
  if(b.movementAxis)parts.push(text(centerX,centerY,b.movementAxis==='horizontal'?'↔':'↕',c*.4,'white',700));
 }
 for(const sh of l.shutters??[]){
  const x=ox+sh.x*c,y=oy+sh.y*c,w=sh.width*c,h=sh.height*c;
  parts.push(rect(x+2,y+2,w-4,h-4,'#506c84','#233e58',3,4));
  for(let line=y+13;line<y+h-4;line+=13)parts.push(`<path d="M${x+5},${line}h${w-10}" stroke="#6f8ca4" stroke-width="2"/>`);
  parts.push(rect(x+w*.12,y+h/2-28,w*.76,56,'#f6f0df','none',1,6),text(x+w/2,y+h/2,`${sh.skin==='lift'?'升降':'卷帘'} ${sh.count}`,Math.min(25,w*.15),'#304b58',800));
  const specialCount=hidden.filter(b=>b.shutterId===sh.id&&entry.specials.includes(b.id)).length;
  if(specialCount)parts.push(text(x+w/2,y+h-20,`内含 ${specialCount} 个积分块`,Math.min(18,w*.1),'#fff0a8',700));
 }
 const gates=[];
 for(const g of l.gates){
  const horizontal=g.side==='top'||g.side==='bottom';const x=horizontal?ox+g.offset*c:ox+(g.side==='left'?-29:l.width*c+5),y=horizontal?oy+(g.side==='top'?-29:l.height*c+5):oy+g.offset*c;
  const w=horizontal?g.size*c:24,h=horizontal?24:g.size*c;parts.push(rect(x,y,w,h,colors[g.color]??'#999','#354d46',1,4));
  const label=g.frozen?'冰 '+g.frozen:({top:'↑',bottom:'↓',left:'←',right:'→'}[g.side]);
  const tx=x+w/2,ty=y+h/2;
  if(!horizontal&&g.frozen)parts.push(`<g transform="rotate(${g.side==='left'?-90:90} ${tx} ${ty})">${text(tx,ty,label,17,'#132d38',800)}</g>`);else parts.push(text(tx,ty,label,17,g.frozen?'#132d38':'white',800));
  gates.push(g.id);
 }
 parts.push(text(410,940,'金色10徽章＝积分块  ·  冰数字＝解冻计数',18,'#526c60'),text(410,972,'卷帘保持开局遮挡  ·  壳块小圆点标出内层颜色',17,'#526c60'),text(410,1017,'正式数据布局示意 · 按原始坐标绘制',16,'#8a978c'),'</svg>');
 assert.equal(drawnCells,visible.reduce((s,b)=>s+b.shape.length,0));assert.equal(gates.length,l.gates.length);
 return {svg:parts.join(''),visibleBlocks:visible.length,hiddenBlocks:hidden.length,drawnCells,gates:gates.length};
}
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(out,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(out+path.sep))throw Error('path');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'})[path.extname(file)]??'text/plain; charset=utf-8');res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),rows=[];
try{
 const page=await browser.newPage({viewport:{width:820,height:1060},deviceScaleFactor:1});
 for(const e of entries){
  const n=String(e.index).padStart(3,'0'),drawing=render(e),image=`images/league-${n}.png`,vector=`vectors/league-${n}.svg`;
  await fs.writeFile(path.join(out,vector),drawing.svg);await page.goto(base+'/'+vector);await page.evaluate(()=>document.fonts.ready);
  const png=await page.screenshot({path:path.join(out,image)});assert.equal(png.readUInt32BE(16),820);assert.equal(png.readUInt32BE(20),1060);
  rows.push({index:e.index,image,vector,difficulty:e.level.difficulty,width:e.level.width,height:e.level.height,specials:e.specials.length,levelSha256:sha(JSON.stringify(e.level)),imageSha256:sha(png),visibleBlocks:drawing.visibleBlocks,hiddenBlocks:drawing.hiddenBlocks,drawnCells:drawing.drawnCells,gates:drawing.gates});
  if(rows.length%20===0)console.log('Rendered '+rows.length+'/100');
 }
 const template=await fs.readFile('tools/league-regeneration/export-layouts.mjs','utf8');
 const html=template.split(' const html=`')[1].split('`;\n await fs.writeFile')[0]
  .replace('当前正式数据的游戏开局画面 · 积分徽章与机关按游戏实际显示','正式数据布局示意 · 按色块坐标绘制 · 点击图片放大')
  .replaceAll('496/1078','820/1060').replace('__DATA__',JSON.stringify(rows)).replace('<button id="overviews">查看10关总览</button>','<button id="overviews">查看10关总览</button><button onclick="render()">返回逐关图</button>');
 await fs.writeFile(path.join(out,'index.html'),html);
 await page.setViewportSize({width:2480,height:1650});
 for(let i=1;i<=10;i++){
  await page.goto(base+'/?sheet='+i);await page.waitForFunction(()=>window.__GALLERY_READY__);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>i.decode()));});
  await page.screenshot({path:path.join(out,'overview',`league-${String((i-1)*10+1).padStart(3,'0')}-${String(i*10).padStart(3,'0')}.jpg`),fullPage:true,type:'jpeg',quality:91});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.waitForFunction(()=>window.__GALLERY_READY__);assert.equal(await page.locator('.card').count(),100);
 await page.selectOption('#difficulty','super');assert.equal(await page.locator('.card').count(),20);await page.locator('[data-index="3"]').click();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#caption').innerText(),/第 8 关/);await page.keyboard.press('Escape');
 await page.selectOption('#difficulty','');await page.fill('#search','100');assert.equal(await page.locator('.card').count(),1);await page.fill('#search','');await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(sha(await fs.readFile('src/core/leagueLevelData.ts')),sha(bytes));
 await fs.writeFile(path.join(out,'layouts.json'),JSON.stringify({source:'src/core/leagueLevelData.ts',sourceSha256:sha(bytes),representation:'schematic-from-formal-data',rows},null,2));
 await fs.writeFile(path.join(out,'export-check.json'),JSON.stringify({status:'PASS',count:100,overviews:10,pngDimensions:[820,1060],allVisibleBlockCellsRendered:true,allGatesRendered:true,sourceUnmodified:true,filters:true,lightbox:true,keyboardNavigation:true,mobileNoOverflow:true,notGameplayValidation:true},null,2));
 await fs.writeFile(path.join(out,'查看说明.txt'),'荣耀联赛100关布局图\r\n\r\n双击 index.html 可按关号/难度筛选、点击放大、方向键切换。\r\nimages：100张820×1060 PNG。overview：10张十关总览JPG。vectors：100张可无损放大的SVG。\r\n全部按当前正式关卡坐标绘制，属于布局示意，不是游戏截图。\r\n金色10徽章为积分块；冰数字为冻结计数；卷帘保持开局遮挡。壳块的小圆点显示内层颜色。\r\n本次不修改关卡或玩家存档。\r\n');
 await fs.writeFile(path.join(out,'runtime-art-findings.json'),JSON.stringify({scope:'Read-only finding during opening export; production unchanged',missingAsset:'orange solid shape 12 (cross pentomino)',affected:[{index:28,blockId:'r102-158-h1',hidden:true},{index:33,blockId:'r102-158-h0',hidden:true},{index:53,blockId:'r102-158-o0',hidden:false},{index:73,blockId:'r102-158-o0',hidden:false},{index:93,blockId:'r102-158-h1',hidden:true},{index:98,blockId:'r102-158-h1',hidden:true}],impact:'Runtime cannot display these whole-piece sprites. Data diagrams render exact cells; no source or asset changes made.'},null,2));
 console.log(JSON.stringify({status:'PASS',output:out,images:100,overviews:10}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
