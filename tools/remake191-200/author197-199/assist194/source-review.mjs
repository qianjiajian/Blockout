import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from '../../replay.mjs';
import {digest,writeNew,ruleGate,auditSpatial} from '../../common.mjs';
ruleGate();
const file=process.argv[2]??'deliverables/remake191-200-20260927/author197-199/assist194/candidate194-1790526106520-27432.json',d=JSON.parse(fs.readFileSync(file)),l=d.level;
const sourceFile='deliverables/remake191-200-20260927/author194-196/source194-1790525381700.json',source=JSON.parse(fs.readFileSync(sourceFile));
for(const f of source.frames)assert.equal(digest(fs.readFileSync(f.file)),f.sha256);
const sources=[...source.opening.pieces,...source.curtains.find(c=>c.id==='c5').pieces,...source.joint7Inventory.pieces,...source.curtains.find(c=>c.id==='c10').pieces,...source.generator.queue];
const idOf=s=>s.sourceId.startsWith('o')?'o-'+s.sourceId.slice(1):s.sourceId.startsWith('c7-')?(Number(s.sourceId.slice(3))<3?'c7a-'+s.sourceId.slice(3):'c7b-'+(Number(s.sourceId.slice(3))-3)):s.sourceId;
const changes=sources.map(s=>{const b=l.blocks.find(b=>b.id===idOf(s));assert(b,s.sourceId);assert.equal(b.layers?.length??1,s.layers?.length??1);if(s.layers)assert.equal(b.layers[1],s.layers[1]);return{source:s,designed:b,colorChanged:s.color!==b.color,shapeChanged:JSON.stringify(s.shape)!==JSON.stringify(b.shape),positionAuthored:true};});
assert.equal(changes.length,31);assert.equal(new Set(changes.map(x=>x.designed.id)).size,31);assert.equal(l.blocks.length,31);
assert.equal(l.blocks.filter(b=>b.layers).length,2);assert.equal(l.blocks.filter(b=>b.shutterId==='c10').length,13);assert.equal(l.blocks.filter(b=>b.shutterId==='c5').length,2);assert.equal(l.blocks.filter(b=>['c7a','c7b'].includes(b.shutterId)).length,5);
assert.deepEqual(l.shutters.map(c=>[c.id,c.count]).sort(),[['c10',10],['c5',5],['c7a',7],['c7b',7]].sort());
assert.deepEqual(l.gates.map(g=>[g.color,g.frozen??0]).sort(),source.gates.map(g=>[g.color,g.ice]).sort());
for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
for(const b of l.blocks)for(const k of ['frozen','keyId','lockedBy','lockCount','movementAxis','timedBombSeconds','star','rotationBadge'])assert.equal(b[k],undefined);
assert.equal(l.generators.length,1);assert.deepEqual(l.generators[0].queueBlockIds,['q-orange']);assert.equal(l.blocks.find(b=>b.id==='q-orange').color,'orange');
const {api}=await loadApi(),m=new api.PuzzleModel(l);m.startCountdown();
const fifo=[],events=[];let head=0,spawned=0,queueCleared=0;
const record=(step,phase,unit)=>{const s=m.snapshot(),g=s.generators[0];if(g.head!==head){assert.equal(head,0);assert.equal(g.head,1);const q=m.getBlock('q-orange');assert(q);assert.deepEqual([q.x,q.y],l.generators[0].spawn);assert(s.shutters.find(c=>c.id==='c10').revealed);spawned++;fifo.push({step,phase,unit,cleared:s.cleared,head:g.head,remaining:g.remaining,spawn:[q.x,q.y],snapshot:s});head=g.head;}};
for(const[i,drag]of d.drags.entries()){
 const before=m.snapshot();m.beginAction();for(const [j,p]of drag.path.entries()){assert(m.moveBlockStep(drag.blockId,...p));record(i+1,'unit-step',j+1);}
 if(drag.exitSide){assert(m.tryExit(drag.blockId,drag.exitSide).ok);record(i+1,'exit',null);if(drag.blockId==='q-orange')queueCleared++;}
 assert(m.commitAction());record(i+1,'commit',null);const after=m.snapshot();events.push({step:i+1,blockId:drag.blockId,clearDelta:after.cleared-before.cleared,cleared:after.cleared,queueHead:after.generators[0].head,queueRemaining:after.generators[0].remaining});
}
assert.equal(spawned,1);assert.equal(queueCleared,1);assert(m.snapshot().complete);assert.equal(m.snapshot().cleared,33);assert.equal(m.snapshot().generators[0].remaining,0);
const out='deliverables/remake191-200-20260927/author197-199/assist194/source-review-'+Date.now()+'.json';
writeNew(out,{status:'SOURCE_INVENTORY_AND_FIFO_PASS_SPLIT_QUALIFICATION_PENDING',candidate:file,levelSha256:digest(l),routeSha256:digest(d.drags),sourceFile,sourceFileHash:digest(fs.readFileSync(sourceFile)),changes,geometryDifferences:{opening:{sourceCells:21,designedCells:l.blocks.filter(b=>!b.shutterId&&b.id!=='q-orange').reduce((n,b)=>n+b.shape.length,0)},c10:{sourceBodyCells:44,sourceRegion48IncludesMachineVoid:true,designedCells:l.blocks.filter(b=>b.shutterId==='c10').reduce((n,b)=>n+b.shape.length,0)},c7:'Source joint10cell stock has orangeSQ2 crossing both count7 strips. Design preserves all five source identities but adapts orangeSQ2→V2 and two H2→H3 so independent8cell/2cell regions fill exactly. Source sourceId→designId mapping explicit; no extra stock inferred.'},sourceCaveats:{opening:source.opening.pristineStatus,shellOuter:{...source.sourceColorCaveat,design:'Current c10-7 uses green→purple as an explicit v1.108 color adaptation; observed outer source blue/cyan remains ambiguous.'},authoredColor:'All current shell outer colors are explicitly adapted; purple cores and two shell identities preserved.'},spatial:auditSpatial(l,api),replay:replay(l,d.drags,api,{complete:true,requirePointerCompatible:true}),fifo,events,qualificationToolHash:digest(fs.readFileSync('tools/remake191-200/author197-199/assist194/source-review.mjs')),lowerBoundStatus:'PREFIX8_TAIL3_INDEPENDENT_QUALIFICATION_PENDING',formalAdopted:false,pointerValidated:false,naturalClockValidated:false});
console.log(out);


