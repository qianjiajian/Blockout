import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditLeagueStatic,levelSha256} from './proof-contract.mjs';
import {loadLeagueSourceAdaptationRuntime,describeLeagueSourceAdaptation,auditLeagueAdaptedSource,inspectUnsearchedStaticRejection,claimStaticSourceRepair} from './proof-source-adaptation.mjs';

const runtime=await loadLeagueSourceAdaptationRuntime();
const candidate=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/mechanisms/batch-1791393208024/0042-index-008.mechanism.json','utf8'));
const source=runtime.LEVELS.find(l=>l.id===candidate.sourceLevelId);
const previousFile='deliverables/league-v2-20261008/mechanisms/proof-attempts/49e67afe317c8fa9fff8116af28de5189116042828f1047207b77dc107a26ef9.result.json';
const oldBytes=await fs.readFile(previousFile),previous=JSON.parse(oldBytes);
const sha=b=>createHash('sha256').update(b).digest('hex');

test('source187 contour is explicitly 56→55 with actual exterior cut [3,0], no invented source identity',()=>{
  const audit=describeLeagueSourceAdaptation(source,candidate.level);
  assert.equal(audit.passed,true);assert.deepEqual(audit.cutCells,[[3,0]]);assert.deepEqual(audit.addedCells,[]);
  assert.equal(audit.sourceCellCount,56);assert.equal(audit.targetCellCount,55);assert.equal(audit.sourceLevelSha256,levelSha256(source));assert.equal(audit.targetLevelSha256,candidate.levelSha256);
  assert(audit.connected&&audit.allCutsExterior&&audit.leftRightSymmetric);assert.equal(audit.upDownSymmetric,false);
});

test('source adapter rejects holes, disconnected masks, internal walls, growth and non-source bounds',()=>{
  const cases=[
    ['adaptation-cut-created-interior-hole',l=>l.playable=l.playable.filter(([x,y])=>!(x===3&&y===3))],
    ['adaptation-disconnected-playable-space',l=>l.playable=l.playable.filter(([x])=>x!==3)],
    ['adaptation-does-not-allow-internal-walls',l=>l.blocked=[[0,0]]],
    ['adaptation-bounding-dimensions-changed',l=>l.width++],
    ['adaptation-added-cells-outside-template',l=>l.playable.push([-1,0])],
    ['adaptation-mask-has-no-axis-symmetry',l=>l.playable=l.playable.filter(([x,y])=>!(x===0&&y===0))],
  ];
  for(const [expected,mutate]of cases){const level=structuredClone(candidate.level);mutate(level);const a=describeLeagueSourceAdaptation(source,level);assert.equal(a.passed,false);assert(a.errors.includes(expected),expected);}
});

test('only fixed-mask issue is removed; all filled space/art/source checks stay active',async()=>{
  const original=await auditLeagueStatic(runtime,candidate);assert.deepEqual(original.issues,['mainline-board-baseline-mismatch']);
  const corrected=await auditLeagueAdaptedSource(runtime,candidate);assert.equal(corrected.passed,true);assert.deepEqual(corrected.removedInheritedIssues,['mainline-board-baseline-mismatch']);
  assert.equal(corrected.opening.passed,true);assert.equal(corrected.hidden.passed,true);assert(Object.keys(corrected.assetBindings).length>0);
  const hole=structuredClone(candidate);hole.level.blocks.pop();const missing=await auditLeagueAdaptedSource(runtime,hole);assert.equal(missing.passed,false);assert(missing.issues.includes('opening-not-filled-or-overlapping'));
  const unknown={...candidate,sourceLevelId:99999};const noSource=await auditLeagueAdaptedSource(runtime,unknown);assert.equal(noSource.passed,false);assert(noSource.issues.includes('source-not-in-mainline-LEVELS'));
  assert.equal(sha(await fs.readFile(previousFile)),sha(oldBytes));
});

test('zero-search exception rejects every searched/UNKNOWN, other static error and changed object',()=>{
  assert.deepEqual(inspectUnsearchedStaticRejection(previous,candidate,source),[]);
  for(const mutate of [p=>p.status='UNKNOWN_LOWER',p=>p.lowerBound={result:{status:'unknown',rawFullBoardStates:10000}},p=>p.route={search:{discoveredStates:1}},p=>p.route={search:null},p=>p.L=21,p=>p.reasons.push('missing-art'),p=>p.accepted=true,p=>p.level.blocks[0].x++,p=>p.sourceLevelSha256='0'.repeat(64)]){
    const p=structuredClone(previous);mutate(p);assert(inspectUnsearchedStaticRejection(p,candidate,source).length>0);
  }
});

test('repair request is exclusive, advances only original lineage, preserves original FAIL bytes',async t=>{
  const parent=path.resolve('deliverables/league-v2-20261008/proof/tests');await fs.mkdir(parent,{recursive:true});const dir=await fs.mkdtemp(path.join(parent,'source-static-repair-fixture-'));
  t.after(async()=>{const relative=path.relative(parent,dir);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await fs.rm(dir,{recursive:true,force:true});});
  const file=path.join(dir,previous.attempt.id+'.result.json');await fs.writeFile(file,oldBytes);
  await fs.writeFile(path.join(dir,previous.attempt.id+'.request.json'),JSON.stringify(previous.attempt));
  await fs.writeFile(path.join(dir,previous.attempt.attemptKey+'.latest.json'),JSON.stringify(previous.attempt));
  await assert.rejects(()=>claimStaticSourceRepair(runtime,candidate,{previousReceipt:file,previousReceiptSha256:'0'.repeat(64)}),/file changed/);
  const context=await claimStaticSourceRepair(runtime,candidate,{previousReceipt:file,previousReceiptSha256:sha(oldBytes)});
  assert.equal(context.repair.upperSearchStates,0);assert.equal(context.repair.lowerSearchStates,0);assert.equal(context.attempt.id,previous.attempt.id+'.static-source-repair-v1');
  await context.ledger.finish(context.attempt,{accepted:false,status:'UNKNOWN_LOWER'});
  await assert.rejects(()=>claimStaticSourceRepair(runtime,candidate,{previousReceipt:file,previousReceiptSha256:sha(oldBytes)}),/consumed or lineage advanced/);
  assert.equal(sha(await fs.readFile(file)),sha(oldBytes));assert.equal(JSON.parse(await fs.readFile(file)).status,'REJECTED_STATIC');
});
