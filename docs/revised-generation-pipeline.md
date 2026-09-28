# Lv21–200 新版候选管线

当前规则以 `docs/rules/manifest.json` 为准：文档v1.4.0，runtime仍为 `revised-2026-09-21-v1.2`。本文是工具说明与未完成项，不是第二份规则，也不是发布证书。

v1.4新增首个可操作稳定画面100%满铺（可见块实际足迹+未揭开的真实卷帘）。当前先在`render-revised-opening-preview`隔离看图路径接入检查，不代表下方旧完整候选发证入口已迁移。满铺不可替代可解、必要腾挪下界或时间/三星证书。

## v1.3迁移状态：规则已确认，管线未迁移

新机制首次引入关卡须与竞品一致；同一关内允许提前到开局，不要求逐隐藏批次照抄冰/壳分布，但开局/full数、机制总量/关键值及隐藏批量等硬门槛仍有效。旧来源事实原样保留，设计阶段重排单独记录。

以下命令、提案例子及已有Lv21证据描述的是v1.2.1实现。当前来源审计/artifact入口显式锁定旧文档，将对新active文档安全拒绝；不要只换版本号使其继续发证。先补齐有证据的首次引入合同，迁移阶段分布校验，再为新版本生成/复验候选；旧证书不自动升级。此状态是已知迁移待办，不是声明v1.3验收完成。

## 当前可以做什么

1. `pnpm levels:revised:inputs`：核对Lv21–30独立来源、原始数量、证据hash及已批准设计特例。原始竞品Lv26仍记8普通+3冰门；设计层允许普通口重配1–5，保留3冰门的5/9/14。来源事实不跟着候选重写。
2. `auditRevisedCandidate`：检查完整来源合同、候选几何与机制配额、首稳定开局/全关数量、两种30%占比、对称/连通/无内部墙、原创mask、相邻异色、对应星块支持的普通/星门同色配对、单口完整宽度等必要条件。卷帘初值和隐藏批量按同一索引配对，不分别排序。出口源宽度仅作为参考，不能倒推成必须照抄几何的规则。
3. `searchRevisedLevel`及`replayRevisedRoute`：固定抓点策略下找一条无道具空间路线，并用新建PuzzleModel回放。它是动作子集，找到长路线不证明最低难度，搜索完也不证明无解。
4. `checkRevisedRepositionFloor`：独立的必要腾挪阈值检查，见下节。它与可解见证互不替代。
5. `pnpm levels:revised:contracts`：从实际来源文件及已核定的三份审阅生成10关隔离输入合同，保留Lv21/29/30独立修订。合同不从候选测量反推；还记录每个真实隐藏批次的冰值、外壳数及冰壳同体关系。
6. `pnpm levels:revised:candidate --candidate=路径.json`：对隔离提案重新执行来源读取、静态检查、隐藏批次附属机制检查、空间求解、独立模型回放及该档位下界检查。自动生成全数据/来源/规则/工具绑定的实验报告，不接受提案自带PASS、来源配额或难度下界覆盖。

以上均未导入或写入正式LEVELS。`releaseApproved`保持false。机制隔离页不是Lv21–30候选集。

## 提案与证据产物

提案格式为JSON，顶层仅允许以下五个字段；`level`是完整LevelSpec，ID和profile必须与提案匹配。种子只是复现标签的一部分，完整数据SHA同样必须匹配，不能仅凭相同种子复用证据。

```json
{
  "schemaVersion": 1,
  "ruleVersion": "1.2.1",
  "levelId": 27,
  "seed": "作者实际使用的种子",
  "level": { "id": 27, "mechanismRules": "revised-2026-09-21-v1.2" }
}
```

上例的`level`只展示身份字段，不是可以运行的完整关卡。其他必要字段须由候选作者提供；不自动补块、补门、隐藏或改机制。

入口：`tools/revised-candidate-artifact.mjs`；来源适配：`tools/revised-candidate-source-contract.mjs`。

