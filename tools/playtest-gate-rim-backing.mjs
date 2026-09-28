import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
const output = resolve(root, `playtest-results/gate-rim-backing-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const borderDir = 'public/assets/art/gameplay/board/formal-border-v2';
const files = ['src/game/ColorEscapeGame.ts', 'src/game/boardRim.ts', 'src/game/exitMaterialAnimation.ts',
  'src/core/PuzzleModel.ts', 'src/core/gatePortals.ts', 'src/core/levels.ts', 'src/platform/WebHost.ts',
  'docs/rules/manifest.json', 'docs/mechanism-rules-v1.39.0.md', 'tools/playtest-gate-rim-backing.mjs',
  ...(await readdir(resolve(root, borderDir))).filter(name => name.endsWith('.png')).map(name => `${borderDir}/${name}`)];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file,
  createHash('sha256').update(await readFile(resolve(root, file))).digest('hex')])));
const report = { scope: 'Isolated presentation fixtures, actual production Canvas + real Pointer + natural animation time. Not campaign difficulty/completion certification or phone/WeChat device verification.',
  output, sourcesBefore: await hashes(), scenarios: [], errors: [] };
await mkdir(output, { recursive: false });

const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { PuzzleModel } from '/src/core/PuzzleModel.ts';
import { WebHost } from '/src/platform/WebHost.ts';
class MemoryHost extends WebHost {
  data = new Map();
  storageRead(k) { return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}; }
  storageGet(k,f) { const r=this.storageRead(k);return r.status==='ok'?r.value:f; }
  storageSet(k,v) {this.data.set(k,structuredClone(v));return true;}
  music() {} sound() {} vibrate() {}
}
const host=new MemoryHost();
host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:200,coins:1000,sound:false,haptic:false,reducedMotion:false,
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:Date.now()+3600000},
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
 boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],dailyStreak:0,lastDailyCompletedDay:''});
const game=new ColorEscapeGame(host), test={game,host,frames:[],captures:{},fixture:null,loads:0,epoch:0};
window.__RIM_TEST__=test;
const load=game.loadLevel.bind(game);
game.loadLevel=(...args)=>{load(...args);if(test.fixture){
 game.model=new PuzzleModel(structuredClone(test.fixture),{deferExitCompletion:true});test.loads++;test.epoch++;
 game.dirty=true;game.scheduleFrame();
}};
test.install=(fixture,reduced)=>{test.fixture=fixture;game.save.reducedMotion=reduced;game.loadLevel(1,true);test.frames=[];test.captures={};};
const render=game.render.bind(game),drawBoard=game.drawBoard.bind(game),drawImage=game.ctx.drawImage.bind(game.ctx);
let frame,base;
game.drawBoard=(...args)=>{base=game.ctx.getTransform();try{return drawBoard(...args)}finally{base=undefined}};
game.render=(...args)=>{
 const snapshot=game.model.snapshot(),gate=snapshot.gates.find(g=>g.id==='target-gate'),pulse=game.exitPulses.find(p=>p.gateId==='target-gate');
 frame={epoch:test.epoch,screen:game.screen,board:game.boardLayout(),cleared:snapshot.cleared,moves:snapshot.moves,
  present:snapshot.blocks.some(b=>b.id==='target'),pulses:structuredClone(game.exitPulses),age:pulse?.age??null,
  opacity:gate?game.gateExitOpacity(snapshot,gate.side,gate.offset,gate.size,gate.color,gate.id):null,calls:[]};
 try{return render(...args)}finally{
  if(test.fixture&&(frame.screen==='playing'||frame.screen==='paused')){
   test.frames.push(frame);if(test.frames.length>500)test.frames.shift();
   for(const [key,min,max] of [['fade-090',.88,.95],['fade-110',1.07,1.14]]){
    if(!test.captures[key]&&frame.age>=min&&frame.age<max&&frame.opacity>0&&frame.opacity<1){
     test.captures[key]={frame:structuredClone(frame),png:host.canvas.toDataURL('image/png')};
    }
   }
  }frame=undefined;
 }
};
game.ctx.drawImage=(image,...args)=>{
 const src=image?.currentSrc||image?.src||'';
 if(frame&&base&&src.includes('/formal-border-v2/')){
  const m=base.inverse().multiply(game.ctx.getTransform()),native=[image.naturalWidth||image.width,image.naturalHeight||image.height];
  const [x,y,w,h]=args.length===2?[...args,...native]:args.length===4?args:args.slice(4);
  const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f}));
  frame.calls.push({name:src.split('/').at(-1),args,native,alpha:game.ctx.globalAlpha,
   matrix:[m.a,m.b,m.c,m.d,m.e,m.f],rect:{x:Math.min(...corners.map(p=>p.x)),y:Math.min(...corners.map(p=>p.y)),
   width:Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),height:Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y))},
   composite:game.ctx.globalCompositeOperation});
 }return drawImage(image,...args);
};
game.start();
</script>`;

function fixture(side, { local = false, long = false } = {}) {
  const width = long ? 8 : 5, height = long ? 8 : 5, size = long ? 6 : 2, offset = 1;
  const origin = side === 'top' ? [offset, local ? 1 : 0] : side === 'bottom' ? [offset, height - 1]
    : side === 'left' ? [0, offset] : [width - 1, offset];
  const portal = { side, origin, size };
  const start = side === 'top' ? [offset, origin[1] + 1] : side === 'bottom' ? [offset, height - 2]
    : side === 'left' ? [1, long ? 3 : offset] : [width - 2, offset];
  const playable = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => [x, y])).flat()
    .filter(([x, y]) => !(local && y === 0 && (x === 1 || x === 2)));
  return { level: { id: 991, name: `Isolated ${side}${local ? ' inset portal' : ''}${long ? ' six-cell' : ''} rim backing`,
    ...(local ? { runtimeProfile: 'revised-2026-09-23-v1.4' } : {}), difficulty: 'normal', timeSeconds: 180, reward: 0,
    parMoves: 2, width, height, playable, blocked: [],
    gates: [{ id: 'target-gate', side, offset, size, color: 'red', ...(local ? { portals: [portal] } : {}) },
      { id: 'sentinel-gate', side: 'right', offset: height - 1, size: 1, color: 'blue' }],
    blocks: [{ id: 'target', x: start[0], y: start[1], shape: [[0, 0]], color: 'red' },
      { id: 'sentinel', x: width - 1, y: height - 1, shape: [[0, 0]], color: 'blue' }] }, portal };
}
// Canvas DOMMatrix round-trips float32 translation; 0.0001 logical px is far
// below a rendered pixel while still rejecting any response displacement.
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 1e-4, `${label}: ${actual} != ${expected}`);
const contains = (rect, p) => p.x > rect.x && p.x < rect.x + rect.width && p.y > rect.y && p.y < rect.y + rect.height;
function rimPoints(frame, portal) {
  const b = frame.board, [x, y] = portal.origin;
  return Array.from({ length: portal.size }, (_, i) => ({
    x: b.innerX + (portal.side === 'top' || portal.side === 'bottom' ? x + i + .5 : x + (portal.side === 'left' ? -.10 : 1.10)) * b.cell,
    y: b.innerY + (portal.side === 'left' || portal.side === 'right' ? y + i + .5 : y + (portal.side === 'top' ? -.10 : 1.10)) * b.cell,
  }));
}
function coveringNeutral(frame, portal) {
  const points = rimPoints(frame, portal);
  const orientation = portal.side === 'top' || portal.side === 'bottom' ? 'horizontal' : 'vertical';
  return frame.calls.filter(call => call.name.startsWith(`neutral-${orientation}-`) && points.some(point => contains(call.rect, point)));
}
function assertCoverage(frame, portal, label) {
  const calls = coveringNeutral(frame, portal);
  assert(calls.length, `${label}: native neutral exists at actual mouth`);
  for (const point of rimPoints(frame, portal)) assert(calls.some(call => contains(call.rect, point)), `${label}: continuous neutral at every portal cell`);
  for (const call of calls) {
    close(call.alpha, 1, `${label}: neutral alpha`); assert.equal(call.composite, 'source-over');
    assert.equal(call.args.length, 2, `${label}: original native strip, no crop/stretch`);
    close(call.matrix[0], frame.board.cell / 95, `${label}: native scale x`);
    close(call.matrix[3], frame.board.cell / 95, `${label}: native scale y`);
    close(call.matrix[1], 0, `${label}: no rotation`); close(call.matrix[2], 0, `${label}: no skew`);
  }
  return calls;
}
function assertFade(frame, portal, label) {
  assert(frame.opacity > 0 && frame.opacity < 1, `${label}: partial gate alpha`);
  assert.equal(frame.cleared, 1); assert.equal(frame.present, false);
  const calls = assertCoverage(frame, portal, label);
  const gateIndex = frame.calls.findIndex(call => call.name.startsWith('gate-red-'));
  assert(gateIndex >= 0, `${label}: fading colored gate still drawn`);
  assert(frame.calls[gateIndex].alpha > 0 && frame.calls[gateIndex].alpha < 1);
  assert(calls.every(call => frame.calls.indexOf(call) < gateIndex), `${label}: neutral drawn below colored gate`);
  const horizontal = portal.side === 'top' || portal.side === 'bottom';
  const [ox, oy] = portal.origin, b = frame.board;
  for (const call of calls) {
    if (horizontal) close(call.matrix[5], b.innerY + (oy + (portal.side === 'bottom' ? 1 : 0)) * b.cell, `${label}: stationary native rim Y`);
    else close(call.matrix[4], b.innerX + (ox + (portal.side === 'right' ? 1 : 0)) * b.cell, `${label}: stationary native rim X`);
  }
  if (!horizontal && portal.size > 3) {
    assert.equal(calls.length, 2, `${label}: six-cell backing uses two native three-cell strips`);
    assert(calls.every(call => call.name === 'neutral-vertical-3.png'));
    assert(calls[0].rect.y < calls[1].rect.y, `${label}: top-to-bottom shadow painter order`);
    close(calls[1].rect.y - calls[0].rect.y, b.cell * 3, `${label}: native three-cell separation`);
  }
  return calls;
}

