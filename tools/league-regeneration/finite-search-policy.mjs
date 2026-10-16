import { createHash } from 'node:crypto';

const pointOrder = ([ax, ay], [bx, by]) => ay - by || ax - bx;
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]))
    : value;
const sha = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

/** Metadata changes and array ordering cannot purchase another solver attempt. */
export function gameplayFingerprint(level) {
  const copy = structuredClone(level);
  for (const key of ['id', 'name', 'difficulty', 'reward', 'parMoves', 'preservedMoveTarget', 'mutationIndex', 'solverAttempt']) delete copy[key];
  for (const key of ['playable', 'blocked']) if (copy[key]) copy[key].sort(pointOrder);
  for (const block of copy.blocks ?? []) block.shape.sort(pointOrder);
  for (const key of ['blocks', 'gates', 'shutters', 'generators', 'flipDoors', 'coloredGrids', 'elevators', 'conveyors']) {
    copy[key]?.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  return sha(copy);
}

export function mutationChanges(base, next) {
  const originals = new Map(base.blocks.map(block => [block.id, block]));
  const shape = block => sha([...block.shape].sort(pointOrder));
  const color = block => JSON.stringify(block.layers ?? [block.color]);
  return {
    shapeBlockIds: next.blocks.filter(block => originals.has(block.id) && shape(block) !== shape(originals.get(block.id))).map(block => block.id),
    colorBlockIds: next.blocks.filter(block => originals.has(block.id) && color(block) !== color(originals.get(block.id))).map(block => block.id),
  };
}

/** Both candidate production and solver calls have finite caps. Previously tried
 * gameplay fingerprints must be passed on resume; failed candidates are never
 * retried with a larger budget by this runner. Each solve callback must enforce
 * its supplied state, transition and time budgets and fail closed on UNKNOWN. */
export async function runFiniteCandidates({ base, candidates, solve, maxCandidates = 8, priorFingerprints = [], onAttempt }) {
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 32) throw new Error('maxCandidates must be 1–32');
  const seen = new Set([gameplayFingerprint(base), ...priorFingerprints]);
  const attempts = [];
  let accepted;
  for (let mutationIndex = 0; mutationIndex < Math.min(maxCandidates, candidates.length); mutationIndex++) {
    const level = candidates[mutationIndex];
    const fingerprint = gameplayFingerprint(level);
    const changes = mutationChanges(base, level);
    const row = { mutationIndex, fingerprint, changes, status: 'BLOCKED', failureReasons: [] };
    if (seen.has(fingerprint)) {
      row.status = 'SKIPPED_DUPLICATE';
      row.failureReasons.push('gameplay-already-attempted');
    } else if (!changes.shapeBlockIds.length || !changes.colorBlockIds.length) {
      row.status = 'SKIPPED_COSMETIC_MUTATION';
      row.failureReasons.push('both-real-shape-and-color-changes-required');
      seen.add(fingerprint);
    } else {
      seen.add(fingerprint);
      row.solverAttempt = attempts.filter(item => item.solverAttempt).length + 1;
      try {
        const result = await solve(level, row);
        row.result = result;
        row.failureReasons = result.failureReasons ?? [];
        if (result.accepted === true) {
          row.status = 'CANDIDATE_READY_FOR_REVIEW';
          accepted = { level, fingerprint, result };
        }
      } catch (error) {
        row.failureReasons.push(`solver-error:${error.message}`);
      }
    }
    attempts.push(row);
    if (onAttempt) await onAttempt(row);
    if (accepted) break;
  }
  return { status: accepted ? 'CANDIDATE_READY_FOR_REVIEW' : 'FINITE_BATCH_EXHAUSTED', maxCandidates, attempts, accepted: accepted ?? null };
}

const cellsOf = block => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const cellKey = point => point.join(',');
const sameCells = (a, b) => JSON.stringify([...a].sort(pointOrder)) === JSON.stringify([...b].sort(pointOrder));

/** Retile exactly two same-area bodies using native artwork silhouettes. Their
 * union, area, identities, hidden cohort and mechanism properties are retained;
 * the shape partition really changes. Gates and unlocking fields stay intact. */
export function retileAndRecolor(base, definitions, maxCandidates = 8) {
  const candidates = [];
  const seen = new Set();
  const plain = base.blocks.filter(block => !block.layers && !block.movementAxis && !block.keyId && !block.lockedBy && !block.star);
  for (let i = 0; i < plain.length; i++) for (let j = i + 1; j < plain.length; j++) {
    const a = plain[i], b = plain[j];
    if (a.shape.length !== b.shape.length || a.color === b.color || a.shutterId !== b.shutterId) continue;
    const union = [...cellsOf(a), ...cellsOf(b)], keys = new Set(union.map(cellKey));
    if (keys.size !== union.length) continue;
    const shapes = definitions.filter(def => def.cells.length === a.shape.length);
    for (const defA of shapes) for (const anchor of union) {
      const placedA = defA.cells.map(([dx, dy]) => [anchor[0] + dx, anchor[1] + dy]);
      if (!placedA.every(cell => keys.has(cellKey(cell)))) continue;
      const used = new Set(placedA.map(cellKey));
      const remaining = union.filter(cell => !used.has(cellKey(cell)));
      const x = Math.min(...remaining.map(cell => cell[0])), y = Math.min(...remaining.map(cell => cell[1]));
      for (const defB of shapes) {
        const placedB = defB.cells.map(([dx, dy]) => [x + dx, y + dy]);
        if (!sameCells(placedB, remaining)) continue;
        const level = structuredClone(base);
        Object.assign(level.blocks.find(block => block.id === a.id), { x: anchor[0], y: anchor[1], shape: structuredClone(defA.cells), color: b.color });
        Object.assign(level.blocks.find(block => block.id === b.id), { x, y, shape: structuredClone(defB.cells), color: a.color });
        const changes = mutationChanges(base, level), fingerprint = gameplayFingerprint(level);
        if (!changes.shapeBlockIds.length || seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        candidates.push(level);
        if (candidates.length >= maxCandidates) return candidates;
      }
    }
  }
  return candidates;
}
