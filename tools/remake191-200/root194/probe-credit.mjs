import fs from 'node:fs';import assert from 'node:assert/strict';
import {ROOT,digest,writeNew,ruleGate} from '../common.mjs';
import {payload,native} from '../author194-196/floor-countdown.mjs';
ruleGate();const candidate=process.argv[2],d=JSON.parse(fs.readFileSync(candidate)),l=structuredClone(d.level);
assert.equal(l.generators.length,1);assert.equal(l.generators[0].queueBlockIds.length,1);assert(!l.blocks.some(b=>b.frozen||b.keyId||b.lockedBy));assert(!l.flipDoors?.length);
const q=l.generators[0].queueBlockIds[0],b=l.blocks.find(b=>b.id===q);assert(!b.layers?.length);
l.blocks=l.blocks.filter(b=>b.id!==q);delete l.generators;
for(const g of l.gates)if(g.frozen)g.frozen=Math.max(0,g.frozen-1);
for(const c of l.shutters){assert(c.count>1);c.count--;}
const {p}=payload(l,{floor:11,maxMilliseconds:1500,maxStates:100000});const result=native(p),out=ROOT+'/root194/credit-probe-'+Date.now()+'.json';
writeNew(out,{candidate,levelSha256:digest(d.level),projected:l,projectionSha256:digest(l),result,status:'DIAGNOSTIC_NOT_CERTIFIED',argument:'Remove sole ordinary queued body and machine, while precrediting one event to every gate and countdown curtain. Extra early body appearances remain inside areas previously wholly forbidden by covers; no body ice, locks, timed events, lifts or flips exist. This graph admits every original nonqueue gesture with no higher cost. A proof would still require independently checked compiler/model inclusion and complete original FIFO replay.',budget:{maxMilliseconds:1500,maxStates:100000}});console.log(JSON.stringify({out,status:result.status,shortcut:result.relaxedNonClearingDrags,states:result.discoveredStates}));
