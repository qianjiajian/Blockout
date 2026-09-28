# 91–100 三星条件验收

只验证本次明确调整的评分字段，不重做地图、难度认证或历史证据。config.mjs 固定 v1.99 五关目标与写入前 baseline SHA，拒绝换用其它数据。

prepare.mjs 从已有 41–50 工具复制真实输入循环；verification.mjs 比对全 200 正式对象，仅接受配置关卡的 preservedMoveTarget 新增或放宽。时间、地图、旧 fixture 和其它关卡逐对象保持。评分条件等号、超拖及超时边界同时检查。

playtest.mjs BEFORE SHA RULE_VERSION RULE_SHA WITNESSES SHA 通过正式 loadLevel 读取最终 LEVELS。设置 REMAKE_VIEWPORT_WIDTH/REMAKE_VIEWPORT_HEIGHT 为 320/568 或 496/1078。STAR_TARGETS_PREFLIGHT_ONLY=1 只预检，不代表 GUI 验收。

所有源码、美术、规则、见证及其来源锁 SHA，并复制独立快照。真实 Pointer、自然时钟、素材实际尺寸、原向整图、目标文本、三颗亮星与 MemoryHost 存档结果逐项核验，原生 Storage 和 IndexedDB 访问被拒绝。自然事件日志保存并由独立 PuzzleModel 回放。运行结束重查全部绑定与 200 关最终对象；并行漂移必须另行精确审查，不能自动忽略。

输出仅写入 deliverables/star-targets91-100-20260927/pointer-support/，旧报告不覆盖。94/98 的下界未认证及其它既有难度限制保留，不把评分验收当难度证明。
