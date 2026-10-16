# 荣耀联赛 v2 有限证明接口

入口 `proof-contract.mjs`，规则 `v1.155.0`。这些工具只验数学、原模型路线、素材和积分；`accepted:true` 不代表布局多样性、机制强度、双屏 Pointer 或自然时间通过，更不写生产关卡。

```js
import { loadLeagueProofRuntime, probePlainLeagueLevel,
  verifyLeagueCandidate, revalidateSuccessfulReceipt } from './proof-contract.mjs';
const runtime = await loadLeagueProofRuntime();
const plain = await probePlainLeagueLevel(runtime,
  {level, sourceLevelId, attemptKey: 'source-18-pool'},
  {floor: 16, searchUpper: 30, budget: {maxStates: 10000}});
const final = await verifyLeagueCandidate(runtime,
  {index, sourceLevelId, level, drags, requiredMechanisms: ['key-lock']});
```

最终对象须使用 `id=900000+index`、180秒、单关金币0，困难/超难循环由index核对。`requiredMechanisms`来自整体100槽设计计划；不能沿用每日挑战“每关必须有最新机制”的更强限制。所有实际出现机制仍按联赛index与现行 `MECHANISM_GUIDE` 检查不提前解锁。

## 状态上限

- `discoveredStates === rawFullBoardStates`：不同完整、有标签的已提交棋盘，包括停车端点、每次自动消除闭包中的中间棋盘；硬上限10000。
- `quotientDiscoveredStates`：去掉所有可提前清除对象、合并同形同色对象后的数学代表棋盘，单列显示，不能代替原始完整棋盘上限。
- `exploredStates`：实际展开的代表棋盘。
- `microDiscoveredStates / microExploredStates`：单次连续持块内的可达位置；可以转弯，与提交棋盘分列。
- 任何状态/转移/微状态/时间预算中断都返回UNKNOWN；部分已知floor不冒充完整目标通过。

预算参数仅为 `maxStates / maxTransitions / maxMicroStates / maxDragStates / maxMilliseconds`。不接受未知字段、Infinity或超过硬上限的值。求解前先检查配置，再占用尝试ledger。

## 输入重试与证据

每个候选谱系使用稳定 `attemptKey`。失败后下一输入必须改变实际颜色和形状清单；元数据、名字、编号和只换色/只换形均不够。请求/结果使用独占创建文件，旧输入不能换工具重复搜索。报告包含完整level、route、source、规则文件、模型与求解工具SHA。

旧成功但只有quotient计数的本轮候选，可且仅可通过 `revalidateSuccessfulReceipt(runtime, receiptPath)` 做一次新raw核验。函数拒绝旧失败、部分证明、已经具备raw证据、错图或错路线；固定ledger `deliverables/league-v2-20261008/proof/raw-success-revalidation` 保留结果与旧新链接。11个plain旧成功的集中核验映射见 `proof/successful-raw-revalidation-1791390687852.json`，全部raw状态数659–7411。旧原报告不改。

唯一配置纠错入口 `retryUnsearchedConfiguration:true` 仅适用于旧记录显示参数名错误、上下界搜索均未开始的同图，保留旧INVALID并追加新记录。任何实际搜索耗尽记录不适用。

## 下界与上界

纯静态下界用完整持块可达搜索；提前清除闭包只在普通单层、固定门、无库存/机关图上使用。原机制图必须先经过明确支持的成本不增投影：静态约束擦除、真实满铺单批物理卷帘提前物化，或开局外层对象投影。冰门不能直接套贪心清除；升降不能当普通物理卷帘；隐藏/队列投影只证明下界，绝不提供原图上界。

完整路线必须分别通过第一接触出口的canonical回放与新建PuzzleModel独立回放。最终还直接运行 `LeagueRun` 和 `finishLeagueAttempt`，验证1–3个实心矩形积分块、开局完整连续持块无法出门、后半路线才完整消除、每个10分、成功入榜/失败0/退出清空。Q0检查覆盖隐藏、队列和每层颜色的实际GAME_ART路径及文件SHA。

运行资格测试：

```powershell
node --test tools/league-v2/proof-contract.test.mjs tools/league-v2/proof-soundness.test.mjs
```

13项通过，含独立完整PuzzleModel 0-1 Dijkstra与24个普通/同形同色图对照、持块转弯、冰/轴/锁/星/翻门成本不增、壳首剥与卷帘边界、raw闭包中间状态预算负测。
