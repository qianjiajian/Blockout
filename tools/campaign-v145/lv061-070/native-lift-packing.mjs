import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),catalog=api.FORMAL_BLOCK_SHAPES;
const shapeIds={V3:[3],H3:[9],H2:[8],SQ2:[7],L3:[4],T4:[6],SINGLE:[1],V2:[2],S4:[5],Z4:[11],L4:[10],L4B:[19],H4:[15]};
function exhaustive(kinds,w,h){let nodes=0,solutions=0;const used=new Set(),todo=kinds.map((kind,i)=>({kind,i}));
 function visit(){nodes++;if(!todo.length){if(used.size===w*h)solutions++;return;}
  let p=0;while(used.has(p))p++;const px=p%w,py=Math.floor(p/w);
  for(let j=0;j<todo.length;j++){const b=todo[j];for(const id of shapeIds[b.kind]){const shape=catalog.find(s=>s.shapeId===id).cells;for(const [ax,ay]of shape){const x=px-ax,y=py-ay,positions=shape.map(([dx,dy])=>[x+dx,y+dy]);if(positions.some(([x,y])=>x<0||y<0||x>=w||y>=h||used.has(y*w+x)))continue;todo.splice(j,1);positions.forEach(([x,y])=>used.add(y*w+x));visit();positions.forEach(([x,y])=>used.delete(y*w+x));todo.splice(j,0,b);}}}
 }visit();return {kinds,width:w,height:h,nodes,solutions,exhaustive:true,budgetPruning:false};}
const tests=[{id:66,source:exhaustive(['V3','SQ2','L3','T4','SINGLE'],5,3),adapted:exhaustive(['V3','SQ2','L3','SQ2','SINGLE'],5,3)},
 {id:67,source:exhaustive(['V2','L3','T4'],3,3),adapted:exhaustive(['V2','L3','SQ2'],3,3)}];
for(const t of tests){assert.equal(t.source.solutions,0);t.alternatives=['S4','Z4','L4','L4B','H4'].map(k=>exhaustive(t.source.kinds.map(x=>x==='T4'?k:x),t.source.width,t.source.height));}
tests[1].expandedAlternatives=['V3','H3'].map(k=>exhaustive(['V2','L3','T4',k],3,4));
tests[0].selected=tests[0].alternatives.find(a=>a.kinds.includes('L4'));
tests[1].selected=exhaustive(['V2','H2','T4','SINGLE'],3,3);
for(const t of tests)assert(t.selected.solutions>0);
const report={passed:true,rule:'Every whole block must match native q0 artwork. Shape class statistics do not override actual footprint.',tests,changedCarriers:[{id:66,source:'red T4 ice5',target:'red L4 ice5'},{id:67,source:'green L3',target:'two independent green bodies H2+SINGLE'}],
 minimality:'Original q0 inventory has0tilings.66 changes one same-area carrier to L4, preserving red/ice5/layer.67 splits one3-cell green carrier into independently movable H2+SINGLE while keeping yellowT4/blueV2 and the9-cell region. The replacement blocks have separate IDs, not a stitched artwork. This does not prove uniqueness among all one-body adaptations.',
 inputs:{'src/game/formalBlockShapes.ts':digest(fs.readFileSync('src/game/formalBlockShapes.ts'))}};
const out='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/native-hidden-packing.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,tests}));
