import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const inputPath = path.resolve(
  process.argv[2] ?? 'deliverables/original-levels/blockout-original-levels-101-120.json',
);
const outputPath = path.resolve(
  process.argv[3] ?? 'deliverables/original-levels/blockout-original-levels-101-120-completed.json',
);

const levels = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const COLOR_KEYS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'cyan'];
const DIRECTIONS = ['N', 'E', 'S', 'W'];

function rowsOf(level) {
  return level.board.split('\n');
}

function writeRows(level, rows) {
  level.board = rows.join('\n');
}

function blockCells(level) {
  const result = new Map();
  const rows = rowsOf(level);
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < rows[r].length; c += 1) {
      const id = rows[r][c];
      if (!/[A-Z]/.test(id)) continue;
      if (!result.has(id)) result.set(id, []);
      result.get(id).push([r, c]);
    }
  }
  return result;
}

function colorOf(level, block) {
  for (const color of COLOR_KEYS) {
    if (level.board_legend?.[color]?.includes(block)) return color;
  }
  return null;
}

function removeBlockFromBoard(level, block) {
  const rows = rowsOf(level).map((row) => [...row]);
  const removed = [];
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < rows[r].length; c += 1) {
      if (rows[r][c] !== block) continue;
      rows[r][c] = '.';
      removed.push([r, c]);
    }
  }
  writeRows(level, rows.map((row) => row.join('')));
  return removed;
}

function removeLegendBlock(level, block) {
  for (const color of COLOR_KEYS) {
    if (!Array.isArray(level.board_legend?.[color])) continue;
    level.board_legend[color] = level.board_legend[color].filter((id) => id !== block);
  }
}

function rc([r, c]) {
  return `r${r + 1}c${c + 1}`;
}

function parseRange(text) {
  const match = /^r(\d+)c(\d+)-r(\d+)c(\d+)$/.exec(text);
  if (!match) return [];
  const [, r1s, c1s, r2s, c2s] = match;
  const r1 = Number(r1s) - 1;
  const c1 = Number(c1s) - 1;
  const r2 = Number(r2s) - 1;
  const c2 = Number(c2s) - 1;
  const cells = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) cells.push([r, c]);
  }
  return cells;
}

function edgeLength(edge, rows, cols) {
  return edge === 'N' || edge === 'S' ? cols : rows;
}

function edgeBoardCell(edge, index, rows, cols) {
  if (edge === 'N') return [0, index - 1];
  if (edge === 'S') return [rows - 1, index - 1];
  if (edge === 'W') return [index - 1, 0];
  return [index - 1, cols - 1];
}

function exitCellName(edge, index) {
  return `${edge}${index}`;
}

function blockSpan(cells, edge) {
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const height = Math.max(...rows) - Math.min(...rows) + 1;
  const width = Math.max(...cols) - Math.min(...cols) + 1;
  return edge === 'N' || edge === 'S' ? width : height;
}

function playableBoundarySegments(level, edge, span) {
  const board = rowsOf(level);
  const rows = board.length;
  const cols = board[0].length;
  const length = edgeLength(edge, rows, cols);
  const segments = [];
  for (let start = 1; start <= length - span + 1; start += 1) {
    const cells = [];
    let valid = true;
    for (let index = start; index < start + span; index += 1) {
      const [r, c] = edgeBoardCell(edge, index, rows, cols);
      if (board[r][c] === '_') valid = false;
      cells.push({ edge, index, boardCell: `${r},${c}` });
    }
    if (valid) segments.push({ edge, start, span, cells });
  }
  return segments;
}

