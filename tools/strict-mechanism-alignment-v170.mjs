/** Pure, read-only source/measurement comparison for v1.7.0.
 * This does not load levels, fill source gaps, solve, or authorize publication.
 * The caller owns independent source evidence and authoritative measurements.
 */
export const STRICT_MECHANISM_ALIGNMENT_VERSION = '1.7.0';

const count = value => Number.isSafeInteger(value) && value >= 0;
const known = value => value !== null && value !== undefined;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => value === undefined ? null : structuredClone(value);
const at = (value, path) => path.split('.').reduce((v, k) => v?.[k], value);
const numberOrder = (a, b) => a - b;
const counts = [
  'exits.ordinaryCount', 'exits.frozenCount', 'exits.starCount', 'exits.starFrozenCount', 'exits.flipCount',
  'generators.count', 'covers.count', 'numericIce.count', 'numericIce.postMeltShellCount', 'shells.count',
  'axisBlocks.count', 'keysLocks.keyCount', 'keysLocks.lockCount', 'starBlocks.count', 'flipDoors.count',
  'coloredGrid.cellCount', 'coloredGrid.regionCount', 'bombs.count', 'elevators.count',
  'irregularBlocks.openingCount', 'irregularBlocks.fullCount',
];
const collections = [
  ['exits.frozenValues', 'exits.frozenCount'], ['exits.starFrozenValues', 'exits.starFrozenCount'],
  ['generators.queueLengths', 'generators.count'], ['numericIce.values', 'numericIce.count'],
  ['axisBlocks.axes', 'axisBlocks.count', ['horizontal', 'vertical']],
  ['keysLocks.lockValues', 'keysLocks.lockCount'],
  ['flipDoors.initialStates', 'flipDoors.count', ['open', 'closed']], ['bombs.values', 'bombs.count'],
];

/** Count real non-rectangular footprints, not names, area, or bounding boxes. */
export function countIrregularBlockShapes(blocks) {
  if (!Array.isArray(blocks)) throw new TypeError('Expected a block array');
  return blocks.reduce((n, block) => {
    const shape = block?.shape;
    if (!Array.isArray(shape) || !shape.length || shape.some(cell => !Array.isArray(cell)
      || cell.length !== 2 || !cell.every(Number.isSafeInteger))) throw new TypeError('Invalid integer shape');
    if (new Set(shape.map(cell => cell.join(','))).size !== shape.length) throw new TypeError('Duplicate shape cells');
    const xs = shape.map(cell => cell[0]), ys = shape.map(cell => cell[1]);
    const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    return n + Number(area !== shape.length);
  }, 0);
}

/**
 * source is a normalized independent facts object or { levelId, facts }.
 * design is measureDesignFacts output (or {facts}). M11 measurements may be
 * supplied under mechanisms.irregularBlocks or via the two explicit options.
 * Covers remain paired; elevator batches retain layer order within each region.
 * Optional keysLocks.groups preserve key/lock associations when source has them.
 */
