import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname), 'Local source server only');
const suppliedAudio = process.env.SHELL_SOUND_SOURCE ?? 'C:/Users/Administrator/Downloads/waike.mp3';
const output = resolve(root, `playtest-results/shell-sound-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const sourceUrl = new URL('__shell_sound_fixture__', baseUrl).href;
const files = ['src/game/ColorEscapeGame.ts', 'src/platform/Host.ts', 'src/platform/WebHost.ts',
  'src/platform/WechatHost.ts', 'src/audio/ProceduralSoundscape.ts', 'src/core/PuzzleModel.ts', 'src/core/levels.ts',
  'docs/rules/manifest.json', 'docs/mechanism-rules-v1.39.0.md', 'tools/playtest-shell-sound.mjs',
  ...['shell', 'exit', 'ice', 'thaw'].map(kind => `public/assets/audio/sfx/${kind}.mp3`), suppliedAudio];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(resolve(root, file)))])));
const report = { status: 'running', sourceUrl, output, suppliedAudio, sourcesBefore: await hashes(), scenarios: [], errors: [],
  limits: 'Isolated MemoryHost fixture, production model/render/input/audio, real mouse Pointer and native Chromium WebAudio. Muted headless output; not a listening, real-phone/WeChat, or campaign completion certification.' };
await mkdir(output, { recursive: false });

const fixture = { id: 991, name: 'Isolated shell audio regression', runtimeProfile: 'revised-2026-09-23-v1.4',
  difficulty: 'normal', timeSeconds: 180, reward: 0, parMoves: 3, width: 5, height: 5, blocked: [],
  gates: [{ id: 'red', side: 'top', offset: 1, size: 1, color: 'red' },
    { id: 'blue', side: 'left', offset: 0, size: 1, color: 'blue' },
    { id: 'yellow', side: 'bottom', offset: 3, size: 1, color: 'yellow' },
    { id: 'green', side: 'right', offset: 4, size: 1, color: 'green' }],
  blocks: [{ id: 'layered', x: 1, y: 1, shape: [[0, 0]], color: 'red', layers: ['red', 'blue'] },
    { id: 'ice', x: 3, y: 3, shape: [[0, 0]], color: 'yellow', frozen: 2 },
    { id: 'sentinel', x: 4, y: 4, shape: [[0, 0]], color: 'green' }] };
report.fixture = fixture;
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { PuzzleModel } from '/src/core/PuzzleModel.ts';
import { WebHost } from '/src/platform/WebHost.ts';
const probe={stage:'startup',requests:[],decodes:[],starts:[],oscillators:[]}, bufferUrls=new WeakMap();
const nativeCreateSource=AudioContext.prototype.createBufferSource;
AudioContext.prototype.createBufferSource=function(...args){
 const source=nativeCreateSource.apply(this,args),start=source.start.bind(source),connect=source.connect.bind(source);let gain;
 source.connect=(destination,...rest)=>{if(destination.gain)gain=destination.gain;return connect(destination,...rest)};
 source.start=(...times)=>{const entry={stage:probe.stage,url:bufferUrls.get(source.buffer)??null,duration:source.buffer?.duration,
  contextState:this.state,contextTime:this.currentTime,startTime:times[0],gain:gain?.value,ended:false};
  probe.starts.push(entry);source.addEventListener('ended',()=>{entry.ended=true;entry.endedAt=performance.now()},{once:true});return start(...times)};
 return source;
};
const nativeCreateOscillator=AudioContext.prototype.createOscillator;
AudioContext.prototype.createOscillator=function(...args){probe.oscillators.push({stage:probe.stage});return nativeCreateOscillator.apply(this,args)};
class MemoryHost extends WebHost {
 data=new Map();
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}
 storageSet(k,v){this.data.set(k,structuredClone(v));return true}
 music(){super.music('silent',false)}
 vibrate(){}
 sound(kind){probe.requests.push({stage:probe.stage,kind,at:performance.now()});super.sound(kind)}
}
const host=new MemoryHost(),decode=host.decodeAudioAsset.bind(host);
host.decodeAudioAsset=async path=>{const buffer=await decode(path),url=new URL(path,document.baseURI).href;bufferUrls.set(buffer,url);
 let peak=0,square=0;for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(const sample of data){peak=Math.max(peak,Math.abs(sample));square+=sample*sample}}
 probe.decodes.push({url,duration:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,frames:buffer.length,
  peak,rms:Math.sqrt(square/buffer.length/buffer.numberOfChannels)});return buffer};
host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:200,coins:1000,sound:true,haptic:false,reducedMotion:false,
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:Date.now()+3600000},
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
 boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],dailyStreak:0,lastDailyCompletedDay:''});
const game=new ColorEscapeGame(host);
window.__SHELL_TEST__={game,host,probe,install:fixture=>{game.loadLevel(1,true);game.model=new PuzzleModel(structuredClone(fixture),{deferExitCompletion:true});game.dirty=true;game.scheduleFrame()}};
game.start();
</script>`;

const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
let page;
const debug = () => page.evaluate(() => window.__SHELL_TEST__.game.getDebugState());
const point = (x, y) => page.evaluate(({ x, y }) => {
  const s = window.__SHELL_TEST__.game.getDebugState(), r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.x + s.viewportTransform.offsetX + x * s.viewportTransform.scale,
    y: r.y + s.viewportTransform.offsetY + y * s.viewportTransform.scale };
}, { x, y });
const click = async key => {
  const s = await debug(), hit = s.interactionTargets.targets[key]?.hit; assert(hit, `Real button ${key} exists`);
  const p = await point(hit.x + hit.width / 2, hit.y + hit.height / 2); await page.mouse.click(p.x, p.y);
};
const stage = name => page.evaluate(name => { window.__SHELL_TEST__.probe.stage = name; }, name);
const stageAudio = name => page.evaluate(name => {
  const p = window.__SHELL_TEST__.probe;
  return Object.fromEntries(['requests', 'starts', 'oscillators'].map(key => [key, p[key].filter(entry => entry.stage === name)]));
}, name);
const counts = audio => Object.fromEntries(['shell', 'exit', 'ice', 'thaw', 'mechanic'].map(kind => [kind,
  audio.requests.filter(request => request.kind === kind).length]));
