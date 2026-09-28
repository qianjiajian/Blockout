import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRulesLock } from './verify-rules-lock.mjs';

export const PREVIEW_SOURCE_VERSION = '1.6.0';
export const PREVIEW_TRUTH_FILES = Object.freeze({
  early: 'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json',
  late: 'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json',
});
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const array = value => Array.isArray(value) ? value : null;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => value === undefined ? null : structuredClone(value);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const isStar = item => item?.star === true || item?.star_required === true || item?.class === 'star';
const numericArray = value => array(value)?.map(number) ?? null;
const sumKnown = values => values.every(v => number(v) !== null) ? values.reduce((a, b) => a + b, 0) : null;
const frozenValue = item => number(item?.frozen_value ?? item?.value ?? item?.frozen?.value);
const itemsOf = node => array(node) ?? array(node?.items);
const uncertainCount = node => /at least|may be higher|exact full count unclear/i.test(String(node?.notes ?? ''));

// This reads source declarations only. Missing family != explicitly empty family.
function countOf(node, { multiplicity = false } = {}) {
  if (node == null) return null;
  if (object(node)) return uncertainCount(node) ? null : number(node.count);
  if (!Array.isArray(node)) return null;
  return sumKnown(node.map(item => {
    if (!object(item)) return null;
    if (multiplicity && Object.hasOwn(item, 'block_count')) return number(item.block_count);
    return 1;
  }));
}
function valuesOf(node, count, key = 'value') {
  if (count === 0) return [];
  if (Array.isArray(node?.values)) return numericArray(node.values);
  const items = itemsOf(node);
  return items ? items.map(item => number(item?.[key])) : null;
}
const absentArray = (count, values) => count === 0 ? [] : values;
const hasPositive = value => typeof value === 'number' && value > 0;
function presenceOf(node, count) {
  if (count === 0) return false;
  if (hasPositive(count)) return true;
  if (Array.isArray(node)) return node.length ? true : false;
  if (object(node)) return true; // It records this family, but not an exact full count.
  return null;
}

function exitFacts(m, early) {
  const d = m.directional_exits ?? {};
  if (early) {
    return {
      ordinaryCount: number(d.ordinary_count),
      frozenCount: array(d.frozen_values)?.length ?? null,
      frozenValues: numericArray(d.frozen_values),
      starCount: number(d.star_count), // star_frozen_count is a SUBSET, not additive.
      starFrozenCount: number(d.star_frozen_count),
      starFrozenValues: numericArray(d.star_frozen_values),
      flipCount: countOf(m.flip_doors),
    };
  }
  const ordinary = array(d.ordinary), frozen = array(d.frozen), stars = array(d.star);
  const starFrozen = stars?.filter(g => (frozenValue(g) ?? 0) > 0) ?? null;
  const starFreezeKnown = stars?.every(g => frozenValue(g) !== null
    || (Object.hasOwn(g, 'frozen') && g.frozen === null)
    || (Object.hasOwn(g, 'frozen_value') && g.frozen_value === null)) ?? false;
  // The separate star list is authoritative only when explicitly supplied.
  // Flagged ordinary/frozen items with a missing star list are retained in records
  // and lowerBounds; they do not turn an incomplete inventory into an exact total.
  return {
    ordinaryCount: ordinary?.filter(g => !isStar(g)).length ?? null,
    frozenCount: frozen?.filter(g => !isStar(g)).length ?? null,
    frozenValues: frozen?.filter(g => !isStar(g)).map(frozenValue) ?? null,
    starCount: stars?.length ?? null,
    starFrozenCount: starFreezeKnown ? starFrozen.length : null,
    starFrozenValues: starFreezeKnown ? starFrozen.map(frozenValue) : null,
    flipCount: countOf(m.flip_doors),
  };
}