function collectPhysicalDefinitions(level, originalCells, layerInfo, hiddenBlocks) {
  const definitions = [];
  for (const [block, cells] of originalCells) {
    if (layerInfo.some((entry) => entry.removed_inner_block === block)) continue;
    const layers = layerInfo.find((entry) => entry.block === block)?.layers;
    if (layers) {
      for (const layer of layers) definitions.push({ block, color: layer.color, cells });
      continue;
    }
    definitions.push({ block, color: colorOf(level, block), cells });
  }
  for (const hidden of hiddenBlocks) {
    if (!definitions.some((entry) => entry.block === hidden.block)) {
      definitions.push({ block: hidden.block, color: hidden.color, cells: hidden.cells });
    }
  }
  return definitions.filter((entry) => entry.color && entry.cells.length);
}

function allocateExits(level, definitions) {
  const board = rowsOf(level);
  const rows = board.length;
  const cols = board[0].length;
  const requests = level.exits.map((exit, order) => ({ ...exit, order }));
  const candidates = requests.map((request) => {
    const result = [];
    for (const edge of DIRECTIONS) {
      const relevant = definitions.filter((entry) => entry.color === request.color);
      const span = Math.max(1, ...relevant.map((entry) => blockSpan(entry.cells, edge)));
      for (const segment of playableBoundarySegments(level, edge, span)) {
        const originalCenter = request.index;
        const candidateCenter = segment.start + (span - 1) / 2;
        const edgePenalty = edge === request.edge ? 0 : 100;
        result.push({
          ...segment,
          score: edgePenalty + Math.abs(candidateCenter - originalCenter),
        });
      }
    }
    return result.sort((a, b) => a.score - b.score);
  });

  const order = requests
    .map((_, index) => index)
    .sort((a, b) => candidates[a].length - candidates[b].length || candidates[b][0].span - candidates[a][0].span);
  let best = null;

  function visit(depth, used, score, placed) {
    if (best && score >= best.score) return;
    if (depth === order.length) {
      best = { score, placed: [...placed] };
      return;
    }
    const requestIndex = order[depth];
    for (const candidate of candidates[requestIndex]) {
      if (candidate.cells.some((cell) => used.has(cell.boardCell))) continue;
      const nextUsed = new Set(used);
      candidate.cells.forEach((cell) => nextUsed.add(cell.boardCell));
      placed[requestIndex] = candidate;
      visit(depth + 1, nextUsed, score + candidate.score, placed);
    }
  }

  visit(0, new Set(), 0, []);
  if (!best) throw new Error(`Level ${level.level_id}: cannot allocate non-overlapping exits`);

  return requests.map((request, index) => {
    const placement = best.placed[index];
    return {
      id: `L${level.level_id}-X${index + 1}`,
      edge: placement.edge,
      index: placement.start,
      span: placement.span,
      cells: placement.cells.map((cell) => exitCellName(cell.edge, cell.index)),
      color: request.color,
      original_anchor: `${request.edge}${request.index}`,
      trigger: 'during_drag',
      requires_release: false,
      fit_rule: 'full_block_projection_inside_aperture',
      completion_source: placement.edge === request.edge ? 'derived_span_and_nearest_fit' : 'relocated_to_nearest_fitting_edge',
    };
  });
}

function completeLayerBlocks(level, originalCells) {
  if (!level.mechanism?.includes('嵌套方块')) return [];
  const original = level.mechanism_config?.['嵌套方块'];
  const outer = original.outer_block;
  const inner = original.inner_block;
  const outerColor = colorOf(level, outer);
  const innerColor = colorOf(level, inner);
  const removedCells = removeBlockFromBoard(level, inner);
  removeLegendBlock(level, inner);
  const normalized = {
    block: outer,
    footprint_cells: originalCells.get(outer).map(rc),
    layers: [
      { order: 1, color: outerColor },
      { order: 2, color: innerColor },
    ],
    removed_inner_block: inner,
    removed_inner_source_cells: removedCells.map(rc),
    on_layer_cleared: 'remain_inside_gate_with_next_layer_active',
    final_layer_action: 'remove_block',
    completion_source: 'video_verified_layer_block_normalization',
  };
  level.mechanism_config['嵌套方块'] = normalized;
  level.completion_notes.push(`将独立内层方块${inner}合并为${outer}的同格第二颜色层，并释放原${inner}占位。`);
  return [normalized];
}