- `inputs`输出10关来源合同；合约标签不是已经分配给生成候选的种子。
- `validate --candidate=…`实际执行所有当前支持的检查；静态/附属机制/难度节奏不匹配时，不浪费搜索预算。`super-hard`来源档映射运行时`super`，其下界仍是20，不能由提案覆盖。
- `verify --candidate=… --previous=…`先检查旧报告校验和及所有绑定一致，再重新运行实际工具。它不是对旧PASS字段的背书；改写通过字段后重算SHA也不能跳过实际执行。
- 可选`--route=…`输入人工构造或搜索所得的路线，格式只能是`{schemaVersion:1,candidateSha256,drags}`。摘要必须匹配完整候选；每个drag只有blockId、逐格anchor path与可选exitSide。路线仍用新模型实际执行两次，非法、未完成或改数据后的旧路线均不能成为空间见证；不能自带PASS、下界或时间标记。复验须传同一条路线，原字节与语义摘要都绑定。
- 默认每个空间工具上限5000状态、1000个持块状态、250000转换、5000ms；可用`--max-states=… --max-drag-states=… --max-transitions=… --max-milliseconds=…`显式调整并记录。任一预算耗尽保留unknown，不自动提高难度门槛或伪装PASS。复验需使用与旧报告相同的预算，否则按新验证处理。
- 报告仅新建在`playtest-results/experiments/revised-candidate-artifacts/`，默认唯一文件名；`--out=…`也只能在此目录，不覆盖已有文件、正式源码或存档。退出码1表示入口/完整性错误；2表示已记录候选未通过当前静态/空间/下界门禁。即使当前工具均通过，也只到`awaiting-pointer-time-calibration`，不是发布批准。

每份报告绑定候选原字节SHA及规范JSON SHA（仅排序对象键，绝不重排数组）、seed/ID、有效来源合同及真实图片/JSON文件SHA、锁定文档和manifest、实际执行的源码依赖闭包与内存bundle SHA、Node/esbuild版本及编译选项/依赖锁、实际预算。编译后、执行前后、写报告前复核文件；中途漂移直接拒绝。加载过的入口自身变更也须重新启动。

校验和是漂移/篡改检测，不是数字签名，也不是来源视觉判断的数学证明。只有本次实际求解/回放/阈值工具的输出能成为本次证据。`pointerReplay`、`sameRouteTimeAndStars`、`calibratedTimeCoefficients`和`userAcceptance`当前明确为false，不能以工具有了产物格式宣称它们已完成。

另外`wholeBlockArt`检查当前绘制系统是否有每个形状、外层、本体和外壳的实际素材，并将public文件原字节纳入绑定。缺少形状映射或素材返回`rejected-block-art`；这是实现能力检查，不是偷偷禁止规则允许的原创形状。它不等于像素/动画完整验收，但可以拦截“模型有实体，画面无色块”的输入。

## 必要腾挪阈值工具

实现：`src/core/revisedRepositionFloor.ts`；测试：`tests/revisedRepositionFloor.test.ts`。

搜索动作是实际Pointer动作的宽松超集：允许任意抓点可能选择的门、允许经过可出门位置而不自动退出，并放宽动画/抓取等待。每次仍只持有一个块、逐格调用真实模型，保留转弯、即时队列投放、整批揭层、锁/冰/卷帘计数及翻转门状态。不能用静态障碍floodfill替代这些派生事件。

一次有效持块事务如果没有整块消除、也没有剥层，成本为1；清除/剥层事务成本为0。经过多格或转弯不增加成本。净位移回到起点但发生揭层/投放，仍按实际有效事务计数。每个完整状态保存最低成本，0–1 BFS允许更低成本替换旧记录。

只有穷尽所有成本严格小于目标阈值的状态、且其中没有完成状态，才能返回`threshold-proven`。理由是实际动作集包含于该宽松集合：宽松集合都不能更低成本完成，实际动作也不能。反向不成立：宽松集合中的短路线可能无法真实Pointer执行。

