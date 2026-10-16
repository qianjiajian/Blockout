# formal-v2 严格空间证据接口

只写新候选与新报告，不改 `src/`、旧工具、旧证明、规则或玩家存档。

```js
import { loadRuntime, verifyCandidate, levelSha256, routeSha256 } from './contract.mjs';
const runtime = await loadRuntime();
const report = await verifyCandidate(runtime, {
  formalId: 'daily-mechanisms-color-exit-1-d3-01',
  stageKey: 'mechanisms-color-exit-1', difficulty: 3,
  sourceLevelId: 198,
  level, // 最终完整对象：id必须为198，reward必须为0；运行不得再重写
  drags, // 可选；无路线则有限 searchRevisedLevel
  levelSha256: levelSha256(level), // 可选；提供时必须一致
  routeSha256: routeSha256(drags), // 可选；提供时必须一致
  // 活动炸弹必须另给 timeSchedule，见下文；不以无tick回放当deadline证明。
}, {
  routeBudget: { maxMilliseconds: 5000, maxStates: 25000 },
  lowerBudget: { maxMilliseconds: 5000, maxStates: 60000, maxTransitions: 350000 },
});
```

单文件入口：`node tools/daily-challenge/formal-v2/verify-candidate.mjs candidate.json new-report.json`。不覆盖已有报告。exit0表示空间门禁通过，仍待Pointer/时间；exit2为未通过；exit1为输入/工具错误。

## 强制门禁

- D1 L≥16且完整U≤20；D2 L≥21且完整U≤30；D3 L≥31且完整有限U。D3没有用户未确认的上限；预算上限属于计算资源限制。
- 每次现场下界求证，不读取候选里的外部 lowerBound/PASS/status。运行对象整体 canonical SHA、源整体SHA、路线SHA、全部实际工具/物理模型依赖文件SHA均落档。包含seams/计时/规则/救援等所有JSON字段，不采用旧省字段布局hash。
- 证明工具链单独绑定物理模型、求解和检查代码的实际闭包；主线数据、每日正式注册表及选择器不进入工具SHA，避免生成含证明hash的注册表后自指失效。每槽来源完整对象仍独立绑定SHA。
- 实际原对象 `validateLevel`、主线棋盘mask等价基准、原时限、最终id/reward、阶段机制与解锁、全区域满铺/隐藏满铺/相邻同色/形状比例/出口兼容及唯一色、生成器队列异色、所有块/壳每层原向素材与资产文件SHA。
- 泛用构造检查来自旧revisedCandidateAudit，但不冒用它的v1.2/profile或竞品原创mask合同；仅复用与当前日关适用的构造检查，源/机制/profile独立检查。新每日拒绝Lv5旧旋转贴图例外。
- 原图先做 `replayRevisedRoute`（包含canonical自动出口策略），再从第二个fresh PuzzleModel逐拖回放，对snapshot清除计数差区分消除/剥壳/非清除，检查最后blocks/queuedBlocks全空，独立计数一致。第二模型启用deferExitCompletion，每次离场显式完成动画回调后才执行下一拖，记录翻门前后状态；包括v1.5本次才解冻的门不立即参与翻转。仅用exitSide个数计非清除不合格。
- 低于下限的完整路线输出COUNTEREXAMPLE；U过高只表示尚缺该档上界，不宣称实际最小值超标；unknown/unsupported不转PASS。
- accepted=true仅代表 `SPATIAL_DIFFICULTY_VERIFIED_AWAITING_POINTER_TIME`；formalReady始终false，Pointer、自然时限由后续入口独立验收。

## 实际支持范围

