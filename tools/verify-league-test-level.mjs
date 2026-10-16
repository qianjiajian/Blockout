import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {loadContinuationRuntime} from "./continuation211-runtime.mjs";
const output="deliverables/league-step4-20261001",p=JSON.parse(await readFile(`${output}/test-level-proof.json`,"utf8")),core=await loadContinuationRuntime(),level=p.level;
const sha=bytes=>createHash("sha256").update(bytes).digest("hex"),qualifications=[];
for(const path of ["deliverables/continue211-220-20260930/native-lift-qualification.json","deliverables/continue211-220-20260930/design-new/static-lift214-qualification.json","deliverables/continue211-220-20260930/design-new/fifo214-qualification-v4.json"]){const bytes=await readFile(path),q=JSON.parse(bytes);assert.equal(q.status,"PASS");for(const[file,expected]of Object.entries(q.codeSha256))assert.equal(sha(await readFile(file)),expected,`qualification drift ${file}`);qualifications.push({file:path,sha256:sha(bytes)});}
assert.equal(p.status,"PASS");assert.equal(p.lower.thresholdProven,true);assert.equal(p.replay.nonClearingDrags,20);
assert.equal(sha(JSON.stringify(level)),p.levelSha256);new core.PuzzleModel(level);
assert.deepEqual(core.auditRevisedMechanismContract(level),[]);
const blocks=[];
for(const b of level.blocks){const art=core.matchFormalBlockShape(b.shape,"native-only");assert(art&&art.quarterTurns===0,b.id);blocks.push({id:b.id,shapeId:art.shapeId,quarterTurns:0,color:b.color});}
const cells=b=>b.shape.map(([x,y])=>`${x+b.x},${y+b.y}`);
function fullCoverage(list,expected){const covered=list.flatMap(cells);assert.equal(new Set(covered).size,covered.length);assert.deepEqual(new Set(covered),new Set(expected));}
const initial=level.blocks.filter(b=>!b.shutterId);fullCoverage(initial,level.playable.map(([x,y])=>`${x},${y}`));
for(const cover of level.shutters??[]){const hidden=level.blocks.filter(b=>b.shutterId===cover.id);fullCoverage(hidden,Array.from({length:cover.width*cover.height},(_,i)=>`${cover.x+i%cover.width},${cover.y+Math.floor(i/cover.width)}`));}
const adjacent=[];for(let i=0;i<initial.length;i++)for(let j=i+1;j<initial.length;j++)if(initial[i].color===initial[j].color&&initial[i].shape.some(([x,y])=>initial[j].shape.some(([dx,dy])=>Math.abs(initial[i].x+x-initial[j].x-dx)+Math.abs(initial[i].y+y-initial[j].y-dy)===1)))adjacent.push([initial[i].id,initial[j].id]);assert.deepEqual(adjacent,[]);
await writeFile(`${output}/structure-art-qualification.json`,JSON.stringify({status:"PASS",levelSha256:p.levelSha256,blocks,openingCells:level.playable.length,hiddenCovers:level.shutters.length,adjacentSameColor:0,qualifications,note:"Disclosed reuse of 217 geometry; recolored independent data, no campaign loader or registry mutation"},null,2));console.log("PASS league level structure, full coverage, native art and current lower-bound qualifications");
