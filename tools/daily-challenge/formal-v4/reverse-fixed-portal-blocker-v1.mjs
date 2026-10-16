import assert from 'node:assert/strict';

export const VERSION='committed-reverse-fixed-exit-all-entry-blocker-v1';
const integer=(n,min,max)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,'Finite fixed-portal coordinate domain');

/** Coordinate fragments only. This does not construct a level, replay an edge,
 * or prove game unsolvability. Its caller must establish an already committed,
 * successfully audited and popped inverse-graph node AFTER suffix restoration.
 * Existing bodies at any eligible own exit are fixed only in that caller's
 * insertion/parking operation domain. A temporary immobility or omitted top-2
 * parking candidate is never fixed evidence. Every new loop item, lookup and
 * coordinate operation is charged BEFORE use through the original session.
 */
export function inspectFixedPortalBlocker({width,height,bodies,inventory,gates,charge}){
 assert.equal(typeof charge,'function');
 const pay=(n,label,micro=0)=>charge(n,micro,'fixed-portal-'+label);
 pay(1,'begin');integer(width,1,8);integer(height,1,8);assert(width*height<=48);
 assert(Array.isArray(inventory)&&inventory.length>0&&inventory.length<=17);
 assert(Array.isArray(bodies)&&bodies.length<=inventory.length);
 assert(Array.isArray(gates)&&gates.length>0&&gates.length<=10);
 const stock=new Map(),present=new Map(),gateRows=[],fixed=[],occupied=new Map(),fixedCells=new Map();
 function shape(atom){
  pay(1,'shape');assert(typeof atom.id==='string'&&atom.id.length);assert(typeof atom.color==='string'&&atom.color.length);
  assert(atom.star===undefined||typeof atom.star==='boolean');assert((atom.frozen??0)===0);assert(!atom.layers||(atom.layers.length===1&&atom.layers[0]===atom.color));
  assert(Array.isArray(atom.shape)&&atom.shape.length>=1&&atom.shape.length<=6);let w=0,h=0;const cells=[],seen=new Set();
  for(const p of atom.shape){pay(4,'shape-cell');assert(Array.isArray(p)&&p.length===2);integer(p[0],0,2);integer(p[1],0,2);const k=p[0]+3*p[1];assert(!seen.has(k));seen.add(k);w=Math.max(w,p[0]+1);h=Math.max(h,p[1]+1);cells.push([p[0],p[1]]);}
  assert.equal(cells.length,w*h,'Normalized solid q0 rectangle required');return{id:atom.id,color:atom.color,star:atom.star??false,w,h,cells};
 }
 for(const body of inventory){pay(2,'inventory');assert(!stock.has(body.id));stock.set(body.id,shape(body));}
 for(const body of bodies){
  pay(4,'present');const atom=stock.get(body.id);assert(atom&&!present.has(body.id));assert.equal(body.color,atom.color);assert.equal(body.star??false,atom.star);assert.equal(body.shape.length,atom.cells.length);assert((body.frozen??0)===0);assert(!body.layers||(body.layers.length===1&&body.layers[0]===body.color));
  integer(body.x,0,width-atom.w);integer(body.y,0,height-atom.h);
  for(let i=0;i<atom.cells.length;i++){pay(4,'present-cell');assert.deepEqual(body.shape[i],atom.cells[i]);const[dx,dy]=atom.cells[i],k=(body.y+dy)*width+body.x+dx;assert(!occupied.has(k));occupied.set(k,body.id);}
  present.set(body.id,{...atom,x:body.x,y:body.y});
 }
 pay(1,'complete-inventory-check');
 if(present.size===stock.size)return{prunable:false,reason:'inventory-complete-first-full-priority',fixedBodyIds:[],blockedMissingBodyId:null,blockedPortals:[]};
 const gateIds=new Set();
 for(const gate of gates){
  pay(3,'gate');assert(typeof gate.id==='string'&&gate.id.length&&!gateIds.has(gate.id));gateIds.add(gate.id);assert(!stock.has(gate.id),'Joint body/gate identity collision');assert(typeof gate.color==='string'&&gate.color.length);assert(['top','bottom','left','right'].includes(gate.side));assert(gate.star===undefined||typeof gate.star==='boolean');assert((gate.frozen??0)===0&&!gate.portals?.length,'Static nonportal gates only');
  integer(gate.offset,0,7);integer(gate.size,1,3);assert(gate.offset+gate.size<=(gate.side==='top'||gate.side==='bottom'?width:height));gateRows.push({id:gate.id,color:gate.color,side:gate.side,offset:gate.offset,size:gate.size,star:gate.star??false});
 }
 for(const body of present.values()){
  pay(1,'fixed-candidate');let fixedAt=null;
  for(const gate of gateRows){
   pay(2,'own-gate-test');if(gate.color!==body.color||(body.star&&!gate.star))continue;
   const horizontal=gate.side==='top'||gate.side==='bottom',offset=horizontal?body.x:body.y,span=horizontal?body.w:body.h;
   if(offset>=gate.offset&&offset+span<=gate.offset+gate.size&&(gate.side==='top'?body.y===0:gate.side==='bottom'?body.y+body.h===height:gate.side==='left'?body.x===0:body.x+body.w===width)){fixedAt=gate.id;break;}
  }
  if(fixedAt){pay(1,'fixed-store');fixed.push(body.id);for(const[dx,dy]of body.cells){pay(2,'fixed-cell');fixedCells.set((body.y+dy)*width+body.x+dx,body.id);}}
 }
 if(!fixed.length)return{prunable:false,reason:'no-proven-fixed-bodies',fixedBodyIds:[],blockedMissingBodyId:null,blockedPortals:[]};
 for(const body of stock.values()){
  pay(2,'missing-body');if(present.has(body.id))continue;
  const blockedPortals=[];let anchors=0,free=false;
  for(const gate of gateRows){
   pay(1,'missing-eligibility');if(gate.color!==body.color||(body.star&&!gate.star))continue;
   pay(1,'missing-span');const horizontal=gate.side==='top'||gate.side==='bottom',span=horizontal?body.w:body.h;
   for(let offset=gate.offset;offset<=gate.offset+gate.size-span;offset++){
    pay(1,'missing-anchor',1);assert(++anchors<=3,'Reviewed eligible-anchor envelope exceeded');
    const x=horizontal?offset:gate.side==='left'?0:width-body.w,y=horizontal?(gate.side==='top'?0:height-body.h):offset;
    let blocker=null;
    for(const[dx,dy]of body.cells){pay(2,'missing-footprint-cell');const id=fixedCells.get((y+dy)*width+x+dx);if(id){blocker=id;break;}}
    if(blocker){pay(1,'blocked-anchor-store');blockedPortals.push({gateId:gate.id,position:[x,y],fixedBodyId:blocker});}else free=true;
   }
  }
  assert(anchors>0,'Missing body has no fitting eligible portal: outside reviewed stock domain');
  if(!free)return{prunable:true,reason:'every-eligible-entry-intersects-fixed-own-exit-body',fixedBodyIds:fixed,blockedMissingBodyId:body.id,blockedPortals};
 }
 return{prunable:false,reason:'each-missing-body-retains-an-entry-not-blocked-by-proven-fixed-bodies',fixedBodyIds:fixed,blockedMissingBodyId:null,blockedPortals:[]};
}
