import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/document-progression/", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const inspect = async (viewport, suffix) => {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  for (const id of [5, 6, 7, 8, 10, 35, 50, 58, 68, 70, 78, 88, 91, 98, 100]) {
    await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), id);
    await page.waitForTimeout(220);
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    if (state.screen !== "playing" || state.level.id !== id) throw new Error(`Lv${id} did not open`);
    if (id === 5 && (state.puzzle.blocks.some((block) => block.frozen > 0 || block.layers.length > 1)
      || state.puzzle.gates.some((gate) => gate.frozen > 0)
      || state.puzzle.shutters.length || state.puzzle.elevators.length || state.puzzle.conveyors.length)) {
      throw new Error("Lv5 contains an advanced mechanic before the approved difficulty ramp");
    }
    if (id === 6 && (!state.puzzle.blocks.some((block) => block.frozen > 0)
      || !state.puzzle.gates.some((gate) => gate.frozen > 0)
      || !state.puzzle.blocks.some((block) => block.layers.length > 1))) {
      throw new Error("Lv6 does not expose the complete approved ice/layer difficulty set");
    }
    if (id === 7 && !state.puzzle.gates.some((gate) => gate.frozen > 0)) throw new Error("Lv7 has no frozen gate");
    if (id === 8 && !state.puzzle.blocks.some((block) => block.layers.length > 1)) throw new Error("Lv8 has no layered block");
    if (id === 35 && !state.puzzle.shutters.some((shutter) => shutter.skin === "generator")) throw new Error("Lv35 has no generator");
    if (id === 50 && !state.puzzle.elevators.length) throw new Error("Lv50 has no elevator");
    if (id === 70 && !state.puzzle.conveyors.length) throw new Error("Lv70 has no conveyor");
    if ((id === 91 || id === 100) && (!state.puzzle.blocks.some((block) => block.star) || !state.puzzle.gates.some((gate) => gate.star))) {
      throw new Error(`Lv${id} has no star block/gate pair`);
    }
    await page.screenshot({ path: resolve(output, `level-${String(id).padStart(3, "0")}${suffix}.png`) });
  }
  await page.close();
};

await inspect({ width: 496, height: 1078 }, "");
await inspect({ width: 320, height: 568 }, "-320x568");
await browser.close();
if (errors.length) throw new Error(`Document progression browser errors:\n${errors.join("\n")}`);
console.log("Reference progression milestones and portrait/small-screen visuals passed.");
