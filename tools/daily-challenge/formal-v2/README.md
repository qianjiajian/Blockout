# 每日挑战完整目录工作流

活动规则为 `docs/rules/mechanism-rules-v1.153.0.md`。15 个机制阶段，每阶段三档各 10 个独立布局，共 450 个；不是以主线难度标签、评分拖数或目标字段代替必挪证明。

## 数据和证明

- 难：16 ≤ L ≤ 实际最少必挪 ≤ U ≤ 20。
- 超难：21 ≤ L ≤ 实际最少必挪 ≤ U ≤ 30。
- 超超难：L ≥ 31，并有完整有限 U；没有新增玩法上限。

L 是重新搜索验证的下界，U 是完整无道具路线的非消除、非剥层拖数，二者不冒称实际最优值。一次持块可以转弯，不能按格子或直线段数计必挪。完整证明域、放宽映射和时钟界限见 `README-proof.md`。

`selected-v2/index.json` 仅是制作进度；开发期旧工具 SHA 的 accepted 记录必须重新验。`qualify-index.mjs --finalize-metadata` 在最终名称/难度元数据固定后重新求解，不能改完名称后沿用旧全对象 SHA。保留失败和旧报告，不重写为 PASS。

## 完整接入顺序

1. `node tools/verify-rules-lock.mjs`
2. `node tools/daily-challenge/formal-v2/qualify-index.mjs <selected-index.json> <new-final-directory> --finalize-metadata`
3. `node tools/daily-challenge/formal-v2/emit-catalog.mjs <final-index.json> <new-staging-directory>`
4. 复核并将完整生成的 `formalDailyChallengeData.ts` 接入 `src/core/`；禁止部分目录占位。完整对象必须原样加载，不能重新 derive、改 par、改颜色或在失败时回退主线。
5. `node tools/daily-challenge/formal-v2/verify-runtime.mjs <new-runtime-evidence-directory>`：通过真实 production pool → assignment → clone 再验 450 个对象，并检查来源注册表未改变。
6. TypeScript、每日规则/奖励/素材/失败入口回归，以及 Web 构建。
7. `node tools/daily-challenge/formal-v2/pointer-batch.mjs <final-index.json> <new-pointer-directory> 8 both`：独立 MemoryHost，450 关在 320×568 和 496×1078 下真实 Pointer 路线、自然钟、正式结算和主线隔离，共 900 项。没有改钟或模型动作注入。
8. `node tools/daily-challenge/formal-v2/final-acceptance.mjs <runtime-evidence-directory> <pointer-directory> <new-acceptance-report.json>`：检查 450 个当前工具证据与 900 个同对象、同路线、同源代码运行报告，全部满足才给 `FORMAL_450_COMPLETE`。

整个流程不访问真实玩家存档，不打微信包、上传或发布。生产目录升级是关卡内容纠错；同日已选槽位、机制阶段、次数、完成和领奖记录保持，后续每日抽取仍固定。合成测试用于迁移验证，不能当作读取过用户存档。

## 历史路径

旧 `generate-daily-challenge-formal.mjs`、`verify-daily-challenge-formal.mjs`、`accept-formal-proof.mjs` 已加停止门禁，不能再以旧 PASS 字符串或 seam 工厂结果覆盖当前目录。修改前源码保存在 `deliverables/daily-formal-v2-20261007/retired-tool-sources/`，历史失败/证明仍保留。

`levels:daily:generate` 和 `levels:daily:verify` 已指向上述 v2 工具，均须显式提供新证据路径。正式运行数据、来源、路线和证明分别绑定，注册表不进入其自身数学证明工具 SHA，避免循环依赖；实际运行验收另行绑定完整注册表和选择器源码。
