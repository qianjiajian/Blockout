// Goal-aware variant, separate from the frozen all-pose antichain tool.
// Once any goal label is a subset of a partial label, every extension of the
// latter is globally dominated at its eventual goal and need not be expanded.
export function goalUnionPaths({ neighbors, occupied, start, goals }, {
  maxLabels = 100000, maxMilliseconds = 1200,
} = {}) {
  const began = Date.now(), goalSet = new Set(goals), labels = neighbors.map(() => []);
  const queue = [[start, occupied[start]]];
  labels[start] = [occupied[start]];
  let masks = [], created = 1, transitions = 0, goalPrunes = 0;
  for (let head = 0; head < queue.length; head++) {
    if (created > maxLabels || Date.now() - began > maxMilliseconds) return { status: 'unknown', created, transitions, goalPrunes, reason: created > maxLabels ? 'label-budget' : 'deadline' };
    const [at, mask] = queue[head];
    if (!labels[at].includes(mask)) continue;
    if (masks.some(prior => (prior & mask) === prior)) { goalPrunes++; continue; }
    if (goalSet.has(at)) {
      masks = masks.filter(prior => (prior & mask) !== mask);
      masks.push(mask);
      continue;
    }
    for (const to of neighbors[at]) {
      transitions++;
      const next = mask | occupied[to];
      if (masks.some(prior => (prior & next) === prior)) { goalPrunes++; continue; }
      if (labels[to].some(prior => (prior & next) === prior)) continue;
      labels[to] = labels[to].filter(prior => (prior & next) !== next);
      labels[to].push(next);
      queue.push([to, next]);
      created++;
    }
  }
  return { status: 'complete', masks, created, transitions, goalPrunes, elapsedMilliseconds: Date.now() - began };
}
