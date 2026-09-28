import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/mechanism-guide-catalogue-2026-09-22/memory/", import.meta.url));
const reportPath = resolve(output, "memory-lifecycle-report.json");
const screenshotPath = resolve(output, "01-post-churn-lv93-720x1584.png");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const MAX_RETAINED_HEAP_GROWTH_BYTES = 1024 * 1024;
const MAX_RETAINED_NODE_GROWTH = 5;
const MAX_RETAINED_LISTENER_GROWTH = 0;
const NAVIGATION_STRESS_CYCLES = 4;
const LEVEL_STRESS_PASSES = 4;
const DRAG_FRAMES = 120;
const FORMAL_BLOCK_PREFIX = "assets/art/gameplay/blocks/formal-v1/";
const FORMAL_PAGE_PREFIX = "assets/art/ui/formal-pages/";
const WIN_ART_PREFIX = `${FORMAL_PAGE_PREFIX}overlays/win/`;
const FORMAL_PAGE_DIRECTORY = {
  supply: "shop",
  leaderboard: "leaderboard",
  levels: "journey",
  records: "mechanism-guide-v2",
};
const FORMAL_PAGE_CONTENT_PREFIXES = Object.values(FORMAL_PAGE_DIRECTORY)
  .map((directory) => `${FORMAL_PAGE_PREFIX}${directory}/`);
const FORMAL_SINGLE_PATHS = new Set([
  "red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan",
].map((color) => `${FORMAL_BLOCK_PREFIX}${color}-single.png`));

const save = {
  schemaVersion: 1,
  currentLevel: 93,
  highestLevel: 100,
  coins: 5000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  // Lv5 is the first level that uses the full settlement modal.
  rewardedLevels: [5],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-precise-memory-info"],
});
const context = await browser.newContext({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.addInitScript(() => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!descriptor?.get || !descriptor.set) throw new Error("Memory lifecycle: HTMLImageElement.src is not instrumentable");
  const imageIds = new WeakMap();
  const tracker = {
    imageId: (image) => imageIds.get(image),
    nextId: 1,
    active: {},
    events: [],
    loadCount: 0,
    releaseCount: 0,
    peakBufferedEvents: 0,
  };
  window.__MEMORY_IMAGE_LIFECYCLE__ = tracker;
  const record = (event) => {
    tracker.events.push(event);
    if (event.type === "load") tracker.loadCount += 1;
    else tracker.releaseCount += 1;
    tracker.peakBufferedEvents = Math.max(tracker.peakBufferedEvents, tracker.events.length);
  };
  const normalize = (value) => {
    if (!value) return "";
    try { return new URL(String(value), window.location.href).pathname.replace(/^\/+/, ""); }
    catch { return String(value); }
  };
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) {
      let id = imageIds.get(this);
      if (!id) {
        id = tracker.nextId;
        tracker.nextId += 1;
        imageIds.set(this, id);
      }
      const previous = tracker.active[id];
      const source = normalize(value);
      if (previous && previous !== source) record({ type: "release", id, src: previous });
      if (source) {
        tracker.active[id] = source;
        record({ type: "load", id, src: source });
      } else delete tracker.active[id];
      descriptor.set.call(this, value);
    },
  });
});
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const residentImageLoads = (await debug()).art.loadedImages;
const albumArtSources = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return [...Object.values(GAME_ART.ui.collectionAlbum), ...GAME_ART.ui.collectionCardAtlases.levels,
    ...GAME_ART.ui.collectionCardAtlases.masterpieces].sort();
});
const albumResourceCount = albumArtSources.length;
const albumAtlasSources = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return [...GAME_ART.ui.collectionCardAtlases.levels, ...GAME_ART.ui.collectionCardAtlases.masterpieces];
});
const albumChromeSources = albumArtSources.filter(src => !albumAtlasSources.includes(src));
const expectedAlbumSources = art => [
  ...albumChromeSources, ...art.loadedAtlasIndexes.map(index => albumAtlasSources[index]),
].sort();
const albumArtComplete = art => art.ready && art.artworkReady
  && art.currentAtlasIndexes.every(index => art.loadedAtlasIndexes.includes(index))
  && art.loadedImages === albumChromeSources.length + art.loadedAtlasIndexes.length
  && art.loadedImages <= albumResourceCount;
