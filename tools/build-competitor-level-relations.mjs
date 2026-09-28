import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shapeCatalogPath = path.join(
  projectRoot,
  'deliverables',
  'competitor-board-shapes',
  'blockout-lv001-lv100-board-shapes.json',
);
const reviewDirectory = path.join(projectRoot, 'playtest-results', 'competitor-relations');
const outputDirectory = path.join(projectRoot, 'deliverables', 'competitor-level-relations');

const mechanismDefinitions = {
  '方向出口': {
    type: 'directional_exit',
    valueSemantics: null,
    isSpecial: false,
  },
  '数字边栏/冰封出口': {
    type: 'numbered_edge_gate',
    valueSemantics: '可见计数值；不是色块数量',
    isSpecial: true,
  },
  '数字方块/数字冰块': {
    type: 'numbered_ice_block',
    valueSemantics: '可见计数值；该实例另计入锁定色块数量',
    isSpecial: true,
  },
  '倒计时遮挡仓': {
    type: 'countdown_cover',
    valueSemantics: '可见倒计时值；不是仓后色块数量',
    isSpecial: true,
  },
  '多层/嵌套色块': {
    type: 'nested_shell_block',
    valueSemantics: null,
    isSpecial: true,
  },
  '侧边生成器/计数装置': {
    type: 'side_generator',
    valueSemantics: '可见剩余生成队列色块数',
    isSpecial: true,
  },
  '箭头/升降色块': {
    type: 'arrow_block',
    valueSemantics: null,
    isSpecial: true,
  },
  '图案色块': {
    type: 'pattern_block',
    valueSemantics: null,
    isSpecial: true,
  },
  '钥匙与锁': {
    type: 'key_lock',
    valueSemantics: null,
    isSpecial: true,
  },
  '冰框/冻结色块': {
    type: 'ice_frame',
    valueSemantics: null,
    isSpecial: true,
  },
  '冰框': {
    type: 'ice_frame',
    valueSemantics: null,
    isSpecial: true,
  },
  '异形色块': {
    type: 'irregular_block',
    valueSemantics: null,
    isSpecial: true,
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relativeToProject(filePath) {
  if (!filePath) return filePath;
  const normalized = filePath.replaceAll('\\', '/');
  const normalizedRoot = projectRoot.replaceAll('\\', '/');
  if (normalized.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
    return normalized.slice(normalizedRoot.length + 1);
  }
  return normalized;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function average(values) {
  const numeric = values.filter(Number.isFinite);
  return numeric.length ? round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length) : null;
}

function pearsonCorrelation(pairs) {
  const numericPairs = pairs.filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right));
  if (numericPairs.length < 2) return { sample_size: numericPairs.length, coefficient: null };
  const leftMean = numericPairs.reduce((total, [left]) => total + left, 0) / numericPairs.length;
  const rightMean = numericPairs.reduce((total, [, right]) => total + right, 0) / numericPairs.length;
  let numerator = 0;
  let leftSquared = 0;
  let rightSquared = 0;
  for (const [left, right] of numericPairs) {
    numerator += (left - leftMean) * (right - rightMean);
    leftSquared += (left - leftMean) ** 2;
    rightSquared += (right - rightMean) ** 2;
  }
  const denominator = Math.sqrt(leftSquared * rightSquared);
  return {
    sample_size: numericPairs.length,
    coefficient: denominator ? round(numerator / denominator, 3) : null,
  };
}

function sum(values) {
  return values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
}

function nearestRank(values, fraction) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function normalizeMechanism(rawMechanism) {
  const name = rawMechanism.type ?? rawMechanism.type_cn;
  const definition = mechanismDefinitions[name] ?? {
    type: `unmapped_${name}`,
    valueSemantics: null,
    isSpecial: true,
  };
  const values = Array.isArray(rawMechanism.visible_values)
    ? [...rawMechanism.visible_values]
    : null;
  return {
    type: definition.type,
    name,
    visible_count: rawMechanism.visible_count,
    visible_values: values,
    value_semantics: definition.valueSemantics,
    is_special: definition.isSpecial,
  };
}

function geometryGroup(shapeFamily) {
  if (shapeFamily === '完整矩形') return '完整矩形';
  if (shapeFamily === '多分区组合') return '多分区';
  return '单区异形';
}

