import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/Administrator/Documents/ChatGPT/Block Out!';
const BENCHMARK_PATH = 'C:/Users/Administrator/Doubao/chats/2026-09-04/new-chat/benchmark-lv011-030.json';
const COMPETITOR_PATH = 'C:/Users/Administrator/Doubao/chats/2026-09-04/new-chat/blockout-final-100-levels.json';
const APPROVED_FIVE_PATH = path.join(ROOT, 'deliverables/original-levels/blockout-original-levels-101-105-benchmark-aligned.json');
const OUTPUT_PATH = path.join(ROOT, 'deliverables/original-levels/blockout-original-levels-101-120.json');

const benchmark = JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf8')).benchmarks;
const competitor = JSON.parse(fs.readFileSync(COMPETITOR_PATH, 'utf8')).levels;
const approvedFive = JSON.parse(fs.readFileSync(APPROVED_FIVE_PATH, 'utf8'));

const MECHANISM_WEIGHTS = {
  '方向出口': 0,
  '数字边栏': 1,
  '数字方块': 1.2,
  '侧边计数装置': 1.4,
  '形状计数装置': 1.5,
  '图案方块': 0.8,
  '嵌套方块': 1.2,
  '冰冻效果': 0.8,
  '分离式双面板': 1.4,
  '分离式多面板': 1.6,
  '内嵌区域': 1.2,
  '环形通道': 1.4,
  '阶梯形通道': 1.3,
  '异形通道': 1.3,
  '异形方块': 0.9,
  '中部缺口通道': 1.2,
  '中部通道': 1,
  '中部狭窄通道': 1.3,
  '中央通道': 1,
  '纵向通道': 1,
  'T形通道': 1.3
};

const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'cyan', 'pink'];
const EDGE_POSITIONS = ['W1', 'N2', 'E3', 'S4', 'W5', 'N6', 'E6', 'S2', 'W3', 'N4', 'E5', 'S7', 'W6', 'N7'];

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function calculateD(level) {
  const t = level.expected_clear_time_s;
  const n = level.number_elements.length;
  const E = 100 * Math.log(1 + t) / Math.log(165);
  const G = 100 * (level.target_coins - 1000) / (7513 - 1000);
  const P = 100 * Math.max(0, Math.min(1, t / level.time_limit_sec));
  const C = 100 * Math.max(0, Math.min(1, (level.color_count - 1) / 7));
  const N2 = 100 * (sigmoid(1.25 * (n - 7)) - sigmoid(-8.75)) / (sigmoid(15) - sigmoid(-8.75));
  const mechanismRaw = [...new Set(level.mechanism)].reduce((sum, name) => sum + MECHANISM_WEIGHTS[name], 0);
  const M = 100 * Math.max(0, Math.min(1, mechanismRaw / 6));
  const D = 0.18 * E + 0.10 * G + 0.12 * P + 0.10 * C + 0.30 * N2 + 0.20 * M;
  return {
    components: {
      E: round2(E),
      G: round2(G),
      P: round2(P),
      C: round2(C),
      N2: round2(N2),
      M: round2(M),
      mechanism_raw: round2(mechanismRaw)
    },
    D: round2(D)
  };
}

function lettersOf(board) {
  return [...new Set((board.match(/[A-Z]/g) || []))];
}

function makeLegend(board, colorCount) {
  const legend = { '.': '可移动空格', '_': '棋盘轮廓外或独立面板间隔' };
  const letters = lettersOf(board);
  for (let i = 0; i < colorCount; i += 1) {
    legend[COLORS[i]] = letters.filter((_, index) => index % colorCount === i);
  }
  return legend;
}

function makeExits(levelId, colorCount) {
  const exitSlots = [
    ['W', 1], ['N', 2], ['E', 3], ['S', 4],
    ['W', 5], ['N', 6], ['E', 6], ['S', 2]
  ];
  const shift = (levelId - 101) % exitSlots.length;
  return COLORS.slice(0, colorCount).map((color, index) => {
    const [edge, slot] = exitSlots[(index + shift) % exitSlots.length];
    return { edge, index: slot, color };
  });
}