const ready = () => page.waitForFunction(() => {
  const s = window.__SHELL_TEST__.game.getDebugState();
  return s.screen === 'playing' && s.art.ready && s.art.formalGameplay.requestedBlockSignature == null
    && !s.art.formalGameplay.missingWholeBlockIds.length;
});
const install = async () => { await page.evaluate(f => window.__SHELL_TEST__.install(f), fixture); await ready(); };
const blockPoint = async id => {
  const s = await debug(), b = s.puzzle.blocks.find(block => block.id === id); assert(b, `Fixture block ${id} exists`);
  return point(s.board.innerX + (b.x + .5) * s.board.cell, s.board.innerY + (b.y + .5) * s.board.cell);
};
const drag = async (side, duplicateMoves = false) => {
  const s = await debug(), b = s.puzzle.blocks.find(block => block.id === 'layered'), start = await blockPoint('layered');
  const [dx, dy] = side === 'top' ? [0, -2] : [-2, 0];
  const end = await point(s.board.innerX + (b.x + .5 + dx) * s.board.cell, s.board.innerY + (b.y + .5 + dy) * s.board.cell);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  assert.equal((await debug()).selectedId, 'layered', 'Real Pointer selects layered block');
  await page.mouse.move(end.x, end.y, { steps: 5 });
  if (duplicateMoves) for (let i = 0; i < 4; i++) await page.mouse.move(end.x + i * .25, end.y - i * .25);
  await page.mouse.up();
  if (duplicateMoves) { await page.mouse.up(); await page.mouse.move(end.x + 1, end.y); }
  return debug();
};
const settled = async () => {
  await page.waitForFunction(() => { const g = window.__SHELL_TEST__.game; return !g.exitGhosts.length && !g.mechanicPulses.length && !g.exitPulses.length; });
  await page.waitForTimeout(150);
};
const assertRecorded = (audio, kinds) => {
  assert.deepEqual(audio.oscillators, [], 'Warm input never falls back to synthesized oscillators');
  assert.deepEqual(audio.starts.map(entry => entry.url?.split('/').at(-1)).sort(), kinds.map(kind => `${kind}.mp3`).sort(), 'Native sources use only expected recorded buffers');
  for (const entry of audio.starts) { assert(entry.duration > 0); assert.equal(entry.contextState, 'running'); assert(entry.gain > 0); }
};

