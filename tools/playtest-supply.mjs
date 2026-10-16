import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL(`../playtest-results/playtest-supply-time-freeze-${new Date().toISOString().replaceAll(":", "-")}/`, import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
// v1.160: independently assert the agreed global prices, not runtime-derived expectations.
const EXPECTED_SUPPLY_PRICES = Object.freeze({ time: 300, rocket: 400, pulse: 400 });
const coinsAfterTimePurchase = 1000 - EXPECTED_SUPPLY_PRICES.time;
const coinsAfterTimeAndRocketPurchase = coinsAfterTimePurchase - EXPECTED_SUPPLY_PRICES.rocket;
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const makeSave = (coins = 1000, boosters = { time: 3, rocket: 8, pulse: 9 }) => ({
  schemaVersion: 1,
  currentLevel: 12,
  highestLevel: 12,
  coins,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer"],
  boosters,
  bestStars: {},
  bestMoves: {},
  rewardedLevels: Array.from({ length: 11 }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});
const writeSave = async (page, save) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: saveKey, value: save });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const transform = state.viewportTransform;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !transform || !canvas) throw new Error(`Supply E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + transform.offsetX + (hit.x + hit.width / 2) * transform.scale,
    canvas.y + transform.offsetY + (hit.y + hit.height / 2) * transform.scale,
  );
  const next = await debug(page);
  if (["supply", "leaderboard", "levels"].includes(next.screen)) {
    await page.waitForFunction((screen) => (
      window.__COLOR_ESCAPE__?.getDebugState().art.formalPage.loaded === screen
    ), next.screen);
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await writeSave(page, makeSave());
await page.screenshot({ path: shot("round25-home-supply-entry.png") });
await clickInteractionTarget(page, "homeSupply");
let state = await debug(page);
if (state.screen !== "supply" || state.supply.items.length !== 3) {
  throw new Error("Supply E2E: coin entry did not open the three-item supply screen");
}
const currentUpdateNoticeId = state.updateNotice?.id;
if (typeof currentUpdateNoticeId !== "string" || !currentUpdateNoticeId) {
  throw new Error("Supply E2E: current update notice id was unavailable");
}
const prices = Object.fromEntries(state.supply.items.map((item) => [item.kind, item.price]));
if (prices.time !== EXPECTED_SUPPLY_PRICES.time || prices.rocket !== EXPECTED_SUPPLY_PRICES.rocket || prices.pulse !== EXPECTED_SUPPLY_PRICES.pulse) {
  throw new Error("Supply E2E: runtime prices diverged from the economy contract");
}
await page.screenshot({ path: shot("round25-supply-standard.png") });

await clickInteractionTarget(page, "supply.time");
state = await debug(page);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4 || state.supply.feedback?.text !== "已补充冻结 · 库存 4/9") {
  throw new Error("Supply E2E: successful purchase was not atomic or clearly acknowledged");
}
await page.screenshot({ path: shot("round25-supply-purchased.png") });

await clickInteractionTarget(page, "supply.rocket");
state = await debug(page);
if (state.economy.coins !== coinsAfterTimeAndRocketPurchase || state.economy.boosters.rocket !== 9 || !state.supply.items.find((item) => item.kind === "rocket")?.full) {
  throw new Error("Supply E2E: reaching the stock cap did not update inventory and affordance together");
}
await clickInteractionTarget(page, "supply.pulse");
state = await debug(page);
if (state.economy.coins !== coinsAfterTimeAndRocketPurchase || state.economy.boosters.pulse !== 9 || state.supply.feedback?.text !== "脉冲库存已满") {
  throw new Error("Supply E2E: full inventory spent coins or lacked a specific reason");
}

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(250);
state = await debug(page);
if (state.economy.coins !== coinsAfterTimeAndRocketPurchase || state.economy.boosters.time !== 4 || state.economy.boosters.rocket !== 9) {
  throw new Error("Supply E2E: purchase did not persist across reload");
}
await clickInteractionTarget(page, "homeSupply");
await clickInteractionTarget(page, "navigation.2");
state = await debug(page);
if (state.screen !== "home") throw new Error("Supply E2E: Home tab did not return to the hub");

await writeSave(page, makeSave(50, { time: 2, rocket: 2, pulse: 2 }));
await clickInteractionTarget(page, "homeSupply");
await clickInteractionTarget(page, "supply.rocket");
state = await debug(page);
if (state.economy.coins !== 50 || state.economy.boosters.rocket !== 2 || state.supply.feedback?.text !== `金币不足 · 还差 ${EXPECTED_SUPPLY_PRICES.rocket - 50}`) {
  throw new Error("Supply E2E: insufficient balance was not rejected atomically with an exact reason");
}
await page.screenshot({ path: shot("round25-supply-insufficient.png") });
await page.close();

const failedWrite = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(failedWrite);
await writeSave(failedWrite, makeSave(1000, { time: 3, rocket: 3, pulse: 3 }));
await clickInteractionTarget(failedWrite, "homeSupply");
await failedWrite.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) throw new DOMException("storage full", "QuotaExceededError");
    return originalSet.call(this, name, value);
  };
}, saveKey);
await clickInteractionTarget(failedWrite, "supply.time");
state = await debug(failedWrite);
const failedPersisted = await failedWrite.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (state.economy.coins !== 1000 || state.economy.boosters.time !== 3
  || state.supply.feedback?.text !== "保存失败 · 请重试"
  || failedPersisted.coins !== 1000 || failedPersisted.boosters.time !== 3) {
  throw new Error("Supply E2E: failed storage write changed runtime or persisted player assets");
}
await failedWrite.screenshot({ path: shot("round99-supply-save-failed.png") });
await failedWrite.reload({ waitUntil: "networkidle" });
await failedWrite.waitForTimeout(250);
state = await debug(failedWrite);
if (state.economy.coins !== 1000 || state.economy.boosters.time !== 3) {
  throw new Error("Supply E2E: failed purchase diverged after refresh");
}
await clickInteractionTarget(failedWrite, "homeSupply");
await clickInteractionTarget(failedWrite, "supply.time");
state = await debug(failedWrite);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4
  || state.supply.feedback?.text !== "已补充冻结 · 库存 4/9") {
  throw new Error("Supply E2E: purchase did not recover after storage became writable again");
}
await failedWrite.close();

// A bridge can throw after the bytes have reached durable storage, then make
// the immediate read-back unavailable. The retry must reuse the exact first
// candidate: no second charge, no second inventory grant, and no navigation
// away while the transaction is unresolved.
const unknownWrite = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(unknownWrite);
await writeSave(unknownWrite, makeSave(1000, { time: 3, rocket: 3, pulse: 3 }));
await clickInteractionTarget(unknownWrite, "homeSupply");
const navigationHomePoint = await (async () => {
  const current = await debug(unknownWrite);
  const hit = current.interactionTargets.targets["navigation.2"].hit;
  const canvas = await unknownWrite.locator("canvas").boundingBox();
  return {
    x: canvas.x + current.viewportTransform.offsetX + (hit.x + hit.width / 2) * current.viewportTransform.scale,
    y: canvas.y + current.viewportTransform.offsetY + (hit.y + hit.height / 2) * current.viewportTransform.scale,
  };
})();
await unknownWrite.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  let transactionStarted = false;
  window.__supplyStorageRestore = () => {
    Storage.prototype.setItem = originalSet;
    Storage.prototype.getItem = originalGet;
    delete window.__supplyStorageRestore;
  };
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) {
      originalSet.call(this, name, value);
      transactionStarted = true;
      throw new DOMException("bridge acknowledgement lost", "UnknownError");
    }
    return originalSet.call(this, name, value);
  };
  Storage.prototype.getItem = function getItem(name) {
    if (name === key && transactionStarted) {
      throw new DOMException("bridge read-back unavailable", "UnknownError");
    }
    return originalGet.call(this, name);
  };
}, saveKey);
await clickInteractionTarget(unknownWrite, "supply.time");
state = await debug(unknownWrite);
if (state.economy.coins !== 1000 || state.economy.boosters.time !== 3
  || state.supply.pendingPurchase?.kind !== "time"
  || state.supply.feedback?.text !== "存档状态未知 · 再次点击确认") {
  throw new Error("Supply E2E: ambiguous write did not preserve an immutable pending purchase");
}
await unknownWrite.mouse.click(navigationHomePoint.x, navigationHomePoint.y);
state = await debug(unknownWrite);
if (state.screen !== "supply" || state.supply.pendingPurchase?.kind !== "time") {
  throw new Error("Supply E2E: unresolved purchase allowed navigation or lost its recovery state");
}
await unknownWrite.evaluate(() => window.__supplyStorageRestore());
const firstDurableCandidate = await unknownWrite.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (firstDurableCandidate.coins !== coinsAfterTimePurchase || firstDurableCandidate.boosters.time !== 4) {
  throw new Error("Supply E2E: ambiguity fixture did not write the first candidate before throwing");
}
await clickInteractionTarget(unknownWrite, "supply.time");
state = await debug(unknownWrite);
const retriedDurableCandidate = await unknownWrite.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4
  || state.supply.pendingPurchase
  || retriedDurableCandidate.coins !== coinsAfterTimePurchase || retriedDurableCandidate.boosters.time !== 4) {
  throw new Error("Supply E2E: ambiguous purchase retry charged or granted more than once");
}
await unknownWrite.close();

// An ordinary preference save may reach disk even though its bridge reports
// failure. The next asset transaction compares against that exact live
// pre-write snapshot as well as the older confirmed durable baseline.
const lostOrdinaryAcknowledgement = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(lostOrdinaryAcknowledgement);
await writeSave(lostOrdinaryAcknowledgement, makeSave(1000, { time: 3, rocket: 3, pulse: 3 }));
await clickInteractionTarget(lostOrdinaryAcknowledgement, "homeSettings");
await lostOrdinaryAcknowledgement.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  let preferenceAttempted = false;
  let blockedPurchaseWrites = 1;
  window.__ordinaryWriteRecoveryProbe = () => ({ preferenceAttempted, blockedPurchaseWrites });
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key && !preferenceAttempted) {
      preferenceAttempted = true;
      originalSet.call(this, name, value);
      throw new DOMException("preference acknowledgement lost", "UnknownError");
    }
    if (name === key && blockedPurchaseWrites > 0) {
      blockedPurchaseWrites -= 1;
      throw new DOMException("purchase rejected before write", "QuotaExceededError");
    }
    return originalSet.call(this, name, value);
  };
}, saveKey);
await clickInteractionTarget(lostOrdinaryAcknowledgement, "settings.sound");
state = await debug(lostOrdinaryAcknowledgement);
const preferenceDurable = await lostOrdinaryAcknowledgement.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (!state.settings.sound || !preferenceDurable.sound || state.storage.normalizationPending !== true) {
  throw new Error("Supply E2E: lost ordinary-save acknowledgement fixture did not create a newer live/durable baseline");
}
await clickInteractionTarget(lostOrdinaryAcknowledgement, "menuBack");
await clickInteractionTarget(lostOrdinaryAcknowledgement, "homeSupply");
await clickInteractionTarget(lostOrdinaryAcknowledgement, "supply.time");
state = await debug(lostOrdinaryAcknowledgement);
if (state.economy.coins !== 1000 || state.economy.boosters.time !== 3
  || state.supply.pendingPurchase
  || state.supply.feedback?.text !== "保存失败 · 请重试") {
  throw new Error("Supply E2E: transaction after a lost ordinary-save acknowledgement became ambiguous");
}
await clickInteractionTarget(lostOrdinaryAcknowledgement, "supply.time");
state = await debug(lostOrdinaryAcknowledgement);
const ordinaryRecoveryDurable = await lostOrdinaryAcknowledgement.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4 || !state.settings.sound
  || state.supply.pendingPurchase || state.storage.normalizationPending !== false
  || ordinaryRecoveryDurable.coins !== coinsAfterTimePurchase || ordinaryRecoveryDurable.boosters.time !== 4
  || !ordinaryRecoveryDurable.sound) {
  throw new Error("Supply E2E: transaction did not recover exactly once from a newer pre-write baseline");
}
await lostOrdinaryAcknowledgement.close();

// A schema-normalization write can fail before the first player transaction.
// The runtime must retain the exact durable pre-normalization value (including
// a genuinely missing key) so a later rejected purchase is not misclassified
// as ambiguous and left pending forever.
const verifyUnnormalizedBaselineRecovery = async (fixtureName, durableValue) => {
  const recoveryPage = await browser.newPage({ viewport: { width: 496, height: 1078 } });
  attachErrors(recoveryPage);
  await recoveryPage.addInitScript(({ key, initialValue }) => {
    const originalSet = Storage.prototype.setItem;
    if (initialValue === null) localStorage.removeItem(key);
    else originalSet.call(localStorage, key, JSON.stringify(initialValue));

    let blockedWritesRemaining = 2;
    let saveWriteAttempts = 0;
    window.__normalizationRecoveryProbe = () => ({ blockedWritesRemaining, saveWriteAttempts });
    Storage.prototype.setItem = function setItem(name, value) {
      if (name === key) {
        saveWriteAttempts += 1;
        if (blockedWritesRemaining > 0) {
          blockedWritesRemaining -= 1;
          throw new DOMException("fixture rejected write", "QuotaExceededError");
        }
      }
      return originalSet.call(this, name, value);
    };
  }, { key: saveKey, initialValue: durableValue });
  await recoveryPage.goto(playtestUrl, { waitUntil: "networkidle" });
  await recoveryPage.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);

  if (durableValue === null) {
    // Missing storage correctly starts from level 1, where supplies are still
    // locked. Raise only the in-memory fixture progression so we can exercise
    // the same first real asset transaction against the trusted missing key.
    await recoveryPage.evaluate((updateNoticeId) => {
      const game = window.__COLOR_ESCAPE__;
      game.save.currentLevel = 12;
      game.save.highestLevel = 12;
      game.save.coins = 1000;
      game.save.boosters = { time: 3, rocket: 3, pulse: 3 };
      game.save.lastSeenUpdate = updateNoticeId;
    }, currentUpdateNoticeId);
  }

  let recoveryState = await debug(recoveryPage);
  const expectedBaselineStatus = durableValue === null ? "missing" : "ok";
  if (recoveryState.storage.status !== "ready"
    || recoveryState.storage.durableBaselineStatus !== expectedBaselineStatus
    || recoveryState.storage.normalizationPending !== true) {
    throw new Error(`Supply E2E: ${fixtureName} pre-normalization baseline was not retained`);
  }

  await clickInteractionTarget(recoveryPage, "homeSupply");
  await clickInteractionTarget(recoveryPage, "supply.time");
  recoveryState = await debug(recoveryPage);
  const firstProbe = await recoveryPage.evaluate(() => window.__normalizationRecoveryProbe());
  if (recoveryState.economy.coins !== 1000 || recoveryState.economy.boosters.time !== 3
    || recoveryState.supply.pendingPurchase
    || recoveryState.supply.feedback?.text !== "保存失败 · 请重试"
    || firstProbe.blockedWritesRemaining !== 0 || firstProbe.saveWriteAttempts !== 2) {
    throw new Error(`Supply E2E: ${fixtureName} rejected transaction became ambiguous or mutated assets: ${JSON.stringify({
      coins: recoveryState.economy.coins,
      time: recoveryState.economy.boosters.time,
      pendingPurchase: recoveryState.supply.pendingPurchase,
      feedback: recoveryState.supply.feedback?.text,
      firstProbe,
      storage: recoveryState.storage,
    })}`);
  }

  await clickInteractionTarget(recoveryPage, "supply.time");
  recoveryState = await debug(recoveryPage);
  const persisted = await recoveryPage.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  if (recoveryState.economy.coins !== coinsAfterTimePurchase || recoveryState.economy.boosters.time !== 4
    || recoveryState.supply.pendingPurchase
    || recoveryState.supply.feedback?.text !== "已补充冻结 · 库存 4/9"
    || recoveryState.storage.durableBaselineStatus !== "ok"
    || recoveryState.storage.normalizationPending !== false
    || persisted.coins !== coinsAfterTimePurchase || persisted.boosters.time !== 4) {
    throw new Error(`Supply E2E: ${fixtureName} did not recover exactly once after storage resumed`);
  }
  await recoveryPage.close();
};

await verifyUnnormalizedBaselineRecovery("legacy", {
  schemaVersion: 1,
  currentLevel: 12,
  highestLevel: 12,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: currentUpdateNoticeId,
});
await verifyUnnormalizedBaselineRecovery("missing", null);

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small, makeSave());
await clickInteractionTarget(small, "homeSupply");
state = await debug(small);
if (state.screen !== "supply") throw new Error("Supply E2E: 320x568 entry target missed");
await small.screenshot({ path: shot("round25-supply-320x568.png") });
await clickInteractionTarget(small, "supply.time");
state = await debug(small);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4) {
  throw new Error("Supply E2E: 320x568 purchase target missed or mutated incorrectly");
}
await clickInteractionTarget(small, "navigation.2");
state = await debug(small);
if (state.screen !== "home") throw new Error("Supply E2E: 320x568 Home tab missed");
await small.close();

const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
attachErrors(safePage);
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), makeSave());
await safePage.reload({ waitUntil: "networkidle" });
await safePage.waitForTimeout(500);
await clickInteractionTarget(safePage, "homeSupply");
state = await debug(safePage);
if (state.screen !== "supply") throw new Error("Supply E2E: 44px safe-top entry target missed");
await safePage.screenshot({ path: shot("round25-supply-safearea-390x844.png") });
await clickInteractionTarget(safePage, "supply.time");
state = await debug(safePage);
if (state.economy.coins !== coinsAfterTimePurchase || state.economy.boosters.time !== 4) {
  throw new Error("Supply E2E: safe-area purchase target diverged from rendering");
}
await clickInteractionTarget(safePage, "navigation.2");
state = await debug(safePage);
if (state.screen !== "home") throw new Error("Supply E2E: safe-area Home tab missed");
await safePage.close();

await browser.close();
if (errors.length) throw new Error(`Supply browser errors:\n${errors.join("\n")}`);
console.log("Supply entry, prices, rejected/ambiguous transactional recovery, stock cap, insufficient balance, persistence, 320x568, and 44/34 safe area passed.");
