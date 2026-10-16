import { mkdir, writeFile } from "node:fs/promises";
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import {createServer} from "vite";
import {verifyRulesLock} from "../../verify-rules-lock.mjs";
import {digest} from "../../revised-preview-validation-v160.mjs";
import {inspectDisjoint211to220Data} from "../../continue201-210/pointer/disjoint-data-audit.mjs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rules=verifyRulesLock();assert(rules.ok,rules.errors.join('\n'));
const output=resolve('playtest-results/temporary-level-selector/221-230-20260930',String(Date.now())+'-'+process.pid);
const bindings={};
const bind=file=>{const name=file.replaceAll('\\','/');bindings[name]=digest(fs.readFileSync(file));};
const tree=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())tree(file);else bind(file);}};
tree('src');tree('public');
for(const file of ['index.html','package.json','docs/rules/manifest.json','docs/rules/mechanism-rules-v'+rules.activeVersion+'.md','tools/continue221-230/temporary-selector/run.mjs','tools/continue201-210/pointer/disjoint-data-audit.mjs','tools/verify-rules-lock.mjs','tools/revised-preview-validation-v160.mjs'])bind(file);
const snapshotRoot=resolve(output,'source-snapshot');
for(const [file,sha]of Object.entries(bindings)){const bytes=fs.readFileSync(file);assert.equal(digest(bytes),sha,'Snapshot race '+file);const target=resolve(snapshotRoot,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const playtestUrl='http://127.0.0.1:'+server.httpServer.address().port+'/';
const SAVE_KEY = "color-escape-save-v1";
const ORIGINAL_LEVEL = 2;
const TEST_LEVEL = 114;
const NEXT_PAGE_CLICKS = 5;
const FORMAL_TEST_LEVELS = [221,230];
const FORMAL_TEST_PAGE = 10;

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserErrors = [];
const results = [];

const fail = (label, message, detail) => {
  const suffix = detail === undefined ? "" : `: ${JSON.stringify(detail)}`;
  throw new Error(`Temporary-level-selector E2E (${label}): ${message}${suffix}`);
};

const runViewport = async ({ label, width, height }) => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));

  const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const storageBytes = () => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const canvasPoint = async ({ x, y }) => {
    const state = await debug();
    const bounds = await page.locator("canvas").boundingBox();
    if (!bounds) fail(label, "canvas bounds are unavailable");
    return {
      x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
      y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
    };
  };
  const targetPoint = async (name) => {
    const state = await debug();
    const hit = state.interactionTargets?.targets?.[name]?.hit;
    if (!hit) fail(label, `missing interaction target ${name}`, state.temporaryLevelTest);
    return canvasPoint({ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 });
  };
  const clickTarget = async (name) => {
    const point = await targetPoint(name);
    await page.mouse.click(point.x, point.y);
  };
  const pressTarget = async (name) => {
    const point = await targetPoint(name);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForFunction((key) => (
      window.__COLOR_ESCAPE__?.getDebugState().buttonPress?.key === key
    ), name);
    return point;
  };
  const waitForState = (predicate, argument) => page.waitForFunction(predicate, argument, { timeout: 8_000 });
  const expectStorage = async (expected, phase) => {
    const actual = await storageBytes();
    if (actual !== expected) {
      fail(label, `storage bytes changed during ${phase}`, {
        expectedLength: expected?.length,
        actualLength: actual?.length,
      });
    }
    return actual;
  };

  try {
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState);
    const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
    await page.evaluate(async ({ key, lastSeenUpdate, currentLevel }) => {
      const {FEATURE_INTRO_POLICY}=await import('/src/game/featureIntroPolicy.ts');
      localStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        currentLevel,
        highestLevel: 30,
        coins: 10_000,
        sound: false,
        haptic: false,
        reducedMotion: true,
        language: "zh-CN",
        featureSeen: ['basics', ...FEATURE_INTRO_POLICY.map(feature=>feature.kind)],
        boosterUnlockSeen: ["time", "rocket", "pulse"],
        metaDiscovery: { collectionViewedThroughLevel: 30, dailyUnlockSeen: true },
        boosters: { time: 3, rocket: 3, pulse: 3 },
        bestStars: {},
        bestMoves: {},
        rewardedLevels: [1],
        journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
        achievementProgress: { claimedIds: [] },
        collectionProgress: {
          restoredMasterpieceIds: [],
          seenItemIds: [],
          claimedMilestoneIds: [],
        },
        selectedJourneyEpisode: 1,
        lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
        dailyStreak: 0,
        lastDailyCompletedDay: "",
        lastSeenUpdate,
      }));
    }, { key: SAVE_KEY, lastSeenUpdate: updateId, currentLevel: ORIGINAL_LEVEL });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForState(() => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.art.ready && state.storage.baselineReady && !state.storage.normalizationPending;
    });
    await page.waitForTimeout(80);

    let state = await debug();
    if (state.screen !== "home" || state.level.id !== ORIGINAL_LEVEL || state.temporaryLevelTest.active) {
      fail(label, "invalid baseline state", {
        screen: state.screen,
        levelId: state.level.id,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }
    const baselineStorage = await storageBytes();
    if (typeof baselineStorage !== "string" || baselineStorage.length === 0) {
      fail(label, "normalized baseline save is missing");
    }

    // The Home entry follows the release contract: down only arms it, and a
    // drag outside its hit rectangle cancels the action on release.
    await pressTarget("temporaryLevel.open");
    state = await debug();
    if (state.temporaryLevelTest.selectorOpen || state.screen !== "home") {
      fail(label, "Home entry activated on pointerdown", state.temporaryLevelTest);
    }
    const neutral = await canvasPoint({ x: 248, y: 380 });
    await page.mouse.move(neutral.x, neutral.y, { steps: 4 });
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().buttonPress?.inside === false);
    await page.mouse.up();
    await waitForState(() => !window.__COLOR_ESCAPE__?.getDebugState().buttonPress);
    state = await debug();
    if (state.temporaryLevelTest.selectorOpen || state.level.id !== ORIGINAL_LEVEL) {
      fail(label, "dragging out of the Home entry did not cancel", state.temporaryLevelTest);
    }
    await expectStorage(baselineStorage, "cancelled Home-entry press");

    await clickTarget("temporaryLevel.open");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen === true);
    state = await debug();
    if (state.temporaryLevelTest.page !== 0 || state.temporaryLevelTest.selectedLevel !== ORIGINAL_LEVEL) {
      fail(label, "selector did not open on the baseline page", state.temporaryLevelTest);
    }

    // The modal must consume the whole interaction stream. The underlying
    // START center intentionally falls in blank modal space between actions.
    const underlyingPlay = await targetPoint("homePlay");
    await page.mouse.click(underlyingPlay.x, underlyingPlay.y);
    await page.waitForTimeout(50);
    state = await debug();
    if (state.screen !== "home" || !state.temporaryLevelTest.selectorOpen || state.temporaryLevelTest.active) {
      fail(label, "selector modal allowed the underlying Home START action", {
        screen: state.screen,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }

    // Page 0 covers Lv1-20; five genuine Canvas clicks reach page 5, which
    // covers Lv101-120. Verify the first click also waits for pointerup.
    await pressTarget("temporaryLevel.next");
    state = await debug();
    if (state.temporaryLevelTest.page !== 0) {
      fail(label, "next page activated on pointerdown", state.temporaryLevelTest);
    }
    await page.mouse.up();
    await waitForState((pageNumber) => (
      window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page === pageNumber
    ), 1);
    for (let pageNumber = 2; pageNumber <= NEXT_PAGE_CLICKS; pageNumber += 1) {
      await clickTarget("temporaryLevel.next");
      await waitForState((expectedPage) => (
        window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page === expectedPage
      ), pageNumber);
    }
    state = await debug();
    if (state.temporaryLevelTest.page !== 5 || state.temporaryLevelTest.selectedLevel !== 101) {
      fail(label, "five next-page clicks did not reach the Lv101-120 page", state.temporaryLevelTest);
    }

    await clickTarget(`temporaryLevel.level.${TEST_LEVEL}`);
    await waitForState((levelId) => (
      window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectedLevel === levelId
    ), TEST_LEVEL);
    await page.screenshot({ path: resolve(output, `01-${label}-lv114-selected-${width}x${height}.png`) });

    const beforeStartStorage = await expectStorage(baselineStorage, "selector navigation before START TEST");
    await pressTarget("temporaryLevel.start");
    state = await debug();
    if (state.screen !== "home" || state.level.id !== ORIGINAL_LEVEL
      || state.temporaryLevelTest.active || !state.temporaryLevelTest.selectorOpen) {
      fail(label, "START TEST activated on pointerdown", {
        screen: state.screen,
        levelId: state.level.id,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }
    await page.mouse.up();
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "playing"
        && current.level.id === levelId
        && current.temporaryLevelTest.active
        && current.temporaryLevelTest.storageSuppressed;
    }, TEST_LEVEL);
    state = await debug();
    if (state.temporaryLevelTest.baselineLevelId !== ORIGINAL_LEVEL || state.temporaryLevelTest.selectorOpen) {
      fail(label, "temporary session baseline or selector state is wrong", state.temporaryLevelTest);
    }
    const afterStartStorage = await expectStorage(baselineStorage, "active Lv114 test");
    await page.screenshot({ path: resolve(output, `02-${label}-lv114-playing-${width}x${height}.png`) });

    await clickTarget("pause");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "paused");
    await clickTarget("pauseHome");
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "home"
        && current.level.id === levelId
        && current.temporaryLevelTest.active
        && current.temporaryLevelTest.storageSuppressed;
    }, TEST_LEVEL);
    await expectStorage(baselineStorage, "pause-to-Home inside temporary test");

    await clickTarget("temporaryLevel.open");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen === true);
    state = await debug();
    if (state.temporaryLevelTest.page !== 5 || state.temporaryLevelTest.selectedLevel !== TEST_LEVEL
      || !state.interactionTargets.targets["temporaryLevel.exit"]) {
      fail(label, "active test selector did not expose EXIT TEST on the Lv114 page", state.temporaryLevelTest);
    }
    await page.screenshot({ path: resolve(output, `03-${label}-active-test-exit-${width}x${height}.png`) });

    await clickTarget("temporaryLevel.exit");
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "home"
        && current.level.id === levelId
        && !current.temporaryLevelTest.active
        && !current.temporaryLevelTest.selectorOpen
        && !current.temporaryLevelTest.storageSuppressed;
    }, ORIGINAL_LEVEL);
    const afterExitStorage = await expectStorage(baselineStorage, "EXIT TEST restoration");
    await page.screenshot({ path: resolve(output, `04-${label}-restored-lv2-${width}x${height}.png`) });

    const formalSessions=[];
    for(const formalLevel of FORMAL_TEST_LEVELS){
      await clickTarget('temporaryLevel.open');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen===true);
      for(let pageNumber=1;pageNumber<=FORMAL_TEST_PAGE;pageNumber++){
        await clickTarget('temporaryLevel.next');
        await waitForState(expected=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page===expected,pageNumber);
      }
      state=await debug();
      const formalLevelTargets=Object.keys(state.interactionTargets.targets)
        .filter(key=>key.startsWith('temporaryLevel.level.'))
        .map(key=>Number(key.slice('temporaryLevel.level.'.length))).sort((a,b)=>a-b);
      const expectedTargets=[...Array.from({length:10},(_,i)=>201+i),...Array.from({length:10},(_,i)=>221+i)];
      if(state.temporaryLevelTest.page!==10||state.temporaryLevelTest.selectedLevel!==201
        ||JSON.stringify(formalLevelTargets)!==JSON.stringify(expectedTargets)
        ||state.interactionTargets.targets['temporaryLevel.next']){
        fail(label,'Final page must contain exactly 201–210 and 221–230, with no 211–220 or next page',{temporaryLevelTest:state.temporaryLevelTest,formalLevelTargets});
      }
      await clickTarget('temporaryLevel.level.'+formalLevel);
      await waitForState(id=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectedLevel===id,formalLevel);
      const selectedScreenshot=resolve(output,'05-'+label+'-lv'+formalLevel+'-selected-'+width+'x'+height+'.png');
      await page.screenshot({path:selectedScreenshot});
      await expectStorage(baselineStorage,'Lv'+formalLevel+' selector navigation');
      await clickTarget('temporaryLevel.start');
      await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='playing'&&d.level.id===id&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed;},formalLevel);
      await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.art?.ready&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation();},undefined,{timeout:30000});
      state=await debug();
      if(state.temporaryLevelTest.baselineLevelId!==ORIGINAL_LEVEL||state.temporaryLevelTest.selectorOpen)fail(label,'Invalid temporary session baseline',state.temporaryLevelTest);
      const identity=await page.evaluate(async id=>{
        const {LEVELS,getLevelStrict}=await import('/src/core/levels.ts');
        const {getFormal221to230LevelStrict}=await import('/src/core/formal221to230Data.ts');
        const catalog=await import('/src/game/temporaryTestLevelCatalog.ts');
        const excludedIds=[];
        for(let n=211;n<=220;n++){try{catalog.getTemporaryTestLevelStrict(n);}catch(error){if(error instanceof RangeError)excludedIds.push(n);}}
        let productionTargetExcluded=false;try{getLevelStrict(id);}catch(error){productionTargetExcluded=error instanceof RangeError;}
        const level=window.__COLOR_ESCAPE__.model.level;
        return {formalObjectIdentity:level===getFormal221to230LevelStrict(id),catalogObjectIdentity:level===catalog.getTemporaryTestLevelStrict(id),
          productionBoundary:LEVELS.length,temporaryLevelCount:catalog.TEMPORARY_TEST_LEVEL_COUNT,excludedIds,productionTargetExcluded,
          activeLevel:structuredClone(level)};
      },formalLevel);
      if(!identity.formalObjectIdentity||!identity.catalogObjectIdentity||identity.productionBoundary!==200||identity.temporaryLevelCount!==220
        ||!identity.productionTargetExcluded||JSON.stringify(identity.excludedIds)!==JSON.stringify(Array.from({length:10},(_,i)=>211+i)))fail(label,'Formal reference/catalog/boundary mismatch',identity);
      await expectStorage(baselineStorage,'active Lv'+formalLevel+' test');
      const playingScreenshot=resolve(output,'06-'+label+'-lv'+formalLevel+'-playing-'+width+'x'+height+'.png');
      await page.screenshot({path:playingScreenshot});
      await clickTarget('pause');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().screen==='paused');
      await clickTarget('pauseHome');
      await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&d.temporaryLevelTest.active;},formalLevel);
      await expectStorage(baselineStorage,'Lv'+formalLevel+' pause-to-Home');
      let exitSelectedLevel=formalLevel,previousNavigation,forwardNavigation=[],endBoundaryNavigation;
      if(formalLevel===221){
        await clickTarget('homePrev');
        await waitForState(()=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===210&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed;});
        const previousIdentity=await page.evaluate(async()=>{
          const {getFormal201to210LevelStrict}=await import('/src/core/formal201to210Data.ts');
          return window.__COLOR_ESCAPE__.model.level===getFormal201to210LevelStrict(210);
        });
        if(!previousIdentity)fail(label,'Lv221 previous navigation must load the actual formal Lv210 reference');
        await expectStorage(baselineStorage,'temporary Home previous navigation 221 to 210');
        previousNavigation={from:221,to:210,formalObjectIdentity:true,storageBytesPreserved:true,realPointer:true};
        for(const [from,to,target]of [[210,221,'homeNext'],[221,222,'homeNext'],[222,221,'homePrev']]){
          await clickTarget(target);
          await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed;},to);
          const formalIdentity=await page.evaluate(async id=>{
            const {getFormal221to230LevelStrict}=await import('/src/core/formal221to230Data.ts');
            return window.__COLOR_ESCAPE__.model.level===getFormal221to230LevelStrict(id);
          },to);
          if(!formalIdentity)fail(label,'Temporary Home navigation lost formal registry identity',{from,to});
          await expectStorage(baselineStorage,'temporary Home navigation '+from+' to '+to);
          forwardNavigation.push({from,to,target,formalObjectIdentity:true,storageBytesPreserved:true,realPointer:true});
        }
        exitSelectedLevel=221;
      }else if(formalLevel===230){
        // Debug targets retain geometry even when the corresponding arrow is
        // disabled. Click that real Canvas location to test the end boundary.
        await clickTarget('homeNext');
        await page.waitForTimeout(80);
        const boundary=await debug();
        if(boundary.screen!=='home'||boundary.level.id!==230||!boundary.temporaryLevelTest.active||!boundary.temporaryLevelTest.storageSuppressed)fail(label,'Final temporary level advanced beyond 230',boundary.temporaryLevelTest);
        const formalIdentity=await page.evaluate(async()=>{
          const {getFormal221to230LevelStrict}=await import('/src/core/formal221to230Data.ts');
          return window.__COLOR_ESCAPE__.model.level===getFormal221to230LevelStrict(230);
        });
        if(!formalIdentity)fail(label,'Final temporary level lost formal registry identity');
        await expectStorage(baselineStorage,'disabled Home next at 230');
        endBoundaryNavigation={from:230,to:230,formalObjectIdentity:true,storageBytesPreserved:true,realPointer:true};
      }
      await clickTarget('temporaryLevel.open');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen===true);
      state=await debug();
      if(state.temporaryLevelTest.page!==FORMAL_TEST_PAGE||state.temporaryLevelTest.selectedLevel!==exitSelectedLevel||!state.interactionTargets.targets['temporaryLevel.exit'])fail(label,'Active formal selector did not restore the correct final-page selection',state.temporaryLevelTest);
      await clickTarget('temporaryLevel.exit');
      await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&!d.temporaryLevelTest.active&&!d.temporaryLevelTest.selectorOpen&&!d.temporaryLevelTest.storageSuppressed;},ORIGINAL_LEVEL);
      await expectStorage(baselineStorage,'Lv'+formalLevel+' EXIT TEST restoration');
      const restoredScreenshot=resolve(output,'07-'+label+'-lv'+formalLevel+'-restored-lv2-'+width+'x'+height+'.png');
      await page.screenshot({path:restoredScreenshot});
      formalSessions.push({id:formalLevel,status:'PASS',page:FORMAL_TEST_PAGE,pageNumber:11,pageCount:11,finalPageIds:formalLevelTargets,
        identity,previousNavigation,forwardNavigation,endBoundaryNavigation,levelSha256:digest(identity.activeLevel),storageBytesPreserved:true,baselineStorageSha256:digest(baselineStorage),
        baselineLevelRestored:ORIGINAL_LEVEL,selectedScreenshot,playingScreenshot,restoredScreenshot});
    }

    results.push({
      label,
      viewport: { width, height },
      baselineLevelId: ORIGINAL_LEVEL,
      testedLevelId: TEST_LEVEL,
      formalTestedLevelIds: FORMAL_TEST_LEVELS,
      formalSessions,
      nextPageClicks: NEXT_PAGE_CLICKS,
      formalPage: FORMAL_TEST_PAGE,
      pointerContract: {
        activation: "pointerup",
        dragOutsideCancels: true,
        modalBlocksUnderlyingHomePlay: true,
      },
      temporarySession: {
        activeAtLevel114: true,
        storageSuppressedAtLevel114: true,
        pauseHomeRetainsSession: true,
        exitRestoresBaseline: true,
        activeAtLevel221: true,
        activeAtLevel230: true,
        storageSuppressedAtFormalLevels: true,
        formalExitRestoresBaseline: true,
      },
      storage: {
        byteLength: baselineStorage.length,
        unchangedBeforeStart: beforeStartStorage === baselineStorage,
        unchangedAfterStart: afterStartStorage === baselineStorage,
        unchangedAfterExit: afterExitStorage === baselineStorage,
        formalSessionsPreserveBytes: formalSessions.every(session=>session.storageBytesPreserved),
        baselineSha256:digest(baselineStorage),
      },
      browserErrors: errors,
    });
  } catch(error){
    await page.screenshot({path:resolve(output,'failure-'+label+'.png')}).catch(()=>{});
    await writeFile(resolve(output,'failure-'+label+'.json'),JSON.stringify({error:String(error.stack??error),state:await debug().catch(()=>null)},null,2));
    throw error;
  } finally {
    browserErrors.push(...errors.map((message) => `[${label}] ${message}`));
    await context.close();
  }
};

