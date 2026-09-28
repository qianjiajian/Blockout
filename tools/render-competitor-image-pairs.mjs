import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

// Presentation-only: retain both source images without crops, labels or data tables.
const root = process.cwd();
const source = path.resolve(process.argv[2] ?? "deliverables/competitor-vs-ours-lv001-200-current-v168-20260927");
const output = path.resolve(process.argv[3] ?? "deliverables/competitor-image-pairs-v168-20260927");
const report = JSON.parse(await readFile(path.join(source, "comparison.json"), "utf8"));
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex").toUpperCase();
const relative = (file) => path.relative(root, file).replaceAll("\\", "/");
const height = 1078;
const gap = 8;
const verified = [];
await mkdir(path.join(output, "images"), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const record of report.levels) {
    const leftPath = path.resolve(root, record.competitor.image);
    const rightPath = path.resolve(source, record.ours.image);
    const buffers = await Promise.all([readFile(leftPath), readFile(rightPath)]);
    const expectedHashes = [record.competitor.sha256, record.ours.sha256];
    const images = await Promise.all(buffers.map(async (buffer, i) => {
      if (digest(buffer) !== expectedHashes[i].toUpperCase()) throw new Error(`Lv${record.level}: source image ${i} changed`);
      const metadata = await sharp(buffer).metadata();
      return { width: Math.round(metadata.width / metadata.height * height),
        sourceWidth: metadata.width, sourceHeight: metadata.height,
        url: `data:image/${metadata.format === "png" ? "png" : "jpeg"};base64,${buffer.toString("base64")}` };
    }));
    const width = images[0].width + gap + images[1].width;
    await page.setViewportSize({ width, height });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#100c2d;width:${width}px;height:${height}px}
      main{display:flex;gap:${gap}px;width:${width}px;height:${height}px}img{display:block;flex:none;height:${height}px;object-fit:contain}
      </style></head><body><main><img style="width:${images[0].width}px" src="${images[0].url}" alt="竞品"><img style="width:${images[1].width}px" src="${images[1].url}" alt="本游戏"></main></body></html>`);
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
    const imagePath = `images/level-${String(record.level).padStart(3, "0")}.png`;
    const pixels = await page.screenshot({ path: path.join(output, imagePath) });
    const result = await sharp(pixels).metadata();
    if (result.width !== width || result.height !== height) throw new Error(`Lv${record.level}: output dimensions mismatch`);
    verified.push({ level: record.level, image: imagePath, width, height, sha256: digest(pixels),
      competitorPlaceholder: record.competitor.placeholder,
      left: { path: relative(leftPath), sha256: expectedHashes[0], sourceWidth: images[0].sourceWidth, sourceHeight: images[0].sourceHeight },
      right: { path: relative(rightPath), sha256: expectedHashes[1], sourceWidth: images[1].sourceWidth, sourceHeight: images[1].sourceHeight } });
    if (record.level % 20 === 0) console.log(`paired ${record.level}/${report.levels.length}`);
  }
} finally { await browser.close(); }

const cards = verified.map((row) => `<article id="lv${row.level}" data-id="${row.level}"><h2>第 ${row.level} 关${row.competitorPlaceholder ? " · 竞品来源缺失" : ""}</h2><a href="${row.image}" target="_blank"><img loading="lazy" src="${row.image}" width="${row.width}" height="${row.height}" alt="第${row.level}关：左竞品，右本游戏"></a></article>`).join("\n");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>游戏图片对照</title><style>
  *{box-sizing:border-box}body{margin:0;background:#100c2d;color:#eee;font-family:system-ui,"Microsoft YaHei",sans-serif}header{position:sticky;top:0;background:#100c2df7;padding:16px 24px;border-bottom:1px solid #39325f;z-index:1}h1{font-size:23px;margin:0 0 8px}p{margin:4px 0;color:#b9b4d6}select,input{font:inherit;padding:7px 10px;margin:8px 8px 0 0;border-radius:6px;border:1px solid #665c98;background:#242043;color:white}main{max-width:1800px;margin:auto;padding:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:20px}article{min-width:0}article[hidden]{display:none}h2{font-size:17px;margin:0 0 9px;font-weight:500}img{width:100%;height:auto;display:block}a{display:block}#count{color:#b9b4d6;font-size:14px}
  </style></head><body><header><h1>游戏图片对照</h1><p>左侧：竞品　｜　右侧：本游戏</p><select id="range" aria-label="关卡范围"><option value="100">1–100关</option><option value="200">全部200关</option><option value="later">101–200关</option></select><input id="level" type="number" min="1" max="200" placeholder="输入关卡号" aria-label="关卡号"><span id="count"></span></header><main>${cards}</main><script>
  const cards=[...document.querySelectorAll('article')],range=document.querySelector('#range'),level=document.querySelector('#level');function filter(){let n=0;for(const c of cards){const id=Number(c.dataset.id);const ok=level.value?id===Number(level.value):range.value==='200'||(range.value==='100'?id<=100:id>100);c.hidden=!ok;if(ok)n++}document.querySelector('#count').textContent=n+' 关'}range.onchange=filter;level.oninput=filter;filter();
  </script></body></html>`;
await writeFile(path.join(output, "index.html"), html);
await writeFile(path.join(output, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sourceReport: relative(path.join(source, "comparison.json")), screenshotCapturedAt: report.generatedAt, campaignSemanticSha256: report.campaignSemanticSha256, layout: "left competitor; right ours; equal height, original aspect ratio; no crops, text or tables", imageCount: verified.length, images: verified }, null, 2) + "\n");
console.log(JSON.stringify({ output, count: verified.length, placeholders: verified.filter((row) => row.competitorPlaceholder).map((row) => row.level) }));
