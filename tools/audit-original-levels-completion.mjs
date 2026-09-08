import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = path.resolve(
  'deliverables/original-levels/blockout-original-levels-101-120.json',
);

const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const inputPath = path.resolve(positionalArgs[0] ?? DEFAULT_INPUT);
const levels = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const COLOR_KEYS = new Set([
  'red',
  'blue',
  'yellow',
  'green',
  'purple',
  'orange',
  'cyan',
]);

const BLOCKING = 'blocking';
const REVIEW = 'review';
const AUTOFILL = 'autofill';

function parseBoard(board) {
  return String(board ?? '').split('\n');
}

function positionToCell(position, rows, cols) {
  const match = /^([NSEW])(\d+)$/.exec(String(position ?? ''));
  if (!match) return null;
  const edge = match[1];
  const index = Number(match[2]);
  if (!Number.isInteger(index) || index < 1) return null;
  if (edge === 'N') return index <= cols ? [0, index - 1] : null;
  if (edge === 'S') return index <= cols ? [rows - 1, index - 1] : null;
  if (edge === 'W') return index <= rows ? [index - 1, 0] : null;
  return index <= rows ? [index - 1, cols - 1] : null;
}

function exitPosition(exit) {
  return `${exit.edge}${exit.index}`;
}

function mappedBlocks(legend) {
  const mapping = new Map();
  for (const [color, ids] of Object.entries(legend ?? {})) {
    if (!COLOR_KEYS.has(color) || !Array.isArray(ids)) continue;
    for (const id of ids) {
      if (!mapping.has(id)) mapping.set(id, []);
      mapping.get(id).push(color);
    }
  }
  return mapping;
}

function connected(cells) {
  if (cells.length <= 1) return true;
  const remaining = new Set(cells.map(([r, c]) => `${r},${c}`));
  const queue = [cells[0]];
  remaining.delete(`${cells[0][0]},${cells[0][1]}`);
  for (let i = 0; i < queue.length; i += 1) {
    const [r, c] = queue[i];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const key = `${r + dr},${c + dc}`;
      if (!remaining.delete(key)) continue;
      queue.push([r + dr, c + dc]);
    }
  }
  return remaining.size === 0;
}

function add(issues, severity, code, field, message, suggestedFix) {
  issues.push({ severity, code, field, message, suggested_fix: suggestedFix });
}

