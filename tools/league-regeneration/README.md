# 荣耀联赛100关有限生成审计

本目录只负责隔离候选生成，不切换 `src/core/leagueLevels.ts`。难度按困难、困难、超难、困难、困难循环；困难候选要求真实必要腾挪下限16且完整路线不超过20，超难候选要求下限21且完整路线不超过30。

每个候选都有固定的有限求解预算。下限或上限求解超时、无解、求解器不支持或静态门禁失败时，候选立即淘汰；随后只尝试有限的色块形状/颜色变异，并以候选内容 SHA 指纹去重。记录至少包含 `mutationIndex`、`solverAttempt`、`budget`、`fingerprint` 和 `failureReasons`。预算耗尽后不会继续递归或无限重试。

当前证据：

- 早段原型探针：`early-plain-probe.mjs`，仅用于验证形色变异和预算机制，尚不足以作为1–19逐关证明。
- 中段：`mid-generate-rotate180.mjs` 与 `mid-proof-20-64.mjs`。
- 后段：`late-generate.mjs`。
- 第63关专项有限重试：`retry-level63-finite.mjs`（基准后每个变体同时换形换色，共8个）和 `retry-mid63-retile.mjs`（2个局部重铺变体）；两组均失败即止，结果写入 `formal/mid-63-finite-retry-subagent.json`、`mid-63-finite-retry.json` 与 `mid-63-retile-retry.json`，不合并为正式关卡。
- 第96关现行对象复核：`retry-level96-finite.mjs` 最多8个指纹，基准已尝试时跳过，其余变体同时换形换色；现行对象回放为U12，7个变体均未完成权威回放，结果写入 `formal/level96-finite-retry.json`。
- 第20关困难候选复核：`retry-hard20-retile.mjs` 固定4个换形换色变体；4次权威路线均耗尽，结果写入 `formal/hard20-retile-finite.json`。
- 第20关卷帘覆盖复核另有4个固定换形换色变体，均因隐藏区覆盖冲突在结构校验阶段停止，证据为 `formal/hard20-bound-review.json`。
- 第14关困难候选复核：`retry-level14-finite.mjs` 固定批次先跳过已尝试基准，再对最多2个可生成的局部重铺换色变体执行有限权威路线搜索；两次均截止且没有完整回放，结果写入 `formal/level14-finite-retry.json`。
- 第16关困难候选复核：`retry-level16-finite.mjs` 先跳过已尝试基准，再对3个横向三格换形并换色的变体执行原生结构校验；3次均因越界或重叠被拒，结果写入 `formal/level16-finite-retry.json`。
- 第23关超难候选复核：`retry-super23-finite.mjs` 固定最多9个候选，先跳过基准，再执行真实二格重铺与颜色交换；6个变体完整回放为U17（低于21–30），2个变体在有限预算内未找到路线，结果写入 `formal/super23-finite-retry.json`。
- 汇总：`summarize-100-finite.mjs` 生成 `deliverables/league-regeneration-20261004/finite-100-summary.json`。

只有100关都同时通过结构、真实回放、下限证明和上限路线，才允许另行接入联赛选择器。第一轮汇总曾接受5关（7、9、12、71、81），后续轮次的复核结果以各自章节和最新隔离报告为准，正式联赛仍使用既有数据。积分色块还必须是每关1–3个、填充矩形，并在清除事件后半段完整移除。

## 主线模板批次（2026-10-05）

`generate-from-mainline-templates.mjs` 从当前 `src/core/levels.ts` 的主线第1–100关逐关取模板，保留原棋盘掩码、机关字段、队列和出口，再对同一模板做确定性的局部布局置换与全局色板置换。候选统一使用联赛的 `revised-2026-09-27-v1.5` 运行时；这只切换联赛运行合同，不改模板的棋盘和机关内容。生成器会把生成器队列块留在原生成器上，只尝试经 `validateLevel` 复核的等形状位置交换；因此不会把队列共用的出生点误当作开局色块而制造重叠。每个候选另外登记1–3个填充轴对齐矩形积分块候选，后半段计分时序仍需独立回放确认。

本批输出到 `deliverables/league-regeneration-20261005/template/mainline-template-candidates.json`，100/100 行通过结构校验，96 行发生安全位置布局变化，4 行在无法安全置换时保留色板变化并记录 `layoutChanged:false`。`verify-mainline-template-candidates.mjs` 会重新加载主线模板、复核来源映射、编号、困难/超难节奏、积分块数量和结构校验。

这只是隔离候选批次，`formalEligibility:false`。它没有替换 `src/core/leagueLevelData.ts`、没有切换选择器，也没有改变主线200关或玩家存档；正式接入仍需对每一行完成同一对象的真实完整路线、L/U、后半段积分块计分和机制门禁。

本批真实验收由 `audit-template-1-33.mjs`、`audit-template-34-66.mjs`、`audit-template-67-100.mjs` 分段执行，汇总脚本为 `summarize-template-formal.mjs`。当前只有第15关满足同一对象的完整回放（困难档非清除拖动19）、L16下界证明和后半段3个积分块各10分；其余99关因路线低于难度下限、求解预算耗尽、下界未证、回放无效或积分块时序未通过而保持阻塞。汇总 `formal-template-status.json` 为 `FORMAL_DATA_BLOCKED`，不能把这批候选写入正式联赛注册表。

## 第二轮模板重选与定向验收（2026-10-05）

`reselect-mainline-templates-round2.mjs` 先按机制解锁和困难/超难代理复杂度重选主线来源，再由 `round2-early-1-19.mjs`、`audit-round2-20-64.mjs`、`audit-round2-65-100.mjs` 使用有限预算执行同对象路线、L/U和积分门禁。早段1–19通过11关；中段20–64为0/45，计时炸弹、翻门和生成器因当前空间求解器不支持而保留阻塞，53/58/63虽有完整路线但只有20次非清除拖动，低于超难L21。

