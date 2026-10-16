import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import {auditEventJson, createWechatEventLevelModules, evaluateEventSource, replaceEventArray, verifyEventModules} from '../scripts/wechat-event-level-data.mjs';
import {encodeLayoutBytes} from './wechat-layout-codec.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
let compilation;
const actual = () => compilation ??= createWechatEventLevelModules();

test('actual formal league 100 and production daily 450 preserve every field and query behavior', async () => {
  const result = await actual();
  const {report} = result;
  assert.equal(report.leagueCount, 100);
  assert.equal(report.dailyLevelCount, 450);
  assert.equal(report.dailyStageCount, 15);
  for (const name of ['exactDataEqual', 'exportSemanticsEqual', 'deepFreezeSemanticsEqual', 'mapIdentityPreserved',
    'lookupSemanticsEqual', 'assignmentIdentityPreserved', 'mutableCloneIsolationEqual', 'sourceInputsStable']) assert.equal(report[name], true, name);
  for (const module of report.modules) {
    assert.equal(module.undefinedFields, 0);
    assert.equal(module.referenceAliases, 0);
    assert.equal(module.authoredNonArraySourcePreserved, true);
    assert.equal(module.sourceSha256, hash(await readFile(module.path)));
    assert.equal(module.generatedModuleSha256, hash(result.sources[module.key]));
    assert.equal(result.replacements.get(resolve(module.path)).contents, result.sources[module.key]);
    assert.equal(result.replacements.get(resolve(module.path)).loader, 'ts');
    assert(module.packedBytes < module.jsonBytes / 2);
  }
  assert.equal(Object.isFrozen(result.compiled.league.LEAGUE_LEVELS), false);
  assert.equal(Object.isFrozen(result.compiled.daily.FORMAL_DAILY_CHALLENGE_CATALOG), true);
  for (const input of report.inputHashes) {
    assert.equal(input.before, input.after);
    assert.equal(input.after, hash(await readFile(input.path)));
  }
  const helperPath = 'src/core/clonePlainData.ts';
  assert(report.inputHashes.some(input => input.path === helperPath), 'Runtime clone helper must be input-bound');
  assert.equal(result.replacements.get(resolve(helperPath)).contents, await readFile(helperPath, 'utf8'));
});

test('JSON audit rejects silent JSON losses, aliases and cycles', () => {
  const shared = {x: 1}, cyclic = {}; cyclic.self = cyclic;
  const hidden = {}; Object.defineProperty(hidden, 'hidden', {value: 1});
  const getter = {}; Object.defineProperty(getter, 'x', {enumerable: true, get() { throw Error('must not invoke accessor'); }});
  const augmented = [1]; augmented.other = 2;
  for (const bad of [{u: undefined}, [undefined], {n: NaN}, {n: Infinity}, {n: -0}, {b: 1n}, {f() {}},
    {[Symbol('s')]: 1}, new Date(), new Map(), Object.create(null), [1, , 3], augmented, hidden, getter, cyclic, [shared, shared]]) {
    assert.throws(() => auditEventJson(bad));
  }
  assert.equal(auditEventJson({text: '\u0000雪😀\ud800', values: [null, true, 0, 3.5]}).jsonLegal, true);
});

test('AST replacement preserves every surrounding source byte and freeze wrapper', () => {
  const source = 'const freezeTree = x => x;\nexport const C = freezeTree([{"v":1}]);\nexport const lookup = () => C[0];\n';
  const packed = encodeLayoutBytes('[{"v":1}]');
  const replacement = replaceEventArray(source, 'C', 'freezeTree', packed);
  const {start, end} = replacement.replacedSpan;
  assert.equal(source.slice(start, end), '[{"v":1}]');
  assert.equal(replacement.source, replacement.preamble + source.slice(0, start) + replacement.replacement + source.slice(end));
  assert(replacement.source.includes('freezeTree(JSON.parse(decodeLayoutBytes('));
  for (const bad of ['export const C = [];\nconst decodeLayoutBytes = 1;', 'export const C = makeData();',
    'const C = [];', 'export const C = []; export const C = [];', 'import x from "external"; export const C = [];']) {
    assert.throws(() => replaceEventArray(bad, 'C', null, packed));
  }
  assert.throws(() => replaceEventArray('export const C = other([]);', 'C', 'freezeTree', packed));
});

