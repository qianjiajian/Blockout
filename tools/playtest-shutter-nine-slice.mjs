import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const output = resolve(process.env.PLAYTEST_OUTPUT ?? `playtest-results/shutter-nine-slice-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const url = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1140, height: 1060 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/__shutter-nine-slice-gallery__', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <meta charset="utf-8"><style>body{margin:0;background:#19153d;color:white;font:18px sans-serif}h2{margin:20px}canvas{display:block}</style>
    <h2>卷帘九宫格：固定四角，只延展边条</h2><canvas width="1140" height="1000"></canvas><script type="module">
    import { drawRevisedRegion } from '/src/game/revisedMechanismDrawing.ts';
    import { SHUTTER_NINE_SLICE_URLS, shutterFrameScale } from '/src/game/shutterNineSlice.ts';
    import { sampleRevisedRegionAnimation } from '/src/game/revisedRegionAnimation.ts';
    const images = Object.fromEntries(await Promise.all(Object.entries(SHUTTER_NINE_SLICE_URLS).map(async ([k,p]) => {
      const i = new Image(); const wait = new Promise((ok,no)=>{i.onload=ok;i.onerror=no}); i.src='/'+p; await wait; return [k,i];
    })));
    const ctx=document.querySelector('canvas').getContext('2d'), draw=ctx.drawImage.bind(ctx), calls=[]; let label;
    ctx.drawImage=(image,...args)=>{calls.push({label,src:image.src,args});draw(image,...args)};
    const cell=64, scale=shutterFrameScale(cell), inset=Math.max(2,cell*.035);
    const samples=[['3×3',30,45,3,3],['5×3',255,45,5,3],['2×5',620,45,2,5],['1×5',785,45,1,5],
      ['3×1',900,45,3,1],['1×1',900,170,1,1],['8×2',30,470,8,2],['开启中',610,470,5,3],['6×1',30,730,6,1]];
    for(const [name,x,y,w,h] of samples){label=name;ctx.font='18px sans-serif';ctx.fillStyle='#fbeaa9';ctx.fillText(name,x,y-14);
      const rect={x:x+inset,y:y+inset,width:w*cell-2*inset,height:h*cell-2*inset};
      ctx.fillStyle='#322853';ctx.fillRect(x,y,w*cell,h*cell);
      for(let row=0;row<h;row++)for(let col=0;col<w;col++){
        ctx.fillStyle=(row+col)%2?'#1553ba':'#af233b';ctx.fillRect(x+col*cell+3,y+row*cell+3,cell-6,cell-6);
      }
      const sample=name==='开启中'?{...sampleRevisedRegionAnimation('shutter',0),openProgress:.5,counterScale:0}:undefined;
      drawRevisedRegion(ctx,rect,'shutter',{shutter:images,shutterScale:scale},sample,6);
    }
    window.__NINE_SLICE__={calls,scale,samples};
    </script>` }));
  await page.goto(new URL('__shutter-nine-slice-gallery__', url).href);
  await page.waitForFunction(() => window.__NINE_SLICE__);
  const evidence = await page.evaluate(() => window.__NINE_SLICE__);
  const expected = { 'top-left': [86,78], 'top-right': [80,78], 'bottom-left': [86,84], 'bottom-right': [80,84] };
  for (const [name] of evidence.samples) {
    const calls = evidence.calls.filter(c => c.label === name);
    assert.equal(calls.length, 9, `${name}: all original pieces drawn`);
    for (const [part, dims] of Object.entries(expected)) {
      const c = calls.find(c => c.src.endsWith(`/${part}.png`));
      assert(c, `${name}: ${part}`);
      for (const axis of [0,1]) assert(Math.abs(c.args[2+axis]-dims[axis]*evidence.scale)<1e-8);
    }
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(output,'gallery.png') });
  await writeFile(resolve(output,'report.json'),JSON.stringify({pass:true,note:'Isolated actual renderer, nine sizes including one-cell-wide/high and halfway open; no game save touched.',evidence,errors},null,2));
  console.log(JSON.stringify({pass:true,output,layouts:evidence.samples.length}));
} finally { await browser.close(); }