const readImageLifecycle = () => page.evaluate(() => {
  const tracker = window.__MEMORY_IMAGE_LIFECYCLE__;
  const game = window.__COLOR_ESCAPE__;
  const guide = game.formalPageArtFor("records");
  const events = tracker.events.splice(0, tracker.events.length);
  return {
    // Album and guide reuse the Daily close URL, but own separate images.
    albumIds: [...Object.values(game.collectionAlbumArt ?? {}), ...(game.collectionAlbumArtwork?.images ?? [])]
      .map((image) => tracker.imageId(image)),
    guideIds: guide ? game.formalPageImages(guide).map((image) => tracker.imageId(image)) : [],
    active: Object.entries(tracker.active).map(([id, src]) => ({ id: Number(id), src })),
    events,
    totalLoadCount: tracker.loadCount,
    totalReleaseCount: tracker.releaseCount,
    peakBufferedEvents: tracker.peakBufferedEvents,
  };
});
const formalBlockEntries = (lifecycle, singles) => lifecycle.active.filter(({ src }) => (
  src.startsWith(FORMAL_BLOCK_PREFIX) && FORMAL_SINGLE_PATHS.has(src) === singles
));
const metaPageEntries = (lifecycle) => lifecycle.active.filter(({ id, src }) => (
  !lifecycle.albumIds.includes(id) && FORMAL_PAGE_CONTENT_PREFIXES.some((prefix) => src.startsWith(prefix))
));
const albumEntries = (lifecycle) => lifecycle.active.filter(({ id, src }) => (
  !lifecycle.guideIds.includes(id) && albumArtSources.includes(src)
));
const winEntries = (lifecycle) => lifecycle.active.filter(({ src }) => src.startsWith(WIN_ART_PREFIX));
const initialLifecycle = await readImageLifecycle();
const permanentSingles = formalBlockEntries(initialLifecycle, true);
if (permanentSingles.length !== FORMAL_SINGLE_PATHS.size
  || new Set(permanentSingles.map(({ src }) => src)).size !== FORMAL_SINGLE_PATHS.size) {
  throw new Error(`Memory lifecycle: expected eight unique resident formal singles, received ${JSON.stringify(permanentSingles)}`);
}
const permanentSingleIds = new Map(permanentSingles.map(({ src, id }) => [src, id]));
const assertPermanentSingles = (lifecycle, label) => {
  const active = new Map(formalBlockEntries(lifecycle, true).map(({ src, id }) => [src, id]));
  for (const [src, id] of permanentSingleIds) {
    if (active.get(src) !== id) {
      throw new Error(`Memory lifecycle: permanent formal single ${src} was released/replaced during ${label}`);
    }
  }
};
const logicalPoint = async (x, y) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Memory lifecycle: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};

