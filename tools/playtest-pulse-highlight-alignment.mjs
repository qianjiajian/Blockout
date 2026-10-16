import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const mode=process.argv[2]??'after';
const output=resolve(process.env.PULSE_ALIGNMENT_OUTPUT??`playtest-results/pulse-highlight-alignment-20261014-${mode}-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const entry="import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';import {WebHost} from './src/platform/WebHost.ts';const game=new ColorEscapeGame(new WebHost());window.__COLOR_ESCAPE__=game;game.start();";
let bytes,sources;
if(mode==='before'){
 bytes=await readFile(resolve(output,'fixture.js'));sources=JSON.parse(await readFile(resolve(output,'sources.json'),'utf8'));
}else{
 const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'pulse-fixture.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
 bytes=bundle.outputFiles[0].contents;sources={};for(const path of Object.keys(bundle.metafile.inputs).filter(f=>f!=='pulse-fixture.ts'))sources[path]=sha(await readFile(path));
 await writeFile(resolve(output,'fixture.js'),bytes);await writeFile(resolve(output,'sources.json'),JSON.stringify(sources,null,2)+'\n');
}
console.log(JSON.stringify({snapshot:output,game:sources['src/game/ColorEscapeGame.ts'],pulse:sources['src/game/pulseAnimation.ts']}));
const report={status:'RUNNING',mode,scope:'Formal Lv10, unchanged level data; source bundle on isolated HTTP, production WebHost with MemoryStorage; actual Pointer and natural RAF, no real saves or WeChat device claims.',sources,cases:[],errors:[],failedRequests:[]};
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const server=createServer(async(req,res)=>{try{if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(html);return}if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bytes);return}const path=resolve('public','.'+decodeURIComponent((req.url??'').split('?')[0]));if(!path.startsWith(resolve('public')+sep)){res.statusCode=403;res.end();return}res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]??'application/octet-stream');res.end(await readFile(path))}catch(error){res.statusCode=404;res.end();report.failedRequests.push({url:req.url,error:error.message})}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
const checkpoint=()=>writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const state=p=>p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
async function click(p,key){const s=await state(p),r=(s.interactionTargets.targets??s.interactionTargets)[key]?.hit;assert(r,'Pointer target '+key);const b=await p.locator('canvas').boundingBox(),t=s.viewportTransform;await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12})}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
try{
 for(const viewport of [{width:390,height:844},{width:430,height:932}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,timezoneId:'Asia/Shanghai'});
  await context.addInitScript(()=>{
   const seed={schemaVersion:1,currentLevel:10,highestLevel:26,coins:777,sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','generator'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:9,rocket:9,pulse:9},rewardedLevels:Array.from({length:25},(_,i)=>i+1),bestStars:{},collectionIntroPending:false,collectionIntroShown:true,featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}};
   const data=new Map([['color-escape-save-v1',JSON.stringify(seed)]]),accesses=[],violations=[];
   for(const key of ['getItem','setItem','removeItem','clear'])Storage.prototype[key]=function(){violations.push(key);throw Error('Native storage forbidden')};
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){accesses.push({op:'read',key:k});return data.get(k)??null},setItem(k,v){accesses.push({op:'write',key:k});data.set(k,String(v))},removeItem(k){data.delete(k)},clear(){data.clear()},key(n){return [...data.keys()][n]??null},get length(){return data.size}}});window.__PULSE_QA__={data,accesses,violations,frames:[],captures:[],baseline:[],points:[]};
  });
  const p=await context.newPage();p.on('pageerror',error=>report.errors.push({viewport,message:error.message}));await p.goto(origin+'/fixture');
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady,undefined,{timeout:60000});
  await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.featureUnlockGuide=undefined;g.collectionIntro=undefined;g.journeyPresentation=undefined;g.loadLevel(10,true)});
  await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='playing'&&g.model.level.id===10&&!g.revisedArtLoading&&!g.navigationTransition&&!g.directLevelTransition&&!g.formalBlockArtLoading&&!g.formalIceArtLoading},undefined,{timeout:30000});await p.waitForTimeout(150);
  await p.evaluate(()=>{
   const g=window.__COLOR_ESCAPE__,qa=window.__PULSE_QA__,ctx=g.ctx,b=g.boardLayout();
   const readPoints=()=>{const pixels=ctx.getImageData(0,0,g.host.canvas.width,g.host.canvas.height);return qa.points.map(point=>{const offset=(point.py*pixels.width+point.px)*4;return {...point,rgb:Array.from(pixels.data.slice(offset,offset+3))}})};
   const transform=g.viewportTransform();
   for(const block of g.model.snapshot().blocks)for(const [dx,dy]of block.shape)for(const [ox,oy]of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]){const x=b.innerX+(block.x+dx+ox)*b.cell,y=b.innerY+(block.y+dy+oy)*b.cell;qa.points.push({id:block.id,frozen:block.frozen,x,y,px:Math.round(transform.offsetX+x*transform.scale),py:Math.round(transform.offsetY+y*transform.scale)})}
   qa.baseline=readPoints();qa.baselineData=g.host.canvas.toDataURL('image/png');qa.drawnIce=[];let drawing=false,current,owner,drawingIce=false;
   const boardDraw=g.drawBoard;g.drawBoard=function(...args){qa.drawnIce=[];return boardDraw.apply(this,args)};
   for(const key of ['drawFormalFrozenBlock','drawFormalFrozenCells','drawGateIceStripSegment']){const original=g[key];g[key]=function(...args){const previous=drawingIce;drawingIce=true;try{return original.apply(this,args)}finally{drawingIce=previous}}}
   const originalBlock=g.drawBlock;g.drawBlock=function(block,...args){const previous=owner;owner={kind:'block',id:block.id,frozen:block.frozen};if(drawing)current.redraws.push({...owner});try{return originalBlock.call(this,block,...args)}finally{owner=previous}};
   const originalGate=g.drawGate;g.drawGate=function(...args){const previous=owner;owner={kind:'gate',side:args[0],offset:args[1]};if(drawing)current.redraws.push({...owner});try{return originalGate.apply(this,args)}finally{owner=previous}};
   const image=ctx.drawImage,stroke=ctx.stroke,move=ctx.moveTo,line=ctx.lineTo,begin=ctx.beginPath,rect=ctx.rect;let path=[];
   ctx.drawImage=function(source,...args){const m=this.getTransform();const draw={src:source.src??'',owner,args,width:source.naturalWidth||source.width,height:source.naturalHeight||source.height,alpha:this.globalAlpha,transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}};if(drawing)current.images.push(draw);if(drawingIce)qa.drawnIce.push(draw);return image.call(this,source,...args)};
   ctx.beginPath=function(...args){path=[];return begin.apply(this,args)};ctx.moveTo=function(...args){path.push({op:'move',args});return move.apply(this,args)};ctx.lineTo=function(...args){path.push({op:'line',args});return line.apply(this,args)};ctx.rect=function(...args){path.push({op:'rect',args});return rect.apply(this,args)};
   ctx.stroke=function(...args){if(drawing){const m=this.getTransform();current.strokes.push({path:structuredClone(path),style:this.strokeStyle,width:this.lineWidth,alpha:this.globalAlpha,transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}})}return stroke.apply(this,args)};
   const draw=g.drawPulsePresentation;g.drawPulsePresentation=function(){const sample=this.pulseAnimation.sample(this.save.reducedMotion);if(!sample.visible)return draw.call(this);current={sample,iceDraws:structuredClone(qa.drawnIce),highlights:this.pulseHighlightRects?[...this.pulseHighlightRects(sample.targets)]:sample.targets.map(t=>[t.kind+':'+t.id,t.rects]),redraws:[],images:[],strokes:[],stock:this.availablePulseStock(),actualStock:this.save.boosters.pulse,spent:this.save.activeRun?.boosterSpent.pulse??0};drawing=true;try{const result=draw.call(this);qa.frames.push(current);for(const[label,requestedAge]of [['launch',.2],['gather',.5],['wave',.78],['fade',1.16]]){if(sample.age>=requestedAge&&!qa.captures.some(c=>c.label===label))qa.captures.push({label,requestedAge,frame:structuredClone(current),pixels:readPoints(),data:this.host.canvas.toDataURL('image/png')})}return result}finally{drawing=false;current=undefined}};
  });
  const before=await state(p),row={name:'formal-lv10-'+viewport.width,scope:'Unmodified formal Lv10',viewport,status:'RUNNING',before,images:[]};report.cases.push(row);
  const qaBefore=await p.evaluate(()=>({baseline:window.__PULSE_QA__.baseline,data:window.__PULSE_QA__.baselineData}));row.baseline=qaBefore.baseline;const baselineFile=resolve(output,row.name+'-before.png');await writeFile(baselineFile,Buffer.from(qaBefore.data.split(',')[1],'base64'));row.images.push(baselineFile);
  await click(p,'booster.pulse');const immediate=await state(p);assert(immediate.pulseAnimation.visible,'pulse started by Pointer');await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.pulseAnimation.isVisible,undefined,{timeout:5000});
  const ended=await state(p),qa=await p.evaluate(()=>({frames:window.__PULSE_QA__.frames,captures:window.__PULSE_QA__.captures,violations:window.__PULSE_QA__.violations,accesses:window.__PULSE_QA__.accesses,available:window.__COLOR_ESCAPE__.availablePulseStock()}));
  assert.deepEqual(qa.captures.map(c=>c.label),['launch','gather','wave','fade']);assert.deepEqual(qa.violations,[]);row.nativeStorageViolations=qa.violations;
  for(const block of before.puzzle.blocks){const first=immediate.puzzle.blocks.find(b=>b.id===block.id),last=ended.puzzle.blocks.find(b=>b.id===block.id);assert.equal(first.frozen,Math.max(0,block.frozen-2),'real decrement '+block.id);assert.equal(last.frozen,first.frozen,'decrement once '+block.id)}
  for(const gate of before.puzzle.gates){const first=immediate.puzzle.gates.find(b=>b.id===gate.id),last=ended.puzzle.gates.find(b=>b.id===gate.id);assert.equal(first.frozen,Math.max(0,gate.frozen-2),'gate decrement '+gate.id);assert.equal(last.frozen,first.frozen)}
  const spentBefore=before.activeRun?.boosterSpent.pulse??0,spentAfter=ended.activeRun?.boosterSpent.pulse??0;assert.equal(qa.available,before.economy.boosters.pulse-spentBefore-1,'one available item consumed');assert.equal(spentAfter,spentBefore+1,'Lv10 reserves one item under existing rescue rule');
  assert.equal(ended.puzzle.moves,before.puzzle.moves);assert.equal(ended.puzzle.cleared,before.puzzle.cleared);row.immediate=immediate;row.ended=ended;row.frames=qa.frames;row.keyframes=[];
  for(const capture of qa.captures){assert(capture.frame.sample.age-capture.requestedAge<.1,'natural frame timing');const file=resolve(output,row.name+'-'+capture.label+'.png');await writeFile(file,Buffer.from(capture.data.split(',')[1],'base64'));const {data,...metadata}=capture;row.keyframes.push({...metadata,file});row.images.push(file)}
  const gather=row.keyframes.find(c=>c.label==='gather');const ratios=gather.pixels.map((point,index)=>{const base=row.baseline[index],lum=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return{id:point.id,frozen:point.frozen,ratio:lum(point.rgb)/Math.max(1,lum(base.rgb))}});
  row.brightness={iceMedian:median(ratios.filter(p=>p.frozen>0).map(p=>p.ratio)),ordinaryMedian:median(ratios.filter(p=>p.frozen===0).map(p=>p.ratio))};
  row.alignment=[];const targetMap=new Map(gather.frame.highlights),viewportTransform=before.viewportTransform;
  const gates=[...targetMap.keys()].filter(key=>key.startsWith('gate:'));
  for(const draw of gather.frame.iceDraws){
   const key=draw.owner?.kind==='block'?'block:'+draw.owner.id:draw.src.includes('/formal-ice-v1/ice-')&&gates.length===1?gates[0]:undefined;
   const rects=targetMap.get(key);if(!rects)continue;
   const args=draw.args.length===8?draw.args.slice(4):draw.args.length===4?draw.args:[draw.args[0],draw.args[1],draw.width,draw.height];const [x,y,w,h]=args,m=draw.transform;
   const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>({x:m.a*a+m.c*b+m.e,y:m.b*a+m.d*b+m.f}));
   const actual={x:Math.min(...corners.map(p=>p.x)),y:Math.min(...corners.map(p=>p.y)),right:Math.max(...corners.map(p=>p.x)),bottom:Math.max(...corners.map(p=>p.y))};
   const focus={x:Math.min(...rects.map(r=>r.x))*viewportTransform.scale+viewportTransform.offsetX,y:Math.min(...rects.map(r=>r.y))*viewportTransform.scale+viewportTransform.offsetY,right:Math.max(...rects.map(r=>r.x+r.width))*viewportTransform.scale+viewportTransform.offsetX,bottom:Math.max(...rects.map(r=>r.y+r.height))*viewportTransform.scale+viewportTransform.offsetY};
   const maxError=Math.max(...Object.keys(actual).map(key=>Math.abs(actual[key]-focus[key])));row.alignment.push({key,source:draw.src,actual,focus,maxError});
  }
  row.outlines=gather.frame.strokes.filter(s=>s.style.startsWith('rgba(103, 239, 255,')).map((stroke,index)=>{
   const target=gather.frame.sample.targets[index],key=target.kind+':'+target.id,m=stroke.transform;
   const points=stroke.path.filter(p=>p.op==='move'||p.op==='line').map(p=>({x:m.a*p.args[0]+m.c*p.args[1]+m.e,y:m.b*p.args[0]+m.d*p.args[1]+m.f}));
   const bounds={x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))},actual=row.alignment.find(a=>a.key===key)?.actual;
   return{key,bounds,actual,maxError:actual?Math.max(...Object.keys(actual).map(k=>Math.abs(bounds[k]-actual[k]))):null};
  });
  if(mode!=='before'){assert(row.brightness.iceMedian>.82,'frozen blocks should retain original brightness');assert(row.brightness.ordinaryMedian<.8,'ordinary blocks should remain dim');assert.equal(row.alignment.length,gather.frame.sample.targets.length,'captured all target ice bitmaps including gate');for(const a of row.alignment)assert(a.maxError<.1,'focus bound aligns with actual frozen bitmap '+a.key+': '+a.maxError);assert.equal(row.outlines.length,row.alignment.length);for(const outline of row.outlines)assert(outline.maxError!==null&&outline.maxError<.1,'actual outline matches bitmap '+outline.key+': '+outline.maxError)}
  row.status=mode==='before'?'BASELINE_CAPTURED':'PASS';await checkpoint();await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.status=mode==='before'?'BASELINE_CAPTURED':'PASS';await checkpoint();console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({name:c.name,brightness:c.brightness})),output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}finally{await browser.close();await new Promise(r=>server.close(r))}
