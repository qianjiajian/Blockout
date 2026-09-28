import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { digest } from '../revised-preview-validation-v160.mjs';
import { loadApi, replay } from '../remake171-180/replay.mjs';
import { ruleGate, ROOT as REMAKE_ROOT } from '../remake171-180/common.mjs';

export const ROOT = 'deliverables/star-targets171-180-20260928';
export const PRODUCTION = 'src/core/remake171to180.ts';
export const FIXTURE = 'tests/fixtures/remake171to180-v106.json';
export const IDS = [171, 172, 173, 174, 175, 176, 177, 178, 179, 180];
export const CHANGED = { 171: 35, 174: 47, 175: 46, 176: 51, 177: 38, 180: 35 };

const read = p => JSON.parse(fs.readFileSync(p));
const write = (p, value) => { fs.mkdirSync(p.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
const mode = process.argv[2];
const { api } = await loadApi();
const lock = ruleGate();
assert.equal(lock.activeVersion, '1.113.0');
fs.mkdirSync(ROOT, { recursive: true });

if (mode === 'prepare') {
  const sourceText = fs.readFileSync(PRODUCTION, 'utf8');
  const fixtureText = fs.readFileSync(FIXTURE, 'utf8');
  const levels = structuredClone(api.LEVELS);
  const rows = read(FIXTURE).rows;
  const scores = Object.fromEntries(IDS.map(id => [id, { old: api.levelStarTargets(levels[id - 1]).moveTarget, new: CHANGED[id] ?? api.levelStarTargets(levels[id - 1]).moveTarget, time: api.levelStarTargets(levels[id - 1]).timeTargetSeconds, route: rows.find(r => r.id === id).drags.length }]));
  assert.deepEqual(scores, { 171: { old: 27, new: 35, time: 64, route: 35 }, 172: { old: 64, new: 64, time: 100, route: 60 }, 173: { old: 91, new: 91, time: 82, route: 48 }, 174: { old: 30, new: 47, time: 79, route: 47 }, 175: { old: 42, new: 46, time: 75, route: 46 }, 176: { old: 49, new: 51, time: 129, route: 51 }, 177: { old: 36, new: 38, time: 75, route: 38 }, 178: { old: 78, new: 78, time: 108, route: 59 }, 179: { old: 43, new: 43, time: 86, route: 36 }, 180: { old: 34, new: 35, time: 97, route: 35 } });
  write(ROOT + '/before.json', { createdAt: new Date().toISOString(), ruleVersion: lock.activeVersion, production: PRODUCTION, sourceText, sourceSha256: digest(sourceText), fixture: FIXTURE, fixtureText, fixtureSha256: digest(fixtureText), levels, campaignSha256: digest(levels), scores, changedIds: Object.keys(CHANGED).map(Number) });
  write(ROOT + '/route-witnesses.json', { ruleVersion: lock.activeVersion, rows });
  console.log(JSON.stringify({ status: 'PREPARED', before: ROOT + '/before.json', scores }));
} else if (mode === 'apply') {
  const before = read(ROOT + '/before.json');
  assert.equal(fs.readFileSync(PRODUCTION, 'utf8'), before.sourceText);
  const parsed = ts.createSourceFile(PRODUCTION, before.sourceText, ts.ScriptTarget.Latest, true);
  const edits = [];
  const propertyName = node => ts.isStringLiteral(node) || ts.isNumericLiteral(node) ? Number(node.text) : Number(node.getText(parsed));
  function visit(node) {
    if (ts.isPropertyAssignment(node) && CHANGED[propertyName(node.name)] && ts.isObjectLiteralExpression(node.initializer)) {
      const id = propertyName(node.name);
      const field = node.initializer.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(parsed) === 'preservedMoveTarget');
      if (field) { assert.equal(Number(field.initializer.getText(parsed)), before.scores[id].old); edits.push({ id, start: field.initializer.getStart(parsed), end: field.initializer.end, old: field.initializer.getText(parsed), next: String(CHANGED[id]) }); }
      else { const end = node.initializer.end - 1; edits.push({ id, start: end, end, old: '', next: `,\n    "preservedMoveTarget": ${CHANGED[id]}` }); }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(edits.length, Object.keys(CHANGED).length);
  let next = before.sourceText;
  for (const e of edits.sort((a, b) => b.start - a.start)) next = next.slice(0, e.start) + e.next + next.slice(e.end);
  assert.equal(digest(before.sourceText), before.sourceSha256);
  fs.writeFileSync(PRODUCTION, next);
  const fresh = (await loadApi()).api;
  for (const id of IDS) {
    const expected = structuredClone(before.levels[id - 1]);
    if (CHANGED[id]) expected.preservedMoveTarget = CHANGED[id];
    assert.deepEqual(fresh.LEVELS[id - 1], expected, 'Level ' + id);
  }
  assert.equal(fresh.LEVELS.length, 200);
  const rows = read(FIXTURE).rows;
  const packets = [];
  for (const id of Object.keys(CHANGED).map(Number)) {
    const row = rows.find(r => r.id === id);
    const level = fresh.LEVELS[id - 1];
    const route = replay(level, row.drags, fresh, { complete: true, requirePointerCompatible: true });
    assert.equal(route.effectiveDrags, CHANGED[id]);
    const packet = { level, drags: row.drags, levelSha256: digest(level), routeSha256: digest(row.drags), oldMoveTarget: before.scores[id].old, newMoveTarget: CHANGED[id], timeTargetSeconds: fresh.levelStarTargets(level).timeTargetSeconds, routeTotalDrags: row.drags.length, routeNonClearingDrags: row.upperBound, mode: 'formal-score-adjustment', mapAndGameplayUnchanged: true, routeOptimalityClaim: false };
    const file = `${ROOT}/packets/level${id}.json`; write(file, packet); packets.push({ id, file, sha256: digest(fs.readFileSync(file)), levelSha256: packet.levelSha256, routeSha256: packet.routeSha256, oldMoveTarget: packet.oldMoveTarget, newMoveTarget: packet.newMoveTarget, timeTargetSeconds: packet.timeTargetSeconds, totalDrags: packet.routeTotalDrags });
  }
  write(ROOT + '/applied.json', { status: 'PASS', ruleVersion: lock.activeVersion, production: PRODUCTION, sourceBeforeSha256: before.sourceSha256, sourceAfterSha256: digest(next), edits, changedIds: Object.keys(CHANGED).map(Number), targets: CHANGED, oldScoresPreservedInHistory: true, fixtureUnchanged: digest(fs.readFileSync(FIXTURE)) === before.fixtureSha256, packets });
  console.log(JSON.stringify({ status: 'PASS', changedIds: Object.keys(CHANGED).map(Number), packets }));
} else throw new Error('Use prepare or apply');