const clickTab = async (index) => {
  const before = await debug();
  const lifecycleBefore = await readImageLifecycle();
  const previousPageIds = new Set([
    ...metaPageEntries(lifecycleBefore), ...albumEntries(lifecycleBefore),
  ].map(({ id }) => id));
  const hit = before.interactionTargets?.targets?.[`navigation.${index}`]?.hit;
  if (!hit) throw new Error(`Memory lifecycle: navigation.${index} target is unavailable`);
  const point = await logicalPoint(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.click(point.x, point.y);
  const expectedScreen = ["supply", "leaderboard", "home", "levels", "records"][index];
  await page.waitForFunction((screen) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === screen && !state.navigation.transition;
  }, expectedScreen);
  if (["supply", "leaderboard", "levels"].includes(expectedScreen)) {
    await page.waitForFunction((screen) => window.__COLOR_ESCAPE__?.getDebugState().art.formalPage.loaded === screen, expectedScreen);
  } else if (expectedScreen === "records") {
    await page.waitForFunction(() => {
      const album = window.__COLOR_ESCAPE__?.getDebugState().collectionAlbum;
      return album?.open && !album.guideOpen && album.art.ready && album.art.artworkReady
        && !album.art.requested && !album.art.error && !album.art.artworkError
        && album.art.currentAtlasIndexes.every(index => album.art.loadedAtlasIndexes.includes(index));
    });
  } else {
    const after = await debug();
    if (after.art.formalPage.loaded) {
      throw new Error(`Memory lifecycle: ${after.art.formalPage.loaded} remained active on ${expectedScreen}`);
    }
  }
  const [after, lifecycleAfter] = await Promise.all([debug(), readImageLifecycle()]);
  assertPermanentSingles(lifecycleAfter, `navigation to ${expectedScreen}`);
  const activePageEntries = metaPageEntries(lifecycleAfter);
  const activeAlbumEntries = albumEntries(lifecycleAfter);
  if (expectedScreen !== "records" && (activeAlbumEntries.length || after.collectionAlbum.art.loadedImages
    || after.collectionAlbum.art.requested || after.collectionAlbum.open)) {
    throw new Error(`Memory lifecycle: Collection album remained resident on ${expectedScreen}`);
  }
  if (expectedScreen === "records") {
    if (!albumArtComplete(after.collectionAlbum.art) || activeAlbumEntries.length !== after.collectionAlbum.art.loadedImages
      || after.collectionAlbum.art.loadedAtlasIndexes.length >= albumAtlasSources.length
      || JSON.stringify(activeAlbumEntries.map(({ src }) => src).sort()) !== JSON.stringify(expectedAlbumSources(after.collectionAlbum.art))
      || activePageEntries.length || after.art.formalPage.loaded || after.art.formalPage.retained.length) {
      throw new Error(`Memory lifecycle: Collection album residency is incomplete or shares another page group (${JSON.stringify({
        activeAlbumEntries, activePageEntries, album: after.collectionAlbum.art, formal: after.art.formalPage,
      })})`);
    }
  } else if (expectedScreen === "home") {
    if (activePageEntries.length || after.art.formalPage.retained.length) {
      throw new Error(`Memory lifecycle: formal page art remained resident on Home (${JSON.stringify({
        active: activePageEntries,
        retained: after.art.formalPage.retained,
      })})`);
    }
  } else {
    const directory = FORMAL_PAGE_DIRECTORY[expectedScreen];
    const expectedPrefix = `${FORMAL_PAGE_PREFIX}${directory}/`;
    if (activePageEntries.length !== after.art.formalPage.loadedImages
      || activePageEntries.some(({ src }) => !src.startsWith(expectedPrefix))
      || after.art.formalPage.retained.length) {
      throw new Error(`Memory lifecycle: formal page residency is not exclusive on ${expectedScreen} (${JSON.stringify({
        active: activePageEntries,
        debug: after.art.formalPage,
      })})`);
    }
  }
  const activeIds = new Set(lifecycleAfter.active.map(({ id }) => id));
  const staleIds = [...previousPageIds].filter((id) => activeIds.has(id));
  if (previousPageIds.size && expectedScreen !== before.screen && staleIds.length) {
    throw new Error(`Memory lifecycle: previous ${before.screen} formal-page images remained after ${expectedScreen}: ${staleIds.join(",")}`);
  }
};
const clickInteractionTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  if (!hit) throw new Error(`Memory lifecycle: ${name} target is unavailable`);
  const point = await logicalPoint(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.click(point.x, point.y);
};
const guideArtSources = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  const { itemImages, retiredItemImages, background, topHeader, titlePanel, ...chrome } = GAME_ART.ui.formalPages.collection;
  return [...Object.values(chrome), ...itemImages].sort();
});
const guideLifecycleAudits = [];
const runGuideLifecycle = async () => {
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length === 0);
  const before = await debug();
  const lifecycleBefore = await readImageLifecycle();
  const beforeIds = new Set(lifecycleBefore.active.map(({ id }) => id));
  const albumIdsBefore = albumEntries(lifecycleBefore).map(({ id }) => id).sort((a, b) => a - b);
  await clickInteractionTarget("collectionAlbumGuide");
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "mechanismGuide" && state.collectionAlbum.guideOpen
      && state.art.formalPage.loaded === "records" && !state.art.formalPage.requested
      && !state.art.formalPage.error;
  });
  let [state, lifecycle] = await Promise.all([debug(), readImageLifecycle()]);
  assertPermanentSingles(lifecycle, "mechanism guide open");
  const guideImages = lifecycle.active.filter(({ id }) => !beforeIds.has(id));
  const albumIdsOpen = albumEntries(lifecycle).map(({ id }) => id).sort((a, b) => a - b);
  if (guideImages.length !== guideArtSources.length || state.art.formalPage.loadedImages !== guideArtSources.length
    || JSON.stringify(guideImages.map(({ src }) => src).sort()) !== JSON.stringify(guideArtSources)
    || JSON.stringify(albumIdsOpen) !== JSON.stringify(albumIdsBefore)
    || !albumArtComplete(state.collectionAlbum.art)
    || state.collectionAlbum.art.loadedImages !== before.collectionAlbum.art.loadedImages) {
    throw new Error(`Memory lifecycle: guide did not add exactly its own ${guideArtSources.length} images over the same ${before.collectionAlbum.art.loadedImages}-image album (${JSON.stringify({
      guideImages, formal: state.art.formalPage, albumIdsBefore, albumIdsOpen,
    })})`);
  }
  await clickInteractionTarget("mechanismGuideClose");
  await page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current?.screen === "records" && !current.collectionAlbum.guideOpen
      && !current.art.formalPage.loaded && !current.art.formalPage.requested;
  });
  [state, lifecycle] = await Promise.all([debug(), readImageLifecycle()]);
  assertPermanentSingles(lifecycle, "mechanism guide close");
  const activeIds = new Set(lifecycle.active.map(({ id }) => id));
  const releasedIds = new Set(lifecycle.events.filter(({ type }) => type === "release").map(({ id }) => id));
  const stale = guideImages.filter(({ id }) => activeIds.has(id) || !releasedIds.has(id));
  const albumIdsAfter = albumEntries(lifecycle).map(({ id }) => id).sort((a, b) => a - b);
  if (stale.length || state.art.formalPage.loadedImages !== 0 || state.art.formalPage.retained.length
    || JSON.stringify(albumIdsAfter) !== JSON.stringify(albumIdsBefore)
    || !albumArtComplete(state.collectionAlbum.art)
    || state.collectionAlbum.art.loadedImages !== before.collectionAlbum.art.loadedImages
    || state.collectionAlbum.tab !== before.collectionAlbum.tab
    || state.collectionAlbum.pageIndex !== before.collectionAlbum.pageIndex) {
    throw new Error(`Memory lifecycle: guide close retained resources or changed the underlying album (${JSON.stringify({
      stale, formal: state.art.formalPage, albumIdsBefore, albumIdsAfter,
    })})`);
  }
  guideLifecycleAudits.push({ loadedImages: guideImages.length, releasedImages: guideImages.length, retainedAlbumImages: albumIdsAfter.length });
};
const navigateCycle = async () => {
  await clickTab(0);
  await clickTab(1);
  await clickTab(2);
  await clickTab(3);
  await clickTab(4);
  await runGuideLifecycle();
  await clickTab(2);
};
const formalBlockAudit = {
  switches: 0,
  changedGroups: 0,
  reusedGroups: 0,
  releasedPreviousImages: 0,
  maxStableDynamicImages: 0,
  maxTransitionalDynamicImages: 0,
  passFinalDynamicImages: [],
};
const switchLevelAndAudit = async (levelId, play, label) => {
  const [before, lifecycleBefore] = await Promise.all([debug(), readImageLifecycle()]);
  const beforeDynamic = formalBlockEntries(lifecycleBefore, false);
  await page.evaluate(({ id, enterGameplay }) => new Promise((resolveFrame) => {
    window.__COLOR_ESCAPE__.loadLevel(id, enterGameplay);
    requestAnimationFrame(() => resolveFrame());
  }), { id: levelId, enterGameplay: play });
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.level.id === id
      && !state.art.formalGameplay.requestedBlockSignature
      && !state.art.formalGameplay.blockError;
  }, levelId);
  const [after, lifecycleAfter] = await Promise.all([
    debug(),
    readImageLifecycle(),
  ]);
  assertPermanentSingles(lifecycleAfter, label);
  const afterDynamic = formalBlockEntries(lifecycleAfter, false);
  if (afterDynamic.length !== after.art.formalGameplay.dynamicImages
    || new Set(afterDynamic.map(({ src }) => src)).size !== afterDynamic.length) {
    throw new Error(`Memory lifecycle: formal block residency disagrees with runtime after ${label} (${JSON.stringify({
      active: afterDynamic,
      debug: after.art.formalGameplay,
    })})`);
  }

  const changed = before.art.formalGameplay.blockSignature !== after.art.formalGameplay.blockSignature;
  const activeIds = new Set(lifecycleAfter.active.map(({ id }) => id));
  const releasedIds = new Set(lifecycleAfter.events
    .filter(({ type, src }) => type === "release" && src.startsWith(FORMAL_BLOCK_PREFIX) && !FORMAL_SINGLE_PATHS.has(src))
    .map(({ id }) => id));
  if (changed) {
    const stale = beforeDynamic.filter(({ id }) => activeIds.has(id) || !releasedIds.has(id));
    if (stale.length) {
      throw new Error(`Memory lifecycle: previous whole-block group was not released after ${label}: ${JSON.stringify(stale)}`);
    }
    formalBlockAudit.changedGroups += 1;
    formalBlockAudit.releasedPreviousImages += beforeDynamic.length;
  } else {
    const beforeIds = beforeDynamic.map(({ id }) => id).sort((a, b) => a - b);
    const afterIds = afterDynamic.map(({ id }) => id).sort((a, b) => a - b);
    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
      throw new Error(`Memory lifecycle: unchanged formal block signature replaced its resident group during ${label}`);
    }
    formalBlockAudit.reusedGroups += 1;
  }

  const transitionActive = new Set(beforeDynamic.map(({ id }) => id));
  let transitionPeak = transitionActive.size;
  for (const event of lifecycleAfter.events) {
    if (!event.src.startsWith(FORMAL_BLOCK_PREFIX) || FORMAL_SINGLE_PATHS.has(event.src)) continue;
    if (event.type === "release") transitionActive.delete(event.id);
    else transitionActive.add(event.id);
    transitionPeak = Math.max(transitionPeak, transitionActive.size);
  }
  formalBlockAudit.switches += 1;
  formalBlockAudit.maxStableDynamicImages = Math.max(formalBlockAudit.maxStableDynamicImages, afterDynamic.length);
  formalBlockAudit.maxTransitionalDynamicImages = Math.max(formalBlockAudit.maxTransitionalDynamicImages, transitionPeak);
  return { state: after, lifecycle: lifecycleAfter, dynamicImages: afterDynamic.length };
};
const churnLevels = async (passes) => {
  for (let pass = 0; pass < passes; pass += 1) {
    for (let levelId = 1; levelId <= 100; levelId += 1) {
      await switchLevelAndAudit(levelId, false, `level pass ${pass + 1}, Lv${levelId}`);
    }
    const passState = await debug();
    formalBlockAudit.passFinalDynamicImages.push(passState.art.formalGameplay.dynamicImages);
  }
};
const settleHomeAtLevel93 = () => switchLevelAndAudit(93, false, "settle Home at Lv93");

