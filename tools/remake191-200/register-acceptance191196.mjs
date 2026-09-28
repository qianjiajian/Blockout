import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
import {ROOT,digest,writeNew} from './common.mjs';

const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const manifestPath='docs/rules/manifest.json',manifestRaw=fs.readFileSync(manifestPath,'utf8'),manifest=JSON.parse(manifestRaw);
assert.equal(manifest.activeVersion,'1.111.0');
const version='1.112.0',document='docs/rules/mechanism-rules-v'+version+'.md';
const files={191:ROOT+'/author191-193/ready191-1790525168324.json',196:ROOT+'/author194-196/candidate196-1790523269570.json'};
const candidates=Object.entries(files).map(([id,file])=>{const d=JSON.parse(fs.readFileSync(file));assert.equal(d.level.id,Number(id));return{id:Number(id),file,fileSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),routeSha256:digest(d.drags)};});
const content=`# Block Out! 第191、196关已展示候选正式接入 v1.112.0

- Rule ID: blockout-rules-v1.112.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-28
- 完整承继v1.111.0；仅接受191已验证原创开局和196三个翻门的具体设计初相。

## 用户接受的具体方案

用户在获知两关来源缺口、查看两张新候选开局截图和具体机制清单后明确要求“接入正式关卡”。本次采用刚展示的同一候选，不再等待重复许可；不将用户接受写成竞品原始资料已获确证。

191采用14个原向H3/V3、2壳（蓝→红、黄→蓝）、数字冰绿2/蓝3/蓝4、冰门蓝1/绿5/黄9及普通红门的原创配置，允许其替代旧正式191。原始竞品初态及完整源机制仍UNKNOWN，记USER_ACCEPTED_AUTHORED_OPENING。保持6×7满42格、普通档11–15、已验证L11/U15和31总拖、180秒、原73拖/129秒三星及历史reward200/par73。

196采用已展示17体、七冰门全部计数2，其中三扇同时为翻门；具体初相为粉开、绿关、紫关。冰封底层初相来源仍UNKNOWN，记USER_ACCEPTED_AUTHORED_SOURCE_FIELDS，不把解冻后观察冒充原始初相确证。已核来源库存及v1.108必要换色换形差异继续分列，保持6×8满48格、简单档5–10、L5/U10和27总拖、75秒、原32拖/54秒三星及历史reward200/par32。

候选与路线绑定：

${candidates.map(r=>'- '+r.id+'：'+r.file+'；level SHA256 '+r.levelSha256+'；route SHA256 '+r.routeSha256+'。').join('\n')}

## 验收及保留范围

仅191、196正式数据接入；其余198关含本批已完成八关、并行成果、全部共享运行/界面/美术/账户/玩家存档保持。无新增难度或评分豁免。旧证明/候选/失败和UNKNOWN报告原样保留，来源接受另写新记录，不原地改签旧sourceValidated字段。

复核同图有效下界、原向完整素材、满铺与源差异、完整无道具路线及原评分。最终实际LEVELS各执行320×568和496×1078真实Pointer、自然时钟、逐事件独立回放及三星结算。196旧大屏56.56秒两星报告保留，本次在原54秒目标下重新验收，不改钟、不改评分。候选验证不能替代最终正式验证；不冒称真人盲测或手机实测，不打包上传发布。
`;
const agentsPath='AGENTS.md',agentsRaw=fs.readFileSync(agentsPath,'utf8');
let agents=agentsRaw.replace(/^当前活动规则：.*$/m,'当前活动规则：`docs/rules/mechanism-rules-v1.112.0.md`。191已展示原创开局及196粉开绿紫关获准正式接入，源UNKNOWN保持；其它继承v1.111，活动版本以manifest为准。').replace(/^2\. 完整阅读该版本文档。.*$/m,'2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.112.0.md`（仅191原创开局/196三翻初相用户接受，保原评分与完整正式双屏验收；其余承继v1.111）。');
agents=agents.replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.112优先：用户看过191/196候选截图及机制后要求正式接入；191采用已验证原创开局，196采用粉翻初开/绿紫初关，源UNKNOWN分别记USER_ACCEPTED_AUTHORED_OPENING/USER_ACCEPTED_AUTHORED_SOURCE_FIELDS。保L11/U15与L5/U10、原棋盘/评分/库存和正式双屏自然钟三星验收，其余198/旧证据/存档保持，不发布。');
assert.equal(fs.readFileSync(manifestPath,'utf8'),manifestRaw);assert.equal(fs.readFileSync(agentsPath,'utf8'),agentsRaw);
fs.writeFileSync(document,content,{flag:'wx'});
manifest.activeVersion=version;manifest.versions.push({version,ruleId:'blockout-rules-v'+version,runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:rulesDigest(content),status:'frozen',frozenOn:'2026-09-28',confirmation:'用户看过候选截图和机制后明确191/196接入正式；仅接受191原创开局与196粉开绿紫关初相，源UNKNOWN保留，原评分/难度/其它198与存档保持，正式双屏自然钟三星验收，不发布。'});
assert.equal(fs.readFileSync(manifestPath,'utf8'),manifestRaw);assert.equal(fs.readFileSync(agentsPath,'utf8'),agentsRaw);
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(agentsPath,agents);
const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));assert.deepEqual(manifest.versions.slice(0,-1),JSON.parse(manifestRaw).versions);
const out=ROOT+'/acceptance191196-'+Date.now()+'.json';writeNew(out,{status:'USER_ACCEPTED_SPECIFIC_DISPLAYED_CANDIDATES',ruleVersion:version,document,documentSha256:rulesDigest(content),candidates,oldEntriesUnchanged:true,previousManifestSha256:digest(manifestRaw),sourceFactsRemainUnknown:true,productionWritten:false,release:false});
console.log(JSON.stringify({out,active:after.activeVersion,versions:after.verified.length,candidates}));
