import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const boardSourceRelative = "deliverables/original-board-shape-proposal/blockout-original-lv001-lv100-board-shape-proposal.json";
const boardSourcePath = resolve(root, boardSourceRelative);
const outputDir = resolve(root, "deliverables/level-generation-blueprint");

const rowsTsv = String.raw`level\tscore\tbeat\tprimary\tsecondary\tvisible\ttotal\tcolors\texit\tmechanics\trisk
1\t24\t基础教学\t拖动与出门认知\t无\t2\t2\t2\t2色2门；邻边直观；允许教学贴门\t拖动教学\t教学例外
2\t50\t单变量展开\t转弯路径\t异形块辨识\t4\t4\t3\t3色3门；三边分散；保留1块可读直出\t无\t无
3\t60\t路径变体\t停车让路\t同色出口共享\t5\t5\t3\t3色3门；对边错位；Lv3起零贴门\t无\t无
4\t70\t峰前预演\t出口竞争\t缓冲紧张\t7\t7\t4\t4色4门；三侧分布；两色双块串行；零贴门\t无\t现D1无机制理论上限约65，需纳入路径/规划复杂度后复算
5\t80.70\t极难波起点/卷帘教学\t隐藏队列判断\t外壳换色与出口竞争\t9\t20\t5\t5色5门；四边错位；仅留1个直接可清选择\t卷帘×1（隐藏1）＋数字冰块×6＋冰门×3＋单层外壳×10\t已落地；全矩形；最优30拖，其中必要腾挪10拖
6\t82.25\t斜坡提升/数字冰教学\t倒计时解冻顺序\t上下轴接力\t11\t21\t4\t4色4门；上下主门与左右冰门分轴布置\t数字冰块×6＋冰门×2＋单层外壳×10\t已落地；全矩形；最优44拖，其中必要腾挪23拖
7\t83.00\t斜坡提升/冰门教学\t多门解锁顺序\t中枢换轨\t10\t21\t5\t5色5门；上下双轴加侧门；开放色先建立通路\t卷帘×1（隐藏1）＋数字冰块×6＋冰门×3＋单层外壳×10\t已落地；全矩形；最优37拖，其中必要腾挪16拖
8\t83.41\t斜坡提升/外壳教学\t高密度剥壳顺序\t出口选择\t13\t24\t5\t5色5门；外层色与本体色跨边；单块延迟显露\t卷帘×1（隐藏1）＋数字冰块×10＋冰门×3＋单层外壳×10\t已落地；全矩形；最优34拖，其中必要腾挪10拖
9\t83.55\t峰前预演\t阶梯通路预判\t剥壳后的多分支选择\t8\t13\t5\t5色5门；左、右、底三轴竞争；角落货物延迟显露\t卷帘×1（隐藏1）＋数字冰块×3＋冰门×3＋单层外壳×4\t已落地；全矩形；最优24拖，其中必要腾挪11拖
10\t84.52\t五关峰值\tT形主干调度\t五色冰门与外壳接力\t11\t20\t5\t5色5门；主干与横梁错边汇流；开局无完整贴门块\t卷帘×1（隐藏1）＋数字冰块×5＋冰门×3＋单层外壳×8\t已落地；全矩形；最优32拖，其中必要腾挪12拖
11\t70.5\t峰后回落\t开放出口选择\t轻度冰门等待\t7\t7\t4\t4色4门；三侧分散；至少2条合法起手\t冰门×1（计数1）\t无
12\t72.5\t单变量强化\t数字冰清除次序\t同色门共享\t8\t8\t4\t4色4门；两轴分布；2色双块串行\t数字冰块×2（计数2/3）\t无
13\t74.5\t路径变体\t双冰门开放次序\t四向路径切换\t9\t9\t4\t4色4门；四边分布；先开侧门再开对边门\t冰门×2（计数2/3）\t无
14\t76\t峰前预演\t外壳颜色顺序\t冻结门补充约束\t10\t12\t5\t5色5门；外层/本体跨轴；2色共享窄门\t单层外壳×2＋冰门×1（计数3）\t无
15\t77.5\t五关峰值\t阶台宽度变化\t外壳返程路径\t8\t10\t4\t4色4门；长短块分别走不同阶宽；窄口紧配\t单层外壳×2\t无
16\t71\t峰后回落\tS形绕行\t单冰门时序\t8\t8\t4\t4色4门；开槽两端各布门；保留双起手\t冰门×1（计数2）\t无
17\t73\t单变量强化\t数字冰排序\t同色队列\t9\t9\t4\t4色4门；两色多块共享；门宽紧配\t数字冰块×2（计数2/3）\t无
18\t75\t路径变体\t外层/本体换向\t冰门开放窗口\t10\t12\t5\t5色5门；外层色与本体色分处相邻轴\t单层外壳×2＋冰门×1（计数2）\t无
19\t76.5\t峰前预演\t冻结链次序\t多块共享出口\t11\t11\t5\t5色5门；3色承担多块；开放门仅保留2条起手\t数字冰块×2（计数3/4）＋冰门×2（计数2/3）\t无
20\t78\t五关峰值\t窄颈停车位\t外壳返程\t9\t11\t5\t5色5门；上下舱出口错侧；关键色共用窄颈\t单层外壳×2\t无
21\t71.5\t峰后回落\t外壳复习\t低压出口共享\t8\t9\t4\t4色4门；三侧分布；2条可读起手\t单层外壳×1\t无
22\t73.5\t单变量强化\tL形长短轴\t冻结门换轨\t8\t8\t4\t4色4门；长臂与短臂出口分离\t冰门×1（计数2）\t无
23\t75.5\t路径变体\t同色门竞争\t冰块/外壳顺序\t10\t11\t5\t5色5门；3色多块共享；外层色跨轴\t数字冰块×1（计数3）＋单层外壳×1\t无
24\t77\t峰前预演\tU湾停车与回转\t双冰门开放顺序\t9\t9\t5\t5色5门；湾口不设捷径门；两侧门先后开放\t冰门×2（计数2/3）\t无
25\t78.5\t五关峰值\t阶宽与块跨度匹配\t外壳双阶段\t9\t11\t5\t5色5门；长条走宽阶；钩形走侧门；窄口紧配\t单层外壳×2\t无
26\t72\t峰后回落\t多向基础调度\t轻度数字冰\t9\t9\t5\t5色5门；四侧分布；至少2条起手\t数字冰块×1（计数2）\t无
27\t74\t单变量强化\t外壳颜色接力\t缓冲占位\t10\t12\t5\t5色5门；两个外层色共用一侧；本体走对侧\t单层外壳×2\t无
28\t76\t路径变体\t六色出口调度\t冰门顺序\t11\t11\t6\t6色6门；四边错位；2扇门冻结且对应高需求色\t冰门×2（计数2/3）＋数字冰块×1（计数2）\t无
29\t77.5\t峰前预演\t多外壳清除链\t紧凑停车位\t10\t13\t5\t5色5门；3个外层色跨轴；仅2条开局直达路线\t单层外壳×3＋数字冰块×1（计数3）\t无
30\t79\t五关峰值\tH形双舱切换\t横梁共享通路\t9\t11\t5\t5色5门；两腿出口分组；关键色必须经偏心横梁换舱\t单层外壳×2\t无
31\t72.5\t峰后回落\t外壳低压复习\t单色共享出口\t9\t10\t5\t5色5门；三侧分布；保留2条清晰起手\t单层外壳×1\t无
32\t74.5\t单变量强化\t高占位缓冲\t数字冰倒计\t10\t10\t5\t5色5门；3色双块共享；门宽按跨度紧配\t数字冰块×2（计数2/3）\t无
33\t76.5\t路径变体\tT形主干换向\t冻结门时序\t9\t9\t5\t5色5门；横梁与主干门错侧；关键色共用主干\t冰门×1（计数3）\t无
34\t78\t峰前预演\t高负载分层清除\t多色出口竞争\t11\t14\t6\t6色6门；四侧分布；3色多块共享；开放门仅留2条起手\t单层外壳×3＋冰门×2（计数2/3）\t无
35\t79.5\t五关峰值＋机制教学\t生成器阶段释放\t隐藏货物复用停车位与出口\t7\t11\t4\t4色4门；显隐货物共用出口；释放前保留2条起手\t方块生成器×1（计数3，隐藏4）\t教学峰值需由阶段深度达标
36\t73\t峰后回落/主题呈现\t生成器分段释放\t同色出口共享\t7\t11\t4\t4色4门；上下主出口；2门等宽\t方块生成器×1（计数3，隐藏3）＋单层外壳×1\t低：规整88格，可通过生成区面积微调
37\t75\t单变量强化\t阶梯折线路径\t生成队列次序\t8\t12\t5\t5色5门；3门等宽；分散在三边\t方块生成器×1（计数2，隐藏2）＋单层外壳×2\t中：异形盘需防止出口被轮廓截短
38\t77\t路径/结构变化\t窄颈让路\t延迟释放\t7\t10\t4\t4色4门；两腔各2门；3门等宽\t方块生成器×1（计数2，隐藏2）＋单层外壳×1\t高：60格高几何盘，优先调块面积而非加机制
39\t78.5\t峰值预演\t出口竞争\t生成器阶段\t9\t14\t5\t5色5门；避开凹湾；3门等宽\t方块生成器×1（计数3，隐藏3）＋单层外壳×2\t中：94格需保证开局占用率
40\t80\t局部峰值\t双分区独立调度\t冰门同步\t8\t12\t4\t4色4门按2+2分区；颜色池2+2且不跨区\t方块生成器×1（计数2，隐藏2）＋冰门×1（计数3）＋单层外壳×2\t高：每区必须自洽可解，禁止跨区依赖
41\t73.5\t峰后回落/主题呈现\t生成回补\t缓冲区管理\t8\t11\t4\t4色4门；对边成对；仅1门等宽\t方块生成器×1（计数2，隐藏2）＋单层外壳×1\t低：70格近矩形，便于密度校准
42\t75.5\t单变量强化\t冻结释放次序\t外壳颜色顺序\t9\t12\t5\t5色5门；3门等宽；无替代同色门\t数字冰块×2（计数2/3）＋冰门×1（计数3）＋单层外壳×3\t中：计数总和宜先调低，避免假等待
43\t77.5\t路径/结构变化\t生成器与冰门接力\t凹槽换位\t8\t13\t5\t5色5门；凹槽外沿布门；3门等宽\t方块生成器×1（计数3，隐藏3）＋冰门×1（计数3）＋单层外壳×2\t中：主要调隐藏区占格，不再增加机制
44\t79\t峰值预演\tL形转角腾挪\t外壳出色顺序\t8\t11\t4\t4色4门；分布于两臂端部；3门等宽\t数字冰块×2（计数2/4）＋单层外壳×3\t高：82格L盘须保留转角停车位
45\t80.5\t局部峰值\tH形双舱换位\t精确门宽\t7\t10\t4\t4色4门；左右舱各2门；全部等宽\t冰门×2（计数3/5）＋单层外壳×3\t高：48格高压盘，靠大形块占用率校准
46\t74\t峰后回落/主题呈现\t规整盘负载密度\t生成器回补\t10\t14\t5\t5色5门；3门等宽；对边分散\t方块生成器×1（计数2，隐藏2）＋冰门×1（计数4）＋单层外壳×2\t低：94格可用块面积和门宽平滑调分
47\t76\t单变量强化\t阶梯转向\t生成队列\t8\t12\t5\t5色5门；长边3门等宽\t方块生成器×1（计数2，隐藏2）＋数字冰块×1（计数3）＋单层外壳×2\t中：保持生成器为副轴
48\t78\t路径/结构变化\t双区颜色生态\t延迟释放\t7\t11\t4\t4色4门按2+2分区；可见块4+3；颜色不跨区\t方块生成器×1（计数2，隐藏2，置于大区）＋单层外壳×2\t高：67格双区，隐藏块必须在所属区有出口
49\t79.5\t峰值预演\t六色出口共享\t生成器与冰门次序\t10\t15\t6\t6色6门；4门等宽；四边均有出口\t方块生成器×1（计数3，隐藏3）＋冰门×2（计数4/6）＋单层外壳×2\t中：规整95格可承载多色，避免再加冻结块
50\t81\t机制教学峰\t升降台时机\t单机制窗口识别\t10\t10\t4\t4色4门；平台目标门位于轨道对侧且等宽、无替代门\t移动升降台×1\t规则型峰值；现求解器不建模时钟tick，需PuzzleModel回放复算
51\t74.5\t峰后回落/主题呈现\t升降台单程接力\t外壳顺序\t9\t12\t5\t5色5门；平台目标门留1格余量\t移动升降台×1＋单层外壳×3\t低：教学后复习关，保持唯一平台载荷
52\t76.5\t单变量强化\tU湾绕行\t数字冰释放\t7\t10\t4\t4色4门；外沿布门；2门等宽\t数字冰块×2（计数3/4）＋单层外壳×3\t高：55格盘应以块面积抬压，不加设备
53\t78.5\t路径/结构变化\t出口竞争\t升降台换向\t10\t14\t5\t5色5门；3门等宽；平台载荷无替代门\t移动升降台×1＋冰门×1（计数4）＋单层外壳×4\t中：95格需避免平台变成无意义等待
54\t80\t峰值预演\t阶梯平台接力\t冰门窗口\t8\t11\t5\t5色5门；平台目标门等宽；其余2门等宽\t移动升降台×1＋冰门×1（计数5）＋单层外壳×3\t高：轨道必须完整落在77格轮廓内
55\t81.5\t局部峰值\tT形窄口调度\t冻结与外壳顺序\t7\t10\t4\t4色4门位于T形三端；3门等宽\t数字冰块×2（计数3/5）＋冰门×1（计数4）＋单层外壳×3\t高：48格高压盘，必须保留至少一条开局合法移动
56\t75\t峰后回落/主题呈现\t升降台复习\t外壳接力\t10\t13\t5\t5色5门；平台门留1格余量；其余2门等宽\t移动升降台×1＋单层外壳×3\t低：97格规整盘，适合作为峰后回落
57\t77\t单变量强化\t窄颈分舱\t冰门开放顺序\t7\t10\t4\t4色4门；两腔各2门；3门等宽\t冰门×2（计数4/6）＋单层外壳×3\t高：60格窄颈盘，用长块方向控制而非加数量
58\t79\t路径/结构变化\t生成器—升降台接力\t六色出口竞争\t11\t16\t6\t6色6门；4门等宽；平台载荷仅1门\t方块生成器×1（计数2，隐藏2）＋移动升降台×1＋单层外壳×3\t中：双设备只建立一次因果链
59\t80.5\t峰值预演\tH形双舱调度\t数字冰顺序\t8\t12\t4\t4色4门；左右舱各2门；全部等宽\t数字冰块×2（计数4/6）＋单层外壳×4\t高：67格高几何盘，避免两舱互相硬锁
60\t82\t局部峰值\t双分区升降同步\t冰门窗口\t8\t13\t5\t5色5门按3+2分区；可见块5+3；颜色不跨区\t移动升降台×2（每区1台）＋冰门×1（计数4）＋单层外壳×5\t高：两台应可独立求解，不要求实时同时操作
61\t75.5\t峰后回落/主题呈现\t生成器回归\t单色共享门\t8\t12\t4\t4色4门；仅2门等宽\t方块生成器×1（计数2，隐藏2）＋单层外壳×2\t低：62格近矩形，调生成覆盖区即可
62\t77.5\t单变量强化\tS槽换位\t双冰门次序\t8\t12\t5\t5色5门；槽口外侧布门；3门等宽\t冰门×2（计数4/6）＋单层外壳×4\t高：78格异形盘，保证长块能绕开槽口
63\t79.5\t路径/结构变化\t生成器分段\t阶梯路径\t9\t14\t5\t5色5门；3门等宽；上下错位\t方块生成器×1（计数2，隐藏2）＋数字冰块×2（计数3/5）＋单层外壳×3\t中：主轴仍是分段释放，数字冰仅控制先后
64\t81\t峰值预演\t生成器—升降台编排\t六色出口共享\t11\t17\t6\t6色6门；4门等宽；平台载荷无替代门\t方块生成器×1（计数2，隐藏2）＋移动升降台×1＋冰门×1（计数5）＋单层外壳×4\t高：多机制只允许一条串联因果，不做并行硬锁
65\t82.5\t局部峰值\tL形窄口腾挪\t双冰门解锁\t8\t12\t4\t4色4门位于两臂外缘；3门等宽\t冰门×2（计数5/7）＋单层外壳×4\t高：70格L盘，靠门计数与块面积达标
66\t76\t峰后回落/主题呈现\t双分区颜色生态\t生成器回补\t8\t13\t5\t5色5门按3+2分区；可见块5+3；颜色不跨区\t方块生成器×1（计数2，隐藏2，置于大区）＋单层外壳×3\t高：96格双区需分别验证出口完备性
67\t78\t单变量强化\t窄颈升降窗口\t外壳顺序\t7\t11\t4\t4色4门；两腔各2门；平台门等宽\t移动升降台×1＋冰门×1（计数4）＋单层外壳×4\t高：64格窄颈盘，轨道不能封死唯一通道
68\t80\t路径/结构变化\t双区分段释放\t冰门接力\t8\t13\t5\t5色5门按3+2分区；可见块5+3；隐藏块归属大区\t方块生成器×1（计数2，隐藏2）＋冰门×1（计数5）＋单层外壳×3\t高：82格双区，禁止隐藏块跨区依赖
69\t81.5\t峰值预演\tH形定时转运\t精确出口\t8\t13\t5\t5色5门分布于双舱外缘；4门等宽\t移动升降台×1＋冰门×1（计数6）＋单层外壳×5\t高：69格H盘，优先调平台周期和门宽
70\t83\t传送带/卷帘教学峰\t传送带与卷帘因果链\t带末共享窄门\t10\t17\t4\t4色4门；传送载荷目标门位于带末且等宽、无替代门\t传送带×1＋卷帘×1（计数6，隐藏7）\t规则型峰值；仅用耦合新系统抬阶段深度，不叠旧机制
71\t76.5\t峰后回落/重认运输\t机制阶段\t中密度\t12\t18\t5\t运输终点侧设主门；重复色共用单门\t卷帘×1（隐藏6）＋传送带×1＋冰门×2\t无
72\t78.5\t单轴强化\t升降时机\tS槽换轨\t10\t14\t5\t两端分色；目标门与升降停靠点错位\t移动升降台×1＋单层外壳×4＋数字冰块×3\t无
73\t80.5\t结构变体\t隐藏队列\t出口解锁\t11\t18\t5\t生成色只在阶台远端设门；先解锁通路\t方块生成器×1（隐藏7）＋冰门×2＋数字冰块×3\t无
74\t82\t峰前预演\tT形三臂顺序\t运输状态\t9\t14\t4\t三臂分色；主色多阶段共用一个窄门\t卷帘×1（隐藏3）＋传送带×1＋数字冰块×3＋单层外壳×2\t无
75\t83.5\t五关峰值\t双分区顺序\t剥层依赖\t9\t14\t5\t每区出口自洽；同色可分区双门但不可跨孤岛\t冰门×3＋数字冰块×3＋单层外壳×5\t无
76\t77\t峰后回落\t窄颈路径\t升降时机\t8\t12\t4\t上下宽区分置出口；升降台提供唯一对齐窗口\t移动升降台×1＋单层外壳×4＋冰门×2\t无
77\t79\t单轴强化\t生成顺序\tL形转角\t11\t18\t5\t生成色门置于长臂远端；基础色门留明显起手\t方块生成器×1（隐藏7）＋冰门×2＋数字冰块×3\t无
78\t81\t结构变体\t高密度出口竞争\t运输阶段\t14\t21\t6\t6色单门；两种高频色共享紧口；保留两条起手\t卷帘×1（隐藏3）＋传送带×1＋单层外壳×4\t无
79\t82.5\t峰前预演\tH形换侧\t倒计时顺序\t9\t14\t5\t两腿异侧设门；中梁只负责换轨，不放直出块\t数字冰块×4＋冰门×3＋单层外壳×5\t无
80\t84\t五关峰值/三横岛\t三分区处理顺序\t运输链\t9\t16\t5\t三岛各自具备完整出口；运输链只占主岛\t卷帘×1（隐藏7）＋传送带×1＋移动升降台×1\t每个分区必须独立可解
81\t77.5\t峰后回落\t规整盘密度\t剥层次序\t14\t20\t6\t6色单门；高频色错边放置；保留双起手\t单层外壳×6＋冰门×2\t无
82\t79.5\t单轴强化\t生成队列\tS槽两端换轨\t11\t18\t5\t生成色门在槽口对侧；基础色先清出转向区\t方块生成器×1（隐藏7）＋数字冰块×3＋冰门×2\t无
83\t81.5\t结构变体\t双分区顺序\t解锁与剥层\t9\t14\t4\t每区至少两个局部出口；外壳色与本体色分置\t数字冰块×3＋冰门×2＋单层外壳×5\t每个分区必须独立可解
84\t83\t峰前预演\t运输推进顺序\t阶台路径\t12\t19\t5\t运输终点对齐主门；其余门沿阶台错边分布\t卷帘×1（隐藏4）＋传送带×1＋冰门×2＋单层外壳×3\t无
85\t84.5\t五关峰值\t横向窄颈竞争\t设备时机\t8\t13\t4\t两宽区分色；共享色仅留一个跨颈出口\t移动升降台×1＋数字冰块×3＋冰门×2＋单层外壳×5\t无
86\t78\t峰后回落\t规整盘密度\t隐藏负载\t14\t22\t6\t6色单门；生成色出口远离释放侧\t方块生成器×1（隐藏5）＋单层外壳×3\t无
87\t80\t单轴强化\t双分区次序\t冻结状态\t9\t14\t4\t两区独立可解；一条明路、一条需倒计时解锁\t数字冰块×4＋冰门×3＋单层外壳×5\t每个分区必须独立可解
88\t82\t结构变体\tT形三向换轨\t运输阶段\t9\t16\t5\t三臂各有局部门；运输色共用主干末端门\t卷帘×1（隐藏3）＋传送带×1＋数字冰块×3＋单层外壳×4\t无
89\t83.5\t峰前预演\t生成与升降时序\tH形横梁\t9\t17\t5\t生成色经横梁转运；升降目标门放在对侧腿\t方块生成器×1（隐藏8）＋移动升降台×1＋冰门×2\t无
90\t85\t五关峰值/三角双翼\t三分区顺序\t复合运输\t9\t17\t5\t主区与双翼均设本地出口；设备只连接主区阶段\t卷帘×1（隐藏5）＋传送带×1＋移动升降台×1＋单层外壳×3\t每个分区必须独立可解
91\t78.5\t峰后回落/星标教学\t星标规则识别\t规整盘路线\t10\t10\t4\t星块仅配同色星门；普通块保留普通门及清晰起手\t星标块×3＋星门×2\t规则首秀；若不足78.5只调星标路线和出口竞争，不叠旧机制
92\t80.5\t单轴强化\t分区星标路由\t冻结顺序\t8\t8\t4\t每区各设星门和普通门；不制造跨区伪路线\t星标块×4＋星门×2＋数字冰块×3＋冰门×2\t每个分区必须独立满足星标出口
93\t82.5\t结构变体\t星标隐藏阶段\t凹槽换轨\t11\t18\t5\t星门置于凹槽开口侧；生成色从对侧释放\t星标块×4＋星门×2＋方块生成器×1（隐藏4）＋单层外壳×3\t无
94\t84\t峰前预演\t星标运输\t阶台出口竞争\t12\t18\t5\t传送终点对准星门；普通同色块允许走普通门\t星标块×4＋星门×2＋卷帘×1（隐藏6）＋传送带×1\t无
95\t85.5\t五关峰值\t小型双分区\t星标与升降时机\t8\t13\t4\t两区各有本地星门；升降台只放在较大分区\t星标块×4＋星门×2＋移动升降台×1＋单层外壳×5\t每个分区必须独立满足星标出口
96\t79\t峰后回落\t窄颈星标路由\t冻结顺序\t8\t8\t5\t星门与星块分置窄颈两端；另留一条普通起手\t星标块×4＋星门×2＋数字冰块×4＋冰门×2\t无
97\t81\t单轴强化\t规整盘高密度\t星标生成阶段\t14\t22\t6\t6色单门；生成星块对应门远离释放侧\t星标块×5＋星门×3＋方块生成器×1（隐藏5）＋单层外壳×3\t无
98\t83\t结构变体\t双分区星标顺序\t运输阶段\t9\t16\t5\t一区承担星标路线；一区承担运输路线；均可本地清完\t星标块×4＋星门×2＋卷帘×1（隐藏7）＋传送带×1\t每个分区必须独立满足对应出口
99\t84.5\t峰前预演\tH形跨梁星标路线\t剥层与冻结\t9\t15\t5\t两腿各设星门；中梁只用于换侧；普通门负责起手\t星标块×5＋星门×3＋数字冰块×3＋冰门×2＋单层外壳×6\t无
100\t86\t五关峰值/三翼终考\t三分区全局顺序\t星标运输链\t9\t18\t5\t三分区各自出口完备；主区星标；两翼分别承担卷帘与传送\t星标块×5＋星门×3＋卷帘×2（隐藏9）＋传送带×2\t三分区独立可解；只叠星标与运输两个系统`;

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/);
  const headers = headerLine.split("\\t");
  return lines.map((line) => {
    const values = line.split("\\t");
    if (values.length !== headers.length) {
      throw new Error(`Bad TSV row (${values.length}/${headers.length}): ${line}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function scoreBand(score) {
  if (score < 45) return "教程";
  if (score < 50) return "入门";
  if (score < 60) return "普通";
  if (score < 70) return "进阶";
  if (score < 80) return "困难";
  return "极难";
}

function parseMechanisms(plan) {
  if (plan === "无") return [];
  if (plan === "拖动教学") {
    return [{ type: "基础拖动教学", count: 1, parameters: null }];
  }
  return plan.split(/[＋+]/).map((part) => {
    const normalized = part.trim();
    const match = normalized.match(/^(.+?)×(\d+)(.*)$/u);
    if (!match) return { type: normalized, count: null, parameters: null };
    const parameters = match[3].trim().replace(/^[（(]|[）)]$/gu, "").trim();
    return {
      type: match[1].trim(),
      count: Number(match[2]),
      parameters: parameters || null,
    };
  });
}

function planStageCounts(plan) {
  const layered = Number(plan.match(/单层外壳×(\d+)/u)?.[1] ?? 0);
  const hidden = [...plan.matchAll(/隐藏(\d+)/gu)].reduce((sum, match) => sum + Number(match[1]), 0);
  return { layered, hidden };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function maskSha256(mask) {
  return createHash("sha256").update(mask.join("\n"), "utf8").digest("hex").toUpperCase();
}

const boardSourceRaw = await readFile(boardSourcePath, "utf8");
const boardSourceSha256 = createHash("sha256").update(boardSourceRaw).digest("hex").toUpperCase();
const expectedBoardSha256 = "1A1EEB67D4DF03EAF44DFEA83848A6630718FAC6FE897ED94ACBD5AF5101BFA8";
if (boardSourceSha256 !== expectedBoardSha256) {
  throw new Error(`Board source SHA256 changed: ${boardSourceSha256}`);
}

const boardSource = JSON.parse(boardSourceRaw);
const inputRows = parseTsv(rowsTsv);
if (inputRows.length !== 100 || boardSource.levels.length !== 100) {
  throw new Error(`Expected 100 rows and 100 boards, got ${inputRows.length}/${boardSource.levels.length}`);
}

const levels = inputRows.map((row, index) => {
  const levelNumber = Number(row.level);
  const boardLevel = boardSource.levels[index];
  if (levelNumber !== index + 1 || boardLevel.level_number !== levelNumber) {
    throw new Error(`Level order mismatch at index ${index}`);
  }
  const score = Number(row.score);
  const stageCounts = planStageCounts(row.mechanics);
  const visibleBlockCount = Number(row.visible);
  const totalClearStages = Number(row.total);
  if (totalClearStages !== visibleBlockCount + stageCounts.layered + stageCounts.hidden) {
    throw new Error(
      `Level ${levelNumber} total stage mismatch: ${totalClearStages} != ${visibleBlockCount} + ${stageCounts.layered} + ${stageCounts.hidden}`,
    );
  }
  return {
    level_id: `Level ${levelNumber}`,
    level_number: levelNumber,
    status: levelNumber <= 10 ? "implemented_and_verified" : "blueprint_only_pending_confirmation",
    applied_to_game: levelNumber <= 10,
    solver_status: levelNumber <= 10 ? "exact_solver_and_pointer_replay_passed" : "not_run_blueprint_stage",
    board: {
      source_level_id: boardLevel.level_id,
      rows: boardLevel.board.rows,
      cols: boardLevel.board.cols,
      playable_mask: boardLevel.board.playable_mask,
      playable_mask_sha256: maskSha256(boardLevel.board.playable_mask),
      playable_cell_count: boardLevel.board.playable_cell_count,
      footprint_ratio: boardLevel.board.footprint_ratio,
      component_count: boardLevel.board.component_count,
      component_sizes: boardLevel.board.component_sizes,
      shape_family: boardLevel.shape.family,
      shape_group: boardLevel.shape.family_group,
      shape_name: boardLevel.shape.name,
      shape_pressure: boardLevel.shape.pressure,
    },
    difficulty_target: {
      calibrated_score: score,
      band: scoreBand(score),
      five_level_role: row.beat,
      primary_pressure: row.primary,
      secondary_pressure: row.secondary,
      calibration_risk: row.risk === "无" ? null : row.risk,
    },
    generation_targets: {
      visible_block_count: visibleBlockCount,
      hidden_block_count: stageCounts.hidden,
      layered_block_count: stageCounts.layered,
      total_clear_stages: totalClearStages,
      color_count: Number(row.colors),
      exit_strategy: row.exit,
      mechanism_plan_text: row.mechanics,
      mechanisms: parseMechanisms(row.mechanics),
      max_extra_shell_layers_per_block: 1,
    },
  };
});

const introSchedule = [
  ["数字冰块", 5],
  ["冰门", 5],
  ["单层外壳", 5],
  ["方块生成器", 35],
  ["移动升降台", 50],
  ["传送带", 70],
  ["卷帘", 5],
  ["星标块", 91],
  ["星门", 91],
];

for (const [type, expectedFirstLevel] of introSchedule) {
  const first = levels.find((level) => level.generation_targets.mechanisms.some((item) => item.type === type));
  if (!first || first.level_number !== expectedFirstLevel) {
    throw new Error(`${type} first appears at ${first?.level_number ?? "never"}, expected ${expectedFirstLevel}`);
  }
}

for (const introLevel of [6, 7, 8, 35, 50, 70, 91]) {
  if (levels[introLevel - 1].board.shape_pressure !== 1) {
    throw new Error(`Mechanism intro Level ${introLevel} must use a P1 board`);
  }
}

for (const level of levels.filter((item) => item.board.component_count > 1)) {
  if (!/(分区|每区|各自|一区|两区|三岛|主区)/u.test(level.generation_targets.exit_strategy)) {
    throw new Error(`Level ${level.level_number} must state a per-section exit strategy`);
  }
}

for (let peak = 10; peak <= 100; peak += 5) {
  const current = levels[peak - 1].difficulty_target.calibrated_score;
  const left = levels[peak - 2]?.difficulty_target.calibrated_score ?? -Infinity;
  const right = levels[peak]?.difficulty_target.calibrated_score ?? -Infinity;
  if (!(current > left && current > right)) {
    throw new Error(`Level ${peak} is not a strict local peak: ${left}, ${current}, ${right}`);
  }
}

for (let level = 4; level <= 100; level += 1) {
  if (levels[level - 1].difficulty_target.calibrated_score < 70) {
    throw new Error(`Level ${level} is below the requested 70-point floor`);
  }
}

const peakScores = levels.filter((level) => level.level_number >= 15 && level.level_number % 5 === 0)
  .map((level) => level.difficulty_target.calibrated_score);
for (let i = 1; i < peakScores.length; i += 1) {
  if (peakScores[i] <= peakScores[i - 1]) throw new Error("Five-level peaks must rise throughout the campaign");
}

const bandCounts = Object.fromEntries(
  ["教程", "入门", "普通", "进阶", "困难", "极难"].map((band) => [
    band,
    levels.filter((level) => level.difficulty_target.band === band).length,
  ]),
);

const blueprint = {
  dataset: "Block Out 原创 Lv1–100 关卡生成蓝图 v1",
  version: "2026-09-08-blueprint-v1",
  status: "lv1_10_implemented_remaining_levels_blueprint",
  applied_to_game: "Lv1-Lv10",
  scope: "锁定v2棋盘造型；Lv1–10已写入正式关卡并通过精确求解与Pointer回放，Lv11–100仍为候选生成目标。",
  board_source: {
    path: boardSourceRelative,
    dataset: boardSource.dataset,
    version: boardSource.version,
    sha256: boardSourceSha256,
  },
  difficulty_policy: {
    score_semantics: "目标校准难度分，不是求解器实测结果；生成后必须以实测分回调。",
    bands: [
      { id: "tutorial", name: "教程", min: null, max_exclusive: 45 },
      { id: "entry", name: "入门", min: 45, max_exclusive: 50 },
      { id: "normal", name: "普通", min: 50, max_exclusive: 60 },
      { id: "advanced", name: "进阶", min: 60, max_exclusive: 70 },
      { id: "hard", name: "困难", min: 70, max_exclusive: 80 },
      { id: "extreme", name: "极难", min: 80, max_exclusive: null },
    ],
    requested_floor: "Lv4–100目标分不低于70；Lv1–3为教学递进例外。",
    wave_rule: "Lv5–10为严格上升的极难验证波；Lv11回落后恢复五关波形，Lv15起的后续峰值严格递增。",
    score_range: {
      min: Math.min(...levels.map((level) => level.difficulty_target.calibrated_score)),
      max: Math.max(...levels.map((level) => level.difficulty_target.calibrated_score)),
    },
    band_counts: bandCounts,
  },
  generation_rules: [
    "棋盘格数不直接等于难度：规整盘主要承载色块/机制负载，异形盘主要承载路径与出口竞争，多分区盘主动降低可见块数。",
    "每关固定一个主压力轴和一个副压力轴；机制组合必须服务同一条因果链，禁止并行硬锁。",
    "Lv5首次组合出现卷帘、数字冰块与冰门，单层外壳首次出现在Lv8；教学弹窗按Lv5卷帘、Lv6数字冰块、Lv7冰门、Lv8外壳分步解释，后续Lv35生成器、Lv50升降台、Lv70传送带、Lv91星标。",
    "可见块数与总清除阶段分开：总清除阶段包含隐藏块和外壳增加的阶段，不把数字冰/冰门倒计时重复计数。",
    "每个色块最多额外一层外壳；任何生成结果不得突破此上限。",
    "Lv3及以后禁止出生块直接接触同色出口口沿。",
    "多分区之间不互通；每个分区必须独立具备本体色、外壳色、隐藏块色及星标块所需的合法出口生态。",
    "生成后依次通过静态约束、基础求解、PuzzleModel时序回放、重点关最优解、难度复算、原创性审计与E2E；Lv1–10已执行，其余关卡落地时执行。",
  ],
  summary: {
    level_count: levels.length,
    local_peak_levels: levels.filter((level) => level.level_number % 5 === 0).map((level) => level.level_number),
    mechanism_intro_levels: Object.fromEntries(introSchedule),
    board_shape_counts: boardSource.summary.shape_family_counts,
    board_group_counts: boardSource.summary.shape_group_counts,
  },
  levels,
};

await mkdir(outputDir, { recursive: true });

const jsonPath = resolve(outputDir, "blockout-lv001-lv100-generation-blueprint-v1.json");
await writeFile(jsonPath, `${JSON.stringify(blueprint, null, 2)}\n`, "utf8");

const csvHeaders = [
  "level_id", "level_number", "board_rows", "board_cols", "playable_cells", "component_count",
  "shape_group", "shape_family", "shape_name", "shape_pressure", "target_score", "target_band",
  "five_level_role", "primary_pressure", "secondary_pressure", "visible_blocks_target",
  "hidden_blocks_target", "layered_blocks_target", "total_clear_stages_target", "color_count_target", "exit_strategy", "mechanics_plan",
  "calibration_risk", "status", "solver_status", "playable_mask",
];
const csvRows = levels.map((level) => [
  level.level_id,
  level.level_number,
  level.board.rows,
  level.board.cols,
  level.board.playable_cell_count,
  level.board.component_count,
  level.board.shape_group,
  level.board.shape_family,
  level.board.shape_name,
  level.board.shape_pressure,
  level.difficulty_target.calibrated_score,
  level.difficulty_target.band,
  level.difficulty_target.five_level_role,
  level.difficulty_target.primary_pressure,
  level.difficulty_target.secondary_pressure,
  level.generation_targets.visible_block_count,
  level.generation_targets.hidden_block_count,
  level.generation_targets.layered_block_count,
  level.generation_targets.total_clear_stages,
  level.generation_targets.color_count,
  level.generation_targets.exit_strategy,
  level.generation_targets.mechanism_plan_text,
  level.difficulty_target.calibration_risk,
  level.status,
  level.solver_status,
  level.board.playable_mask.join("/"),
]);
const csvPath = resolve(outputDir, "blockout-lv001-lv100-generation-blueprint-v1.csv");
await writeFile(
  csvPath,
  `${[csvHeaders, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
  "utf8",
);

const mdLines = [
  "# Block Out 原创 Lv1–100 关卡生成蓝图 v1",
  "",
  "> 状态：Lv1–10已落地并通过求解与Pointer回放；Lv11–100仍为生成蓝图。Lv5–10难度分为实测值，其余为生成目标。",
  "",
  `- 棋盘来源：\`${boardSourceRelative}\``,
  `- 棋盘 SHA256：\`${boardSourceSha256}\``,
  "- 硬规则：Lv4起目标分≥70；Lv5–10严格上升；Lv11回落后从Lv15起每5关一个递增峰值；每块最多额外1层外壳。",
  "- 数量口径：`可见/阶段/色` = 开局可见色块数 / 总清除阶段 / 颜色数。总阶段包含隐藏块与外壳阶段。",
  "",
];

for (let start = 1; start <= 100; start += 10) {
  const chapter = levels.slice(start - 1, start + 9);
  mdLines.push(`## Lv${start}–${start + 9}`, "");
  mdLines.push("| Lv | 棋盘造型 | P | 难度 | 五关职责 | 主压力 → 副压力 | 可见/阶段/色 | 出口策略 | 机制组合 |");
  mdLines.push("|---:|---|---:|---:|---|---|---:|---|---|");
  for (const level of chapter) {
    const d = level.difficulty_target;
    const g = level.generation_targets;
    mdLines.push(
      `| ${level.level_number} | ${level.board.shape_name} | ${level.board.shape_pressure} | ${d.calibrated_score} ${d.band} | ${d.five_level_role} | ${d.primary_pressure} → ${d.secondary_pressure} | ${g.visible_block_count}/${g.total_clear_stages}/${g.color_count} | ${g.exit_strategy} | ${g.mechanism_plan_text} |`,
    );
  }
  mdLines.push("");
}

const risks = levels.filter((level) => level.difficulty_target.calibration_risk);
mdLines.push("## 落地前复算项", "");
mdLines.push("| Lv | 复算/生成约束 |", "|---:|---|");
for (const level of risks) {
  mdLines.push(`| ${level.level_number} | ${level.difficulty_target.calibration_risk} |`);
}
mdLines.push(
  "",
  "## 确认后的执行门禁",
  "",
  "1. 由本蓝图生成候选关卡文件，不直接覆盖正式关卡源。",
  "2. 逐关校验边界、碰撞、出口跨度、颜色覆盖、分区自洽、外壳层数和出生贴门。",
  "3. 运行基础求解；含升降台的关卡额外做 PuzzleModel 时序回放。",
  "4. 对机制首秀、每5关峰值、多分区关及 Lv100 跑最优解/近最优解检查，再按实测难度回调。",
  "",
);
const mdPath = resolve(outputDir, "blockout-lv001-lv100-generation-blueprint-v1.md");
await writeFile(mdPath, `${mdLines.join("\n")}\n`, "utf8");

console.log(JSON.stringify({
  boardSourceSha256,
  outputDir,
  files: [jsonPath, csvPath, mdPath],
  levelCount: levels.length,
  bandCounts,
  riskCount: risks.length,
  minScore: blueprint.difficulty_policy.score_range.min,
  maxScore: blueprint.difficulty_policy.score_range.max,
}, null, 2));
