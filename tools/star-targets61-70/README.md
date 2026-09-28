# 61–70 三星条件正式输入验收

本工具只验证明确指定的三星拖数调整，不改地图，不重证难度，也不访问玩家持久存档。基线为本批 `before.json`，原始 SHA256 固定在 `verification.mjs`。63、66、70 的后续正式修复由当前基线保留。

如果主任务提交 `before-write.json`，额外要求其 v1.97 基线链接原始 SHA 与已完成的 `concurrentCheck:{file,sha256}`；工具独立重建并比较 200 关，只接纳 v1.96/v1.97 已知十个评分数值，不接受其它玩法或无关源码变化。原始基线和并行审计也进入本次私有快照及哈希绑定。

`node tools/star-targets61-70/prepare.mjs` 从固定 SHA 的近期工具生成本批专用 Pointer 循环；`node tools/star-targets61-70/selfcheck.mjs` 运行范围、来源、规范 Pointer 路径和逐事件计时校验的合成正负控。资格报告不等于关卡或 GUI 已通过。

正式评分写入并由主任务明确通知后运行：

```text
node tools/star-targets61-70/playtest.mjs BEFORE SHA RULE_VERSION RULE_SHA WITNESSES SHA ID:TARGET,ID:TARGET
```

最后参数必须与本次规则和新见证一致，不能自行从旧路线推定获批范围。分别设置 `REMAKE_VIEWPORT_WIDTH/HEIGHT` 为 `320/568` 和 `496/1078`。`STAR_TARGETS_PREFLIGHT_ONLY=1` 仅执行范围、来源和完整空间路线前置检查，明确不记 GUI/自然钟通过。

见证格式与近期批次兼容：`{beforeSha256,evidenceBindings,rows:[{id,level,drags,routeSha256,gameplaySha256,sourceEvidence:{file,sha256},originalSource?,currentRouteNonClearingDrags,difficultyNote?}]}`。`level` 是评分写入后的实际完整对象。`sourceEvidence` 绑定同一路线及当前玩法；若旧路线需要修路径，应另存 fresh 见证，`originalSource` 仅作历史追溯，不冒称修后路径与旧路径相同。

每屏使用完整私有源码/资源快照，`getLevelStrict` 与 `loadLevel(id,true)` 的真实正式对象，不注入候选。真实浏览器 Pointer、自然 tick 和退出动画逐事件日志由独立当前模型完整重放；验证两条目标实际文字、三亮星、MemoryHost 的 bestStars=3/bestMoves、图片真实尺寸、原向整图及零真实 Storage 访问。结束时重核全部输入 SHA 与全部 200 个正式对象；漂移直接保留失败，不能改签历史报告。浏览器鼠标模拟不称手机实测或真人盲测。
