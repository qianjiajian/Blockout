import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const file='docs/rules/manifest.json',raw=fs.readFileSync(file,'utf8'),m=JSON.parse(raw);
assert.equal(m.activeVersion,'1.107.0');
const root='deliverables/remake191-200-20260927';fs.mkdirSync(root,{recursive:true});
const document='docs/rules/mechanism-rules-v1.108.0.md';
const content=`# Block Out! 191–200有限求解与重新生成 v1.108.0

- Rule ID: blockout-rules-v1.108.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.107.0；仅增加191–200本轮换色换形迭代授权。

## 用户指令与执行差异

用户在191–200任务明确：“继续，当求解遇到下限或者上限一直不满足条件时，不要一直求解下去，请通过更换色块颜色、色块种类等方式重新生成关卡”。继续以正式关卡完成为目标。每个候选记录指纹、有限求解预算和真实结果；反复不能满足上下界、持续UNKNOWN或没有完整路线时，更换颜色、合法块形及必要排布，生成新图并重新验证，不无限增加同一失败候选的搜索预算。

允许为可解性和难度调整已知来源色块颜色、种类及相应形状，不只限于容量冲突。来源原值与原创设计差异逐项分列；调整仍维护外壳、星、钥匙、轴向等机制绑定和真实库存，不冒称竞品精确复制。具体预算由实施选择并记录，不冒称用户指定数字。

## 保留合同

仅191–200适用。保v1.45基线棋盘width/height/playable/blocked/seams、关号、名字、原时限、实际三星目标、历史reward/par；保已知机关种类、数量、初值与真实隐藏/FIFO库存。既有硬规则冲突仍作最小必要适配并留证；不因求解失败或工具限制删机关、删库存、降低难度或将未知来源写成确证。

顺延档位为191普通、192困难、193简单、194普通、195困难、196简单、197普通、198超难、199简单、200彩格首教简单。四档仍为5–10/11–15/16–20/21–30，须同一新图有效fresh下界与完整无道具路线同时达标。200首教不消耗待顺延普通位，不新增201。预算耗尽、放宽图捷径或绕路均不是难度PASS，无新增难度或来源豁免。

新图采用已有v1.5。保原向完整素材、原创对齐、开局与每个真实隐藏层满铺、开局相邻异色、生成器固定全FIFO/落点及队列相邻异色与禁冰、轴向完整矩形、出口颜色唯一及整形扫掠/门宽、彩格与壳互斥、异形比例、解锁和机制公平性。不得改变共享运行时、UI、美术资源、账户或玩家存档。

## 接入与证据

继续自主分批正式接入授权。逐关核来源/原创差异、空间/原向/机关、完整路线、适用下界和机制决策，候选实际输入通过后验最终LEVELS双屏Pointer与自然时钟。未通过者保旧正式图；原评分冲突单列，不擅改评价。其它190关及并行成果、旧候选与失败/UNKNOWN证据保持，不改签。程序验收不冒充真人盲测或手机实测，不打包上传发布。登记本指令不是关卡生成或验收完成。
`;
fs.writeFileSync(document,content,{flag:'wx'});
m.activeVersion='1.108.0';m.versions.push({version:'1.108.0',ruleId:'blockout-rules-v1.108.0',runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:rulesDigest(content),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户要求继续191–200，上下界持续未满足时有限求解后换色换形与布局重新生成；保棋盘/机关库存/评分/四档与全部fresh验收，其它190及存档保持，不发布。'});
const agentsRaw=fs.readFileSync('AGENTS.md','utf8');let agents=agentsRaw.replace(/^当前活动规则：.*$/m,'当前活动规则：`docs/rules/mechanism-rules-v1.108.0.md`。191–200有限求解未达上下界时换色换形重新生成；其余承继v1.107，活动版本以manifest为准。').replace(/^2\. 完整阅读该版本文档。.*$/m,'2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.108.0.md`（191–200有限求解后换色换形，保棋盘/机关/评价/四档与完整验收；其余承继v1.107）。');
agents=agents.replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.108优先：191–200上下界持续未达时有限求解后换色换形及必要布局重新生成，来源与设计差异分列。保棋盘/机关库存/原评分/四档，完整fresh上下界及最终双屏Pointer自然钟后自主接入，其它190/旧证据/存档保持，不发布。');
assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent manifest change');assert.equal(fs.readFileSync('AGENTS.md','utf8'),agentsRaw,'Concurrent AGENTS change');
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');fs.writeFileSync('AGENTS.md',agents);
const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));assert.deepEqual(m.versions.slice(0,-1),JSON.parse(raw).versions);
fs.writeFileSync(root+'/registration.json',JSON.stringify({before:lock.activeVersion,after:after.activeVersion,versions:after.verified.length,oldEntriesUnchanged:true,entry:m.versions.at(-1)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({active:after.activeVersion,versions:after.verified.length}));
