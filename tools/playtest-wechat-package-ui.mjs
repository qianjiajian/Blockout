import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Read-only packaged UI QA. The exact on-disk game.js is served unchanged.
// The trusted startup harness supplies wx with an isolated closure Map; this
// harness adds canvas observations and real Pointer input, never game mutation.
const packageRoot = path.resolve(process.env.WECHAT_PACKAGE_DIR ?? 'dist-wechat');
const output = path.resolve(process.env.WECHAT_UI_OUTPUT ?? 'playtest-results/wechat-size-optimization-20261012/ui');
const viewport = process.env.WECHAT_UI_SMALL === '1' ? { width: 320, height: 568 } : { width: 496, height: 1078 };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const panelOverridePath = process.env.WECHAT_UI_PANEL_RESPONSE_OVERRIDE ? path.resolve(process.env.WECHAT_UI_PANEL_RESPONSE_OVERRIDE) : undefined;
const panelOverride = panelOverridePath ? await readFile(panelOverridePath) : undefined;
const panelPackagePath = 'event-ui/booster-purchase-reference-v1/panel.png';
if (panelOverride) {
  const original = await readFile(path.join(packageRoot, panelPackagePath));
  assert.equal(panelOverride.toString('hex', 0, 8), '89504e470d0a1a0a', 'A/B response override must be a PNG');
  assert.equal(panelOverride.readUInt32BE(16), original.readUInt32BE(16), 'A/B panel width must match');
  assert.equal(panelOverride.readUInt32BE(20), original.readUInt32BE(20), 'A/B panel height must match');
}
const helperPath = path.resolve('tools/playtest-wechat-startup-current.mjs');
const helperSource = await readFile(helperPath, 'utf8');
const helperStart = helperSource.indexOf('const installWechatShim = ');
const helperEnd = helperSource.indexOf('\n\nawait mkdir(output', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Expected known startup shim boundary');
let shimSource = helperSource.slice(helperStart + 'const installWechatShim = '.length, helperEnd).trim().replace(/;$/, '');
assert.equal(shimSource.split('const storage = new Map();').length, 2, 'Expected one isolated storage Map');
shimSource = shimSource.replace('({ packageNames })', '({ packageNames, fixture })')
  .replace('const storage = new Map();', 'const storage = new Map([["color-escape-save-v1", structuredClone(fixture)]]);');

const inspectCanvas = () => {
  const original = window.wx.createCanvas;
  const history = [];
  let draws = [];
  let canvas;
  let frames = 0;
  const adFills = [];
  window.wx.createCanvas = () => {
    const created = original();
    if (canvas) return created;
    canvas = created;
    const context = canvas.getContext('2d');
    const fillRect = context.fillRect.bind(context);
    const drawImage = context.drawImage.bind(context);
    const beginPath = context.beginPath.bind(context);
    const createLinearGradient = context.createLinearGradient.bind(context);
    const fill = context.fill.bind(context);
    const gradientStops = new WeakMap();
    let pathPoints = [];
    const point = (x, y) => {
      const transformed = context.getTransform().transformPoint({x, y});
      pathPoints.push({x: transformed.x, y: transformed.y});
    };
    context.beginPath = () => { pathPoints = []; return beginPath(); };
    for (const method of ['moveTo', 'lineTo']) {
      const originalMethod = context[method].bind(context);
      context[method] = (x, y) => { point(x, y); return originalMethod(x, y); };
    }
    for (const method of ['quadraticCurveTo', 'bezierCurveTo']) {
      const originalMethod = context[method].bind(context);
      context[method] = (...args) => {
        for (let index = 0; index < args.length; index += 2) point(args[index], args[index + 1]);
        return originalMethod(...args);
      };
    }
    const rect = context.rect.bind(context);
    context.rect = (x, y, w, h) => { point(x, y); point(x + w, y + h); return rect(x, y, w, h); };
    const arc = context.arc.bind(context);
    context.arc = (x, y, r, ...args) => { point(x - r, y - r); point(x + r, y + r); return arc(x, y, r, ...args); };
    context.createLinearGradient = (...args) => {
      const gradient = createLinearGradient(...args), stops = [];
      const addColorStop = gradient.addColorStop.bind(gradient);
      gradient.addColorStop = (offset, color) => { stops.push(color); return addColorStop(offset, color); };
      gradientStops.set(gradient, stops);
      return gradient;
    };
    context.fill = (...args) => {
      const stops = gradientStops.get(context.fillStyle);
      if (stops?.some(color => color === '#39d9f3' || color === '#18bce8')) {
        const matrix = context.getTransform();
        const top = matrix.transformPoint({x: 149, y: 621}), bottom = matrix.transformPoint({x: 343, y: 663});
        const bounds = {left: Math.min(...pathPoints.map(p => p.x)), top: Math.min(...pathPoints.map(p => p.y)),
          right: Math.max(...pathPoints.map(p => p.x)), bottom: Math.max(...pathPoints.map(p => p.y))};
        const expected = {left: top.x, top: top.y, right: bottom.x, bottom: bottom.y};
        adFills.push({frame: frames, colors: [...stops], bounds, expected, outsideButton: bounds.left < expected.left - 0.1 || bounds.top < expected.top - 0.1
          || bounds.right > expected.right + 0.1 || bounds.bottom > expected.bottom + 0.1});
      }
      return fill(...args);
    };
    context.fillRect = (...args) => {
      if (args[0] === 0 && args[1] === 0 && args[2] === canvas.width && args[3] === canvas.height && context.fillStyle === '#090622') {
        draws = [];
        frames += 1;
      }
      return fillRect(...args);
    };
    context.drawImage = (...args) => {
      const image = args[0];
      if (image instanceof HTMLImageElement && image.src) {
        const source = new URL(image.src).pathname.split('/').slice(2).join('/');
        const i = args.length === 9 ? 5 : 1;
        const x = args[i], y = args[i + 1];
        const w = args.length === 3 ? image.naturalWidth : args[i + 2];
        const h = args.length === 3 ? image.naturalHeight : args[i + 3];
        const matrix = context.getTransform();
        const a = matrix.transformPoint({x, y}), b = matrix.transformPoint({x: x + w, y: y + h});
        const bounds = canvas.getBoundingClientRect();
        const row = {source, x: bounds.x + a.x * bounds.width / canvas.width, y: bounds.y + a.y * bounds.height / canvas.height,
          width: (b.x - a.x) * bounds.width / canvas.width, height: (b.y - a.y) * bounds.height / canvas.height,
          alpha: context.globalAlpha, frame: frames};
        draws.push(row);
        if (!history.includes(source)) history.push(source);
      }
      return drawImage(...args);
    };
    return created;
  };
  const popupPixels = () => {
    if (!canvas) return undefined;
    const context = canvas.getContext('2d'), matrix = context.getTransform();
    // This content area ends above the ad button. A stale board path fills it
    // with the gradient's clamped first stop, obscuring the item/description.
    const a = matrix.transformPoint({x: 110, y: 390}), b = matrix.transformPoint({x: 386, y: 614});
    const x = Math.max(0, Math.floor(a.x)), y = Math.max(0, Math.floor(a.y));
    const width = Math.min(canvas.width - x, Math.ceil(b.x) - x), height = Math.min(canvas.height - y, Math.ceil(b.y) - y);
    if (width <= 0 || height <= 0) return undefined;
    const data = context.getImageData(x, y, width, height).data;
    let cyanPixels = 0;
    for (let p = 0; p < data.length; p += 4) {
      if (Math.abs(data[p] - 57) <= 2 && Math.abs(data[p + 1] - 217) <= 2 && Math.abs(data[p + 2] - 243) <= 2) cyanPixels += 1;
    }
    return {region: {x, y, width, height}, matchedColor: '#39d9f3', tolerance: 2, cyanPixels,
      sampledPixels: width * height, cyanFraction: cyanPixels / (width * height), maximumFraction: 0.02};
  };
  window.__qaView = {snapshot: () => ({draws: structuredClone(draws), drawnSources: [...history], frames,
    adFills: structuredClone(adFills), popupPixels: adFills.length ? popupPixels() : undefined}),
    screenPoint: (x, y) => {
      const p = canvas.getContext('2d').getTransform().transformPoint({x, y}), bounds = canvas.getBoundingClientRect();
      return {x: bounds.x + p.x * bounds.width / canvas.width, y: bounds.y + p.y * bounds.height / canvas.height};
    }};
};

const packageConfig = JSON.parse(await readFile(path.join(packageRoot, 'game.json'), 'utf8'));
const bundle = await readFile(path.join(packageRoot, 'game.js'));
const initial = {
  schemaVersion: 1, currentLevel: 1, highestLevel: 51, coins: 10000, language: 'zh-CN', sound: false, music: false, haptic: false, reducedMotion: false,
  featureSeen: ['basics', 'ice-door', 'ice-block', 'layer', 'shutter', 'generator', 'axis', 'key-lock', 'lift', 'star', 'bomb', 'flip-door', 'color-floor'],
  boosterUnlockSeen: ['time', 'rocket', 'pulse'], boosterUsageSeen: ['time', 'rocket', 'pulse'], boosters: {time: 5, rocket: 5, pulse: 5},
  featureGuideProgress: {version: 1, pending: [], seen: ['leaderboard', 'supply', 'levels', 'dailyChallenge', 'league']},
  leagueIntroSeen: true, collectionIntroPending: false, collectionIntroShown: true,
  lifeState: {lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0},
  collectionProgress: {version: 1, inspiration: 50, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: []},
  journeyProgress: {claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [1, 11, 21, 31, 41]}, selectedJourneyEpisode: 1,
  rewardedLevels: Array.from({length: 50}, (_, i) => i + 1),
  bestStars: Object.fromEntries(Array.from({length: 50}, (_, i) => [String(i + 1), 3])), bestMoves: {},
};
const mime = {'.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg'};
const bindings = new Map();
const requests = [];
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const [, scenario, ...segments] = decodeURIComponent(url.pathname).split('/');
  const relative = segments.join('/');
  if (!relative) {
    response.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'}).end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#211f5e}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><body><script src="game.js"></script><script>window.__wechatHarness.show()</script></body>');
    return;
  }
  const absolute = path.resolve(packageRoot, relative);
  const row = {scenario, path: relative, status: 200};
  requests.push(row);
  if (!absolute.startsWith(packageRoot + path.sep) || /\.webp$/i.test(relative)) {
    row.status = 403;
    response.writeHead(403).end('Unsupported or outside packaged resources');
    return;
  }
  try {
    const bytes = await readFile(absolute), digest = sha(bytes);
    assert(!bindings.has(relative) || bindings.get(relative) === digest, `File changed: ${relative}`);
    bindings.set(relative, digest);
    if (panelOverride && relative === panelPackagePath) row.responseOverrideSha256 = sha(panelOverride);
    response.writeHead(200, {'Content-Type': mime[path.extname(relative)] ?? 'application/octet-stream', 'Cache-Control': 'no-store'}).end(panelOverride && relative === panelPackagePath ? panelOverride : bytes);
  } catch (error) { row.status = 404; response.writeHead(404).end(String(error)); }
});