function geometryRole(shapeFamily, internalHoleCount) {
  if (internalHoleCount > 0) return '内部孔洞形成绕行约束';
  if (shapeFamily === '完整矩形') return '规整连续空间';
  if (shapeFamily === '多分区组合') return '分区与局部通路';
  if (['窄颈/工字形', 'H形', 'T形', 'L形'].includes(shapeFamily)) return '窄颈或共享通路';
  if (['凹口/开槽形', '阶梯/多边形'].includes(shapeFamily)) return '边缘缺口与可用空间收缩';
  return '异形通路';
}

function stagedLoadSources(mechanisms) {
  const present = new Set(mechanisms.map((mechanism) => mechanism.type));
  const sources = [];
  if (present.has('numbered_ice_block')) sources.push('数字冰块锁定色块');
  if (present.has('countdown_cover')) sources.push('遮挡仓后内容不可见');
  if (present.has('side_generator')) sources.push('生成队列延后投放');
  if (present.has('nested_shell_block')) sources.push('嵌套层在同一空间槽位分层清除');
  if (present.has('key_lock')) sources.push('钥匙与锁形成先后依赖');
  return sources;
}

function relationshipTags(level, lowerBand, upperBand) {
  const tags = [];
  const specialTypes = level.mechanisms.filter((item) => item.is_special).map((item) => item.type);
  const specialTypeSet = new Set(specialTypes);
  const opening = level.colored_blocks.opening_visible_min_count;
  const group = level.board.geometry_group;

  if (group === '完整矩形') tags.push('规整盘面');
  if (group === '单区异形') tags.push('异形通路');
  if (group === '多分区') tags.push('分区分流');
  if (opening <= lowerBand) tags.push('低开局色块量');
  else if (opening <= upperBand) tags.push('中开局色块量');
  else tags.push('高开局色块量');
  if (specialTypeSet.size >= 3) tags.push('多机制叠加');
  if (specialTypeSet.has('countdown_cover')) tags.push('隐藏后续负载');
  if (specialTypeSet.has('side_generator')) tags.push('队列延后负载');
  if (specialTypeSet.has('numbered_ice_block')) tags.push('锁定色块负载');
  if (specialTypeSet.has('pattern_block') && opening > upperBand) tags.push('规则化高密度色块');
  return tags;
}

function pairingPattern(level) {
  const types = new Set(level.mechanisms.map((mechanism) => mechanism.type));
  const specialCount = new Set(
    level.mechanisms.filter((mechanism) => mechanism.is_special).map((mechanism) => mechanism.type),
  ).size;
  const group = level.board.geometry_group;
  const hasStageMechanism = ['countdown_cover', 'side_generator', 'numbered_ice_block', 'nested_shell_block']
    .some((type) => types.has(type));

  if (types.has('side_generator')) {
    return group === '完整矩形'
      ? '规整盘面承载生成队列，开局色块量与后续负载分离'
      : '异形/分区盘面叠加生成队列，空间路径与后续负载同时存在';
  }
  if (types.has('countdown_cover')) {
    return group === '完整矩形'
      ? '规整盘面承载遮挡阶段，开局可见色块量仅为下限'
      : '异形/分区盘面叠加遮挡阶段，开局可见色块量仅为下限';
  }
  if (group === '多分区') {
    return specialCount >= 2 ? '分区轮廓与多机制共同组织局部处理顺序' : '分区轮廓承担主要分流约束';
  }
  if (group === '单区异形') {
    return specialCount >= 2 || hasStageMechanism
      ? '异形通路与机制共同限制可操作顺序'
      : '异形轮廓承担主要空间约束';
  }
  if (specialCount >= 3) return '规整盘面作为多机制叠加的空间载体';
  if (specialCount > 0) return '规整盘面降低几何干扰，主要变化来自色块与机制组合';
  return '规整盘面，主要变化来自色块数量、形状与出口布局';
}

function mechanismLabel(mechanism) {
  const values = mechanism.visible_values?.length
    ? `（${mechanism.visible_values.join('/')}）`
    : '';
  return `${mechanism.name}×${mechanism.visible_count}${values}`;
}

