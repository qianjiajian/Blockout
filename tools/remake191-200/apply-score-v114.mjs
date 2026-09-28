import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const modulePath = resolve(root, 'src/core/remake191to200.ts');
const fixturePath = resolve(root, 'tests/fixtures/remake191to200-v108.json');
const outDir = resolve(root, 'deliverables/star-targets191-196-20260928');
const source = readFileSync(modulePath, 'utf8');
const fixtureText = readFileSync(fixturePath, 'utf8');
const hash = text => createHash('sha256').update(text.replaceAll('\\r\\n', '\\n'), 'utf8').digest('hex');
const marker = 'const reviewed: Record<number, LevelSpec> = ';
const start = source.indexOf(marker);
const endMarker = ';\nexport const applyRemake191to200';
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('reviewed object boundaries not found');
const object = JSON.parse(source.slice(start + marker.length, end));
const fixture = JSON.parse(fixtureText);
if (object['191']?.preservedMoveTarget !== undefined || object['196']?.preservedMoveTarget !== undefined) throw new Error('score fields already exist');
const routeById = Object.fromEntries(fixture.rows.filter(r => [191, 196].includes(r.id)).map(r => [r.id, r]));
if (routeById[191]?.drags?.length !== 31 || routeById[196]?.drags?.length !== 27) throw new Error('route lengths changed');
const before = {
  createdOn: new Date().toISOString(),
  ruleVersion: '1.114.0',
  moduleSha256: hash(source),
  fixtureSha256: hash(fixtureText),
  moduleLevels: Object.fromEntries(Object.entries(object).map(([id, level]) => [id, hash(JSON.stringify(level))])),
  rows: Object.fromEntries(fixture.rows.map(row => [row.id, { levelSha256: hash(JSON.stringify(row.level)), drags: row.drags.length, lowerBound: row.lowerBound, upperBound: row.upperBound }]))
};
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'before.json'), `${JSON.stringify(before, null, 2)}\n`, 'utf8');

object['191'].preservedMoveTarget = 31;
object['196'].preservedMoveTarget = 27;
const nextModule = source.slice(0, start + marker.length) + JSON.stringify(object, null, 2) + source.slice(end);

for (const row of fixture.rows) {
  if (row.id === 191) row.level.preservedMoveTarget = 31;
  if (row.id === 196) row.level.preservedMoveTarget = 27;
}
writeFileSync(modulePath, nextModule, 'utf8');
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

const after = {
  createdOn: new Date().toISOString(),
  ruleVersion: '1.114.0',
  moduleSha256: hash(nextModule),
  fixtureSha256: hash(JSON.stringify(fixture) + '\n'),
  changed: { '191': { oldParMoves: object['191'].parMoves, preservedMoveTarget: 31 }, '196': { oldParMoves: object['196'].parMoves, preservedMoveTarget: 27 } },
  unchangedIds: Object.keys(object).filter(id => !['191', '196'].includes(id)),
  routeLengths: { '191': 31, '196': 27 }
};
writeFileSync(resolve(outDir, 'applied.json'), `${JSON.stringify(after, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(after, null, 2));
