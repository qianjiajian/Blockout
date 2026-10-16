import assert from 'node:assert/strict';

export const VERSION='missing-last-eligible-portal-soft-penalty-v1';
const integer=(x,min,max)=>assert(Number.isSafeInteger(x)&&x>=min&&x<=max,'Finite geometry outside penalty domain');

/** Coordinate metadata only; does not build a LevelSpec, move bodies or claim
 * reachability. The caller supplies the unchanged session's BEFORE-work charge
 * callback. Every loop item, lookup, bit operation and stored fragment is paid
 * before use. One mask is a local footprint, never a complete dynamic world.
 *
 * Prepare once per targetOrder call. Scores count identity IDs, not colors or
 * gates: an already blocked missing body costs zero; a body retaining any free
 * eligible portal costs zero. Ordinary bodies may use ordinary AND star gates.
 * No candidate is discarded. The original forward/held audits remain decisive.
 */
export function prepareMissingPortalPenalty({level,inventory,insertingBody,charge}){
 assert.equal(typeof charge,'function');const pay=(n,label,micro=0)=>charge(n,micro,'missing-portal-'+label);
 pay(1,'prepare');integer(level.width,1,8);integer(level.height,1,8);assert(level.width*level.height<=64);
 assert(Array.isArray(inventory)&&inventory.length>=1&&inventory.length<=17);assert(Array.isArray(level.blocks)&&level.blocks.length<inventory.length);assert(Array.isArray(level.gates)&&level.gates.length<=10);
 assert(!(level.blocked?.length)&&!(level.seams?.length),'Normal mask only');
 const W=level.width,H=level.height,byId=new Map(),present=new Set(),gates=[],openByMissing=[];let occupied=0n;
 function shapeInfo(atom){
  pay(1,'shape');assert(typeof atom.id==='string'&&atom.id.length);assert(typeof atom.color==='string');assert(atom.star===undefined||typeof atom.star==='boolean');assert(Array.isArray(atom.shape)&&atom.shape.length>=1&&atom.shape.length<=6);
  const cells=[],seen=new Set();let width=0,height=0;
  for(const p of atom.shape){pay(4,'shape-cell');assert(Array.isArray(p)&&p.length===2);integer(p[0],0,2);integer(p[1],0,2);const k=p[0]+3*p[1];assert(!seen.has(k));seen.add(k);cells.push([p[0],p[1]]);width=Math.max(width,p[0]+1);height=Math.max(height,p[1]+1);}
  assert.equal(cells.length,width*height,'Unrotated solid rectangle only');return{id:atom.id,color:atom.color,star:atom.star??false,cells,width,height};
 }
 function footprint(shape,x,y,label){
  pay(1,label+'-anchor');integer(x,0,W-shape.width);integer(y,0,H-shape.height);let mask=0n;
  for(const [dx,dy]of shape.cells){pay(3,label+'-cell');mask|=1n<<BigInt((y+dy)*W+x+dx);}
  return mask;
 }
 for(const atom of inventory){pay(3,'inventory-body');const shape=shapeInfo(atom);assert(!byId.has(atom.id));byId.set(atom.id,shape);}
 pay(1,'insert-id');const inserted=byId.get(insertingBody.id);assert(inserted,'Inserting identity must belong to fixed inventory');
 pay(1,'insert-shape');assert.equal(insertingBody.color,inserted.color);assert.equal(insertingBody.star??false,inserted.star);assert.equal(insertingBody.shape.length,inserted.cells.length);
 for(let i=0;i<inserted.cells.length;i++){pay(1,'insert-shape-cell');assert.deepEqual(insertingBody.shape[i],inserted.cells[i]);}
 for(const body of level.blocks){
  pay(4,'present-body');const shape=byId.get(body.id);assert(shape&&!present.has(body.id));present.add(body.id);assert.equal(body.color,shape.color);assert.equal(body.star??false,shape.star);assert.equal(body.shape.length,shape.cells.length);
  for(let i=0;i<shape.cells.length;i++){pay(1,'present-shape-cell');assert.deepEqual(body.shape[i],shape.cells[i]);}
  const mask=footprint(shape,body.x,body.y,'occupied');pay(2,'occupied-union');assert.equal(mask&occupied,0n,'Overlapping current footprints');occupied|=mask;
 }
 pay(1,'insert-absent');assert(!present.has(inserted.id),'Target scorer adds an absent identity only');
 if(level.playable){pay(1,'mask');assert.equal(level.playable.length,W*H);const cells=new Set();for(const p of level.playable){pay(3,'mask-cell');assert(Array.isArray(p)&&p.length===2);integer(p[0],0,W-1);integer(p[1],0,H-1);cells.add(p[1]*W+p[0]);}assert.equal(cells.size,W*H);}
 for(const gate of level.gates){pay(2,'gate');assert(typeof gate.id==='string'&&gate.id.length);assert(['top','bottom','left','right'].includes(gate.side));assert(gate.star===undefined||typeof gate.star==='boolean');assert((gate.frozen??0)===0,'No frozen portals in this scorer');integer(gate.offset,0,7);integer(gate.size,1,3);assert(gate.offset+gate.size<=(['top','bottom'].includes(gate.side)?W:H));gates.push({color:gate.color,side:gate.side,offset:gate.offset,size:gate.size,star:gate.star??false});}
 for(const shape of byId.values()){
  pay(2,'missing-id');if(shape.id===inserted.id||present.has(shape.id))continue;
  const open=[];let eligibleAnchors=0;
  for(const gate of gates){
   pay(1,'eligibility');if(gate.color!==shape.color||(shape.star&&!gate.star))continue;
   pay(1,'cross-section');const horizontal=gate.side==='top'||gate.side==='bottom',span=horizontal?shape.width:shape.height;
   for(let offset=gate.offset;offset<=gate.offset+gate.size-span;offset++){
    pay(1,'portal-anchor',1);assert(++eligibleAnchors<=3,'Reviewed portal-anchor envelope exceeded');
    const x=horizontal?offset:gate.side==='left'?0:W-shape.width,y=horizontal?(gate.side==='top'?0:H-shape.height):offset;
    const mask=footprint(shape,x,y,'portal');pay(1,'portal-empty');if((mask&occupied)===0n){pay(1,'open-portal-store');open.push(mask);}
   }
  }
  if(open.length){pay(1,'open-id-store');openByMissing.push(open);}
 }
 return Object.freeze({
  scoreAt(position){
   pay(1,'score',1);assert(Array.isArray(position)&&position.length===2);const mask=footprint(inserted,position[0],position[1],'proposed');pay(1,'proposed-empty');assert.equal(mask&occupied,0n,'Proposed endpoint overlaps current occupancy');let closed=0;
   for(const portals of openByMissing){pay(1,'score-id');let remains=false;for(const portal of portals){pay(1,'score-intersection');if((portal&mask)===0n){remains=true;break;}}if(!remains){pay(1,'closed-id');closed++;}}
   return closed;
  },
  interpretation:'soft ordering only; geometric last-entry loss, not reachability, feasibility or difficulty',
 });
}

/** Optional comparator for exactly the reviewed six-key ordering. Native
 * stable sort can call this; every inspected scalar comparison is charged.
 * Existing target creation/sort bookkeeping remains the caller's charge.
 */
export function compareMissingPortalTargetKeys(a,b,charge){
 assert.equal(typeof charge,'function');charge(1,0,'missing-portal-sort-entry');assert(a.length===6&&b.length===6);
 for(let i=0;i<6;i++){charge(1,0,'missing-portal-sort-scalar');assert(Number.isFinite(a[i])&&Number.isFinite(b[i]));if(a[i]!==b[i])return a[i]-b[i];}
 return 0;
}
