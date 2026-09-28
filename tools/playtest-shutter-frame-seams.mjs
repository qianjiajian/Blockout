import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Isolated real-Canvas pixel regression; no game instance, storage or level data.
// Read the transparent frame before adding the comparison image's background:
// an opaque backdrop would incorrectly hide the cut-edge alpha regression.
const root = fileURLToPath(new URL('../', import.meta.url));
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const output = path.resolve(root, `playtest-results/shutter-frame-seams-${stamp}`);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bindings = {};
async function bind(file) {
  const hash = sha(await readFile(path.resolve(root, file)));
  if (bindings[file]) assert.equal(hash, bindings[file], `Source drift: ${file}`);
  bindings[file] = hash;
}
const moduleBuild = await build({ entryPoints: [path.resolve(root, 'src/game/shutterNineSlice.ts')],
  bundle: true, write: false, platform: 'browser', format: 'esm', metafile: true });
for (const file of Object.keys(moduleBuild.metafile.inputs)) await bind(file);
await bind('tools/playtest-shutter-frame-seams.mjs');
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><meta charset="utf-8"><title>Shutter frame seam pixel regression</title>');
    } else if (url.pathname === '/frame.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(moduleBuild.outputFiles[0].text);
    } else {
      const relative = decodeURIComponent(url.pathname).slice(1);
      assert(/^assets\/art\/gameplay\/mechanics\/shutter-nine-slice-v1\/[a-z-]+\.png$/.test(relative), 'Unexpected image request');
      await bind(`public/${relative}`);
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(await readFile(path.resolve(root, 'public', relative)));
    }
  } catch (error) { res.writeHead(404).end(String(error)); }
});
const fixtures = [
  { name: 'long-wide-reported', rect: { x: 8.32, y: 5.24, width: 980.17, height: 140.9 }, scale: 0.36 },
  { name: 'long-tall', rect: { x: 7.67, y: 8.31, width: 140.9, height: 980.17 }, scale: 0.36 },
  { name: 'reference-square', rect: { x: 8.32, y: 5.24, width: 295, height: 292 }, scale: 1 },
  { name: 'compact-wide', rect: { x: 5.17, y: 8.63, width: 231.45, height: 41.37 }, scale: 0.207 },
  { name: 'compact-tall', rect: { x: 8.63, y: 5.17, width: 41.37, height: 231.45 }, scale: 0.207 },
  { name: 'single-cell', rect: { x: 6.37, y: 5.81, width: 28.73, height: 28.73 }, scale: 28.73 / 180 },
];
const report = { scope: 'Transparent Chromium Canvas, real production drawShutterFrame, unchanged PNGs; not native-device or gameplay coverage',
  output: path.relative(root, output), threshold: 250, bindings, scenarios: [], errors: [] };