| 输出 | 含义 | 不能据此声称 |
|---|---|---|
| `threshold-proven` | 该宽松模型已完整排除低于阈值的完成路线 | 关卡可解、实机/时间达标、可以发布 |
| `relaxed-shortcut` | 宽松模型存在低于阈值路线 | 实际关卡必然太简单；仍须Pointer验证 |
| `unknown` | 任一内层/外层预算或时间耗尽 | 无解或已通过下界 |
| `unsupported` | 当前规则/机制未获该工具支持 | 可以删除该机制后继续发原关证书 |
| `invalid` | 输入或事务不合法 | 允许自动修改关卡凑绿 |

首版仅支持v1.1/v1.2空间机制；暂拒绝炸弹、旧时间生成器、自主平台/传送带、非空间staging、旧旋转标记。不会改输入或删掉炸弹求解。主关卡时间不推进，因此下界检查不验证通关时限。即使无解关得到逻辑上的下界，也必须另有真实可解路线，不能以空集上的阈值批准它。

### 独立结构下界：首次主块出门前的必搬块

`tools/revised-first-exit-obligations.mjs`提供第二种保守证明，不依赖搜索长路线。仅支持明确v1.2、整数几何、两个普通出口各一个无壳无冰开局承载块，其余开局块均由冻结数大于1的唯一色出口约束，全部隐藏卷帘计数也大于1。拒绝第三普通承载块、提前揭层/解冻、生成器、翻转、地格、轴向、炸弹等不在该论证内的情况；数值或几何超出工具支持域同样拒收。

对每个普通矩形主块，忽略其他块与卷帘阻挡，枚举所有可能的完整出门足迹。某主块清除前，另一普通块最多提供一次清除，其余开局块不能清除或剥层；每个出门足迹里的不同初始承载块都必须分别先完成一次非清除拖动。对全部出门姿态取最小必搬数，不按占格数重复计块，不遗漏宽门可选择的绕行姿态。达到目标才是`threshold-proven`，不足仅是此方法`unproven`，不是实际最低值。

artifact优先尝试此窄域证明；不能证明时才使用上述完整宽松阈值搜索。它不降低来源门槛，也不把任何一个证明方法的`unsupported/unknown`当通过。仍须独立可解路线，最后绑定当前工具和候选全部数据。

v2进一步对每个主块的全部出门姿态取阻挡ID**交集**，得到该主块无论选择哪种出口姿态都必须先搬的特定块；再跨主块对这些交集取**去重并集**。两个普通主块均退出前，其余块都无法清除，因此这个并集中的每个块都必须至少一次非清除拖动。最终下界为`max(最佳单主块最小界, 必搬ID并集大小)`，绝不直接相加两个姿态最小值。诊断字段`blockers`的姿态并集不能当证明；真正采用的是`mandatoryBlockers/mandatoryUnionLowerBound`。

## Lv21隔离原型与真实Pointer回放

- 纯构造函数：`tools/revised-lv021-candidate.mjs`，种子`lv021-obligated-parking-v1`。固定JSON在`tests/fixtures/revised-candidate-lv021-prototype.json`，绑定路线在`revised-candidate-lv021-route.json`。单测核对构造函数与完整JSON严格一致。
- 6×9左右对称原创mask、开局14/全关24、3卷帘的10/17/19及4/4/2批次、隐藏冰6/2和4外壳保持核定来源合同。采用一个3×4完整矩形主块；它不计入异形块，但这一视觉设计仍待用户接受，不能把数学门禁当作审美验收。
- 当前结构证明必要腾挪≥10，完整模型见证39拖/28清除或剥层/11非清除。因此最低值只定位在10–11之间，不宣称恰好10。原型300秒仅用于实验，不是已标定时限或三星目标。
- **该3×4原型不通过视觉交付**：真实Pointer虽然完成，但开局截图中红色主块透明。根因为20种正式形状没有12格3×4映射，绘制没有普通块fallback。现将它保留为`rejected-block-art`回归，不改生产UI、不添加未授权素材、不把原路线通过当成可玩验收。后续优先在已有形状资源中重构候选，同时保持来源数量与下界。

```powershell
pnpm levels:revised:candidate --candidate=tests/fixtures/revised-candidate-lv021-prototype.json --route=tests/fixtures/revised-candidate-lv021-route.json
pnpm test:e2e:revised-candidate --candidate=tests/fixtures/revised-candidate-lv021-prototype.json --route=tests/fixtures/revised-candidate-lv021-route.json
```