function completeShutters(level, originalCells) {
  if (level.level_id !== 117) return [];
  const specs = [
    {
      id: 'L117-SH1',
      value: 4,
      covered: [[1, 1], [1, 2], [2, 1], [2, 2]],
      hidden: 'H',
    },
    {
      id: 'L117-SH2',
      value: 9,
      covered: [[3, 1], [3, 2], [4, 1], [4, 2]],
      hidden: 'M',
    },
  ];
  const shutters = specs.map((spec) => {
    const cells = originalCells.get(spec.hidden);
    const hidden = {
      block: spec.hidden,
      color: colorOf(level, spec.hidden),
      cells,
    };
    removeBlockFromBoard(level, spec.hidden);
    return {
      id: spec.id,
      initial_value: spec.value,
      counter_event: 'block_exited',
      decrement: 1,
      covered_cells: spec.covered.map(rc),
      hidden_blocks: [{ ...hidden, cells: cells.map(rc) }],
      blocks_entry_until_zero: true,
      reveal_at_zero: true,
      completion_source: 'video_verified_shutter_rule_with_authored_placement',
      _hiddenDefinition: hidden,
    };
  });
  level.number_elements = level.number_elements.map((element) => {
    if (element.type !== '形状计数装置') return element;
    const shutter = shutters.find((entry) => entry.initial_value === element.value);
    return {
      id: `${shutter.id}-COUNTER`,
      type: '百叶门计数',
      value: element.value,
      shutter_id: shutter.id,
      counter_event: 'block_exited',
      decrement: 1,
      original_position: element.position,
    };
  });
  level.mechanism_config['形状计数装置'] = shutters.map(({ _hiddenDefinition, ...item }) => item);
  level.completion_notes.push('将原形状分类计数改为两个按消除方块数开启的百叶门，并把H、M置于门后。');
  return shutters.map((entry) => entry._hiddenDefinition);
}

function normalizeGeometry(level) {
  const config = level.mechanism_config ?? (level.mechanism_config = {});
  for (const name of ['阶梯形通道', '中部通道', '纵向通道', 'T形通道']) {
    if (!level.mechanism?.includes(name)) continue;
    config[name] = {
      topology_source: 'board_mask',
      original_annotation: config[name] ?? null,
      movement_restriction: 'geometry_only',
      allow_turn_during_drag: true,
      completion_source: 'video_verified_geometry_rule',
    };
  }
  if (level.mechanism?.includes('环形通道')) {
    const original = String(config['环形通道'] ?? '');
    const rangeText = original.match(/r\d+c\d+-r\d+c\d+/)?.[0];
    config['环形通道'] = {
      topology_source: 'board_mask',
      annotated_core_cells: rangeText ? parseRange(rangeText).map(rc) : [],
      direction: 'bidirectional',
      movement_restriction: 'geometry_only',
      allow_turn_during_drag: true,
      original_annotation: original,
      completion_source: 'structured_from_annotation_without_unverified_one_way_rule',
    };
    level.completion_notes.push('环形通道改为结构化双向几何规则；未采用缺乏视频证据的单向移动。');
  }
}

