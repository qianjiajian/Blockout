import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { ROOT, IDS, digest, writeNew, ruleGate, loadApi } from './common.mjs';
import { inspectDisjointData } from '../remake91to100-data-drift.mjs';

const bindings = {}, sha = p => digest(fs.readFileSync(p));
const read = p => { bindings[p] = sha(p); return JSON.parse(fs.readFileSync(p)); };
const completeFile = ROOT + '/complete.json', complete = read(completeFile);
assert.equal(complete.status, 'FORMAL_TEN_COMPLETE_WITH_PRESERVED_SCORE_CAVEATS');
const formal = read(complete.formalFile), integration = read(complete.integrationFile);
const supplementFile = ROOT + '/author175-177/assist172/final-adoption172-1790530838946.json';
const supplement = read(supplementFile);
assert.equal(supplement.status, 'FINAL_ADOPTED172_INDEPENDENT_CONTINUITY_AND_DUAL_POINTER_PASS');
const pointerFile = ROOT + '/pointer-1790530512359-320x568-63512/report.json', pointer = read(pointerFile);
const lock = ruleGate(); assert.equal(lock.activeVersion, '1.112.0');
const expectedParallel = {
  191: '4203a7dd5ce02f4dfe9f434c4d1a638ae603aa511b42d655dfda07de4995014f',
  196: 'ac798c77c0f3da226d43621fb6d2c3a6f30ab87a832395b0e9a8e2fe4f632da0'
};
const parseData = text => {
  const ast = ts.createSourceFile('module.ts', text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(ast) === 'reviewed');
  assert(declaration); return JSON.parse(declaration.initializer.getText(ast));
};
const changedBindings = new Map();
function verify(entries) {
  for (const [p, h] of Object.entries(entries)) {
    const current = sha(p);
    if (current !== h) {
      if (p === 'docs/rules/manifest.json') {
        const prior = JSON.parse(fs.readFileSync(path.join(pointer.sourceSnapshot, p)));
        const now = JSON.parse(fs.readFileSync(p));
        assert.equal(sha(path.join(pointer.sourceSnapshot, p)), pointer.bindings[p]);
        assert.equal(h, pointer.bindings[p]);
        assert.equal(prior.activeVersion, '1.111.0'); assert.equal(now.activeVersion, '1.112.0');
        assert.deepEqual(now.versions.slice(0, -1), prior.versions);
        assert.deepEqual({ ...now, activeVersion: prior.activeVersion, versions: prior.versions }, prior);
        assert.equal(now.versions.at(-1).version, '1.112.0');
        assert.equal(now.versions.at(-1).sha256, '66e9ef84593fb0c2c7c0bafbfc2dac3b60e973295087715c1f871d32cd5ef45d');
        changedBindings.set(p, { kind: 'Exact immutable v1.112 append; only191/196 acceptance', priorSha256: h, currentSha256: current });
      } else if (p === 'src/core/remake191to200.ts') {
        const oldText = fs.readFileSync(path.join(pointer.sourceSnapshot, p), 'utf8');
        assert.equal(digest(oldText), h);
        const pure = inspectDisjointData(p, IDS, oldText);
        const before = parseData(oldText), after = parseData(fs.readFileSync(p, 'utf8'));
        const changedIds = [...new Set([...Object.keys(before), ...Object.keys(after)])].map(Number).filter(id => JSON.stringify(before[id]) !== JSON.stringify(after[id]));
        for (const id of changedIds) { assert([191, 196].includes(id)); assert.equal(digest(after[id]), expectedParallel[id]); }
        changedBindings.set(p, { ...pure, changedIds, priorSha256: h });
      } else throw new Error('Unreviewed post-completion change: ' + p);
    }
    bindings[p] = current;
  }
}
verify(complete.bindings); verify(formal.bindings); verify(integration.bindings); verify(integration.immutableBindings);
verify(supplement.bindings);
for (const [p, h] of Object.entries(pointer.bindings)) assert.equal(sha(path.join(pointer.sourceSnapshot, p)), h, 'Captured input changed: ' + p);
verify(pointer.bindings);
const tree = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? tree(dir + '/' + e.name) : [dir + '/' + e.name]).sort();
for (const dir of ['src', 'public/assets/art']) assert.deepEqual(tree(dir), Object.keys(pointer.bindings).filter(p => p.startsWith(dir + '/')).sort());
const { api } = await loadApi(), fixture = read('tests/fixtures/remake171to180-v106.json');
assert.deepEqual(fixture.rows.map(r => r.id), IDS);
for (const f of fixture.rows) { assert.deepEqual(api.LEVELS[f.id - 1], f.level); assert.equal(digest(f.level), complete.rows.find(r => r.id === f.id).levelSha256); }
const changedCampaignIds = [];
for (const row of integration.stageRows) {
  const current = digest(api.LEVELS[row.id - 1]);
  if (current !== row.afterSha256) { assert([191, 196].includes(row.id)); assert.equal(current, expectedParallel[row.id]); changedCampaignIds.push(row.id); }
}
for (const [p, h] of Object.entries(bindings)) assert.equal(sha(p), h, 'Changed during review: ' + p);
bindings['tools/remake171-180/post-completion-continuity.mjs'] = sha('tools/remake171-180/post-completion-continuity.mjs');
ruleGate();
const out = ROOT + '/post-completion-continuity-' + Date.now() + '.json';
writeNew(out, { status: 'TEN_FORMAL_COMPLETE_POST_V112_CONTINUITY_PASS', createdAt: new Date().toISOString(),
  completeFile, formalFile: complete.formalFile, integrationFile: complete.integrationFile, supplementFile,
  activeRuleVersion: lock.activeVersion, taskRuleVersion: '1.106.0', ids: IDS,
  allTenFormalLevelsAndRoutesUnchanged: true, originalCompleteEvidencePreserved: true,
  priorTwentyNaturalLogsVerifiedBy: complete.formalFile, newTimingReplayPerformed: false,
  independentFinal172DualTimingReplay: supplementFile, changedBindings: [...changedBindings].map(([file, review]) => ({ file, ...review })),
  changedCampaignIds, currentCampaignSha256: digest(api.LEVELS), bindings,
  playerSaveTouched: false, packaged: false, released: false });
console.log(JSON.stringify({ out, changedCampaignIds, changedBindings: [...changedBindings.keys()] }));
