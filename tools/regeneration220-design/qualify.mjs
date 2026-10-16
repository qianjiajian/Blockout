import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {proveSymmetric} from './prove-symmetric.mjs';
const api=await loadSpatialApi(),results=[];
for(let seed=0;seed<64;seed++){
 const level={id:220,name:'normalizer-qualification',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'super',width:3,height:3,timeSeconds:210,reward:20,gates:[{id:'r',side:'left',offset:1,size:2,color:'red'},{id:'b',side:'right',offset:0,size:3,color:'blue',frozen:seed%3}],shutters:[{id:'s',x:0,y:0,width:3,height:1,count:1+seed%3}],blocks:Array.from({length:9},(_,i)=>({id:'b'+i,x:i%3,y:Math.floor(i/3),shape:[[0,0]],color:((seed>>i%6)&1)?'red':'blue',...(i<3?{shutterId:'s'}:{}),...(i===3&&seed%4===0?{layers:['red','blue'],color:'blue'}:{})}))};
 for(let floor=1;floor<=3;floor++){
  const original=searchSpatial(level,api,{floor,prove:true,maxMilliseconds:1500,maxStates:100000,maxTransitions:2000000}),quotient=proveSymmetric(level,api,{floor,maxMilliseconds:1500,maxStates:100000}),normalized=proveSymmetric(level,api,{floor,maxMilliseconds:1500,maxStates:100000,normalizeMonotone:true});
  if(original.status==='unknown'||quotient.status==='unknown'||normalized.status==='unknown'){results.push({seed,floor,status:'INCOMPLETE',original,quotient,normalized});continue;}
  assert.notEqual(original.status,'unsupported',JSON.stringify(original));assert.notEqual(quotient.status,'unsupported',JSON.stringify(quotient));assert.equal(quotient.thresholdProven,original.thresholdProven,`symmetry seed${seed} floor${floor}`);assert.equal(normalized.thresholdProven,original.thresholdProven,`normalizer seed${seed} floor${floor}`);results.push({seed,floor,status:'PASS',original:original.status,quotient:quotient.status,normalized:normalized.status});
 }
}
fs.writeFileSync('deliverables/continue211-220-20260930/design220-new/normalizer-qualification.json',JSON.stringify({status:results.some(r=>r.status!=='PASS')?'INCOMPLETE':'PASS',cases:results.length,results},null,2));console.log('qualified',results.length,'incomplete',results.filter(r=>r.status!=='PASS').length);