function generatorFacts(node) {
  const count = countOf(node);
  return { count, queueLengths: absentArray(count, Array.isArray(node)
    ? node.map(g => number(g.queue_length ?? g.queue_count ?? g.counter))
    : numericArray(node?.queue_lengths)) };
}
function coverFacts(node) {
  const count = countOf(node);
  const combinedOnly = /combined|unobservable/.test(node?.per_cover_partition_status ?? '')
    && count !== null && array(node?.hidden_batch_counts)?.length !== count;
  return {
    count,
    values: absentArray(count, Array.isArray(node) ? node.map(g => number(g.count)) : numericArray(node?.values)),
    hiddenBatchCounts: combinedOnly ? (count <= 10000 ? Array(count).fill(null) : null) : absentArray(count, Array.isArray(node)
      ? node.map(g => number(g.hidden_batch_piece_count ?? g.hidden_piece_count))
      : numericArray(node?.hidden_batch_counts)),
  };
}
function axisFacts(node) {
  const count = countOf(node);
  let axes = itemsOf(node)?.map(i => ['horizontal', 'vertical'].includes(i.axis) ? i.axis : null) ?? null;
  if (!axes && object(node?.by_axis_shape)) {
    axes = [];
    for (const [axis, histogram] of Object.entries(node.by_axis_shape)) {
      const n = object(histogram) ? sumKnown(Object.values(histogram).map(number)) : null;
      if (n === null || n > 10000 || !['horizontal', 'vertical'].includes(axis)) { axes = null; break; }
      axes.push(...Array(n).fill(axis));
    }
  }
  return { count, axes: absentArray(count, axes) };
}
function keyFacts(node) {
  if (Array.isArray(node)) {
    // Each late-record item denotes a lock carrier; its lock_count is its badge.
    const lockCarriers = node.map(i => {
      const shape = i.lock_shape ?? i.locked_shape;
      const shapeIdentifiesCarrier = typeof shape === 'string' && !/^(?:hidden\/)?unclear$/i.test(shape);
      return shapeIdentifiesCarrier || i.paired_key_block || number(i.lock_count) !== null ? 1 : null;
    });
    const exactKeys = node.map(i => number(i.key_count) ?? (array(i.key_blocks) ? i.key_blocks.length : i.paired_key_block ? 1 : null));
    return { keyCount: sumKnown(exactKeys), lockCount: sumKnown(lockCarriers), lockValues: node.map(i => number(i.lock_count)) };
  }
  const lockCount = number(node?.lock_count);
  return {
    keyCount: number(node?.key_count), lockCount,
    lockValues: absentArray(lockCount, numericArray(node?.lock_requirements) ?? array(node?.locks)?.map(i => number(i.lock_count)) ?? null),
  };
}
function elevatorFacts(node) {
  const count = countOf(node);
  const instances = Array.isArray(node) ? node : count === 1 ? [node] : null;
  const hidden = instances?.map(e => {
    if (Array.isArray(e.hidden_batch_counts)) return numericArray(e.hidden_batch_counts);
    // Layer 1 belongs to the opening, not an additional hidden batch.
    if (Array.isArray(e.layers)) return e.layers.filter(l => number(l.layer) !== null && l.layer > 1).map(l => number(l.count));
    return null;
  }) ?? null;
  return { count, hiddenBatchCounts: absentArray(count, hidden) };
}
function gridFacts(node) {
  if (!Array.isArray(node)) return { regionCount: null, cellCount: null };
  const cells = node.map(g => array(g.cells) ? g.cells.length : number(g.count));
  return { regionCount: node.length, cellCount: sumKnown(cells) };
}

/** Flatten facts only; metadata and raw source backups are not compared. */
export function flattenPreviewFacts(facts, prefix = '') {
  const out = {};
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      out[`${path}.length`] = value.length;
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (object(value)) {
      for (const [key, v] of Object.entries(value)) walk(v, path ? `${path}.${key}` : key);
    } else out[path] = value === undefined ? null : value;
  };
  walk(facts, prefix);
  return out;
}

