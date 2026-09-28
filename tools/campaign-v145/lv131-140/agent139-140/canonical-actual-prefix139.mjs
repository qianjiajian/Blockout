import assert from'node:assert/strict';import{compileSpatial,each,assertStateMatches}from'./witness-domain.mjs';import{executeActualGesture}from'./repair-ordinary-fifo-prefix139.mjs';
// Keep every actual end state and cost, replacing only the chosen held path by
// the full-FIFO graph's representative so its strict prefix importer can read it.
export function canonicalActualPrefix(level,drags,api){const c=compileSpatial(level,api);let state=c.initial,model=new api.PuzzleModel(level);model.startCountdown();const canonical=[];
 for(const d of drags){model=executeActualGesture(model,d);assert(model);const snapshot=model.snapshot();let next,gesture;
  each(c,state,(s,k,get)=>{const e=get();if(e.blockId!==d.blockId||e.exitSide!==d.exitSide)return;
   if(!d.exitSide&&JSON.stringify(e.path.at(-1))!==JSON.stringify(d.path.at(-1)))return;
   try{assertStateMatches(c,s,snapshot);}catch{return;}next=s;gesture=e;return false;
  });assert(next,'No canonical graph edge for actual gesture '+canonical.length+' '+d.blockId);state=next;canonical.push(gesture);
 }
 const replay=api.replayRevisedRoute(level,canonical);assert(replay.valid);return{drags:canonical,replay};
}
