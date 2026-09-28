# 51–60三星评分输入验收

工具覆盖本次实际变更的52、54、55、56、58、59六关。读取当前正式`LEVELS`，不覆盖棋盘、不注入候选、不修改计时。每关新建MemoryHost，禁止原生Storage及IndexedDB，原存档不会读写。

```powershell
$env:REMAKE_VIEWPORT_WIDTH='320'
$env:REMAKE_VIEWPORT_HEIGHT='568'
node tools/star-targets51-60/playtest.mjs BEFORE_JSON RAW_SHA RULE_VERSION RULE_SHA WITNESSES_JSON RAW_SHA
```

另一尺寸为496×1078。`STAR_TARGETS_PREFLIGHT_ONLY=1`只运行数据门禁和当前模型回放，不表示实际输入验收。

见证格式为`{beforeSha256,rows:[{id,level,drags,routeSha256,gameplaySha256,sourceEvidence:{file,sha256}}],evidenceBindings?:{file:sha256}}`；level须是当前正式完整对象。总拖目标采用完整见证长度45/48/34/40/41/51，时间星75/129/129/97/90/129秒固定。六关旧有效路线保持原样，历史fixture原字节保持。59下界仍UNKNOWN，58既有例外保持，评分通过不等于新难度下界认证。

门禁核对完整200关仅六个`preservedMoveTarget`字段改变、全部旧fixture原样、其余源码/评分/资源无漂移、正式对象引用及全部真实库存、每步Pointer状态、自然时钟日志逐事件独立模型回放。54/56旧fixture与当前地图间三处已知轴属性差异逐字段限定，当前路线另由`current-route-source.json`绑定，不套旧下界证书。结果页采集实际绘制的目标文字、三颗亮星、实际结算指标和MemoryHost新记录bestStars/bestMoves。实际图片尺寸、原向素材和逐场开局/结算截图一并保留。

输出在`deliverables/star-targets51-60-20260927/pointer-support/`，每个尺寸/进程使用独立目录。验收期间任一源文件、资源、规则或工具变化即保留FAIL，不重签旧结果。程序输入不称真人盲测，脚本不打包、不发布。
