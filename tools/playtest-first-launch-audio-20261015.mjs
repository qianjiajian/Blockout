import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Uses native Chromium AudioContext/OfflineAudioContext and the real WebHost.
// Only persistence is replaced: missing-save cases begin with an empty Map.
// Instrumentation observes decoded MP3 buffers, native Source.start and an
// analyser connected in parallel to the existing master-to-destination route.
// It cannot attest to speaker output, WeChat or device-specific audio latency.
const output=resolve(process.env.FIRST_AUDIO_OUTPUT??`playtest-results/first-launch-audio-20261015/run-${Date.now()}`);
const sha=b=>createHash('sha256').update(b).digest('hex');
async function sourceHashes(){
  const files=['tools/playtest-first-launch-audio-20261015.mjs','docs/rules/manifest.json'];
  async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await walk(p);else files.push(p);}}
  await walk('src');await walk('public/assets/audio/sfx');files.push('public/assets/audio/happy-foods.mp3','public/assets/audio/happy-carnival.mp3');
  return Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
}
function fixture(sound){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
const key='color-escape-save-v1';
class MemoryHost extends WebHost {
 data=new Map(${sound?'':`[[key,{schemaVersion:1,currentLevel:1,highestLevel:1,coins:0,sound:false,music:true,haptic:false,featureSeen:[],rewardedLevels:[],bestStars:{}}]]`});
 storageRead(k){window.__AUDIO_AUDIT__.storageReads.push(k);return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){window.__AUDIO_AUDIT__.memoryWrites++;this.data.set(k,structuredClone(v));return true;}
 async resolveLeaderboardProvince(){return {province:'广东',source:'random'};}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);
window.__COLOR_ESCAPE__=game;
window.__FIRST_AUDIO__={host,game,snapshot(){return {state:game.getDebugState(),audio:window.__AUDIO_AUDIT__,settings:{sound:game.save.sound,music:game.save.music},storageViolations:window.__STORAGE_VIOLATIONS__};}};
const frame=game.render.bind(game);game.render=function(...args){const t=performance.now();if(game.screen==='playing'&&game.artReady&&!window.__AUDIO_AUDIT__.firstPlayable)window.__AUDIO_AUDIT__.firstPlayable=t;return frame(...args);};
game.start();
</script>`;}
function instrument(){
  const now=()=>performance.now();
  const audit=window.__AUDIO_AUDIT__={created:[],decodes:[],requests:[],starts:[],oscillators:[],pointers:[],samples:[],resume:[],close:[],firstPlayable:null,storageReads:[],memoryWrites:0};
  window.__STORAGE_VIOLATIONS__=[];
  for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent storage forbidden');};
  for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('IndexedDB forbidden');};
  const arrays=new WeakMap(),buffers=new WeakMap(),contexts=new WeakMap(),analysers=[];
  const slice=ArrayBuffer.prototype.slice;
  ArrayBuffer.prototype.slice=function(...args){const b=slice.apply(this,args);if(arrays.has(this))arrays.set(b,arrays.get(this));return b;};
  const ab=Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer=async function(...args){const b=await ab.apply(this,args);arrays.set(b,new URL(this.url,location.href).pathname);return b;};
  const af=window.fetch;window.fetch=function(input,...args){const url=typeof input==='string'?input:input.url??String(input);if(url.includes('/audio/'))audit.requests.push({url,time:now()});return af.call(this,input,...args);};
  const decode=BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData=function(data,...args){const row={path:arrays.get(data)??'unknown',at:now(),context:contexts.get(this)?.kind??'unknown'};audit.decodes.push(row);const result=decode.call(this,data,...args);if(result?.then)result.then(buffer=>{buffers.set(buffer,row.path);row.ready=now();row.duration=buffer.duration;row.sampleRate=buffer.sampleRate;row.channels=buffer.numberOfChannels;},e=>row.error=String(e));return result;};
  for(const name of ['AudioContext','OfflineAudioContext']){const Native=window[name];if(!Native)continue;window[name]=new Proxy(Native,{construct(Target,args){const ctx=Reflect.construct(Target,args);const row={kind:name,id:audit.created.length,at:now(),state:ctx.state};audit.created.push(row);contexts.set(ctx,row);if(name==='AudioContext'){const resume=ctx.resume.bind(ctx),close=ctx.close.bind(ctx);ctx.resume=function(...a){audit.resume.push({at:now(),state:ctx.state});return resume(...a);};ctx.close=function(...a){audit.close.push({at:now(),state:ctx.state});return close(...a);};}return ctx;}});}
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){audit.starts.push({at:now(),path:buffers.get(this.buffer)??'unmapped',duration:this.buffer?.duration??0,context:contexts.get(this.context)?.kind??'unknown',state:this.context.state,loop:this.loop,when:args[0]??0});return start.apply(this,args);};
  const oscillatorStart=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(...args){audit.oscillators.push({at:now(),type:this.type});return oscillatorStart.apply(this,args);};
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){const out=connect.call(this,destination,...args);if(destination===this.context.destination&&contexts.get(this.context)?.kind==='AudioContext'){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);analysers.push({a,context:this.context,data:new Float32Array(a.fftSize)});}return out;};
  setInterval(()=>{for(const {a,context,data}of analysers){a.getFloatTimeDomainData(data);let sum=0,peak=0;for(const n of data){sum+=n*n;peak=Math.max(peak,Math.abs(n));}if(audit.samples.length<2000)audit.samples.push({at:now(),state:context.state,rms:Math.sqrt(sum/data.length),peak});}},20);
  for(const type of ['pointerdown','pointerup'])document.addEventListener(type,e=>audit.pointers.push({type,at:now(),trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true);
}
const snapshot=page=>page.evaluate(()=>window.__FIRST_AUDIO__.snapshot());
async function realOpening(page,row){
  const before=await snapshot(page),guide=before.state.onboarding.guide;
  assert(guide?.start&&guide.points?.length>1,'Fresh first level must expose its actual opening guide');
  const box=await page.locator('canvas').boundingBox(),t=before.state.viewportTransform;
  const p=q=>({x:box.x+t.offsetX+q.x*t.scale,y:box.y+t.offsetY+q.y*t.scale});
  const first=p(guide.start);await page.mouse.move(first.x,first.y);await page.mouse.down();
  for(const point of guide.points.slice(1)){const q=p(point);await page.mouse.move(q.x,q.y,{steps:3});}
  await page.mouse.up();
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.length<window.__FIRST_AUDIO_BLOCKS__,undefined,{timeout:5000});
  await page.waitForTimeout(550);row.opening={blockId:guide.blockId,path:guide.points,removed:true};
}
await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Native Chromium decoded MP3/audio graph and real Pointer; isolated memory saves only; no claim of native WeChat, handset, hardware speaker output or production storage.',sourceBefore:await sourceHashes(),cases:[],errors:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{width:405,height:882},{width:320,height:568}])for(const scenario of [{name:'fresh',sound:true,delay:0},{name:'audio-delay-2s',sound:true,delay:2000},{name:'music-without-effects',sound:false,delay:0}]){
    const row={name:`${viewport.width}-${scenario.name}`,viewport,scenario,status:'RUNNING'},errors=[];report.cases.push(row);
    const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript(instrument);const page=await context.newPage();
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/*',async route=>{const url=route.request().url();if(url===origin+'/__first_audio__')return route.fulfill({contentType:'text/html',body:fixture(scenario.sound)});if(!url.startsWith(origin+'/')&&!url.startsWith('data:'))return route.abort();if(scenario.delay&&url.includes('/assets/audio/'))await new Promise(r=>setTimeout(r,scenario.delay));return route.continue();});
    try{
      await page.goto(origin+'/__first_audio__',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return g?.artReady&&s.screen==='playing'&&s.onboarding.guide?.points?.length>1&&!g.revisedArtLoading;},undefined,{timeout:60000});
      await page.evaluate(()=>window.__FIRST_AUDIO_BLOCKS__=window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.length);
      const before=await snapshot(page);row.before=before;
      assert.equal(before.state.level.id,1);assert.equal(before.settings.music,true);assert.equal(before.settings.sound,scenario.sound);
      assert.equal(before.audio.created.filter(c=>c.kind==='AudioContext').length,0,'No real-time context before first gesture');
      assert.equal(before.audio.starts.length,0,'No sound sources before first gesture');assert.equal(before.audio.oscillators.length,0);
      assert(before.audio.decodes.some(d=>d.path.endsWith('/happy-foods.mp3')&&d.ready),'Gameplay MP3 must be decoded before play becomes ready');
      assert(!before.audio.requests.some(d=>d.url.includes('happy-carnival')),'Fresh Lv1 must not warm the unused menu track');
      if(scenario.sound)assert(before.audio.decodes.some(d=>d.path.endsWith('/sfx/exit.mp3')&&d.ready),'First-clear recording must be predecoded');
      if(scenario.delay)assert(before.audio.firstPlayable>=Math.min(...before.audio.requests.map(r=>r.time))+scenario.delay,'Gameplay became playable before deliberately delayed audio');
      await page.screenshot({path:resolve(output,`${row.name}-ready.png`)});
      await realOpening(page,row);
      const after=await snapshot(page),pointer=after.audio.pointers.find(p=>p.type==='pointerdown');row.after=after;
      assert(pointer?.trusted,'Opening must be a trusted native Pointer');
      const music=after.audio.starts.find(s=>s.path.endsWith('/happy-foods.mp3'));
      assert(music,'Actual recorded gameplay buffer source must start');row.musicStartAfterPointerMs=music.at-pointer.at;
      assert(row.musicStartAfterPointerMs>=0&&row.musicStartAfterPointerMs<150,`Music source delayed ${row.musicStartAfterPointerMs} ms`);
      const outputSample=after.audio.samples.find(s=>s.at>=pointer.at&&s.rms>0.000001);
      assert(outputSample,'Native output analyser must observe non-zero PCM');row.firstNonzeroPcmAfterPointerMs=outputSample.at-pointer.at;
      assert(row.firstNonzeroPcmAfterPointerMs<700,'Recorded output PCM was delayed');
      const effects=after.audio.starts.filter(s=>s.path.includes('/sfx/'));
      if(scenario.sound)assert(effects.some(s=>s.path.endsWith('/exit.mp3')),'First exit must use its recording');else assert.equal(effects.length,0,'Disabled effects must stay silent');
      assert.equal(after.audio.oscillators.length,0,'Prepared opening should not use synthetic fallback tones');assert.deepEqual(after.storageViolations,[]);assert.deepEqual(errors,[]);
      await page.screenshot({path:resolve(output,`${row.name}-first-drag.png`)});
      await page.evaluate(()=>window.__FIRST_AUDIO__.host.dispose());await page.waitForTimeout(150);const disposed=await snapshot(page);row.disposed={close:disposed.audio.close,created:disposed.audio.created.length,starts:disposed.audio.starts.length};
      assert(disposed.audio.close.length>0,'Host disposal must close the native audio context');
      row.status='PASS';console.log(`PASS ${row.name}: music source ${row.musicStartAfterPointerMs.toFixed(1)} ms, PCM ${row.firstNonzeroPcmAfterPointerMs.toFixed(1)} ms`);
    }catch(e){row.status='FAIL';row.failure=String(e.stack??e);row.failedSnapshot=await snapshot(page).catch(()=>undefined);await page.screenshot({path:resolve(output,`${row.name}-failure.png`)}).catch(()=>{});report.errors.push({case:row.name,error:row.failure});console.error(`FAIL ${row.name}: ${e}`);}
    finally{row.browserErrors=errors;await context.close();}
  }
  report.sourceAfter=await sourceHashes();assert.deepEqual(report.sourceAfter,report.sourceBefore,'Source changed during audio acceptance');report.sourceUnchanged=true;
}catch(e){report.errors.push({case:'harness',error:String(e.stack??e)});}
finally{await browser.close();await server.close();report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,output}));if(report.errors.length)process.exitCode=1;}
