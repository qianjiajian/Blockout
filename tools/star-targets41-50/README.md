# 41–50三星条件验收

本目录仅验证41、43、44、46、47、48、50七个正式评分字段。它不重新认证难度，不修改生产地图、旧fixture或玩家存档。

`prepare.mjs`复制既有31–40受审输入循环并生成本任务入口；`verification.mjs`约束全200正式对象仅七个preservedMoveTarget变化，保全旧fixture和时间目标。新见证、初始快照、规则、所有src、正式美术、路线原来源与引用工具均锁定SHA。运行开始复制独立源快照；结束再次核对快照、当前源码、正式200对象和活动规则。

`playtest.mjs BEFORE SHA RULE_VERSION RULE_SHA WITNESSES SHA`运行正式入口真实Pointer，自然计时逐事件复演到独立PuzzleModel，核验sceneReady、原向整图实际尺寸、目标文本、三颗亮星及隔离MemoryHost记录。设置`REMAKE_VIEWPORT_WIDTH`/`REMAKE_VIEWPORT_HEIGHT`为320/568或496/1078。设置`STAR_TARGETS_PREFLIGHT_ONLY=1`仅运行静态及路线预检，不能视为GUI通过。

`selfcheck.mjs`包含全200范围、旧fixture、地图、时间、历史parMoves、见证及hash的拒绝检查。其结果不是可解、自然时间或难度证书。

输出仅写入`deliverables/star-targets41-50-20260927/pointer-support/`；已存在的运行证据不覆盖。41仍保用户接受未认证下界的例外，43当前U0不满足普通档下界，均在各运行行独立说明。