const report={status:'running',verified:false,ruleVersion:rules.activeVersion,output,sourceSnapshot:snapshotRoot,bindings,results,browserErrors,
  playerSaveTouched:false,isolatedBrowserStorage:true,candidateOverlay:false,testCampaignScaffold:false,productionBoundary:200,
  scope:'Temporary selector navigation, formal object identity and save-byte restoration; not a full gameplay route or settlement test.'};
try{
 await runViewport({label:'desktop',width:496,height:1078});
 await runViewport({label:'phone',width:320,height:568});
 assert.deepEqual(browserErrors,[]);
 report.snapshotDrift=Object.entries(bindings).filter(([file,sha])=>digest(fs.readFileSync(resolve(snapshotRoot,file)))!==sha);
 assert.deepEqual(report.snapshotDrift,[]);
 report.currentWorkspaceDrift=Object.entries(bindings).filter(([file,sha])=>digest(fs.readFileSync(file))!==sha).map(([file,sha])=>({file,previousSha256:sha,currentSha256:digest(fs.readFileSync(file))}));
 report.acceptedConcurrentData=report.currentWorkspaceDrift.map(change=>{
  if(change.file==='src/core/formal211to220Data.ts')return {...inspectDisjoint211to220Data(change.file,fs.readFileSync(resolve(snapshotRoot,change.file),'utf8')),reason:'Only unrelated pure literal 211–220 registry additions; temporary catalog still excludes this range.'};
  throw Error('Unexpected runtime/art/rules/harness drift: '+change.file);
 });
 const finalRules=verifyRulesLock();assert(finalRules.ok,finalRules.errors.join('\n'));
 report.status='PASS';report.verified=true;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'temporary-level-selector-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,output,error:report.error}));
