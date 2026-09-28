# 31–40三星评分输入验收

工具覆盖本次实际变更的35、36、38、39四关。`playtest.mjs`读取当前正式`LEVELS`，不覆盖棋盘、不注入候选、不修改计时。每关新建MemoryHost，禁止原生Storage及IndexedDB，原存档不会读写。

调用格式：

```powershell
$env:REMAKE_VIEWPORT_WIDTH='320'
$env:REMAKE_VIEWPORT_HEIGHT='568'
node tools/star-targets31-40/playtest.mjs BEFORE_JSON RAW_SHA RULE_VERSION RULE_SHA WITNESSES_JSON RAW_SHA
```

另一尺寸为496×1078。`STAR_TARGETS_PREFLIGHT_ONLY=1`只运行数据和当前模型回放，不冒称输入验收。

新见证格式为`{beforeSha256,rows:[{id,level,drags,routeSha256,gameplaySha256,sourceEvidence?:{file,sha256}}],evidenceBindings?:{file:sha256}}`；level须是当前正式完整对象。总拖目标取完整见证长度，时间目标与旧值固定。35/39旧有效路线保持原样；36/38可使用独立的新路线文件，历史fixture原字节保持。不得把新路线称最优或新难度下界。

门禁核对完整200关只有4个`preservedMoveTarget`字段改变、全部旧fixture原样、其余源码/评分/资源无漂移、正式对象引用及全部真实库存、每步Pointer状态、自然时钟日志独立模型回放。结果页采集实际绘制的目标文字、3颗亮星、实际结算指标和MemoryHost持久化bestStars/bestMoves。实际图片尺寸、原向素材和逐场开局/结算截图一并保留。

输出在`deliverables/star-targets31-40-20260927/pointer-support/`，每个尺寸/进程使用独立目录。验收期间任一源文件、资源、规则或工具变化即保留FAIL，不重签旧结果。`selfcheck.mjs`仅验证评分范围门禁的负控，不表示路线或浏览器通过。
