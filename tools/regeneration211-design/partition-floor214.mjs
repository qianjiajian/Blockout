import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{fifoPayload,runNativeFifo}from'./native-fifo214-cut.mjs';
import{staticFloor}from'./native-static219.mjs';
import{digest}from'../revised-preview-validation-v160.mjs';
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export function partitionFloor214(level,api,{prefixFloor=13,suffixFloor=3,maxMilliseconds=6000,maxStates=2000000}={}){
 assert.equal(level.id,214);assert.equal(level.shutters?.length,1);const co=level.shutters[0];assert.equal(co.skin,'lift');assert.equal(co.width*co.height,20);const hidden=level.blocks.filter(b=>b.shutterId===co.id);assert.equal(hidden.length,8);
 assert(hidden.every(b=>!b.frozen&&!b.keyId&&!b.lockedBy));assert(!(level.flipDoors?.length||level.coloredGrids?.length));assert(level.gates.every(g=>!g.frozen));
 const reduced=structuredClone(level);reduced.blocks=structuredClone(hidden).map(b=>{delete b.shutterId;return b});delete reduced.shutters;delete reduced.generators;reduced.mechanismRules='revised-2026-09-23-v1.4';
 const suffix=staticFloor(reduced,api,{floor:suffixFloor,maxMilliseconds:2000,maxStates:250000});
 let prefix;const {p,c}=fifoPayload(level,api,{floor:prefixFloor,maxMilliseconds,maxStates});assert.equal(c.covers[0].id,co.id);assert.equal(c.initial[c.N],65535,'Lift must initially be hidden');
 if(suffix.thresholdProven)prefix=runNativeFifo({...p,terminalCover:0});
 const passed=Boolean(prefix?.thresholdProven&&suffix.thresholdProven);
 const files=['tools/regeneration211-design/partition-floor214.mjs','tools/regeneration211-design/native-fifo214-cut.cs','tools/regeneration211-design/native-fifo214-cut.mjs','tools/regeneration211-design/native-static219.mjs','tools/continue221-230/author-hard20260930/native-lastcost32.cs','tools/regeneration211-design/fifo-witness214.mjs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'];
 return{status:passed?'LOWER_BOUND_PROVEN':'NOT_PROVEN',levelSha256:digest(level),lowerBound:passed?prefixFloor+suffixFloor:null,prefix,suffix,projection:reduced,projectionSha256:digest(reduced),codeSha256:Object.fromEntries(files.map(f=>[f,sha(f)])),qualificationFiles:['deliverables/continue211-220-20260930/design-new/fifo214-cut-qualification.json','deliverables/continue211-220-20260930/design-new/fifo214-dominance-qualification.json','deliverables/continue211-220-20260930/design-new/native219-qualification.json'],theorem:[
 'Partition any complete real route at the end of the gesture during which the sole lift first reveals. The prefix contains all gestures up to that boundary. The cost-nonincreasing delayed-FIFO/lift graph can perform the same prefix gestures and activate this lift at that boundary; the target-cover prefix certificate therefore lower-bounds the prefix parking cost. All queue bodies, predecessors and actual initial dispatches remain in this prefix graph.',
 'No hidden body has moved, peeled or cleared before its lift first reveals. At that instant all eight hidden bodies occupy their specified cells at their initial stages. Delete all non-hidden bodies, generators and the lift cover, leaving the exact board, shapes, full shell colors and all eight gates. Hidden ice, keys, flips and grids are excluded, and source gates are unfrozen. Each later real gesture on a hidden body remains possible in this projection with no greater parking cost; all later gestures on other bodies can be omitted.',
 'The prefix and subsequent hidden-body gestures are disjoint complete gestures. Their two valid lower bounds therefore add. Reveal during a held gesture does not double-count: that entire triggering gesture belongs to the prefix and cannot be performed on a still-hidden body. This proves only a necessary-parking lower bound; a complete strict real route and all other acceptance gates remain separately required.'
 ],solvabilityValidated:false,pointerValidated:false,timeValidated:false};
}
