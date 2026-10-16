/* Adopt only a complete, independently proven 100-level league catalog.
 * This command is intentionally fail-closed: partial or route-only evidence
 * cannot write the formal registry or selector.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

if (!verifyRulesLock().ok) throw new Error('rules lock failed');
const root = 'deliverables/league-regeneration-20261004/formal';
const files = ['early-1-19.json', 'mid-20-64.json', 'late-65-100.json'];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cycle = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const lower = difficulty => difficulty === 'super' ? 21 : 16;
const upper = difficulty => difficulty === 'super' ? 30 : 20;
const mechanismThresholds = {
  '冰冻出口': 6, '数字冰块': 10, '外壳块': 15, '卷帘门': 20,
  '生成器': 35, '轴向块': 50, '钥匙与锁': 60, '升降台': 65,
  '星标块/星门': 100, '彩色地格': 200,
};

function mechanisms(level) {
  const out = new Set(['普通出口']);
  if (level.gates?.some(g => (g.frozen ?? 0) > 0)) out.add('冰冻出口');
  if (level.blocks?.some(b => (b.frozen ?? 0) > 0)) out.add('数字冰块');
  if (level.blocks?.some(b => (b.layers?.length ?? 1) > 1)) out.add('外壳块');
  if (level.shutters?.length) out.add('卷帘门');
  if (level.generators?.length) out.add('生成器');
  if (level.blocks?.some(b => b.movementAxis)) out.add('轴向块');
  if (level.blocks?.some(b => b.keyId || b.lockedBy)) out.add('钥匙与锁');
  if (level.elevators?.length) out.add('升降台');
  if (level.blocks?.some(b => b.star) || level.gates?.some(g => g.star)) out.add('星标块/星门');
  if (level.coloredGrids?.length) out.add('彩色地格');
  return [...out];
}

function isFilledAxisAlignedRectangle(shape) {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return cells.size === (maxX - minX + 1) * (maxY - minY + 1)
    && Array.from({ length: maxX - minX + 1 }, (_, dx) =>
      Array.from({ length: maxY - minY + 1 }, (_, dy) => cells.has(`${minX + dx},${minY + dy}`))
    ).flat().every(Boolean);
}

function specialEvidenceFor(row, specialId) {
  const evidence = row.specialEvidence ?? row.specialAudit ?? [];
  return Array.isArray(evidence) ? evidence.find(item => item?.blockId === specialId) : undefined;
}

function acceptedRows(report) {
  if (Array.isArray(report.acceptedRows)) return report.acceptedRows;
  if (Array.isArray(report.accepted)) return report.accepted.map(row => {
    // The late-range report keeps the independently verified LevelSpec in a
    // sidecar file so its summary stays small. Hydrate that sidecar before
    // applying the common formal gate.
    if (!row.level && row.levelFile) {
      const levelFile = row.levelFile;
      try {
        const candidate = JSON.parse(readFileSync(levelFile, 'utf8'));
        return { ...row, level: candidate.level, specials: candidate.specials, levelSha256: candidate.levelSha256, gameplayKey: candidate.gameplayKey, packing: candidate.packing };
      } catch { return row; }
    }
    return row;
  });
  if (Array.isArray(report.rows)) return report.rows.filter(row => /PASS|ACCEPT/i.test(row.status ?? '') && row.level);
  return [];
}

const reports = await Promise.all(files.map(async file => ({ file, report: JSON.parse(await readFile(`${root}/${file}`, 'utf8')) })));
const rows = reports.flatMap(({ file, report }) => acceptedRows(report).map(row => ({ ...row, evidenceFile: `${root}/${file}` })));
if (rows.length !== 100) throw new Error(`formal adoption requires 100 accepted rows; got ${rows.length}`);
const entries = rows.map(row => {
  const index = Number(row.index ?? row.sourceIndex ?? row.level?.leagueIndex);
  const level = structuredClone(row.level);
  if (!Number.isInteger(index) || index < 1 || index > 100 || !level) throw new Error(`invalid accepted row index ${index}`);
  if (level.id !== 900000 + index) throw new Error(`Lv${index} id mismatch`);
  const difficulty = cycle(index);
  if (level.difficulty !== difficulty) throw new Error(`Lv${index} cadence mismatch`);
  const proof = row.lower ?? row.lowerBound;
  const route = row.replay ?? row.routeReplay ?? (row.upperBound ? {
    valid: row.upperBound.status === 'replay-complete',
    complete: row.upperBound.status === 'replay-complete',
    nonClearingDrags: row.upperBound.value,
  } : row.upper);
  const lowerProven = proof?.thresholdProven === true
    || (proof?.status === 'threshold-proven' && Number(proof.value ?? proof.floor) >= lower(difficulty));
  if (!lowerProven || !route?.valid || route.complete !== true) throw new Error(`Lv${index} lacks same-object lower/upper proof`);
  const nonClearing = Number(route.nonClearingDrags ?? route.value);
  if (!Number.isInteger(nonClearing) || nonClearing < lower(difficulty) || nonClearing > upper(difficulty)) throw new Error(`Lv${index} upper/lower range mismatch`);
  const names = mechanisms(level);
  for (const name of names) if (mechanismThresholds[name] !== undefined && index < mechanismThresholds[name]) throw new Error(`Lv${index} uses ${name} before unlock`);
  const specials = row.specials;
  if (!Array.isArray(specials) || specials.length < 1 || specials.length > 3 || new Set(specials).size !== specials.length) throw new Error(`Lv${index} special-block count must be 1-3`);
  const inventory = new Set(level.blocks.map(block => block.id));
  if (specials.some(id => !inventory.has(id))) throw new Error(`Lv${index} special-block inventory mismatch`);
  const blocks = new Map(level.blocks.map(block => [block.id, block]));
  for (const specialId of specials) {
    const block = blocks.get(specialId);
    if (!isFilledAxisAlignedRectangle(block.shape)) throw new Error(`Lv${index} special ${specialId} is irregular`);
    const evidence = specialEvidenceFor(row, specialId);
    if (!evidence || evidence.completeClearVerified === false || evidence.lateClear !== true) {
      throw new Error(`Lv${index} special ${specialId} lacks late complete-clear evidence`);
    }
  }
  const levelSha256 = sha(level);
  const gameplayKey = sha({ playable: level.playable, gates: level.gates, blocks: level.blocks, shutters: level.shutters, generators: level.generators, elevators: level.elevators, coloredGrids: level.coloredGrids });
  return { index, level, specials, levelSha256, gameplayKey, packing: row.packing ?? 0, evidenceFile: row.evidenceFile, lower: proof, replay: route, specialEvidence: row.specialEvidence ?? row.specialAudit ?? [] };
});
const indexes = new Set(entries.map(entry => entry.index));
if (indexes.size !== 100 || Array.from({ length: 100 }, (_, offset) => offset + 1).some(index => !indexes.has(index))) throw new Error('formal catalog index gap');
await mkdir(root, { recursive: true });
await writeFile(`${root}/catalog.json`, JSON.stringify({ status: 'FORMAL_DATA_ACCEPTED', count: entries.length, entries }, null, 2));
const ts = `import type { LevelSpec } from './types';\nexport interface FormalLeagueLevelEntry { index: number; level: LevelSpec; specials: readonly string[]; levelSha256: string; gameplayKey: string; packing: number }\nexport const FORMAL_LEAGUE_LEVELS: readonly FormalLeagueLevelEntry[] = ${JSON.stringify(entries.map(({ lower: _lower, replay: _replay, ...entry }) => entry))};\n`;
await writeFile('src/core/formalLeagueLevelData.ts', ts);
console.log(JSON.stringify({ status: 'FORMAL_DATA_ACCEPTED', count: entries.length, catalog: `${root}/catalog.json`, data: 'src/core/formalLeagueLevelData.ts' }, null, 2));