/** Pure source conversion. Never imports LEVELS, model snapshots, or design fills. */
export function normalizePreviewSourceLevel(raw, { family, sourceFile = null, sourceSha256 = null } = {}) {
  if (!raw || !Number.isInteger(raw.level) || raw.level < 31 || raw.level > 200) throw new Error('Source normalizer supports Lv31–200 only');
  const early = family ? family === 'early' : raw.level <= 100;
  if (family && !['early', 'late'].includes(family)) throw new Error(`Unknown source family ${family}`);
  const m = raw.mechanisms ?? {}, composition = raw.composition ?? {}, board = raw.board ?? {};
  const ice = m.numeric_ice, shells = m.shells, stars = m.star_blocks ?? m.stars;
  const keys = m.keys_locks ?? m.key_locks, lifts = m.elevators ?? m.lifts;
  const iceCount = countOf(ice), shellCount = countOf(shells), starCount = countOf(stars, { multiplicity: true });
  const bombs = m.bombs, bombCount = countOf(bombs);
  const facts = {
    width: number(board.cols), height: number(board.rows),
    opening: number(composition.opening_piece_count), full: number(composition.source_full_piece_count),
    mechanisms: {
      exits: exitFacts(m, early),
      generators: generatorFacts(m.generators), covers: coverFacts(m.covers),
      numericIce: { count: iceCount, values: valuesOf(ice, iceCount), postMeltShellCount: iceCount === 0 || shellCount === 0 ? 0 : number(ice?.post_melt_shell) },
      shells: { count: shellCount }, axisBlocks: axisFacts(m.axis_blocks), keysLocks: keyFacts(keys),
      starBlocks: { count: starCount },
      flipDoors: { count: countOf(m.flip_doors), initialStates: Array.isArray(m.flip_doors) ? m.flip_doors.map(g => ['open', 'closed'].includes(g.initial_state) ? g.initial_state : null) : null },
      coloredGrid: gridFacts(m.colored_grid), bombs: { count: bombCount, values: valuesOf(bombs, bombCount) },
      elevators: elevatorFacts(lifts),
    },
  };
  const recordedValues = clone(facts), conflicts = [], qualityNotes = [];
  const combinedCovers = /combined|unobservable/.test(m.covers?.per_cover_partition_status ?? '')
    && array(m.covers?.hidden_batch_counts)?.length !== facts.mechanisms.covers.count;
  const sourceAggregates = { coverHiddenCount: number(m.covers?.source_hidden_aggregate_count)
    ?? (combinedCovers && numericArray(m.covers.hidden_batch_counts) ? sumKnown(numericArray(m.covers.hidden_batch_counts)) : null) };
  if (combinedCovers) qualityNotes.push({ code: 'combined-cover-partition-only', sourcePath: 'mechanisms.covers.hidden_batch_counts', aggregateCount: sourceAggregates.coverHiddenCount, message: 'A simultaneous union total is not an individual cover batch.' });
  // Explicit known source contradictions are not repaired by filling with runtime.
  if (raw.level === 48 && raw.raw_evidence?.resolved?.remainingUnclear?.some(s => /rows remains null/.test(s))) {
    facts.height = null;
    conflicts.push({ code: 'source-dimension-contradiction', fields: ['height'], evidence: 'raw_evidence.resolved.remainingUnclear', recorded: board.rows, message: 'Normalized rows conflicts with an explicit unresolved global row index.' });
  }
  if (/exact count\/histogram unclear/i.test(String(composition.source_notes ?? ''))) {
    facts.opening = null; facts.full = null;
    conflicts.push({ code: 'source-count-not-exact', fields: ['opening', 'full'], evidence: 'composition.source_notes', message: 'Source prose explicitly leaves exact piece count unresolved.' });
  }
  const exits = facts.mechanisms.exits;
  const knownNonstar = [exits.ordinaryCount, exits.frozenCount, exits.flipCount].filter(v => v !== null).reduce((a, b) => a + b, 0);
  if (knownNonstar > 8) conflicts.push({ code: 'recorded-nonstar-exit-capacity', fields: ['mechanisms.exits'], knownNonstar, capacity: 8, evidence: 'mechanisms.directional_exits + mechanisms.flip_doors', message: 'Recorded nonstar physical exits exceed the 8-color capacity; individual source entries still require identity/state review.' });
  if (hasPositive(shellCount) && hasPositive(facts.mechanisms.coloredGrid.cellCount)) conflicts.push({ code: 'source-grid-shell-combination', fields: ['mechanisms.shells', 'mechanisms.coloredGrid'], message: 'Recorded shells and colored grid conflict with the revised runtime combination rule.' });
  const legacy = m.staged_frames;
  if ((Array.isArray(legacy) && legacy.length) || (object(legacy) && (legacy.count == null || legacy.count > 0))) qualityNotes.push({ code: 'unmapped-legacy-staged-frame', sourcePath: 'mechanisms.staged_frames', message: 'Not silently reclassified as elevator or bomb.' });
  if ((raw.provenance?.design_fill_fields ?? []).length) qualityNotes.push({ code: 'source-includes-labelled-design-stage-fills', fields: clone(raw.provenance.design_fill_fields), message: 'These stage seeds are not used as observed hidden batches.' });
  if (raw.provenance?.classification === 'source_missing_external_reference_only') qualityNotes.push({ code: 'local-video-source-missing', message: 'Unverified web-reference placeholders are not observations.' });
  const lowerBounds = {};
  if (uncertainCount(stars) && number(stars.count) !== null) lowerBounds['mechanisms.starBlocks.count'] = stars.count;
  if (Array.isArray(keys)) {
    const visible = keys.map(k => number(k.visible_key_piece_count)).filter(n => n !== null);
    if (visible.length) lowerBounds['mechanisms.keysLocks.keyCount'] = visible.reduce((a, b) => a + b, 0);
  }
  if (!early && !Array.isArray(m.directional_exits?.star)) {
    const flags = [...(array(m.directional_exits?.ordinary) ?? []), ...(array(m.directional_exits?.frozen) ?? [])].filter(isStar);
    if (flags.length) lowerBounds['mechanisms.exits.starCount'] = flags.length;
  }
  const nodes = { generators: m.generators, covers: m.covers, numericIce: ice, shells, axisBlocks: m.axis_blocks, keysLocks: keys, starBlocks: stars, flipDoors: m.flip_doors, coloredGrid: m.colored_grid, bombs, elevators: lifts };
  const presence = Object.fromEntries(Object.entries(nodes).map(([key, node]) => {
    const f = facts.mechanisms[key];
    const count = key === 'keysLocks' ? (f.keyCount === null || f.lockCount === null ? null : f.keyCount + f.lockCount) : key === 'coloredGrid' ? f.cellCount : f.count;
    return [key, presenceOf(node, count)];
  }));
  const unknownFields = Object.entries(flattenPreviewFacts(facts)).filter(([, value]) => value === null).map(([key]) => key);
  const reconfigurationReasons = [
    ...conflicts.map(c => ({ code: c.code, affectedFields: c.fields, evidence: c.evidence ?? null })),
    ...unknownFields.map(field => ({ code: 'source-field-unknown', affectedFields: [field], evidence: null })),
  ];
  return {
    schemaVersion: 1, ruleVersion: PREVIEW_SOURCE_VERSION, levelId: raw.level, facts, recordedValues, presence, lowerBounds, sourceAggregates,
    unknownFields, conflicts, qualityNotes, sourceIncomplete: unknownFields.length > 0,
    reconfigurationReasons,
    reconfigurationPolicy: { scope: 'preview-only', preserveKnownSatisfiableFields: true, allowsWholesaleMechanismRemoval: false, eachChangeNeedsReason: true, releaseApproved: false },
    records: { mechanisms: clone(m), stageSeeds: clone(raw.stage_seeds), board: clone(board), composition: clone(composition), provenance: clone(raw.provenance), reaudits: clone(raw.reaudit_evidence), rawEvidence: clone(raw.raw_evidence), sourceUnclearFields: clone(raw.source_unclear_fields), requiredExactFieldsMissing: clone(raw.required_exact_fields_missing) },
    bindings: sourceFile ? [{ path: sourceFile, sha256: sourceSha256 }] : [],
    sourceFirstIntroductionCertified: false,
  };
}