早段再执行 `round2-early-targeted.mjs`，对1、2、3、4、5、8、13、18各尝试最多8个固定变体；原1、2、4、5候选因第6关才解锁的冰门和第15关才解锁的外壳而被拒绝。索引3改用主线158的有限适配候选，移除索引3尚未解锁的冰门、冻结块、外壳和卷帘，L21 threshold-proven、U22、3个后半段积分矩形各10分并完成fresh回放。索引8、13、18的主线198适配候选仍因第60关才解锁的钥匙锁而阻塞。中段和后段分别采用 `round2-mid-targeted.mjs`、`round2-late-targeted.mjs` 做有限定向重选：困难候选使用主线9/12，超难候选使用主线158/198/112；20–64共45关、65–100共36关全部得到同对象可回放路线、L21/L16证明和后半段矩形积分块证据。`verify-round2-score-early.mjs`、`verify-round2-score-early-targeted.mjs`、`verify-source198-stripped-early-8-13-18-score.mjs`、`verify-source158-stripped-index3-score.mjs`、`verify-round2-score-mid-targeted.mjs` 与 `verify-round2-score-late-targeted.mjs` 的积分复核均PASS。

早段困难补搜报告 `early/early-1-5-compliance-blocked.json` 记录了无冰门/无冻结块/无外壳候选的有限尝试：虽然得到U16–20路线和30分积分见证，但所有L16证明均为`unknown`、`max-states`或`relaxed-shortcut`，因此未接入。`final-independent-audit.mjs` 对最终100行做独立对象复核，结果为93行证据门禁通过、7行机制解锁阻塞；去掉ID、名称和全局换色后仍有6组几何重复，且99条下界记录缺少候选对象SHA绑定。该报告状态为`INDEPENDENT_AUDIT_FINDINGS`。

汇总 `deliverables/league-regeneration-20261005/round2/formal-round2-status.json` 当前为 `FORMAL_DATA_BLOCKED`：100个索引无缺失/重复，93关通过路线/L/U/积分门禁，7关（1、2、4、5、8、13、18）因机制解锁不匹配阻塞。独立只读审计另发现6组几何重复（仅改ID/名称/全局色板不能算独立联赛关卡），且99条下界记录没有候选对象SHA绑定；因此不能把这批候选接入生产或发布。生产 `src/core/leagueLevelData.ts`、`src/core/leagueLevels.ts`、主线 `LEVELS`、选择器和玩家存档未修改。

## 第三轮隔离修复与独立契约（2026-10-05）

`round3-unique-mid.mjs` 对中段20–48号槽位执行最多100次有限的真实局部位置交换，并同时换色；不是只改ID、名称或全局色板。实际99次尝试得到20条候选，20条均有同对象完整路线、困难/超难档L/U、绑定候选对象的下界SHA、后半段1–3个矩形积分块和10分回放。`verify-round3-unique-mid.mjs` 与 `verify-round3-unique-mid-score.mjs` 分别通过20/20唯一几何和20/20积分回放，证据在 `deliverables/league-regeneration-20261005/round3/unique-mid/`。

新增 `round3-contract.mjs` 作为独立只读契约，检查机制解锁、候选/下界/路线SHA、完整回放证据、积分块固定10分、不得首拖直接出场及开局覆盖；`round3-contract.test.mjs` 为4/4通过。首次合并审计的16/84只是旧开局判定和非严格Q0口径下的中间结果，已由后续真实初始模型判定和严格Q0复核取代；没有改写第二轮汇总或任何生产数据。

第三轮候选和合并审计均保持 `ISOLATED_EVIDENCE_ONLY`；在7个机制阻塞、下界绑定和积分块时序问题解决前，不接入 `src/core/leagueLevelData.ts`、`src/core/leagueLevels.ts`、选择器、主线或玩家存档。

### 第三轮严格契约复核与第四轮有限重试（2026-10-06）

`round3-contract.mjs` 已将开局积分块检查改为真实初始 `PuzzleModel` 状态：逐个出口尝试，不会把完成前置移动后的路线事件误判为“开局可直接移出”；同时合并审计启用严格 Q0（开局满铺、无重叠、无相邻同色）并对完整路线做 fresh 回放。契约回归测试为4/4通过。重跑 `round3-merge-audit.mjs` 后，100行无缺失，严格证据通过9行、阻塞91行；阻塞原因计数为下界对象SHA缺失79、Q0相邻同色16、早解锁机制11、积分块固定10分不满足9（同一行可有多个原因）。通过行是20、21、22、26、27、30、32、42、46；报告为 `ROUND3_INDEPENDENT_AUDIT_FINDINGS`。

第四轮中段唯一布局固定100次预算，13个槽位接受0，全部保留有限阻塞证据；早段修复在固定时间盒内接受8号（L21/U28、Q0通过、3个积分块共30分且成功/失败结算回放通过），1/2/4/5在源158去除早期机关后仍各有4组Q0相邻同色而阻塞，13/18明确记为 `PENDING_FINITE_BATCH`，不冒称通过。8号也只停留在第四轮隔离候选，未合并第二轮或生产数据。

证据：`deliverables/league-regeneration-20261005/round3/combined/formal-round3-status.json`、`deliverables/league-regeneration-20261006/round4/unique/formal-unique-layouts.json`、`deliverables/league-regeneration-20261005/round4/early/`。所有结果仍为隔离证据，未修改正式联赛数据、主线200关、选择器或玩家存档。
