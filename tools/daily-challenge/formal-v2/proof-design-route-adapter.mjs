import {canonicalExit} from './proof-scheduled-route.mjs';

/** Choose the body/colour correspondence retaining more of each old footprint.
 * Partition geometry is unchanged; this is candidate construction, not proof.
 */
export function alignRetiledIdentities(level,source,ids) {
  if(ids.length!==2)return false;
  const pair=ids.map(id=>level.blocks.find(b=>b.id===id)),old=ids.map(id=>source.blocks.find(b=>b.id===id));
  if(pair.some(b=>!b)||old.some(b=>!b))return false;
  const cells=b=>new Set(b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`));
  const overlap=(a,b)=>[...cells(a)].filter(p=>cells(b).has(p)).length;
  if(overlap(pair[0],old[1])+overlap(pair[1],old[0])<=overlap(pair[0],old[0])+overlap(pair[1],old[1]))return false;
  const [a,b]=pair,identity={id:a.id,color:a.color};a.id=b.id;a.color=b.color;b.id=identity.id;b.color=identity.color;
  return true;
}

/** Bounded constructive witness only. Re-route held drags to an old anchor or
 * legal first-contact exit on the actual new plain puzzle. Never certifies L.
 * A removed body is skipped in the remaining template. Final canonical replay
 * is mandatory even when every local adaptation succeeded.
 */
export function adaptPlainRoute(runtime,level,template,{maxMilliseconds=1200,maxNodes=6000}={}) {
  const started=Date.now();let nodes=0;
  try {
    runtime.assertPlainProofDomain(level);
    let model=new runtime.PuzzleModel(level);model.startCountdown();const drags=[];
    for(const old of template){
      if(model.snapshot().complete)break;
      const body=model.getBlock(old.blockId);if(!body)continue;
      const target=old.exitSide?null:old.path.at(-1);
      if(target&&target[0]===body.x&&target[1]===body.y)continue;
      const initial=model.clone();initial.beginAction();
      const queue=[{model:initial,path:[],previous:undefined}],seen=new Set();let choice;
      for(let at=0;at<queue.length;at++){
        if(++nodes>maxNodes||Date.now()-started>=maxMilliseconds)throw new Error('finite-adapter-budget');
        const node=queue[at],held=node.model.getBlock(old.blockId),pos=[held.x,held.y];
        const automatic=canonicalExit(runtime,node.model,old.blockId,node.previous);
        if(automatic){
          if(!node.model.tryExit(old.blockId,automatic).ok||!node.model.commitAction())throw new Error('adapter-exit');
          choice={model:node.model,drag:{blockId:old.blockId,path:node.path,exitSide:automatic}};break;
        }
        if(target&&node.path.length&&target[0]===held.x&&target[1]===held.y){
          if(!node.model.commitAction())throw new Error('adapter-commit');
          choice={model:node.model,drag:{blockId:old.blockId,path:node.path}};break;
        }
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
          const next=[held.x+dx,held.y+dy],key=`${next}:${pos}`;
          if(seen.has(key))continue;seen.add(key);
          const moved=node.model.clone();moved.beginAction();if(moved.moveBlockStep(old.blockId,...next))queue.push({model:moved,path:[...node.path,next],previous:pos});
        }
      }
      if(!choice)throw new Error(`no-adapted-gesture:${old.blockId}`);
      model=choice.model;drags.push(choice.drag);
    }
    const replay=runtime.replayRevisedRoute(level,drags);
    return{status:replay.valid&&replay.complete?'witness':'incomplete',drags,replay,nodes,elapsedMilliseconds:Date.now()-started};
  }catch(error){return{status:'unknown',reason:error.message,nodes,elapsedMilliseconds:Date.now()-started};}
}
