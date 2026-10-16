import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

// Read-only drawing observers forward original render calls. All gameplay uses
// real Pointer input and natural time. Debug loadLevel only prepares named fixtures.
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5199/";
const output = resolve(process.env.ROCKET_OUTPUT ?? `playtest-results/rocket-animation-20261008-${Date.now()}`);
await mkdir(output, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gamePath = "src/game/ColorEscapeGame.ts", animationPath = "src/game/rocketAnimation.ts";
const bundleName = async () => (await readFile("dist/index.html", "utf8")).match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
const bundle = await bundleName();
assert.ok(bundle);
const report = { status: "RUNNING", url, bundle,
  bundleSha256: hash(await readFile(resolve("dist/assets", bundle))),
  sourceSha256: hash(await readFile(gamePath)), animationSourceSha256: hash(await readFile(animationPath)),
  naturalClock: true, isolatedSyntheticSavesOnly: true,
  visibilityCoverage: "Synthetic document.hidden/visibilitychange through production WebHost, not OS backgrounding.",
  fixtures: ["Lv4 opening with frozen/locked metadata on two existing blocks (selection UI only)",
    "Lv21-labelled Lv4 single-block opening (last-block settlement UI only)",
    "Lv7-labelled Lv4 single-block opening (reserved booster settlement only)"],
  scenarios: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const viewports = [{ width: 320, height: 568 }, { width: 496, height: 1078 }];
let activePage;
const state = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const brief = (s) => ({ screen: s.screen, level: s.level.id, ids: s.puzzle.blocks.map((b) => b.id),
  moves: s.puzzle.moves, cleared: s.puzzle.cleared, complete: s.puzzle.complete,
  clock: s.puzzle.remainingSeconds, stock: s.economy.boosters.rocket, spent: s.activeRun?.boosterSpent.rocket ?? 0,
  lives: s.lives.lives, target: s.boosterTarget, fx: s.rocketAnimation,
  ghosts: s.exitGhosts, particles: s.particles });
const spatial = (s) => JSON.stringify(s.puzzle.blocks);
const point = async (page, logical) => {
  const d = await state(page), bounds = await page.locator("canvas").boundingBox();
  assert.ok(bounds);
  return { x: bounds.x + d.viewportTransform.offsetX + logical.x * d.viewportTransform.scale,
    y: bounds.y + d.viewportTransform.offsetY + logical.y * d.viewportTransform.scale };
};
async function button(page, key) {
  const d = await state(page), rect = (d.interactionTargets.targets ?? d.interactionTargets)[key]?.hit;
  assert.ok(rect, `Real button ${key}`);
  return point(page, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}
const clickAt = (page, p) => page.mouse.click(p.x, p.y);
const click = async (page, key) => clickAt(page, await button(page, key));
async function blockPoint(page, id) {
  const d = await state(page), b = d.puzzle.blocks.find((b) => b.id === id);
  assert.ok(b, `Visible block ${id}`);
  const [x, y] = b.shape[0];
  return point(page, { x: d.board.innerX + (b.x + x + 0.5) * d.board.cell,
    y: d.board.innerY + (b.y + y + 0.5) * d.board.cell });
}
const clickBlock = async (page, id) => clickAt(page, await blockPoint(page, id));
const trace = (page) => page.evaluate(() => window.__rocketAudit);
const resetTrace = (page) => page.evaluate(() => { window.__rocketAudit = { frames: [], board: [], boosters: [], hud: [], flightImages: [] }; });
const settled = (page) => page.waitForFunction(() => {
  const d = window.__COLOR_ESCAPE__.getDebugState();
  return !d.rocketAnimation.flight && !d.rocketAnimation.impact && d.exitGhosts === 0;
});
const ready = (page, level) => page.waitForFunction((id) => {
  const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
  return d.screen === "playing" && d.level.id === id && !g.revisedArtLoading
    && d.art.formalGameplay.missingWholeBlockIds.length === 0;
}, level);
async function load(page, id) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), id);
  await ready(page, id);
}
async function fixture(page, kind) {
  await load(page, 4);
  const result = await page.evaluate((kind) => {
    const g = window.__COLOR_ESCAPE__, base = JSON.parse(JSON.stringify(g.getDebugState().level));
    const spec = { ...base, name: `UI fixture: ${kind}` };
    if (kind === "frozen-lock") {
      spec.blocks[0].frozen = 3;
      spec.blocks[1].lockedBy = "ui-test-key";
      spec.blocks[1].lockCount = 1;
      spec.blocks[2].keyId = "ui-test-key";
    } else {
      spec.id = kind === "last-reserved" ? 7 : 21;
      spec.blocks = [spec.blocks[0]];
    }
    g.loadLevel(spec.id, true, false, spec);
    return { id: spec.id, ids: spec.blocks.map((b) => b.id) };
  }, kind);
  await ready(page, result.id);
  return result;
}
async function prepare(viewport, reducedMotion = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(({ reducedMotion }) => {
    if (!localStorage.getItem("color-escape-save-v1")) localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1, currentLevel: 21, highestLevel: 21, coins: 777,
      sound: false, music: false, haptic: false, reducedMotion, language: "zh-CN",
      featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "arrow-block", "key-lock", "lift", "star", "bomb", "flip-door", "colored-grid"],
      boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket", "pulse"],
      boosters: { time: 9, rocket: 9, pulse: 9 }, bestStars: {}, bestMoves: {},
      rewardedLevels: Array.from({ length: 20 }, (_, i) => i + 1),
      collectionIntroPending: false, collectionIntroShown: true, leagueIntroSeen: true,
      journeyProgress: { claimedMilestoneLevels: [5,10,15,20], seenEpisodeUnlockLevels: [1,11,21] },
    }));
  }, { reducedMotion });
  const page = await context.newPage();
  activePage = page;
  page.on("pageerror", (e) => report.errors.push({ viewport, message: e.message }));
  page.on("console", (m) => { if (m.type() === "error") report.errors.push({ viewport, message: m.text() }); });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.ok((await page.locator("script[src]").evaluateAll((nodes) => nodes.map((n) => n.src))).some((s) => s.endsWith(bundle)));
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  await load(page, 4);
  await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__;
    window.__rocketAudit = { frames: [], board: [], boosters: [], hud: [], flightImages: [] };
    const matrix = (ctx) => { const m = ctx.getTransform(); return { a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f }; };
    for (const [method, key] of [["drawBoard", "board"], ["drawBoosters", "boosters"]]) {
      const original = g[method];
      g[method] = function (...args) {
        const d = this.getDebugState();
        if (d.screen === "playing") window.__rocketAudit[key].push({ at:performance.now(), m:matrix(this.ctx), fx:d.rocketAnimation });
        return original.apply(this, args);
      };
    }
    const ctx = g.ctx, fillText = ctx.fillText, drawImage = ctx.drawImage;
    ctx.fillText = function (text, ...args) {
      if (/^\d{2}:\d{2}$/.test(String(text)) && g.getDebugState().screen === "playing") {
        window.__rocketAudit.hud.push({ at:performance.now(), m:matrix(this), text:String(text), fx:g.getDebugState().rocketAnimation });
      }
      return fillText.call(this, text, ...args);
    };
    ctx.drawImage = function (image, ...args) {
      if (image === g.art.gameplayUi?.boosterRocket && args.length === 4 && args[0] < 0) {
        const d = g.getDebugState();
        if(d.rocketAnimation.flight) window.__rocketAudit.flightImages.push({ at:performance.now(), m:matrix(this), fx:d.rocketAnimation });
      }
      return drawImage.call(this, image, ...args);
    };
    const sample = () => {
      const d = g.getDebugState();
      window.__rocketAudit.frames.push({ at:performance.now(), screen:d.screen, ids:d.puzzle.blocks.map(b=>b.id),
        complete:d.puzzle.complete, stock:d.economy.boosters.rocket, spent:d.activeRun?.boosterSpent.rocket??0,
        ghosts:d.exitGhosts, clock:d.puzzle.remainingSeconds, fx:d.rocketAnimation });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  return { context, page };
}
async function pixels(filename, p) {
  const { data, info } = await sharp(filename).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum=0, count=0;
  for(let y=Math.round(p.y)-2;y<=Math.round(p.y)+2;y++) for(let x=Math.round(p.x)-2;x<=Math.round(p.x)+2;x++) {
    if(x<0||y<0||x>=info.width||y>=info.height) continue;
    for(let c=0;c<3;c++){sum+=data[(y*info.width+x)*3+c];count++;}
  }
  return sum/count;
}
async function shoot(page, id) {
  await click(page, "booster.rocket");
  const p=await blockPoint(page,id);
  await clickAt(page,p);
}
async function hold(page, hidden=false) {
  if(hidden) await page.evaluate(()=>{
    Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const before=await state(page);
  await page.waitForTimeout(500);
  const after=await state(page);
  assert.equal(after.rocketAnimation.flight?.age,before.rocketAnimation.flight?.age);
  assert.equal(after.puzzle.remainingSeconds,before.puzzle.remainingSeconds);
  assert.equal(spatial(after),spatial(before));
  assert.equal(after.economy.boosters.rocket,before.economy.boosters.rocket);
  if(hidden) await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
  return {before:brief(before),after:brief(after)};
}

try {
  for (const viewport of viewports) {
    const {context,page}=await prepare(viewport), name=`selection-flight-impact-${viewport.width}`;
    const f=await fixture(page,"frozen-lock"), before=await state(page);
    const expected=await page.evaluate(()=>{
      const g=window.__COLOR_ESCAPE__;
      return g.model.snapshot().blocks.filter(b=>g.model.isBlockActive(b)).map(b=>b.id).sort();
    });
    const probes=await Promise.all(before.puzzle.blocks.map(async b=>({id:b.id,p:await blockPoint(page,b.id)})));
    const normal=resolve(output,`${name}-normal.png`), selected=resolve(output,`${name}-selected.png`);
    await page.screenshot({path:normal});
    await click(page,"booster.rocket");
    const armed=await state(page);
    assert.equal(armed.boosterTarget,"rocket");
    assert.deepEqual([...armed.rocketAnimation.eligibleBlockIds].sort(),expected);
    assert.equal(armed.economy.boosters.rocket,9);
    await page.screenshot({path:selected});
    const brightness=[];
    for(const probe of probes){
      const a=await pixels(normal,probe.p),b=await pixels(selected,probe.p),ratio=b/a;
      assert.ok(a>4);
      if(expected.includes(probe.id)) assert.ok(ratio>0.65,`${probe.id}: eligible target stays bright (${ratio})`);
      else assert.ok(ratio<0.45,`${probe.id}: invalid target remains dim (${ratio})`);
      brightness.push({id:probe.id,eligible:expected.includes(probe.id),normal:a,selected:b,ratio});
    }
    for(const id of f.ids.slice(0,2)){
      await clickBlock(page,id);
      const invalid=await state(page);
      assert.equal(invalid.boosterTarget,"rocket");
      assert.equal(invalid.economy.boosters.rocket,9);
      assert.ok(!invalid.rocketAnimation.flight);
      assert.equal(spatial(invalid),spatial(before));
    }
    await click(page,"booster.rocket");
    assert.ok(!(await state(page)).boosterTarget,"Toggle cancels selection without spending");
    await click(page,"booster.rocket");
    await clickAt(page,await point(page,{x:8,y:450}));
    const blankCancelled=await state(page);
    assert.ok(!blankCancelled.boosterTarget&&!blankCancelled.rocketAnimation.flight,
      "A real blank-area click cancels selection without launching");
    assert.equal(blankCancelled.economy.boosters.rocket,9);
    await resetTrace(page);
    const target=expected.find(id=>id!==f.ids[2])??expected[0];
    await shoot(page,target);
    const flying=await state(page);
    assert.ok(flying.rocketAnimation.flight);
    assert.equal(flying.economy.boosters.rocket,9);
    assert.equal(spatial(flying),spatial(before));
    await page.screenshot({path:resolve(output,`${name}-flight.png`)});
    await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.getDebugState().rocketAnimation.impact));
    const hit=await state(page);
    assert.equal(hit.economy.boosters.rocket,8);
    assert.ok(!hit.puzzle.blocks.some(b=>b.id===target));
    assert.equal(hit.puzzle.blocks.length,before.puzzle.blocks.length-1);
    assert.ok(hit.exitGhosts>0,"Original texture shatter ghost is present");
    await page.screenshot({path:resolve(output,`${name}-impact.png`)});
    await settled(page);
    const ended=await state(page),audit=await trace(page);
    assert.equal(ended.economy.boosters.rocket,8);
    assert.equal(ended.puzzle.moves,before.puzzle.moves);
    assert.ok(audit.frames.some(s=>Math.hypot(s.fx.shake.x,s.fx.shake.y)>0.1));
    assert.ok(audit.flightImages.length>=2,"Actual rocket sprite was drawn during flight");
    for(const sample of audit.flightImages){
      const fx=sample.fx.flight,t=before.viewportTransform;
      const x=(sample.m.e-t.offsetX)/t.scale,y=(sample.m.f-t.offsetY)/t.scale;
      const dx=fx.target.x-fx.source.x,dy=fx.target.y-fx.source.y;
      const perpendicular=Math.abs((x-fx.source.x)*dy-(y-fx.source.y)*dx)/Math.hypot(dx,dy);
      assert.ok(perpendicular<0.05,`Rocket centre remains on straight segment: ${perpendicular}`);
    }
    const base=audit.board.find(s=>!s.fx.impact)?.m;
    assert.ok(base);
    assert.ok(audit.board.some(s=>s.fx.impact&&Math.hypot(s.m.e-base.e,s.m.f-base.f)>0.1),"Actual board draw transform shakes");
    const hudBase=audit.hud[0]?.m,boosterBase=audit.boosters[0]?.m;
    assert.ok(hudBase&&boosterBase);
    for(const row of audit.hud.filter(s=>s.fx.impact)) assert.deepEqual(row.m,hudBase,"HUD transform stays fixed");
    for(const row of audit.boosters.filter(s=>s.fx.impact)) assert.deepEqual(row.m,boosterBase,"Booster row stays fixed");
    await load(page,4);
    const changed=await state(page);
    assert.equal(changed.economy.boosters.rocket,8,"Changing level does not refund an already committed rocket");
    assert.ok(!changed.rocketAnimation.flight&&!changed.rocketAnimation.impact);
    report.scenarios.push({name,status:"PASS",brightness,before:brief(before),blankCancelled:brief(blankCancelled),flying:brief(flying),hit:brief(hit),ended:brief(ended),changed:brief(changed),audit});
    await context.close();
  }

  for(const viewport of viewports){
    const {context,page}=await prepare(viewport),name=`pause-hide-cancel-restart-${viewport.width}`;
    const exitId=await page.evaluate(()=>{
      const g=window.__COLOR_ESCAPE__;
      return g.model.snapshot().blocks.find(b=>g.model.possibleExitSides(b).length>0)?.id;
    });
    assert.ok(exitId);
    await clickBlock(page,exitId);
    await page.waitForFunction(id=>!window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.some(b=>b.id===id),exitId);
    await settled(page);
    const previous=await state(page);
    assert.equal(previous.puzzle.moves,1);
    const target=previous.puzzle.blocks[0].id,pause=await button(page,"pause"),rocket=await button(page,"booster.rocket");
    await shoot(page,target);
    await clickAt(page,pause);
    assert.equal((await state(page)).screen,"paused");
    assert.ok((await state(page)).rocketAnimation.flight);
    const paused=await hold(page),hidden=await hold(page,true);
    await click(page,"pauseResume");
    await clickAt(page,rocket);
    const repeated=await state(page);
    assert.equal(repeated.rocketAnimation.flight?.blockId,target,"In-flight repeated rocket click cannot launch another projectile");
    assert.equal(repeated.economy.boosters.rocket,9);
    assert.equal(spatial(repeated),spatial(previous));
    assert.equal(repeated.puzzle.moves,previous.puzzle.moves);
    await clickAt(page,pause);
    await click(page,"pauseRestart");
    await ready(page,4);
    await page.waitForTimeout(650);
    const restarted=await state(page);
    assert.ok(!restarted.rocketAnimation.flight&&!restarted.rocketAnimation.impact);
    assert.equal(restarted.economy.boosters.rocket,9);
    assert.equal(restarted.puzzle.moves,0);
    report.scenarios.push({name,status:"PASS",previous:brief(previous),paused,hidden,repeated:brief(repeated),restarted:brief(restarted)});
    await context.close();
  }

  for(const viewport of viewports){
    const {context,page}=await prepare(viewport),name=`last-block-waits-${viewport.width}`;
    const f=await fixture(page,"last-normal");
    await resetTrace(page);
    await shoot(page,f.ids[0]);
    const flying=await state(page);
    assert.ok(!flying.puzzle.complete&&flying.puzzle.blocks.length===1);
    assert.equal(flying.economy.boosters.rocket,9);
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().puzzle.complete);
    const impact=await state(page);
    assert.equal(impact.screen,"playing","Last block waits for visual completion");
    assert.equal(impact.economy.boosters.rocket,8);
    assert.ok(impact.exitGhosts>0);
    await page.screenshot({path:resolve(output,`${name}-shatter.png`)});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==="win");
    const ended=await state(page),audit=await trace(page);
    const firstComplete=audit.frames.find(s=>s.complete),firstWin=audit.frames.find(s=>s.screen==="win");
    assert.ok(firstComplete&&firstWin);
    assert.ok(firstWin.at-firstComplete.at>=400,"Settlement follows the natural shatter duration");
    assert.equal(ended.economy.boosters.rocket,8);
    report.scenarios.push({name,status:"PASS",flying:brief(flying),impact:brief(impact),ended:brief(ended),waitMs:firstWin.at-firstComplete.at,audit});
    await context.close();
  }

  for(const viewport of viewports){
    const {context,page}=await prepare(viewport,true),name=`reduced-motion-${viewport.width}`;
    const before=await state(page),id=before.puzzle.blocks[0].id;
    await resetTrace(page);
    await shoot(page,id);
    await page.waitForFunction((id)=>!window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.some(b=>b.id===id),id);
    await settled(page);
    const ended=await state(page),audit=await trace(page);
    assert.equal(ended.economy.boosters.rocket,8);
    assert.ok(audit.frames.some(s=>s.fx.flight?.duration===0.12));
    assert.ok(audit.frames.some(s=>s.ghosts>0),"Static reduced-motion fade is present");
    assert.equal(audit.flightImages.length,0,"Reduced motion does not draw travelling rocket");
    assert.ok(audit.frames.every(s=>s.fx.shake.x===0&&s.fx.shake.y===0));
    await page.screenshot({path:resolve(output,`${name}.png`)});
    report.scenarios.push({name,status:"PASS",ended:brief(ended),audit});
    await context.close();
  }

  for(const viewport of viewports){
    const {context,page}=await prepare(viewport),name=`level7-reservation-${viewport.width}`;
    await load(page,7);
    await clickBlock(page,"cc-piece-04");
    await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().puzzle.blocks.some(b=>b.id==="cc-piece-04"));
    await settled(page);
    const before=await state(page);
    await shoot(page,"strategy-guard-12");
    const flying=await state(page);
    assert.equal(flying.economy.boosters.rocket,9);
    assert.equal(flying.activeRun?.boosterSpent.rocket??0,0);
    await settled(page);
    const reserved=await state(page);
    assert.equal(reserved.economy.boosters.rocket,9);
    assert.equal(reserved.activeRun?.boosterSpent.rocket,1);
    assert.ok(!reserved.puzzle.blocks.some(b=>b.id==="strategy-guard-12"));
    await load(page,7);
    const reentered=await state(page);
    assert.equal(reentered.economy.boosters.rocket,9);
    assert.equal(reentered.activeRun?.boosterSpent.rocket??0,0);
    const f=await fixture(page,"last-reserved");
    await shoot(page,f.ids[0]);
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().puzzle.complete);
    const pending=await state(page);
    assert.equal(pending.screen,"playing");
    assert.equal(pending.economy.boosters.rocket,9);
    assert.equal(pending.activeRun?.boosterSpent.rocket,1);
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==="win");
    const won=await state(page);
    assert.equal(won.economy.boosters.rocket,8,"Lv7 reserves at impact and deducts exactly once on successful settlement");
    report.scenarios.push({name,status:"PASS",before:brief(before),flying:brief(flying),reserved:brief(reserved),reentered:brief(reentered),singleBlockFixturePending:brief(pending),singleBlockFixtureWon:brief(won)});
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status="PASS";
} catch(error) {
  report.status="FAIL";
  report.failure=error.stack??String(error);
  if(activePage&&!activePage.isClosed()){
    const last=await state(activePage).catch(()=>undefined);
    if(last)report.lastState=brief(last);
    report.lastAudit=await trace(activePage).catch(()=>undefined);
    await activePage.screenshot({path:resolve(output,"failure.png")}).catch(()=>{});
  }
  process.exitCode=1;
} finally {
  report.finalSourceSha256=hash(await readFile(gamePath));
  report.finalAnimationSourceSha256=hash(await readFile(animationPath));
  report.finalBundle=await bundleName();
  report.finalBundleSha256=report.finalBundle?hash(await readFile(resolve("dist/assets",report.finalBundle))):null;
  report.bundleStable=report.bundle===report.finalBundle&&report.bundleSha256===report.finalBundleSha256;
  report.sourceStable=report.sourceSha256===report.finalSourceSha256&&report.animationSourceSha256===report.finalAnimationSourceSha256;
  if(!report.bundleStable){report.status="FAIL_BUILD_CHANGED";process.exitCode=1;}
  if(!report.sourceStable){
    report.sourceDriftWarning="Browser observations apply only to the recorded built bundle, not newer workspace source.";
    if(report.bundleStable)report.status="FAIL_SOURCE_CHANGED";
    process.exitCode=1;
  }
  await writeFile(resolve(output,"report.json"),JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,errors:report.errors.length,
  report:resolve(output,"report.json"),failure:report.failure,sourceStable:report.sourceStable,bundleStable:report.bundleStable},null,2));