const winRoute = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(5));
});
if (!winRoute.solved || !winRoute.drags.length) {
  throw new Error("Memory lifecycle: Lv5 has no verified route for the settlement-art lifecycle");
}

const winLifecycleAudits = [];
const runWinLifecycle = async () => {
  await switchLevelAndAudit(5, true, "settlement Lv5");
  for (const drag of winRoute.drags) {
    const state = await debug();
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Memory lifecycle: missing Lv5 route block ${drag.blockId}`);
    const [anchorX, anchorY] = block.shape[0];
    const start = await logicalPoint(
      state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
      state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = await logicalPoint(
        state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
        state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
      );
      await page.mouse.move(target.x, target.y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(drag.exitSide ? 90 : 20);
  }
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "win" && state.art.win.ready;
  }, undefined, { timeout: 8_000 });
  let [state, lifecycle] = await Promise.all([debug(), readImageLifecycle()]);
  assertPermanentSingles(lifecycle, "settlement modal load");
  const activeWin = winEntries(lifecycle);
  if (!activeWin.length
    || state.art.win.loadedImages !== activeWin.length
    || new Set(activeWin.map(({ src }) => src)).size !== activeWin.length
    || !state.interactionTargets.targets.modalPrimary
    || !state.interactionTargets.targets.modalSecondary) {
    throw new Error(`Memory lifecycle: settlement art/controls are incomplete (${JSON.stringify({
      debug: state.art.win,
      active: activeWin,
    })})`);
  }
  const activeWinIds = new Set(activeWin.map(({ id }) => id));
  await clickInteractionTarget("modalSecondary");
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "home" && !state.art.win.ready && !state.art.win.loading;
  });
  [state, lifecycle] = await Promise.all([debug(), readImageLifecycle()]);
  assertPermanentSingles(lifecycle, "settlement modal release");
  const releasedWinIds = new Set(lifecycle.events
    .filter(({ type, src }) => type === "release" && src.startsWith(WIN_ART_PREFIX))
    .map(({ id }) => id));
  const activeIds = new Set(lifecycle.active.map(({ id }) => id));
  const staleWinIds = [...activeWinIds].filter((id) => activeIds.has(id) || !releasedWinIds.has(id));
  if (state.art.win.loadedImages !== 0 || winEntries(lifecycle).length || staleWinIds.length) {
    throw new Error(`Memory lifecycle: settlement art remained resident after close (${JSON.stringify({
      debug: state.art.win,
      staleWinIds,
    })})`);
  }
  winLifecycleAudits.push({ loadedImages: activeWin.length, releasedImages: releasedWinIds.size });
};

const readMemory = async (label, collectGarbage) => {
  if (collectGarbage) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(60);
  }
  const [{ metrics }, dom, browserHeap] = await Promise.all([
    cdp.send("Performance.getMetrics"),
    cdp.send("Memory.getDOMCounters"),
    page.evaluate(() => {
      const memory = performance.memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      } : undefined;
    }),
  ]);
  const metric = (name) => metrics.find((candidate) => candidate.name === name)?.value;
  return {
    label,
    jsHeapUsedBytes: metric("JSHeapUsedSize"),
    jsHeapTotalBytes: metric("JSHeapTotalSize"),
    documents: dom.documents,
    nodes: dom.nodes,
    jsEventListeners: dom.jsEventListeners,
    browserHeap,
  };
};

const readStableMemory = async (label) => {
  const samples = [];
  for (let index = 0; index < 3; index += 1) samples.push(await readMemory(`${label}-${index + 1}`, true));
  return samples.reduce((smallest, candidate) => (
    candidate.jsHeapUsedBytes < smallest.jsHeapUsedBytes ? candidate : smallest
  ));
};

const runDragStress = async () => {
  await switchLevelAndAudit(93, true, "drag stress Lv93");
  await page.waitForTimeout(120);
  const fixture = await page.evaluate(async () => {
    const [{ getLevel }, { PuzzleModel }, { createContinuousCollisionValidator }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/PuzzleModel.ts"),
      import("/src/game/continuousDrag.ts"),
    ]);
    const model = new PuzzleModel(getLevel(93));
    const snapshot = model.snapshot();
    for (const block of snapshot.blocks) {
      if (!model.isBlockActive(block)) continue;
      const valid = createContinuousCollisionValidator(snapshot, block.id);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (model.canPlace(block, block.x + dx, block.y + dy) && valid(block.x + dx * 0.82, block.y + dy * 0.82)) {
          return { blockId: block.id, dx, dy };
        }
      }
    }
    throw new Error("Memory lifecycle: Lv93 has no legal drag fixture");
  });
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Memory lifecycle: block ${fixture.blockId} is unavailable`);
  const [anchorX, anchorY] = block.shape[0];
  const logicalStart = {
    x: state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
  };
  const start = {
    x: state.viewportTransform.offsetX + logicalStart.x * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY + logicalStart.y * state.viewportTransform.scale,
  };
  const excursion = {
    x: fixture.dx * state.board.cell * state.viewportTransform.scale * 0.82,
    y: fixture.dy * state.board.cell * state.viewportTransform.scale * 0.82,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.evaluate(({ startPoint, dragExcursion, frames }) => new Promise((resolveStress) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Memory lifecycle: canvas is missing");
    let frame = 0;
    const step = () => {
      const phase = frame % 60;
      const progress = phase <= 30 ? phase / 30 : (60 - phase) / 30;
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1,
        clientX: startPoint.x + dragExcursion.x * progress,
        clientY: startPoint.y + dragExcursion.y * progress,
      }));
      frame += 1;
      if (frame < frames) requestAnimationFrame(step);
      else resolveStress();
    };
    requestAnimationFrame(step);
  }), { startPoint: start, dragExcursion: excursion, frames: DRAG_FRAMES });
  await page.mouse.up();
  await page.waitForTimeout(140);
  const dragState = await debug();
  return { ...fixture, committedMoves: dragState.puzzle.moves };
};

