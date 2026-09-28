import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,save,digest,ruleGate} from './common.mjs';
import {project156,prove156} from './opening-projection156.mjs';
ruleGate();const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),r=prove156(d.level,d.drags);assert(r.proof.thresholdProven);
const tests=[];
for(const[name,change]of [['wrong-level',l=>l.id=155],['hidden',l=>l.shutters=[{id:'bad'}]],['star',l=>l.blocks[0].star=true],['shell',l=>l.blocks[0].layers=['red','blue']],['key',l=>l.blocks[0].keyId='x'],['timer',l=>l.blocks[0].timedBombSeconds=3],['axis',l=>l.blocks[0].movementAxis='horizontal'],['queue-ice',l=>l.blocks.find(b=>b.id===l.generators[0].queueBlockIds[0]).frozen=1],['duplicate-queue',l=>l.generators[1].queueBlockIds[0]=l.generators[0].queueBlockIds[0]],['star-gate',l=>l.flipDoors[0].star=true],['time-generator',l=>l.generators[0].trigger='time']]){
 const level=structuredClone(d.level);change(level);assert.throws(()=>project156(level,d.drags),name);tests.push({name,rejected:true});
}
const paths=['tools/remake151-160/opening-projection156.mjs','tools/remake151-160/qualify-opening156.mjs','tools/remake151-160/common.mjs','tools/remake131to140-axis-floor-v172.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs','src/core/PuzzleModel.ts','src/core/mechanismRules.ts',file];
const out=save('opening156-qualification',{passed:true,input:file,levelSha256:digest(d.level),routeSha256:digest(d.drags),proof:r.proof,projection:r.projection,negativeControls:tests,bindings:Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))])),scope:'Qualified restricted monotone relaxation; fresh L5 and original complete-route mapping. No claim of full-state generator search or minimum equality.'});console.log(JSON.stringify({out,states:r.proof.states,mappedU:r.projection.mapping.nonClearingDrags}));
