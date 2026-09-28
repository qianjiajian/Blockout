# 131–140 三星拖数调整验收

`playtest.mjs` 复用已验证的 141–150 正式 Pointer 和自然 tick/剥壳翻门延迟回放流程。本次固定十关、总拖数 28/49/57/51/36/49/34/47/70/42、496×1078 与 320×568 两屏。

只读当前最终 `LEVELS`，无候选覆盖；每关重新建立 MemoryHost，原生 Storage/IndexedDB 任何访问立即失败。真实 canvas Pointer 完成全路线后，核每步模型、自然时间、精确新拖数/旧秒数文案、三颗实际亮星、earnedStars=3、隔离 bestStars=3 与 bestMoves=路线拖数。保存输入字节快照、观察日志、截图及逐关报告。

调用时提供已独立固定 hash 的 `before.json`、已阅读新规则版本及其原始文件 hash：

```powershell
$env:REMAKE_VIEWPORT_WIDTH='320'
$env:REMAKE_VIEWPORT_HEIGHT='568'
node tools/star-targets131-140/playtest.mjs BEFORE_JSON BEFORE_RAW_SHA RULE_VERSION RULE_RAW_SHA
```

另一独立进程用 496×1078。`STAR_TARGETS_PREFLIGHT_ONLY=1` 只执行正式数据/完整模型路线预检，不能代表 Pointer/自然计时验收。`selfcheck.mjs` 验40个评分边界和11个拒绝用例。

全200关只允许十个 preservedMoveTarget 变化；fixture路线、历史上下界、时间与玩法逐字段保持。输入运行期间任何绑定规则、源码、素材或工具漂移均失败，不自动豁免并行修改。既有难度证明不重新求解、不重标证书。未发布、不访问玩家存档。