function csvCell(value) {
  const stringValue = value == null ? '' : String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

const shapeCatalog = readJson(shapeCatalogPath);
const reviewFiles = fs.readdirSync(reviewDirectory)
  .filter((name) => /^review-lv\d{3}-\d{3}\.json$/u.test(name))
  .toSorted();
const rawReviews = reviewFiles.flatMap((fileName) => readJson(path.join(reviewDirectory, fileName)));
const reviewByLevel = new Map(rawReviews.map((item) => [Number(item.level_id), item]));

if (shapeCatalog.levels.length !== 100) {
  throw new Error(`Expected 100 board-shape records, found ${shapeCatalog.levels.length}.`);
}
if (reviewByLevel.size !== 100) {
  throw new Error(`Expected 100 unique relation-review records, found ${reviewByLevel.size}. Files: ${reviewFiles.join(', ')}`);
}

const baseLevels = shapeCatalog.levels.map((shapeLevel, index) => {
  const levelNumber = index + 1;
  const review = reviewByLevel.get(levelNumber);
  if (!review) throw new Error(`Missing relation review for Level ${levelNumber}.`);
  const mechanisms = review.mechanisms.map(normalizeMechanism);
  const generatorMechanisms = mechanisms.filter((item) => item.type === 'side_generator');
  const generatorValues = generatorMechanisms.flatMap((item) => item.visible_values ?? []);
  const generatorQueuePieceCount = generatorMechanisms.length
    ? (generatorValues.length === sum(generatorMechanisms.map((item) => item.visible_count))
      && generatorValues.every(Number.isFinite)
      ? sum(generatorValues)
      : 'unclear')
    : 0;
  const openingVisibleMin = review.draggable_blocks.visible_min_count;
  const lockedNumbered = review.locked_piece_count ?? 0;
  const knownLowerBound = openingVisibleMin + lockedNumbered
    + (Number.isFinite(generatorQueuePieceCount) ? generatorQueuePieceCount : 0);
  const hasCountdownCover = mechanisms.some((item) => item.type === 'countdown_cover');
  const specialTypes = new Set(
    mechanisms.filter((item) => item.is_special).map((item) => item.type),
  );
  const specialInstanceCount = sum(
    mechanisms.filter((item) => item.is_special).map((item) => item.visible_count),
  );
  const reviewColors = review.visible_colors_cn ?? review.visible_colors ?? [];
  const reviewUnclear = review.unclear_fields ?? [];
  const boardUnclear = shapeLevel.unclear_fields ?? [];

  return {
    source: shapeLevel.source,
    source_version: shapeLevel.source_version,
    level_id: shapeLevel.level_id,
    level_number: levelNumber,
    screenshot: shapeLevel.screenshot,
    board: {
      rows: shapeLevel.board.rows,
      cols: shapeLevel.board.cols,
      shape_type: shapeLevel.shape_type,
      shape_family: shapeLevel.shape_family,
      geometry_group: geometryGroup(shapeLevel.shape_family),
      geometry_role: geometryRole(shapeLevel.shape_family, shapeLevel.internal_hole_count),
      component_count: shapeLevel.component_count,
      playable_cell_count: shapeLevel.geometry_stats.playable_cell_count,
      footprint_ratio: shapeLevel.geometry_stats.footprint_ratio,
      internal_hole_count: shapeLevel.internal_hole_count,
      playable_mask: shapeLevel.playable_mask,
      description: shapeLevel.shape_description,
    },
    colored_blocks: {
      opening_draggable_count: review.draggable_blocks.total,
      opening_visible_min_count: openingVisibleMin,
      locked_numbered_piece_count: lockedNumbered,
      generator_queue_piece_count: generatorQueuePieceCount,
      hidden_behind_cover_piece_count: hasCountdownCover ? 'unclear' : 0,
      known_piece_load_lower_bound: knownLowerBound,
      visible_color_count: review.visible_color_count,
      visible_colors: reviewColors,
      counting_note: '普通色块按独立可拖动块计；数字冰块、生成队列、遮挡仓后内容分别记录。机制计数值不直接相加为色块数。',
    },
    mechanisms,
    mechanism_summary: mechanisms.map(mechanismLabel),
    relationship: {
      special_mechanism_family_count: specialTypes.size,
      special_mechanism_visible_instance_count: specialInstanceCount,
      staged_load_sources: stagedLoadSources(mechanisms),
      opening_block_load_band: null,
      tags: [],
      observed_pairing: null,
      derivation_note: '由可见棋盘造型、色块计数和机制共现关系归纳；不等同于因果证明或难度评分。',
    },
    confidence: {
      board_shape: shapeLevel.confidence,
      block_and_mechanism_review: review.confidence,
    },
    unclear_fields: [
      ...boardUnclear.map((field) => `board.${field}`),
      ...reviewUnclear.map((field) => `review.${field}`),
      ...(review.draggable_blocks.total === 'unclear' ? ['colored_blocks.opening_draggable_count'] : []),
      ...(hasCountdownCover ? ['colored_blocks.hidden_behind_cover_piece_count'] : []),
    ].filter((value, itemIndex, items) => items.indexOf(value) === itemIndex),
    notes: review.notes_cn ?? [],
    evidence: {
      board_shape: (shapeLevel.evidence ?? []).map((item) => ({
        ...item,
        file: relativeToProject(item.file),
      })),
      block_and_mechanisms: Object.fromEntries(
        Object.entries(review.evidence ?? {}).map(([key, value]) => [key, relativeToProject(value)]),
      ),
    },
  };
});

const visibleOpeningValues = baseLevels.map((level) => level.colored_blocks.opening_visible_min_count);
const lowerBand = nearestRank(visibleOpeningValues, 1 / 3);
const upperBand = nearestRank(visibleOpeningValues, 2 / 3);

for (const level of baseLevels) {
  const opening = level.colored_blocks.opening_visible_min_count;
  level.relationship.opening_block_load_band = opening <= lowerBand
    ? 'low'
    : opening <= upperBand
      ? 'medium'
      : 'high';
  level.relationship.tags = relationshipTags(level, lowerBand, upperBand);
  level.relationship.observed_pairing = pairingPattern(level);
}

function summarizeLevels(levels) {
  const generatorLevels = levels.filter((level) => level.mechanisms.some((item) => item.type === 'side_generator'));
  return {
    level_count: levels.length,
    avg_opening_visible_min_count: average(levels.map((level) => level.colored_blocks.opening_visible_min_count)),
    avg_locked_numbered_piece_count: average(levels.map((level) => level.colored_blocks.locked_numbered_piece_count)),
    avg_generator_queue_piece_count_across_all_levels: average(levels.map((level) => {
      const value = level.colored_blocks.generator_queue_piece_count;
      return Number.isFinite(value) ? value : null;
    })),
    avg_generator_queue_piece_count_on_known_generator_levels: average(generatorLevels.map((level) => {
      const value = level.colored_blocks.generator_queue_piece_count;
      return Number.isFinite(value) ? value : null;
    })),
    avg_known_piece_load_lower_bound: average(levels.map((level) => level.colored_blocks.known_piece_load_lower_bound)),
    avg_special_mechanism_family_count: average(levels.map((level) => level.relationship.special_mechanism_family_count)),
    unclear_opening_count_levels: levels.filter((level) => level.colored_blocks.opening_draggable_count === 'unclear').length,
    countdown_cover_levels: levels.filter((level) => level.mechanisms.some((item) => item.type === 'countdown_cover')).length,
    generator_levels: generatorLevels.length,
    unknown_generator_queue_levels: generatorLevels
      .filter((level) => level.colored_blocks.generator_queue_piece_count === 'unclear').length,
  };
}

const boardFamilySummary = Object.fromEntries(
  [...new Set(baseLevels.map((level) => level.board.shape_family))].map((family) => [
    family,
    summarizeLevels(baseLevels.filter((level) => level.board.shape_family === family)),
  ]),
);
const geometryGroupSummary = Object.fromEntries(
  ['完整矩形', '单区异形', '多分区'].map((group) => [
    group,
    summarizeLevels(baseLevels.filter((level) => level.board.geometry_group === group)),
  ]),
);
const decileSummary = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => {
    const start = index * 10 + 1;
    const end = start + 9;
    return [`Lv${start}–${end}`, summarizeLevels(baseLevels.slice(start - 1, end))];
  }),
);

