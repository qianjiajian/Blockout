import fs from 'node:fs';
import {loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),api=await loadSpatialApi(),m=new api.PuzzleModel(c.level);m.startCountdown();
console.log(c.level.shutters);console.log(c.level.blocks.filter(b=>!b.shutterId).map(b=>({id:b.id.replace('r171-123-',''),color:b.color,x:b.x,y:b.y,shape:b.shape.length,key:b.keyId})));
for(const [i,d]of c.drags.entries()){const before=m.snapshot();m.beginAction();for(const p of d.path)m.moveBlockStep(d.blockId,...p);if(d.exitSide)m.tryExit(d.blockId,d.exitSide);m.commitAction();const after=m.snapshot();const reveal=after.shutters.filter(s=>s.revealed&&!before.shutters.find(x=>x.id===s.id).revealed);if(reveal.length||after.cleared===before.cleared)console.log({step:i+1,block:d.blockId,cleared:after.cleared,cost:after.cleared===before.cleared?1:0,reveal:reveal.map(s=>s.id),from:d.path[0],to:d.path.at(-1)});}
