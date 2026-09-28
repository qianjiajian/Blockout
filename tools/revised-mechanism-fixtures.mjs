// Isolated mechanism scenes, not Lv21 candidates or difficulty certificates.
const piece = (id, x, y, color, extra = {}) => ({ id, x, y, color, shape: [[0, 0]], ...extra });
const scene = (name, extra) => ({ id: 21, name, difficulty: "normal", width: 5, height: 5,
  timeSeconds: 180, reward: 0, parMoves: 50, mechanismRules: "revised-2026-09-21-v1.2", gates: [], blocks: [], ...extra });

export const revisedMechanismScenes = [
  { key: "shell", title: "剥层 / 翻转门 / 卷帘 / 隐藏冰 / 炸弹", instructions: "红蓝外壳向左出门：剥层后本门关闭、绿色门打开、卷帘揭开，冰仍为6，炸弹消失。黄色向右清除后冰才减为5。", level: scene("剥层事件链", {
    flipDoors: [{ id: "used", side: "left", offset: 1, size: 1, color: "red", initiallyOpen: true },
      { id: "other", side: "right", offset: 3, size: 1, color: "green", initiallyOpen: false }],
    gates: [{ id: "blue", side: "bottom", offset: 0, size: 1, color: "blue" },
      { id: "yellow", side: "right", offset: 0, size: 1, color: "yellow" }],
    shutters: [{ id: "cover", x: 3, y: 1, width: 1, height: 1, count: 1 }],
    blocks: [piece("shell", 0, 1, "red", { layers: ["red", "blue"], timedBombSeconds: 30 }),
      piece("outside", 4, 0, "yellow"), piece("hidden-ice", 3, 1, "purple", { frozen: 6, shutterId: "cover" }),
      piece("green", 4, 3, "green")],
  }) },
  { key: "lift", title: "电梯区域：包括外来块的部分占位", instructions: "红色横块向下移到第4行；黄色块仍压着区域，蓝块不能显示。再把黄色块右移一格，蓝色隐藏冰整组显露且仍为6。", level: scene("固定区域电梯", {
    shutters: [{ id: "lift", x: 1, y: 1, width: 2, height: 2, count: 0, skin: "lift" }],
    blocks: [piece("top", 0, 1, "red", { shape: [[0, 0], [1, 0]] }), piece("visitor", 2, 2, "yellow"),
      piece("hidden-ice", 1, 1, "blue", { shape: [[0, 0], [1, 0]], frozen: 6, shutterId: "lift" })],
  }) },
  { key: "generator", title: "中心口即时投放 / 手势取消", instructions: "黄色挡块向下拖一格，保持按住即可看见蓝块从中心机口滑入。当前手势可继续移动和转弯；继续移开蓝块，即投放绿色下一块。不需要额外动作。", level: scene("空闲落点生成", {
    generators: [{ id: "machine", side: "top", offset: 2, rimSpan: 3, rimMount: "rim", rimAnchor: { x: 2.5, y: 0, quarterTurns: 0 },
      spawn: [2, 0], queueBlockIds: ["cargo-a", "cargo-b"] }],
    blocks: [piece("blocker", 2, 0, "yellow"), piece("cargo-a", 2, 0, "blue"), piece("cargo-b", 2, 0, "green"), piece("outside", 4, 4, "purple")],
  }) },
  { key: "bomb", title: "可操作炸弹 / 冰锁计时 / 暂停", instructions: "绿色炸弹无需选中即计时；蓝色冰炸弹解冻前不计时。红色钥匙向左清除后蓝色冰解除并开始计时。暂停时两个数字保持不变。", level: scene("炸弹启用时钟", {
    gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
    blocks: [piece("key", 0, 0, "red", { keyId: "k" }), piece("bomb", 2, 2, "green", { timedBombSeconds: 30 }),
      piece("frozen-bomb", 3, 3, "blue", { frozen: 1, lockedBy: "k", timedBombSeconds: 30 })],
  }) },
  { key: "grid", title: "彩色地格 / 横向块", instructions: "红色块只能左右移动，不能进入蓝色地格；蓝块能够进入且不会自动消除。", level: scene("彩色地格和轴向", {
    coloredGrids: [{ id: "grid", color: "blue", cells: [[2, 2]] }],
    blocks: [piece("axis", 0, 2, "red", { movementAxis: "horizontal" }), piece("blue", 3, 2, "blue")],
  }) },
  { key: "narrow", title: "宽T块：细柄不能过窄门", instructions: "T形黄色块细柄正对底部门，但身体宽3格，必须被拒绝。下一项宽门对照可以通过。", level: scene("窄门拒绝", {
    gates: [{ id: "yellow", side: "bottom", offset: 2, size: 1, color: "yellow" }],
    blocks: [piece("wide", 1, 3, "yellow", { shape: [[0, 0], [1, 0], [2, 0], [1, 1]] })],
  }) },
  { key: "wide", title: "宽T块：完整宽门接受", instructions: "相同T形块与3格宽底门，向下拖动应整块通过。", level: scene("宽门接受", {
    gates: [{ id: "yellow", side: "bottom", offset: 1, size: 3, color: "yellow" }],
    blocks: [piece("wide", 1, 3, "yellow", { shape: [[0, 0], [1, 0], [2, 0], [1, 1]] })],
  }) },
  { key: "star-ice", title: "星门保留 / 冰冻出口", instructions: "红色星块向左清除后，星门仍保留金边，同时橙色出口解冻；普通红块也能走星门。", level: scene("星门与冰门", {
    gates: [{ id: "star-gate", side: "left", offset: 1, size: 3, color: "red", star: true },
      { id: "ice-gate", side: "right", offset: 1, size: 1, color: "orange", frozen: 1 }],
    blocks: [piece("star", 0, 1, "red", { star: true }), piece("ordinary", 0, 3, "red"), piece("orange", 4, 1, "orange")],
  }) },
  { key: "irregular", title: "异形棋盘缺口与分隔缝", instructions: "红块不能向左穿出中央颈部缺口；蓝块不能向下跨越横向分隔缝。实际占格决定碰撞，不填补棋盘缺口。", level: scene("缺口与分隔缝", {
    playable: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => [x, y])).flat()
      .filter(([x, y]) => y !== 2 || x === 2),
    seams: [{ orientation: "horizontal", offset: 1, start: 0, size: 1 }],
    blocks: [piece("neck", 2, 2, "red"), piece("seam", 0, 0, "blue")],
  }) },
];

const openMouth = structuredClone(revisedMechanismScenes.find(({ key }) => key === "generator"));
openMouth.key = "generator-open";
openMouth.title = "开局空口：自动投放后才进入可操作计时";
openMouth.instructions = "无需触碰即投放蓝块；动画完成后的蓝块计入开局，剩余队列为1。倒计时等首个可操作帧开始。";
openMouth.level.blocks = openMouth.level.blocks.filter(({ id }) => id !== "blocker");
revisedMechanismScenes.push(openMouth);

const continuousCargo = structuredClone(openMouth);
continuousCargo.key = "generator-continuous";
continuousCargo.title = "生成器补货不中断当前货物的连续拖动";
continuousCargo.instructions = "等开局蓝块落位，按住蓝块向下拖离机口；绿色补货时不要松手，继续下拖、右转并从右侧蓝门离场。不能退回已被绿色占据的机口。";
continuousCargo.level.name = "补货期间连续拖动";
continuousCargo.level.gates = [{ id: "blue-exit", side: "right", offset: 2, size: 1, color: "blue" }];
revisedMechanismScenes.push(continuousCargo);
