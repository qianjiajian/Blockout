# 71–80三星条件验收

本目录仅验证71、75、76、78、79五个正式评分字段；76原先由算法回退得到32拖，本次添加明确的完整路线拖数目标。完整玩法、所有时间条件、其它195关及旧fixture保持。不重新认证难度，不修改玩家存档。

`prepare.mjs`复制41–50受审真实输入循环，生成本任务入口。`verification.mjs`严格检查全200正式对象只有五个preservedMoveTarget变化。新见证、初始快照、规则、全部src、正式美术、路线来源及引用工具均锁定SHA。运行使用私有源快照，结束再次检查当前200正式对象、所有绑定及规则锁。

`playtest.mjs BEFORE SHA RULE_VERSION RULE_SHA WITNESSES SHA`执行正式入口真实Pointer、自然计时，逐事件重放到独立PuzzleModel，核对全素材ready及有效图片尺寸、原向绘制、实际目标文字、三颗亮星和隔离MemoryHost记录。`REMAKE_VIEWPORT_WIDTH`/`REMAKE_VIEWPORT_HEIGHT`设320/568或496/1078。设置`STAR_TARGETS_PREFLIGHT_ONLY=1`仅运行数据与路线预检，不视为GUI通过。

输出仅写入`deliverables/star-targets71-80-20260927/pointer-support/`，历史运行不覆盖。71/76旧路线被当前完整形状离场扫掠拒绝，改用绑定新JSON见证的完整路线；75/78/79继续精确匹配旧有效路线。三星采用完整可达路线总拖，不称最优，不是难度下界认证。
