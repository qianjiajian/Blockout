# Lv21–200正式续作：当前82关，仍余98关

## 最新进度（2026-09-22 23:50）

原19 + continuation63 = 82/180已接入并通过分批完整正式Pointer，剩98尚未完成。当前正式归档 `.codex-temp/remaining161-v110/adoption-cumulative63/adoption-typed.json` SHA `8b52e5870280fcdd77666812c0954b6b3493a544bfe6a91e2391ce9656878fd1`；campaign semantic `ea7add7e7aa7d492caed3301e229f80bb058745d28c0eac4e5a577010309d7c9`。1–20、未迁移关、原总时限/实际三星/奖励和存档保持。旧数据清理暂停，不删除原图、旧关或竞品资料。

新增124/197正式实操2/2通过：124保留95秒，31拖后剩63.49秒，60秒炸弹在实际可操作0.66秒解除；197保留165秒，23拖后剩143.08秒。证据 `playtest-results/revised-formal-timed-batch-2026-09-22T15-43-02-258Z/report.json` SHA `2664bc92c65f6637866edcc3bd9e43adee8871fbd98e4c8abcc8dd88dd95c019`，完整自然tick/模型快照独立重放，无输入漂移和真实存档访问。最新2图及180状态表：`deliverables/revised-formal-progress-v110-2026-09-22T15-45-32-632Z/index.html`。这是新增两关的当前画面，不是全82同次UI重拍；其余使用各自完整历史批次证据。

当前typecheck、96相关Node测试、200关adjacency=0、fresh Web/Wechat build+verify全部PASS；Wechat total20,630,872B，main3,212,014B，meta-ui4,086,745B/余量107,559B，0sourcemap。没有修改包体门槛或UI美术。下方80前曾出现的138类型错误已通过仅类型层等价生成修正，没有改变两个队列对象、关卡语义或历史候选。未运行手机实机、全局所有测试或正式发布，不重捕获旧freeze。

### 后续批次必须使用的生成入口

旧 `revised-continuation-batch.mjs prepare` 仍负责独立来源/空间/模型检查。由于已归档的138候选保留两块作者队列metadata，原JSON直写会触发BlockSpec额外字段错误；不得删字段、改旧候选SHA或放宽全局BlockSpec。新prepare后使用 `revised-continuation-typed-emission.mjs prepare ARCHIVE SHA PATCH SHA OUTPUT` 生成新的`adoption-typed.json`和`data-typed.patch`，只应用typed补丁；然后运行 `verify TYPED_ARCHIVE SHA --applied` 及原continuation模型验证，最后以typed归档跑真实输入/构建。新工具将两块提为局部const，精确owner类型satisfies；全表实际TypeScript检查、转译对象逐字段相等、原归档/补丁只读保留。不能单用类型验证取代模型、计时或UI。

累计62归档及typed产物只是未应用的中间证据；累计63直接从已应用61追加124/197。后续以累计63 typed归档为previousArchive，不回到未应用62或原63未typed归档。

必要腾挪下界与时间三星重标仍按用户要求暂不认证；首次机制引入全季来源尚未核定。98个待办含已确证规则冲突、来源缺项及未完成求解/实现，不能把有图或旧可解证书当新版完成；冲突逐关见 `revised-source-blockers-v110.md`。下方75/64/33段均是保留的历史记录。

完整180关分类见 `.codex-temp/remaining147-v110/core-111-140/closeout-ledger/campaign-21-200-classification-82-final-20260922.md`（JSON SHA `12321641225a5fffeb94c566ac2b2f9fabccf072aff6b3542b42dc413e95f32f`）。未完成98＝33硬冲突＋63来源未齐＋第33关待完整路线＋第70关实现/来源缺口。480直接证据绑定与最新UI2021输入均已独立重算，无漂移；分类与求解/正式发布不是同一验收。

## 最新进度（2026-09-22 23:02）

累计原19 + continuation56 = 75/180正式通过，仍余105。新归档 `.codex-temp/remaining161-v110/adoption-cumulative56/adoption.json` SHA `a2aaa3ad0afc09574f5598eaa6e70a54841e162d40c6dff19dff28a540b53b4e`；campaign semantic `b62b7c70600e35bcb2742d862e6a0c17665c785677e6ff498ce85637556a3fe0`。21–200之外及未改关、玩家存档保持，不清理原始旧数据。

