# 221–230 正式注册表输入验收

在项目根目录运行 `node tools/continue221-230/formal-pointer/run.mjs`，默认验收全部十关。可在命令后提供明确关号子集。屏幕由 `REMAKE_VIEWPORT_WIDTH` / `REMAKE_VIEWPORT_HEIGHT` 指定，正式接受需要独立运行 320×568 和 496×1078。

正式对象直接取自 `src/core/formal221to230Data.ts` 的 `FORMAL_221_230_LEVELS` 和 `getFormal221to230LevelStrict`，逐一与已审核路线夹具及封包核对。旧封包只提供路线与对照值，没有把候选 JSON 覆盖进游戏。浏览器检查实际 `PuzzleModel.level` 与正式注册表对象的引用相同，报告 `candidateOverlay=false`。

生产 `LEVELS` 必须保持 200，目标关号在生产严格查询中仍不存在。由于现有游戏入口按关序长度限制，测试页面内临时增加 201–220 未游玩的占位对象，并将 221–目标关的正式注册表引用挂入内存关序。每关使用新页面；该脚手架不会写入源码或玩家存档，不代表生产活动扩展。独立 MemoryHost 保存只存在该页面，所有持久 Storage / indexedDB 访问会直接失败。

每次运行先建立绑定源码、素材、规则、路线和封包的字节校验快照；逐步执行真实 Pointer、自然计时、原向绘制、完整模型回放和实际三星结算。运行后重新验证正式对象、生产边界及所有输入字节。唯一允许的并行差异是 `formal211to220Data.ts` 中经既有严格 AST 审计确认的纯字面量追加；既有条目、导入、严格查询及其余源码、素材、规则均不能变化。

结果保存到 `deliverables/continue221-230-20260930/formal-adoption/pointer-*/report.json`，截图与逐事件自然计时日志位于同目录。此工具不重新搜索难度下界；同对象下界证据和来源资格由独立正式接入审计核对。旧隔离输入报告不改写、不重标；不发布、不修改真实存档，不宣称真人盲测或手机实测。
