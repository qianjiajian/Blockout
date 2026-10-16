import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertStaticStarStockIds, SELF, VERSION } from './static-star-stock-ids-v1.mjs';

const TEST = 'tools/daily-challenge/formal-v4/static-star-stock-ids-v1.metadata.test.mjs';
const SOURCE = {
  path: 'deliverables/daily-formal-v4-20261008/design/star-source200-stock-declaration-01/source-200.json',
  sha256: 'e3de97f9a290c17e871b7dfb48cdd273e4b9e37c3a8dff7ac6ae5da4e6b4e7ee',
};
const OUT = 'deliverables/daily-formal-v4-20261008/proof/static-star-stock-ids-private-01';
const sha = value => createHash('sha256').update(value).digest('hex');
const files = {}, tests = [];
async function read(file, expected) {
  const absolute = path.resolve(file), bytes = await fs.readFile(absolute), hash = sha(bytes);
  if (expected) assert.equal(hash, expected);
  files[absolute] = hash;
  return bytes;
}
function fails(stock, code, crossEntity) {
  const before = JSON.stringify(stock);
  let caught;
  try { assertStaticStarStockIds(stock); } catch (error) { caught = error; }
  assert(caught); assert.equal(caught.code, code);
  if (crossEntity !== undefined) assert.equal(caught.details.crossEntity, crossEntity);
  assert.equal(JSON.stringify(stock), before);
  return { code: caught.code, message: caught.message, details: caught.details };
}
function test(name, fn) { tests.push({ name, ...fn(), passed: true }); }

await fs.mkdir(OUT, { recursive: false });
try {
  const sourceBytes = await read(SOURCE.path, SOURCE.sha256);
  const declaration = JSON.parse(sourceBytes), stock = declaration.recipes[0];
  await read(SELF); await read(TEST);

  test('nonempty-string IDs in both classes', () => {
    let refusals = 0;
    for (const kind of ['inventory', 'gates']) {
      for (const id of [undefined, null, 0, '', ' \t\n']) {
        fails({ inventory: [], gates: [], [kind]: [{ id }] }, 'STATIC_STAR_STOCK_INVALID_ID');
        refusals++;
      }
    }
    return { refusals };
  });
  test('inventory duplicates', () => ({ refusal: fails({ inventory: [{ id: 'b' }, { id: 'b' }], gates: [] }, 'STATIC_STAR_STOCK_DUPLICATE_ID', false) }));
  test('gate duplicates', () => ({ refusal: fails({ inventory: [], gates: [{ id: 'g' }, { id: 'g' }] }, 'STATIC_STAR_STOCK_DUPLICATE_ID', false) }));
  test('cross-class duplicate', () => ({ refusal: fails({ inventory: [{ id: 'same' }], gates: [{ id: 'same' }] }, 'STATIC_STAR_STOCK_DUPLICATE_ID', true) }));

  const realConflicts = stock.inventory.flatMap((body, inventoryIndex) => stock.gates.flatMap((gate, gateIndex) => body.id === gate.id ? [{ id: body.id, inventoryIndex, gateIndex }] : []));
  assert.deepEqual(realConflicts.map(row => row.id).sort(), ['star200-blue-normal', 'star200-blue-star', 'star200-pink-normal', 'star200-pink-star']);
  const realRefusal = fails(stock, 'STATIC_STAR_STOCK_DUPLICATE_ID', true);
  test('actual sealed input refuses before history/model callback spies', () => {
    const called = { history: 0, model: 0 };
    function metadataHarness() {
      assertStaticStarStockIds(stock);
      called.history++; // spies only; there is no history reader or model here.
      called.model++;
    }
    assert.throws(metadataHarness, { code: 'STATIC_STAR_STOCK_DUPLICATE_ID' });
    assert.deepEqual(called, { history: 0, model: 0 });
    return { source: SOURCE, conflicts: realConflicts, refusal: realRefusal, callbackSpiesInvoked: called, productionEntryWired: false };
  });
  test('distinct entity prefixes pass without changing original metadata', () => {
    const original = JSON.stringify(stock);
    const idsOnly = {
      inventory: stock.inventory.map((_, i) => Object.freeze({ id: `body-${i}` })),
      gates: stock.gates.map((_, i) => Object.freeze({ id: `gate-${i}` })),
    };
    Object.freeze(idsOnly.inventory); Object.freeze(idsOnly.gates); Object.freeze(idsOnly);
    const result = assertStaticStarStockIds(idsOnly);
    assert.deepEqual(result, { version: VERSION, inventoryCount: 17, gateCount: 10, totalIds: 27, uniqueIds: 27 });
    assert.equal(JSON.stringify(stock), original);
    return { syntheticIdsOnly: true, result, originalDeclarationChanged: false };
  });

  const diagnostic = {
    status: 'READONLY_SEALED_INPUT_GLOBAL_ID_CONFLICTS', source: SOURCE,
    actualCrossEntityConflicts: realConflicts, firstGuardRefusal: realRefusal,
    method: 'Read original unpositioned inventory and gates; compare exact id strings. No LevelSpec or model is built.',
    sourceRewritten: false, productionEntryWired: false, newModels: 0, newSearches: 0, newWorlds: 0,
  };
  const diagnosticPath = path.join(OUT, 'actual-input-diagnostic.json');
  await fs.writeFile(diagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n', { flag: 'wx' });
  await read(diagnosticPath);
  for (const [file, hash] of Object.entries(files)) assert.equal(sha(await fs.readFile(file)), hash);
  const report = {
    status: 'STATIC_STAR_STOCK_ID_METADATA_TESTS_PASS', version: VERSION,
    testedGroups: tests.length, tests, diagnostic: { path: diagnosticPath, sha256: files[path.resolve(diagnosticPath)] },
    fileBindings: files, bindingWorkingDirectory: process.cwd(), productionEntryWired: false,
    scope: 'ID-only preflight and metadata refusal order; no production construction/shape/solvability qualification.',
    errors: [], newModels: 0, newConstructions: 0, newSearches: 0, newReplayCalls: 0, publicClaimsStarted: 0, historyConsumed: false,
    oldFilesChanged: false,
  };
  const reportPath = path.join(OUT, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report: { path: reportPath, sha256: sha(await fs.readFile(reportPath)) }, diagnostic: report.diagnostic, tests: tests.length, tool: { path: SELF, sha256: files[path.resolve(SELF)] }, test: { path: TEST, sha256: files[path.resolve(TEST)] } }));
} catch (error) {
  await fs.writeFile(path.join(OUT, 'failure.json'), JSON.stringify({ status: 'METADATA_TEST_FAILED', error: error.stack, newModels: 0, newSearches: 0 }, null, 2) + '\n', { flag: 'wx' });
  throw error;
}
