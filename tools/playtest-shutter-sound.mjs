import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname), 'Local source server only');
const suppliedAudio = process.env.SHUTTER_SOUND_SOURCE ?? 'C:/Users/Administrator/Downloads/juanlian.mp3';
const sourceUrl = new URL('__shutter_sound_fixture__', baseUrl).href;
const output = resolve(root, `playtest-results/shutter-sound-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const files = ['src/game/ColorEscapeGame.ts', 'src/game/revisedRegionAnimation.ts', 'src/game/shutterOpenSound.ts', 'src/platform/Host.ts',
  'src/platform/WebHost.ts', 'src/platform/WechatHost.ts', 'src/audio/ProceduralSoundscape.ts',
  'src/core/PuzzleModel.ts', 'src/core/levels.ts', 'docs/rules/manifest.json', 'docs/mechanism-rules-v1.39.0.md',
  'tools/playtest-shutter-sound.mjs', ...['shutter', 'shell', 'exit', 'mechanic'].map(k => `public/assets/audio/sfx/${k}.mp3`), suppliedAudio];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(resolve(root, file)))])));
const report = { status: 'running', sourceUrl, output, suppliedAudio, sourcesBefore: await hashes(), scenarios: [], errors: [],
  limits: 'Production input/model/animation/audio with isolated MemoryHost fixtures and native Chromium WebAudio. Muted headless output, not listening, full-campaign, or WeChat real-device certification. Pause fixture adds only 0.7s presentation delay through the existing transition capture; no model or animation-age jumps.' };
await mkdir(output, { recursive: false });

function fixture(revised = true, initial = false) {
  return { id: 992, name: `Isolated ${revised ? 'revised' : 'legacy'} shutter sound`,
    ...(revised ? { mechanismRules: 'revised-2026-09-23-v1.4' } : {}),
    difficulty: 'normal', timeSeconds: 180, reward: 0, parMoves: 3, width: 5, height: 5, blocked: [],
    shutters: [{ id: 'curtain', x: 3, y: 3, width: 1, height: 1, count: initial ? 0 : 2 }],
    gates: [{ id: 'red', side: 'top', offset: 1, size: 1, color: 'red' },
      { id: 'blue', side: 'left', offset: 0, size: 1, color: 'blue' },
      { id: 'green', side: 'bottom', offset: 3, size: 1, color: 'green' },
      { id: 'yellow', side: 'right', offset: 4, size: 1, color: 'yellow' }],
    blocks: [{ id: 'layered', x: 1, y: 1, shape: [[0, 0]], color: 'red', layers: ['red', 'blue'] },
      { id: 'hidden', x: 3, y: 3, shape: [[0, 0]], color: 'green', shutterId: 'curtain' },
      { id: 'sentinel', x: 4, y: 4, shape: [[0, 0]], color: 'yellow' }] };
}

const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { PuzzleModel } from '/src/core/PuzzleModel.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { sampleRevisedRegionAnimation } from '/src/game/revisedRegionAnimation.ts';
let game;
const probe={stage:'startup',requests:[],decodes:[],starts:[],oscillators:[],frames:[],beforeFrame:[]},bufferUrls=new WeakMap();
const transitions=()=>game?game.revisedTransitions.map(t=>({...t,sample:(t.kind==='shutter'||t.kind==='lift')?sampleRevisedRegionAnimation(t.kind,t.age,game.save.reducedMotion):null})):[];
const createSource=AudioContext.prototype.createBufferSource;
AudioContext.prototype.createBufferSource=function(...args){const source=createSource.apply(this,args),start=source.start.bind(source);
 source.start=(...times)=>{const entry={stage:probe.stage,url:bufferUrls.get(source.buffer)??null,duration:source.buffer?.duration,
 contextState:this.state,startTime:times[0],ended:false};probe.starts.push(entry);source.addEventListener('ended',()=>{entry.ended=true},{once:true});return start(...times)};return source};
const createOscillator=AudioContext.prototype.createOscillator;
AudioContext.prototype.createOscillator=function(...args){probe.oscillators.push({stage:probe.stage});return createOscillator.apply(this,args)};
class MemoryHost extends WebHost {
 data=new Map();
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}
 storageSet(k,v){this.data.set(k,structuredClone(v));return true}
 music(){super.music('silent',false)} vibrate(){}
 sound(kind){probe.requests.push({stage:probe.stage,kind,screen:game?.screen,at:performance.now(),beforeFrame:structuredClone(probe.beforeFrame),transitions:transitions()});super.sound(kind)}
}
const host=new MemoryHost(),decode=host.decodeAudioAsset.bind(host);
host.decodeAudioAsset=async path=>{const buffer=await decode(path),url=new URL(path,document.baseURI).href;bufferUrls.set(buffer,url);
 let peak=0,square=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const sample of buffer.getChannelData(c)){peak=Math.max(peak,Math.abs(sample));square+=sample*sample}
 probe.decodes.push({url,duration:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,frames:buffer.length,peak,rms:Math.sqrt(square/buffer.length/buffer.numberOfChannels)});return buffer};
host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:200,coins:1000,sound:true,haptic:false,reducedMotion:false,
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:Date.now()+3600000},
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
 boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],dailyStreak:0,lastDailyCompletedDay:''});
game=new ColorEscapeGame(host);
const test={game,host,probe,extraDelay:0,install:(fixture,options)=>{
 test.extraDelay=options.extraDelay??0;game.save.reducedMotion=options.reduced??false;game.loadLevel(1,true);
 game.model=new PuzzleModel(structuredClone(fixture),{deferExitCompletion:true});
 if(options.initial)game.captureInitialGeneratorSpawns();
 game.dirty=true;game.scheduleFrame();
}};
window.__SHUTTER_TEST__=test;
const capture=game.captureRevisedMechanicTransitions.bind(game);
game.captureRevisedMechanicTransitions=(before,after,delay=0)=>capture(before,after,delay+test.extraDelay);
const frame=game.frame.bind(game);
game.frame=time=>{probe.beforeFrame=transitions();try{return frame(time)}finally{if(game.model.level.id===992){
 probe.frames.push({stage:probe.stage,screen:game.screen,transitions:transitions()});if(probe.frames.length>1500)probe.frames.shift();}}};
game.start();
</script>`;

const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
let page;
const debug = () => page.evaluate(() => window.__SHUTTER_TEST__.game.getDebugState());
const point = (x, y) => page.evaluate(({ x, y }) => {
  const s = window.__SHUTTER_TEST__.game.getDebugState(), r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.x + s.viewportTransform.offsetX + x * s.viewportTransform.scale,
    y: r.y + s.viewportTransform.offsetY + y * s.viewportTransform.scale };
}, { x, y });
const click = async key => {
  const s = await debug(), hit = s.interactionTargets.targets[key]?.hit; assert(hit, `Real UI target ${key}`);
  const p = await point(hit.x + hit.width / 2, hit.y + hit.height / 2); await page.mouse.click(p.x, p.y);
};
const stage = name => page.evaluate(name => { window.__SHUTTER_TEST__.probe.stage = name; }, name);
const audio = name => page.evaluate(name => {
  const p = window.__SHUTTER_TEST__.probe;
  return Object.fromEntries(['requests', 'starts', 'oscillators'].map(key => [key, p[key].filter(entry => entry.stage === name)]));
}, name);
const count = (a, kind) => a.requests.filter(r => r.kind === kind).length;
const install = async (f, options = {}) => {
  await page.evaluate(({ f, options }) => window.__SHUTTER_TEST__.install(f, options), { f, options });
  await page.waitForFunction(() => { const s = window.__SHUTTER_TEST__.game.getDebugState();
    return s.screen === 'playing' && s.art.ready && s.art.formalGameplay.requestedBlockSignature == null && !s.art.formalGameplay.missingWholeBlockIds.length; });
  assert.equal((await debug()).puzzle.mechanismRules, f.mechanismRules, 'Fixture uses its intended real model profile');
};
const drag = async side => {
  const s = await debug(), b = s.puzzle.blocks.find(block => block.id === 'layered'); assert(b);
  const start = await point(s.board.innerX + (b.x + .5) * s.board.cell, s.board.innerY + (b.y + .5) * s.board.cell);
  const [dx, dy] = side === 'top' ? [0, -2] : [-2, 0];
  const end = await point(s.board.innerX + (b.x + .5 + dx) * s.board.cell, s.board.innerY + (b.y + .5 + dy) * s.board.cell);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); assert.equal((await debug()).selectedId, 'layered');
  await page.mouse.move(end.x, end.y, { steps: 5 });
  for (let i = 0; i < 3; i++) await page.mouse.move(end.x + i * .25, end.y - i * .25);
  await page.mouse.up(); await page.mouse.up(); return debug();
};
const settled = async () => {
  await page.waitForFunction(() => { const g = window.__SHUTTER_TEST__.game;
    return !g.revisedTransitions.length && !g.exitGhosts.length && !g.mechanicPulses.length && !g.exitPulses.length; });
  await page.waitForTimeout(120);
};
const assertSources = (a, kinds) => {
  assert.deepEqual(a.oscillators, [], 'No synthetic fallback after normal audio warm-up');
  assert.deepEqual(a.starts.map(s => s.url?.split('/').at(-1)).sort(), kinds.map(k => `${k}.mp3`).sort());
  for (const source of a.starts) { assert(source.duration > 0); assert.equal(source.contextState, 'running'); }
};
const assertOpeningOnce = (a, reduced = false) => {
  assert.equal(count(a, 'shutter'), 1); assert.equal(count(a, 'mechanic'), 0, 'No old generic mechanism over shutter sound');
  const request = a.requests.find(r => r.kind === 'shutter'), transition = request.transitions.find(t => t.targetId === 'curtain');
  const prior = request.beforeFrame.find(t => t.targetId === 'curtain'), threshold = 7 / 30 * (reduced ? .5 : 1);
  assert.equal(request.screen, 'playing'); assert.equal(transition.kind, 'shutter'); assert(!transition.initial);
  assert(prior.age < threshold && transition.age >= threshold, 'Sound on actual animation opening boundary crossing');
  assert(transition.age - prior.age <= .050001, 'Normal production frame, no animation time jump');
  assert(transition.sample.openProgress >= 0 && transition.sample.openProgress < .04, 'Sound belongs to start, not end, of opening');
};