export function auditStrictMechanismAlignment(source, design, options = {}) {
  const s = copy(source?.facts ?? source), d = copy(design?.facts ?? design);
  if (!object(s) || !object(d)) throw new TypeError('Independent source facts and design measurements required');
  const levelId = options.levelId ?? source?.levelId ?? source?.level;
  if (!Number.isInteger(levelId) || levelId < 21 || levelId > 200) throw new RangeError('Expected levelId 21–200');
  if (known(source?.levelId) && source.levelId !== levelId) throw new Error('Source level identity mismatch');
  if (known(design?.levelId) && design.levelId !== levelId) throw new Error('Design level identity mismatch');
  s.mechanisms ??= {}; d.mechanisms ??= {};
  if (!object(s.mechanisms) || !object(d.mechanisms)) throw new TypeError('Invalid mechanism object');
  if (Object.hasOwn(options, 'sourceIrregular')) s.mechanisms.irregularBlocks = copy(options.sourceIrregular);
  if (Object.hasOwn(options, 'designIrregular')) d.mechanisms.irregularBlocks = copy(options.designIrregular);
  const blockedIssues = [], unresolved = [], approvedExceptions = [], comparisons = [];
  const issue = (code, field, sourceValue, designValue, detail) => blockedIssues.push({ code, field,
    sourceValue: copy(sourceValue), designValue: copy(designValue), ...(detail ? { detail } : {}) });
  const unknown = (side, field, value) => {
    if (!unresolved.some(row => row.side === side && row.field === field))
      unresolved.push({ code: side === 'source' ? 'source-unknown' : 'measurement-unknown', side, field, value: copy(value) });
  };
  const sm = s.mechanisms, dm = d.mechanisms;
  const ice26 = ex => ex?.frozenCount === 3 && Array.isArray(ex.frozenValues)
    && JSON.stringify([...ex.frozenValues].sort(numberOrder)) === '[5,9,14]'
    && ex.starCount === 0 && ex.starFrozenCount === 0 && ex.flipCount === 0;
  const exception26 = levelId === 26 && sm.exits?.ordinaryCount === 8 && ice26(sm.exits) && ice26(dm.exits)
    && count(dm.exits?.ordinaryCount) && dm.exits.ordinaryCount >= 1 && dm.exits.ordinaryCount <= 5
    && sm.starBlocks?.count === 0 && dm.starBlocks?.count === 0 && sm.flipDoors?.count === 0 && dm.flipDoors?.count === 0;

  for (const path of counts) {
    const field = `mechanisms.${path}`, a = at(sm, path), b = at(dm, path);
    if (!known(a)) unknown('source', field, a);
    else if (!count(a)) issue('invalid-source-count', field, a, b);
    if (!known(b)) unknown('design', field, b);
    else if (!count(b)) issue('invalid-measurement-count', field, a, b);
    if (!count(a) || !count(b)) continue;
    if (path === 'exits.ordinaryCount' && exception26) {
      const row = { field, sourceValue: a, designValue: b, status: 'approved-exception',
        rule: 'v1.7-Lv26-only', detail: 'Source remains 8 ordinary + 3 frozen; ordinary design 1–5, frozen 5/9/14 retained.' };
      approvedExceptions.push(row); comparisons.push(row);
    } else {
      comparisons.push({ field, sourceValue: a, designValue: b, status: a === b ? 'equal' : 'different' });
      if (a !== b) issue('mechanism-count-mismatch', field, a, b);
    }
  }

  // Validate leaves separately: null is unresolved, never an empty/zero value.
  function validateLeaves(value, side, field, allowed) {
    if (!known(value)) { unknown(side, field, value); return; }
    if (Array.isArray(value)) { value.forEach((v, i) => validateLeaves(v, side, `${field}[${i}]`, allowed)); return; }
    if (object(value)) { for (const [k, v] of Object.entries(value)) validateLeaves(v, side, `${field}.${k}`, allowed); return; }
    if (!(allowed ? allowed.includes(value) : count(value))) issue(`invalid-${side}-parameter`, field,
      side === 'source' ? value : null, side === 'design' ? value : null);
  }
  function compatible(a, b) {
    if (!known(a) || !known(b)) return true; // unresolved remains a separate non-pass gate
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
      && a.length === b.length && a.every((v, i) => compatible(v, b[i]));
    if (object(a) || object(b)) return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length
      && Object.keys(a).every(k => Object.hasOwn(b, k) && compatible(a[k], b[k]));
    return a === b;
  }
  function compareBags(field, a, b, allowed) {
    validateLeaves(a, 'source', field, allowed); validateLeaves(b, 'design', field, allowed);
    if (!Array.isArray(a) || !Array.isArray(b)) {
      if (known(a) && !Array.isArray(a)) issue('invalid-source-array', field, a, b);
      if (known(b) && !Array.isArray(b)) issue('invalid-measurement-array', field, a, b);
      return;
    }
    // Bipartite matching preserves each known record even if some source slots
    // are unknown; independently sorting the parallel arrays would lose pairing.
    const owner = Array(b.length).fill(-1);
    function match(i, seen) {
      for (let j = 0; j < b.length; j++) if (!seen[j] && compatible(a[i], b[j])) {
        seen[j] = true;
        if (owner[j] < 0 || match(owner[j], seen)) { owner[j] = i; return true; }
      }
      return false;
    }
    const equal = a.length === b.length && a.every((_, i) => match(i, Array(b.length).fill(false)));
    comparisons.push({ field, sourceValue: copy(a), designValue: copy(b), status: equal ? 'compatible' : 'different' });
    if (!equal) issue('mechanism-parameter-mismatch', field, a, b);
  }
  function lengthCheck(side, path, array, expected) {
    if (Array.isArray(array) && count(expected) && array.length !== expected)
      issue(`${side}-count-array-inconsistent`, `mechanisms.${path}`, side === 'source' ? array : null,
        side === 'design' ? array : null, `Array length ${array.length}, declared count ${expected}`);
  }
  function flatShape(side, path, value) {
    if (Array.isArray(value)) value.forEach((v, i) => {
      if (known(v) && (Array.isArray(v) || object(v)))
        issue(`invalid-${side}-scalar-parameter`, `mechanisms.${path}[${i}]`, side === 'source' ? v : null, side === 'design' ? v : null);
    });
  }
  for (const [path, countPath, allowed] of collections) {
    const a = at(sm, path), b = at(dm, path);
    flatShape('source', path, a); flatShape('design', path, b);
    compareBags(`mechanisms.${path}`, a, b, allowed);
    lengthCheck('source', path, a, at(sm, countPath)); lengthCheck('design', path, b, at(dm, countPath));
  }
  function coverPairs(m, side) {
    const c = m.covers ?? {}, paths = ['values', 'hiddenBatchCounts'];
    for (const p of paths) {
      flatShape(side, `covers.${p}`, c[p]);
      validateLeaves(c[p], side, `mechanisms.covers.${p}`);
      if (known(c[p]) && !Array.isArray(c[p])) issue(`invalid-${side}-array`, `mechanisms.covers.${p}`, null, c[p]);
      lengthCheck(side, `covers.${p}`, c[p], c.count);
    }
    const n = Math.max(Array.isArray(c.values) ? c.values.length : 0, Array.isArray(c.hiddenBatchCounts) ? c.hiddenBatchCounts.length : 0);
    if (!Array.isArray(c.values) && !Array.isArray(c.hiddenBatchCounts)) return null;
    return Array.from({ length: n }, (_, i) => ({ value: c.values?.[i] ?? null, hiddenCount: c.hiddenBatchCounts?.[i] ?? null }));
  }
  compareBags('mechanisms.covers.pairedBatches', coverPairs(sm, 'source'), coverPairs(dm, 'design'));
  for (const [side, m] of [['source', sm], ['design', dm]]) {
    const batches = m.elevators?.hiddenBatchCounts;
    lengthCheck(side, 'elevators.hiddenBatchCounts', batches, m.elevators?.count);
    if (Array.isArray(batches)) batches.forEach((batch, i) => {
      if (known(batch) && !Array.isArray(batch)) issue(`invalid-${side}-elevator-region`, `mechanisms.elevators.hiddenBatchCounts[${i}]`, null, batch);
      flatShape(side, `elevators.hiddenBatchCounts[${i}]`, batch);
    });
  }
  // Outer region identities may be permuted; layers inside each region may not.
  compareBags('mechanisms.elevators.hiddenBatchCounts', sm.elevators?.hiddenBatchCounts, dm.elevators?.hiddenBatchCounts);
  if (Object.hasOwn(sm.keysLocks ?? {}, 'groups')) {
    for (const [side, m] of [['source', sm], ['design', dm]]) {
      const groups = m.keysLocks?.groups;
      if (Array.isArray(groups)) {
        groups.forEach((g, i) => {
          if (known(g) && !object(g)) issue(`invalid-${side}-key-group`, `mechanisms.keysLocks.groups[${i}]`, null, g);
          if (object(g)) flatShape(side, `keysLocks.groups[${i}].lockValues`, g.lockValues);
        });
        if (groups.every(g => count(g?.keyCount)) && count(m.keysLocks.keyCount)
          && groups.reduce((n, g) => n + g.keyCount, 0) !== m.keysLocks.keyCount)
          issue(`${side}-key-group-total-inconsistent`, 'mechanisms.keysLocks.groups', null, groups);
        if (groups.every(g => Array.isArray(g?.lockValues)) && count(m.keysLocks.lockCount)
          && groups.reduce((n, g) => n + g.lockValues.length, 0) !== m.keysLocks.lockCount)
          issue(`${side}-lock-group-total-inconsistent`, 'mechanisms.keysLocks.groups', null, groups);
      }
    }
    const groupFacts = groups => Array.isArray(groups) ? groups.map(g => object(g)
      ? { keyCount: g.keyCount ?? null, lockValues: Array.isArray(g.lockValues) ? [...g.lockValues].sort(numberOrder) : null } : g) : groups;
    compareBags('mechanisms.keysLocks.groups', groupFacts(sm.keysLocks.groups), groupFacts(dm.keysLocks?.groups));
  }

  for (const [side, facts] of [['source', s], ['design', d]]) {
    const m = facts.mechanisms, ex = m.exits ?? {};
    const nonstar = ['ordinaryCount', 'frozenCount', 'flipCount'].reduce((n, k) => n + (count(ex[k]) ? ex[k] : 0), 0);
    if (nonstar > 8 && !(side === 'source' && exception26)) issue(`${side}-exit-capacity-conflict`, 'mechanisms.exits',
      side === 'source' ? nonstar : null, side === 'design' ? nonstar : null, 'Non-star physical exits exceed the 8-color capacity.');
    if (count(ex.starFrozenCount) && count(ex.starCount) && ex.starFrozenCount > ex.starCount)
      issue(`${side}-star-frozen-subset-conflict`, 'mechanisms.exits.starFrozenCount', ex.starCount, ex.starFrozenCount);
    if (count(ex.flipCount) && count(m.flipDoors?.count) && ex.flipCount !== m.flipDoors.count)
      issue(`${side}-flip-count-inconsistent`, 'mechanisms.flipDoors.count', ex.flipCount, m.flipDoors.count);
    if (count(m.numericIce?.postMeltShellCount) && count(m.numericIce?.count) && count(m.shells?.count)
      && m.numericIce.postMeltShellCount > Math.min(m.numericIce.count, m.shells.count))
      issue(`${side}-ice-shell-subset-conflict`, 'mechanisms.numericIce.postMeltShellCount', null, m.numericIce.postMeltShellCount);
    if (m.coloredGrid?.cellCount > 0 && m.shells?.count > 0)
      issue(`${side}-grid-shell-conflict`, 'mechanisms', m.coloredGrid.cellCount, m.shells.count);
    for (const stage of ['opening', 'full']) {
      const n = m.irregularBlocks?.[`${stage}Count`], total = facts[stage];
      if (count(n) && n > 0 && !known(total)) unknown(side, stage, total);
      else if (count(n) && known(total) && !count(total)) issue(`invalid-${side}-block-count`, stage, null, total);
      else if (count(n) && count(total) && n * 10 > total * 3)
        issue(`${side}-irregular-ratio-conflict`, `mechanisms.irregularBlocks.${stage}Count`, n, total, 'Maximum 30% by block count.');
    }
    if (count(m.irregularBlocks?.openingCount) && count(m.irregularBlocks?.fullCount)
      && m.irregularBlocks.openingCount > m.irregularBlocks.fullCount)
      issue(`${side}-irregular-opening-subset-conflict`, 'mechanisms.irregularBlocks', m.irregularBlocks.openingCount, m.irregularBlocks.fullCount);
    const supported = new Set(counts.map(p => p.split('.')[0]));
    for (const family of Object.keys(m)) if (!supported.has(family)) unknown(side, `mechanisms.${family}`, m[family]);
  }
  const sourceAligned = blockedIssues.length === 0 && unresolved.length === 0;
  return { ruleVersion: STRICT_MECHANISM_ALIGNMENT_VERSION, levelId, scope: 'mechanism-source-alignment-only',
    sourceAligned, exactMatch: sourceAligned && approvedExceptions.length === 0,
    knownFieldsMatch: blockedIssues.length === 0, blockedIssues, unresolved, approvedExceptions, comparisons,
    gameplayValidated: false, boardAligned: false, releaseApproved: false };
}
