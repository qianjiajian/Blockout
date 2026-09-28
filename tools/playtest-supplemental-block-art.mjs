import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname), 'Local source server only');
const sourceUrl = new URL('__supplemental_block_art_fixture__', baseUrl).href;
const output = resolve(root, `playtest-results/supplemental-block-art-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const shapes = [{ id: 'vertical', shapeId: 13, name: 'rectangle-2x3', width: 2, height: 3, native: [192, 296], x: 1, y: 1 },
  { id: 'horizontal', shapeId: 21, name: 'rectangle-3x2', width: 3, height: 2, native: [285, 201], x: 4, y: 1 },
  { id: 'square', shapeId: 14, name: 'square-3x3', width: 3, height: 3, native: [286, 296], x: 4, y: 4 }];
const artPath = 'assets/art/gameplay/blocks/formal-v1/';
const artFiles = colors.flatMap(color => shapes.map(shape => `${color}-${shape.name}.png`));
const files = ['src/game/ColorEscapeGame.ts', 'src/game/formalBlockShapes.ts', 'src/game/artManifest.ts',
  'src/core/PuzzleModel.ts', 'src/core/levels.ts', 'src/platform/WebHost.ts', 'tools/playtest-supplemental-block-art.mjs',
  'docs/rules/manifest.json', 'docs/mechanism-rules-v1.41.0.md', 'art-source/gameplay/blocks/supplemental-v1.json',
  ...artFiles.flatMap(name => [`art-source/gameplay/blocks/formal-v1/${name}`, `public/${artPath}${name}`])];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(resolve(root, file)))])));
const report = { status: 'running', sourceUrl, output, sourcesBefore: await hashes(), scenarios: [], errors: [],
  scope: '24 supplied solid PNGs, production ColorEscapeGame drawBlock and drawFormalBlockPreview, real Chromium Canvas and one real Pointer drag per viewport. MemoryHost only. Preview is a direct production presentation-helper check, not a generator-queue gameplay test. Fixtures are not campaign geometry/difficulty certification or WeChat phone verification.' };
await mkdir(output, { recursive: false });
const cells = (width, height) => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => [x, y])).flat();
const fixture = color => ({ id: 993, name: `Isolated supplemental ${color} art`, mechanismRules: 'revised-2026-09-23-v1.4',
  difficulty: 'normal', timeSeconds: 180, reward: 0, parMoves: 3, width: 8, height: 8, blocked: [],
  gates: [{ id: 'color-gate', side: 'bottom', offset: 4, size: 3, color }],
  blocks: shapes.map(shape => ({ id: shape.id, x: shape.x, y: shape.y, color, shape: cells(shape.width, shape.height) })) });

const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { PuzzleModel } from '/src/core/PuzzleModel.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { matchFormalBlockShape } from '/src/game/formalBlockShapes.ts';
class MemoryHost extends WebHost {
 data=new Map();
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}
 storageSet(k,v){this.data.set(k,structuredClone(v));return true}
 music(){} sound(){} vibrate(){}
}
const host=new MemoryHost();
host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:200,coins:1000,sound:false,haptic:false,reducedMotion:true,
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:Date.now()+3600000},
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
 boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],dailyStreak:0,lastDailyCompletedDay:''});
const game=new ColorEscapeGame(host),test={game,host,calls:[],recording:false,active:null};
window.__SUPPLEMENTAL_TEST__=test;
const nativeDraw=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
 if(test.recording&&test.active&&this===game.ctx){
  const src=image?.currentSrc||image?.src||'',m=test.active.base.inverse().multiply(this.getTransform());
  if(src.includes('/assets/art/gameplay/blocks/formal-v1/'))test.calls.push({blockId:test.active.id,mode:test.active.mode,
   src,native:[image.naturalWidth||image.width,image.naturalHeight||image.height],args,
   matrix:[m.a,m.b,m.c,m.d,m.e,m.f],alpha:this.globalAlpha,match:test.active.match});
 }return nativeDraw.call(this,image,...args);
};
const drawBlock=game.drawBlock.bind(game);
game.drawBlock=(block,...args)=>{const previous=test.active;test.active={id:block.id,mode:'board',base:game.ctx.getTransform(),
 match:matchFormalBlockShape(game.model.blockCells(block))};try{return drawBlock(block,...args)}finally{test.active=previous}};
test.install=fixture=>{game.loadLevel(1,true);game.model=new PuzzleModel(structuredClone(fixture),{deferExitCompletion:true});game.dirty=true;game.scheduleFrame()};
test.capture=()=>{test.calls=[];test.recording=true;try{game.render()}finally{test.recording=false}
 return {calls:structuredClone(test.calls),state:game.getDebugState()}};
test.preview=()=>{const original=game.ctx,canvas=document.createElement('canvas');canvas.width=720;canvas.height=300;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#201953';ctx.fillRect(0,0,720,300);test.calls=[];test.recording=true;
 const results=[];try{game.ctx=ctx;game.model.snapshot().blocks.forEach((block,index)=>{
  const centerX=120+index*240,centerY=155,maxWidth=180,maxHeight=210;
  ctx.fillStyle='#ffffff';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText(block.color+' '+block.id,centerX,30);
  test.active={id:block.id,mode:'preview',base:ctx.getTransform(),match:matchFormalBlockShape(block.shape)};
  results.push({id:block.id,ok:game.drawFormalBlockPreview(block,centerX,centerY,maxWidth,maxHeight),centerX,centerY,maxWidth,maxHeight});
 })}finally{test.active=null;test.recording=false;game.ctx=original}
 return {calls:structuredClone(test.calls),results,png:canvas.toDataURL('image/png')};
};
game.start();
</script>`;

const browser = await chromium.launch({ headless: true });
let page;
const debug = () => page.evaluate(() => window.__SUPPLEMENTAL_TEST__.game.getDebugState());
const capture = () => page.evaluate(() => window.__SUPPLEMENTAL_TEST__.capture());
const close = (a, b, label) => assert(Math.abs(a - b) < .0002, `${label}: ${a} != ${b}`);
function assertCall(call, color, shape, cell, originX, originY) {
  assert.equal(new URL(call.src).pathname, `/${artPath}${color}-${shape.name}.png`, 'Exact supplied unrotated asset path');
  assert.deepEqual(call.native, shape.native); assert.equal(call.args.length, 2, 'Whole original PNG; no crop/stretch draw overload');
  assert.equal(call.match.shapeId, shape.shapeId); assert.equal(call.match.quarterTurns, 0, 'Dedicated unrotated match');
  assert.equal(call.match.targetWidth, shape.width); assert.equal(call.match.targetHeight, shape.height);
  close(call.matrix[0], cell / 95, 'Uniform native scale X'); close(call.matrix[3], cell / 95, 'Uniform native scale Y');
  close(call.matrix[1], 0, 'No rotation B'); close(call.matrix[2], 0, 'No rotation C');
  close(call.matrix[4], originX, 'Logical origin X'); close(call.matrix[5], originY, 'Logical origin Y');
  close(call.args[0], (shape.width * 95 - shape.native[0]) / 2, 'Native horizontal registration');
  close(call.args[1], shape.height * 95 - shape.native[1], 'Native lower bevel registration'); close(call.alpha, 1, 'Opaque solid sprite');
}
function assertBoard(frame, color) {
  const { state, calls } = frame, art = state.art.formalGameplay, board = state.board;
  assert.equal(state.puzzle.mechanismRules, 'revised-2026-09-23-v1.4'); assert.equal(state.puzzle.blocks.length, 3);
  assert.equal(art.exactWholeBlockCoverage, 3); assert.equal(art.loadedWholeBlockCoverage, 3); assert.deepEqual(art.missingWholeBlockIds, []);
  assert.equal(calls.length, 3, 'One actual whole-sprite draw per block, no cell assembly');
  for (const shape of shapes) {
    const block = state.puzzle.blocks.find(b => b.id === shape.id), matching = calls.filter(c => c.blockId === shape.id);
    assert.equal(matching.length, 1); assert.deepEqual(block.shape, cells(shape.width, shape.height));
    assertCall(matching[0], color, shape, board.cell, board.innerX + block.x * board.cell, board.innerY + block.y * board.cell);
  }
}
try {
  for (const name of artFiles) assert.equal(report.sourcesBefore[`art-source/gameplay/blocks/formal-v1/${name}`], report.sourcesBefore[`public/${artPath}${name}`], `Source/runtime PNG identical: ${name}`);
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { window.__NATIVE_STORAGE_CALLS__=[];
    for(const name of ['getItem','setItem','removeItem','clear']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__NATIVE_STORAGE_CALLS__.push(name);return original.apply(this,args)}} });
  page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('requestfailed', request => report.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  const http = [], connectorRequests = [], pending = new Set();
  report.pendingRequests = [];
  const updatePending = () => { report.pendingRequests = [...pending]; };
  page.on('request', request => { pending.add(request.url()); updatePending(); if (request.url().includes('-connector-v1.png')) connectorRequests.push(request.url()); });
  page.on('requestfinished', request => { pending.delete(request.url()); updatePending(); });
  page.on('requestfailed', request => { pending.delete(request.url()); updatePending(); });
  page.on('response', response => { const path = new URL(response.url()).pathname;
    if (artFiles.some(name => path === `/${artPath}${name}`)) http.push(response.body().then(bytes => ({ path, status: response.status(), bytes: bytes.length, sha256: sha(bytes) }))); });
  await page.route(sourceUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(sourceUrl, { waitUntil: 'commit' }); await page.waitForFunction(() => window.__SUPPLEMENTAL_TEST__?.game.getDebugState().art.ready, undefined, { timeout: 60000 });
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    for (const color of colors) {
      await page.evaluate(f => window.__SUPPLEMENTAL_TEST__.install(f), fixture(color));
      await page.waitForFunction(() => {const s=window.__SUPPLEMENTAL_TEST__.game.getDebugState();return s.screen==='playing'&&s.puzzle.levelId===993&&s.art.ready&&!s.art.revisedMechanisms.loading&&!s.art.formalGameplay.requestedBlockSignature&&!s.art.formalGameplay.missingWholeBlockIds.length&&s.art.formalGameplay.loadedWholeBlockCoverage===3});
      const frame = await capture(); assertBoard(frame, color);
      const label = `${viewport.width}x${viewport.height}-${color}`;
      await page.screenshot({ path: resolve(output, `${label}.png`) });
      let preview;
      if (viewport.width === 496) {
        preview = await page.evaluate(() => window.__SUPPLEMENTAL_TEST__.preview());
        assert.equal(preview.calls.length, 3);
        for (const shape of shapes) {
          const result = preview.results.find(r => r.id === shape.id); assert(result.ok, 'Production preview accepted supplied shape');
          const cell = Math.min(result.maxWidth / shape.width, result.maxHeight / shape.height);
          assertCall(preview.calls.find(c => c.blockId === shape.id), color, shape, cell, result.centerX - shape.width * cell / 2, result.centerY - shape.height * cell / 2);
        }
        await writeFile(resolve(output, `preview-${color}.png`), Buffer.from(preview.png.split(',')[1], 'base64')); delete preview.png;
      }
      let drag;
      if (color === 'red') {
        const board = frame.state.board, transform = frame.state.viewportTransform;
        const logical = { x: board.innerX + 1.5 * board.cell, y: board.innerY + 1.5 * board.cell };
        const canvasRect = await page.locator('canvas').boundingBox(); assert(canvasRect);
        const start = { x: canvasRect.x + transform.offsetX + logical.x * transform.scale, y: canvasRect.y + transform.offsetY + logical.y * transform.scale };
        const end = { x: start.x, y: start.y + board.cell * transform.scale };
        await page.mouse.move(start.x, start.y); await page.mouse.down(); assert.equal((await debug()).selectedId, 'vertical');
        await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
        drag = await capture(); assertBoard(drag, color); assert.equal(drag.state.puzzle.moves, 1); assert.equal(drag.state.puzzle.cleared, 0);
        const before = frame.state.puzzle.blocks.find(b => b.id === 'vertical'), after = drag.state.puzzle.blocks.find(b => b.id === 'vertical');
        assert.equal(after.x, before.x); assert.equal(after.y, before.y + 1); assert.deepEqual(after.shape, before.shape); assert.deepEqual(after.layers, before.layers);
        const oldDraw = frame.calls.find(c => c.blockId === 'vertical'), newDraw = drag.calls.find(c => c.blockId === 'vertical');
        assert.deepEqual(newDraw.native, oldDraw.native); assert.deepEqual(newDraw.args, oldDraw.args); assert.deepEqual(newDraw.matrix.slice(0, 4), oldDraw.matrix.slice(0, 4));
        await page.screenshot({ path: resolve(output, `${label}-dragged.png`) });
      }
      report.scenarios.push({ label, status: 'PASS', viewport, color, frame, preview, drag });
    }
  }
  report.httpArt = await Promise.all(http);
  assert.deepEqual([...new Set(report.httpArt.map(entry => entry.path))].sort(), artFiles.map(name => `/${artPath}${name}`).sort(), 'All 24 real HTTP PNGs observed');
  for (const entry of report.httpArt) { assert.equal(entry.status, 200); assert.equal(entry.sha256, report.sourcesBefore[`public${entry.path}`]); }
  assert.deepEqual(connectorRequests, [], 'No obsolete connector fallback');
  report.nativeStorageCalls = await page.evaluate(() => window.__NATIVE_STORAGE_CALLS__); assert.deepEqual(report.nativeStorageCalls, []);
  assert.deepEqual(report.errors, []); report.sourcesAfter = await hashes(); assert.deepEqual(report.sourcesAfter, report.sourcesBefore, 'Production, original PNGs, and runtime PNGs stable');
  report.status = 'PASS'; await context.close();
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; report.sourcesAfter = await hashes();
  if (page) { report.failureDebug = await debug().catch(() => undefined); report.failureFrame = await capture().catch(() => undefined); await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {}); }
  process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close();
  console.log(JSON.stringify({ status: report.status, output, scenarios: report.scenarios.length }));
}