const browser = await chromium.launch({ headless: true });
let page;
const debug = () => page.evaluate(() => window.__RIM_TEST__.game.getDebugState());
const point = (x, y) => page.evaluate(({ x, y }) => {
  const s = window.__RIM_TEST__.game.getDebugState(), r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.x + s.viewportTransform.offsetX + x * s.viewportTransform.scale,
    y: r.y + s.viewportTransform.offsetY + y * s.viewportTransform.scale };
}, { x, y });
const click = async key => {
  const s = await debug(), r = s.interactionTargets.targets[key]?.hit;
  assert(r, `Actual button ${key} exists`); const p = await point(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.click(p.x, p.y);
};
const ready = () => page.waitForFunction(() => {
  const { game } = window.__RIM_TEST__, s = game.getDebugState();
  return s.screen === 'playing' && s.art.ready && s.art.formalGameplay.requestedBlockSignature == null
    && !s.art.formalGameplay.missingWholeBlockIds.length;
});
const install = async (f, reduced = false) => {
  await page.evaluate(({ level, reduced }) => window.__RIM_TEST__.install(level, reduced), { level: f.level, reduced });
  await ready(); await page.waitForTimeout(60);
};
const drag = async side => {
  const s = await debug(), b = s.puzzle.blocks.find(b => b.id === 'target'); assert(b);
  const start = await point(s.board.innerX + (b.x + .5) * s.board.cell, s.board.innerY + (b.y + .5) * s.board.cell);
  const delta = { top: [0, -2], bottom: [0, 2], left: [-2, 0], right: [2, 0] }[side];
  const end = await point(s.board.innerX + (b.x + .5 + delta[0]) * s.board.cell, s.board.innerY + (b.y + .5 + delta[1]) * s.board.cell);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  assert.equal((await debug()).selectedId, 'target', 'Real pointer selects fixture target');
  await page.mouse.move(end.x, end.y, { steps: 5 }); await page.mouse.up();
  const after = await debug(); assert.equal(after.puzzle.cleared, 1); assert.equal(after.puzzle.moves, 1);
  assert(after.puzzle.blocks.some(b => b.id === 'sentinel'), 'Sentinel prevents win transition from obscuring retirement');
  assert(!after.puzzle.blocks.some(b => b.id === 'target')); return after;
};
const latest = () => page.evaluate(() => {
  const t = window.__RIM_TEST__; t.game.render(); return t.frames.at(-1);
});
const saveCaptures = async label => {
  const captures = await page.evaluate(() => window.__RIM_TEST__.captures);
  for (const [key, value] of Object.entries(captures)) {
    const screenshot = `${label}-${key}.png`;
    await writeFile(resolve(output, screenshot), Buffer.from(value.png.split(',')[1], 'base64'));
    value.screenshot = screenshot; delete value.png;
  }
  return captures;
};

try {
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__NATIVE_STORAGE_CALLS__ = [];
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function (...args) { window.__NATIVE_STORAGE_CALLS__.push(name); return original.apply(this, args); };
    }
  });
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  const fixtureUrl = new URL('__gate_rim_backing_fixture__', baseUrl).href;
  await page.route(fixtureUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__RIM_TEST__?.game.getDebugState().art.ready);

  for (const [label, f] of [...['top', 'right', 'bottom', 'left'].map(side => [side, fixture(side)]),
    ['top-local-portal', fixture('top', { local: true })], ['left-six-cell', fixture('left', { long: true })]]) {
    await install(f);
    const opening = await latest(); assert.equal(opening.opacity, 1);
    assert.equal(coveringNeutral(opening, f.portal).length, 0, `${label}: opaque gate does not add neutral backing early`);
    await page.screenshot({ path: resolve(output, `${label}-opening.png`) });
    await drag(f.portal.side);
    await page.waitForFunction(() => window.__RIM_TEST__.captures['fade-090'] && window.__RIM_TEST__.captures['fade-110']);
    const captures = await saveCaptures(label);
    const first = assertFade(captures['fade-090'].frame, f.portal, `${label} .9s`);
    const second = assertFade(captures['fade-110'].frame, f.portal, `${label} 1.1s`);
    assert.deepEqual(first.map(({ name, args, matrix, rect }) => ({ name, args, matrix, rect })),
      second.map(({ name, args, matrix, rect }) => ({ name, args, matrix, rect })), `${label}: backing does not move during fade`);
    await page.waitForFunction(() => !window.__RIM_TEST__.game.exitPulses.length);
    const retired = await latest(); assert.equal(retired.opacity, 0);
    const retiredNeutral = assertCoverage(retired, f.portal, `${label} retired`);
    const nativePlacement = calls => calls.map(({ name, args, matrix, rect }) => ({ name, args, matrix, rect }));
    assert.deepEqual(nativePlacement(retiredNeutral), nativePlacement(first), `${label}: retirement retains original native gate slots; never merges into adjacent neutral runs`);
    if (f.portal.size === 2) {
      assert.equal(retiredNeutral.length, 1);
      assert.equal(retiredNeutral[0].name, `neutral-${f.portal.side === 'top' || f.portal.side === 'bottom' ? 'horizontal' : 'vertical'}-2.png`);
      // Every ordinary fixture starts at offset 1: the neighboring one-cell
      // native rim must stay separate instead of swallowing this two-cell slot.
      const neighbor = { ...f.portal, origin: f.portal.side === 'top' || f.portal.side === 'bottom'
        ? [f.portal.origin[0] - 1, f.portal.origin[1]] : [f.portal.origin[0], f.portal.origin[1] - 1], size: 1 };
      if (!label.includes('local')) {
        const adjacent = assertCoverage(retired, neighbor, `${label} adjacent single cell`);
        assert(adjacent.some(call => call.name.endsWith('-1.png')), `${label}: adjacent normal one-cell strip remains one cell`);
      }
    }
    assert(!retired.calls.some(call => call.name.startsWith('gate-red-')), `${label}: retired gate is not drawn`);
    await page.screenshot({ path: resolve(output, `${label}-retired.png`) });
    const early = await page.evaluate(() => window.__RIM_TEST__.frames.filter(frame => frame.age !== null && frame.age > .1 && frame.age < .7));
    assert(early.length, 'Capture natural pre-fade frames');
    for (const frame of early) { assert.equal(frame.opacity, 1); assert.equal(coveringNeutral(frame, f.portal).length, 0); }
    report.scenarios.push({ label, fixture: f, opening, earlySample: early[0], captures, retired, status: 'PASS' });
    console.log(`PASS ${label}: actual Pointer, opaque stationary native rim below both mid-fades and after retirement`);
  }

  const reduced = fixture('right'); await install(reduced, true); await drag('right');
  await page.waitForFunction(() => !window.__RIM_TEST__.game.exitPulses.length);
  const reducedFrames = await page.evaluate(() => window.__RIM_TEST__.frames), reducedRetired = await latest();
  assert(reducedFrames.some(frame => frame.age !== null && frame.opacity === 1), 'Reduced motion retains opaque pulse before hard cut');
  assert(reducedFrames.every(frame => frame.opacity === 0 || frame.opacity === 1), 'Reduced motion has no intermediate gate fade');
  for (const frame of reducedFrames.filter(frame => frame.opacity === 1)) assert.equal(coveringNeutral(frame, reduced.portal).length, 0);
  assertCoverage(reducedRetired, reduced.portal, 'Reduced motion retirement');
  await page.screenshot({ path: resolve(output, 'reduced-motion-retired.png') });
  report.scenarios.push({ label: 'reduced-motion-hard-cut', fixture: reduced, frames: reducedFrames, retired: reducedRetired, status: 'PASS' });
  console.log('PASS reduced motion: hard cut and restored neutral');

  const lifecycle = fixture('top'); await install(lifecycle); await drag('top');
  await page.waitForFunction(() => window.__RIM_TEST__.game.exitPulses.some(pulse => pulse.age > .83 && pulse.age < 1.02));
  await click('pause'); assert.equal((await debug()).screen, 'paused');
  const paused = await latest(); assertFade(paused, lifecycle.portal, 'Paused mid-fade');
  await page.waitForTimeout(320); const stillPaused = await latest();
  assert.deepEqual(stillPaused.pulses, paused.pulses, 'Pause freezes exact pulse age');
  assert.deepEqual(coveringNeutral(stillPaused, lifecycle.portal), coveringNeutral(paused, lifecycle.portal));
  await page.screenshot({ path: resolve(output, 'paused-mid-fade.png') });
  await click('pauseResume'); assert.equal((await debug()).screen, 'playing');
  await page.waitForFunction(() => !window.__RIM_TEST__.game.exitPulses.length);
  assertCoverage(await latest(), lifecycle.portal, 'Resume retires once');
  await install(lifecycle); await drag('top');
  await page.waitForFunction(() => window.__RIM_TEST__.game.exitPulses.some(pulse => pulse.age > .83 && pulse.age < 1.02));
  await click('pause'); const loadCount = await page.evaluate(() => window.__RIM_TEST__.loads);
  await click('pauseRestart'); await ready();
  assert.equal(await page.evaluate(() => window.__RIM_TEST__.loads), loadCount + 1, 'Real restart calls production loadLevel');
  await page.waitForTimeout(420); const restarted = await latest();
  assert.equal(restarted.present, true); assert.equal(restarted.cleared, 0); assert.equal(restarted.opacity, 1);
  assert.deepEqual(restarted.pulses, []); assert.equal(coveringNeutral(restarted, lifecycle.portal).length, 0, 'Restart does not leave stale backing');
  assert(restarted.calls.some(call => call.name.startsWith('gate-red-')));
  await page.screenshot({ path: resolve(output, 'restarted-opaque-gate.png') });
  report.scenarios.push({ label: 'pause-resume-and-restart', fixture: lifecycle, paused, stillPaused, restarted, status: 'PASS' });
  console.log('PASS lifecycle: real pause freezes fade; resume completes; restart removes old pulse/backing');
  report.nativeStorageCalls = await page.evaluate(() => window.__NATIVE_STORAGE_CALLS__);
  assert.deepEqual(report.nativeStorageCalls, [], 'MemoryHost never touches browser/user persistence');
  assert.deepEqual(report.errors, []); report.sourcesAfter = await hashes();
  assert.deepEqual(report.sourcesAfter, report.sourcesBefore, 'Production, original art, rules, and test hashes stable throughout');
  report.status = 'PASS'; await context.close();
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; report.sourcesAfter = await hashes();
  if (page) {
    report.failureDebug = await debug().catch(() => undefined);
    await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  }
  process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); console.log(JSON.stringify({ status: report.status, output }));
}