最新74/120/170/179完整自然时钟Pointer 4/4 PASS，模型全状态及计时逐事件独立重放；120保留15/25/50秒炸弹，真实剥层解除验证通过。证据 `playtest-results/revised-formal-timed-batch-2026-09-22T14-56-21-818Z/report.json`，图集 `deliverables/revised-formal-progress-v110-2026-09-22T14-59-45-884Z/index.html`。此前71关使用各自完整批次证据，不称全75同批UI重跑。

fresh Web/typecheck/Wechat build+verify均PASS，总包20,630,812B，main3,211,954B，0sourcemap；200关开局同色相邻0。原时限/实际三星/奖励保留，时间三星重标与必要腾挪下界仍未认证，不是手机实机或发布通过。详细命令、剩余源冲突与各批SHA见WORKSTATE。下方64及33节为历史记录。

## 最新进度（2026-09-22 21:55）

原19关+续作45关已正式接入，保留其余155关数据及原时限/实际三星；64/180，不是全季完成。当前归档 `.codex-temp/remaining161-v110/adoption-cumulative45/adoption.json` SHA `85fd4291bb994a37c4089c3322f0a7648f90c319bd3bcd28bc7b8db9ef1376f5`。最新54/56/57/116/127/157/178/192共8关243拖正式Pointer、模型、自然时钟、存档隔离均通过；此前19+17+20关各有完整独立批次证据，不拼接中断运行。

最新8图：`deliverables/revised-formal-progress-v110-2026-09-22T13-52-16-523Z/index.html`；前20图：`deliverables/revised-formal-progress-v110-2026-09-22T13-42-21-055Z/index.html`。完整SHA/命令/已知冲突见WORKSTATE最新64节。当前Web/typecheck/Wechat build+verify通过，总包20,630,285B；build-only无损关卡压缩与字节相同图片复用未更改玩法或源图。必要腾挪与时间三星重标仍待后续，手机实机/发布未执行。

下文是最早33关批次的历史证据，参数和旧档保留，不代表当前累计数。

2026-09-22，规则v1.10.0。此文是进度/证据记录，不修改不可变规则。

## 已完成与未完成

本轮新增40、42、45、51、53、61、80、81、82、85、86、96、193、195，共14关；累计33/180关新版正式数据。原19关、第1–20关、2/5互换、正式存档不改。其余147关保留旧正式地图，不以旧图冒充新规则已完成。

本轮14关经过独立视频来源核定、机制数量/承载关系、轮廓/满铺/相邻异色/实际门宽与每色唯一、fresh模型完整回放。正式原加载入口297次真实Pointer全部完成；原时限自然运行，未冻结或回拨，最少剩余61.56秒。旧奖励、名称、实际三星目标和总时间保留。必要腾挪下界、人工时间/三星重新标定、全季机制首次引入和手机实机未认证。

最新图集：`deliverables/revised-formal-progress-v110-2026-09-22T11-42-34-976Z/index.html`。含本轮14张正式开局与竞品帧、逐关完整来源/布局/路线JSON及180关状态表。390px排版、图片加载和状态筛选实测通过；主任务亲看40/53/61及手机页。不是全部180关新图。

## 实际保留参数

| 关 | 原时限 | 原拖数星 | 原时间星 | 本次路线拖数 |
|---|---:|---:|---:|---:|
|40|90|34|64|20|
|42|135|49|97|27|
|45|150|41|108|20|
|51|120|46|86|18|
|53|180|52|129|17|
|61|130|29|93|19|
|80|180|34|129|18|
|81|120|29|86|20|
|82|120|32|86|24|
|85|165|25|118|19|
|86|80|31|57|17|
|96|180|47|129|34|
|193|85|35|61|24|
|195|115|26|82|20|

单位：秒/次。表格证明参数保留和有完成路线，不代表已按人类试玩重新标定三星。

## 证据与复跑

