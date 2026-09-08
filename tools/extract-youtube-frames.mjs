import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const url = option("url", "");
const output = resolve(option("output", "references/benchmark/youtube/frames"));
const start = Number(option("start", "0"));
const requestedEnd = option("end", "");
const requestedTimestamps = option("timestamps", "").trim();
const interval = Number(option("interval", "1"));
const columns = Number(option("columns", "6"));
const sheetSize = Number(option("sheet-size", "60"));

if (!url) throw new Error("Missing --url");
if (!Number.isFinite(start) || start < 0) throw new Error("--start must be a non-negative number");
if (!Number.isFinite(interval) || interval <= 0) throw new Error("--interval must be greater than zero");
if (!Number.isInteger(columns) || columns <= 0) throw new Error("--columns must be a positive integer");
if (!Number.isInteger(sheetSize) || sheetSize <= 0) throw new Error("--sheet-size must be a positive integer");

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.setDefaultTimeout(20_000);

const waitForVideo = async () => {
  const video = page.locator("video");
  await video.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const element = document.querySelector("video");
    return element instanceof HTMLVideoElement && Number.isFinite(element.duration) && element.readyState >= 2;
  }, undefined, { timeout: 60_000 });
  return video;
};

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  let video = await waitForVideo();

  const source = await video.evaluate((element) => ({
    duration: element.duration,
    width: element.videoWidth,
    height: element.videoHeight,
  }));
  const title = await page.title();
  const end = requestedEnd === "" ? source.duration : Math.min(Number(requestedEnd), source.duration);
  const timestamps = requestedTimestamps
    ? [...new Set(requestedTimestamps.split(",").map((value) => Number(value.trim())))]
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= 0 && timestamp < source.duration)
        .sort((a, b) => a - b)
        .map((timestamp) => Number(timestamp.toFixed(3)))
    : [];
  if (requestedTimestamps && timestamps.length === 0) {
    throw new Error("--timestamps must contain at least one in-range number");
  }
  if (!requestedTimestamps) {
    if (!Number.isFinite(end) || end <= start) throw new Error("--end must be greater than --start");
    for (let timestamp = start; timestamp < end - 0.01; timestamp += interval) {
      timestamps.push(Number(timestamp.toFixed(3)));
    }
  }

  const files = [];
  for (const [index, timestamp] of timestamps.entries()) {
    const filename = `frame-${String(index).padStart(4, "0")}-${timestamp.toFixed(2).padStart(7, "0")}s.jpg`;
    const destination = resolve(output, filename);
    try {
      await access(destination);
      files.push({ index, seconds: timestamp, file: filename });
      continue;
    } catch {
      // Missing frames continue through normal extraction.
    }

    let seekError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await video.evaluate(async (element, target) => {
          element.muted = true;
          element.pause();
          if (Math.abs(element.currentTime - target) < 0.025 && element.readyState >= 2) return;
          element.currentTime = target;
          await element.play().catch(() => undefined);
          await new Promise((resolveSeek, rejectSeek) => {
            const started = performance.now();
            const check = () => {
              if (Math.abs(element.currentTime - target) < 0.15 && element.readyState >= 2) {
                element.pause();
                resolveSeek();
                return;
              }
              if (performance.now() - started >= 5_000) {
                rejectSeek(new Error(`Seek timeout at ${target}s`));
                return;
              }
              setTimeout(check, 50);
            };
            check();
          });
        }, timestamp);
        seekError = undefined;
        break;
      } catch (error) {
        seekError = error;
        console.warn(`Seek retry ${attempt}/4 at ${timestamp.toFixed(1)}s: ${error.message}`);
        if (attempt < 4) {
          const retryUrl = new URL(url);
          retryUrl.searchParams.set("t", `${Math.floor(timestamp)}s`);
          await page.goto(retryUrl.href, { waitUntil: "domcontentloaded", timeout: 60_000 });
          video = await waitForVideo();
        }
      }
    }
    if (seekError) throw seekError;
    await page.waitForTimeout(100);

    const box = await video.boundingBox();
    if (!box) throw new Error(`Video has no visible bounds at ${timestamp}s`);
    const mediaRatio = source.width / source.height;
    const boxRatio = box.width / box.height;
    const content = boxRatio > mediaRatio
      ? { x: box.x + (box.width - box.height * mediaRatio) / 2, y: box.y, width: box.height * mediaRatio, height: box.height }
      : { x: box.x, y: box.y + (box.height - box.width / mediaRatio) / 2, width: box.width, height: box.width / mediaRatio };

    await page.screenshot({
      path: destination,
      clip: content,
      type: "jpeg",
      quality: 90,
    });
    files.push({ index, seconds: timestamp, file: filename });
    if ((index + 1) % 25 === 0 || index === timestamps.length - 1) {
      console.log(`Extracted ${index + 1}/${timestamps.length} frames (${timestamp.toFixed(1)}s)`);
    }
  }

  const thumbWidth = 150;
  const sheetPage = await browser.newPage({ viewport: { width: columns * thumbWidth, height: 800 } });
  for (let sheetStart = 0; sheetStart < files.length; sheetStart += sheetSize) {
    const pageFiles = files.slice(sheetStart, sheetStart + sheetSize);
    const cells = await Promise.all(pageFiles.map(async (entry) => {
      const image = await readFile(resolve(output, entry.file));
      return `<figure><img src="data:image/jpeg;base64,${image.toString("base64")}" alt="${entry.seconds.toFixed(0)} seconds"><figcaption>${entry.seconds.toFixed(0)}s</figcaption></figure>`;
    }));
    const sheetEnd = sheetStart + pageFiles.length - 1;
    await sheetPage.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;background:#0c1020}main{width:${columns * thumbWidth}px;display:grid;grid-template-columns:repeat(${columns},${thumbWidth}px)}figure{margin:0;background:#111629}img{display:block;width:${thumbWidth}px;height:auto}figcaption{height:28px;padding:5px 8px;color:#fff;font:15px/18px Arial,sans-serif}</style><main>${cells.join("")}</main>`);
    const sheetBounds = await sheetPage.locator("main").boundingBox();
    if (!sheetBounds) throw new Error(`Could not measure contact sheet ${sheetStart}`);
    await sheetPage.screenshot({
      path: resolve(output, `contact-sheet-${String(sheetStart).padStart(4, "0")}-${String(sheetEnd).padStart(4, "0")}.jpg`),
      clip: sheetBounds,
      type: "jpeg",
      quality: 88,
    });
  }
  await sheetPage.close();

  await writeFile(resolve(output, "metadata.json"), JSON.stringify({
    sourceUrl: url,
    title,
    durationSeconds: source.duration,
    sourceWidth: source.width,
    sourceHeight: source.height,
    startSeconds: start,
    endSeconds: end,
    intervalSeconds: interval,
    requestedTimestamps: requestedTimestamps ? timestamps : undefined,
    frameCount: files.length,
    frames: files,
  }, null, 2), "utf8");
  console.log(`Saved ${files.length} frames and ${Math.ceil(files.length / sheetSize)} contact sheets to ${output}`);
} finally {
  await browser.close();
}