function validateLevel(level) {
  const issues = [];
  const board = parseBoard(level.board);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const blockCells = new Map();
  const mapping = mappedBlocks(level.board_legend);
  const shutterEntries = Array.isArray(level.mechanism_config?.['形状计数装置'])
    ? level.mechanism_config['形状计数装置']
    : [];
  const hiddenBlockIds = new Set(
    shutterEntries.flatMap((shutter) => (shutter.hidden_blocks ?? []).map((block) => block.block)),
  );

  if (rows !== 6 || cols !== 8 || board.some((row) => row.length !== cols)) {
    add(
      issues,
      BLOCKING,
      'BOARD_DIMENSIONS',
      'board',
      `棋盘实际为 ${rows}x${cols}，或存在行宽不一致。`,
      '统一为6行、每行8字符。',
    );
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const ch = board[r][c];
      if (!/[A-Z]/.test(ch)) continue;
      if (!blockCells.has(ch)) blockCells.set(ch, []);
      blockCells.get(ch).push([r, c]);
    }
  }

  const missingLegend = [...blockCells.keys()].filter((id) => !mapping.has(id));
  const duplicateLegend = [...mapping.entries()]
    .filter(([, colors]) => colors.length !== 1)
    .map(([id, colors]) => `${id}:${colors.join('/')}`);
  const staleLegend = [...mapping.keys()].filter((id) => !blockCells.has(id) && !hiddenBlockIds.has(id));
  if (missingLegend.length) {
    add(issues, BLOCKING, 'LEGEND_MISSING', 'board_legend', `方块未分配颜色：${missingLegend.join(', ')}`, '为每个方块分配且只分配一种颜色。');
  }
  if (duplicateLegend.length) {
    add(issues, BLOCKING, 'LEGEND_DUPLICATE', 'board_legend', `方块被分配多个颜色：${duplicateLegend.join(', ')}`, '每个方块只保留一种颜色。');
  }
  if (staleLegend.length) {
    add(issues, REVIEW, 'LEGEND_STALE', 'board_legend', `图例引用棋盘中不存在的方块：${staleLegend.join(', ')}`, '删除无效映射或补回方块。');
  }

  const disconnected = [...blockCells.entries()]
    .filter(([, cells]) => !connected(cells))
    .map(([id]) => id);
  if (disconnected.length) {
    add(issues, BLOCKING, 'BLOCK_DISCONNECTED', 'board', `同字母方块不是四连通刚体：${disconnected.join(', ')}`, '拆分为不同ID，或修正字符图使其连续。');
  }

  const legendColors = [...new Set([...mapping.values()].flat())];
  if (level.color_count !== legendColors.length) {
    add(issues, BLOCKING, 'COLOR_COUNT_MISMATCH', 'color_count', `声明 ${level.color_count} 色，图例实际 ${legendColors.length} 色。`, `将color_count改为${legendColors.length}或修正图例。`);
  }

  const exits = Array.isArray(level.exits) ? level.exits : [];
  const exitColors = new Set(exits.map((exit) => exit.color));
  const colorsWithoutExit = legendColors.filter((color) => !exitColors.has(color));
  if (colorsWithoutExit.length) {
    add(issues, BLOCKING, 'COLOR_WITHOUT_EXIT', 'exits', `以下方块颜色没有出口：${colorsWithoutExit.join(', ')}`, '为每种方块颜色配置至少一个可达出口。');
  }

  const invalidExits = [];
  const exitsOnVoid = [];
  const exitsMissingSpan = [];
  const exitsByPosition = new Map();
  for (const exit of exits) {
    const pos = exitPosition(exit);
    const cell = positionToCell(pos, rows, cols);
    if (!cell || !COLOR_KEYS.has(exit.color)) invalidExits.push(pos);
    else if (board[cell[0]]?.[cell[1]] === '_') exitsOnVoid.push(pos);
    if (!Number.isInteger(exit.span) || exit.span < 1) exitsMissingSpan.push(pos);
    exitsByPosition.set(pos, exit);
  }
  if (invalidExits.length) {
    add(issues, BLOCKING, 'EXIT_INVALID', 'exits', `出口边/index/颜色无效：${invalidExits.join(', ')}`, '修正edge、1基index和color。');
  }
  if (exitsOnVoid.length) {
    add(issues, BLOCKING, 'EXIT_ON_VOID', 'exits', `出口正对棋盘外格“_”：${exitsOnVoid.join(', ')}`, '调整出口位置或把对应边缘格改为可玩格。');
  }
  if (exitsMissingSpan.length) {
    add(issues, BLOCKING, 'EXIT_SPAN_MISSING', 'exits[].span', `出口缺少通道宽度：${exitsMissingSpan.join(', ')}`, '逐出口补span，或改用cells列出完整出口开口。');
  }

  if (exits.some((exit) => exit.trigger !== 'during_drag'
    || exit.requires_release !== false
    || !exit.fit_rule)) {
    add(
      issues,
      AUTOFILL,
      'EXIT_TRIGGER_DEFAULTS',
      'exit_rules',
      '部分出口未声明拖拽中触发、松手要求或完整投影适配规则。',
      '补全trigger="during_drag"、requires_release=false和fit_rule。',
    );
  }
  if (level.target_coins_role !== 'displayed_wallet_not_solver_goal') {
    add(
      issues,
      AUTOFILL,
      'COINS_METADATA',
      'target_coins',
      '该字段尚未声明为展示货币。',
      '补充target_coins_role并从终局判定排除。',
    );
  }

  const totalBlocks = new Set([...blockCells.keys(), ...hiddenBlockIds]).size;
  const numeric = Array.isArray(level.number_elements) ? level.number_elements : [];
  const edgeCountersMissingReveal = [];
  const impossibleNumericBlocks = [];
  for (const element of numeric) {
    if (!Number.isInteger(element.value) || element.value < 0) {
      add(issues, BLOCKING, 'COUNTER_VALUE_INVALID', 'number_elements', `数字元素值无效：${JSON.stringify(element)}`, '使用大于等于0的整数。');
    }
    if (element.type === '数字方块') {
      if (!blockCells.has(element.block)) {
        add(issues, BLOCKING, 'NUMBER_BLOCK_MISSING', 'number_elements[].block', `数字方块引用不存在的ID：${element.block}`, '改为棋盘中存在的方块ID。');
      }
      if (element.value > totalBlocks - 1) impossibleNumericBlocks.push(`${element.block}:${element.value}`);
    }
    if (element.type === '数字边栏' || element.type === '侧边计数装置') {
      const cell = positionToCell(element.position, rows, cols);
      if (!cell) {
        add(issues, BLOCKING, 'EDGE_COUNTER_POSITION_INVALID', 'number_elements[].position', `边缘数字位置无效：${element.position}`, '使用N/S 1-8或E/W 1-6。');
      } else if (!exitsByPosition.has(element.position) && !element.role) {
        edgeCountersMissingReveal.push(element.position);
      }
    }
  }
  if (impossibleNumericBlocks.length) {
    add(issues, BLOCKING, 'NUMBER_BLOCK_COUNT_TOO_HIGH', 'number_elements', `按“每移出一块减1”时，数字超过其余可消除方块数：${impossibleNumericBlocks.join(', ')}`, '降低数值、增加可先行消除的方块，或指定不同计数来源。');
  }
  if (numeric.some((item) => item.type === '数字方块'
    && (item.counter_event !== 'block_exited'
      || item.decrement !== 1
      || item.immobile_until_zero !== true))) {
    add(issues, AUTOFILL, 'NUMBER_BLOCK_RULE_DEFAULTS', 'number_elements', '数字方块未显式声明计数事件及归零前锁定状态。', '补全counter_event="block_exited"、decrement=1、immobile_until_zero=true。');
  }
  if (edgeCountersMissingReveal.length) {
    add(issues, BLOCKING, 'EDGE_COUNTER_REVEAL_MISSING', 'number_elements', `边缘数字没有对应出口或揭示对象：${edgeCountersMissingReveal.join(', ')}`, '为每项补reveals_exit_id，或补reveals_exit={edge,index,color,span}。');
  }

  const mechanisms = new Set(level.mechanism ?? []);
  const config = level.mechanism_config ?? {};
  for (const forbidden of ['钥匙方块', '钥匙与锁', '双向箭头方块']) {
    if (mechanisms.has(forbidden) || Object.hasOwn(config, forbidden)) {
      add(issues, BLOCKING, 'REMOVED_MECHANISM_PRESENT', `mechanism_config.${forbidden}`, `${forbidden}已经从项目规则中移除。`, '删除该机制及其配置，并改用仍启用的机制重新平衡关卡。');
    }
  }
  const retiredExitFields = ['locked', 'unlock_counter_id', 'required_key'];
  const retiredExitUsages = exits.flatMap((exit) => retiredExitFields.filter((field) => Object.hasOwn(exit, field)));
  const retiredCounterUsages = numeric.flatMap((element) => [
    ...(element.role === 'exit_lock' ? ['role=exit_lock'] : []),
    ...(Object.hasOwn(element, 'locks_exit_id') ? ['locks_exit_id'] : []),
  ]);
  if (retiredExitUsages.length || retiredCounterUsages.length) {
    add(
      issues,
      BLOCKING,
      'REMOVED_KEY_LOCK_FIELD_PRESENT',
      'exits/number_elements',
      `已停用结构字段仍存在：${[...retiredExitUsages, ...retiredCounterUsages].join(', ')}`,
      '删除旧字段；数字门使用counter_gate_id、role="exit_count_gate"与gates_exit_id。',
    );
  }

  if (mechanisms.has('图案方块')) {
    const ids = config['图案方块'];
    const normalized = Array.isArray(ids) && ids.every((item) => typeof item === 'object');
    const missing = Array.isArray(ids)
      ? ids.map((item) => typeof item === 'string' ? item : item.block).filter((id) => !blockCells.has(id))
      : [];
    if (!Array.isArray(ids) || missing.length) {
      add(issues, BLOCKING, 'PATTERN_BLOCK_REFERENCE', 'mechanism_config.图案方块', `图案方块配置无效${missing.length ? `：${missing.join(', ')}` : ''}`, '提供有效方块ID。');
    }
    if (!normalized || ids.some((item) => !item.pattern_id || !item.required_exit_id || !item.rule)) {
      add(issues, BLOCKING, 'PATTERN_RULE_MISSING', 'mechanism_config.图案方块', '只有方块ID，没有pattern_id、匹配出口或激活/清除条件。', '补充每个图案方块的pattern_id与clear_condition；取得竞品规则前不可自动猜测。');
    }
  }

  if (mechanisms.has('嵌套方块')) {
    const nested = config['嵌套方块'];
    if (nested?.block && Array.isArray(nested.layers)) {
      if (!blockCells.has(nested.block) || nested.layers.length < 2 || nested.layers.some((layer) => !layer.color)) {
        add(issues, BLOCKING, 'LAYER_REFERENCE_INVALID', 'mechanism_config.嵌套方块', '标准化层叠方块缺少有效block或颜色层。', '提供存在的block及至少两个颜色层。');
      }
    } else {
    const outer = nested?.outer_block;
    const inner = nested?.inner_block;
    if (!blockCells.has(outer) || !blockCells.has(inner)) {
      add(issues, BLOCKING, 'LAYER_REFERENCE_INVALID', 'mechanism_config.嵌套方块', `层叠引用无效：outer=${outer}, inner=${inner}`, '引用棋盘中存在的方块。');
    } else {
      add(issues, BLOCKING, 'LAYER_SCHEMA_CONFLICT', 'mechanism_config.嵌套方块', `当前用两个独立占位方块表示外层${outer}和内层${inner}，不符合竞品同格多层。`, '改为单一block_id与layers颜色数组，并在board中只保留一次占位。');
    }
    }
  }

  if (mechanisms.has('冰冻效果')) {
    const frozenIds = config['冰冻效果'];
    const normalized = Array.isArray(frozenIds) && frozenIds.every((item) => typeof item === 'object');
    const missing = Array.isArray(frozenIds)
      ? frozenIds.map((item) => typeof item === 'string' ? item : item.block).filter((id) => !blockCells.has(id))
      : [];
    if (!Array.isArray(frozenIds) || missing.length) {
      add(issues, BLOCKING, 'ICE_REFERENCE_INVALID', 'mechanism_config.冰冻效果', `冰冻方块引用无效${missing.length ? `：${missing.join(', ')}` : ''}`, '提供有效方块ID。');
    }
    if (!normalized || frozenIds.some((item) => !Number.isInteger(item.value) || item.value < 0 || !item.counter_event)) {
      add(issues, BLOCKING, 'ICE_COUNT_MISSING', 'mechanism_config.冰冻效果', '只有冰冻方块ID，没有各自初始倒计时。', '改为[{block, value, counter_event:"block_exited"}]。');
    }
  }

  if (mechanisms.has('形状计数装置')) {
    const shutters = config['形状计数装置'];
    const complete = Array.isArray(shutters) && shutters.length > 0 && shutters.every((shutter) =>
      Number.isInteger(shutter.initial_value)
      && Array.isArray(shutter.covered_cells)
      && Array.isArray(shutter.hidden_blocks)
      && shutter.counter_event === 'block_exited');
    if (!complete) {
      add(issues, BLOCKING, 'SHUTTER_SCHEMA_MISSING', 'mechanism_config.形状计数装置', '当前配置按形状分类计数，但竞品视频显示的是按消除方块数倒计时的遮挡门。', '改为shutters:[{value,covered_cells,hidden_blocks}]，并删除未获证据支持的形状匹配规则。');
    }
  }

  if (mechanisms.has('分离式双面板')) {
    const split = config['分离式双面板'];
    if (split?.separator_axis && split?.separator_index) {
      const isColumn = split.separator_axis === 'column';
      const index = split.separator_index - 1;
      const valid = isColumn
        ? board.every((row) => row[index] === '_')
        : Boolean(board[index]) && [...board[index]].every((ch) => ch === '_');
      if (!valid) {
        add(issues, BLOCKING, 'PANEL_SEPARATOR_MISMATCH', 'mechanism_config.分离式双面板', '标准化分隔轴与字符图不一致。', '修正separator_axis/separator_index或字符图。');
      }
    } else if (split?.separator_col) {
      const c = split.separator_col - 1;
      if (!board.every((row) => row[c] === '_')) {
        add(issues, BLOCKING, 'PANEL_SEPARATOR_MISMATCH', 'mechanism_config.分离式双面板.separator_col', `第${split.separator_col}列并非完整“_”分隔列。`, '修正separator_col或字符图。');
      }
    } else if (split?.separator_row) {
      const r = split.separator_row - 1;
      if (!board[r] || [...board[r]].some((ch) => ch !== '_')) {
        add(issues, BLOCKING, 'PANEL_SEPARATOR_MISMATCH', 'mechanism_config.分离式双面板.separator_row', `第${split.separator_row}行并非完整“_”分隔行。`, '修正separator_row或字符图。');
      }
    } else {
      add(issues, BLOCKING, 'PANEL_SEPARATOR_MISSING', 'mechanism_config.分离式双面板', '未提供separator_row或separator_col。', '提供结构化分隔位置。');
    }
    if (split?.transfer) {
      add(issues, BLOCKING, 'PANEL_TRANSFER_CONFLICT', 'mechanism_config.分离式双面板.transfer', `配置包含未获竞品视频支持的跨面板转移：“${split.transfer}”。`, '删除transfer；若坚持自定义传送，改为结构化portals并明确这是原创规则。');
    } else if (!split || !Object.hasOwn(split, 'transfer')) {
      add(issues, AUTOFILL, 'PANEL_NO_TRANSFER_DEFAULT', 'mechanism_config.分离式双面板', '未声明面板间传送。', '按竞品补全为transfer=null，各面板独立、共享计时和全局计数。');
    }
  }

  for (const geometry of ['阶梯形通道', '中部通道', '纵向通道', 'T形通道']) {
    if (!mechanisms.has(geometry)) continue;
    const geometryConfig = config[geometry];
    if (!geometryConfig
      || geometryConfig.topology_source !== 'board_mask'
      || geometryConfig.movement_restriction !== 'geometry_only'
      || geometryConfig.allow_turn_during_drag !== true) {
      add(issues, AUTOFILL, 'GEOMETRY_BOARD_AUTHORITATIVE', `mechanism_config.${geometry}`, `${geometry}尚未明确只描述棋盘拓扑。`, '以board中的可玩格/“_”为权威，并补充geometry_only与连续转向。');
    }
  }

  if (mechanisms.has('环形通道')) {
    const ring = config['环形通道'];
    if (!ring || typeof ring !== 'object' || ring.topology_source !== 'board_mask' || !ring.direction) {
      add(issues, BLOCKING, 'RING_CONFIG_UNSTRUCTURED', 'mechanism_config.环形通道', `环形通道仍是自然语言：“${ring}”。`, '补充结构化playable_cells；没有明确箭头时删除顺时针/单向限制。');
    }
  }

  const counts = {
    blocking: issues.filter((issue) => issue.severity === BLOCKING).length,
    review: issues.filter((issue) => issue.severity === REVIEW).length,
    autofill: issues.filter((issue) => issue.severity === AUTOFILL).length,
  };
  return {
    level_id: level.level_id,
    board: `${rows}x${cols}`,
    block_count: totalBlocks,
    status: counts.blocking ? 'needs_authoring' : counts.review ? 'needs_confirmation' : 'ready',
    counts,
    issues,
  };
}

const results = levels.map(validateLevel);
const summary = {
  input: inputPath,
  level_count: results.length,
  ready: results.filter((item) => item.status === 'ready').length,
  needs_confirmation: results.filter((item) => item.status === 'needs_confirmation').length,
  needs_authoring: results.filter((item) => item.status === 'needs_authoring').length,
  blocking_issues: results.reduce((sum, item) => sum + item.counts.blocking, 0),
  review_issues: results.reduce((sum, item) => sum + item.counts.review, 0),
  autofill_items: results.reduce((sum, item) => sum + item.counts.autofill, 0),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, levels: results }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify(summary));
console.log('level_id\tstatus\tblocking\treview\tautofill\tblocking_codes');
for (const result of results) {
  const codes = result.issues
    .filter((issue) => issue.severity === BLOCKING)
    .map((issue) => issue.code)
    .join(',');
  console.log(`${result.level_id}\t${result.status}\t${result.counts.blocking}\t${result.counts.review}\t${result.counts.autofill}\t${codes}`);
}
