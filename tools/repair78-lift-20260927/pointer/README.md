# 第78关升降隐藏层修复：正式输入验收

本工具只验最终正式78关的隐藏层修复。门禁逐对象核其它199关、全部13开局块、全部非blocks字段、180秒时限与37拖/129秒条件保持；隐藏15格真实满铺，两个冰块原形色及初始3保持。仅允许src/core/levels.ts末端接线和新增src/core/level78LateLiftRepair.ts，其它基线src、规则和来源均严格绑定，旧remake71to80.ts保持。

`playtest.mjs BEFORE BEFORE_SHA ROUTE ROUTE_SHA RULE_VERSION RULE_SHA CASE`，CASE为normal或late-no-external。normal要求完整路线37拖以内三星；late-no-external必须在lift首次真实揭层事件时已无任何开局块，不借保留外部青块或揭层后的外部清除减冰。两场各执行320×568/496×1078，共4场。REMAKE_VIEWPORT_WIDTH/HEIGHT指定尺寸，REPAIR78_PREFLIGHT_ONLY=1仅预检。

每次均正式LEVELS身份、真实Pointer、自然时钟、独立逐事件模型重放、隔离MemoryHost存储及全原向图片；不使用候选覆盖、快进、道具或模型移动替代输入。所有src/素材/工具/路线/规则拷贝私有快照，运行结束核源/快照/200对象，漂移必须保留原FAIL另审。

输出仅写deliverables/repair78-lift-20260927/pointer，不覆盖以前求解或评分报告。本工具不证明穷尽无死锁或fresh难度下界，相关证明由独立审查提供。
