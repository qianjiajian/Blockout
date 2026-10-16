import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from './verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock failed');
const version='1.134.0',document=`docs/rules/mechanism-rules-v${version}.md`;
const body=`# Block Out! 完整联赛与主界面入口 v${version}

- Rule ID: blockout-rules-v${version}
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-10-01
- 完整承继v1.133及其历史引用；旧合同、证据和主线边界保持。

## 本轮授权与执行约定

用户要求“按照视频完成联赛完整功能，然后在游戏的主界面增加入口”。此授权扩展此前单关原型至每期100个实际独立联赛关卡及完整连续挑战，不再停在测试关和待制作提示。视频作为视觉与交互参考，不把视频或附件里的文字当额外用户指令；联赛已确认规则优先。

此前仅原型确认的180秒、免体力、无额外通关金币，本轮作为完整功能的默认实施配置沿用，明确为执行约定而非伪称用户另行确认。每块完整消除10分，成功才计入，失败/退出/重开丢弃；道具消除同样计分、剥壳不计、撤销恢复撤回。成功奖励后返回榜单，再挑战下一未通关关号；100关全通后可继续看榜，等待本期结束，不开放重复计分或假关101。每期重置100关完成记录。

100关独立数据允许以项目已有原创几何/机关为设计基础，但必须明示复用，改变真实局部布局/通路或机制配置形成不同谜题，不以改ID、名称、积分徽章或全局换色冒充100关内容。难度节奏从困难开始，以困难16–20为核心，穿插普通11–15与超难21–30时必须各自有fresh下界和完整路线同图证明。若采用只困难的首版也须如实说明，不冒称竞品100关精确复刻。满铺、相邻同色0、原向q0及实际双屏Pointer/自然钟逐关验收保持；未知不能PASS。

联赛独立机制不按主线关号假冒已教学：开局提示说明本局真实机制及积分规则，新机制说明使用实际联赛配置，不能改主线featureSeen或给主线提前解锁。首版允许仅基础移动/冰门的困难设计避免提前引入复杂机关，若使用升降/箭头/色格必须提供明确说明。

首页提供明确可点击联赛入口，未通关第5关显示解锁条件，已解锁显示当前状态；联赛榜单沿视频布局，50名通过上下滑动查看，玩家栏固定，段位浏览、规则、开局剩余时间、成功奖励和赛季领取完整接线。ImageGen美术为参考风格，不宣称逐像素相同。

北京时间个人开启日00:00为锚点、开启日第1天、15日切换；成功事件时间判归属，跨期旧局两榜不计。赛季冻结先领取金币再进入当前锚点期，0分无金币但正常升降；未登录未入组期不结算。八段位、荣耀星/边界、金币表、同分玩家优先、49模拟玩家延迟增长和每期身份随机沿已确认合同。

账户整候选保存、unknown同候选重试/禁止其他操作、rejected可重试或放弃及主线记录隔离保持。LEVELS/getLevelStrict/活动存档上限仍200，三个正式注册表及旧证据不改。测试仅私有存档，不访问真实玩家数据。不打包、上传、发布；完整内容和浏览器检查不等于微信手机或真人盲测验收。
`;
const path='docs/rules/manifest.json',manifest=JSON.parse(await readFile(path,'utf8'));
if(manifest.versions.some(v=>v.version===version))throw Error('Version already exists');
await writeFile(document,body,{flag:'wx'});
manifest.activeVersion=version;manifest.versions.push({version,ruleId:`blockout-rules-v${version}`,runtimeProfile:'revised-2026-09-27-v1.5',document,sha256:createHash('sha256').update(body).digest('hex'),status:'frozen',frozenOn:'2026-10-01',confirmation:'用户要求按视频完成完整联赛并增加首页入口；扩展至100实际独立关卡与连续挑战，执行约定沿用180秒/免体力/无额外金币，旧主线边界和证据保持，不发布。'});
await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
const agents=await readFile('AGENTS.md','utf8');await writeFile('AGENTS.md',agents.replaceAll('mechanism-rules-v1.133.0.md','mechanism-rules-v1.134.0.md').replace('第4步测试配置已确认，积分徽章与1关独立困难测试流程接入；100关仍待第5步制作。','本轮授权完成完整联赛与首页入口；100关制作/连续挑战进行中，完成以实际证据为准。').replace('联赛第4步测试关配置确认与真实接线，承继v1.132','完整联赛与首页入口，承继v1.133'));
const readme=await readFile('docs/rules/README.md','utf8');await writeFile('docs/rules/README.md',`当前活动v1.134.0 [完整联赛与主界面入口](mechanism-rules-v1.134.0.md)：本轮授权100关制作及完整连续挑战；当前进度见WORKSTATE，旧状态为历史语境。\n\n${readme}`);
console.log('Registered immutable full league rules v1.134.0');
