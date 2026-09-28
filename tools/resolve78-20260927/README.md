# 第78关重新求解输入验收

本目录只验当前正式78关的新完整路线。全部200关、原37拖/129秒三星条件、素材、runtime及玩家存档保持；不宣称最优或难度下界重新认证。

`playtest.mjs BEFORE BEFORE_SHA ROUTE ROUTE_SHA RULE_VERSION RULE_SHA`绑定当前200关基线、全src和美术、规则及路线来源，用私有快照运行正式入口。设置REMAKE_VIEWPORT_WIDTH/HEIGHT为320/568或496/1078；RESOLVE78_PREFLIGHT_ONLY=1只运行预检，不能作GUI通过。

每一拖通过真实Pointer执行，正式自然时钟及延迟回调逐事件重放到独立模型。通关后核实际目标文字、亮星数量、MemoryHost bestStars/bestMoves、完整通关和原向素材；实际拖数按新路线，不强制等于37。结束再次核对所有绑定、当前200关、快照和来源，任何漂移必须保留原FAIL并另行精确审查。

输出只写入deliverables/resolve78-20260927/pointer，历史报告与此前评分工具不改。
