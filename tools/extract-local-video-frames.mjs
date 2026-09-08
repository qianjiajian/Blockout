import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const videoPath = resolve(option("video"));
const output = resolve(option("output", "references/benchmark/local-video-frames"));
const start = Number(option("start", "0"));
const requestedEnd = option("end");
const interval = Number(option("interval", "1"));
const columns = Number(option("columns", "6"));
const sheetSize = Number(option("sheet-size", "60"));

if (!option("video")) throw new Error("Missing --video");
if (!Number.isFinite(start) || start < 0) throw new Error("--start must be non-negative");
if (!Number.isFinite(interval) || interval <= 0) throw new Error("--interval must be positive");
if (!Number.isInteger(columns) || columns <= 0) throw new Error("--columns must be a positive integer");
if (!Number.isInteger(sheetSize) || sheetSize <= 0) throw new Error("--sheet-size must be a positive integer");

await access(videoPath);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1280 } });
  await page.goto(pathToFileURL(videoPath).href, { waitUntil: "domcontentloaded" });
  const video = page.locator("video");
  await video.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const element = document.querySelector("video");
    return element instanceof HTMLVideoElement && Number.isFinite(element.duration) && element.duration > 0 && element.readyState >= 1;
  }, undefined, { timeout: 30_000 });

  const source = await video.evaluate((element) => ({
    duration: element.duration,
    fpsHint: element.getVideoPlaybackQuality ? element.getVideoPlaybackQuality().totalVideoFrames : 0,
    width: element.videoWidth,
    height: element.videoHeight,
  }));
  const end = requestedEnd === "" ? source.duration : Math.min(Number(requestedEnd), source.duration);
  if (!Number.isFinite(end) || end <= start) throw new Error("--end must be greater than --start");

  const timestamps = [];
  for (let timestamp = start; timestamp < end - 0.001; timestamp += interval) {
    timestamps.push(Number(timestamp.toFixed(3)));
  }

  const files = [];
  for (const [index, timestamp] of timestamps.entries()) {
    const filename = `frame-${String(index).padStart(4, "0")}-${timestamp.toFixed(2).padStart(7, "0")}s.png`;
    const destination = resolve(output, filename);
    try {
      await access(destination);
    } catch {
      await video.evaluate(async (element, target) => {
        element.pause();
        if (Math.abs(element.currentTime - target) <= 0.01 && element.readyState >= 2) return;
        await new Promise((resolveSeek, rejectSeek) => {
          const timeout = setTimeout(() => rejectSeek(new Error(`seek timeout at ${target}s`)), 8_000);
          element.addEventListener("seeked", () => {
            clearTimeout(timeout);
            resolveSeek();
          }, { once: true });
          element.currentTime = target;
        });
      }, timestamp);
      await page.waitForTimeout(35);
      await video.screenshot({ path: destination });
    }
    files.push({ index, seconds: timestamp, file: filename });
  }

  const thumbWidth = 180;
  const thumbHeight = Math.round(thumbWidth * source.height / source.width);
  const sheetPage = await browser.newPage({ viewport: { width: columns * thumbWidth, height: 800 } });
  for (let sheetStart = 0; sheetStart < files.length; sheetStart += sheetSize) {
    const pageFiles = files.slice(sheetStart, sheetStart + sheetSize);
    const rows = Math.ceil(pageFiles.length / columns);
    await sheetPage.setViewportSize({ width: columns * thumbWidth, height: rows * (thumbHeight + 28) });
    const cells = await Promise.all(pageFiles.map(async (entry) => {
      const frame = await readFile(resolve(output, entry.file));
      return `<figure><img src="data:image/png;base64,${frame.toString("base64")}"><figcaption>${entry.seconds.toFixed(2)}s</figcaption></figure>`;
    }));
    const sheetEnd = sheetStart + pageFiles.length - 1;
    await sheetPage.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;background:#080b18}main{width:${columns * thumbWidth}px;display:grid;grid-template-columns:repeat(${columns},${thumbWidth}px)}figure{margin:0;background:#111629}img{display:block;width:${thumbWidth}px;height:${thumbHeight}px;object-fit:contain}figcaption{height:28px;padding:5px 8px;color:#fff;font:15px/18px Arial,sans-serif}</style><main>${cells.join("")}</main>`);
    await sheetPage.locator("main").screenshot({
      path: resolve(output, `contact-sheet-${String(sheetStart).padStart(4, "0")}-${String(sheetEnd).padStart(4, "0")}.png`),
    });
  }
  await sheetPage.close();

  await writeFile(resolve(output, "metadata.json"), JSON.stringify({
    source: videoPath,
    filename: basename(videoPath),
    durationSeconds: source.duration,
    sourceWidth: source.width,
    sourceHeight: source.height,
    startSeconds: start,
    endSeconds: end,
    intervalSeconds: interval,
    frameCount: files.length,
    frames: files,
  }, null, 2), "utf8");
  console.log(JSON.stringify({ filename: basename(videoPath), ...source, frames: files.length, output }, null, 2));
} finally {
  await browser.close();
}