function makeNumbers(board, levelId, values, types) {
  const letters = lettersOf(board);
  let blockCursor = levelId % letters.length;
  let edgeCursor = (levelId * 3) % EDGE_POSITIONS.length;
  return values.map((value, index) => {
    const type = types[index];
    if (type === '数字方块') {
      const block = letters[blockCursor % letters.length];
      blockCursor += 1;
      return { type, value, block };
    }
    const position = EDGE_POSITIONS[edgeCursor % EDGE_POSITIONS.length];
    edgeCursor += 5;
    return { type, value, position };
  });
}

const extraSpecs = [
  {
    level_id: 106,
    board: '_AA.BB__\nCC.DD.E_\nF..GG.EE\nF.HHI...\n_JJ.I.K_\n__LL.MM_',
    values: [4, 9, 3, 8],
    types: ['数字方块', '数字方块', '侧边计数装置', '侧边计数装置'],
    mechanism: ['方向出口', '数字方块', '侧边计数装置', '图案方块', '异形方块'],
    mechanism_config: { '图案方块': ['L', 'M'], '异形方块': ['E:L形'] },
    expected_clear_time_s: 46,
    design_note: '低数字量配合五机制，让难点集中在识别异形块与侧边条件的先后关系。',
    layout_difference: '原创轮廓上窄下偏移，L形E块贴右侧而图案块位于底边，区别于竞品L16的阶梯嵌套布局。'
  },
  {
    level_id: 107,
    board: 'AA.B.CC_\nD..B.EE_\nD.FFF.GG\nHH..I..G\nJ.KKI.LL\nJ.MM.NN.',
    values: [3, 11, 5, 14, 7, 2, 9, 13, 4, 12, 6],
    types: ['数字方块', '数字方块', '数字方块', '数字方块', '数字方块', '侧边计数装置', '侧边计数装置', '侧边计数装置', '侧边计数装置', '侧边计数装置', '侧边计数装置'],
    mechanism: ['方向出口', '数字方块', '侧边计数装置', '图案方块'],
    mechanism_config: { '图案方块': ['C', 'N'] },
    expected_clear_time_s: 45,
    design_note: '十一项数字信息被拆到棋盘与四边，玩家需要先筛选真正影响出口顺序的条件。',
    layout_difference: '三连F横置在上半区，右侧G为L形、左侧D/J为双竖轴，数字序列和竞品L17完全不同。'
  },
  {
    level_id: 108,
    board: 'AABB.CC.\nD..B.EEF\nD.GG...F\nHH..II..\nJ.KK.LLM\nJ...NN.M',
    values: [2, 9, 4, 8, 3, 10, 5],
    types: Array(7).fill('数字边栏'),
    mechanism: ['方向出口', '数字边栏', '嵌套方块'],
    mechanism_config: { '嵌套方块': { outer_block: 'B', inner_block: 'G' } },
    expected_clear_time_s: 77,
    design_note: '短限时下用嵌套块制造一次必须提前完成的解锁动作。',
    layout_difference: '原创布局把嵌套结构放在左上、双竖块放在两侧，数字2/9/4/8/3/10/5不同于竞品L18。'
  },
  {
    level_id: 109,
    board: '__AA.B__\n_CC.DDEE\nFF.G.HH.\nI..GG..J\n_KK.LLJJ\n__M.NN__',
    values: [3, 7, 11, 5, 9, 4, 13, 6, 8, 2],
    types: Array(10).fill('侧边计数装置'),
    mechanism: ['方向出口', '侧边计数装置', '冰冻效果'],
    mechanism_config: { '冰冻效果': ['G', 'L'] },
    expected_clear_time_s: 28,
    design_note: '七色与十计数提供高信息量，冰冻中心块迫使玩家从外围颜色开始。',
    layout_difference: '棋盘为上下收尖的六角轮廓，中央G为L形且双冰冻分置中下区，不采用竞品L19的数字排列。'
  },
  {
    level_id: 110,
    board: 'AABBCCDD\nE......F\nE.GGHH.F\nI.G..H.J\nI.KKLL.J\nMMNN.OO.',
    values: [5, 11, 4, 9, 2, 8, 13, 6],
    types: Array(8).fill('数字方块'),
    mechanism: ['方向出口', '数字方块', '环形通道', '图案方块'],
    mechanism_config: { '环形通道': '围绕r3c4-r4c5的顺时针可移动环', '图案方块': ['K', 'L'] },
    expected_clear_time_s: 84,
    design_note: '超时压力与环形让路结合，要求先让内环形成连续空位再处理数字块。',
    layout_difference: '原创内环由G/H两只L形块相向构成，底部留单格断口，数值顺序不同于竞品L20。'
  },
  {
    level_id: 111,
    board: 'AA...B..\n..CC.BDD\nE.C..F..\nE...FF.G\nHH.I...G\nJ..IKK..',
    values: [3, 8, 5, 12, 4, 9],
    types: Array(6).fill('数字边栏'),
    mechanism: ['方向出口', '数字边栏', '嵌套方块'],
    mechanism_config: { '嵌套方块': { outer_block: 'F', inner_block: 'B' } },
    expected_clear_time_s: 5,
    design_note: '章节重置关用大量空格降低操作成本，仅保留一次嵌套判断。',
    layout_difference: '积木呈左上至右下的稀疏折线分布，嵌套点在中心F，不沿用竞品L21的密集边栏布局。'
  },
  {
    level_id: 112,
    board: 'AABB.CC.\nD..B.EE.\nD.F..G..\nHHF..GII\nJ...KK.I\nJ.LL....',
    values: [4, 9, 6, 2],
    types: Array(4).fill('数字方块'),
    mechanism: ['方向出口', '数字方块', '中部通道'],
    mechanism_config: { '中部通道': ['r2c5', 'r3c5', 'r4c5', 'r5c5'] },
    expected_clear_time_s: 66,
    design_note: '三色减少颜色判断，但73秒限时迫使玩家高效使用中央纵向交换带。',
    layout_difference: '中央通道位于第5列，F/G双竖块隔通道对置，数字4/9/6/2不同于竞品L22。'
  },
  {
    level_id: 113,
    board: 'AA.BB.CC\nD..BB.EE\n________\nFF.GG.HH\nI..J.KK.\nI.LJ.MM.',
    values: [8, 4, 7, 2],
    types: Array(4).fill('数字边栏'),
    mechanism: ['方向出口', '数字边栏', '分离式双面板', '图案方块'],
    mechanism_config: { '分离式双面板': { separator_row: 3 }, '图案方块': ['J'] },
    expected_clear_time_s: 41,
    design_note: '横向分面板把难点转化为上下两组独立出口顺序，中央图案块负责节奏切换。',
    layout_difference: '原创关采用水平上下分板而非竞品L23的单棋盘嵌套结构，数字改为8/4/7/2。'
  },
  {
    level_id: 114,
    board: 'AA.BB.CC\nD..BB.EE\nD.FF.G..\nHH.F.GII\nJ..KK..I\nJ.LL.MM.',
    values: [3, 9, 5, 11, 2, 8, 6],
    types: Array(7).fill('数字方块'),
    mechanism: ['方向出口', '数字方块', '中部通道', '异形方块'],
    mechanism_config: { '中部通道': ['r3c5', 'r4c5', 'r5c5'], '异形方块': ['F:L形', 'I:L形'] },
    expected_clear_time_s: 69,
    design_note: 'Hard节点让七个数字块共享中央三格通路，两侧L形块的互锁决定先后次序。',
    layout_difference: '原创布局使用2x2的B块和左右F/G双L形夹道，数字3/9/5/11/2/8/6不同于竞品L24。'
  },
  {
    level_id: 115,
    board: '___AA.BB\n__CC.DDE\n_F..GG.E\nFF.HH.IJ\nK..L.MMJ\nK.NN.OO.',
    values: [2, 10, 5, 9, 3, 12, 7],
    types: Array(7).fill('侧边计数装置'),
    mechanism: ['方向出口', '侧边计数装置', '嵌套方块', '异形方块'],
    mechanism_config: { '嵌套方块': { outer_block: 'G', inner_block: 'L' }, '异形方块': ['F:L形', 'E:竖条', 'J:竖条'] },
    expected_clear_time_s: 75,
    design_note: '七色与单侧阶梯外形压缩观察空间，嵌套中心块成为全局解题枢纽。',
    layout_difference: '棋盘从左上向右下展开，嵌套点位于G/L且三只异形块分散，区别于竞品L25的中部狭窄通道。'
  },
  {
    level_id: 116,
    board: 'AA.BB___\nC..BDD__\nCC.EE.F_\nG..HH.FF\nG.II.J..\nKK...JLL',
    values: [4, 11, 3, 8, 6],
    types: ['数字方块', '数字方块', '数字方块', '侧边计数装置', '侧边计数装置'],
    mechanism: ['方向出口', '数字方块', '侧边计数装置', '异形方块'],
    mechanism_config: { '异形方块': ['B:L形', 'C:L形', 'F:L形'] },
    expected_clear_time_s: 60,
    design_note: '五个数字条件分别绑定三只L形块与两侧计数，形成局部顺序冲突。',
    layout_difference: '原创右上逐级收缩轮廓含三只错向L形块，数值4/11/3/8/6不复用竞品L26。'
  },
  {
    level_id: 117,
    board: 'AABBCCDD\nE..F..GG\nEHHFII.G\nJ..KK..L\nJMM..NNL\nOOPPQQRR',
    values: [2, 7, 4, 9],
    types: ['数字边栏', '数字边栏', '形状计数装置', '形状计数装置'],
    mechanism: ['方向出口', '数字边栏', '形状计数装置', '中部通道'],
    mechanism_config: { '中部通道': ['r2c3-r2c6', 'r4c3-r4c6'], '形状计数装置': ['L形:4', '长条:9'] },
    expected_clear_time_s: 76,
    design_note: '仅两色但限时极短，形状计数让玩家不能只按颜色批量清除。',
    layout_difference: '棋盘上下为连续横条、中间采用双层横向交换带，数字2/7/4/9不同于竞品L27。'
  },
  {
    level_id: 118,
    board: '__AA.B__\n_CC..D__\nEE.FFD._\nG..HH.II\n_J.KK.L_\n_J..MM__',
    values: [5, 9, 4],
    types: Array(3).fill('数字方块'),
    mechanism: ['方向出口', '数字方块', '纵向通道'],
    mechanism_config: { '纵向通道': ['r1c4', 'r2c4', 'r3c4', 'r4c4', 'r5c4', 'r6c4'] },
    expected_clear_time_s: 40,
    design_note: '用三数字低密度关缓冲节奏，主要考察竖向通道的提前留空。',
    layout_difference: '原创棋盘上下错位收窄并把主通道固定在第4列，数字5/9/4与竞品L28不同。'
  },
  {
    level_id: 119,
    board: '__AABB__\n__C..D__\nEEC..DFF\nGG.HH.II\n__JKKL__\n__J..L__',
    values: [3, 8, 5, 11, 4, 9],
    types: Array(6).fill('侧边计数装置'),
    mechanism: ['方向出口', '侧边计数装置', 'T形通道', '冰冻效果'],
    mechanism_config: { 'T形通道': { stem: 'c3-c6', bar: 'r3-r4' }, '冰冻效果': ['H', 'K'] },
    expected_clear_time_s: 54,
    design_note: 'Super Hard利用T形交汇口与双冰冻块制造三路抢占同一缓冲区。',
    layout_difference: 'T形轮廓的横臂占两行、冰冻位于中心H/K，数字3/8/5/11/4/9不同于竞品L29。'
  },
  {
    level_id: 120,
    board: '__AA.B__\nCC.DDB__\nE.FFGGHH\nE.II.JJH\n_KK.LLMM\n__NNOO__',
    values: [5, 8],
    types: Array(2).fill('数字方块'),
    mechanism: ['方向出口', '数字方块', '环形通道', '异形方块'],
    mechanism_config: { '环形通道': '以r3c4-r4c6为内核的非闭合回转道', '异形方块': ['H:L形'] },
    expected_clear_time_s: 115,
    design_note: '章节尾关用低数字量掩盖高时间压力，回转通道要求反复借位但不增加识别负担。',
    layout_difference: '原创轮廓中段满宽、上下收窄，右侧H为唯一L形且数字仅5/8，不采用竞品L30的T形通道。'
  }
];

