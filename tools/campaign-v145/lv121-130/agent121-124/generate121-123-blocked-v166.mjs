import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'deliverables/campaign121-130-v146-20260924/agent121-124');
fs.mkdirSync(OUT, { recursive: true });
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json'), 'utf8'));
const records = truth.records ?? truth.levels;
const specs = {
  121: { width: 6, height: 7, blockers: ['source q0 anchors unresolved', 'source numeric cover footprint and bomb timing require frame review', 'current q0 native audit has two non-native blocks'] },
  123: { width: 7, height: 11, blockers: ['hidden-stage footprint and full geometry incomplete', 'source staged tray and shell anchors unresolved', 'current q0 native audit has three non-native blocks'] },
};
for (const id of [121, 123]) {
  const source = records.find((r) => Number(r.level ?? r.id) === id);
  const s = specs[id];
  const out = path.join(OUT, `candidate${id}-v166-scaffold.json`);
  const candidate = {
    candidateVersion: 'campaign-v145-agent121-124-v166', ruleVersion: '1.66.0', generatedAt: new Date().toISOString(),
    level: { id, name: `源重建 Lv${id}`, width: s.width, height: s.height, playable: Array.from({ length: s.height }, (_, y) => Array.from({ length: s.width }, (_, x) => [x, y])).flat(), blocks: [], gates: [], shutters: [], generators: [] },
    source: { truthPath: 'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json', evidenceSha256: source?.provenance?.evidence_sha256 ?? null, openingFrame: source?.provenance?.opening_frame ?? null, composition: source?.composition ?? null, mechanisms: source?.mechanisms ?? null },
    q0Audit: { status: 'NOT_RUN', nativeShapeRotationViolations: 'UNKNOWN', openingCoverage: 'NOT_RUN' },
    route: { status: 'NOT_RUN', lowerBound: null, upperBound: null, pointer: 'NOT_RUN', naturalClock: 'NOT_RUN' },
    status: 'GENERATED_SCAFFOLD_BLOCKED_NEEDS_REVIEWED_SOURCE', blockers: s.blockers,
  };
  fs.writeFileSync(out, JSON.stringify(candidate, null, 2) + '\n');
  console.log(JSON.stringify({ level: id, candidate: path.relative(ROOT, out).replaceAll('\\', '/'), status: candidate.status, blockers: s.blockers }, null, 2));
}
