import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = 'deliverables/league-regeneration-20261004/formal';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const early = JSON.parse(fs.readFileSync(`${root}/early-1-19.json`, 'utf8')).acceptedRows ?? [];
const lateReport = JSON.parse(fs.readFileSync(`${root}/late-65-100.json`, 'utf8'));
const late = (lateReport.accepted ?? []).map(row => {
  const candidate = JSON.parse(fs.readFileSync(row.levelFile, 'utf8'));
  return {
    index: row.index,
    level: candidate.level,
    specials: candidate.specials,
    levelSha256: candidate.levelSha256,
    gameplayKey: candidate.gameplayKey,
    lowerBound: row.lowerBound,
    upperBound: row.upperBound,
    specialEvidence: row.specialEvidence,
    evidenceFile: `${root}/late-65-100.json`,
  };
});
const entries = [...early.map(row => ({
  index: row.index,
  level: row.level,
  specials: row.specials,
  levelSha256: row.levelSha256,
  gameplayKey: row.gameplayKey ?? digest({ playable: row.level.playable, gates: row.level.gates, blocks: row.level.blocks, shutters: row.level.shutters, generators: row.level.generators, elevators: row.level.elevators, coloredGrids: row.level.coloredGrids }),
  lowerBound: row.lowerProof,
  upperBound: row.replay,
  specialEvidence: row.specialEvidence,
  evidenceFile: `${root}/early-1-19.json`,
})), ...late].sort((a, b) => a.index - b.index);
const source = `import type { LevelSpec } from './types';
export interface FormalLeagueCandidateEntry {
  index: number;
  level: LevelSpec;
  specials: readonly string[];
  levelSha256: string;
  gameplayKey: string;
  lowerBound: Readonly<Record<string, unknown>>;
  upperBound: Readonly<Record<string, unknown>>;
  specialEvidence: readonly Readonly<Record<string, unknown>>[];
  evidenceFile: string;
}
/** Isolated candidates only. The production selector remains on leagueLevelData until all 100 entries pass adoption. */
export const FORMAL_LEAGUE_CANDIDATES: readonly FormalLeagueCandidateEntry[] = ${JSON.stringify(entries)};
`;
fs.writeFileSync('src/core/formalLeagueCandidateData.ts', source);
console.log(JSON.stringify({ status: 'PARTIAL_FORMAL_CANDIDATES_WRITTEN', count: entries.length, indexes: entries.map(entry => entry.index), output: 'src/core/formalLeagueCandidateData.ts' }));
