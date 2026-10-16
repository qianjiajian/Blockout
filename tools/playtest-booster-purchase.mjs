import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Current production classes, formal Lv20, real Pointer input and natural time.
// Every profile is synthetic and lives only in MemoryHost; persistent storage is forbidden.
const output = resolve(process.env.BOOSTER_PURCHASE_OUTPUT ?? `playtest-results/booster-purchase-20261008-${Date.now()}`);
await mkdir(output, {recursive: true});
const sha = value => createHash('sha256').update(value).digest('hex');
const rule = JSON.parse(await readFile('docs/rules/manifest.json', 'utf8'));
const files = ['tools/playtest-booster-purchase.mjs', 'docs/rules/manifest.json',
  `docs/rules/mechanism-rules-v${rule.activeVersion}.md`,
  'public/assets/art/ui/formal-pages/booster-purchase-reference-v1/panel.png'];
async function tree(dir) {
  for (const item of await readdir(dir, {withFileTypes: true})) {
    const path = dir + '/' + item.name;
    if (item.isDirectory()) await tree(path); else files.push(path);
  }
}
await tree('src');
const bindings = async () => Object.fromEntries(await Promise.all(files.map(async p => [p, sha(await readFile(p))])));
const sourceBefore = await bindings();
const prices = {time: 300, rocket: 400, pulse: 400};
const makeSeed = (language, coins = 2000) => ({
  schemaVersion: 1, currentLevel: 20, highestLevel: 20, coins, language,
  sound: false, music: false, haptic: false, reducedMotion: false,
  featureSeen: ['basics', 'ice-door', 'ice-block', 'layer', 'shutter', 'generator', 'arrow-block', 'key-lock', 'lift', 'star', 'bomb', 'flip-door', 'colored-grid'],
  boosterUnlockSeen: ['time', 'rocket', 'pulse'], boosterUsageSeen: ['time', 'rocket', 'pulse'],
  boosters: {time: 0, rocket: 0, pulse: 0},
  bestStars: {}, bestMoves: {}, rewardedLevels: Array.from({length: 19}, (_, i) => i + 1),
  featureGuideProgress: {version: 1, pending: [], seen: ['leaderboard', 'supply', 'levels', 'dailyChallenge', 'league']},
  leagueIntroSeen: true, selectedJourneyEpisode: 1,
  journeyProgress: {claimedMilestoneLevels: [5, 10, 15], seenEpisodeUnlockLevels: [11]},
  collectionIntroPending: false, collectionIntroShown: true,
  lifeState: {lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0},
  metaDiscovery: {collectionViewedThroughLevel: 20, dailyUnlockSeen: true},
});

