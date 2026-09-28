import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const state = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (page, name) => {
  const current = await state(page);
  const hit = current.interactionTargets?.targets?.[name]?.hit;
  const transform = current.viewportTransform;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !transform || !canvas) throw new Error(`Update notice E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + transform.offsetX + (hit.x + hit.width / 2) * transform.scale,
    canvas.y + transform.offsetY + (hit.y + hit.height / 2) * transform.scale,
  );
};

const page = await browser.newPage({ viewport: { width: 720, height: 1584 } });
attachErrors(page);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(260);

let current = await state(page);
if (current.screen !== "home" || !current.updateNotice.toastVisible || current.updateNotice.seen) {
  throw new Error("Update notice E2E: unseen release did not expose the non-blocking home notice");
}
const itemWidths = await page.evaluate((items) => {
  const context = document.createElement("canvas").getContext("2d");
  context.font = '800 18px system-ui, "Microsoft YaHei", sans-serif';
  return items.map((item) => context.measureText(item).width);
}, current.updateNotice.items);
if (itemWidths.some((width) => width > 258)) {
  throw new Error(`Update notice E2E: a release-note line exceeds its modal width ${JSON.stringify(itemWidths)}`);
}
await page.screenshot({ path: shot("round62-update-toast-720x1584.png") });

await clickInteractionTarget(page, "updateToast");
await page.waitForTimeout(100);
current = await state(page);
if (current.screen !== "updates" || current.updateNotice.returnScreen !== "home") {
  throw new Error("Update notice E2E: home notice did not open the full release notes");
}
await page.screenshot({ path: shot("round62-update-modal-720x1584.png") });

await clickInteractionTarget(page, "modalPrimary");
current = await state(page);
if (current.screen !== "home" || !current.updateNotice.seen || current.updateNotice.toastVisible) {
  throw new Error("Update notice E2E: acknowledgement did not return home and persist the seen version");
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(180);
current = await state(page);
if (current.updateNotice.toastVisible || !current.updateNotice.seen) {
  throw new Error("Update notice E2E: acknowledged version reappeared after reload");
}

await clickInteractionTarget(page, "homeSettings");
current = await state(page);
if (current.screen !== "settings" || current.interactionTargets.targets.settingsUpdates) {
  throw new Error("Update notice E2E: supplied Settings layout did not remain limited to its documented controls");
}
await clickInteractionTarget(page, "menuBack");
current = await state(page);
if (current.screen !== "home") {
  throw new Error("Update notice E2E: supplied Settings close control did not return home");
}

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.waitForTimeout(180);
await clickInteractionTarget(small, "updateToast");
await small.waitForTimeout(80);
current = await state(small);
if (current.screen !== "updates") throw new Error("Update notice E2E: 320x568 notice did not open");
await small.screenshot({ path: shot("round62-update-modal-320x568.png") });
await small.close();

const direct = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(direct);
await direct.goto(playtestUrl, { waitUntil: "networkidle" });
await direct.evaluate(() => localStorage.clear());
await direct.reload({ waitUntil: "networkidle" });
await direct.waitForTimeout(180);
await clickInteractionTarget(direct, "homePlay");
await direct.waitForTimeout(100);
current = await state(direct);
if (current.screen !== "playing" || !current.updateNotice.seen) {
  throw new Error("Update notice E2E: home notice blocked direct play or did not acknowledge on navigation");
}
await direct.close();

await page.close();
await browser.close();
if (errors.length) throw new Error(`Update notice browser errors:\n${errors.join("\n")}`);
console.log("Non-blocking update toast, full notes, persistence, supplied Settings controls, direct play, and 320x568 passed.");
