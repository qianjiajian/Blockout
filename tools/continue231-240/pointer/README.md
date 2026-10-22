# 231–240 双屏 Pointer 验收

从项目根目录运行：

```powershell
node tools/continue231-240/pointer/dual.mjs path/to/qualified231.json path/to/qualified232.json
```

输入为 `{level: LevelSpec, drags: [{blockId, path: [[x,y], ...], exitSide?}]}`。可包含规范 `levelSha256` / `routeSha256`，提供时严格核对。每关必须属于 231–240、v1.5，并通过本批静态审计和完整首接触兼容路线预检。

单屏入口 `run.mjs` 使用 `REMAKE_VIEWPORT_WIDTH` / `REMAKE_VIEWPORT_HEIGHT`，默认 496×1078；双屏入口按 320×568、496×1078 顺序执行。每个关卡使用独立浏览器页面、真实 Pointer、自然时钟、原向素材绘制审计、完整逐步模型对照及实际三星 MemoryHost 结算；持久 Storage / IndexedDB 调用直接失败。输入和源码/素材在执行前建立独立字节快照，结束核对漂移。

结果写入 `deliverables/continue231-240-20261019/pointer-<timestamp>-<viewport>-<pid>/report.json`，包含开局、揭层、结算截图和自然时间事件日志。

默认候选模式仅在私有内存关序中补齐测试位置并覆盖目标候选，不写生产源码或玩家存档。加 `--formal` 则直接把独立注册表中的同一对象接入测试内存位置，禁止候选覆盖，并验证实际 Game 对象身份。两种模式均保生产边界200，明确 `productionCampaignValidated=false`；测试占位从不写入生产数据。本工具不证明来源或难度下界，不能单独代替完整接入证据。

正式对象验收示例：`node tools/continue231-240/pointer/dual.mjs --formal path/to/qualified231.json`。

如截图开销影响自然计时，可设 `REMAKE_SKIP_REVEAL_SCREENSHOTS=1`，只省去路线中间的截图；仍保存逐步机制状态、全部自然tick、开局与实际结算截图。不得冻结时钟、放宽时限或重标先前失败。结算后的收藏提示通过真实Pointer关闭后再截三星界面。

脚本在开始游戏前计算参考模型状态；关内只读取必要快照，不反复构造整份调试UI。输入保留每个转弯和直线终点，省略同一直线上的重复采样，并先验证展开后与原逐格路线完全一致。生产 `sweepContinuousPose` 仍以0.08格分段检查碰撞，真实Pointer事件的 `isTrusted` 必须全为true；没有改游戏碰撞、计时或动画。

```powershell
node tools/continue231-240/pointer/dual.mjs --smoke
```

`--smoke` 仅验证当前 Game 能在两屏加载、MemoryHost 可用且没有真实存储访问；状态为 `STARTUP_SMOKE_PASS`，不加载候选、不执行路线、不计入任何关卡通过数。