try {
  assert.equal(report.sourcesBefore[suppliedAudio], report.sourcesBefore['public/assets/audio/sfx/shutter.mp3']);
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { window.__NATIVE_STORAGE_CALLS__ = [];
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) { const original = Storage.prototype[name];
      Storage.prototype[name] = function (...args) { window.__NATIVE_STORAGE_CALLS__.push(name); return original.apply(this, args); }; } });
  page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  const responses = []; page.on('response', response => { if (response.url().endsWith('/assets/audio/sfx/shutter.mp3'))
    responses.push(response.body().then(bytes => ({ url: response.url(), status: response.status(), bytes: bytes.length, sha256: sha(bytes) }))); });
  await page.route(sourceUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(sourceUrl, { waitUntil: 'networkidle' }); await page.waitForFunction(() => window.__SHUTTER_TEST__?.game.getDebugState().art.ready);
  await install(fixture()); await stage('warmup'); await click('pause');
  await page.evaluate(async () => { await window.__SHUTTER_TEST__.host.effectsAssetsLoading; }); await click('pauseResume');
  report.decoding = await page.evaluate(() => window.__SHUTTER_TEST__.probe.decodes);
  const decoded = report.decoding.find(d => d.url.endsWith('/shutter.mp3')); assert(decoded?.peak > .01 && decoded.rms > 0 && decoded.duration > 0);
  report.httpAudio = await Promise.all(responses); assert.equal(report.httpAudio.length, 1); assert.equal(report.httpAudio[0].status, 200);
  assert.equal(report.httpAudio[0].sha256, report.sourcesBefore[suppliedAudio]);

  for (const [label, revised, reduced] of [['revised', true, false], ['legacy', false, false], ['reduced-motion', true, true]]) {
    const f = fixture(revised); await stage(`${label}-install`); await install(f, { reduced });
    await stage(`${label}-2-to-1`); const first = await drag('top'); await settled();
    assert.equal(first.puzzle.shutters[0].count, 1); assert.equal(first.puzzle.cleared, 1); assert(first.puzzle.blocks.some(b => b.id === 'layered' && b.color === 'blue'));
    const firstAudio = await audio(`${label}-2-to-1`); assert.equal(count(firstAudio, 'shutter'), 0); assert.equal(count(firstAudio, 'mechanic'), 0); assertSources(firstAudio, ['shell']);
    await page.screenshot({ path: resolve(output, `${label}-count-one.png`) });
    await stage(`${label}-opening`); const zero = await drag('left'); assert.equal(zero.puzzle.shutters[0].count, 0); assert.equal(zero.puzzle.cleared, 2);
    await settled(); const openingAudio = await audio(`${label}-opening`); assertOpeningOnce(openingAudio, reduced); assertSources(openingAudio, ['exit', 'shutter']);
    await page.screenshot({ path: resolve(output, `${label}-opened.png`) });
    report.scenarios.push({ label, status: 'PASS', fixture: f, reducedMotion: reduced, firstAudio, openingAudio, puzzle: zero.puzzle });
  }

  await stage('pause-install'); await install(fixture(), { extraDelay: .7 }); await stage('pause-first'); await drag('top'); await settled();
  await stage('pause-opening'); await drag('left'); await click('pause');
  const paused = await debug(); assert.equal(paused.screen, 'paused');
  const transition = paused.revisedMechanismAnimations.find(t => t.targetId === 'curtain'); assert(transition && transition.age < 7 / 30);
  assert.equal(count(await audio('pause-opening'), 'shutter'), 0, 'Paused before opening cue');
  await stage('paused-wait'); await page.waitForTimeout(420);
  assert.deepEqual((await debug()).revisedMechanismAnimations, paused.revisedMechanismAnimations, 'Pause freezes exact transition age');
  assertSources(await audio('paused-wait'), []); assert.equal(count(await audio('paused-wait'), 'shutter'), 0);
  await page.screenshot({ path: resolve(output, 'paused-before-opening.png') });
  await stage('resume'); await click('pauseResume'); await settled();
  const resumed = await audio('resume'); assertOpeningOnce(resumed); assertSources(resumed, ['button', 'shutter']);
  report.scenarios.push({ label: 'real-pause-before-opening-and-resume-once', status: 'PASS', extraPresentationDelaySeconds: .7, paused, resumed });

  await stage('initial-presentation'); await install(fixture(true, true), { initial: true });
  const initial = await debug(); assert(initial.revisedMechanismAnimations.some(t => t.kind === 'shutter' && t.initial));
  await settled(); const initialAudio = await audio('initial-presentation'); assert.equal(count(initialAudio, 'shutter'), 0); assertSources(initialAudio, []);
  report.scenarios.push({ label: 'constructor-settled-initial-presentation-excluded', status: 'PASS', initial: initial.revisedMechanismAnimations, audio: initialAudio });

  await stage('mute-setting'); await click('pause'); await click('pause.sound'); await click('pauseResume'); assert.equal((await debug()).settings.sound, false);
  await install(fixture()); await stage('muted'); await drag('top'); await settled(); const mutedZero = await drag('left'); await settled();
  assert.equal(mutedZero.puzzle.shutters[0].count, 0); assert.equal(mutedZero.puzzle.cleared, 2);
  const mutedAudio = await audio('muted'); assert.deepEqual(mutedAudio, { requests: [], starts: [], oscillators: [] });
  report.scenarios.push({ label: 'real-muted-setting-suppresses-open-sound', status: 'PASS', audio: mutedAudio, puzzle: mutedZero.puzzle });
  await page.screenshot({ path: resolve(output, 'muted-opened.png') });
  report.audio = await page.evaluate(() => window.__SHUTTER_TEST__.probe);
  report.nativeStorageCalls = await page.evaluate(() => window.__NATIVE_STORAGE_CALLS__); assert.deepEqual(report.nativeStorageCalls, []);
  assert.deepEqual(report.errors, []); report.sourcesAfter = await hashes(); assert.deepEqual(report.sourcesAfter, report.sourcesBefore);
  report.status = 'PASS'; await context.close();
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; report.sourcesAfter = await hashes();
  if (page) { report.failureDebug = await debug().catch(() => undefined); report.audio = await page.evaluate(() => window.__SHUTTER_TEST__?.probe).catch(() => undefined);
    await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {}); }
  process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close();
  console.log(JSON.stringify({ status: report.status, output, scenarios: report.scenarios.length }));
}
