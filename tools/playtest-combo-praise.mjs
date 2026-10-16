import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

// The shipped Web bundle and WebHost run unchanged on an isolated loopback
// origin. The named, sparse UI fixture is supplied through loadLevel's existing
// override. It is not a formal level or a solution/difficulty certification.
// Every tested move and button is Pointer input; animation time is natural RAF.
const output = resolve(process.env.COMBO_OUTPUT ?? `playtest-results/combo-praise-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const sourcePaths = ['src/game/ColorEscapeGame.ts', 'src/game/comboAnimation.ts', 'src/game/comboPraiseLettering.ts', 'src/core/PuzzleModel.ts'];
const sources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, sha(await readFile(p))])));
const build = async () => {
  const index = await readFile('dist/index.html', 'utf8');
  const bundle = index.match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
  assert.ok(bundle, 'Built production bundle');
  return { bundle, sha256: sha(await readFile(resolve('dist/assets', bundle))) };
};
const report = { status: 'RUNNING', sourceBindings: await sources(), build: await build(), scenarios: [], errors: [],
  scope: 'Synthetic sparse UI fixture; isolated in-memory storage behind production WebHost; real Pointer and natural RAF; no formal level or full-route claim.',
  backgroundCoverage: 'Synthetic document.hidden/visibilitychange through WebHost, not OS suspension.' };
const server = await preview({ configFile: false, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
report.origin = origin;
const browser = await chromium.launch({ headless: true });
let activePage;
const state = p => p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const compact = s => ({ screen: s.screen, level: s.level.id, combo: s.combo, moves: s.puzzle.moves,
  cleared: s.puzzle.cleared, seconds: s.puzzle.remainingSeconds, boosters: s.economy.boosters, ghosts: s.exitGhosts });
const audit = p => p.evaluate(() => window.__COMBO_TEST__.audit);
async function logical(p, x, y) {
  const s = await state(p), box = await p.locator('canvas').boundingBox(), t = s.viewportTransform;
  return { x: box.x + t.offsetX + x * t.scale, y: box.y + t.offsetY + y * t.scale };
}
async function button(p, key) {
  const v=await p.evaluate(key=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState(),r=(s.interactionTargets.targets??s.interactionTargets)[key]?.hit;
    if(!r)throw Error(`Missing real target ${key}`);const b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;
    return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},key);
  await p.mouse.click(v.x, v.y);
}
async function blockPoint(p, id) {
  return p.evaluate(id=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState(),b=s.puzzle.blocks.find(b=>b.id===id);
    if(!b)throw Error(`Missing block ${id}`);const c=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;
    return{x:c.x+t.offsetX+(s.board.innerX+(b.x+b.shape[0][0]+.5)*s.board.cell)*t.scale,
      y:c.y+t.offsetY+(s.board.innerY+(b.y+b.shape[0][1]+.5)*s.board.cell)*t.scale};},id);
}
async function drag(p, id, side) {
  const {start,end}=await p.evaluate(({id,side})=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState(),b=s.puzzle.blocks.find(b=>b.id===id);
    if(!b)throw Error(`Missing block ${id}`);const c=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;
    const project=v=>({x:c.x+t.offsetX+v.x*t.scale,y:c.y+t.offsetY+v.y*t.scale});
    const v={x:s.board.innerX+(b.x+.5)*s.board.cell,y:s.board.innerY+(b.y+.5)*s.board.cell},start=project(v);
    if(side==='top')v.y=s.board.innerY-s.board.cell*.8;if(side==='bottom')v.y=s.board.innerY+(s.level.height+.8)*s.board.cell;
    if(side==='left')v.x=s.board.innerX-s.board.cell*.8;if(side==='right')v.x=s.board.innerX+(s.level.width+.8)*s.board.cell;
    return{start,end:project(v)};},{id,side});
  await p.mouse.move(start.x, start.y); await p.mouse.down();
  await p.mouse.move(end.x, end.y, { steps: 4 }); await p.mouse.up();
  return state(p);
}
async function move(p, id, dx, dy) {
  const s = await state(p), start = await blockPoint(p, id), end = { x: start.x + dx * s.board.cell * s.viewportTransform.scale,
    y: start.y + dy * s.board.cell * s.viewportTransform.scale };
  await p.mouse.move(start.x, start.y); await p.mouse.down(); await p.mouse.move(end.x, end.y, { steps: 4 }); await p.mouse.up();
  return state(p);
}
async function ready(p) {
  await p.waitForFunction(() => { const g = window.__COLOR_ESCAPE__, s = g.getDebugState(); return s.screen === 'playing'
    && s.level.id === 21 && !g.revisedArtLoading && !g.navigationTransition && !g.directLevelTransition
    && !g.hasActiveMechanicMotion() && !g.hasInitialRevisedRegionPresentation()
    && s.art.formalGameplay.missingWholeBlockIds.length===0
    && window.__COMBO_TEST__.lastDrawName===s.level.name; }, undefined, { timeout: 30000 });
}
async function fixture(p, timeSeconds = 180) {
  const spec = { id: 21, name: 'UI fixture: consecutive exit praise', difficulty: 'normal',
    mechanismRules: 'revised-2026-09-27-v1.5', width: 6, height: 6, timeSeconds, reward: 0, parMoves: 99,
    playable: Array.from({ length: 36 }, (_, i) => [i % 6, Math.floor(i / 6)]), blocked: [],
    gates: [
      { id: 'red-top', side: 'top', offset: 1, size: 1, color: 'red' },
      { id: 'blue-top', side: 'top', offset: 3, size: 1, color: 'blue' },
      { id: 'green-right', side: 'right', offset: 1, size: 1, color: 'green' },
      { id: 'yellow-right', side: 'right', offset: 3, size: 1, color: 'yellow' },
      { id: 'purple-bottom', side: 'bottom', offset: 4, size: 1, color: 'purple' },
      { id: 'orange-bottom', side: 'bottom', offset: 1, size: 1, color: 'orange' },
      { id: 'pink-left', side: 'left', offset: 2, size: 1, color: 'pink' },
      { id: 'cyan-right', side: 'right', offset: 2, size: 1, color: 'cyan' },
    ], blocks: [
      { id: 'red', x: 1, y: 0, color: 'red' }, { id: 'blue', x: 3, y: 0, color: 'blue' },
      { id: 'green', x: 5, y: 1, color: 'green' }, { id: 'yellow', x: 5, y: 3, color: 'yellow' },
      { id: 'purple', x: 4, y: 5, color: 'purple' }, { id: 'orange', x: 1, y: 5, color: 'orange' },
      { id: 'shell', x: 0, y: 2, color: 'pink', layers: ['pink', 'cyan'] },
      { id: 'mover', x: 2, y: 4, color: 'green' }, { id: 'sentinel', x: 3, y: 4, color: 'blue' },
    ].map(b => ({ ...b, shape: [[0, 0]] })) };
  await p.evaluate(spec => window.__COLOR_ESCAPE__.loadLevel(spec.id, true, false, spec), spec); await ready(p);
  assert.equal((await state(p)).combo.count, 0); return spec;
}
async function planCaptures(p, plans) {
  await p.evaluate(plans => { const t = window.__COMBO_TEST__; t.plans = plans; t.audit = { frames: [], captures: [], pointer: [], texts: [] }; }, plans);
}
async function waitCapture(p, label) {
  await p.waitForFunction(label => window.__COMBO_TEST__.audit.captures.some(c => c.label === label), label, { timeout: 4000 });
}
async function saveCaptures(p, row) {
  const captures = await p.evaluate(() => window.__COMBO_TEST__.audit.captures);
  row.keyframes = [];
  for (const c of captures) {
    const file = resolve(output, `${row.name}-${c.label}.png`);
    await writeFile(file, Buffer.from(c.dataUrl.split(',')[1], 'base64'));
    const { dataUrl, ...metadata } = c; row.keyframes.push({ ...metadata, file }); row.images.push(file);
  }
  await p.evaluate(() => { for (const c of window.__COMBO_TEST__.audit.captures) delete c.dataUrl; });
}
async function snap(p, row, label) { const file = resolve(output, `${row.name}-${label}.png`); await p.screenshot({ path: file }); row.images.push(file); }
async function prepare(viewport, reducedMotion = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(({ reducedMotion }) => {
    const seed = { schemaVersion: 1, currentLevel: 21, highestLevel: 26, coins: 777, sound: false, music: false, haptic: false,
      reducedMotion, language: 'zh-CN', featureSeen: ['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
      boosterUnlockSeen: ['time','rocket','pulse'], boosterUsageSeen: ['time','rocket','pulse'], boosters: { time: 9, rocket: 9, pulse: 9 },
      bestStars: {}, bestMoves: {}, rewardedLevels: Array.from({ length: 25 }, (_, i) => i + 1),
      collectionIntroPending: false, collectionIntroShown: true, leagueIntroSeen: true,
      journeyProgress: { claimedMilestoneLevels: [5,10,15,20,25], seenEpisodeUnlockLevels: [1,11,21] },
      lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: Date.now() + 86400000 } };
    const data = new Map([['color-escape-save-v1', JSON.stringify(seed)]]), accesses = [], violations = [];
    for (const key of ['getItem','setItem','removeItem','clear']) Storage.prototype[key] = function () { violations.push(key); throw Error('Native player storage forbidden'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem(k) { accesses.push({ op: 'read', key: k }); return data.get(k) ?? null; },
      setItem(k,v) { accesses.push({ op: 'write', key: k }); data.set(k,String(v)); }, removeItem(k) { data.delete(k); },
      clear() { data.clear(); }, key(n) { return [...data.keys()][n] ?? null; }, get length() { return data.size; },
    } });
    window.__COMBO_TEST__ = { data, accesses, violations, plans: [], audit: { frames: [], captures: [], pointer: [], texts: [] } };
  }, { reducedMotion });
  const p = await context.newPage(); activePage = p;
  p.on('pageerror', e => report.errors.push({ viewport, message: e.message }));
  p.on('console', m => { if (m.type() === 'error') report.errors.push({ viewport, message: m.text() }); });
  await p.goto(origin, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady, undefined, { timeout: 60000 });
  assert.ok((await p.locator('script[src]').evaluateAll(nodes => nodes.map(n => n.src))).some(src => src.endsWith(report.build.bundle)));
  await p.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, t = window.__COMBO_TEST__, original = g.render;
    g.render = function (...args) {
      const result = original.apply(this,args), s = this.getDebugState();
      t.lastDrawName=s.level.name;
      if (s.combo) {
        t.audit.frames.push({ at: performance.now(), screen: s.screen, combo: s.combo });
        for (const plan of t.plans) {
          const praise = s.combo.praises.find(p => p.count === plan.count);
          if (!praise || praise.age < plan.age || t.audit.captures.some(c => c.label === plan.label)) continue;
          t.audit.captures.push({ ...plan, requestedAge: plan.age, age: praise.age, combo: s.combo,
            dataUrl: this.host.canvas.toDataURL('image/png') });
        }
      }
      return result;
    };
    // Observe the real vector strokes inside the production presentation call;
    // the lettering no longer depends on fillText or installed system fonts.
    const present=g.drawComboPresentation, stroke=g.ctx.stroke;
    let praiseWords=[], praiseIndex=0, inPraise=false;
    g.drawComboPresentation=function(...args){
      praiseWords=this.getDebugState().combo.praises.filter(p=>p.scale>0&&p.opacity>0);praiseIndex=0;inPraise=true;
      try{return present.apply(this,args);}finally{inPraise=false;}
    };
    g.ctx.stroke=function(...args){
      const result=stroke.apply(this,args);
      if(inPraise&&praiseWords[praiseIndex])t.audit.texts.push({text:praiseWords[praiseIndex++].text,method:'vector-outline',at:performance.now()});
      return result;
    };
    for (const type of ['pointerdown','pointerup','pointercancel']) g.host.canvas.addEventListener(type, e => {
      const row={type,x:e.clientX,y:e.clientY,loading:g.revisedArtLoading,motion:g.hasActiveMechanicMotion(),initial:g.hasInitialRevisedRegionPresentation()};t.audit.pointer.push(row);
      queueMicrotask(()=>{row.selected=g.selectedId;row.pointer=g.activePointer;row.combo=g.getDebugState().combo;});
    }, true);
  });
  return { context, p };
}
async function three(p) { await drag(p,'red','top'); await drag(p,'blue','top'); const s = await drag(p,'green','right'); assert.equal(s.combo.count,3); return s; }
async function hold(p, hidden) {
  if (hidden) await p.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
  const before = await state(p); await p.waitForTimeout(450); const after = await state(p);
  assert.deepEqual(after.combo,before.combo); assert.equal(after.puzzle.remainingSeconds,before.puzzle.remainingSeconds);
  if (hidden) await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  return { before:compact(before),after:compact(after) };
}

try {
  for (const viewport of [{ width:320,height:568 },{ width:496,height:1078 }]) {
    const { context,p } = await prepare(viewport), row = { name:`consecutive-${viewport.width}`,images:[] }; report.scenarios.push(row);
    row.fixture = await fixture(p); await snap(p,row,'fixture');
    const first = await drag(p,'red','top'); assert.equal(first.combo.count,1); assert.equal(first.combo.praises.length,0);
    await p.waitForTimeout(3200); const waited = await state(p); assert.equal(waited.combo.count,1);
    assert.ok(waited.puzzle.remainingSeconds < first.puzzle.remainingSeconds - 3, 'Natural clock runs during the long gap');
    const second = await drag(p,'blue','top'); assert.equal(second.combo.count,2); assert.equal(second.combo.praises.length,0);
    const center = await blockPoint(p,'mover'); await p.mouse.click(center.x,center.y); assert.equal((await state(p)).combo.count,2);
    await p.mouse.move(center.x,center.y); await p.mouse.down();
    await p.evaluate(center => { const g=window.__COLOR_ESCAPE__; g.host.canvas.dispatchEvent(new PointerEvent('pointercancel',{pointerId:g.activePointer,pointerType:'mouse',clientX:center.x,clientY:center.y,bubbles:true})); },center);
    await p.mouse.up(); assert.equal((await state(p)).combo.count,2,'Canceled interior selection preserves count');
    await planCaptures(p,[{label:'good',count:3,age:.15},{label:'great',count:4,age:.15},
      {label:'excellent-pop',count:5,age:.05},{label:'excellent-sparkles',count:5,age:.24},
      {label:'excellent-hold',count:5,age:.4},{label:'excellent-out',count:5,age:.79}]);
    const shell = await drag(p,'shell','left'); assert.equal(shell.combo.count,3);
    assert.ok(shell.puzzle.blocks.some(b=>b.id==='shell' && b.color==='cyan' && b.layers.length===1),'Shell remains as cyan body');
    await waitCapture(p,'good'); const fourth = await drag(p,'green','right'); assert.equal(fourth.combo.count,4);
    assert.ok(fourth.combo.praises.length>=2||(await audit(p)).frames.some(f=>f.combo.praises.length>=2),'Rapid consecutive praise coexists in naturally drawn frames');
    await waitCapture(p,'great'); const fifth = await drag(p,'yellow','right'); assert.equal(fifth.combo.count,5);
    await waitCapture(p,'excellent-out'); await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().combo.praises.length===0);
    assert.equal((await state(p)).combo.count,5,'Praise expiration does not expire the streak');
    await saveCaptures(p,row); row.audit=await audit(p);
    for (const text of ['Good!','Great!','Excellent!']) assert.ok(row.audit.texts.some(t=>t.text===text),`Real Canvas draw ${text}`);
    for (const capture of row.keyframes) assert.ok(capture.age>=capture.requestedAge && capture.age<capture.requestedAge+.15);
    const moved = await move(p,'mover',0,-1); assert.equal(moved.combo.count,0,'Effective non-clear drag breaks streak');
    const resumed = await drag(p,'purple','bottom'); assert.equal(resumed.combo.count,1);
    await button(p,'booster.rocket'); const rocketTarget=await blockPoint(p,'sentinel');await p.mouse.click(rocketTarget.x,rocketTarget.y);
    await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.some(b=>b.id==='sentinel'));
    const rocket=await state(p);assert.equal(rocket.combo.count,1,'Rocket does not increase or break manual drag streak');
    row.first=compact(first);row.waited=compact(waited);row.shell=compact(shell);row.fifth=compact(fifth);row.moved=compact(moved);row.resumed=compact(resumed);row.rocket=compact(rocket);row.status='PASS';

    const life = { name:`lifecycle-${viewport.width}`,images:[] }; report.scenarios.push(life); await fixture(p); await three(p);
    await button(p,'pause'); assert.equal((await state(p)).screen,'paused'); life.paused=await hold(p,false); await snap(p,life,'paused');
    await button(p,'pauseResume'); life.background=await hold(p,true);
    // The existing WebHost lifecycle deliberately opens the pause screen when
    // backgrounded; foregrounding requires the player's real Continue click.
    if((await state(p)).screen==='paused')await button(p,'pauseResume');await p.waitForTimeout(80);
    const foreground=await state(p);assert.equal(foreground.combo.count,3);
    assert.ok(!foreground.combo.praises.length||foreground.combo.praises[0].age>life.background.after.combo.praises[0].age,'Foreground Continue resumes animation');
    await button(p,'pause'); await button(p,'pauseRestart'); await ready(p); assert.deepEqual((await state(p)).combo,{count:0,praises:[]});
    await fixture(p);await three(p);await button(p,'pause');await button(p,'pauseHome');
    assert.equal((await state(p)).combo.count,0,'Leaving gameplay clears combo');
    await fixture(p,5); await three(p); await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==='failed',undefined,{timeout:8000});
    assert.deepEqual((await state(p)).combo,{count:0,praises:[]},'Timeout clears combo'); await snap(p,life,'failed'); life.status='PASS';
    assert.deepEqual(await p.evaluate(()=>window.__COMBO_TEST__.violations),[]); await context.close();

    const reduced=await prepare(viewport,true), rr={name:`reduced-${viewport.width}`,images:[]};report.scenarios.push(rr);
    await fixture(reduced.p);await planCaptures(reduced.p,[{label:'static',count:3,age:.12}]);await three(reduced.p);await waitCapture(reduced.p,'static');
    await pSafeEnded(reduced.p);await saveCaptures(reduced.p,rr);rr.audit=await audit(reduced.p);
    const samples=rr.audit.frames.flatMap(f=>f.combo.praises);assert.ok(samples.length>3);
    assert.ok(samples.every(s=>s.scale===1),'Reduced motion keeps fixed scale');
    assert.ok(new Set(samples.map(s=>`${s.x},${s.y}`)).size===1,'Reduced motion does not travel');
    assert.ok(samples.some(s=>s.opacity<1),'Reduced motion fades');rr.status='PASS';
    assert.deepEqual(await reduced.p.evaluate(()=>window.__COMBO_TEST__.violations),[]);await reduced.context.close();
  }
  assert.deepEqual(report.errors,[]); report.status='PASS';
} catch(e) {
  report.status='FAIL';report.failure=e.stack??String(e);process.exitCode=1;
  if(activePage&&!activePage.isClosed()){report.lastState=await state(activePage).catch(()=>null);report.lastAudit=await audit(activePage).catch(()=>null);await activePage.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
} finally {
  report.finalSourceBindings=await sources();report.finalBuild=await build();
  report.sourceStable=JSON.stringify(report.sourceBindings)===JSON.stringify(report.finalSourceBindings);
  report.buildStable=JSON.stringify(report.build)===JSON.stringify(report.finalBuild);
  if(!report.sourceStable||!report.buildStable){report.status='FAIL_BINDING_CHANGED';process.exitCode=1;}
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));
}
console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,errors:report.errors.length,failure:report.failure,sourceStable:report.sourceStable,buildStable:report.buildStable,output},null,2));
async function pSafeEnded(p){await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().combo.praises.length===0);}
