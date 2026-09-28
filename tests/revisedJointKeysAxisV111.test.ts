import {describe,it,expect} from 'vitest';
// @ts-expect-error Node-only audit fixture; browser tsconfig intentionally excludes node types.
import fs from 'node:fs';
// Tools remain explicit, immutable-versioned adapters rather than runtime changes.
// @ts-expect-error Node audit module is exercised by Vitest; no production declaration is required.
import {auditJointKeyAxisSource,verifyJointKeyAxisCarriers} from '../tools/revised-joint-keys-axis-v111.mjs';
// @ts-expect-error Historical Node audit module intentionally has no browser declaration.
import {auditJointKeySource} from '../tools/revised-joint-key-cohorts-v111.mjs';
const source=()=>JSON.parse(fs.readFileSync('.codex-temp/remaining98-v111/next99/source-review-99.json','utf8'));
const bodyLevel=(s:any)=>({blocks:Object.values(s.sourceCohorts).flat().map((b:any)=>({...b,layers:b.innerColor?[b.color,b.innerColor]:undefined}))});
describe('joint keys plus independent axes explicit extension',()=>{
 it('accepts source99 observed 26-body ledger and its independent vertical axis',()=>{
  const s=source();expect(auditJointKeyAxisSource(s).axisSignature).toEqual([{axis:'vertical',shell:false}]);
  expect(verifyJointKeyAxisCarriers(bodyLevel(s),s).passed).toBe(true);
 });
 it('old key-only adapter still rejects positive axis without modification',()=>{expect(()=>auditJointKeySource(source())).toThrow(/axis/);});
 it('rejects key/axis same source carrier even when global counts conserved',()=>{
  const s=source(),bs=s.sourceCohorts.opening;delete bs.find((b:any)=>b.movementAxis).movementAxis;bs.find((b:any)=>b.keyId).movementAxis='vertical';expect(()=>auditJointKeyAxisSource(s)).toThrow(/co-carrier/);
 });
 it('rejects lock/axis same source carrier',()=>{const s=source(),bs=s.sourceCohorts.opening;delete bs.find((b:any)=>b.movementAxis).movementAxis;bs.find((b:any)=>b.lockedBy).movementAxis='vertical';expect(()=>auditJointKeyAxisSource(s)).toThrow(/co-carrier/);});
 it('rejects key/axis same candidate carrier',()=>{const s=source(),l=bodyLevel(s);delete l.blocks.find((b:any)=>b.movementAxis).movementAxis;l.blocks.find((b:any)=>b.keyId).movementAxis='vertical';expect(()=>verifyJointKeyAxisCarriers(l,s)).toThrow(/co-carrier/);});
 it('rejects omitted or changed candidate axis',()=>{const s=source(),l=bodyLevel(s);l.blocks.find((b:any)=>b.movementAxis).movementAxis='horizontal';expect(()=>verifyJointKeyAxisCarriers(l,s)).toThrow(/direction/);delete l.blocks.find((b:any)=>b.movementAxis).movementAxis;expect(()=>verifyJointKeyAxisCarriers(l,s)).toThrow(/direction/);});
 it('rejects source count mismatch',()=>{const s=source();s.sourceNormalizedFacts.mechanisms.axisBlocks.count=2;expect(()=>auditJointKeyAxisSource(s)).toThrow(/carriers/);});
 it('rejects shell reassociation',()=>{const s=source(),l=bodyLevel(s);l.blocks.find((b:any)=>b.movementAxis).layers=['green','blue'];expect(()=>verifyJointKeyAxisCarriers(l,s)).toThrow(/association/);});
 it('preserves old no-axis source behavior and signatures',()=>{const s=source();for(const b of s.sourceCohorts.opening)delete b.movementAxis;s.sourceNormalizedFacts.mechanisms.axisBlocks={count:0,axes:[]};const old=auditJointKeySource(s),next=auditJointKeyAxisSource(s);expect(next).toEqual({...old,axisSignature:[]});});
 it('new source loader is byte equivalent apart from explicit audited helper import',()=>{
  const old=fs.readFileSync('tools/revised-design-review-joint-keys-v111.mjs','utf8').replace(/\r/g,'').trim();
  const next=fs.readFileSync('tools/revised-design-review-joint-keys-axis-v111.mjs','utf8').replace(/\r/g,'').trim();
  expect(next).toBe(old.replace('auditJointKeySource as auditJointCurtainSource','auditJointKeyAxisSource as auditJointCurtainSource').replace("'./revised-joint-key-cohorts-v111.mjs'","'./revised-joint-keys-axis-v111.mjs'"));
 });
 it('new design adapter preserves old verification plumbing except explicit imports',()=>{
  const old=fs.readFileSync('tools/revised-design-policy-joint-keys-v111.mjs','utf8').replace(/\r/g,'').trim(),next=fs.readFileSync('tools/revised-design-policy-joint-keys-axis-v111.mjs','utf8').replace(/\r/g,'').trim();
  expect(next).toBe(old.replace("'./revised-design-review-joint-keys-v111.mjs'","'./revised-design-review-joint-keys-axis-v111.mjs'").replace('auditJointKeySource as auditJointCurtainSource,verifyJointKeyCarriers','auditJointKeyAxisSource as auditJointCurtainSource,verifyJointKeyAxisCarriers as verifyJointKeyCarriers').replace("'./revised-joint-key-cohorts-v111.mjs'","'./revised-joint-keys-axis-v111.mjs'"));
 });
});
