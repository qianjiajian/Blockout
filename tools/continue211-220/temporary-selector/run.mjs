import { mkdir, writeFile } from "node:fs/promises";
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import {createServer} from "vite";
import {verifyRulesLock} from "../../verify-rules-lock.mjs";
import {digest} from "../../revised-preview-validation-v160.mjs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rules=verifyRulesLock();assert(rules.ok,rules.errors.join('\n'));
const output=resolve('playtest-results/temporary-level-selector/211-220-20260930',String(Date.now())+'-'+process.pid);
const bindings={};
const bind=file=>{const name=file.replaceAll('\\','/');bindings[name]=digest(fs.readFileSync(file));};
const tree=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())tree(file);else bind(file);}};
tree('src');tree('public');
for(const file of ['index.html','package.json','docs/rules/manifest.json','docs/rules/mechanism-rules-v'+rules.activeVersion+'.md','tools/continue211-220/temporary-selector/run.mjs','tools/verify-rules-lock.mjs','tools/revised-preview-validation-v160.mjs'])bind(file);
// Bind the already accepted records separately from the browser catalog.
for(const file of new Set(fs.readFileSync('src/core/formal211to220Data.ts','utf8').match(/deliverables\/continue211-220-20260930\/formal-adoption[^"\s]+\.json/g)??[]))bind(file);
const snapshotRoot=resolve(output,'source-snapshot');
for(const [file,sha]of Object.entries(bindings)){const bytes=fs.readFileSync(file);assert.equal(digest(bytes),sha,'Snapshot race '+file);const target=resolve(snapshotRoot,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const playtestUrl='http://127.0.0.1:'+server.httpServer.address().port+'/';
const SAVE_KEY = "color-escape-save-v1";
const ORIGINAL_LEVEL = 2;
const TEST_LEVEL = 114;
const NEXT_PAGE_CLICKS = 5;
const FORMAL_TEST_LEVELS = [...Array.from({length:10},(_,i)=>211+i),221,230];
const EXPECTED_CATALOG_COUNT = 230;
const EXPECTED_PAGE_COUNT = 12;
const EXPECTED_STARS_211_220 = [32,50,38,51,37,39,41,35,40,59];
const EXPECTED_TIME_STARS_211_220 = [79,68,108,75,86,86,64,72,72,86];
const EXPECTED_TOTAL_SECONDS_211_220 = [110,95,150,105,120,120,90,100,100,120];

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
    const pageIds = pageIndex => Array.from({length:pageIndex===10?20:10},(_,i)=>(pageIndex===10?201:221)+i);
    const verifyFormalIdentity = async id => page.evaluate(async id=>{
      const {LEVELS,getLevelStrict}=await import('/src/core/levels.ts');
      const a=await import('/src/core/formal201to210Data.ts');
      const b=await import('/src/core/formal211to220Data.ts');
      const c=await import('/src/core/formal221to230Data.ts');
      const catalog=await import('/src/game/temporaryTestLevelCatalog.ts');
      const {levelStarTargets}=await import('/src/core/levelStarConditions.ts');
      const level=window.__COLOR_ESCAPE__.model.level,debug=window.__COLOR_ESCAPE__.getDebugState();
      const formal=id<=210?a.getFormal201to210LevelStrict(id):id<=220?b.getFormal211to220LevelStrict(id):c.getFormal221to230LevelStrict(id);
      const evidence=id>=211&&id<=220?b.FORMAL_211_220_EVIDENCE.find(e=>e.id===id):null;
      let productionTargetExcluded=false;try{getLevelStrict(id);}catch(error){productionTargetExcluded=error instanceof RangeError;}
      return {formalObjectIdentity:level===formal,catalogObjectIdentity:level===catalog.getTemporaryTestLevelStrict(id),
        productionBoundary:LEVELS.length,temporaryLevelCount:catalog.TEMPORARY_TEST_LEVEL_COUNT,
        catalogIds:[...catalog.TEMPORARY_TEST_LEVEL_IDS],productionTargetExcluded,
        evidence:evidence?structuredClone(evidence):null,starTargets:levelStarTargets(formal),
        displayedStarTargets:structuredClone(debug.starTargets),activeLevel:structuredClone(level)};
    },id);
    const expectFormalIdentity = (id,identity) => {
      if(!identity.formalObjectIdentity||!identity.catalogObjectIdentity||identity.productionBoundary!==200
        ||identity.temporaryLevelCount!==EXPECTED_CATALOG_COUNT||!identity.productionTargetExcluded
        ||JSON.stringify(identity.catalogIds)!==JSON.stringify(Array.from({length:230},(_,i)=>i+1)))fail(label,'Formal reference/catalog/production boundary mismatch',{id,identity});
      if(JSON.stringify(identity.starTargets)!==JSON.stringify(identity.displayedStarTargets))fail(label,'Displayed scoring targets differ from the actual formal level',{id,identity});
      if(id>=211&&id<=220){
        const i=id-211,expected={moveTarget:EXPECTED_STARS_211_220[i],timeTargetSeconds:EXPECTED_TIME_STARS_211_220[i]};
        if(!identity.evidence||identity.evidence.id!==id||identity.evidence.levelSha256!==digest(identity.activeLevel)
          ||identity.evidence.starMoves!==expected.moveTarget||JSON.stringify(identity.starTargets)!==JSON.stringify(expected)
          ||identity.activeLevel.timeSeconds!==EXPECTED_TOTAL_SECONDS_211_220[i])fail(label,'Final accepted SHA or scoring contract differs',{id,identity,expected});
        const accepted=JSON.parse(fs.readFileSync(identity.evidence.evidence,'utf8'));
        if(accepted.status!=='FORMAL_DATA_ACCEPTED'||accepted.levelSha256!==identity.evidence.levelSha256)fail(label,'Registry evidence is not final accepted same-object evidence',{id,evidence:identity.evidence,acceptedStatus:accepted.status});
        identity.acceptedEvidence={file:identity.evidence.evidence,rawSha256:digest(fs.readFileSync(identity.evidence.evidence)),status:accepted.status,levelSha256:accepted.levelSha256};
      }
    };
    const assertSelectorPage = (state,pageIndex) => {
      const ids=Object.keys(state.interactionTargets.targets).filter(key=>key.startsWith('temporaryLevel.level.'))
        .map(key=>Number(key.slice('temporaryLevel.level.'.length))).sort((a,b)=>a-b);
      const hasNext=Boolean(state.interactionTargets.targets['temporaryLevel.next']);
      if(state.temporaryLevelTest.page!==pageIndex||JSON.stringify(ids)!==JSON.stringify(pageIds(pageIndex))
        ||hasNext!==(pageIndex===10))fail(label,'Selector page contents/navigation mismatch',{pageIndex,ids,hasNext,temporaryLevelTest:state.temporaryLevelTest});
      return ids;
    };
    for(const formalLevel of FORMAL_TEST_LEVELS){
      const formalPage=formalLevel<=220?10:11;
      await clickTarget('temporaryLevel.open');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen===true);
      let lastNextPoint;
      for(let pageNumber=1;pageNumber<=formalPage;pageNumber++){
        if(pageNumber===11){state=await debug();assertSelectorPage(state,10);lastNextPoint=await targetPoint('temporaryLevel.next');}
        await clickTarget('temporaryLevel.next');
        await waitForState(expected=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page===expected,pageNumber);
      }
      state=await debug();
      const formalLevelTargets=assertSelectorPage(state,formalPage);
      if(state.temporaryLevelTest.selectedLevel!==pageIds(formalPage)[0])fail(label,'Page navigation selected the wrong first level',state.temporaryLevelTest);
      let selectorEndBoundary;
      if(formalPage===11){
        // Use the real former NEXT button coordinates, now blank on page12.
        await page.mouse.click(lastNextPoint.x,lastNextPoint.y);
        await page.waitForTimeout(60);state=await debug();assertSelectorPage(state,11);
        if(state.screen!=='home'||!state.temporaryLevelTest.selectorOpen||state.temporaryLevelTest.active)fail(label,'Disabled last-page NEXT escaped the selector',state.temporaryLevelTest);
        selectorEndBoundary={pageNumber:12,nextTargetAbsent:true,realPointerAtFormerNext:true,pageUnchanged:true};
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
      const identity=await verifyFormalIdentity(formalLevel);expectFormalIdentity(formalLevel,identity);
      await expectStorage(baselineStorage,'active Lv'+formalLevel+' test');
      const playingScreenshot=resolve(output,'06-'+label+'-lv'+formalLevel+'-playing-'+width+'x'+height+'.png');
      await page.screenshot({path:playingScreenshot});
      await clickTarget('pause');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().screen==='paused');
      await clickTarget('pauseHome');
      await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed;},formalLevel);
      await expectStorage(baselineStorage,'Lv'+formalLevel+' pause-to-Home');
      const homeNavigation=[];
      const navigation=formalLevel===211?[[211,210,'homePrev'],[210,211,'homeNext']]
        :formalLevel===220?[[220,221,'homeNext'],[221,220,'homePrev']]
        :formalLevel===221?[[221,220,'homePrev'],[220,221,'homeNext'],[221,222,'homeNext'],[222,221,'homePrev']]:[];
      for(const [from,to,target]of navigation){
        await clickTarget(target);
        await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&d.temporaryLevelTest.active&&d.temporaryLevelTest.storageSuppressed;},to);
        const navIdentity=await verifyFormalIdentity(to);expectFormalIdentity(to,navIdentity);
        await expectStorage(baselineStorage,'temporary Home navigation '+from+' to '+to);
        homeNavigation.push({from,to,target,formalObjectIdentity:true,catalogObjectIdentity:true,storageBytesPreserved:true,realPointer:true,levelSha256:digest(navIdentity.activeLevel),starTargets:navIdentity.starTargets});
      }
      let endBoundaryNavigation;
      if(formalLevel===230){
        // Home debug targets retain geometry even for the disabled arrow.
        await clickTarget('homeNext');await page.waitForTimeout(80);
        const boundary=await debug();
        if(boundary.screen!=='home'||boundary.level.id!==230||!boundary.temporaryLevelTest.active||!boundary.temporaryLevelTest.storageSuppressed)fail(label,'Final temporary level advanced beyond230',boundary.temporaryLevelTest);
        const lastIdentity=await verifyFormalIdentity(230);expectFormalIdentity(230,lastIdentity);
        await expectStorage(baselineStorage,'disabled Home next at230');
        endBoundaryNavigation={from:230,to:230,formalObjectIdentity:true,storageBytesPreserved:true,realPointer:true};
      }
      await clickTarget('temporaryLevel.open');
      await waitForState(()=>window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen===true);
      state=await debug();assertSelectorPage(state,formalPage);
      if(state.temporaryLevelTest.selectedLevel!==formalLevel||!state.interactionTargets.targets['temporaryLevel.exit'])fail(label,'Active selector lost formal selection/exit',state.temporaryLevelTest);
      await clickTarget('temporaryLevel.exit');
      await waitForState(id=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.screen==='home'&&d.level.id===id&&!d.temporaryLevelTest.active&&!d.temporaryLevelTest.selectorOpen&&!d.temporaryLevelTest.storageSuppressed;},ORIGINAL_LEVEL);
      await expectStorage(baselineStorage,'Lv'+formalLevel+' EXIT TEST restoration');
      const restoredScreenshot=resolve(output,'07-'+label+'-lv'+formalLevel+'-restored-lv2-'+width+'x'+height+'.png');
      await page.screenshot({path:restoredScreenshot});
      formalSessions.push({id:formalLevel,status:'PASS',page:formalPage,pageNumber:formalPage+1,pageCount:EXPECTED_PAGE_COUNT,pageIds:formalLevelTargets,
        identity,scoreTargets:identity.starTargets,totalSeconds:identity.activeLevel.timeSeconds,acceptedLevelSha256:identity.evidence?.levelSha256??null,
        homeNavigation,selectorEndBoundary,endBoundaryNavigation,levelSha256:digest(identity.activeLevel),storageBytesPreserved:true,baselineStorageSha256:digest(baselineStorage),
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
      formalPageNumbers: [11,12],
      pageCount: EXPECTED_PAGE_COUNT,
      temporaryLevelCount: EXPECTED_CATALOG_COUNT,
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
        all211to220Started: formalSessions.filter(s=>s.id>=211&&s.id<=220).length===10,
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
  scope:'Real Canvas/Pointer selector navigation, all211–220 accepted formal identities and scoring, 221/230 page12 regression, contiguous210/211 and220/221 navigation,230 endpoint and byte-exact baseline save restoration. Retains114 interaction regression. Not a full gameplay route, settlement test or production campaign expansion.'};
try{
 await runViewport({label:'desktop',width:496,height:1078});
 await runViewport({label:'phone',width:320,height:568});
 assert.deepEqual(browserErrors,[]);
 report.snapshotDrift=Object.entries(bindings).filter(([file,sha])=>digest(fs.readFileSync(resolve(snapshotRoot,file)))!==sha);
 assert.deepEqual(report.snapshotDrift,[]);
 report.currentWorkspaceDrift=Object.entries(bindings).filter(([file,sha])=>digest(fs.readFileSync(file))!==sha).map(([file,sha])=>({file,previousSha256:sha,currentSha256:digest(fs.readFileSync(file))}));
 assert.deepEqual(report.currentWorkspaceDrift,[],'All tested formal data, runtime, art, rules and harness must remain unchanged.');
 const finalRules=verifyRulesLock();assert(finalRules.ok,finalRules.errors.join('\n'));
 report.status='PASS';report.verified=true;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'temporary-level-selector-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,output,error:report.error}));
