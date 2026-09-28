import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/language-settings/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const expectedLanguages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserErrors = [];
const report = {
  generatedAt: new Date().toISOString(),
  playtestUrl,
  cases: {},
  screenshots: [],
};

const attachErrors = (page, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`${label}: console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`${label}: pageerror: ${error.message}`));
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const persisted = (page) => page.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}, saveKey);

const waitForReady = async (page) => {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return Boolean(state?.art?.ready && state?.storage?.baselineReady);
  }, undefined, { timeout: 30_000 });
};

const waitForScreen = (page, screen) => page.waitForFunction(
  (expected) => window.__COLOR_ESCAPE__?.getDebugState().screen === expected,
  screen,
  { timeout: 10_000 },
);

const formalScreens = new Set(["supply", "leaderboard", "levels", "mechanismGuide"]);

const waitForSettledScreen = async (page, screen) => {
  await page.waitForFunction((expected) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === expected && !state.navigation?.transition;
  }, screen, { timeout: 15_000 });
  if (formalScreens.has(screen)) {
    await page.waitForFunction((expected) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === expected
        && !state.navigation?.transition
        && state.art?.formalPage?.loaded === (expected === "mechanismGuide" ? "records" : expected)
        && state.art.formalPage.loadedImages > 0
        && !state.art.formalPage.error;
    }, screen, { timeout: 15_000 });
  }
  if (screen === "records") {
    await page.waitForFunction(() => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "records" && !state.navigation?.transition
        && state.collectionAlbum?.art?.ready && state.collectionAlbum.art.artworkReady
        && !state.collectionAlbum.art.error && !state.collectionAlbum.art.artworkError;
    }, undefined, { timeout: 15_000 });
  }
};

const clickTarget = async (page, name) => {
  const state = await debug(page);
  const target = state.interactionTargets?.targets?.[name];
  const canvas = await page.locator("canvas").boundingBox();
  if (!target?.hit || !canvas) throw new Error(`Language settings E2E: missing ${name} target or canvas bounds`);
  const x = canvas.x + state.viewportTransform.offsetX
    + (target.hit.x + target.hit.width / 2) * state.viewportTransform.scale;
  const y = canvas.y + state.viewportTransform.offsetY
    + (target.hit.y + target.hit.height / 2) * state.viewportTransform.scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
};

const openSettings = async (page) => {
  await clickTarget(page, "homeSettings");
  await waitForScreen(page, "settings");
};

const openLanguagePicker = async (page) => {
  const state = await debug(page);
  if (state.screen !== "settings") throw new Error(`Language settings E2E: expected settings, got ${state.screen}`);
  await clickTarget(page, "settingsLanguage");
  await waitForScreen(page, "language");
};

const freshPage = async (label, locale, viewport) => {
  const context = await browser.newContext({ locale, viewport });
  const page = await context.newPage();
  attachErrors(page, label);
  await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
  await waitForReady(page);
  return { context, page };
};

const screenshot = async (page, filename) => {
  await page.screenshot({ path: resolve(output, filename) });
  report.screenshots.push(filename);
};

const assertScreenLanguageAndCanvas = async (page, expectedScreen, expectedLanguage) => {
  const state = await debug(page);
  const stored = await persisted(page);
  const canvas = await page.locator("canvas").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: element.width,
      height: element.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      ariaLabel: element.getAttribute("aria-label"),
    };
  });
  if (state.screen !== expectedScreen || state.settings?.language !== expectedLanguage
    || stored?.language !== expectedLanguage) {
    throw new Error(`Language settings E2E: ${expectedScreen} language drifted ${JSON.stringify({
      screen: state.screen,
      debugLanguage: state.settings?.language,
      storedLanguage: stored?.language,
    })}`);
  }
  if (!state.art?.ready || canvas.width <= 0 || canvas.height <= 0
    || canvas.cssWidth <= 0 || canvas.cssHeight <= 0 || !canvas.ariaLabel) {
    throw new Error(`Language settings E2E: ${expectedScreen} canvas is not healthy ${JSON.stringify({
      artReady: state.art?.ready,
      canvas,
    })}`);
  }
  return {
    screen: state.screen,
    debugLanguage: state.settings.language,
    storedLanguage: stored.language,
    formalPage: state.art.formalPage?.loaded,
    canvas,
  };
};

const visitNavigationScreen = async (page, target, screen, language, screenshotName) => {
  await clickTarget(page, target);
  await waitForSettledScreen(page, screen);
  const evidence = await assertScreenLanguageAndCanvas(page, screen, language);
  if (screenshotName) await screenshot(page, screenshotName);
  return evidence;
};

const assertLanguageMetadataAndTargets = (state, label) => {
  const supported = state.settings?.supportedLanguages?.map((entry) => entry.language);
  if (JSON.stringify(supported) !== JSON.stringify(expectedLanguages)) {
    throw new Error(`Language settings E2E: ${label} supported-language order drifted ${JSON.stringify(supported)}`);
  }
  const targets = Object.fromEntries(expectedLanguages.map((language) => {
    const target = state.interactionTargets?.targets?.[`language.${language}`];
    if (!target?.hit) throw new Error(`Language settings E2E: ${label} missing language.${language}`);
    return [language, target];
  }));
  return targets;
};

try {
  // Fresh installs follow the device locale, and a real settings interaction
  // must immediately persist a manual override across reload and progress reset.
  const standard = await freshPage("standard-ja", "ja-JP", { width: 496, height: 1078 });
  let state = await debug(standard.page);
  let stored = await persisted(standard.page);
  const navigatorLocale = await standard.page.evaluate(() => navigator.language);
  if (navigatorLocale !== "ja-JP" || state.settings.language !== "ja"
    || state.settings.deviceLanguage !== "ja" || stored?.language !== "ja") {
    throw new Error(`Language settings E2E: fresh ja-JP did not resolve and persist ja ${JSON.stringify({ navigatorLocale, settings: state.settings, storedLanguage: stored?.language })}`);
  }
  report.cases.freshJapanese = {
    navigatorLocale,
    activeLanguage: state.settings.language,
    deviceLanguage: state.settings.deviceLanguage,
    persistedLanguage: stored.language,
  };

  await openSettings(standard.page);
  await openLanguagePicker(standard.page);
  state = await debug(standard.page);
  const standardTargets = assertLanguageMetadataAndTargets(state, "standard");
  await screenshot(standard.page, "standard-language-picker-ja.png");
  report.cases.standardPicker = {
    screen: state.screen,
    optionCount: Object.keys(standardTargets).length,
    languages: expectedLanguages,
  };

  await clickTarget(standard.page, "language.de");
  await waitForScreen(standard.page, "settings");
  state = await debug(standard.page);
  stored = await persisted(standard.page);
  if (state.settings.language !== "de" || stored?.language !== "de") {
    throw new Error(`Language settings E2E: German selection was not applied and saved immediately ${JSON.stringify({ settings: state.settings, storedLanguage: stored?.language })}`);
  }
  await screenshot(standard.page, "standard-settings-de.png");

  await standard.page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(standard.page);
  state = await debug(standard.page);
  stored = await persisted(standard.page);
  if (state.settings.language !== "de" || state.settings.deviceLanguage !== "ja" || stored?.language !== "de") {
    throw new Error(`Language settings E2E: manual German override did not survive reload ${JSON.stringify({ settings: state.settings, storedLanguage: stored?.language })}`);
  }
  report.cases.manualGerman = {
    returnedScreenAfterSelection: "settings",
    activeAfterReload: state.settings.language,
    deviceLanguage: state.settings.deviceLanguage,
    persistedAfterReload: stored.language,
  };

  // A persisted non-English choice must remain authoritative while real
  // Pointer input crosses every formal meta page and enters the gameplay HUD.
  // This catches page-specific render paths that accidentally replace or lose
  // the active language while their lazy image groups are loading.
  const localizedScreenTour = {};
  localizedScreenTour.shop = await visitNavigationScreen(
    standard.page,
    "navigation.0",
    "supply",
    "de",
    "standard-shop-de.png",
  );
  localizedScreenTour.journey = await visitNavigationScreen(
    standard.page,
    "navigation.3",
    "levels",
    "de",
    "standard-journey-de.png",
  );
  localizedScreenTour.collection = await visitNavigationScreen(
    standard.page,
    "navigation.4",
    "records",
    "de",
    "standard-collection-de.png",
  );
  localizedScreenTour.mechanismGuide = await visitNavigationScreen(
    standard.page,
    "collectionAlbumGuide",
    "mechanismGuide",
    "de",
    "standard-mechanism-guide-de.png",
  );
  localizedScreenTour.collectionAfterGuide = await visitNavigationScreen(
    standard.page,
    "mechanismGuideClose",
    "records",
    "de",
  );
  localizedScreenTour.leaderboard = await visitNavigationScreen(
    standard.page,
    "navigation.1",
    "leaderboard",
    "de",
    "standard-leaderboard-de.png",
  );
  localizedScreenTour.home = await visitNavigationScreen(
    standard.page,
    "navigation.2",
    "home",
    "de",
  );
  await clickTarget(standard.page, "homePlay");
  await standard.page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current?.screen === "playing" || current?.screen === "feature";
  }, undefined, { timeout: 10_000 });
  state = await debug(standard.page);
  if (state.screen === "feature") {
    await clickTarget(standard.page, "featurePrimary");
    await waitForScreen(standard.page, "playing");
  }
  localizedScreenTour.gameplay = await assertScreenLanguageAndCanvas(standard.page, "playing", "de");
  await screenshot(standard.page, "standard-gameplay-hud-de.png");
  report.cases.localizedScreenTour = {
    selectedLanguage: "de",
    pointerSequence: ["supply", "levels", "records", "mechanismGuide", "records", "leaderboard", "home", "playing"],
    screens: localizedScreenTour,
  };

  // Return through the real pause controls so the pre-existing clear-progress
  // retention case still starts from Home after the gameplay-HUD assertion.
  await clickTarget(standard.page, "pause");
  await waitForScreen(standard.page, "paused");
  await assertScreenLanguageAndCanvas(standard.page, "paused", "de");
  await clickTarget(standard.page, "pauseHome");
  await waitForSettledScreen(standard.page, "home");

  await openSettings(standard.page);
  await clickTarget(standard.page, "settingsReset");
  await waitForScreen(standard.page, "resetConfirm");
  await clickTarget(standard.page, "modalPrimary");
  await waitForScreen(standard.page, "home");
  state = await debug(standard.page);
  stored = await persisted(standard.page);
  if (state.settings.language !== "de" || stored?.language !== "de") {
    throw new Error(`Language settings E2E: clear-progress UI discarded the manual language ${JSON.stringify({ settings: state.settings, storedLanguage: stored?.language })}`);
  }
  report.cases.clearProgress = {
    usedRealUiFlow: true,
    activeLanguage: state.settings.language,
    persistedLanguage: stored.language,
    resetLevel: state.level.id,
    resetHighestLevel: state.progression.highestLevel,
  };
  await standard.context.close();

  // Existing schema-v1 saves predate localization and must remain Simplified
  // Chinese while every gameplay/economy field survives normalization.
  const legacy = await freshPage("legacy-v1", "fr-FR", { width: 496, height: 1078 });
  const legacySave = {
    schemaVersion: 1,
    currentLevel: 12,
    highestLevel: 34,
    coins: 4321,
    sound: false,
    haptic: false,
    reducedMotion: true,
    featureSeen: ["basics", "ice-door"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 2, rocket: 4, pulse: 1 },
    bestStars: { "1": 3, "12": 2 },
    bestMoves: { "1": 8, "12": 19 },
    rewardedLevels: [1, 2, 3, 10],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
    lastSeenUpdate: "legacy-localization-migration",
  };
  await legacy.page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: saveKey,
    value: legacySave,
  });
  await legacy.page.reload({ waitUntil: "domcontentloaded" });
  await waitForReady(legacy.page);
  state = await debug(legacy.page);
  stored = await persisted(legacy.page);
  const legacyPreserved = state.settings.language === "zh-CN"
    && state.settings.deviceLanguage === "fr"
    && state.level.id === 12
    && state.progression.highestLevel === 34
    && state.economy.coins === 4321
    && JSON.stringify(state.economy.boosters) === JSON.stringify(legacySave.boosters)
    && JSON.stringify(state.progression.bestStars) === JSON.stringify(legacySave.bestStars)
    && JSON.stringify(state.progression.bestMoves) === JSON.stringify(legacySave.bestMoves)
    && stored?.language === "zh-CN"
    && stored.currentLevel === legacySave.currentLevel
    && stored.highestLevel === legacySave.highestLevel
    && stored.coins === legacySave.coins;
  if (!legacyPreserved) {
    throw new Error(`Language settings E2E: legacy v1 migration changed language or progress ${JSON.stringify({ settings: state.settings, level: state.level.id, progression: state.progression, economy: state.economy, stored })}`);
  }
  report.cases.legacyV1 = {
    navigatorLocale: await legacy.page.evaluate(() => navigator.language),
    activeLanguage: state.settings.language,
    deviceLanguage: state.settings.deviceLanguage,
    persistedLanguage: stored.language,
    currentLevel: state.level.id,
    highestLevel: state.progression.highestLevel,
    coins: state.economy.coins,
    boosters: state.economy.boosters,
    bestStars: state.progression.bestStars,
    bestMoves: state.progression.bestMoves,
  };
  await legacy.context.close();

  // Unsupported device locales use the documented English fallback.
  const unsupported = await freshPage("unsupported-nl", "nl-NL", { width: 496, height: 1078 });
  state = await debug(unsupported.page);
  stored = await persisted(unsupported.page);
  const unsupportedNavigatorLocale = await unsupported.page.evaluate(() => navigator.language);
  if (unsupportedNavigatorLocale !== "nl-NL" || state.settings.language !== "en"
    || state.settings.deviceLanguage !== "en" || stored?.language !== "en") {
    throw new Error(`Language settings E2E: unsupported nl-NL did not fall back to English ${JSON.stringify({ unsupportedNavigatorLocale, settings: state.settings, storedLanguage: stored?.language })}`);
  }
  report.cases.unsupportedDutch = {
    navigatorLocale: unsupportedNavigatorLocale,
    activeLanguage: state.settings.language,
    deviceLanguage: state.settings.deviceLanguage,
    persistedLanguage: stored.language,
  };
  await unsupported.context.close();

  // A rejected device write must never masquerade as a saved preference.
  // Keep the player on the picker, retain the durable language, and expose a
  // localized retry message until storage becomes writable again.
  const rejected = await freshPage("rejected-language-save", "en-US", { width: 496, height: 1078 });
  await openSettings(rejected.page);
  await openLanguagePicker(rejected.page);
  await rejected.page.evaluate((key) => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function rejectLanguageWrite(storageKey, value) {
      if (storageKey === key) throw new DOMException("Simulated quota rejection", "QuotaExceededError");
      return originalSetItem.call(this, storageKey, value);
    };
  }, saveKey);
  await clickTarget(rejected.page, "language.es");
  await rejected.page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current?.screen === "language" && current.settings?.languageSaveFailed === true;
  }, undefined, { timeout: 10_000 });
  state = await debug(rejected.page);
  stored = await persisted(rejected.page);
  if (state.settings.language !== "en" || stored?.language !== "en") {
    throw new Error(`Language settings E2E: rejected write changed the active or durable language ${JSON.stringify({ settings: state.settings, storedLanguage: stored?.language })}`);
  }
  await screenshot(rejected.page, "rejected-language-save-en.png");
  report.cases.rejectedWrite = {
    attemptedLanguage: "es",
    retainedLanguage: state.settings.language,
    persistedLanguage: stored.language,
    stayedOnPicker: state.screen === "language",
    localizedFailureVisible: state.settings.languageSaveFailed,
  };
  await rejected.context.close();

  // Two unavailable acknowledgements are genuinely ambiguous: the exact
  // candidate must remain pending, unrelated saves/back navigation must stay
  // blocked, and retrying after recovery must commit that same candidate.
  const unknown = await freshPage("unknown-language-save", "en-US", { width: 496, height: 1078 });
  await openSettings(unknown.page);
  await openLanguagePicker(unknown.page);
  const unknownBaseline = await persisted(unknown.page);
  await unknown.page.evaluate((key) => {
    const fault = {
      enabled: true,
      writes: [],
      reads: 0,
      originalSetItem: Storage.prototype.setItem,
      originalGetItem: Storage.prototype.getItem,
    };
    globalThis.__LANGUAGE_STORAGE_FAULT__ = fault;
    Storage.prototype.setItem = function failUnknownWrite(storageKey, value) {
      if (storageKey === key && fault.enabled) {
        fault.writes.push(String(value));
        throw new DOMException("Simulated unavailable acknowledgement", "UnknownError");
      }
      return fault.originalSetItem.call(this, storageKey, value);
    };
    Storage.prototype.getItem = function failUnknownRead(storageKey) {
      if (storageKey === key && fault.enabled) {
        fault.reads += 1;
        throw new DOMException("Simulated unavailable read", "UnknownError");
      }
      return fault.originalGetItem.call(this, storageKey);
    };
  }, saveKey);
  await clickTarget(unknown.page, "language.es");
  await unknown.page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current?.screen === "language"
      && current.settings?.languagePersistence?.status === "unknown"
      && current.settings.languagePersistence.requestedLanguage === "es";
  }, undefined, { timeout: 10_000 });
  state = await debug(unknown.page);
  if (state.settings.language !== "en" || !state.settings.languageSaveFailed) {
    throw new Error(`Language settings E2E: unknown write masqueraded as applied ${JSON.stringify(state.settings)}`);
  }
  await clickTarget(unknown.page, "language.de");
  await clickTarget(unknown.page, "languageBack");
  state = await debug(unknown.page);
  if (state.screen !== "language" || state.settings.languagePersistence?.requestedLanguage !== "es") {
    throw new Error(`Language settings E2E: ambiguous candidate could be replaced or abandoned ${JSON.stringify(state.settings)}`);
  }
  const faultEvidence = await unknown.page.evaluate(() => ({
    writes: [...globalThis.__LANGUAGE_STORAGE_FAULT__.writes],
    reads: globalThis.__LANGUAGE_STORAGE_FAULT__.reads,
  }));
  if (faultEvidence.writes.length !== 2
    || faultEvidence.writes[0] !== faultEvidence.writes[1]
    || faultEvidence.reads !== 2) {
    throw new Error(`Language settings E2E: ambiguous retries did not preserve one immutable candidate ${JSON.stringify(faultEvidence)}`);
  }
  const attemptedCandidate = JSON.parse(faultEvidence.writes[0]);
  if (JSON.stringify(attemptedCandidate) !== JSON.stringify({ ...unknownBaseline, language: "es" })) {
    throw new Error(`Language settings E2E: language transaction changed unrelated save data ${JSON.stringify({ unknownBaseline, attemptedCandidate })}`);
  }
  await unknown.page.evaluate(() => { globalThis.__LANGUAGE_STORAGE_FAULT__.enabled = false; });
  await clickTarget(unknown.page, "language.es");
  await waitForScreen(unknown.page, "settings");
  state = await debug(unknown.page);
  stored = await persisted(unknown.page);
  if (state.settings.language !== "es" || stored?.language !== "es"
    || state.settings.languagePersistence?.status !== "idle") {
    throw new Error(`Language settings E2E: recovered retry did not commit the pending language ${JSON.stringify({ settings: state.settings, storedLanguage: stored?.language })}`);
  }
  report.cases.unknownWrite = {
    attemptedLanguage: "es",
    immutableRetryWrites: faultEvidence.writes.length,
    unavailableReads: faultEvidence.reads,
    blockedDifferentSelection: true,
    blockedBackNavigation: true,
    committedAfterRecovery: stored.language,
  };
  await unknown.context.close();

  // The compact viewport uses expanded interaction rectangles. Validate their
  // final CSS size and pairwise separation rather than only their art bounds.
  const small = await freshPage("small-en", "en-US", { width: 320, height: 568 });
  await openSettings(small.page);
  await openLanguagePicker(small.page);
  state = await debug(small.page);
  const smallTargets = assertLanguageMetadataAndTargets(state, "320x568");
  const compactTargetRows = expectedLanguages.map((language) => ({
    language,
    hit: smallTargets[language].hit,
    cssWidth: smallTargets[language].cssWidth,
    cssHeight: smallTargets[language].cssHeight,
  }));
  for (const target of compactTargetRows) {
    if (target.cssWidth < 43.999 || target.cssHeight < 43.999) {
      throw new Error(`Language settings E2E: 320x568 ${target.language} target is under 44 CSS px ${JSON.stringify(target)}`);
    }
  }
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < compactTargetRows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < compactTargetRows.length; rightIndex += 1) {
      const left = compactTargetRows[leftIndex];
      const right = compactTargetRows[rightIndex];
      const overlap = left.hit.x < right.hit.x + right.hit.width
        && left.hit.x + left.hit.width > right.hit.x
        && left.hit.y < right.hit.y + right.hit.height
        && left.hit.y + left.hit.height > right.hit.y;
      if (overlap) overlaps.push([left.language, right.language]);
    }
  }
  if (overlaps.length > 0) {
    throw new Error(`Language settings E2E: 320x568 language targets overlap ${JSON.stringify(overlaps)}`);
  }
  await screenshot(small.page, "small-language-picker-320x568.png");
  await clickTarget(small.page, "language.ru");
  await waitForScreen(small.page, "settings");
  state = await debug(small.page);
  if (state.settings.language !== "ru") {
    throw new Error(`Language settings E2E: 320x568 real Pointer missed Russian option (${state.settings.language})`);
  }
  await openLanguagePicker(small.page);
  state = await debug(small.page);
  assertLanguageMetadataAndTargets(state, "320x568 Russian");
  await screenshot(small.page, "small-language-picker-ru-320x568.png");
  report.cases.compactPicker = {
    viewport: { width: 320, height: 568 },
    optionCount: compactTargetRows.length,
    minimumCssWidth: Math.min(...compactTargetRows.map((target) => target.cssWidth)),
    minimumCssHeight: Math.min(...compactTargetRows.map((target) => target.cssHeight)),
    overlaps,
    pointerSelected: state.settings.language,
    russianPickerScreen: state.screen,
    targets: compactTargetRows,
  };
  await small.context.close();

  if (browserErrors.length > 0) {
    throw new Error(`Language settings browser errors:\n${browserErrors.join("\n")}`);
  }
  report.status = "pass";
} catch (error) {
  report.status = "fail";
  report.error = error instanceof Error ? error.stack ?? error.message : String(error);
  report.browserErrors = browserErrors;
  throw error;
} finally {
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();
}

console.log("Language settings device defaults, verified persistence, rejected-write recovery, localized screen tour, legacy migration, fallback, compact targets, and reset retention passed.");
