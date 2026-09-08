import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
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

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await writeSave(page, makeSave());
await page.screenshot({ path: shot("round25-home-supply-entry.png") });
await page.mouse.click(151, 70);
let state = await debug(page);
if (state.screen !== "supply" || state.supply.items.length !== 3) {
  throw new Error("Supply E2E: coin entry did not open the three-item supply screen");
}
const prices = Object.fromEntries(state.supply.items.map((item) => [item.kind, item.price]));
if (prices.time !== 180 || prices.rocket !== 240 || prices.pulse !== 210) {
  throw new Error("Supply E2E: runtime prices diverged from the economy contract");
}
await page.screenshot({ path: shot("round25-supply-standard.png") });

await page.mouse.click(377, 450);
state = await debug(page);
if (state.economy.coins !== 820 || state.economy.boosters.time !== 4 || state.supply.feedback?.text !== "已补充加时 · 库存 4/9") {
  throw new Error("Supply E2E: successful purchase was not atomic or clearly acknowledged");
}
await page.screenshot({ path: shot("round25-supply-purchased.png") });

await page.mouse.click(377, 628);
state = await debug(page);
if (state.economy.coins !== 580 || state.economy.boosters.rocket !== 9 || !state.supply.items.find((item) => item.kind === "rocket")?.full) {
  throw new Error("Supply E2E: reaching the stock cap did not update inventory and affordance together");
}
await page.mouse.click(377, 806);
state = await debug(page);
if (state.economy.coins !== 580 || state.economy.boosters.pulse !== 9 || state.supply.feedback?.text !== "脉冲库存已满") {
  throw new Error("Supply E2E: full inventory spent coins or lacked a specific reason");
}

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(250);
state = await debug(page);
if (state.economy.coins !== 580 || state.economy.boosters.time !== 4 || state.economy.boosters.rocket !== 9) {
  throw new Error("Supply E2E: purchase did not persist across reload");
}
await page.mouse.click(151, 70);
await page.mouse.click(248, 1028);
state = await debug(page);
if (state.screen !== "home") throw new Error("Supply E2E: Home tab did not return to the hub");

await writeSave(page, makeSave(50, { time: 2, rocket: 2, pulse: 2 }));
await page.mouse.click(151, 70);
await page.mouse.click(377, 628);
state = await debug(page);
if (state.economy.coins !== 50 || state.economy.boosters.rocket !== 2 || state.supply.feedback?.text !== "金币不足 · 还差 190") {
  throw new Error("Supply E2E: insufficient balance was not rejected atomically with an exact reason");
}
await page.screenshot({ path: shot("round25-supply-insufficient.png") });
await page.close();

const failedWrite = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(failedWrite);
await writeSave(failedWrite, makeSave(1000, { time: 3, rocket: 3, pulse: 3 }));
await failedWrite.mouse.click(151, 70);
await failedWrite.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) throw new DOMException("storage full", "QuotaExceededError");
    return originalSet.call(this, name, value);
  };
}, saveKey);
await failedWrite.mouse.click(377, 450);
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
await failedWrite.mouse.click(151, 70);
await failedWrite.mouse.click(377, 450);
state = await debug(failedWrite);
if (state.economy.coins !== 820 || state.economy.boosters.time !== 4
  || state.supply.feedback?.text !== "已补充加时 · 库存 4/9") {
  throw new Error("Supply E2E: purchase did not recover after storage became writable again");
}
await failedWrite.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await writeSave(small, makeSave());
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
const clickLogical = (x, y) => small.mouse.click(offsetX + x * scale, y * scale);
await clickLogical(151, 70);
state = await debug(small);
if (state.screen !== "supply") throw new Error("Supply E2E: 320x568 entry target missed");
await small.screenshot({ path: shot("round25-supply-320x568.png") });
await clickLogical(377, 450);
state = await debug(small);
if (state.economy.coins !== 820 || state.economy.boosters.time !== 4) {
  throw new Error("Supply E2E: 320x568 purchase target missed or mutated incorrectly");
}
await clickLogical(248, 1028);
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
const safeScale = Math.min(390 / 496, 844 / 1078);
const safeOffsetX = (390 - 496 * safeScale) / 2;
const safeOffsetY = (844 - 1078 * safeScale) / 2;
const logicalTop = Math.min(54, 44 / safeScale);
const safeClick = (x, y) => safePage.mouse.click(safeOffsetX + x * safeScale, safeOffsetY + (y + logicalTop) * safeScale);
await safeClick(151, 70);
state = await debug(safePage);
if (state.screen !== "supply") throw new Error("Supply E2E: 44px safe-top entry target missed");
await safePage.screenshot({ path: shot("round25-supply-safearea-390x844.png") });
await safeClick(377, 450);
state = await debug(safePage);
if (state.economy.coins !== 820 || state.economy.boosters.time !== 4) {
  throw new Error("Supply E2E: safe-area purchase target diverged from rendering");
}
const safeLogicalBottom = 34 / safeScale;
await safePage.mouse.click(safeOffsetX + 248 * safeScale, safeOffsetY + (1028 - safeLogicalBottom) * safeScale);
state = await debug(safePage);
if (state.screen !== "home") throw new Error("Supply E2E: safe-area Home tab missed");
await safePage.close();

await browser.close();
if (errors.length) throw new Error(`Supply browser errors:\n${errors.join("\n")}`);
console.log("Supply entry, prices, transactional storage failure/retry, stock cap, insufficient balance, persistence, 320x568, and 44/34 safe area passed.");
