# Block Out 原创关卡生产流程

## 1. 统一竞品数据

- 输入：`deliverables/competitor-dataset/blockout-lv001-lv100.json`
- 范围：新版 Block Out Lv1–100。
- 截图严格提取版：`deliverables/competitor-dataset/blockout-lv001-lv100-screenshot-extraction.json`。
- 缺失信息保持 `null` 或 `unclear`；不把不可见布局细节补进竞品数据。

## 2. Block Out 难度公式

项目使用 `blockout-d1`，不再沿用 Car Sort 的车位或入口含义：

`D = 100 × (0.35B + 0.20H + 0.20M + 0.25X)`

- `B`：开局缓冲紧张度。统计可玩格中被活动色块和关闭遮挡区占用的比例。
- `H`：隐藏信息。统计冰封出口、冰冻方块、额外颜色层、卷帘/生成器计数、星标限制和移动装置状态。
- `M`：机制多样性。统计异形棋盘、冰门、冰块、叠层、遮挡、升降台、传送带、星标路线等独立机制族。
- `X`：出口竞争。同色清除阶段共享少量出口以及出口跨度贴合造成的竞争压力。

实现：`src/core/blockOutDifficulty.ts`。

## 3. 拟合竞品曲线

`pnpm levels:original:pipeline` 读取竞品 D-v2 基准和当前原创关卡，生成逐关原始分、线性标定分、五点平滑曲线、逐章均值与误差。竞品曲线只决定目标强弱与波峰位置，不导入竞品坐标。

输出：`deliverables/original-levels/pipeline/blockout-original-difficulty-curve.json`。

## 4. 原创关卡 Prompt

模板：`docs/blockout-original-level-prompt-template.md`。模板要求先构造解，再逆向打乱，并强制输出解路线和生成证据。

## 5. 求解验证闭环

1. 静态校验：尺寸、可玩格、出口跨度、颜色、机关引用和开局碰撞。
2. `solveLevelForValidation` 搜索完整清除路线。
3. 测试套件用 `PuzzleModel` 回放路线，验证每次移动、机关变化、计时和最终清空。
4. 只有 `solved=true` 且回放成功的关卡可进入运行时集合。
5. “未判定”与达到搜索上限都按失败处理。

当前正式 100 关的求解证据：`playtest-results/round54-100-level-solution-report.json`。

## 6. PCG 与原创性约束

关卡生成由蓝图、棋盘外形、颜色轮换、机制节奏、组合块和可逆打乱共同完成。`src/core/levelOriginality.ts` 会忽略名称、ID 和颜色，并对旋转、镜像做规范化；因此换色、改名、旋转和镜像都不能绕过重复布局检查。

门禁要求：

- 100 个关卡拥有 100 个不同的规范布局签名。
- 100 个关卡名称唯一。
- 竞品截图只用于难度与机制节奏研究，不进入生成坐标。
- 任何生成结果都必须重新评分、求解并回放。

输出：

- `blockout-original-levels-001-100-runtime.json`：可导出的正式 `LevelSpec[]`。
- `blockout-original-levels-001-100-scored.json`：逐关难度与求解证据。
- `blockout-original-difficulty-curve.json`：竞品曲线拟合结果。
- `blockout-originality-report.json`：原创性门禁结果。