const mechanismTypes = [...new Set(baseLevels.flatMap((level) => level.mechanisms.map((item) => item.type)))];
const mechanismSummary = Object.fromEntries(mechanismTypes.map((type) => {
  const occurrences = baseLevels.flatMap((level) => level.mechanisms
    .filter((item) => item.type === type)
    .map((item) => ({ level, item })));
  return [type, {
    name: occurrences[0].item.name,
    first_level: Math.min(...occurrences.map(({ level }) => level.level_number)),
    level_count: new Set(occurrences.map(({ level }) => level.level_number)).size,
    visible_instance_count: sum(occurrences.map(({ item }) => item.visible_count)),
  }];
}));

const firstSpecialMechanisms = Object.entries(mechanismSummary)
  .filter(([type]) => type !== 'directional_exit')
  .map(([type, summary]) => {
    const level = baseLevels[summary.first_level - 1];
    return {
      type,
      name: summary.name,
      first_level: summary.first_level,
      board_shape_family: level.board.shape_family,
      opening_visible_min_count: level.colored_blocks.opening_visible_min_count,
      special_mechanism_family_count: level.relationship.special_mechanism_family_count,
    };
  })
  .toSorted((a, b) => a.first_level - b.first_level || a.name.localeCompare(b.name, 'zh-CN'));