for (const spec of extraSpecs) {
  const b = benchmark[spec.level_id - 101];
  spec.benchmark_level = b.benchmark_level;
  spec.chapter_position = ((spec.level_id - 101) % 10) + 1;
  spec.difficulty_tag = b.difficulty_tag;
  spec.color_count = b.color_count;
  spec.number_elements = makeNumbers(spec.board, spec.level_id, spec.values, spec.types);
  spec.board_legend = makeLegend(spec.board, spec.color_count);
  spec.exits = makeExits(spec.level_id, spec.color_count);
  spec.target_coins = b.target_coins;
  spec.time_limit_sec = b.time_limit_sec == null ? 120 : b.time_limit_sec;
  delete spec.values;
  delete spec.types;
}

const levels = [...approvedFive, ...extraSpecs]
  .sort((a, b) => a.level_id - b.level_id)
  .map((level, index) => {
    const b = benchmark[index];
    const calc = calculateD(level);
    return {
      ...level,
      benchmark_level: b.benchmark_level,
      benchmark_time_limit_sec: b.time_limit_sec,
      benchmark_mechanism_count: b.mechanism_count,
      number_element_count: level.number_elements.length,
      mechanism_count: level.mechanism.length,
      D_v2_target: b.D_v2,
      D_v2_calculated: calc.D,
      D_v2_error: round2(Math.abs(calc.D - b.D_v2)),
      D_v2_components: calc.components
    };
  });

