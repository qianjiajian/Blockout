# 新机制隔离验收矩阵

日期：2026-09-21。规则：`blockout-rules-v1.1.0`，profile：`revised-2026-09-21-v1.1`。

这是可更新的实现证据索引，不是冻结规则正文，也不是正式关卡迁移、难度认证或发布证明。权威规则及当前版本以 `docs/rules/manifest.json` 和其中锁定文档为准。

## 本次验证范围

新增 `tests/revisedMechanismAcceptance.test.ts` 使用完全独立的 v1.1 小场景，补充此前缺少的12项边界验收。没有导入或覆盖正式 LEVELS，没有生成正式候选或修改存档。

部分机制的既有深入回归使用 v1.0 profile；两版共享的行为通过 `usesRevisedMechanisms` 接入，v1.1 接线另有合同、门宽和呈现测试。它们不是15项机制逐一完成真机画面验收的替代品。对比用小场景可能设置同色的普通门与星门，用于证明通行差异；该构造不批准生成候选绕过“出口颜色唯一”门禁。

## 15项机制的逻辑覆盖

| 机制 | 正反边界及主要证据 | 尚需独立验收的部分 |
|---|---|---|
| M01 生成器 | `revisedMechanismRuntime`：完整落点被任一格挡住不出、空口立即出、生成块阻下一块、合法分离机口竞争、取消/撤销回滚；`generatorMouthSpawnGeometry` + `generatorMountContract`：中心口、可玩足迹、真实凹边、方向、机体及出口不叠；`revisedMechanismAcceptance`：失败后不再出货 | 可见滑出/输入锁与自动结算稳定帧；不能由模型单测推断画面通过 |
| M02 轴向块 | `revisedMechanismAcceptance`：横、纵各允许双向平移及轴向出门，拒绝垂直轴移动及出门；`revisedMechanismPresentation`：小数位Pointer碰撞也限制轴向 | 正式箭头素材与四向拖拽反馈 |
| M03 钥匙锁 | `revisedMechanismAcceptance`：剥壳不释放钥匙，本体移除使同组所有锁减1；多钥匙需求、不相关组不减；钥匙组与红壳/蓝芯/绿承载色独立 | 钥匙飞行、锁数字与模型同步 |
| M04 星块/星门 | `revisedMechanismAcceptance`：星块拒绝普通门、普通块可进同色星门、异色星门拒绝；星块离场后门仍为星门 | 金边/金标及门持续显示 |
| M05 翻转门 | `revisedMechanismRuntime` A01/A06：使用中的门与其他门在剥层/本体移除后均切一次，无效尝试不切；`revisedMechanismAcceptance` A15：完成后不重复切门 | 动画结束状态与实际通行同步；不是只检查初始图片 |
| M06 彩色地格 | `revisedMechanismAcceptance` A08：异色拒绝、同色能进入但不消除不变色、离开后地格持续；`revisedMechanismContract`：含隐藏/队列的整关外壳禁配；呈现测试覆盖小数位侵入 | 实际色格画面、遮挡和触控反馈 |
| M07 炸弹 | `revisedMechanismRuntime` A04/A05：冻结/锁/隐藏/队列不计时，解除限制后计时，零失败，剥壳删除计时字段，不转移内芯；取消不恢复已消耗墙钟；`revisedMechanismAcceptance`：零失败后空间静止 | v1.1统一时钟正式启动、教学遮挡/暂停、解除限制当帧的UI切片与表盘消失；模型直接调用tick不能替代这些边界 |
| M08 卷帘 | `revisedMechanismRuntime` A01/A03：剥层减数，隐藏冰揭开不追扣；`revisedMechanismContract`：整块包含、无关开局块不被覆盖、实体卷帘不叠；呈现测试拒绝“数字0但尚未revealed”被误显示 | 实际覆盖矩形、计数和卷起动画；全关外部推进路径须由后续求解验证 |
| M09 电梯 | `revisedMechanismRuntime` A13/A14：外来块部分重叠也阻挡，完全腾空可开启，整批无碰撞揭露，取消/撤销成组回滚；呈现测试：隐藏冰不是Pointer障碍，揭开后才是 | 双扇资源、动画、遮挡与允许输入的时点 |
| M10 出口 | `revisedExitWidth` A07：四向T细柄窄门拒绝、完整宽度接受、偏移不匹配拒绝、真实凹边、普通/冰/星/翻门；多个口或门不能拼接；v1.1快照到连续拖拽共享判定 | 真Pointer四向、凹边和吸入动画验收 |
| M11 异形块 | `revisedMechanismAcceptance`：L形缺口中允许别块，实际占格碰撞拒绝，移动后原形状完整、不旋转或拆分 | 各异形素材与实际占格一致；30%配额属于生成门禁 |
| M12 异形棋盘 | `revisedMechanismAcceptance`：对称连通U形板缺口不能穿，沿可玩桥可走；物理缝不能穿，跨缝初始块构造拒绝 | 原创/对称/竞品宽高/无内部孤岛的候选生成审计；本模型小场景不出关卡合格证 |
| M13 冰冻门 | `revisedMechanismRuntime` A01：每清除/剥层各减一次；`revisedMechanismAcceptance`：剥层后冰1门立即归零可用、不穿负数；完整门宽测试仍拒绝冰门窄口 | 冰门数字、解冻碎裂与通行时点 |
| M14 数字冰 | `revisedMechanismRuntime` A03：隐藏不减，揭开不追扣，后续清除才减；`revisedMechanismAcceptance`：冰1前不能动/出门，一次剥层后恢复；合同拒绝队列冰 | 隐藏冰显露数字及解冻画面 |
| M15 外壳 | `revisedMechanismAcceptance`：剥层保留位置和形状、更换本体色，拒绝三层或壳芯同色；炸弹剥壳解除见 M07；钥匙剥壳不触发见 M03 | 外壳资源层级和剥层画面；冻结规则不允许以视觉叠图模拟未实现逻辑 |

## 事件和证明边界

- A01–A11、A13–A15 的上述正反例通过本次聚焦逻辑测试，并不代表所有机制组合已穷举。
- A12 历史时间机器只有当前手势取消/最近动作撤销的针对性兼容回归；任意历史多步Undo的自主时钟行为不能据此宣布安全。
- A16：快照、克隆、事务回滚已有模型回归；`revisedSolverBoundary` 确认旧求解器明确拒绝 v1.0/v1.1/未知新版，而不是沿用旧证书。它证明拒发错证，不证明新版求解或10/15/20必要腾挪下界已实现。
- 此子批次没有执行真实浏览器、手机或微信包测试。后续如有专项UI报告，应在主任务续接记录中单列命令、截图路径和结果，不把本表的“尚需验收”直接改成“全部200关正确”。

## 2026-09-21 16:09 聚焦命令记录

`pnpm exec tsc --noEmit`：PASS。

```text
pnpm exec vitest run tests/revisedMechanismAcceptance.test.ts tests/revisedMechanismRuntime.test.ts tests/revisedMechanismContract.test.ts tests/generatorMountContract.test.ts tests/generatorMouthSpawnGeometry.test.ts tests/revisedExitWidth.test.ts tests/revisedMechanismPresentation.test.ts tests/revisedSolverBoundary.test.ts
```

结果：8文件 / 117测试 PASS（12 + 18 + 15 + 19 + 12 + 33 + 4 + 4）。

规则锁：`node tools/verify-rules-lock.mjs` PASS，active v1.1.0；此命令只验证规则文档完整性。