const firstSpecialOnCompleteRectangle = firstSpecialMechanisms
  .filter((item) => item.board_shape_family === '完整矩形').length;
const multiSectionLevels = baseLevels.filter((level) => level.board.geometry_group === '多分区');
const lateMultiSectionLevels = multiSectionLevels.filter((level) => level.level_number >= 68);
const generatorCases = baseLevels
  .filter((level) => level.mechanisms.some((item) => item.type === 'side_generator'))
  .map((level) => ({
    level_id: level.level_id,
    board_shape_family: level.board.shape_family,
    opening_visible_min_count: level.colored_blocks.opening_visible_min_count,
    generator_queue_piece_count: level.colored_blocks.generator_queue_piece_count,
    known_piece_load_lower_bound: level.colored_blocks.known_piece_load_lower_bound,
  }))
  .toSorted((a, b) => {
    const queueA = Number.isFinite(a.generator_queue_piece_count) ? a.generator_queue_piece_count : -1;
    const queueB = Number.isFinite(b.generator_queue_piece_count) ? b.generator_queue_piece_count : -1;
    return queueB - queueA;
  });
const highVisibleCases = baseLevels
  .toSorted((a, b) => b.colored_blocks.opening_visible_min_count - a.colored_blocks.opening_visible_min_count)
  .slice(0, 10)
  .map((level) => ({
    level_id: level.level_id,
    board_shape_family: level.board.shape_family,
    opening_visible_min_count: level.colored_blocks.opening_visible_min_count,
    mechanisms: level.mechanism_summary,
  }));

const summary = {
  total_levels: baseLevels.length,
  exact_opening_draggable_count_levels: baseLevels.filter((level) => Number.isFinite(level.colored_blocks.opening_draggable_count)).length,
  unclear_opening_draggable_count_levels: baseLevels.filter((level) => level.colored_blocks.opening_draggable_count === 'unclear').length,
  levels_with_any_unclear_field: baseLevels.filter((level) => level.unclear_fields.length > 0).length,
  visible_opening_block_load_bands: {
    method: '按 100 关开局可见色块下限的三分位划分，仅用于比较本数据集。',
    low: `≤${lowerBand}`,
    medium: `${lowerBand + 1}–${upperBand}`,
    high: `≥${upperBand + 1}`,
  },
  board_shape_families: boardFamilySummary,
  geometry_groups: geometryGroupSummary,
  level_deciles: decileSummary,
  mechanisms: mechanismSummary,
};

