import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock,rulesDigest} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const file='docs/rules/manifest.json',raw=fs.readFileSync(file,'utf8'),m=JSON.parse(raw);
assert.equal(m.activeVersion,'1.106.0');
const version='1.107.0',doc=`docs/rules/mechanism-rules-v${version}.md`;
const content=`# Block Out! 第182、185关有限求解与换色换形重生成 v1.107.0

- Rule ID: blockout-rules-v1.107.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.106.0；仅增加本次182、185重生成授权。

## 用户指令与差异

用户先明确“182、185请修改色块形状或颜色继续完成正式关卡”，随后要求“继续，当求解遇到下限或者上限一直不满足条件时，不要一直求解下去，请通过更换色块颜色、色块种类等方式重新生成关卡”。本次继续补齐181–190中的182、185；其余八关已有接入记录，不因本次换图要求自动重做。

每个候选记录数据指纹、有限求解预算和真实结果。上下界反复不满足、持续UNKNOWN或无完整路线时，调整色块颜色、已有合法形状和必要排布，重新生成和验证，不无限增加同一失败候选的预算。具体预算由实施选择并记录，不冒称用户指定数值。允许为可解性和难度调整已知来源形色，不再只限容量冲突；源原值与原创差异分列，不冒称精确复制。种类替换维护壳/冰/星/钥匙/轴等实际机关绑定及真实库存，异形块改变数量须明确记录且仍遵守适用比例与源机制种类。

## 保留合同

仅182、185适用本次形色授权。保v1.45基线棋盘width/height/playable/blocked/seams、关号名字、时限、实际三星、历史reward/par；已知机关种类、实例数、初值及完整隐藏/队列库存保持，既有硬规则确证冲突只作最小适配并留证。不得因求解器不支持删除机关或货物，不把未知来源字段写成已核实。第190关独立原创授权不扩展至185未知翻门初相位。

两关均保持困难16–20：同一新图fresh有效L≥16和完整无道具U≤20必须同时成立。超时/UNKNOWN、不适用投影、仅总拖数或绕路都不是认证；无下界豁免。新设计采用当前v1.5，遵守冰冻翻门不翻转、1到0只解冻等现有语义，不改共享runtime。

全块原向完整素材、真实开局和每隐藏层满铺、开局相邻异色、规整原创布局、轴向完整矩形、完整横截面与整形出口扫掠/门宽、门色唯一、解锁/机制公平性保持。源开局/全库存/隐藏事实与自主补齐分开记录。

## 验收与接入

来源差异、空间/素材、fresh上下界、完整模型路线及多格/机关决策审查通过后，候选真实输入再自主接入；最终LEVELS须双屏真实Pointer和自然时钟验收。保原评分，冲突单列，不擅改三星。其余198关及并行成果、共享运行/界面/美术、账户与玩家存档保持。旧规则、失败候选及UNKNOWN证据原字节保留，旧八关验收不重标为当前fresh认证。程序验收不冒充真人盲测/手机实测，不打包、上传、发布。登记本规则不等于关卡完成。
`;
fs.writeFileSync(doc,content,{flag:'wx'});
m.activeVersion=version;m.versions.push({version,ruleId:`blockout-rules-v${version}`,runtimeProfile:'revised-2026-09-27-v1.5',document:doc,sha256:rulesDigest(content),status:'frozen',frozenOn:'2026-09-27',confirmation:'用户明确182/185改色换形继续正式制作，上下界反复不满足则有限求解后重新生成；保几何/机关库存/评价和困难16–20及完整fresh验收，未知源不冒称确证，其余198及存档保持，不发布。'});
assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent manifest write');fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
let a=fs.readFileSync('AGENTS.md','utf8');assert(a.includes('mechanism-rules-v1.106.0.md'));
a=a.replace(/当前为 `docs\/rules\/mechanism-rules-v1\.106\.0\.md`[^\n]*/, '当前为 `docs/rules/mechanism-rules-v1.107.0.md`（182/185有限求解未达上下界则改色换形重生成；保困难16–20和全部新验收，其余承继v1.106）。');
a=a.replace('## 不得自行放宽的规则','## 不得自行放宽的规则\n\n- v1.107优先：仅182/185上下界持续不满足时有限求解后改色换形及必要排布重新生成，允许已知来源形色原创适配并分列差异。保棋盘/时间/三星/reward、已知机关/初值和全库存，困难16–20、fresh上下界/原向素材/最终双屏Pointer自然钟完整验收后接入；185未知初相位不冒称来源确证，其余198/旧证据/存档保持，不发布。');fs.writeFileSync('AGENTS.md',a);
const after=verifyRulesLock();assert(after.ok,after.errors.join('\n'));
fs.mkdirSync('deliverables/remake182-185-20260927',{recursive:true});
fs.writeFileSync('deliverables/remake182-185-20260927/registration.json',JSON.stringify({before:lock.activeVersion,after:after.activeVersion,versions:after.verified.length,oldEntriesUnchanged:JSON.stringify(m.versions.slice(0,-1))===JSON.stringify(JSON.parse(raw).versions),newEntry:m.versions.at(-1)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({active:after.activeVersion,versions:after.verified.length}));