test('semantic verifier refuses corrupted data, missing exports, shallow freeze and broken lookup/clone identities', async () => {
  const {original, compiled} = await actual();
  const league = structuredClone(compiled.league.LEAGUE_LEVELS);
  league[99].level.name += '__bad__';
  assert.throws(() => verifyEventModules(original, {...compiled, league: {...compiled.league, LEAGUE_LEVELS: league}}));
  const missing = {...compiled.daily}; delete missing.FORMAL_DAILY_CHALLENGE_REVISION;
  assert.throws(() => verifyEventModules(original, {...compiled, daily: missing}));
  const shallow = Object.freeze(structuredClone(compiled.daily.FORMAL_DAILY_CHALLENGE_CATALOG));
  assert.throws(() => verifyEventModules(original, {...compiled, daily: {...compiled.daily, FORMAL_DAILY_CHALLENGE_CATALOG: shallow}}));
  assert.throws(() => verifyEventModules(original, {...compiled, daily: {...compiled.daily,
    getFormalDailyChallengeCandidate: id => structuredClone(compiled.daily.getFormalDailyChallengeCandidate(id))}}));
  assert.throws(() => verifyEventModules(original, {...compiled, daily: {...compiled.daily,
    getFormalDailyChallengeLevel: id => compiled.daily.getFormalDailyChallengeCandidate(id)?.level}}));
});

test('runtime-import gate admits only the exact standalone named clone helper and preserves source bytes', () => {
  const packed = encodeLayoutBytes('[{"v":1}]');
  const allowed = 'import { clonePlainData } from "./clonePlainData";\nexport const C = [{"v":1}];\nexport const clone = () => clonePlainData(C);\n';
  const result = replaceEventArray(allowed, 'C', null, packed);
  const {start, end} = result.replacedSpan;
  assert.equal(result.source, result.preamble + allowed.slice(0, start) + result.replacement + allowed.slice(end));
  const rejected = [
    'import { clonePlainData as copy } from "./clonePlainData";',
    'import { clonePlainData as clonePlainData } from "./clonePlainData";',
    'import clonePlainData from "./clonePlainData";',
    'import clonePlainData, { other } from "./clonePlainData";',
    'import * as clonePlainData from "./clonePlainData";',
    'import { other } from "./clonePlainData";',
    'import { clonePlainData, other } from "./clonePlainData";',
    'import { clonePlainData } from "./clonePlainData.ts";',
    'import { clonePlainData } from "external";',
    'import "./clonePlainData";',
    'export { clonePlainData } from "./clonePlainData";',
    'export * from "./clonePlainData";',
    'const load = () => import("./clonePlainData");',
    'const load = path => import(path);',
    'const load = () => require("./clonePlainData");',
    'import helper = require("./clonePlainData");',
  ];
  for (const prefix of rejected) {
    assert.throws(() => replaceEventArray(`${prefix}\nexport const C = [{"v":1}];`, 'C', null, packed), undefined, prefix);
  }
});

test('in-memory event evaluation uses helper snapshot bytes and rejects unbound helper dependencies', async () => {
  const source = 'import { clonePlainData } from "./clonePlainData"; export const result = clonePlainData({ value: 42 });';
  const helper = 'export const clonePlainData = value => ({ ...value, source: "snapshot-fixture" });';
  assert.deepEqual((await evaluateEventSource(source, helper)).result, {value: 42, source: 'snapshot-fixture'});
  for (const dependency of ['import { x } from "./other";', 'import type { X } from "./other";',
    'export { x } from "./other";', 'const x = import("./other");', 'const x = require("./other");']) {
    await assert.rejects(evaluateEventSource(source, dependency + helper));
  }
  await assert.rejects(evaluateEventSource('import { clonePlainData } from "./other"; export const result = clonePlainData({});', helper));
});

test('all 450 compiled daily levels remain independent mutable clones without the structuredClone global', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');
  try {
    Object.defineProperty(globalThis, 'structuredClone', {value: undefined, configurable: true, writable: true});
    const {original, compiled} = await createWechatEventLevelModules();
    const result = verifyEventModules(original, compiled);
    assert.equal(result.dailyLevelCount, 450);
    assert.equal(result.mutableCloneIsolationEqual, true);
    assert.equal(typeof globalThis.structuredClone, 'undefined');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'structuredClone', descriptor);
    else delete globalThis.structuredClone;
  }
});