let browser;
await mkdir(output, { recursive: false });
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: dpr });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    for (const fixture of fixtures) {
      const result = await page.evaluate(async ({ fixture, dpr, threshold }) => {
        const { SHUTTER_NINE_SLICE_URLS, shutterFramePieces, drawShutterFrame } = await import('/frame.js');
        const images = Object.fromEntries(await Promise.all(Object.entries(SHUTTER_NINE_SLICE_URLS).map(async ([part, source]) => {
          const image = new Image(); image.src = '/' + source; await image.decode(); return [part, image];
        })));
        const { rect, scale } = fixture;
        const width = Math.ceil(rect.x + rect.width + 10), height = Math.ceil(rect.y + rect.height + 10);
        const rendered = {};
        for (const implementation of ['old-entire-edge-stretch', 'production-cropped-underlap']) {
          const canvas = document.createElement('canvas'); canvas.width = width * dpr; canvas.height = height * dpr;
          const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.scale(dpr, dpr);
          if (implementation === 'production-cropped-underlap') drawShutterFrame(ctx, rect, images, scale);
          else for (const piece of shutterFramePieces(rect, scale)) {
            ctx.drawImage(images[piece.part], piece.x, piece.y, piece.width, piece.height);
          }
          const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const read = (x, y) => [...rgba.subarray((y * canvas.width + x) * 4, (y * canvas.width + x) * 4 + 4)];
          // Sample the gold's centreline around each of the eight joints, not
          // the intentionally antialiased outer silhouette.
          // A device pixel is centred at index + 0.5: floor chooses the pixel
          // containing the requested centreline, whereas round can shift a
          // three-pixel-wide frame onto its intentionally translucent inner rim.
          // At both DPRs all dimensions remain fractional in logical coordinates.
          const lines = [
            { edge: 'top', horizontal: true, fixed: Math.floor((rect.y + 9 * scale) * dpr),
              start: (rect.x + 35 * scale) * dpr, end: (rect.x + rect.width - 35 * scale) * dpr },
            { edge: 'bottom', horizontal: true, fixed: Math.floor((rect.y + rect.height - 10 * scale) * dpr),
              start: (rect.x + 35 * scale) * dpr, end: (rect.x + rect.width - 35 * scale) * dpr },
            { edge: 'left', horizontal: false, fixed: Math.floor((rect.x + 9 * scale) * dpr),
              start: (rect.y + 35 * scale) * dpr, end: (rect.y + rect.height - 35 * scale) * dpr },
            { edge: 'right', horizontal: false, fixed: Math.floor((rect.x + rect.width - 10 * scale) * dpr),
              start: (rect.y + 35 * scale) * dpr, end: (rect.y + rect.height - 35 * scale) * dpr },
          ];
          const joints = lines.flatMap(line => {
            const piece = shutterFramePieces(rect, scale).find(piece => piece.part === line.edge);
            const image = images[line.edge];
            // Independent straight-arm control, drawn without either corner.
            // Keep the SAME source minification and destination coordinates:
            // extracting a 1px-long middle row would change Canvas filtering and
            // falsely turn the tiny arm's intrinsic 248 alpha into 254.
            const control = document.createElement('canvas'); control.width = canvas.width; control.height = canvas.height;
            const controlCtx = control.getContext('2d', { willReadFrequently: true }); controlCtx.scale(dpr, dpr);
            const underlap = Math.min(2, 24 * scale);
            if (line.horizontal) controlCtx.drawImage(image, 2, 0, image.width - 4, image.height,
              piece.x - underlap, piece.y, piece.width + underlap * 2, piece.height);
            else controlCtx.drawImage(image, 0, 2, image.width, image.height - 4,
              piece.x, piece.y - underlap, piece.width, piece.height + underlap * 2);
            const midpoint = Math.floor((line.horizontal ? piece.x + piece.width / 2 : piece.y + piece.height / 2) * dpr);
            const controlAlpha = controlCtx.getImageData(line.horizontal ? midpoint : line.fixed,
              line.horizontal ? line.fixed : midpoint, 1, 1).data[3];
            const anchors = line.horizontal
              ? [rect.x + 85 * scale, rect.x + rect.width - 79 * scale]
              : line.edge === 'left'
                ? [rect.y + 77.5 * scale, rect.y + rect.height - 82 * scale]
                : [rect.y + 77 * scale, rect.y + rect.height - 83 * scale];
            const stretchedEndpoint = (line.horizontal ? piece.width / image.width : piece.height / image.height) * 2;
            const radius = Math.max(3, 24 * scale, stretchedEndpoint) * dpr;
            return anchors.map((anchor, index) => {
              const start = Math.max(line.start, anchor * dpr - radius), end = Math.min(line.end, anchor * dpr + radius);
              const samples = [];
              for (let at = Math.ceil(start); at < end; at++) {
                const x = line.horizontal ? at : line.fixed, y = line.horizontal ? line.fixed : at;
                samples.push({ x, y, rgba: read(x, y) });
              }
              const minAlpha = Math.min(...samples.map(pixel => pixel.rgba[3]));
              return { joint: `${line.edge}-${index ? 'end' : 'start'}`, sampleCount: samples.length,
                controlAlpha, deficitAgainstStraightArm: controlAlpha - minAlpha,
                deviceThickness: (line.horizontal ? piece.height : piece.width) * dpr,
                minAlpha,
                belowThreshold: samples.filter(pixel => pixel.rgba[3] < threshold) };
            });
          });
          rendered[implementation] = { canvas, joints, minAlpha: Math.min(...joints.map(joint => joint.minAlpha)) };
        }
        const columns = width <= height ? 2 : 1, rows = columns === 1 ? 2 : 1;
        const comparison = document.createElement('canvas'); comparison.width = (width * columns + 20) * dpr;
        comparison.height = (height * rows + rows * 30 + 10) * dpr;
        const ctx = comparison.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = '#19153d';
        ctx.fillRect(0, 0, comparison.width / dpr, comparison.height / dpr);
        for (const [index, [implementation, value]] of Object.entries(rendered).entries()) {
          const x = 10 + (columns === 2 ? index * width : 0), y = 25 + (rows === 2 ? index * (height + 30) : 0);
          ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
          ctx.fillText(`${implementation} / min alpha ${value.minAlpha}`, x, y - 7);
          ctx.drawImage(value.canvas, x, y, width, height);
        }
        return { name: fixture.name, dpr, rect, scale, implementations: Object.fromEntries(Object.entries(rendered)
          .map(([name, value]) => [name, { minAlpha: value.minAlpha, joints: value.joints }])),
          png: comparison.toDataURL('image/png') };
      }, { fixture, dpr, threshold: report.threshold });
      const { png, ...record } = result;
      record.comparison = `${fixture.name}-dpr${dpr}.png`;
      await writeFile(path.join(output, record.comparison), Buffer.from(png.split(',')[1], 'base64'));
      report.scenarios.push(record);
      console.log(`${fixture.name} DPR${dpr}: old=${record.implementations['old-entire-edge-stretch'].minAlpha}, new=${record.implementations['production-cropped-underlap'].minAlpha}`);
    }
    await context.close();
  }
  for (const file of Object.keys(bindings)) await bind(file);
  assert.deepEqual(report.errors, []);
  for (const row of report.scenarios) {
    const current = row.implementations['production-cropped-underlap'];
    assert.equal(current.joints.length, 8);
    assert(current.joints.every(joint => joint.sampleCount > 0), `${row.name} DPR${row.dpr}: every joint must be probed`);
    for (const joint of current.joints) {
      if (joint.deviceThickness < 4) {
        // At DPR1 a one-cell cover's 3.19px left arm has alpha 248 even
        // in this independently rendered seam-free control. Keep the 250
        // absolute gate everywhere else; here test the local seam deficit.
        assert(joint.controlAlpha >= 240, `${row.name}: thin-arm control must remain meaningfully opaque`);
        assert(joint.deficitAgainstStraightArm <= 3,
          `${row.name} DPR${row.dpr} ${joint.joint}: seam alpha falls ${joint.deficitAgainstStraightArm} below its same-thickness straight-arm control`);
      } else assert(joint.minAlpha >= report.threshold,
        `${row.name} DPR${row.dpr} ${joint.joint}: new frame centreline alpha ${joint.minAlpha} < ${report.threshold}`);
    }
  }
  for (const dpr of [1, 2]) {
    const control = report.scenarios.find(row => row.name === 'long-wide-reported' && row.dpr === dpr);
    assert(control.implementations['old-entire-edge-stretch'].minAlpha <= 210,
      `DPR${dpr}: old implementation must visibly fail the exact same pixel probes`);
  }
  const tinyOld = report.scenarios.find(row => row.name === 'single-cell' && row.dpr === 1)
    .implementations['old-entire-edge-stretch'];
  assert(tinyOld.joints.some(joint => joint.deficitAgainstStraightArm > 3),
    'Thin-arm relative control must also reject the old implementation, not merely pass both versions');
  report.thinArmProbe = 'Only <4 device-pixel thickness uses minAlpha >= independently rendered same-thickness straight-arm alpha - 3; control alpha must be >=240. All larger arms require >=250. Old single-cell must fail the relative control.';
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; console.error(error);
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({ output: report.output, status: report.status, scenarios: report.scenarios.length }));
}