/** Load current locked sources read-only. Returns an array, not a runtime map. */
export function loadPreviewSourceCatalog({ rootDir = ROOT, minLevel = 31, maxLevel = 200 } = {}) {
  if (!Number.isInteger(minLevel) || !Number.isInteger(maxLevel) || minLevel < 31 || maxLevel > 200 || minLevel > maxLevel) throw new Error('Invalid source range');
  const lock = verifyRulesLock({ readText: p => readFileSync(resolve(rootDir, p), 'utf8') });
  if (!lock.ok || lock.activeVersion !== PREVIEW_SOURCE_VERSION) throw new Error(`Preview source tool requires active locked v1.6.0: ${lock.errors.join('; ')}`);
  const levels = [], sourceBindings = [];
  for (const [family, file] of Object.entries(PREVIEW_TRUTH_FILES)) {
    const bytes = readFileSync(resolve(rootDir, file)), sha256 = digest(bytes);
    sourceBindings.push({ path: file, sha256 });
    const truth = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    for (const row of truth.levels) if (row.level >= minLevel && row.level <= maxLevel) levels.push(normalizePreviewSourceLevel(row, { family, sourceFile: file, sourceSha256: sha256 }));
  }
  levels.sort((a, b) => a.levelId - b.levelId);
  if (levels.length !== maxLevel - minLevel + 1 || new Set(levels.map(r => r.levelId)).size !== levels.length) throw new Error('Missing or duplicated source level');
  const activeRule = lock.verified.find(v => v.version === PREVIEW_SOURCE_VERSION);
  return { schemaVersion: 1, ruleVersion: PREVIEW_SOURCE_VERSION, activeRule, sourceBindings, levels };
}

