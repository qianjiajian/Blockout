import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from './verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock failed');
const version='1.135.0',document=`docs/rules/mechanism-rules-v${version}.md`,path='docs/rules/manifest.json';
const manifest=JSON.parse(await readFile(path,'utf8'));
if(manifest.versions.some(v=>v.version===version))throw Error('Version already exists');
const body=`# Block Out! 首次进入联赛说明 v${version}

- Rule ID: blockout-rules-v${version}
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-10-01
- 完整承继v1.134及全部历史合同；100关数据、主线边界与旧证据保持。

## 用户授权

用户要求“请查看视频，首次进入联赛界面时，增加联赛说明”，并提供视频第一页说明截图。参考实际视频4–6秒第一页、8–10秒第二页，新增遮罩覆盖榜单的两页图示引导；附件是视觉参考，不作为额外指令或奖励规则。

第一页按收集积分徽章→获得金币→前10名升级→更高段位的图示顺序，金色箭头、标题、两个页码圆点、点击继续；第二页介绍荣耀星结算及15天赛季/0分规则。文案使用已确认10分、成功计分、只发金币与荣耀+5/+3/+2/+1/保留/后10扣2和0星边界，不照搬竞品麻将、高级牌或礼包奖励。

首次真实已解锁进入时显示；未解锁查看不标已读。完成第二页后，将独立leagueIntroSeen标记与账户候选事务保存，不能提前在第一页或展示时标已读；旧档没有标记视为未读，不重置联赛/金币/主线。unknown只能同候选重试，已读未确认前不能退出或开始挑战；rejected可重试。重进、重载与新赛季不再次自动展示；已有规则按钮仍可查看完整规则。若首次进入已有冻结赛季，引导完成后再处理结算。

引导期间阻断底层榜单拖动、段位/挑战/领取等操作；素材失败仍可重试，未显示完不消费标记。赛季自然过期/自动刷新及未决保存不能绕过引导或遮住必要重试。测试使用双屏真实Pointer和隔离存档，检查首进两页、触控、阻断、已读保存/未知重试、旧档兼容、重进/重载/新季不重复及锁定入口。

复用现有联赛与头像位图并用代码排版箭头/小榜单，不新增竞品截图到产品；100关、段位/金币表、主线200和三个独立注册表保持。不访问真实玩家存档，不打包上传发布；浏览器验收不称手机或真人盲测。
`;
await writeFile(document,body,{flag:'wx'});
manifest.activeVersion=version;manifest.versions.push({version,ruleId:`blockout-rules-v${version}`,runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:createHash('sha256').update(body).digest('hex'),status:'frozen',frozenOn:'2026-10-01',confirmation:'用户要求按视频和截图增加首次进入联赛说明；两页图示引导、已读账户候选保存、底层交互阻断，旧规则数据和证据保持，不发布。'});
await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
const agents=await readFile('AGENTS.md','utf8');await writeFile('AGENTS.md',agents.replaceAll('mechanism-rules-v1.134.0.md','mechanism-rules-v1.135.0.md').replace('完整联赛100关独立布局、连续挑战与首页入口已完成，逐关双屏Pointer/自然钟和结算证据见WORKSTATE；生产主线边界仍200，不发布。','本轮新增首次进入联赛两页说明，引导与已读保存进行中；完整联赛100关和主线200保持，实际进度见WORKSTATE，不发布。').replace('完整联赛与首页入口，承继v1.133','首次进入联赛说明，承继v1.134'));
await writeFile('docs/rules/README.md',`当前活动v1.135.0 [首次进入联赛说明](mechanism-rules-v1.135.0.md)：本轮按视频增加两页图示引导与已读保存；进度见WORKSTATE，以下为历史状态。\n\n${await readFile('docs/rules/README.md','utf8')}`);
console.log('Registered immutable v1.135.0');