function fixture(seed, options) {
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
const options=${JSON.stringify(options)},initial=${JSON.stringify(seed)},key='color-escape-save-v1';
const audit={phase:'startup',texts:[],images:[],writes:[],pointers:[],panelDraws:[]};
const textKeys=new Set(),imageKeys=new Set(),refs=new WeakMap();let nextRef=0,game;
class MemoryHost extends WebHost {
  data=new Map([[key,structuredClone(initial)]]); mode='commit';
  storageRead(k){if(this.mode==='unknown')return {status:'unavailable'};return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
  storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
  storageSet(k,v){if(!refs.has(v))refs.set(v,++nextRef);audit.writes.push({key:k,identity:refs.get(v),value:structuredClone(v),phase:audit.phase,at:performance.now(),mode:this.mode});if(this.mode==='reject')return false;this.data.set(k,structuredClone(v));return this.mode==='commit';}
  music(){} sound(){} vibrate(){}
  async createImage(src){const row={src,at:performance.now(),phase:audit.phase};audit.images.push(row);if(options.failPanel&&src.includes('booster-purchase-reference-v1')){row.error='Synthetic panel image failure';throw Error(row.error);}const image=await super.createImage(src);row.ready=performance.now();return image;}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__PURCHASE_TEST__={game,host,audit,options};
const fill=host.context.fillText,draw=host.context.drawImage;
host.context.fillText=function(value,...args){const text=String(value),id=audit.phase+'|'+text;if(!textKeys.has(id)){textKeys.add(id);audit.texts.push({text,args,phase:audit.phase,at:performance.now(),screen:game.screen,alpha:this.globalAlpha});}return fill.call(this,value,...args);};
host.context.drawImage=function(image,...args){if(image===game.boosterPurchaseArt){const t=this.getTransform(),matrix={a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f},id=JSON.stringify([audit.phase,args,matrix]);if(!imageKeys.has(id)){imageKeys.add(id);audit.panelDraws.push({phase:audit.phase,args,matrix,at:performance.now(),press:game.getDebugState().buttonPress});}}return draw.call(this,image,...args);};
for(const type of ['pointerdown','pointermove','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase,at:performance.now()}),true);
game.start();
</script>`;
}

const report = {status: 'RUNNING', scope: 'Formal Lv20 purchase UI with synthetic in-memory profiles; four viewport/language combinations, real Pointer gestures, natural timer. No real player storage, gameplay solution or native-phone claim.',
  sources: sourceBefore, prices, quantity: 1, cases: [], errors: []};
const server = await createServer({configFile: false, optimizeDeps: {noDiscovery: true, entries: []},
  server: {host: '127.0.0.1', port: 0, hmr: false, watch: null}, logLevel: 'error'});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({headless: true});
const state = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const saved = page => page.evaluate(() => structuredClone(window.__PURCHASE_TEST__.host.data.get('color-escape-save-v1')));
const liveSave = page => page.evaluate(() => structuredClone(window.__COLOR_ESCAPE__.save));
const phase = (page, value) => page.evaluate(v => window.__PURCHASE_TEST__.audit.phase = v, value);
const targets = s => s.interactionTargets.targets ?? s.interactionTargets;
const writes = page => page.evaluate(() => window.__PURCHASE_TEST__.audit.writes.length);
async function point(page, logical) {
  const s = await state(page), box = await page.locator('canvas').boundingBox(), t = s.viewportTransform;
  assert(box);
  return {x: box.x + t.offsetX + logical.x * t.scale, y: box.y + t.offsetY + logical.y * t.scale};
}
async function targetPoint(page, key) {
  const r = targets(await state(page))[key]?.hit;
  assert(r, `Real interaction target ${key}`);
  return point(page, {x: r.x + r.width / 2, y: r.y + r.height / 2});
}
async function click(page, key) {
  const p = await targetPoint(page, key);
  await page.mouse.click(p.x, p.y, {delay: 35});
}
const spatial = s => Object.fromEntries(['blocks', 'gates', 'shutters', 'generators', 'queuedBlocks', 'cleared', 'moves', 'complete', 'failed', 'timeFreezeSeconds'].map(k => [k, s.puzzle[k] ?? null]));
async function snap(page, row, label) {
  const file = resolve(output, `${row.name}-${label}.png`);
  await page.screenshot({path: file});
  row.images.push({file, sha256: sha(await readFile(file))});
}
async function readyPlay(page) {
  await page.waitForFunction(() => {
    const g = window.__COLOR_ESCAPE__, s = g?.getDebugState();
    return s?.screen === 'playing' && s.level.id === 20 && !g.revisedArtLoading
      && !g.boosterUnlockGuide && !g.hasInitialRevisedRegionPresentation()
      && !g.hasActiveMechanicMotion() && s.art.formalGameplay.missingWholeBlockIds.length === 0;
  }, undefined, {timeout: 30000});
}
async function open(page, kind, expectArt = true) {
  await phase(page, `${kind}-open`);
  await click(page, `booster.${kind}`);
  await page.waitForFunction(({kind, expectArt}) => {
    const s = window.__COLOR_ESCAPE__.getDebugState();
    return s.screen === 'boosterPurchase' && s.boosterPurchase?.kind === kind
      && (expectArt ? s.boosterPurchase.artReady : s.boosterPurchase.artError);
  }, {kind, expectArt}, {timeout: 15000});
  const s = await state(page);
  assert.equal(s.boosterPurchase.price, prices[kind]);
  assert.equal(s.boosterPurchase.quantity, 1);
  return s;
}
async function backgroundPoint(page, before) {
  for (const block of before.puzzle.blocks) {
    const [dx, dy] = block.shape[0], logical = {
      x: before.board.innerX + (block.x + dx + .5) * before.board.cell,
      y: before.board.innerY + (block.y + dy + .5) * before.board.cell,
    };
    const hit = Object.values(targets(await state(page))).some(t => t.hit && logical.x >= t.hit.x && logical.x <= t.hit.x + t.hit.width && logical.y >= t.hit.y && logical.y <= t.hit.y + t.hit.height);
    if (!hit) return point(page, logical);
  }
  return point(page, {x: 28, y: 470});
}

async function exercisePurchase(page, row, kind) {
  const before = await state(page), durableBefore = await saved(page), countBefore = await writes(page);
  assert.equal(durableBefore.boosters[kind], 0);
  const opened = await open(page, kind);
  const frozen = await state(page);
  await page.waitForTimeout(450);
  assert.equal((await state(page)).puzzle.remainingSeconds, frozen.puzzle.remainingSeconds, 'Modal freezes the actual level clock');
  await snap(page, row, `${kind}-open`);
  const background = await backgroundPoint(page, before);
  await phase(page, `${kind}-background`);
  await page.mouse.move(background.x, background.y); await page.mouse.down();
  await page.mouse.move(background.x + 16, background.y + 16, {steps: 4}); await page.mouse.up();
  assert.deepEqual(spatial(await state(page)), spatial(opened), 'Underlying board cannot move through the modal');
  assert.deepEqual(await saved(page), durableBefore);
  assert.equal(await writes(page), countBefore);
  assert.equal((await state(page)).screen, 'boosterPurchase');
  const buy = await targetPoint(page, 'boosterPurchase.buy');
  await phase(page, `${kind}-pressed`);
  await page.mouse.move(buy.x, buy.y); await page.mouse.down();
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().buttonPress?.renderedScale < 1);
  const pressed = (await state(page)).buttonPress;
  assert.equal(pressed.key, 'boosterPurchase.buy'); assert.equal(pressed.inside, true);
  assert.equal(pressed.visualScale, pressed.renderedScale);
  await snap(page, row, `${kind}-pressed`);
  assert.deepEqual(await saved(page), durableBefore, 'Pointerdown alone never purchases');
  const outside = await point(page, {x: 20, y: 470});
  await page.mouse.move(outside.x, outside.y, {steps: 5}); await page.mouse.up();
  assert.equal((await state(page)).screen, 'boosterPurchase');
  assert.deepEqual(await saved(page), durableBefore, 'Drag-out cancels purchase');
  assert.equal(await writes(page), countBefore);
  const clockBeforeClose = (await state(page)).puzzle.remainingSeconds;
  await phase(page, `${kind}-close`); await click(page, 'boosterPurchase.close'); await readyPlay(page);
  const closed = await state(page);
  assert.deepEqual(spatial(closed), spatial(before));
  assert.deepEqual(await saved(page), durableBefore, 'Close does not change the account');
  await page.waitForTimeout(350);
  const resumed = await state(page);
  assert(resumed.puzzle.remainingSeconds < closed.puzzle.remainingSeconds - .05, 'Clock resumes after closing');
  assert(clockBeforeClose - resumed.puzzle.remainingSeconds < 1.5, 'Modal duration is not charged after closing');
  await open(page, kind);
  const beforePurchase = await state(page);
  await phase(page, `${kind}-purchase`); await click(page, 'boosterPurchase.buy'); await readyPlay(page);
  const finalSave = await saved(page), final = await state(page);
  assert.equal(finalSave.coins, durableBefore.coins - prices[kind]);
  assert.equal(finalSave.boosters[kind], 1);
  const expected = structuredClone(durableBefore);
  expected.coins -= prices[kind]; expected.boosters[kind] = 1;
  assert.deepEqual(finalSave, expected, 'Exactly one booster and one price, with all unrelated save fields preserved');
  assert.equal(await writes(page), countBefore + 1);
  assert.deepEqual(spatial(final), spatial(beforePurchase), 'Purchase does not activate the booster');
  assert.equal(final.boosterTarget ?? null, null);
  assert.equal(final.puzzle.timeFreezeSeconds, 0);
  const texts = await page.evaluate(kind => window.__PURCHASE_TEST__.audit.texts.filter(t => t.phase === kind + '-open').map(t => t.text), kind);
  assert(texts.includes(String(prices[kind])), 'Actual canvas draws the expected price');
  assert(texts.some(t => /[×x]1/.test(t)), 'Actual canvas draws quantity one');
  await snap(page, row, `${kind}-purchased`);
  row.purchases.push({kind, price: prices[kind], quantity: 1, beforeCoins: durableBefore.coins, afterCoins: finalSave.coins,
    opened: opened.boosterPurchase, pressed, clock: {opened: frozen.puzzle.remainingSeconds, beforeClose: clockBeforeClose, closed: closed.puzzle.remainingSeconds, resumed: resumed.puzzle.remainingSeconds}, texts,
    backgroundBlocked: true, dragOutCancelled: true, closePreservedAccount: true, singleWrite: true, didNotUseBooster: true});
}

async function negative(page, row, scenario) {
  const kind = scenario === 'unknown' ? 'rocket' : 'time';
  const durable = await saved(page), beforeWrites = await writes(page);
  await open(page, kind, scenario !== 'art-failure');
  if (scenario === 'insufficient') {
    await click(page, 'boosterPurchase.buy');
    assert.equal((await state(page)).screen, 'boosterPurchase');
    assert((await state(page)).boosterPurchase.feedback);
    assert.deepEqual(await saved(page), durable); assert.equal(await writes(page), beforeWrites);
    await snap(page, row, 'insufficient'); await click(page, 'boosterPurchase.close'); await readyPlay(page);
  } else if (scenario === 'art-failure') {
    const s = await state(page);
    assert(s.boosterPurchase.artError && !s.boosterPurchase.artReady);
    await snap(page, row, 'image-failure');
    await page.evaluate(() => window.__PURCHASE_TEST__.options.failPanel = false);
    await click(page, 'boosterPurchase.artRetry');
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().boosterPurchase?.artReady);
    assert.deepEqual(await saved(page), durable, 'Image retry is not a purchase');
    assert.equal(await writes(page), beforeWrites);
    await snap(page, row, 'image-recovered'); await click(page, 'boosterPurchase.close'); await readyPlay(page);
    await page.evaluate(() => window.__PURCHASE_TEST__.options.failPanel = true);
    await open(page, kind, false);
    await snap(page, row, 'fallback-before-purchase');
    const frozen = (await state(page)).puzzle.remainingSeconds;
    await page.waitForTimeout(350);
    assert.equal((await state(page)).puzzle.remainingSeconds, frozen);
    // The product retains a complete labeled fallback, including an actual buy
    // control. Losing decorative art must not remove that explicit purchase.
    const puzzleBefore = spatial(await state(page));
    await click(page, 'boosterPurchase.buy'); await readyPlay(page);
    const expected = structuredClone(durable);
    expected.coins -= prices[kind]; expected.boosters[kind] = 1;
    assert.deepEqual(await saved(page), expected);
    assert.deepEqual(spatial(await state(page)), puzzleBefore);
    assert.equal(await writes(page), beforeWrites + 1);
    row.fallbackPurchase = {kind, price: prices[kind], quantity: 1, imageRetryDidNotCharge: true};
    await snap(page, row, 'fallback-purchased');
  } else {
    await page.evaluate(() => window.__PURCHASE_TEST__.host.mode = 'unknown');
    await click(page, 'boosterPurchase.buy');
    const pending = await state(page);
    assert.equal(pending.boosterPurchase.persistence, 'unknown');
    assert.equal(targets(pending)['boosterPurchase.close'], undefined);
    assert.deepEqual(await liveSave(page), durable);
    const candidate = await saved(page);
    assert.equal(candidate.coins, durable.coins - prices.rocket); assert.equal(candidate.boosters.rocket, 1);
    const frozen = pending.puzzle.remainingSeconds;
    await page.waitForTimeout(450); assert.equal((await state(page)).puzzle.remainingSeconds, frozen);
    const close = await point(page, {x: 400.8, y: 372.2}); await page.mouse.click(close.x, close.y, {delay: 35});
    assert.equal((await state(page)).screen, 'boosterPurchase'); assert.equal(await writes(page), beforeWrites + 1);
    await snap(page, row, 'unknown-pending');
    await page.evaluate(() => window.__PURCHASE_TEST__.host.mode = 'commit');
    await click(page, 'boosterPurchase.buy'); await readyPlay(page);
    assert.deepEqual(await saved(page), candidate); assert.deepEqual(await liveSave(page), candidate);
    const transactionWrites = await page.evaluate(start => window.__PURCHASE_TEST__.audit.writes.slice(start), beforeWrites);
    assert.equal(transactionWrites.length, 2); assert.equal(transactionWrites[0].identity, transactionWrites[1].identity);
    assert.deepEqual(transactionWrites[0].value, transactionWrites[1].value);
    row.sameCandidateRetry = true;
    await snap(page, row, 'unknown-confirmed');
  }
  row.negative = scenario;
}

async function runCase(viewport, language, scenario = 'purchases') {
  const row = {name: `${viewport.width}-${language}-${scenario}`, viewport, language, scenario, status: 'RUNNING', purchases: [], images: []};
  report.cases.push(row);
  const context = await browser.newContext({viewport, deviceScaleFactor: 1});
  await context.addInitScript(() => {
    window.__STORAGE_VIOLATIONS__ = [];
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[name] = function () {window.__STORAGE_VIOLATIONS__.push(name); throw Error('Persistent storage forbidden');};
    for (const name of ['open', 'deleteDatabase']) indexedDB[name] = function () {window.__STORAGE_VIOLATIONS__.push(name); throw Error('Persistent database forbidden');};
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push({case: row.name, type: 'pageerror', message: e.message}));
  page.on('console', message => {if (message.type() === 'error') report.errors.push({case: row.name, type: 'console', message: message.text()});});
  await page.route('**/__booster_purchase_fixture__', route => route.fulfill({contentType: 'text/html', body: fixture(makeSeed(language, scenario === 'insufficient' ? 299 : 2000), {failPanel: scenario === 'art-failure'})}));
  try {
    await page.goto(origin + '/__booster_purchase_fixture__', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => {const g = window.__COLOR_ESCAPE__; return g?.artReady && g.storageBaselineReady && g.screen === 'home' && !g.featureUnlockGuide && !g.journeyPresentation && !g.collectionIntro;}, undefined, {timeout: 60000});
    await click(page, 'homePlay'); await readyPlay(page);
    row.initial = await state(page); row.initialSave = await saved(page);
    await snap(page, row, 'level20');
    const clock = row.initial.puzzle.remainingSeconds; await page.waitForTimeout(350);
    assert((await state(page)).puzzle.remainingSeconds < clock, 'Formal level clock is running before opening');
    if (scenario === 'purchases') for (const kind of Object.keys(prices)) await exercisePurchase(page, row, kind);
    else await negative(page, row, scenario);
    row.final = await state(page); row.finalSave = await saved(page);
    row.audit = await page.evaluate(() => structuredClone(window.__PURCHASE_TEST__.audit));
    row.storageViolations = await page.evaluate(() => window.__STORAGE_VIOLATIONS__);
    assert.deepEqual(row.storageViolations, []); row.status = 'PASS';
    console.log(`PASS ${row.name}: ${row.purchases.length} purchases`);
  } catch (error) {
    row.status = 'FAIL'; row.error = String(error.stack ?? error);
    row.lastState = await state(page).catch(() => null); row.lastSave = await saved(page).catch(() => null);
    row.audit = await page.evaluate(() => structuredClone(window.__PURCHASE_TEST__?.audit)).catch(() => null);
    await snap(page, row, 'failure').catch(() => {}); throw error;
  } finally {await context.close();}
}

try {
  for (const viewport of [{width: 320, height: 568}, {width: 496, height: 1078}]) {
    for (const language of ['zh-CN', 'en']) await runCase(viewport, language);
  }
  for (const scenario of ['insufficient', 'unknown', 'art-failure']) await runCase({width: 496, height: 1078}, 'zh-CN', scenario);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(await bindings(), sourceBefore, 'Bound source and artwork stay unchanged throughout the run');
  report.status = 'PASS';
} catch (error) {report.status = 'FAIL'; report.error = String(error.stack ?? error); process.exitCode = 1;}
finally {
  await browser.close(); await server.close();
  report.sourcesAfter = await bindings();
  report.sourceChanges = Object.keys(sourceBefore).filter(path => sourceBefore[path] !== report.sourcesAfter[path]);
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({status: report.status, output, cases: report.cases.length,
  purchases: report.cases.reduce((n, row) => n + row.purchases.length, 0), errors: report.errors.length, error: report.error}));
