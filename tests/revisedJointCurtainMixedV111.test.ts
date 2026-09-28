import {describe,it,expect} from 'vitest';
// @ts-expect-error Node-only Vitest fixture I/O; browser tsconfig intentionally has no Node types.
import fs from 'node:fs';
// @ts-expect-error Reviewed Node .mjs tool, executed directly by Vitest.
import {auditJointCurtainSource,verifyMixedCurtainCarriers} from '../tools/revised-joint-curtain-mixed-v111.mjs';
// @ts-expect-error Historical Node .mjs adapter remains unmodified.
import {auditJointCurtainSource as oldAudit} from '../tools/revised-joint-curtain-cohorts-v111.mjs';
const source=()=>JSON.parse(fs.readFileSync('.codex-temp/remaining98-v111/next44/source-observations-44.json','utf8'));
const level=(s:any)=>{const cargo=s.sourceGeneratorQueues.flat().map((b:any,i:number)=>({...b,id:'q'+i,shape:b.shape.map(([x,y]:number[])=>[x+2,y+1])})),blocks=[...Object.values(s.sourceCohorts).flat(),...cargo].map((b:any)=>({...b,layers:b.innerColor?[b.color,b.innerColor]:undefined}));return {blocks,generators:[{queueBlockIds:cargo.map((b:any)=>b.id)}]};};
describe('explicit joint-curtain + generator + numeric-ice source adapter',()=>{
 it('accepts all18 whole bodies, five ice carriers and ordered3cargo without mutation',()=>{const s=source(),before=JSON.stringify(s),a=auditJointCurtainSource(s);expect(a.allBodies).toHaveLength(18);expect(a.numericIceCarriers).toHaveLength(5);expect(a.orderedGeneratorQueues[0]).toHaveLength(3);expect(JSON.stringify(s)).toBe(before);});
 it('keeps old no-generator/no-ice adapter strict',()=>{expect(()=>oldAudit(source())).toThrow();});
 it('rejects omitted cargo instead of manufacturing a full count',()=>{const s=source();s.sourceGeneratorQueues[0].pop();expect(()=>auditJointCurtainSource(s)).toThrow();});
 it('rejects incorrect queue lengths',()=>{const s=source();s.sourceNormalizedFacts.mechanisms.generators.queueLengths=[2];expect(()=>auditJointCurtainSource(s)).toThrow();});
 it('rejects generated frozen cargo',()=>{const s=source();s.sourceGeneratorQueues[0][0].frozen=1;expect(()=>auditJointCurtainSource(s)).toThrow(/cargo/);});
 it('rejects hidden ice omitted or changed',()=>{const s=source();delete s.sourceCohorts.joint6.find((b:any)=>b.frozen).frozen;expect(()=>auditJointCurtainSource(s)).toThrow(/ice/);});
 it('rejects swapped ice/shell carrier despite equal global counts',()=>{const s=source();const a=s.sourceCohorts.opening.find((b:any)=>b.frozen===4),b=s.sourceCohorts.opening.find((b:any)=>b.frozen===1);a.frozen=1;b.frozen=4;expect(()=>auditJointCurtainSource(s)).toThrow(/association/);});
 it('rejects omitted cargo M11',()=>{const s=source();s.sourceNormalizedFacts.mechanisms.irregularBlocks.fullCount=2;expect(()=>auditJointCurtainSource(s)).toThrow(/M11/);});
 it('rejects unknown carrier fields and disconnected cargo',()=>{const s=source();s.sourceGeneratorQueues[0][0].star=true;expect(()=>auditJointCurtainSource(s)).toThrow(/property/);delete s.sourceGeneratorQueues[0][0].star;s.sourceGeneratorQueues[0][0].shape=[[0,0],[0,2]];expect(()=>auditJointCurtainSource(s)).toThrow(/Connected/);});
 it('still checks actual source region footprints and bound observations',()=>{const s=source();s.sourceCohorts.joint6[0].x=0;expect(()=>auditJointCurtainSource(s)).toThrow();});
 it('leaves source individual batch counts undefined',()=>{const s=source();auditJointCurtainSource(s);expect(s.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts).toBeNull();});
 it('checks actual candidate ordered cargo while permitting template offsets',()=>{const s=source(),l=level(s);expect(verifyMixedCurtainCarriers(l,s).passed).toBe(true);const ids=l.generators[0].queueBlockIds;[ids[0],ids[2]]=[ids[2],ids[0]];expect(()=>verifyMixedCurtainCarriers(l,s)).toThrow(/ordered/);});
 it('does not silently recolor a cargo',()=>{const s=source(),l=level(s);l.blocks.find((b:any)=>b.id===l.generators[0].queueBlockIds[0]).color='blue';expect(()=>verifyMixedCurtainCarriers(l,s)).toThrow(/ordered/);});
 it('rejects changed candidate ice/shell value association',()=>{const s=source(),l=level(s),a=l.blocks.find((b:any)=>b.frozen===4),b=l.blocks.find((b:any)=>b.frozen===1);a.frozen=1;b.frozen=4;expect(()=>verifyMixedCurtainCarriers(l,s)).toThrow(/association/);});
});