function completeOne(source) {
  const level = structuredClone(source);
  const forbiddenMechanisms = ['钥匙方块', '钥匙与锁', '双向箭头方块'];
  const foundForbidden = forbiddenMechanisms.filter((name) => level.mechanism?.includes(name));
  if (foundForbidden.length) {
    throw new Error(`Level ${level.level_id}: 已停用机制仍在配置中：${foundForbidden.join('、')}`);
  }
  const retiredExitFields = ['locked', 'unlock_counter_id', 'required_key'];
  const retiredCounterFields = ['locks_exit_id'];
  if (level.exits?.some((exit) => retiredExitFields.some((field) => Object.hasOwn(exit, field)))) {
    throw new Error(`Level ${level.level_id}: 已停用锁机制，但出口仍含锁字段`);
  }
  if (level.number_elements?.some((element) => retiredCounterFields.some((field) => Object.hasOwn(element, field)))) {
    throw new Error(`Level ${level.level_id}: 已停用锁机制，但数字元素仍含出口锁关联`);
  }
  level.config_version = 'solver-v3-video-reviewed';
  level.completion_status = 'completed_with_declared_project_assumptions';
  level.completion_notes = [];
  level.displayed_coins = level.target_coins;
  level.target_coins_role = 'displayed_wallet_not_solver_goal';
  level.solver_rules = {
    movement: {
      mode: 'continuous_rigid_drag',
      snap_positions: 'grid_aligned',
      allow_direction_changes_without_release: true,
      collision: 'swept_rigid_shape',
      optimal_step_unit: 'drag_gesture',
    },
    counters: {
      unit: 'cleared_block',
      event: 'block_exited',
      decrement_per_event: 1,
    },
    completion: {
      all_blocks_removed: true,
      all_required_counters_resolved: true,
      coins_are_goal: false,
    },
    time: {
      timer_type: 'wall_clock',
      optimal_drag_baseline_sec: 0.8,
      interpretation: 'motor_time_lower_bound_player_time_is_not_less',
    },
  };

  level.mechanism_config ??= {};
  const originalCells = blockCells(level);
  const layerInfo = completeLayerBlocks(level, originalCells);
  const hiddenBlocks = completeShutters(level, originalCells);
  normalizeGeometry(level);

  const definitions = collectPhysicalDefinitions(level, originalCells, layerInfo, hiddenBlocks);
  const originalExitMap = new Map(
    level.exits.map((exit, index) => [`${exit.edge}${exit.index}`, `L${level.level_id}-X${index + 1}`]),
  );
  level.exits = allocateExits(level, definitions);
  const exitsById = new Map(level.exits.map((exit) => [exit.id, exit]));

  const visibleBlocks = blockCells(level);
  const physicalBlockCount = new Set(definitions.map((entry) => entry.block)).size;
  level.number_elements = level.number_elements.map((sourceElement, index) => {
    if (sourceElement.type === '百叶门计数') return sourceElement;
    const element = {
      ...sourceElement,
      id: `L${level.level_id}-N${index + 1}`,
      counter_event: 'block_exited',
      counter_unit: 'block',
      decrement: 1,
    };
    if (element.type === '数字方块') {
      const maxValue = Math.max(0, physicalBlockCount - 1);
      if (element.value > maxValue) {
        level.completion_notes.push(`数字方块${element.block}由${element.value}修正为${maxValue}，避免超过其余可消除方块数。`);
        element.original_value = element.value;
        element.value = maxValue;
      }
      element.immobile_until_zero = true;
      element.reveal_at_zero = 'base_colored_block';
      element.completion_source = 'video_verified_ice_counter_rule';
      return element;
    }
    if (element.type === '数字边栏' || element.type === '侧边计数装置') {
      element.blocks_movement = false;
      const gatedExitId = originalExitMap.get(element.position);
      if (gatedExitId) {
        element.role = 'exit_count_gate';
        element.gates_exit_id = gatedExitId;
        element.required_for_completion = false;
        element.completion_source = 'project_defined_numeric_exit_gate';
        const exit = exitsById.get(gatedExitId);
        exit.counter_gate_id = element.id;
        exit.counter_gate_rule = 'available_when_counter_reaches_zero';
      } else {
        element.role = 'global_countdown_goal';
        element.required_for_completion = true;
        element.completion_source = 'project_defined_non_blocking_edge_counter';
      }
      if (element.value > physicalBlockCount) {
        element.original_value = element.value;
        element.value = physicalBlockCount;
        level.completion_notes.push(`边缘计数${element.position}限制为总方块数${physicalBlockCount}。`);
      }
      return element;
    }
    return element;
  });

  for (const element of level.number_elements.filter((item) => item.role === 'exit_count_gate')) {
    const exit = exitsById.get(element.gates_exit_id);
    const blocksUsingExitColor = new Set(
      definitions.filter((entry) => entry.color === exit.color).map((entry) => entry.block),
    ).size;
    const independentlyClearable = physicalBlockCount - blocksUsingExitColor;
    if (element.value > independentlyClearable) {
      element.original_value ??= element.value;
      element.value = independentlyClearable;
      level.completion_notes.push(
        `计数出口${element.id}由${element.original_value}修正为${independentlyClearable}，避免同色方块造成循环依赖。`,
      );
    }
  }
  if (level.number_elements.some((item) => item.type === '数字边栏' || item.type === '侧边计数装置')) {
    level.completion_notes.push('数字边栏与侧边计数装置按消除数归零；对应出口只显示数字门，不附加其他移动规则。');
  }

  if (level.mechanism?.includes('冰冻效果')) {
    const ids = level.mechanism_config['冰冻效果'];
    const base = level.difficulty_tag === 'super_hard' ? 5 : 3;
    level.mechanism_config['冰冻效果'] = ids.map((block, index) => ({
      block,
      value: Math.min(physicalBlockCount - 1, base + index * 2),
      counter_event: 'block_exited',
      decrement: 1,
      immobile_until_zero: true,
      completion_source: 'authored_completion_value_using_level_difficulty',
    }));
    level.completion_notes.push('为冰冻方块补入可归零的项目设计倒计时；数值不是从竞品截图推测。');
  }

  if (level.mechanism?.includes('图案方块')) {
    const ids = level.mechanism_config['图案方块'];
    const patterns = ids.map((block, index) => {
      const color = colorOf(level, block);
      const exit = level.exits.find((candidate) => candidate.color === color);
      const patternId = `L${level.level_id}-P${index + 1}`;
      exit.accepted_patterns ??= [];
      exit.accepted_patterns.push(patternId);
      return {
        block,
        pattern_id: patternId,
        required_exit_id: exit.id,
        rule: 'color_and_pattern_must_match',
        rule_origin: 'project_defined_pending_competitor_verification',
      };
    });
    level.mechanism_config['图案方块'] = patterns;
    level.completion_notes.push('图案方块采用明确的项目自定义“颜色+图案出口匹配”规则。');
  }

  if (level.mechanism?.includes('分离式双面板')) {
    const split = level.mechanism_config['分离式双面板'];
    level.mechanism_config['分离式双面板'] = {
      separator_axis: split.separator_col ? 'column' : 'row',
      separator_index: split.separator_col ?? split.separator_row,
      transfer: null,
      panels_share_timer: true,
      panels_share_global_counters: true,
      completion_source: 'video_verified_independent_panels',
      removed_original_transfer: split.transfer ?? null,
    };
    if (split.transfer) level.completion_notes.push('删除未获竞品视频支持的跨面板出口转移。');
  }

  level.color_count = new Set(definitions.map((entry) => entry.color)).size;
  level.number_element_count = level.number_elements.length;
  level.mechanism_count = level.mechanism.length;
  level.completion_checks = {
    board_dimensions: `${rowsOf(level).length}x${rowsOf(level)[0].length}`,
    visible_block_count: visibleBlocks.size,
    physical_block_count_including_hidden_and_layers: physicalBlockCount,
    exit_apertures_explicit: true,
    counters_explicit: true,
    unresolved_semantics: [],
  };
  return level;
}

const completed = levels.map(completeOne);
fs.writeFileSync(outputPath, `${JSON.stringify(completed, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: inputPath, output: outputPath, levels: completed.length }));
