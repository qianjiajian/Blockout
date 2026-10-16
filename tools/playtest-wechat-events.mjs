import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, extname, sep} from 'node:path';
import {chromium} from 'playwright';

const packageRoot = resolve(process.env.WECHAT_PACKAGE_DIR ?? 'dist-wechat');
const output = resolve(process.env.WECHAT_EVENT_OUTPUT ?? 'deliverables/wechat-package-20261008-094128/startup-events');
const noPerformance = process.env.WECHAT_EVENT_NO_PERFORMANCE === '1';
const noStructuredClone = process.env.WECHAT_EVENT_NO_STRUCTURED_CLONE === '1';
const mode = process.env.WECHAT_EVENT_MODE ?? 'league';
assert(['league', 'daily'].includes(mode), 'Unknown WECHAT_EVENT_MODE');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bundle = await readFile(resolve(packageRoot, 'game.js'));
const sharedHarnessFile = resolve('tools/playtest-wechat-startup.mjs');
const sharedHarness = await readFile(sharedHarnessFile, 'utf8');
const begin = sharedHarness.indexOf('const installWechatShim = () => {');
const end = sharedHarness.indexOf('\n\nawait mkdir(output', begin);
assert(begin >= 0 && end > begin, 'Shared shim extraction boundary changed');
// Reuse the already-tested wx/Image/Pointer shim verbatim; only add evidence
// and a synthetic in-memory account. The shipped bundle is never instrumented.
let shim = sharedHarness.slice(begin, end);
const replaceOnce = (from, to) => {
  assert.equal(shim.split(from).length, 2, 'Shared shim patch point changed: ' + from);
  shim = shim.replace(from, to);
};
// This lexical alias belongs only to the shim closure. Removing the global
// still leaves the unchanged production bundle without structuredClone.
replaceOnce('const installWechatShim = () => {', 'const installWechatShim = (__cloneForShim) => {\n  const structuredClone = __cloneForShim;');
const seed = {schemaVersion: 1, currentLevel: 6, highestLevel: 6, coins: 456,
  language: 'zh-CN', music: false, sound: false, haptic: false, reducedMotion: false,
  bestStars: {'1': 3, '2': 3, '3': 3, '4': 3, '5': 3}, rewardedLevels: [1, 2, 3, 4, 5],
  boosterUnlockSeen: ['time'], boosterUsageSeen: [], collectionIntroPending: false,
  collectionIntroShown: true, leagueIntroSeen: false};
replaceOnce('const storage = new Map();', `const storage = new Map([['color-escape-save-v1', ${JSON.stringify(seed)}]]);\n  const storageEvents = []; const eventSequence = [];`);
replaceOnce('imageEvents.push({ id, source: String(source), state: "requested" });',
  'imageEvents.push({ id, source: String(source), state: "requested" }); eventSequence.push({kind:"image-request",id,source:String(source),at:Date.now()});');
replaceOnce('packageEvents.push({ name, state: "requested" });',
  'packageEvents.push({ name, state: "requested" }); eventSequence.push({kind:"package-request",name,at:Date.now()});');
replaceOnce('packageEvents.push({ name, state: "loaded" });',
  'packageEvents.push({ name, state: "loaded" }); eventSequence.push({kind:"package-loaded",name,at:Date.now()});');
replaceOnce('getStorageSync: (key) => storage.has(key) ? structuredClone(storage.get(key)) : "",',
  'getStorageSync: (key) => { storageEvents.push({kind:"memory-read",key}); return storage.has(key) ? structuredClone(storage.get(key)) : ""; },');
replaceOnce('setStorageSync: (key, value) => storage.set(key, structuredClone(value)),',
  'setStorageSync: (key, value) => { storageEvents.push({kind:"memory-write",key}); storage.set(key, structuredClone(value)); },');
replaceOnce('imageEvents, packageEvents, pointerEvents, loadedPackages: [...loadedPackages],',
  'imageEvents, packageEvents, pointerEvents, eventSequence, storageEvents, memorySave:structuredClone(storage.get("color-escape-save-v1")), loadedPackages: [...loadedPackages],');
