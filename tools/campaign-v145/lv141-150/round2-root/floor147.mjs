import {compileSpatial,each,key,cleared} from '../../../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
// Stop at five actual clear/peel events in the full spatial graph. Every win
// must pass this goal. No inventory projection, identity quotient or forced
// removal is used: lift contents and their state words remain in every state.
export function check147Floor(level,api,{floor=5,maxStates=100000,maxMilliseconds=10000}={}){
 const result={thresholdProven:false,floor,goalClears:5,sourceLevelSha256:digest(level),abstraction:'full-inventory-unnormalized-spatial-prefix-clear5',allInventoryKept:true};let c;
 try{if(level.id!==147||floor!==5)throw Error('Only Lv147 L5');c=compileSpatial(level,api);}catch(e){return{...result,status:'unsupported',reason:e.message};}
 const start=Date.now(),nodes=[{s:c.initial,cost:0}],seen=new Map([[key(c.initial),0]]);let explored=0,transitions=0,stop;
 for(let pos=0;pos<nodes.length;pos++){
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const n=nodes[pos];if(seen.get(key(n.s))!==n.cost)continue;explored++;
  if(cleared(c,n.s)>=5)return{...result,status:'relaxed-shortcut',cost:n.cost,explored,transitions,states:seen.size,ms:Date.now()-start};
  each(c,n.s,(s,edge)=>{transitions++;const cost=n.cost+edge;if(cost>=floor)return;const k=key(s),old=seen.get(k);if(old!==undefined&&old<=cost)return;if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,cost);nodes.push({s,cost});});if(stop)break;
 }
 return{...result,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,stop,explored,states:seen.size,transitions,ms:Date.now()-start};
}