| 路径 | 适用域与限制 |
| --- | --- |
| fresh plain floor v2 | v1.4/v1.5；≤128外框格/≤64块；固定普通出口、单层静态块、可为异形块/原创mask；无冰/壳/帘/生成器/轴/锁/星/格/炸弹/翻门/旧救援/seams。完整持块可达端点，安全零成本删除闭包，相同颜色和原向形状body自同构商。 |
| fresh constraint erasure plain floor v2 | 无壳/隐藏/队列/自动位移时，仅移除冰、锁、轴、星、彩格、翻门开闭及炸弹deadline约束；全部body、形状、位置、颜色和出口顺序保持。证明绑定原对象与投影对象两个SHA。只用于下界。 |
| fresh full physical shutter materialization plain floor v2 | 普通实体卷帘的单批隐藏块独立满铺其矩形，所有开局/隐藏实体及帘区相互不重叠时，将全部隐藏体提前实体化，保留所有块并删除帘/静态约束。沿原解在揭帘前保持对应隐藏块静止，占用并集与原实体帘一致；揭帘映射零步，之后逐步同动作，成本不增。拒绝lift、队列、多壳、非空间帘、多批覆盖和未知字段；优先于删隐藏体的inventory放宽。 |
| fresh opening inventory erasure plain floor v2 | 外壳/真实卷帘/真实lift/生成器适用：保留开局非隐藏且非队列实体的最外层，将首次剥层映射为清除该投影实体，删除hidden/queue及设施并移除上述约束。原动作映射同拖或零步，成本不增；不删除库存后沿用旧冰计数，不将投影路线冒充完整原图上界。 |
| fresh revised floor | 明确revised v1.1/v1.2/v1.4/v1.5；空间模型原生处理数字冰、冰门、外壳、卷帘、真实升降、按move/clear生成器、轴、钥锁、星、彩格。复杂实例可能在有限预算unknown；不等于已取得这些机制450槽证书。 |
| 原图路线保守不支持 | legacy profile、没有明确时序的活动炸弹、时间生成器、旧自动升降/传送带、rotationBadge、staging类旧隐藏字段。翻门现支持逐次等待离场完成的空间路线，lower必须走经论证的永久开门投影，拒绝旧初开marker下界捷径；不宣称穷尽GUI动画交错或已验证自然计时。下界可适用约束投影不代表原图上界已受支持。 |

可静态删除的deadline/flip等约束只允许构造**下界动作超集**，不覆盖原图U、原机制参与性及真实计时验证。专用Lv120炸弹工具与其他批次native工具存在id/profile/机制资格边界，未擅自重绑为450通用证书。

拒绝旧 `repair-early-static-lower` 的“开局没有匹配边界出口→该块必挪1次”证书：块可以同一拖中移到出口并清除，成本0。相关反例已成为测试。

## plain最短上界辅助

`checkPlainFloor(level, runtime, {floor:16, searchUpper:20, maxStates:60000, maxTransitions:350000, maxMilliseconds:2200})` 会在同BFS继续找最少放宽非清除路线并返回drags/cost。该路线须通过原图canonical与fresh回放才能作为U；否则只可保留已证L。省略searchUpper只做下界。D2可用floor21/searchUpper30；D3使用显式有限探索上限（≤256），不将该资源值写成玩法上限。

`proveCandidateLower(runtime, level, difficulty, budget)` 为下界单独接口：依次选普通静态、合资格约束投影、普通卷帘满铺提前实体化、开局外层库存投影、通用完整checker；不接受外部证明，不证明原图可解、阶段合规或计时。

## 明确时序的炸弹原图上界

候选添加 `timeSchedule: {kind:'per-drag-and-unit-step-v1', secondsPerDrag:0.2, secondsPerUnitStep:0.2, secondsPerExitAnimation:0.4}`。每拖之前、每单位步之前以及每次离场之后推进原PuzzleModel时钟；不删除或暂停炸弹，动画等待同样消耗其他炸弹及总时限。等待不得短于当前正常动效离场完成最大值0.34秒（普通门0.26、剥壳0.34，均绑定实际源文件）。canonical门户选择与第二独立fresh模型全部完成并计数一致才可给U。

schedule完整SHA保存在报告顶层与route中；显式提供`timeScheduleSha256`时必须匹配。成功只记录`simulationTimeValidated:true`，自然计时、Pointer及最终formalReady仍为false。定时生成器与自动位移未资格，继续拒绝。

测试：`node --test tools/daily-challenge/formal-v2/contract.test.mjs tools/daily-challenge/formal-v2/constraint-projection.test.mjs tools/daily-challenge/formal-v2/inventory-projection.test.mjs tools/daily-challenge/formal-v2/proof-scheduled-route.test.mjs tools/daily-challenge/formal-v2/shutter-materialization-projection.test.mjs`，36项通过。覆盖32组小图阈值与通用完整checker交叉、相同body商、最短路线重建、预算中断、未知字段拒绝、伪PASS、完整hash与工具链去自指；三类投影逐步比较小图所有合法动作，翻门验证延迟回调及冰解冻资格；炸弹校验步前、离场动画中的倒计时和超时失败。首个完整实例为源198真实7×10棋盘D3，最终id198，L31/U44/74拖；仍待浏览器Pointer与时间，见 `deliverables/daily-formal-v2-20261007/proof-contract/`。开发期工具SHA变化后报告须fresh重验，旧报告不重标。
