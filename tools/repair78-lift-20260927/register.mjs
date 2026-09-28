import fs from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { digest } from '../revised-preview-validation-v160.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
const root='deliverables/repair78-lift-20260927';
fs.mkdirSync(root,{recursive:true});
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.103.0');
const manifestPath='docs/rules/manifest.json',raw=fs.readFileSync(manifestPath,'utf8'),manifest=JSON.parse(raw);
const document='docs/rules/mechanism-rules-v1.104.0.md';
const body=`# Block Out! 第78关升降隐藏层死锁修复 v1.104.0

- Rule ID: blockout-rules-v1.104.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.103.0；本次仅修复第78关已复现的升降隐藏层死锁。

## 用户指令与问题

用户提供第78关升降后残局，已从正式初态合法复现：剩余青S、红L4、蓝H3及黄L3/粉H2两冰1，只有蓝块8个可达位置，无法产生任何清除。证据deliverables/diagnose78-lift-20260927/。原37拖获胜路线只能证明有一个可解顺序，不证明其它顺序无死锁。用户获知结论后明确“修复”。

## 最小实施范围

本次优先只重排第78关lift的5×3真实隐藏层内六块，保持其原向形状、颜色、两块冰的初值3、总15格满铺及已知机制。若单纯重排不能修复，所需区域内最小普通块形色适配必须分列实际差异与理由，不能当作来源精确复制。修复不得靠要求玩家保留外部色块、减少冰数、隐藏冰提前减数或改变共享运行语义。

保留7×9十字39格棋盘、全部13个开局块、出口及门计数、升降区域与触发、关号名字、困难标签16–20、180秒时限、37拖/129秒三星、reward195/par35及既有v1.4运行档案。区域外块、其它199关、运行时/UI/素材/账户/玩家存档均不因本次更改。原向完整素材、同色邻接、隐藏逐层满铺和所有硬规则保持。

## 验收与接入

新图须fresh完整无道具路线、有效难度上下界、空间/来源差异/机制/原向素材验收；旧图证明不套新图。重点回归已复现坏顺序、晚揭层且外部全部清空，以及隐藏层不同清除顺序。隔离隐藏层穷尽与正式初态可达路线分别记录，不把有限UNKNOWN或单一路线写成无死锁。若全状态范围没有覆盖须明确边界。

验证通过后按既有自主修复范围接入仅第78关，并对最终正式对象运行双屏真实Pointer、自然时钟与三星结算；额外用外部提前清空的路线验证修复。旧证据保留，不修改其结论或校验值。本次不重新打包、上传或发布。
`;
fs.writeFileSync(document,body,{flag:'wx'});
assert.equal(fs.readFileSync(manifestPath,'utf8'),raw,'Concurrent manifest change: stop before overwrite');
manifest.activeVersion='1.104.0';manifest.versions.push({version:'1.104.0',ruleId:'blockout-rules-v1.104.0',runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:digest(body),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户要求修复78升降后死锁；最小隐藏层重排，保开局/出口/冰初值/评分/困难档与其它199，晚揭层和0外部帮助回归及完整新验收后接入，不打包发布。'});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');assert(verifyRulesLock().ok);
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts'; export {levelStarTargets} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const levels=JSON.parse(JSON.stringify(api.LEVELS)),bindings={};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else bindings[p]=digest(fs.readFileSync(p));}}
walk('src');for(const p of [manifestPath,document])bindings[p]=digest(fs.readFileSync(p));
const level=levels[77];assert.equal(digest(level),'3286acfbbc7d772e838400a9af8b121cbacbd5ee42481cdccbeaabe5039c6fc7');
fs.writeFileSync(root+'/before.json',JSON.stringify({createdAt:new Date().toISOString(),ruleVersion:'1.104.0',priorLevels:levels,level,levelSha256:digest(level),campaignSha256:digest(levels),stars:api.levelStarTargets(level),bindings},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/registration.json',JSON.stringify({document,documentSha256:digest(body),previousManifestSha256:digest(raw),previousVersions:JSON.parse(raw).versions,beforeSha256:digest(fs.readFileSync(root+'/before.json')),locked:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({activeVersion:'1.104.0',locked:true,baseline:root+'/before.json',levelSha256:digest(level)}));
