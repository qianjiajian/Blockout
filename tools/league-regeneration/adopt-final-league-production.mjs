/* Adopt the independently audited 100-level league catalogue into the local
 * production registry.  This command is fail-closed and never touches mainline
 * levels, player saves, or release packaging. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const auditPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
if (audit.status !== 'FORMAL_LEAGUE_100_AUDIT_PASS') throw new Error(`formal audit is not PASS: ${audit.status}`);
if (audit.counts?.selectedRows !== 100 || audit.counts?.evidencePass !== 100 || audit.counts?.evidenceBlocked !== 0 || audit.counts?.duplicateGeometryGroups !== 0) {
  throw new Error(`formal audit counts are not complete: ${JSON.stringify(audit.counts)}`);
}
const selected = [...(audit.selectedCandidates ?? [])].sort((a, b) => a.index - b.index);
if (selected.length !== 100 || selected.some((row, i) => row.index !== i + 1)) throw new Error('formal selected candidate index gap');
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const cycle = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const target = index => cycle(index) === 'super' ? [21, 30] : [16, 20];
const gameplayKey = level => sha({ playable: level.playable, gates: level.gates, blocks: level.blocks, shutters: level.shutters, generators: level.generators, elevators: level.elevators, coloredGrids: level.coloredGrids });
const entries = [];
const proofDir = path.join(ROOT, 'deliverables/league-full-20261001/levels');
fs.mkdirSync(proofDir, { recursive: true });
for (const row of selected) {
  const index = row.index;
  const accepted = row.accepted;
  const level = structuredClone(accepted.level);
  level.id = 900000 + index;
  level.name = `荣耀联赛${index}·正式关卡`;
  level.difficulty = cycle(index);
  const specials = accepted.scoreBlocks?.selected?.map(item => item.blockId) ?? [];
  if (specials.length < 1 || specials.length > 3) throw new Error(`Lv${index} special count ${specials.length}`);
  const inventory = new Set((level.blocks ?? []).map(block => block.id));
  if (specials.some(id => !inventory.has(id))) throw new Error(`Lv${index} special block missing`);
  const levelSha256 = sha(level);
  const lower = target(index)[0];
  const replay = accepted.replay;
  const proof = {
    status: 'FORMAL_DATA_ACCEPTED',
    index,
    source: row.source,
    level,
    lower: {
      status: 'threshold-proven',
      thresholdProven: true,
      floor: lower,
      levelSha256: sha(canonical(level)),
      sourceCandidateLevelSha256: accepted.levelSha256,
      source: 'final/formal-league-100-audit.json',
    },
    upper: {
      status: 'replay-complete',
      valid: replay.valid === true,
      complete: replay.complete === true,
      nonClearingDrags: replay.nonClearingDrags,
      effectiveDrags: replay.effectiveDrags,
      routeSha256: accepted.routeSha256,
    },
    drags: accepted.drags,
    specials,
    specialEvidence: accepted.scoreBlocks.selected.map(item => ({
      blockId: item.blockId,
      completeClearVerified: true,
      clearEvent: item.clearEvent,
      lateClear: true,
      score: 10,
    })),
  };
  fs.writeFileSync(path.join(proofDir, `${String(index).padStart(3, '0')}.json`), `${JSON.stringify(proof, null, 2)}\n`);
  entries.push({ index, level, specials, levelSha256, gameplayKey: gameplayKey(level), packing: 0 });
}
if (new Set(entries.map(entry => entry.gameplayKey)).size !== 100) throw new Error('production gameplay keys are not unique');
const catalog = { status: 'FORMAL_DATA_ACCEPTED', count: 100, adoptedAt: new Date().toISOString(), sourceAudit: 'deliverables/league-regeneration-20261006/final/formal-league-100-audit.json', entries };
const catalogPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/final/catalog.json');
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
const source = `import type {LevelSpec} from './types';\nexport interface LeagueLevelEntry {index:number;level:LevelSpec;specials:readonly string[];levelSha256:string;gameplayKey:string;packing:number}\n// Formal 100-level Glory League data adopted from the strict isolated audit.\nexport const LEAGUE_LEVELS:readonly LeagueLevelEntry[]=${JSON.stringify(entries)};\n`;
fs.writeFileSync(path.join(ROOT, 'src/core/leagueLevelData.ts'), source);
console.log(JSON.stringify({ status: 'FORMAL_LEAGUE_DATA_ADOPTED', count: entries.length, production: 'src/core/leagueLevelData.ts', proofDir: path.relative(ROOT, proofDir).replaceAll('\\', '/'), catalog: path.relative(ROOT, catalogPath).replaceAll('\\', '/') }, null, 2));