const relationshipFindings = {
  new_special_mechanism_introductions: {
    total_special_mechanism_types: firstSpecialMechanisms.length,
    first_introduced_on_complete_rectangle: firstSpecialOnCompleteRectangle,
    share_on_complete_rectangle: firstSpecialMechanisms.length
      ? round(firstSpecialOnCompleteRectangle / firstSpecialMechanisms.length)
      : null,
    details: firstSpecialMechanisms,
    interpretation: '用于观察新机制首现时的棋盘复杂度；属于共现关系，不证明设计因果。',
  },
  geometry_group_comparison: geometryGroupSummary,
  linear_associations: {
    playable_cells_vs_opening_visible_min: {
      ...pearsonCorrelation(baseLevels.map((level) => [
        level.board.playable_cell_count,
        level.colored_blocks.opening_visible_min_count,
      ])),
      scope: '棋盘格数可确认的关卡；开局色块采用可见下限。',
    },
    playable_cells_vs_exact_opening_blocks: {
      ...pearsonCorrelation(baseLevels.map((level) => [
        level.board.playable_cell_count,
        level.colored_blocks.opening_draggable_count,
      ])),
      scope: '棋盘格数和开局普通色块数均可精确确认的关卡。',
    },
    opening_visible_min_vs_special_mechanism_families: {
      ...pearsonCorrelation(baseLevels.map((level) => [
        level.colored_blocks.opening_visible_min_count,
        level.relationship.special_mechanism_family_count,
      ])),
      scope: '100关；用于检验是否存在“色块越多，机制越多”的简单线性关系。',
    },
    interpretation: '三个相关系数均接近 0，说明棋盘格数、色块数量和机制数量没有同步线性抬升；竞品采用轮换与补偿式组合。',
  },
  multi_section_late_concentration: {
    total_multi_section_levels: multiSectionLevels.length,
    levels_at_or_after_68: lateMultiSectionLevels.length,
    share_at_or_after_68: multiSectionLevels.length
      ? round(lateMultiSectionLevels.length / multiSectionLevels.length)
      : null,
    level_ids: multiSectionLevels.map((level) => level.level_number),
    interpretation: '多分区在后段明显集中，且与遮挡、数字门或钥匙锁等阶段机制共同出现。',
  },
  generator_load_cases: generatorCases,
  highest_opening_visible_block_cases: highVisibleCases,
  progression_phases: [
    { levels: 'Lv1–5', focus: '完整矩形与基础出口为主，先建立色块移动和形状识别。' },
    { levels: 'Lv6–14', focus: '加入数字边栏与数字冰块；多数仍用完整矩形隔离新规则。' },
    { levels: 'Lv15–34', focus: '嵌套色块与遮挡仓出现，异形通路开始承担阶段约束。' },
    { levels: 'Lv35–49', focus: '生成器把总色块负载延后，开局可见色块数不再代表全程负载。' },
    { levels: 'Lv50–67', focus: '箭头、图案、冰框与既有数字机制混合，机制种类密度上升。' },
    { levels: 'Lv68–79', focus: '多分区明显增多，遮挡、数字门和少量生成队列组织局部顺序。' },
    { levels: 'Lv80–100', focus: '钥匙锁加入后与异形/分区、遮挡、数字机制复合；高色块关与低开局阶段关交替。' },
  ],
  interpretation_notes: [
    '棋盘格数只表示空间容量；当色块数量与机制保持不变时，更大棋盘通常提供更多腾挪空间，但竞品常用新增色块或机制消耗这部分容量。',
    '开局可见色块少不等于总负载低：生成队列、数字冰块和遮挡仓会把内容延后到流程中。',
    '数字边栏与遮挡仓上的数字是计数条件，不按色块数量相加。',
    '完整矩形、单区异形和多分区的统计是描述性比较，不直接等同于难度评分。',
  ],
};

const output = {
  dataset: 'Block Out! Lv1–100 棋盘造型 × 色块数量 × 机制关联数据',
  version: '2026-09-08',
  source_material: {
    board_shape_catalog: relativeToProject(shapeCatalogPath),
    block_and_mechanism_reviews: reviewFiles.map((name) => relativeToProject(path.join(reviewDirectory, name))),
  },
  counting_rules: {
    ordinary_blocks: '按开局独立可拖动色块计数，不按颜色种类或占格数计。',
    locked_numbered_blocks: '数字方块/数字冰块不并入开局可拖动色块，单列锁定色块数量。',
    generators: '生成器可见队列值经过程视频确认后，单列为后续生成色块数。',
    countdown_covers: '遮挡仓面板计数不是其后色块数；仓后数量不可见时记 unclear。',
    mechanism_values: '保留截图上可见计数值，但除生成队列外不用于计算色块总量。',
  },
  summary,
  relationship_findings: relationshipFindings,
  levels: baseLevels,
};

fs.mkdirSync(outputDirectory, { recursive: true });
const jsonPath = path.join(outputDirectory, 'blockout-lv001-lv100-shape-block-mechanism-relations.json');
const levelArrayPath = path.join(outputDirectory, 'blockout-lv001-lv100-level-records.json');
const csvPath = path.join(outputDirectory, 'blockout-lv001-lv100-shape-block-mechanism-relations.csv');
const markdownPath = path.join(outputDirectory, 'blockout-lv001-lv100-shape-block-mechanism-relations.md');

fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(levelArrayPath, `${JSON.stringify(baseLevels, null, 2)}\n`, 'utf8');

const csvHeader = [
  'level_id',
  'board_shape_family',
  'board_shape_type',
  'board_rows',
  'board_cols',
  'playable_cell_count',
  'component_count',
  'opening_draggable_count',
  'opening_visible_min_count',
  'locked_numbered_piece_count',
  'generator_queue_piece_count',
  'known_piece_load_lower_bound',
  'visible_color_count',
  'visible_colors',
  'mechanisms',
  'special_mechanism_family_count',
  'opening_block_load_band',
  'observed_pairing',
  'unclear_fields',
];
const csvRows = baseLevels.map((level) => [
  level.level_id,
  level.board.shape_family,
  level.board.shape_type,
  level.board.rows,
  level.board.cols,
  level.board.playable_cell_count,
  level.board.component_count,
  level.colored_blocks.opening_draggable_count,
  level.colored_blocks.opening_visible_min_count,
  level.colored_blocks.locked_numbered_piece_count,
  level.colored_blocks.generator_queue_piece_count,
  level.colored_blocks.known_piece_load_lower_bound,
  level.colored_blocks.visible_color_count,
  level.colored_blocks.visible_colors.join('/'),
  level.mechanism_summary.join('；'),
  level.relationship.special_mechanism_family_count,
  level.relationship.opening_block_load_band,
  level.relationship.observed_pairing,
  level.unclear_fields.join('；'),
].map(csvCell).join(','));
fs.writeFileSync(csvPath, `${csvHeader.join(',')}\n${csvRows.join('\n')}\n`, 'utf8');