// Remove the binding entirely, matching native runtimes without performance.
// No replacement or polyfill is installed; instrumentation uses Date.now().
const initialization = `(()=>{const __cloneForShim=window.structuredClone.bind(window);\n${noPerformance ? "if(!delete window.performance || 'performance' in window || typeof performance !== 'undefined') throw Error('Could not remove performance global');" : ''}\n${noStructuredClone ? "if(!delete window.structuredClone || 'structuredClone' in window || typeof structuredClone !== 'undefined') throw Error('Could not remove structuredClone global');" : ''}\nwindow.__clockEnvironment={noPerformanceRequested:${noPerformance},performanceType:typeof performance,performancePropertyPresent:'performance' in window,clockPolyfillInstalled:false,noStructuredCloneRequested:${noStructuredClone},structuredCloneType:typeof structuredClone,structuredClonePropertyPresent:'structuredClone' in window,clonePolyfillInstalled:false};\nwindow.__persistentAccess=[];\nfor(const key of ['localStorage','sessionStorage','indexedDB']) Object.defineProperty(window,key,{configurable:true,get(){window.__persistentAccess.push(key);throw Error('Persistent storage prohibited: '+key);}});\n${shim}\ninstallWechatShim(__cloneForShim);})();`;
const requests = [];
const mime = {'.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg'};
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#211f5e}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><body><script src="game.js"></script><script>window.__wechatHarness.show()</script></body>';
const server = createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
  if (!name) return response.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'}).end(html);
  const file = resolve(packageRoot, name), row = {path: name, status: 200}; requests.push(row);
  if (!file.startsWith(packageRoot + sep)) { row.status = 403; return response.writeHead(403).end(); }
  if (/\.webp$/i.test(name)) { row.status = 415; return response.writeHead(415).end(); }
  try {
    const bytes = await readFile(file); row.sha256 = hash(bytes); row.bytes = bytes.length;
    response.writeHead(200, {'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store'}).end(bytes);
  } catch { row.status = 404; response.writeHead(404).end(); }
});

const report = {schemaVersion: 1, harness: 'Chromium compatibility harness with isolated wx memory save; actual unchanged WeChat package; not a native device test',
  packageRoot, bundleSha256: hash(bundle), sharedHarnessSha256: hash(sharedHarness), harnessSha256: hash(await readFile(new URL(import.meta.url))),
  seed, noPerformance, noStructuredClone, mode, scope: mode === 'daily'
    ? 'Real Pointer directly to daily challenge; enter and exit difficulties 1,2,3 then reenter 1; natural timer and attempt/economy isolation; no completion or reward claim'
    : 'Real Pointer home -> first-entry league instructions -> league list, swipes both ways -> daily entry -> league first level and natural timer; no completion or reward claim',
  steps: [], failures: []};