Pointer工具先fresh验证静态和模型路线，再在独立Vite/Chromium环境加载实际游戏绘制与输入。每次mouse手势、每格anchor、每次提交后的完整空间状态均与新建模型prefix回放核对；另外检查首稳定开局、真实Pointer取消、存档访问为0、最终完成。空间比较只排除墙钟和单独核对的moves/autonomous-start标记，不把动画时长当空间差异。报告还记录真实经过的墙钟/可操作时间，但自动化速度不等于人工试玩系数。

输出只在`playtest-results/experiments/revised-candidate-pointer/`；报告绑定候选、路线、来源artifact、全部实际src及harness文件。`pointerReplayValidated`只在实际完成且末尾无漂移时置true，`timeValidated/sameRouteTimeAndStars/calibratedTimeCoefficients/releaseApproved/userAccepted`仍false。不写正式LEVELS或存档，不自动汇总成发布证书。输入Lv27拒收fixture可用于测试工具，但它的下界不达标，不能交付为合格候选。

### 现有素材双3×3变体

`buildRevisedLv21DualSquareCandidate()`及`tests/fixtures/revised-candidate-lv021-dual-square.json`保留同一来源机制合同，使用两个已有正式素材的3×3矩形；路线在`revised-candidate-lv021-dual-square-route.json`。构造函数与JSON严格匹配，旧3×4版本仍留作视觉拒收回归，不原地抹去失败证据。

新变体静态/全层素材/源机制/完整模型回放通过，两个唯一出口姿态各要求6个不同单块先搬，必搬并集12，证明最低腾挪≥12；58拖完成见证包含28清除/剥层和30非清除，不能由此宣称最优为30。该较长见证仍需后续路线优化与难度体验评估，300秒未做人工标定。

```powershell
pnpm levels:revised:candidate --candidate=tests/fixtures/revised-candidate-lv021-dual-square.json --route=tests/fixtures/revised-candidate-lv021-dual-square-route.json
pnpm test:e2e:revised-candidate --candidate=tests/fixtures/revised-candidate-lv021-dual-square.json --route=tests/fixtures/revised-candidate-lv021-dual-square-route.json
```

Pointer脚本`--viewport=496x1078`或`--viewport=320x568`用于不同视口检查。执行前必须全形状/全层素材通过，加载后必须每块真实纹理就绪；截图仍需要人工查看，形状命中和模型回放不替代视觉验收。

## 在候选试玩交付前还必须完成

- Lv21–30来源机制清单已逐关补齐，见`docs/level-generation/mechanism-inventory-lv021-030.md`及三份`reviews/mechanism-inventory-*.json`。输入入口逐帧验证SHA并合并独立修订：Lv21外壳4，Lv29全关32，Lv30开局16/全关21；旧truth未改，不能绕过审阅直接读旧计数。参考mask另有Lv23两格内墙的独立源事实修订。后续批次仍须补齐明确的存在/不存在，unknown不能当0。
- 产物入口的实际文件绑定、依赖闭包与静态/模型/阈值执行已接通；它不解决候选本身的难度。必须针对真实新布局取得非unknown的10/15/20下界，不能把管线拒收回归样本交付为合格关卡。
- 把空间见证转换成真实Pointer回放，记录初始化首可操作画面与实际动画/输入等待；独立检查同一路线同时满足拖动、时间与三星目标。时间系数要经过样本试玩标定，不填写未经验证的统一系数。
- 关联静态审计、可解回放、匹配10/15/20档位的下界报告、时间/三星证据和用户验收。任何`unknown`、缺失或hash漂移都不能批准候选。
- 上述门禁全部通过后，先交Lv21–30隔离候选；用户批准后才申请替换正式数据，再每10关推进。

回归命令：`pnpm test:revised`、`pnpm test:e2e:revised-mechanisms`、`pnpm test:e2e:revised-art`、`pnpm test:e2e:revised-regions`。本文件列出命令不代表它们已经运行，实际结果见WORKSTATE。