// Warm all code paths before the baseline so module compilation and first-use
// caches are not mistaken for a retained lifecycle leak.
await navigateCycle();
await runWinLifecycle();
await churnLevels(1);
await runDragStress();
await settleHomeAtLevel93();
const baseline = await readStableMemory("baseline");
const baselineImageLifecycle = await readImageLifecycle();

for (let cycle = 0; cycle < NAVIGATION_STRESS_CYCLES; cycle += 1) {
  await navigateCycle();
  await runWinLifecycle();
}
await churnLevels(LEVEL_STRESS_PASSES);
const dragFixture = await runDragStress();
await page.screenshot({ path: screenshotPath });
await settleHomeAtLevel93();
const beforeCollection = await readMemory("after-stress-before-gc", false);
const afterCollection = await readStableMemory("after-stress-after-gc");
const finalState = await debug();
const finalImageLifecycle = await readImageLifecycle();

const canvas = await page.locator("canvas").evaluate((element) => ({
  pixelWidth: element.width,
  pixelHeight: element.height,
  cssWidth: element.getBoundingClientRect().width,
  cssHeight: element.getBoundingClientRect().height,
}));
const retainedHeapGrowthBytes = Math.max(0, afterCollection.jsHeapUsedBytes - baseline.jsHeapUsedBytes);
const retainedNodeGrowth = Math.max(0, afterCollection.nodes - baseline.nodes);
const retainedListenerGrowth = Math.max(0, afterCollection.jsEventListeners - baseline.jsEventListeners);
const activeSourceKey = (lifecycle) => lifecycle.active.map(({ src }) => src).sort().join("\n");
const finalDynamicImages = formalBlockEntries(finalImageLifecycle, false);
const finalPageImages = metaPageEntries(finalImageLifecycle);
const finalAlbumImages = albumEntries(finalImageLifecycle);
const finalWinImages = winEntries(finalImageLifecycle);
const stablePassImageCounts = new Set(formalBlockAudit.passFinalDynamicImages);
const report = {
  environment: {
    viewportCss: { width: 360, height: 792 },
    deviceScaleFactor: 2,
    canvas,
    preciseMemoryInfo: true,
  },
  workload: {
    warmupNavigationCycles: 1,
    warmupLevelPasses: 1,
    navigationStressCycles: NAVIGATION_STRESS_CYCLES,
    navigationTransitions: NAVIGATION_STRESS_CYCLES * 6,
    settlementArtStressCycles: NAVIGATION_STRESS_CYCLES,
    settlementArtLifecycle: winLifecycleAudits,
    mechanismGuideLifecycle: guideLifecycleAudits,
    levelStressPasses: LEVEL_STRESS_PASSES,
    levelLoads: LEVEL_STRESS_PASSES * 100,
    dragFrames: DRAG_FRAMES,
    dragFixture,
    dragCommittedMoves: dragFixture.committedMoves,
    runtimeCumulativeImageLoads: finalState.art.loadedImages,
    trackedCumulativeImageLoads: finalImageLifecycle.totalLoadCount,
    trackedCumulativeImageReleases: finalImageLifecycle.totalReleaseCount,
    trackedPeakBufferedEvents: finalImageLifecycle.peakBufferedEvents,
    residentImageLoads,
    residentTrackedImageLoads: initialLifecycle.totalLoadCount,
    baselineActiveImages: baselineImageLifecycle.active.length,
    finalActiveImages: finalImageLifecycle.active.length,
    activeFormalSingles: formalBlockEntries(finalImageLifecycle, true).length,
    activeFormalDynamicImages: finalDynamicImages.length,
    formalBlockLifecycle: formalBlockAudit,
    activeFormalPage: finalState.art.formalPage.loaded ?? null,
    activeAlbumImages: finalAlbumImages.length,
    activeSettlementArt: finalState.art.win.ready,
  },
  memory: {
    baseline,
    beforeCollection,
    afterCollection,
    retainedHeapGrowthBytes,
    retainedNodeGrowth,
    retainedListenerGrowth,
  },
  budgets: {
    maxRetainedHeapGrowthBytes: MAX_RETAINED_HEAP_GROWTH_BYTES,
    maxRetainedNodeGrowth: MAX_RETAINED_NODE_GROWTH,
    maxRetainedListenerGrowth: MAX_RETAINED_LISTENER_GROWTH,
    maxDocumentGrowth: 0,
  },
  browserErrors: errors,
  note: "Chromium lifecycle leak preflight. Image counts are derived from instrumented runtime src assignments and the active formal-v1 source set, not a fixed historical asset count. Image decode and DPR2 canvas budgets are enforced separately by art:verify; WeChat physical-device peak memory remains a manual gate.",
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

await context.close();
await browser.close();

if (errors.length) throw new Error(`Memory lifecycle browser errors:\n${errors.join("\n")}`);
if (canvas.pixelWidth !== 720 || canvas.pixelHeight !== 1584) {
  throw new Error(`Memory lifecycle: expected 720x1584 canvas, received ${canvas.pixelWidth}x${canvas.pixelHeight}`);
}
if (residentImageLoads !== initialLifecycle.totalLoadCount) {
  throw new Error(`Memory lifecycle: initial runtime/tracker image loads disagree (${residentImageLoads}/${initialLifecycle.totalLoadCount})`);
}
if (finalState.art.loadedImages !== finalImageLifecycle.totalLoadCount) {
  throw new Error(`Memory lifecycle: runtime/tracker cumulative image loads disagree (${finalState.art.loadedImages}/${finalImageLifecycle.totalLoadCount})`);
}
assertPermanentSingles(finalImageLifecycle, "final state");
if (activeSourceKey(finalImageLifecycle) !== activeSourceKey(baselineImageLifecycle)) {
  throw new Error("Memory lifecycle: final active image source set differs from the same settled Lv93 baseline");
}
if (!formalBlockAudit.maxStableDynamicImages || stablePassImageCounts.size !== 1) {
  throw new Error(`Memory lifecycle: formal block groups did not settle to a repeatable size (${JSON.stringify(formalBlockAudit.passFinalDynamicImages)})`);
}
if (formalBlockAudit.maxTransitionalDynamicImages > formalBlockAudit.maxStableDynamicImages * 2) {
  throw new Error(`Memory lifecycle: formal block transition residency grew beyond old+new groups (${formalBlockAudit.maxTransitionalDynamicImages}/${formalBlockAudit.maxStableDynamicImages})`);
}
if (finalDynamicImages.length !== finalState.art.formalGameplay.dynamicImages) {
  throw new Error(`Memory lifecycle: final formal block residency disagrees with runtime (${finalDynamicImages.length}/${finalState.art.formalGameplay.dynamicImages})`);
}
if (finalState.art.formalPage.loaded || finalPageImages.length) {
  throw new Error(`Memory lifecycle: ${finalState.art.formalPage.loaded} formal page remained resident on Home`);
}
if (finalState.collectionAlbum.open || finalState.collectionAlbum.art.loadedImages
  || finalState.collectionAlbum.art.requested || finalAlbumImages.length) {
  throw new Error("Memory lifecycle: Collection album remained resident on Home");
}
if (finalState.art.win.ready || finalState.art.win.loading || finalState.art.win.loadedImages !== 0 || finalWinImages.length) {
  throw new Error(`Memory lifecycle: settlement art remained resident on Home (${JSON.stringify(finalState.art.win)})`);
}
if (dragFixture.committedMoves !== 1) throw new Error(`Memory lifecycle: drag workload committed ${dragFixture.committedMoves} moves`);
if (retainedHeapGrowthBytes > MAX_RETAINED_HEAP_GROWTH_BYTES) {
  throw new Error(`Memory lifecycle: retained heap grew by ${retainedHeapGrowthBytes} bytes`);
}
if (retainedNodeGrowth > MAX_RETAINED_NODE_GROWTH) {
  throw new Error(`Memory lifecycle: retained DOM nodes grew by ${retainedNodeGrowth}`);
}
if (retainedListenerGrowth > MAX_RETAINED_LISTENER_GROWTH) {
  throw new Error(`Memory lifecycle: retained event listeners grew by ${retainedListenerGrowth}`);
}
if (afterCollection.documents > baseline.documents) {
  throw new Error(`Memory lifecycle: documents grew from ${baseline.documents} to ${afterCollection.documents}`);
}
console.log(`Memory lifecycle passed: 24 tab transitions, 400 level loads, 120 drag frames; ${formalBlockAudit.changedGroups} formal block groups replaced with ${formalBlockAudit.releasedPreviousImages} prior images released; retained heap +${retainedHeapGrowthBytes} bytes, DOM/listeners +${retainedNodeGrowth}/+${retainedListenerGrowth}.`);
