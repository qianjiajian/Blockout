import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ruleGate,ROOT,writeNew,digest} from './common.mjs';
const lock=ruleGate(),file='docs/rules/WORKSTATE.md',raw=fs.readFileSync(file,'utf8');
const note=`
## 182、185改色换形继续制作（2026-09-27，task v1.107 / active ${lock.activeVersion}，进行中）

- 用户明确182/185改色块形状或颜色完成正式关卡，并要求上下界持续不满足时停止硬搜、重新生成。已新增v1.107，保留并行171–180的v1.106和191–200的v1.108；当前${lock.verified.length}条锁PASS。仅182/185新形色设计，困难16–20、基线棋盘/时限/实际三星/reward、真实库存和已知机关初值保持；其余198及旧证据不改，不打包发布。
- 新根${ROOT}/，baseline.json为本次所有200正式对象与源码绑定，campaignSHA c9df7aca2bc4e075b6a08ba948139a4b5ed4411d239be44df8d7f65eece5d9a3。该基线sourceAudit文本误继承161–170目录，只有引用说明错误，200对象和hash无此问题；正确本批来源入口为deliverables/remake181-190-v146-20260924/README.md，本次另存baseline-source-correction.json，不重写基线字节。
- 182和185仍未正式接入；此前181/183/184/186/187/188/189/190八关保留。新工具common/replay/Pointer采用当前v1.5和完整出口扫掠，不将v1.47旧证据改签当前验收。182新方向为首帘揭开前前缀下界、重新配置颜色和形状；185先保31体通过换形解决容量，三个冰封翻门源内部初相位仍UNKNOWN，公开解冻后闭门是已知检查点。190独立原创不当185授权。
- 更正下方v1.68过程描述：182旧80M状态结果为cost0–11完整排空、cost12部分搜索，未完整排空0–12，仍UNKNOWN且不作L16证书。本轮不追加该旧图预算。
- 本轮尚无新候选PASS、无新生产写入、无实际Pointer完成；代理分别拥有author182/author185/review目录，根负责规则/common/输入/接入与收尾。下一步有限预算迭代新图、独立源/空间/上下界审查，再候选与最终正式双屏自然时钟。

`;
assert.equal(fs.readFileSync(file,'utf8'),raw);fs.writeFileSync(file,raw.replace(/^(# [^\n]+\n)/,'$1'+note));
writeNew(ROOT+'/baseline-source-correction.json',{baseline:ROOT+'/baseline.json',sha256:digest(fs.readFileSync(ROOT+'/baseline.json')),field:'sourceAudit',correctedReference:'deliverables/remake181-190-v146-20260924/README.md',levelDataChanged:false});
console.log('WORKSTATE appended; no formal data written');
