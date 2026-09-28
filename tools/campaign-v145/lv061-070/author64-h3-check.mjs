import fs from 'node:fs';
import {loadApi} from '../../remake21to30-v120.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {checkSymmetryFloor} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-symmetry-floor.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64',base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv061-070/root64/purple-source-preserved64-1790256786266.json')),tilings=JSON.parse(fs.readFileSync(dir+'/adaptation-tilings64-1790256841125.json')),{api}=await loadApi();
const reports=[];
for(const [i,packing] of tilings.cases.find(c=>c.purpleKind==='H3').packings.entries()){
 const level=structuredClone(base.level);level.blocks=level.blocks.filter(b=>!b.id.endsWith('added-cover5-1'));level.blocks.find(b=>b.id.endsWith('cover-5-3')).shape=[[0,0],[1,0],[2,0]];
 for(const row of packing){const b=level.blocks.find(b=>b.shutterId?.endsWith('cover-5')&&b.color===row.color);b.x=row.x;b.y=row.y+6;}
 const witness=search(level,{floor:11,maxStates:400000,maxMilliseconds:3000,orderSeed:i});
 const proof=checkSymmetryFloor(level,{floor:11,maxStates:1200000,maxMilliseconds:10000});
 const report={variant:i,level,levelSha256:digest(level),packing,witness,proof,replay:witness.status==='witness'?api.replayRevisedRoute(level,witness.drags):null};reports.push(report);console.log(JSON.stringify({variant:i,witness:witness.status,proof:proof.status,states:proof.discoveredStates}));
}
const out=`${dir}/h3-single-body-check64-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({scope:'Only four exhaustive H3 alternatives for the fixed selected 4x3 curtain area, other layout and gates held fixed. UNKNOWN never proves no solution.',reports},null,2));console.log(out);