/**
 * proposed can be a facts object or {facts}. It is never inferred from runtime.
 * Arrays retain source instance order; compare preserves null slots individually.
 * This discloses differences, not an automatic source or gameplay approval gate.
 */
export function comparePreviewDesignToSource(source, proposed, { adjustmentReasons = {} } = {}) {
  if (!object(source?.facts) || !object(proposed?.facts ?? proposed)) throw new Error('Expected normalized source and proposed facts');
  const actual = proposed.facts ?? proposed;
  const rows = [];
  const walk = (a, b, path) => {
    if ((object(a) && object(b)) || (object(a) && b == null) || (a == null && object(b))) {
      for (const key of new Set([...Object.keys(object(a) ? a : {}), ...Object.keys(object(b) ? b : {})])) walk(a?.[key], b?.[key], path ? `${path}.${key}` : key);
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      walk(a.length, b.length, `${path}.length`);
      for (let i = 0; i < Math.max(a.length, b.length); i++) walk(a[i], b[i], `${path}[${i}]`);
      return;
    }
    const sourceValue = a === undefined ? null : a, designValue = b === undefined ? null : b;
    const status = a == null ? 'source-unknown' : b == null ? 'proposed-unknown' : JSON.stringify(a) === JSON.stringify(b) ? 'equal' : 'changed';
    const reason = adjustmentReasons[path] ?? null;
    rows.push({ field: path, sourceValue: clone(sourceValue), designValue: clone(designValue), status, reason, needsExplanation: status !== 'equal' && b != null && !reason });
  };
  walk(source.facts, actual, '');
  const differences = rows.filter(r => r.status !== 'equal');
  const knownMechanismRemovals = rows.filter(r => /^mechanisms\./.test(r.field) && /(Count|\.count)$/.test(r.field) && hasPositive(r.sourceValue) && r.designValue === 0).map(r => r.field);
  return {
    levelId: source.levelId, ruleVersion: PREVIEW_SOURCE_VERSION, rows, differences,
    knownEqualFields: rows.filter(r => r.status === 'equal').map(r => r.field),
    unknownSourceFields: rows.filter(r => r.status === 'source-unknown').map(r => r.field),
    missingDesignFields: rows.filter(r => r.status === 'proposed-unknown').map(r => r.field),
    unexplainedFields: rows.filter(r => r.needsExplanation).map(r => r.field),
    knownMechanismRemovals, sourceIncomplete: source.sourceIncomplete,
    requiresOriginalReconfiguration: differences.some(r => r.designValue !== null),
    sourceReasons: clone(source.reconfigurationReasons),
    note: 'Unknown source does not authorize unrelated known-mechanism deletion; each change still needs a scoped reason and preview disclosure.',
    sourceParityCertified: false, gameplayValidated: false, releaseApproved: false,
  };
}