const completeGeometry = geometryGroupSummary['完整矩形'];
const irregularGeometry = geometryGroupSummary['单区异形'];
const splitGeometry = geometryGroupSummary['多分区'];
const markdown = [
  '# Block Out! Lv1–100 棋盘造型、色块数量与机制关联',
  '',
  '![Lv1–100 关系图](blockout-lv001-lv100-shape-block-mechanism-relation-map.png)',
  '',
  '## 计数口径',
  '',
  '- 开局色块按独立可拖动块计，不按颜色种类或占格数计。',
  '- 数字冰块、生成队列和遮挡仓后内容分别记录；遮挡仓后的不可见数量保留为 `unclear`。',
  '- 数字边栏、数字冰块与遮挡仓上的数值是机制计数条件，不直接相加为普通色块数。',
  '- 下文“已知负载下限”=开局可见色块下限+数字锁定色块+已确认生成队列；不包含不可见遮挡仓内容。',
  '',
  '## 总体关联',
  '',
  `- 100 关中，开局普通可拖动色块可精确计数 ${summary.exact_opening_draggable_count_levels} 关，因遮挡只能给下限 ${summary.unclear_opening_draggable_count_levels} 关。`,
  `- 新增特殊机制共 ${firstSpecialMechanisms.length} 类，其中 ${firstSpecialOnCompleteRectangle} 类首次出现在完整矩形棋盘（${round(firstSpecialOnCompleteRectangle / firstSpecialMechanisms.length * 100)}%）。这说明新规则通常先与较规整的空间结构共现，再进入异形或分区组合。`,
  `- 完整矩形 ${completeGeometry.level_count} 关：平均开局可见色块下限 ${completeGeometry.avg_opening_visible_min_count}，平均特殊机制种类 ${completeGeometry.avg_special_mechanism_family_count}。`,
  `- 单区异形 ${irregularGeometry.level_count} 关：平均开局可见色块下限 ${irregularGeometry.avg_opening_visible_min_count}，平均特殊机制种类 ${irregularGeometry.avg_special_mechanism_family_count}。`,
  `- 多分区 ${splitGeometry.level_count} 关：平均开局可见色块下限 ${splitGeometry.avg_opening_visible_min_count}，平均特殊机制种类 ${splitGeometry.avg_special_mechanism_family_count}。多分区关更常把局部通路与机制阶段叠加。`,
  `- 多分区关有 ${lateMultiSectionLevels.length}/${multiSectionLevels.length} 集中在 Lv68 以后，说明后段更常把棋盘分流与阶段机制复合。`,
  `- 在棋盘格数和普通色块数都能精确确认的 ${relationshipFindings.linear_associations.playable_cells_vs_exact_opening_blocks.sample_size} 关中，两者 Pearson 相关系数为 ${relationshipFindings.linear_associations.playable_cells_vs_exact_opening_blocks.coefficient}，接近 0；不存在“棋盘越大就固定配越多/越少色块”的简单线性公式。`,
  '- 棋盘更大本身只增加空间容量；竞品会同步增加色块、锁定块或后续队列，因此“格子越多越简单”只在其他变量不变时成立。',
  '- 低开局色块量不能直接视为低负载。生成器与遮挡仓会把色块延后投放，数字冰块则把色块先锁定。',
  '',
  '## 新机制首次出现时的搭配',
  '',
  '| 机制 | 首现关 | 棋盘造型 | 开局可见色块下限 | 当关特殊机制种类 |',
  '|---|---:|---|---:|---:|',
  ...firstSpecialMechanisms.map((item) => `| ${item.name} | ${item.first_level} | ${item.board_shape_family} | ${item.opening_visible_min_count} | ${item.special_mechanism_family_count} |`),
  '',
  '## 编排阶段',
  '',
  '| 区间 | 观察到的组合重点 |',
  '|---|---|',
  ...relationshipFindings.progression_phases.map((phase) => `| ${phase.levels} | ${phase.focus} |`),
  '',
  '## 每关对齐表',
  '',
  '| 关卡 | 棋盘造型 | 可用格 | 开局色块 | 数字锁定 | 生成队列 | 可见颜色 | 具体机制 | 观察到的搭配关系 |',
  '|---:|---|---:|---:|---:|---:|---:|---|---|',
  ...baseLevels.map((level) => {
    const opening = level.colored_blocks.opening_draggable_count === 'unclear'
      ? `unclear（≥${level.colored_blocks.opening_visible_min_count}）`
      : level.colored_blocks.opening_draggable_count;
    return `| ${level.level_number} | ${level.board.shape_family}/${level.board.shape_type} | ${level.board.playable_cell_count} | ${opening} | ${level.colored_blocks.locked_numbered_piece_count} | ${level.colored_blocks.generator_queue_piece_count} | ${level.colored_blocks.visible_color_count} | ${level.mechanism_summary.join('；')} | ${level.relationship.observed_pairing} |`;
  }),
  '',
  '## 十关一段的变化',
  '',
  '| 区间 | 开局可见色块下限均值 | 已知负载下限均值 | 特殊机制种类均值 | 遮挡关 | 生成器关 |',
  '|---|---:|---:|---:|---:|---:|',
  ...Object.entries(decileSummary).map(([range, item]) => `| ${range} | ${item.avg_opening_visible_min_count} | ${item.avg_known_piece_load_lower_bound} | ${item.avg_special_mechanism_family_count} | ${item.countdown_cover_levels} | ${item.generator_levels} |`),
  '',
  '> 以上关系均为素材中的可见共现与过程视频复核结果；不把共现直接表述为因果，也不将不可见内容补全。',
  '',
].join('\n');
fs.writeFileSync(markdownPath, markdown, 'utf8');

const validationIssues = [];
for (let index = 0; index < baseLevels.length; index += 1) {
  const level = baseLevels[index];
  if (level.level_number !== index + 1) validationIssues.push(`Unexpected level order at index ${index}.`);
  for (const mechanism of level.mechanisms) {
    if (mechanism.visible_values && mechanism.visible_values.length !== mechanism.visible_count) {
      validationIssues.push(`${level.level_id} ${mechanism.name}: values/count mismatch.`);
    }
  }
  if (level.colored_blocks.opening_draggable_count === 'unclear'
      && !level.unclear_fields.includes('colored_blocks.opening_draggable_count')) {
    validationIssues.push(`${level.level_id}: unclear opening count not surfaced.`);
  }
}
if (validationIssues.length) {
  throw new Error(`Validation failed:\n${validationIssues.join('\n')}`);
}

console.log(JSON.stringify({
  outputs: [jsonPath, levelArrayPath, csvPath, markdownPath],
  reviewFiles,
  summary: {
    levels: summary.total_levels,
    exactOpeningCounts: summary.exact_opening_draggable_count_levels,
    unclearOpeningCounts: summary.unclear_opening_draggable_count_levels,
    levelsWithAnyUnclearField: summary.levels_with_any_unclear_field,
    loadBands: summary.visible_opening_block_load_bands,
  },
  validationIssues,
}, null, 2));