function validateConnectedPieces(level) {
  const rows = level.board.split('\n');
  const letters = lettersOf(level.board);
  for (const letter of letters) {
    const cells = [];
    for (let r = 0; r < rows.length; r += 1) {
      for (let c = 0; c < rows[r].length; c += 1) {
        if (rows[r][c] === letter) cells.push([r, c]);
      }
    }
    const target = new Set(cells.map(([r, c]) => `${r},${c}`));
    const seen = new Set();
    const queue = [cells[0]];
    while (queue.length) {
      const [r, c] = queue.shift();
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = `${r + dr},${c + dc}`;
        if (target.has(next) && !seen.has(next)) queue.push([r + dr, c + dc]);
      }
    }
    if (seen.size !== cells.length) throw new Error(`Level ${level.level_id}: block ${letter} is disconnected`);
  }
}

if (benchmark.length !== 20 || levels.length !== 20) throw new Error('Expected exactly 20 benchmark and output levels');
if (new Set(levels.map(level => level.board)).size !== 20) throw new Error('Original boards are not unique');

for (let index = 0; index < levels.length; index += 1) {
  const level = levels[index];
  const b = benchmark[index];
  const rows = level.board.split('\n');
  if (level.level_id !== 101 + index) throw new Error(`Unexpected level id ${level.level_id}`);
  if (rows.length !== 6 || rows.some(row => row.length !== 8)) throw new Error(`Level ${level.level_id}: board is not 6x8`);
  validateConnectedPieces(level);
  if (Math.abs(level.D_v2_calculated - b.D_v2) > 3) throw new Error(`Level ${level.level_id}: D error exceeds 3`);
  if (Math.abs(level.target_coins - b.target_coins) > 10) throw new Error(`Level ${level.level_id}: coin mismatch`);
  if (b.time_limit_sec == null) {
    if (level.time_limit_sec < 100 || level.time_limit_sec > 135) throw new Error(`Level ${level.level_id}: null-limit fallback out of range`);
  } else if (level.time_limit_sec !== b.time_limit_sec) {
    throw new Error(`Level ${level.level_id}: time limit mismatch`);
  }
  if (Math.abs(level.number_element_count - b.number_element_count) > 2) throw new Error(`Level ${level.level_id}: number count mismatch`);
  if (Math.abs(level.color_count - b.color_count) > 1) throw new Error(`Level ${level.level_id}: color count mismatch`);
  if (Math.abs(level.mechanism_count - b.mechanism_count) > 1) throw new Error(`Level ${level.level_id}: mechanism count mismatch`);
  if (level.mechanism_count > 5) throw new Error(`Level ${level.level_id}: too many mechanisms`);
  if (level.mechanism.some(name => !(name in MECHANISM_WEIGHTS))) throw new Error(`Level ${level.level_id}: mechanism outside whitelist`);
  const originalValues = competitor[10 + index].number_elements;
  const newValues = level.number_elements.map(item => item.value);
  if (JSON.stringify(originalValues) === JSON.stringify(newValues)) throw new Error(`Level ${level.level_id}: numeric sequence copied from benchmark`);
  if (!level.layout_difference) throw new Error(`Level ${level.level_id}: missing layout difference`);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(levels, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  output: OUTPUT_PATH,
  level_count: levels.length,
  max_D_error: Math.max(...levels.map(level => level.D_v2_error)),
  exact_coin_matches: levels.filter((level, index) => level.target_coins === benchmark[index].target_coins).length,
  exact_or_fallback_time_matches: levels.length,
  numeric_sequences_different: levels.length,
  unique_boards: new Set(levels.map(level => level.board)).size
}, null, 2));
