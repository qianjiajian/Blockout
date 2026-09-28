import fs from 'node:fs';
import assert from 'node:assert/strict';
import {rulesDigest,verifyRulesLock} from '../verify-rules-lock.mjs';
const p='docs/rules/mechanism-rules-v1.102.0.md';
const restore=`# Block Out! 151–160有限求解与重新生成 v1.102.0

- Rule ID: blockout-rules-v1.102.0
- Runtime profile: revised-2026-09-27-v1.5
- Frozen on: 2026-09-27
- 完整承继v1.101.0；仅补充151–160本轮制作与求解迭代授权。

## 用户指令与差异

用户明确：“继续，当求解遇到下限或者上限一直不满足条件时，不要一直求解下去，请通过更换色块颜色、色块种类等方式重新生成关卡”。延续151–160正式关卡制作任务。每份候选记录有限预算、实际结果与指纹；发现低于下限的有效完整路线，或在有限尝试后仍找不到符合上限的完整路线/有效下界证明，应更换色块颜色、种类及相应布局，生成新候选并重新验证，不对同一候选无限增加搜索预算。

允许为求解与难度调整来源色块颜色、形状，不局限于空间容量冲突；原始来源和原创设计差异分别保留。执行预算和每轮次数由实现选定并记录，是执行约定，不冒称用户指定数字。预算耗尽、未找到路线、下界UNKNOWN均不算通过，也不等于不可解。

## 保留合同

本轮仅151–160。保留既定正式棋盘width/height/playable/blocked/seams、关号/名字、原总时限、实际三星门槛和历史reward。保来源已知机关种类、数量、初值和真实库存；既有硬规则冲突按最小必要适配记录，不因求解不支持或失败删除机关/库存。不把未知来源字段写成确证。

按既定顺延节奏：151简单、152困难、153简单、154普通、155困难、156简单、157普通、158超难、159简单、160普通。简单5–10、普通11–15、困难16–20、超难21–30，必须有有效新鲜下界和完整无道具路线同时达标，无新增难度豁免。

新图使用现有runtime v1.5，保原向完整素材、开局与每批隐藏区域真实满铺、开局相邻异色、生成器真实自动投放/FIFO与相邻异色及禁冰、轴块完整矩形、出口整形扫掠与宽度/颜色唯一、异形比例、解锁和机制公平性。运行逻辑、UI、美术资源、账户与玩家存档不因本任务改变。

## 接入与证据

继续既有自主分批正式接入授权；来源/原创差异、空间/素材/机制、完整路线、适用下界、双屏正式Pointer和自然时钟均完成后验收最终LEVELS。失败候选及旧证据不重标，未通过关保留旧正式图，其它190及并行成果保持。不打包、上传或发布。登记指令不是关卡生成或验收完成。
`;
const registered=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/registration.json')).newEntry;
assert.equal(rulesDigest(restore),registered.sha256,'Only restore exact originally registered text');
const manifest=JSON.parse(fs.readFileSync('docs/rules/manifest.json'));
assert.deepEqual(manifest.versions.find(e=>e.version==='1.102.0'),registered,'Do not change a concurrently registered entry');
const current=fs.readFileSync(p,'utf8');
if(rulesDigest(current)!==registered.sha256){
 const evidence='deliverables/remake151-160-20260927/collision-'+Date.now();
 fs.writeFileSync(evidence+'-foreign-v102.md',current,{flag:'wx'});
 fs.writeFileSync(evidence+'-diagnostic.json',JSON.stringify({registered,actualHash:rulesDigest(current),originalRestoredHash:rulesDigest(restore),reason:'Concurrent161–170 draft overwrote already frozen151–160 document; preserve foreign text, restore exact registered bytes without changing manifest hash.'},null,2)+'\n',{flag:'wx'});
 assert.equal(fs.readFileSync(p,'utf8'),current,'Concurrent edit during repair');
 fs.writeFileSync(p,restore);
}
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));console.log(JSON.stringify({ok:lock.ok,active:lock.activeVersion,versions:lock.verified.length,restoredSha256:rulesDigest(restore)}));
