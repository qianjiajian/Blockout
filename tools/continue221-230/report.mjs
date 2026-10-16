import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { digest } from '../revised-preview-validation-v160.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

const lock = verifyRulesLock();
assert(lock.ok);
const root = 'deliverables/continue221-230-20260930';
const read = file => JSON.parse(fs.readFileSync(file));
const status = read(root + '/status.json');
assert.equal(status.qualified, 10);
assert.deepEqual(status.rows.map(row => row.id), Array.from({ length: 10 }, (_, i) => 221 + i));
const compiled = await build({ stdin: { resolveDir: process.cwd(), contents: "export {levelStarTargets} from './src/core/levelStarConditions'; export {REMADE_221_230_LEVELS} from './src/core/remake221to230';" }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { levelStarTargets, REMADE_221_230_LEVELS } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const names = { easy: '简单', normal: '普通', hard: '困难', super: '超难' };
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] };
const qaNine = read(root + '/qa-nine.json');
assert(qaNine.passed);
const qa224 = read(root + '/qa-224.json');
assert(qa224.passed);
const rows = status.rows.map(row => {
  const packet = read(row.headlessPacket), level = packet.level;
  const independent = [...qaNine.rows, ...qa224.rows].find(r => r.id === row.id);
  assert(independent?.passed);
  assert.equal(independent.levelSha256, row.levelSha256);
  assert.equal(independent.routeSha256, row.routeSha256);
  assert.equal(digest(REMADE_221_230_LEVELS.find(l => l.id === row.id)), row.levelSha256);
  assert.equal(digest(level), row.levelSha256);
  assert.equal(digest(packet.drags), row.routeSha256);
  const band = bands[level.difficulty];
  assert(row.lowerBound >= band[0] && row.upperBound <= band[1] && row.lowerBound <= row.upperBound);
  const stars = levelStarTargets(level);
  assert.equal(stars.moveTarget, packet.drags.length);
  const small = row.pointer.find(p => p.viewport.width === 320);
  const opening = path.dirname(small.file) + `/lv${row.id}-opening.png`;
  assert(fs.existsSync(opening));
  return { ...row, name: level.name, difficulty: names[level.difficulty], requiredBand: band, starMoves: stars.moveTarget, starSeconds: stars.timeTargetSeconds, timeLimitSeconds: level.timeSeconds, opening, adaptation: level.mechanismAdaptation, sourceNotes: qaNine.rows.find(r => r.id === row.id)?.notes ?? [], actualThreeStarsBothViewports: row.pointer.every(p => p.earnedStars === 3) };
});
const summary = { createdAt: new Date().toISOString(), activeRule: lock.activeVersion, governingRule: '1.121.0', status: 'TEN_QUALIFIED_ISOLATED_CANDIDATES', qualified: 10, productionBoundary: 200, formalAdopted: false, published: false, humanBlindTested: false, rows };
fs.writeFileSync(root + '/completion.json', JSON.stringify(summary, null, 2) + '\n');
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const link = (file, label) => `<a href="${esc(relative(file))}">${esc(label)}</a>`;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>221–230 关卡验收</title>
<style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;background:#f3f5fa;color:#20253c;margin:0}main{max-width:1200px;margin:auto;padding:32px 24px}h1{margin:0}p{max-width:1000px}a{color:#3a43c9}table{border-collapse:collapse;width:100%;background:white}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e0e3ef}th{background:#e5e8f7}.scroll{overflow:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;margin-top:24px}article{background:#fff;border-radius:12px;overflow:hidden;padding:14px}article img{display:block;width:100%;max-width:240px;margin:auto}article h2{margin:0 0 8px;font-size:19px}article p{font-size:14px;margin:8px 0}details{margin-top:14px;font-size:13px}summary{cursor:pointer;color:#3a43c9}.badge{display:inline-block;background:#e0f2e8;color:#126844;border-radius:20px;padding:3px 12px}.small{font-size:13px;color:#525b73}code{word-break:break-all}</style>
<main><h1>221–230 关卡验收</h1><p class="badge">10 / 10 隔离候选完成</p><p>采用简单／普通／普通／困难／简单／普通／困难／简单／普通／超难节奏。必挪指非清除、非剥层的有效拖动；L 是已证明下界，U 是完整无道具路线中的必挪次数，真实最少值位于 L–U，未宣称精确最优。三星同时要求通关、总拖不超过目标、用时不超过时间星。</p><p>十关均通过原向实文件、开局与隐藏满铺、完整库存、fresh 下界与完整路线，以及 320×568、496×1078 双屏实际 Pointer、自然计时、三星结算。根据用户授权，失败候选在固定预算后换色、换形或重排；来源事实与原创适配分列。生产活动边界仍为 200，未正式接入或发布，未访问真实玩家存档；真人盲测未进行。</p>
<div class="scroll"><table><thead><tr><th>关卡</th><th>难度</th><th>要求</th><th>证明 L–U</th><th>三星总拖</th><th>时间星 / 总时限</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="#lv${r.id}">${r.id}</a></td><td>${r.difficulty}</td><td>${r.requiredBand.join('–')}</td><td>${r.lowerBound}–${r.upperBound}</td><td>${r.starMoves}</td><td>${r.starSeconds} / ${r.timeLimitSeconds} 秒</td></tr>`).join('')}</tbody></table></div>
<p class="small">证据索引：${link(root + '/completion.json', '完成汇总')} · ${link(root + '/status.json', '逐关哈希与操作记录')} · ${link(root + '/qa-nine.json', '九关独立复核')} · ${link(root + '/qa-224.json', '224 独立复核')}</p>
<section class="cards">${rows.map(r => `<article id="lv${r.id}"><h2>${r.id} · ${r.difficulty}</h2><img src="${esc(relative(r.opening))}" alt="第${r.id}关实际开局"><p>必挪 ${r.lowerBound}–${r.upperBound} · 三星 ${r.starMoves} 拖</p><p>${link(r.headlessPacket, '关卡与完整路线')}<br>${r.pointer.map(p => link(p.file, `${p.viewport.width}×${p.viewport.height} 操作验收`)).join(' · ')}</p><details><summary>来源适配及对象指纹</summary><p>${esc(r.adaptation?.change ?? '详见关卡包来源记录。')}</p>${r.sourceNotes.filter(n => typeof n === 'object').map(n => `<p>${esc(n.detail ?? n.correction)}</p>`).join('')}<p>Level SHA256：<code>${esc(r.levelSha256)}</code></p></details></article>`).join('')}</section></main></html>`;
fs.writeFileSync(root + '/index.html', html);
console.log(JSON.stringify({ qualified: rows.length, report: root + '/index.html', rows: rows.map(({ id, lowerBound, upperBound, starMoves, starSeconds, timeLimitSeconds }) => ({ id, lowerBound, upperBound, starMoves, starSeconds, timeLimitSeconds })) }));