const view = page => page.evaluate(() => ({...window.__qaView.snapshot(), native: window.__wechatHarness.snapshot()}));
const waitImage = (page, suffix) => page.waitForFunction(suffix => window.__qaView.snapshot().draws.some(d =>
  d.source.endsWith(suffix) && d.alpha > 0.95 && d.width > 8 && d.height > 8), suffix, {timeout: 30_000});
async function settle(page) {
  await page.waitForFunction(() => window.__wechatHarness.snapshot().pendingImages === 0, undefined, {timeout: 30_000});
  await page.waitForTimeout(550);
}
async function clickImage(page, suffix) {
  await waitImage(page, suffix);
  await settle(page);
  const state = await view(page);
  const row = state.draws.findLast(d => d.source.endsWith(suffix) && d.alpha > 0.95 && d.width > 8 && d.height > 8);
  assert(row, `Missing actual drawn button ${suffix}`);
  await page.mouse.click(row.x + row.width / 2, row.y + row.height / 2, {delay: 25});
}
async function dragImage(page, suffix, dx, dy) {
  await waitImage(page, suffix);
  const state = await view(page), row = state.draws.findLast(d => d.source.endsWith(suffix) && d.alpha > 0.95);
  assert(row, `Missing actual drawn block ${suffix}`);
  const x = row.x + row.width / 2, y = row.y + row.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, {steps: 14});
  await page.mouse.up();
  await page.waitForTimeout(700);
}
async function shot(page, record, name) {
  await settle(page);
  const file = path.join(output, `${record.scenario}-${name}.png`);
  await page.screenshot({path: file});
  const state = await view(page);
  record.screenshots.push({file, sha256: sha(await readFile(file)), drawnSources: [...new Set(state.draws.map(d => d.source))], texts: state.native.lastFrameTexts});
}

