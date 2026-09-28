import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
const before=verifyRulesLock();assert(before.ok,before.errors.join('\n'));assert.equal(before.activeVersion,'1.104.0');
const file='docs/rules/manifest.json',raw=fs.readFileSync(file,'utf8'),m=JSON.parse(raw),doc='docs/rules/mechanism-rules-v1.105.0.md';
const content=`# Block Out! 第162关原创开局来源确认 v1.105.0

- Rule ID: blockout-rules-v1.105.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.104.0；仅增加第162关来源缺口的用户确认。

## 用户确认与证据边界

原162视频从一次拖动中途开始，无法确认未拍到的未操作开局。已向用户明确说明该缺口、候选困难档下界16/完整路线20次必挪与37拖及双屏自然计时通关，并询问能否保留已观察到的2个外壳、5扇翻门及可见开闭状态采用原创开局。用户明确答复“允许采用已验证原创开局（推荐）”。

仅162允许采用本次原创开局，记 USER_ACCEPTED_AUTHORED_OPENING，原始来源仍为 UNKNOWN_PRISTINE_OBSERVED_FIRST_FRAME_ONLY；不得将未知改写为竞品精确来源确认。对应候选为 deliverables/remake161-170-20260927/author161-163/reviewed162-1790516150230.json，同一关卡对象已由 root-review162-1790516315365.json 独立复核。

## 保留要求

保留已观察到的2个外壳、5扇翻门和各自可见初始开闭状态，形色容量适配按v1.103逐项列明。保第162关基线棋盘、名字、原110秒/42拖79秒三星、历史reward/par和困难16–20；全部原向素材、空间、fresh完整上下界、翻门机制及最终正式双屏Pointer自然时钟验收继续。其余199关不因本次来源例外改变，161–170原制作授权仍继续。旧证据、账户和玩家存档保持，不打包上传发布。
`;
fs.writeFileSync(doc,content,{flag:'wx'});
m.activeVersion='1.105.0';m.versions.push({version:'1.105.0',ruleId:'blockout-rules-v1.105.0',runtimeProfile:'revised-2026-09-27-v1.5',document:doc,sha256:rulesDigest(content),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户明确允许162采用已验证原创开局；未拍全的源初态仍UNKNOWN，保观察到2壳5翻及初相、困难16–20和全部fresh验收，其余199保持，不发布。'});
assert.equal(fs.readFileSync(file,'utf8'),raw);fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
let a=fs.readFileSync('AGENTS.md','utf8');a=a.replace(/当前活动修复规则：[^\r\n]+/,'当前活动规则：`docs/rules/mechanism-rules-v1.105.0.md`。仅162用户确认已验证原创开局，原始初态来源仍未知；其余承继v1.104，活动版本以manifest为准。').replace(/2\. 完整阅读该版本文档。[^\r\n]+/,'2. 完整阅读该版本文档。当前为 `docs/rules/mechanism-rules-v1.105.0.md`（仅162用户接受已验证原创开局，来源未知保留；其余承继v1.104）。').replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.105优先：仅162用户明确采用已验证原创开局，源未操作初态仍UNKNOWN，记USER_ACCEPTED_AUTHORED_OPENING。保2壳/5翻门及观察初相、原棋盘/评分/困难16–20与fresh最终双屏验收，其余199/旧证据/存档保持，不发布。');fs.writeFileSync('AGENTS.md',a);
const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));
fs.writeFileSync('deliverables/remake161-170-20260927/registration162.json',JSON.stringify({before:before.activeVersion,after:after.activeVersion,oldEntriesUnchanged:JSON.stringify(m.versions.slice(0,-1))===JSON.stringify(JSON.parse(raw).versions),entry:m.versions.at(-1),versions:after.verified.length},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({active:after.activeVersion,versions:after.verified.length}));
