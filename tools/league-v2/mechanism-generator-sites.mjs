import {applyNativeDrag} from '../daily-challenge/formal-v2/mechanism-decorate.mjs';
const cells=b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`);
const SHAPES=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]];

/** Real plain-route geometry only; zero complete-board search. Each entire
 * native footprint includes the centre mouth, first becomes free after two
 * removals, remains free along every later original microstep, and leaves at
 * least two original bodies in play. FIFO runtime is verified separately. */
export function findRouteSafeGeneratorBirths(runtime,level,drags){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const states=[];
 const add=(drag,step)=>{const s=model.snapshot();states.push({drag,step,cleared:s.cleared,remaining:s.blocks.length,occupied:new Set(s.blocks.flatMap(cells))});};add(-1,0);
 for(const [i,d]of drags.entries()){
  model.beginAction();for(const [j,p]of d.path.entries()){if(!model.moveBlockStep(d.blockId,...p))throw Error('base route microstep rejected');add(i,j+1);}
  if(d.exitSide){if(!model.tryExit(d.blockId,d.exitSide).ok)throw Error('base exit rejected');add(i,d.path.length+1);}
  if(!model.commitAction())throw Error('base route commit rejected');
 }
 const playable=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).map(p=>p.join(',')));for(const p of level.blocked??[])playable.delete(p.join(','));
 const sites=[];
 for(const side of ['top','right','bottom','left']){
  const vertical=side==='left'||side==='right',length=vertical?level.height:level.width;
  for(let offset=1;offset<length-1;offset++){
   if(level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;
   const center=side==='top'?[offset,0]:side==='bottom'?[offset,level.height-1]:side==='left'?[0,offset]:[level.width-1,offset];
   const rails=[-1,0,1].map(v=>vertical?`${center[0]},${center[1]+v}`:`${center[0]+v},${center[1]}`);if(rails.some(p=>!playable.has(p)))continue;
   for(const shape of SHAPES)for(const [sx,sy]of shape){
    const x=center[0]-sx,y=center[1]-sy,keys=shape.map(([dx,dy])=>`${x+dx},${y+dy}`);
    if(keys.some(p=>!playable.has(p)))continue;
    if(shape.some(([dx,dy])=>vertical?Math.abs(y+dy-offset)>1||Math.abs(x+dx-center[0])>2:Math.abs(x+dx-offset)>1||Math.abs(y+dy-center[1])>2))continue;
    const free=states.findIndex(s=>keys.every(k=>!s.occupied.has(k)));if(free<0)continue;
    const state=states[free];if(state.cleared<2||state.remaining<2||states.slice(free+1).some(s=>keys.some(k=>s.occupied.has(k))))continue;
    const block={id:`route-safe-generator-${side}-${offset}-${x}-${y}-${shape.length}`,x,y,shape,color:level.gates[0].color};
    const mount={side,offset,rimSpan:3,rimMount:'rim',spawn:[x,y]};
    sites.push({block,mount,firstFreeDrag:state.drag+1,firstFreeStep:state.step,clearsBeforeBirth:state.cleared,remainingOriginalBodies:state.remaining,neverReenteredByOriginalRoute:true});
   }
  }
 }
 return {sites,plainMicroSnapshots:states.length,fullBoardSearch:false};
}