try {
  assert.equal(report.sourcesBefore[suppliedAudio], report.sourcesBefore['public/assets/audio/sfx/shell.mp3'], 'Exact supplied MP3, no transcode');
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__NATIVE_STORAGE_CALLS__ = [];
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function (...args) { window.__NATIVE_STORAGE_CALLS__.push(name); return original.apply(this, args); };
    }
  });
  page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  const responses = [];
  page.on('response', response => {
    if (response.url().endsWith('/assets/audio/sfx/shell.mp3')) responses.push(response.body().then(bytes => ({ url: response.url(), status: response.status(), bytes: bytes.length, sha256: sha(bytes) })));
  });
  await page.route(sourceUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(sourceUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__SHELL_TEST__?.game.getDebugState().art.ready);
  await install(); await stage('warmup'); await click('pause');
  await page.evaluate(async () => { await window.__SHELL_TEST__.host.effectsAssetsLoading; });
  await click('pauseResume');
  report.decoding = await page.evaluate(() => window.__SHELL_TEST__.probe.decodes);
  const decoded = report.decoding.find(entry => entry.url.endsWith('/shell.mp3'));
  assert(decoded && decoded.duration > 0 && decoded.frames > 0 && decoded.peak > .01 && decoded.rms > 0, 'Real browser decoded non-silent supplied MP3');
  report.httpAudio = await Promise.all(responses); assert.equal(report.httpAudio.length, 1);
  assert.equal(report.httpAudio[0].status, 200); assert.equal(report.httpAudio[0].sha256, report.sourcesBefore[suppliedAudio]);
  await page.screenshot({ path: resolve(output, '01-opening.png') });

  await stage('invalid-ice'); const icePoint = await blockPoint('ice'); await page.mouse.click(icePoint.x, icePoint.y);
  const iceState = await debug(), iceAudio = await stageAudio('invalid-ice');
  assert.equal(iceState.puzzle.cleared, 0); assert.equal(iceState.puzzle.moves, 0); assert.equal(iceState.puzzle.blocks.find(b => b.id === 'ice').frozen, 2);
  assert.deepEqual(counts(iceAudio), { shell: 0, exit: 0, ice: 1, thaw: 0, mechanic: 0 }); assertRecorded(iceAudio, ['ice']);
  report.scenarios.push({ label: 'ordinary-frozen-block-invalid-input', status: 'PASS', audio: iceAudio, puzzle: iceState.puzzle });

  await stage('shell'); const peeled = await drag('top', true);
  const inner = peeled.puzzle.blocks.find(b => b.id === 'layered');
  assert(inner, 'Core remains after shell removal'); assert.equal(inner.color, 'blue'); assert.deepEqual(inner.layers, ['blue']);
  assert.equal(peeled.puzzle.cleared, 1); assert.equal(peeled.puzzle.moves, 1);
  assert.equal(peeled.puzzle.blocks.find(b => b.id === 'ice').frozen, 1);
  await page.screenshot({ path: resolve(output, '02-peeled-core-remains.png') });
  await settled(); const shellAudio = await stageAudio('shell');
  assert.deepEqual(counts(shellAudio), { shell: 1, exit: 0, ice: 0, thaw: 0, mechanic: 0 }); assertRecorded(shellAudio, ['shell']);
  assert.equal((await debug()).puzzle.cleared, 1, 'Duplicate real pointer moves/up neither strip nor clear core');
  report.scenarios.push({ label: 'shell-once-including-delayed-pulse-and-duplicate-pointer', status: 'PASS', audio: shellAudio, puzzle: peeled.puzzle });

  await stage('core-exit'); const exited = await drag('left', true); await settled();
  assert(!exited.puzzle.blocks.some(b => b.id === 'layered'), 'Body actually leaves');
  assert.equal(exited.puzzle.cleared, 2); assert.equal(exited.puzzle.moves, 2); assert.equal(exited.puzzle.blocks.find(b => b.id === 'ice').frozen, 0);
  const exitAudio = await stageAudio('core-exit');
  assert.deepEqual(counts(exitAudio), { shell: 0, exit: 1, ice: 0, thaw: 1, mechanic: 0 }); assertRecorded(exitAudio, ['exit', 'thaw']);
  report.scenarios.push({ label: 'body-exit-preserved-and-genuine-thaw-preserved', status: 'PASS', audio: exitAudio, puzzle: exited.puzzle });
  await page.screenshot({ path: resolve(output, '03-body-exit-ice-thawed.png') });

  await stage('mute-setting'); await click('pause'); await click('pause.sound'); await click('pauseResume');
  assert.equal((await debug()).settings.sound, false, 'Real pause settings toggle muted sound');
  assert.equal(await page.evaluate(() => window.__SHELL_TEST__.host.data.get('color-escape-save-v1').sound), false, 'Mute persisted only in MemoryHost');
  await install(); await stage('muted'); const mutedIcePoint = await blockPoint('ice'); await page.mouse.click(mutedIcePoint.x, mutedIcePoint.y);
  const mutedPeel = await drag('top', true); assert.equal(mutedPeel.puzzle.cleared, 1); assert(mutedPeel.puzzle.blocks.some(b => b.id === 'layered'));
  await settled(); const mutedExit = await drag('left', true); assert.equal(mutedExit.puzzle.cleared, 2); await settled();
  const mutedAudio = await stageAudio('muted'); assert.deepEqual(mutedAudio, { requests: [], starts: [], oscillators: [] });
  report.scenarios.push({ label: 'real-muted-setting-suppresses-ice-shell-exit-thaw', status: 'PASS', audio: mutedAudio, puzzle: mutedExit.puzzle });
  await page.screenshot({ path: resolve(output, '04-muted-identical-actions.png') });
  await page.waitForFunction(() => window.__SHELL_TEST__.probe.starts.filter(s => s.url?.endsWith('/shell.mp3')).every(s => s.ended));
  report.audio = await page.evaluate(() => window.__SHELL_TEST__.probe);
  report.nativeStorageCalls = await page.evaluate(() => window.__NATIVE_STORAGE_CALLS__); assert.deepEqual(report.nativeStorageCalls, []);
  assert.deepEqual(report.errors, []); report.sourcesAfter = await hashes(); assert.deepEqual(report.sourcesAfter, report.sourcesBefore, 'Bound sources/audio untouched throughout run');
  report.status = 'PASS'; await context.close();
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; report.sourcesAfter = await hashes();
  if (page) { report.failureDebug = await debug().catch(() => undefined); report.audio = await page.evaluate(() => window.__SHELL_TEST__?.probe).catch(() => undefined);
    await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {}); }
  process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); console.log(JSON.stringify({ status: report.status, output, scenarios: report.scenarios.length }));
}