await mkdir(output, {recursive: true});
const report = {scope: 'Unmodified packaged game.js and packaged images through Chromium wx compatibility shim (except an explicitly recorded optional single-image A/B HTTP response override); synthetic in-memory progress only, real Pointer navigation; NOT WeChat native-device QA or source-level game mutation.',
  responseOverride: panelOverride ? {packagePath: panelPackagePath, source: panelOverridePath, sha256: sha(panelOverride), scope: 'One HTTP image response only; no package file or game.js rewrite'} : undefined,
  packageRoot, viewport, bundleSha256: sha(bundle), helperSha256: sha(helperSource), fixture: initial, cases: [], failures: [], requests};
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless: true});
  const supportedScenarios = ['home', 'league', 'achievements', 'daily-tasks', 'daily-challenge', 'journey', 'collection', 'life-refill', 'booster-purchase', 'booster-purchase-time', 'booster-purchase-pulse', 'victory'];
  const scenarios = process.env.WECHAT_UI_SCENARIOS?.split(',') ?? supportedScenarios;
  assert(scenarios.every(scenario => supportedScenarios.includes(scenario)), 'Unknown UI scenario');
  for (const scenario of scenarios) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    const page = await context.newPage(), pageErrors = [], consoleErrors = [];
    const record = {scenario, screenshots: [], status: 'RUNNING'};
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    const boosterKind = scenario === 'booster-purchase' ? 'rocket' : scenario === 'booster-purchase-time' ? 'time' : scenario === 'booster-purchase-pulse' ? 'pulse' : undefined;
    const fixture = scenario === 'victory' ? {...initial, currentLevel: 9, boosters: {time: 5, rocket: 9, pulse: 5}}
      : boosterKind ? {...initial, currentLevel: 12, boosters: {...initial.boosters, [boosterKind]: 0}}
      : scenario === 'life-refill' ? {...initial, lifeState: {lives: 2, nextLifeAtMs: Date.now() + 30 * 60_000, unlimitedLivesUntilMs: 0}}
      : initial;
    record.fixture = {currentLevel: fixture.currentLevel, boosters: fixture.boosters};
    await page.addInitScript({content: `(${shimSource})(${JSON.stringify({packageNames: packageConfig.subpackages.map(p => p.name), fixture})});(${inspectCanvas.toString()})();`});
    try {
      await page.goto(`${origin}/${scenario}/`, {waitUntil: 'load'});
      await waitImage(page, 'home-v3/start-button.png');
      await settle(page);
      if (scenario === 'home') {
        await shot(page, record, 'home');
        const state = await view(page);
        assert(state.draws.some(d => d.source === 'meta-ui/formal-pages/collection/top-header.png'), 'Home did not draw canonical collection top-header');
      }
      if (scenario === 'league') {
        await clickImage(page, 'home-v3/league-entry.png');
        await waitImage(page, 'league-supplied-v1/stage-background.png');
        await shot(page, record, 'league');
        await clickImage(page, 'league-supplied-v1/info-button.png');
        await waitImage(page, 'overlays/pause-settings/close.png');
        await shot(page, record, 'rules-canonical-close');
        await clickImage(page, 'overlays/pause-settings/close.png');
        await waitImage(page, 'league-supplied-v1/info-button.png');
      }
      if (scenario === 'achievements') {
        await clickImage(page, 'home-v3/achievements-entry.png');
        await waitImage(page, 'achievements-v2/panel.png');
        await shot(page, record, 'achievements');
      }
      if (scenario === 'daily-tasks') {
        await clickImage(page, 'home-v3/daily-tasks-entry.png');
        await waitImage(page, 'daily-tasks-v2/task-row.png');
        await shot(page, record, 'daily-tasks');
      }
      if (scenario === 'daily-challenge') {
        await clickImage(page, 'home-v3/daily-challenge-entry.png');
        await waitImage(page, 'daily-challenge-supplied-v1/panel-frame.png');
        await shot(page, record, 'daily-challenge');
      }
      if (scenario === 'journey') {
        await clickImage(page, 'home-v3/journey-icon.png');
        await waitImage(page, 'journey/background.jpg');
        await shot(page, record, 'journey');
      }
      if (scenario === 'collection') {
        await clickImage(page, 'home-v3/collection-icon.png');
        await page.waitForFunction(() => window.__qaView.snapshot().draws.some(d => d.source.includes('collection-art/atlases/')));
        await shot(page, record, 'collection-canonical-header');
        const state = await view(page);
        assert(state.draws.some(d => d.source === 'meta-ui/formal-pages/collection/top-header.png'), 'Collection did not draw canonical collection top-header');
      }
      if (scenario === 'life-refill') {
        await clickImage(page, 'home-v3/heart-icon.png');
        await waitImage(page, 'life-refill-reference-v1/panel.png');
        await shot(page, record, 'life-refill');
      }
      if (boosterKind) {
        await clickImage(page, 'home-v3/start-button.png');
        await waitImage(page, `gameplay-v1/booster-${boosterKind}.png`);
        await clickImage(page, `gameplay-v1/booster-${boosterKind}.png`);
        await waitImage(page, 'booster-purchase-reference-v1/panel.png');
        await shot(page, record, 'booster-purchase');
        const state = await view(page);
        const expectedTexts = {
          time: ['冻结', '暂停倒计时与炸弹', '持续10秒', '300'],
          rocket: ['火箭', '选择一个活动方块', '发射火箭将它移除', '400'],
          pulse: ['脉冲', '使机关计数减少2', '更快打开通路', '400'],
        }[boosterKind];
        for (const text of [...expectedTexts, '×1', '购买']) assert(state.native.lastFrameTexts.includes(text), `Missing popup label: ${text}`);
        const icons = state.draws.filter(d => d.source.endsWith(`gameplay-v1/booster-${boosterKind}.png`) && d.alpha > 0.95);
        assert(icons.length >= 2, 'Expected both HUD and purchase-modal item icons');
        assert(state.adFills.length > 0, 'Expected actual cyan ad button path observations');
        record.adFills = state.adFills;
        record.popupPixels = state.popupPixels;
        record.popupLabels = expectedTexts;
        record.popupIcons = icons;
        const historicalGridExpected = process.env.WECHAT_UI_EXPECT_BOOSTER_GRID === '1';
        assert(state.popupPixels?.sampledPixels > 1000, 'Popup pixel sample unavailable');
        assert.equal(state.popupPixels.cyanFraction > state.popupPixels.maximumFraction, historicalGridExpected,
          historicalGridExpected ? 'Historical cyan grid not reproduced in popup pixels' : `Cyan grid covers ${(state.popupPixels.cyanFraction * 100).toFixed(2)}% of item/description area`);
        assert.equal(state.adFills.some(fill => fill.outsideButton), historicalGridExpected,
          historicalGridExpected ? 'Historical bundle did not reproduce the stale-path grid' : 'Cyan ad button repainted a path outside its button bounds');
        if (!historicalGridExpected) {
          const point = await page.evaluate(() => window.__qaView.screenPoint(246, 642));
          await page.mouse.move(point.x, point.y);
          await page.mouse.down();
          await shot(page, record, 'ad-pressed');
          const pressed = await view(page), pressedAd = pressed.adFills.at(-1), normalAd = state.adFills.at(-1);
          assert(pressedAd.colors.includes('#18bce8'), 'Ad button did not display its actual pressed gradient');
          assert(pressedAd.expected.right - pressedAd.expected.left < normalAd.expected.right - normalAd.expected.left,
            'Ad button did not scale down on Pointer press');
          assert(!pressed.adFills.some(fill => fill.outsideButton), 'Pressed ad button filled outside its own path');
          // Release outside to cancel the ad action. This checks press/release
          // without requesting an unavailable native ad or issuing a reward.
          await page.mouse.move(1, 1, {steps: 3});
          await page.mouse.up();
          await settle(page);
          const released = await view(page);
          assert(released.adFills.at(-1).colors.includes('#39d9f3'), 'Cancelled press did not restore the normal gradient');
          assert(released.draws.some(d => d.source.endsWith('booster-purchase-reference-v1/panel.png')), 'Cancelled ad press closed the popup');
          const panelWidth = 382 * 496 / 520, panelScale = panelWidth / 980;
          const close = await page.evaluate(({x, y}) => window.__qaView.screenPoint(x, y), {
            x: (496 - panelWidth) / 2 + (829 + 72) * panelScale,
            y: (1078 - 1294 * panelScale) / 2 + (127 + 71.5) * panelScale,
          });
          await page.mouse.move(close.x, close.y);
          await page.mouse.down();
          await shot(page, record, 'close-pressed');
          assert((await view(page)).draws.some(d => d.source.endsWith('booster-purchase-reference-v1/panel.png')),
            'Close button activated before Pointer release');
          await page.mouse.up();
          await page.waitForFunction(() => !window.__qaView.snapshot().draws.some(d => d.source.endsWith('booster-purchase-reference-v1/panel.png')));
          await shot(page, record, 'closed-board');
          const closed = await view(page);
          assert(closed.native.lastFrameTexts.includes('第 12 关') && closed.draws.some(d => d.source.startsWith('gameplay-art/formal-v1/')),
            'Closing the popup did not return to the actual Level 12 board');
          record.pointerControls = {adPressed: pressedAd, adReleased: released.adFills.at(-1), adCancelledOutside: true, closeReturnedToBoard: true};
        }
      }
      if (scenario === 'victory') {
        await clickImage(page, 'home-v3/start-button.png');
        await waitImage(page, 'gameplay-v1/booster-rocket.png');
        await settle(page);
        assert((await view(page)).native.lastFrameTexts.includes('第 9 关'), 'Expected formal Level 9 replay fixture');
        await shot(page, record, 'level9-before');
        const initialBlocks = (await view(page)).draws.filter(d => /^gameplay-art\/formal-v1\/[^/]+-square-2x2\.png$/.test(d.source) && d.alpha > 0.95);
        assert.equal(initialBlocks.length, 10, 'Expected formal Level 9 ten-square layout');
        const cell = Math.abs(initialBlocks[1].x - initialBlocks[0].x) / 2;
        record.rocketTargets = [];
        for (let index = 0; index < 12; index += 1) {
          let state = await view(page);
          if (state.draws.some(d => d.source.endsWith('overlays/win/panel.png'))) break;
          const blocks = state.draws.filter(d => /^gameplay-art\/formal-v1\/[^/]+-square-2x2\.png$/.test(d.source) && d.alpha > 0.95);
          assert(blocks.length > 0, 'No live Level 9 square targets before victory');
          if (blocks.length === 1) {
            assert(blocks[0].source.endsWith('/green-square-2x2.png'), 'Expected green square to finish through its ordinary exit');
            await dragImage(page, 'formal-v1/green-square-2x2.png', -cell * 5, 0);
            if ((await view(page)).draws.some(d => d.source.endsWith('formal-v1/green-square-2x2.png') && d.alpha > 0.95)) {
              await dragImage(page, 'formal-v1/green-square-2x2.png', 0, cell * 4);
            }
            record.finalBlockInput = 'Green square dragged left to bottom exit column, then out if not already auto-exited';
            break;
          }
          const target = blocks[0];
          await clickImage(page, 'gameplay-v1/booster-rocket.png');
          await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2, {delay: 25});
          await page.waitForTimeout(1250);
          state = await view(page);
          const remaining = state.draws.filter(d => /^gameplay-art\/formal-v1\/[^/]+-square-2x2\.png$/.test(d.source) && d.alpha > 0.95).length;
          assert(remaining < blocks.length, 'Real missile click did not remove a block');
          record.rocketTargets.push({source: target.source, x: target.x, y: target.y, before: blocks.length, after: remaining});
        }
        await waitImage(page, 'overlays/win/panel.png');
        await shot(page, record, 'victory');
      }
      const state = await view(page);
      assert.equal(state.native.forbiddenStorageAccesses.length, 0, 'Attempted real browser persistence');
      assert.equal(state.native.pendingImages, 0, 'Pending image requests after UI settled');
      assert.equal(state.native.unreleasedFailedImages, 0, 'Retained failed image');
      assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
      assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));
      assert(!requests.some(r => r.scenario === scenario && r.status >= 400), 'Packaged resource request failed');
      assert(state.native.drawImageCount > 30 && state.native.sampledColors > 100, 'UI did not draw actual art');
      record.status = 'PASS';
      record.drawnSources = state.drawnSources;
      record.native = state.native;
      console.log(`PASS ${scenario}: ${record.screenshots.length} screenshot(s), ${state.native.loadedPackages.join(', ')}`);
    } catch (error) {
      record.status = 'FAIL'; record.error = String(error);
      record.snapshot = await view(page).catch(() => undefined);
      await page.screenshot({path: path.join(output, `${scenario}-failure.png`)}).catch(() => {});
      report.failures.push({scenario, error: String(error)});
      console.error(`FAIL ${scenario}: ${error}`);
    } finally {
      record.pageErrors = pageErrors; record.consoleErrors = consoleErrors;
      report.cases.push(record);
      await context.close();
    }
  }
  assert.equal(sha(await readFile(path.join(packageRoot, 'game.js'))), report.bundleSha256, 'Production bundle changed during QA');
  assert.equal(sha(await readFile(helperPath)), report.helperSha256, 'Shared harness changed during QA');
  for (const [file, digest] of bindings) assert.equal(sha(await readFile(path.join(packageRoot, file))), digest, `Packaged file changed: ${file}`);
  report.packageFilesUnchanged = true;
} catch (error) { report.failures.push({scenario: 'harness', error: String(error)}); }
finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.fileBindings = Object.fromEntries(bindings);
  report.status = report.failures.length ? 'FAIL' : 'PASS';
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.failures.length) process.exitCode = 1;
}