- 累计归档：`.codex-temp/remaining161-v110/adoption-cumulative14-v2/adoption.json`，SHA `56bd552b53e016ca90e2060c34c690e6c07282afaa671160119b613757a899ee`。保留首3归档链及最初200关基线，旧rows不改。
- 正式Pointer：`playtest-results/revised-formal-levels-2026-09-22T11-34-28-549Z/report.json`，SHA `1101c9e8f78a9aae531ffa41e0673144bd27eb0c0e16b1cce9b519591d1dcbd8`。14/14、297拖、983输入、42截图、Storage/IndexedDB访问0、errors=[]，前后无漂移。
- 图集记录SHA：`21b02484affc6f4fe409bc0677f8482b3c4faf091ee3beb92bf280850c592a8f`。
- 当前campaign semantic SHA：`32b4c81715f5231240e0d5ffa103fd76500da850eec507c1c396f416a71e5488`。独立复核全部874个模型验收输入、132个候选/来源文件，未改186关hash及实际三星一致。

```powershell
node tools/revised-continuation-batch.mjs verify .codex-temp/remaining161-v110/adoption-cumulative14-v2/adoption.json 56bd552b53e016ca90e2060c34c690e6c07282afaa671160119b613757a899ee
node --test tools/revised-continuation-batch.test.mjs
node tools/playtest-revised-formal-levels.mjs --continuation .codex-temp/remaining161-v110/adoption-cumulative14-v2/adoption.json 56bd552b53e016ca90e2060c34c690e6c07282afaa671160119b613757a899ee
```

新累计校验与首批19的历史全局校验不可混用：后者181个未改关断言属于当时基线。`tests/revisedReviewedLevels.test.ts`现显式测试首批阶段，另断言19关在最终表保持；新增累计测试核对当前全部200关。

候选历史`artManifest.ts`实现绑定发生了并行UI变化：只对该精确路径记录old/new，并重新进行当前素材、来源、空间和模型验证。来源review的任何绑定、core及旧helper变化不豁免。当前美术字节和所有校验依赖绑定到新验收；没有覆写旧候选或旧证书来伪装通过。

## 构建与未通过项

已实跑：12版本规则锁；新增6项Node合同负测；6文件129项核心/首批Vitest；全200关相邻异色0；typecheck、Web build。构建期物化/压缩最终200关新增6项测试通过，逐字段及实际getLevel/getLevelStrict深等价，包括显式undefined；不携带历史作者overlay进微信包，不删机制或改关卡内容。历史共享shape数组引用身份不序列化，PuzzleModel自身复制shape；此区别在编译报告显式记录。

当前微信隔离包`.codex-temp/remaining161-v110/wechat-final33`**生成成功但包体verify失败**：meta-ui 4,211,524B，超4MiB分包17,220B；总包21,044,065B，超20MiB总限72,545B。对应并行收藏素材增加后的共同快照，不以之前包体PASS覆盖此失败；本关卡任务未修改或删除他方资源。需UI/资源批次治理后共同重建，未发布/未capture freeze。

该包实际JS及图片的Chromium微信shim启动、故障重试测试3场景通过，证据`playtest-results/wechat-startup-revised33-2026-09-22/`。这是兼容测试，不是微信手机实机，也不能豁免包体超限。

## 下一批准备与真实阻塞

- 39：已确认10个非星冰门与8色唯一冲突，按用户明确决定暂缓，不扩色或删冰。
- 33：数轮有界搜索仅前缀，尚无通关路线；不是无解证明。
- 62：逐帧纠正为6×9/49格，开局13/全关23、隐藏7、冰5与横轴同体、队列H3/SQ2/L4。`early/next-62/partial-report.json`记录实验shape字段错误导致未过静态，候选0，不算完成。
- 76：来源实际18开局/21全关、真实电梯隐藏3、M11为4/6、冰14一块带壳。`middle/next-76/`已留新源报告；正数电梯adapter原型16测试通过，但未接共享validator、没有76候选。
- 150/151：有实验路线，但冰下翻转门潜在初态未核定，不能由解冰后第一帧反推，未接入。
- 187等：旧资料存在M11比例/棋盘尺寸误记；不靠改规则、删机制或将来源未知填0批量凑通过。

所有`.codex-temp/remaining161-v110/`绑定候选、源review、帧/视频及归档必须保留，后续在新子目录继续，不覆盖历史。未完成147关逐关状态以新图集progress.json为准。