let browser, page;
const pageErrors = [], pageErrorDetails = [], consoleErrors = [];
await mkdir(output, {recursive: true});
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 496, height: 1078}, deviceScaleFactor: 1});
  page = await context.newPage();
  page.on('pageerror', error => {pageErrors.push(error.message); pageErrorDetails.push({name:error.name,message:error.message,stack:error.stack});});
  page.on('console', message => {if (message.type() === 'error') consoleErrors.push(message.text());});
  await page.addInitScript({content: initialization});
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil: 'load'});
  report.clockEnvironment = await page.evaluate(() => window.__clockEnvironment);
  if (noPerformance) {
    assert.equal(report.clockEnvironment.performanceType, 'undefined');
    assert.equal(report.clockEnvironment.performancePropertyPresent, false);
  }
  if (noStructuredClone) {
    assert.equal(report.clockEnvironment.structuredCloneType, 'undefined');
    assert.equal(report.clockEnvironment.structuredClonePropertyPresent, false);
  }
  const snapshot = () => page.evaluate(() => window.__wechatHarness.snapshot());
  const waitImages = () => page.waitForFunction(() => window.__wechatHarness.snapshot().pendingImages === 0, undefined, {timeout: 30_000});
  const waitText = text => page.waitForFunction(value => window.__wechatHarness.snapshot().lastFrameTexts.some(x => x.includes(value)), text, {timeout: 30_000});
  const saveStep = async name => {
    await waitImages(); await page.waitForTimeout(350);
    const state = await snapshot();
    await page.screenshot({path: resolve(output, name + '.png')});
    report.steps.push({name, snapshot: state, screenshot: name + '.png', screenshotSha256: hash(await readFile(resolve(output, name + '.png')))});
    return state;
  };
  await page.waitForFunction(() => {const s = window.__wechatHarness.snapshot(); return s.loadedImages > 100 && !s.pendingImages && s.lastFrameTexts.includes('开始');}, undefined, {timeout: 60_000});
  const home = await saveStep('01-home');
  assert.equal(home.memorySave.highestLevel, 6);
  assert.equal(home.memorySave.coins, 456);
  const mainlineBaseline = {highestLevel: home.memorySave.highestLevel, currentLevel: home.memorySave.currentLevel,
    coins: home.memorySave.coins, bestStars: home.memorySave.bestStars, rewardedLevels: home.memorySave.rewardedLevels,
    lifeState: home.memorySave.lifeState, boosters: home.memorySave.boosters};
  const artPoint = (x, y) => [x * 496 / 720, (1078 - 1584 * 496 / 720) / 2 + y * 496 / 720];
  let final;
  const timerText = state => state.lastFrameTexts.find(text => /^\d{2}:\d{2}$/.test(text));
  const seconds = text => {assert(text, 'Missing gameplay timer'); const [m,s] = text.split(':').map(Number); return m * 60 + s;};
  if (mode === 'daily') {
    const dailyBaseline = home.memorySave.dailyChallenge;
    assert.equal(dailyBaseline.attemptsRemaining, 5);
    report.dailyRuns = [];
    for (const [runIndex, difficulty] of [1, 2, 3, 1].entries()) {
      await page.mouse.click(...artPoint(635, 457));
      assert.deepEqual(pageErrors, [], 'Opening daily challenge raised a production error');
      await waitText('每日挑战');
      await page.waitForFunction(() => {const s=window.__wechatHarness.snapshot();return s.imageRecords.filter(x=>x.source.startsWith('event-ui/daily-challenge-v2/')&&x.state==='loaded').length>=10&&!s.pendingImages;});
      const menu = await saveStep(`daily-${runIndex + 1}-difficulty-${difficulty}-menu`);
      assert.equal(menu.memorySave.dailyChallenge.attemptsRemaining, 5 - runIndex);
      await page.mouse.click(...artPoint(571, 713 + (difficulty - 1) * 138));
      assert.deepEqual(pageErrors, [], `Starting daily difficulty ${difficulty} raised a production error`);
      await page.waitForFunction(d => window.__wechatHarness.snapshot().memorySave.activeRun?.dailyChallengeDifficulty === d, difficulty);
      await waitText('每日挑战');
      const started = await saveStep(`daily-${runIndex + 1}-difficulty-${difficulty}-playing`);
      assert.equal(started.memorySave.dailyChallenge.attemptsRemaining, 4 - runIndex);
      assert.equal(started.memorySave.activeRun.daily, true);
      const clockStart = Date.now();
      await page.waitForTimeout(2200);
      const ticking = await saveStep(`daily-${runIndex + 1}-difficulty-${difficulty}-timer`);
      const wallElapsedMs = Date.now() - clockStart;
      const timerDropSeconds = seconds(timerText(started)) - seconds(timerText(ticking));
      assert(timerDropSeconds >= 1 && Math.abs(timerDropSeconds-wallElapsedMs/1000)<1.5, 'Daily clock did not advance naturally');
      await page.mouse.click(432, 129); await page.waitForTimeout(300);
      assert.deepEqual(pageErrors, [], 'Pausing daily challenge raised a production error');
      await page.mouse.click(...artPoint(492.5, 1059));
      assert.deepEqual(pageErrors, [], 'Leaving daily challenge raised a production error');
      await page.waitForFunction(() => {const s=window.__wechatHarness.snapshot();return !s.memorySave.activeRun&&s.lastFrameTexts.includes('开始');});
      const exited = await saveStep(`daily-${runIndex + 1}-difficulty-${difficulty}-home`);
      assert.equal(exited.memorySave.dailyChallenge.attemptsRemaining, 4 - runIndex, 'Exit refunded or double-charged attempt');
      for (const [key,value] of Object.entries(mainlineBaseline)) assert.deepEqual(exited.memorySave[key], value, `Daily changed mainline/economy ${key}`);
      for (const key of ['dayKey','stageKey','selected','pools','completed','rewarded']) assert.deepEqual(exited.memorySave.dailyChallenge[key], dailyBaseline[key], `Daily fixed assignment/reward changed: ${key}`);
      report.dailyRuns.push({difficulty,sourceLevelId:started.memorySave.activeRun.dailyChallengeSourceLevelId,attemptsBefore:5-runIndex,attemptsAfterStart:4-runIndex,attemptsAfterExit:exited.memorySave.dailyChallenge.attemptsRemaining,
        naturalClock:{before:timerText(started),after:timerText(ticking),wallElapsedMs,timerDropSeconds,dateOrRafPatched:false},mainlineAndEconomyUnchanged:true});
      final = exited;
    }
    assert.equal(report.dailyRuns[0].sourceLevelId, report.dailyRuns[3].sourceLevelId, 'Same-day reentry changed selected level');
    report.dailyAttemptsVerified = true;
  } else {
  await page.mouse.click(...artPoint(635, 801));
  assert.deepEqual(pageErrors, [], 'Home Pointer click raised a production error');
  await page.waitForFunction(() => {const s = window.__wechatHarness.snapshot(); return s.loadedPackages.includes('league-ui') && s.loadedPackages.includes('event-ui') && !s.pendingImages;}, undefined, {timeout: 30_000});
  await waitText('点击继续');
  await saveStep('02-league-first-entry');
  await page.mouse.click(248, 997); await page.waitForTimeout(300);
  await page.mouse.click(248, 997);
  await page.waitForFunction(() => window.__wechatHarness.snapshot().memorySave.leagueIntroSeen === true);
  await waitText('我的排名');
  const list = await saveStep('03-league-ranking');
  assert(list.lastFrameTexts.includes('挑战'));
  assert.equal(list.memorySave.league.season.score, 0);
  const visibleRanks = state => state.lastFrameTexts.filter(text => /^(?:[1-9]|[1-4][0-9]|50)$/.test(text)).map(Number);
  const swipe = async (from, to) => {
    await page.mouse.move(250, from); await page.mouse.down();
    for (let i = 1; i <= 12; i++) {await page.mouse.move(250, from + (to - from) * i / 12); await page.waitForTimeout(30);}
    await page.mouse.up(); await page.waitForTimeout(500);
    assert.deepEqual(pageErrors, [], 'Ranking Pointer swipe raised a production error');
  };
  await swipe(870, 480);
  const lowerRows = await saveStep('03b-league-ranking-lower');
  assert(visibleRanks(lowerRows)[0] > visibleRanks(list)[0], 'Swipe up did not reveal lower ranking rows');
  await swipe(480, 870);
  const upperRows = await saveStep('03c-league-ranking-upper');
  assert(visibleRanks(upperRows)[0] < visibleRanks(lowerRows)[0], 'Swipe down did not return toward earlier ranking rows');
  report.rankingSwipes = {before:visibleRanks(list),afterSwipeUp:visibleRanks(lowerRows),afterSwipeDown:visibleRanks(upperRows),pointerInput:true,bothDirectionsChangedRows:true};
  await page.mouse.click(38, 108);
  await waitText('开始');
  await page.mouse.click(...artPoint(635, 457));
  await waitText('每日挑战');
  await page.waitForFunction(() => {const s = window.__wechatHarness.snapshot(); return s.imageRecords.filter(x => x.source.startsWith('event-ui/daily-challenge-v2/') && x.state === 'loaded').length >= 10 && !s.pendingImages;});
  await saveStep('04-daily-challenge');
  await page.mouse.click(...artPoint(662, 359));
  await waitText('开始');
  await page.mouse.click(...artPoint(635, 801));
  await waitText('我的排名'); await waitImages();
  await page.mouse.click(464, 1000);
  await waitText('第1/100关');
  await saveStep('05-league-level-notice');
  await page.mouse.click(248, 938);
  await waitText('联赛 · 第1关');
  await page.waitForTimeout(1200);
  final = await saveStep('06-league-level-001');
  const clockStart = Date.now();
  await page.waitForTimeout(2400);
  const clockAfter = await saveStep('07-league-natural-time');
  const wallElapsedMs = Date.now() - clockStart;
  const timerDropSeconds = seconds(timerText(final)) - seconds(timerText(clockAfter));
  assert(timerDropSeconds >= 1 && Math.abs(timerDropSeconds - wallElapsedMs / 1000) < 1.5, 'Gameplay clock did not follow natural elapsed time');
  report.naturalClock = {before:timerText(final),after:timerText(clockAfter),wallElapsedMs,timerDropSeconds,dateOrRafPatched:false,passed:true};
  }
  report.finalClockEnvironment = await page.evaluate(() => ({performanceType:typeof performance,performancePropertyPresent:'performance' in window,structuredCloneType:typeof structuredClone,structuredClonePropertyPresent:'structuredClone' in window}));
  if (noPerformance) {assert.equal(report.finalClockEnvironment.performanceType,'undefined');assert.equal(report.finalClockEnvironment.performancePropertyPresent,false);}
  if (noStructuredClone) {assert.equal(report.finalClockEnvironment.structuredCloneType,'undefined');assert.equal(report.finalClockEnvironment.structuredClonePropertyPresent,false);}
  for (const [key, value] of Object.entries(mainlineBaseline)) assert.deepEqual(final.memorySave[key], value, `Mainline/economy isolation changed: ${key}`);
  assert.equal(final.memorySave.league.season.score, 0);
  assert(final.pointerEvents.filter(x => x.kind === 'down').length >= 8);
  assert.equal(final.pendingImages, 0);
  assert.equal(final.unreleasedFailedImages, 0);
  assert.equal(final.settledImagesWithHandlers, 0);
  assert(final.sampledColors > 100 && final.drawImageCount > 100);
  const packages = mode === 'daily' ? ['event-ui'] : ['league-ui', 'event-ui'];
  report.packageOrder = packages.map(name => {
    const loadedIndex = final.eventSequence.findIndex(x => x.kind === 'package-loaded' && x.name === name);
    const imageIndexes = final.eventSequence.flatMap((x, i) => x.kind === 'image-request' && x.source.startsWith(name + '/') ? [i] : []);
    assert(loadedIndex >= 0 && imageIndexes.length > 0 && imageIndexes.every(i => i > loadedIndex), `Image requested before ${name} loaded`);
    return {name, loadedIndex, imageRequestCount: imageIndexes.length, firstImageRequestIndex: imageIndexes[0], allImagesRequestedAfterPackageLoaded: true};
  });
  report.persistentStorageAccess = await page.evaluate(() => window.__persistentAccess);
  assert.deepEqual(report.persistentStorageAccess, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert(!requests.some(x => x.status !== 200));
  assert.equal(hash(await readFile(resolve(packageRoot, 'game.js'))), report.bundleSha256);
  report.mainlineAndEconomyUnchanged = true;
  report.status = 'PASS';
} catch (error) {
  report.failures.push(String(error)); report.status = 'FAIL';
  report.failureSnapshot = await page?.evaluate(() => window.__wechatHarness?.snapshot()).catch(() => undefined);
  await page?.screenshot({path: resolve(output, 'failure.png')}).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
  Object.assign(report, {requests, pageErrors, pageErrorDetails, consoleErrors});
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({status: report.status, steps: report.steps.map(x => x.name), failures: report.failures, packageOrder: report.packageOrder, output}, null, 2));
}
