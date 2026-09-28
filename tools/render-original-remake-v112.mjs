import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {loadRemakeApi,REMAKE_IDS,DATA_PATH} from './revised-original-remake-v112.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

const [archivePath,expectedSha]=process.argv.slice(2),bytes=fs.readFileSync(archivePath);
assert.equal(digest(bytes),expectedSha,'Pin adopted 30-level archive');
const archive=JSON.parse(bytes),lock=verifyRulesLock();assert(lock.ok && lock.activeVersion==='1.12.0');
assert.equal(digest(fs.readFileSync(DATA_PATH)),archive.expectedDataSha256);
const {api}=await loadRemakeApi();assert.equal(digest(api.LEVELS),archive.expectedCampaignSha256);
assert.deepEqual(archive.rows.map(r=>r.levelId),REMAKE_IDS);
const output=`deliverables/original-remake-30-v112-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`;
fs.mkdirSync(output,{recursive:true});
const report={status:'running',scope:'new 30 formal opening frames only',archivePath,archiveSha256:expectedSha,
  campaignSemanticSha256:digest(api.LEVELS),rows:[],errors:[],fullPointerReplay:false,releaseApproved:false};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,
  watch:{ignored:['**/deliverables/**','**/.codex-temp/**','**/playtest-results/**']}},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:496,height:1078}});
page.on('pageerror',e=>report.errors.push(e.message));
await page.addInitScript(()=>{
  window.__FORBIDDEN_STORAGE__=[];
  for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__FORBIDDEN_STORAGE__.push(m);throw Error('Persistent storage forbidden');};
});
try {
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/revised-formal-levels.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__REVISED_FORMAL_LEVELS__,undefined,{timeout:60000});
  for(const row of archive.rows) {
    const formal=api.LEVELS[row.levelId-1],art=api.auditCandidateBlockArt(formal);
    const entry=await page.evaluate(id=>window.__REVISED_FORMAL_LEVELS__.load(id),row.levelId);
    assert(entry.formalObjectIdentity);assert.deepEqual(entry.level,JSON.parse(JSON.stringify(formal)));
    await page.waitForFunction(req=>{
      const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();
      return d?.art.ready && d.art.revisedMechanisms.ready && !d.art.formalGameplay.requestedIceSignature
        && !d.art.formalGameplay.iceError && d.puzzle.started && !d.generatorSpawnAnimations.length && !d.revisedMechanismAnimations.length
        && req.every(({color,kind,shapeId})=>{const img=g.art.formalBlocks?.[color]?.[kind]?.[shapeId];return img && (img.naturalWidth||img.width)>0;});
    },art.requirements,{timeout:60000});
    const d=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
    assert(!d.puzzle.failed && !d.puzzle.complete,'Nonterminal formal opening');
    assert.deepEqual(d.art.formalGameplay.missingWholeBlockIds,[]);
    const coverage=auditOpeningCoverage(d.puzzle);assert(coverage.passed);
    assert.deepEqual(d.starTargets,api.levelStarTargets(formal));
    const image=`level-${String(row.levelId).padStart(3,'0')}.png`;
    await page.locator('canvas').screenshot({path:path.join(output,image)});
    report.rows.push({levelId:row.levelId,image,formalObjectIdentity:true,coverage,
      actualStarTargets:d.starTargets,remainingSeconds:d.puzzle.remainingSeconds,missingBlocks:[],theme:row.designSpec.theme,
      openingCount:coverage.visibleBlockCount,fullCount:formal.blocks.length,drags:row.drags.length});
    console.log(`formal opening Lv${row.levelId} captured`);
  }
  assert.deepEqual(await page.evaluate(()=>window.__FORBIDDEN_STORAGE__),[]);
  assert.deepEqual(report.errors,[]);
  assert.equal(digest(fs.readFileSync(DATA_PATH)),archive.expectedDataSha256,'Map changed during render');
  report.status='PASS';
} catch(error) {report.status='FAIL';report.error=error.stack;throw error;}
finally {
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await browser.close();await server.close();
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=report.rows.map(r=>`<article><h2>第${r.levelId}关</h2><a href="${r.image}"><img loading="lazy" src="${r.image}" alt="第${r.levelId}关正式开局"></a><p>${esc(r.theme)}</p><small>开局${r.openingCount}块 / 全关${r.fullCount}块 · 完成路线${r.drags}拖<br>满铺 / 每色唯一 / 正式入口绘制通过</small></article>`).join('\n');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>30关原创重做 · 正式开局</title><style>body{margin:24px;background:#15102d;color:#eee;font:16px system-ui}h1{font-size:26px}header{max-width:1000px;line-height:1.6;margin-bottom:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}article{padding:16px;background:#292044;border:1px solid #55436b;border-radius:16px}img{width:100%;border-radius:10px}h2{margin:0 0 12px}small{line-height:1.6;color:#a8ead9}a{color:#ffdf79}</style><header><h1>剩余30关：独立原创重做已接入</h1><p>总游戏200关，21–200共180关新版数据已齐。本页仅展示此次重做的30关，其他170关未变。每张图来自最终正式LEVELS与实际游戏绘制，不是示意图。</p><p>全部具有完整模型通关及正耗时路线。暂不考核必要腾挪下界；时间与三星沿用原值，未重新标定。本页不宣称竞品精确对齐，也不是自然时钟全程手势认证。</p><a href="/">打开游戏试玩</a> · <a href="report.json">正式开局记录</a></header><main>${cards}</main></html>`,{flag:'wx'});
console.log(JSON.stringify({status:report.status,output,levels:report.rows.length}));
