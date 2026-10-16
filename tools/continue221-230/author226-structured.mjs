import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {tile,recolor,rng,api} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';import {verifyRulesLock} from '../verify-rules-lock.mjs';import {floor226} from './floor226.mjs';
assert(verifyRulesLock().ok);const out=path.resolve('deliverables/continue221-230-20260930/author226-structured');fs.mkdirSync(out,{recursive:true});
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),S=rect(1,1),H2=rect(2,1),V2=rect(1,2),Q2=rect(2,2),Q3=rect(3,3),L3=[[0,0],[0,1],[1,1]],ignore=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const mode=process.argv[4]??'cores';
function make(seed){const R=rng(seed),small=['source','onecore'].includes(mode),locks=mode==='locks'||small,W=mode==='thin'?3:7,H=mode==='thin'?18:small?8:10,spawn=mode==='thin'?[1,0]:[2,0],cells=rect(W,H).filter(([x,y])=>!locks||!([0,6].includes(x)&&[0,H-1].includes(y))),pins=mode==='thin'?{'l226-b1':[1,0]}:locks?{'l226-b1':[2,0],'l226-b5':[0,1],'l226-b7':[5,1],'l226-b0':[0,H-4],'l226-b2':[mode==='onecore'?5:4,H-4]}:{'l226-b1':[2,0],'l226-b5':[0,7],'l226-b7':[4,7]};
 const spec=Array.from({length:25},(_,i)=>({id:'l226-b'+i,color:'red',shape:mode==='thin'?(i<5?Q2:i<14?H2:i<20?V2:S):(i===1||i===5||i===7?Q3:i===24?S:(i+seed)%4===0?H2:V2)}));
 if(mode==='thin')spec[24].shape=V2;
 if(locks)for(let i=0;i<25;i++)spec[i].shape=[0,2].includes(i)?Q3:[1,5,7].includes(i)?Q2:small?([3,4].includes(i)?(seed%2?V2:H2):S):i>=21?S:(i+seed)%4===0?H2:V2;
 if(mode==='onecore'){spec[2].shape=Q2;for(const i of [6,8,9,10,11])spec[i].shape=(i+seed)%3===0?H2:V2;}
 Object.assign(spec[0],{color:'green',lockedBy:'red',lockCount:1});Object.assign(spec[1],{color:'red',layers:['red','blue'],frozen:17});Object.assign(spec[2],{color:'yellow',lockedBy:'blue',lockCount:2});Object.assign(spec[5],{color:'blue',layers:['blue','red']});Object.assign(spec[7],{color:'red',layers:['red','green']});spec[6].keyId='blue';spec[8].keyId='red';spec[20].keyId='blue';
 const blocks=tile(spec,cells,{seed,maxNodes:7000,pins,preferLarge:false});if(!blocks)return null;
 const colorPins={'l226-b0':'green','l226-b1':'red','l226-b2':'yellow','l226-b5':'blue','l226-b7':'red'};
 if(!recolor(blocks,['red','yellow','cyan','blue','green'],{seed,pins:colorPins,filter:(b,c)=>b.id in colorPins||['red','yellow','cyan'].includes(c)||(Number(b.id.slice(6))+seed)%5===0}))return null;
 const ports=mode==='thin'?['left','right'].flatMap(s=>[0,3,6,9,12,15].map(o=>[s,o,3])):locks?[['top',4,2],['bottom',1,2],['bottom',3,3],...['left','right'].flatMap(s=>[1,small?4:5].map(o=>[s,o,3]))]:[['top',0,2],['top',5,2],['bottom',0,3],['bottom',4,3],...['left','right'].flatMap(s=>[0,3,7].map(o=>[s,o,3]))];
 const fits=(p,b)=>{const[s,o,z]=p,w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;return s==='top'?b.y===0&&b.x>=o&&b.x+w<=o+z:s==='bottom'?b.y+h===H&&b.x>=o&&b.x+w<=o+z:s==='left'?b.x===0&&b.y>=o&&b.y+h<=o+z:b.x+w===W&&b.y>=o&&b.y+h<=o+z;};
 const starters=blocks.filter(b=>['red','yellow'].includes(b.color)&&!b.frozen&&!b.lockedBy&&ports.some(p=>fits(p,b))),starter=R.shuffle(starters)[0];if(!starter)return null;
 const first=R.shuffle(ports.filter(p=>fits(p,starter)))[0],chosen=[first,...R.shuffle(ports.filter(p=>p!==first))],gates=[starter.color,starter.color==='red'?'yellow':'red','cyan','blue','green'].map((color,i)=>({id:'l226-g-'+color,color,side:chosen[i][0],offset:chosen[i][1],size:chosen[i][2],...([0,0,3,12,18][i]?{frozen:[0,0,3,12,18][i]}:{})}));
 if(mode!=='thin'&&gates.some(g=>(locks?['red','blue','green','yellow']:['red','blue','green']).includes(g.color)&&g.size<3))return null;
 const queue=['blue','yellow','blue'].map((color,i)=>({id:'l226-q'+i,color,shape:i===1?L3:V2,x:spawn[0],y:spawn[1]}));
 return{id:226,name:'钥匙与补货',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',width:W,height:H,playable:cells,timeSeconds:180,reward:200,parMoves:31,preservedMoveTarget:48,blocks:[...blocks,...queue],gates,generators:[{id:'l226-machine',side:'top',offset:spawn[0],size:2,spawn,queueBlockIds:queue.map(b=>b.id)}],mechanismAdaptation:{userAuthorized:'221–230有限换色换形重生成',change:'保25开局+3FIFO、3壳、数冰17、3钥匙、红锁1蓝锁2、冰门3/12/18。源体必要换形与颜色原创重排，布局家族 '+mode+'，队列蓝V2黄原向L3蓝V2。'}};
}
const start=Number(process.argv[2]??1),count=Math.min(1000,Number(process.argv[3]??300)),records=[],deadline=Date.now()+240000;let accepted;
for(let seed=start;seed<start+count&&Date.now()<deadline;seed++){
 const level=make(seed);if(!level){records.push({seed,status:'CONSTRUCTION_REJECTED'});continue;}const row={seed,sha256:digest(level)};
 try{const issues=[...api.auditRevisedCandidate(level).issues.filter(i=>!ignore.has(i.code)),...api.auditCandidateBlockArt(level).issues];if(issues.length){row.status='STATIC_REJECTED';row.issues=issues;}else{row.route=searchSpatial({...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'},api,{floor:16,maxStates:25000,maxMilliseconds:1400,maxTransitions:500000,orderSeed:seed%28});row.status=row.route.status;
 if(row.route.status==='witness'){row.replay=api.replayRevisedRoute(level,row.route.drags);assert(row.replay.valid&&row.replay.complete);const U=row.replay.nonClearingDrags;if(U<11)row.status='TOO_EASY_REGENERATE';else{row.floor=floor226(level,{prefix:true,maxMilliseconds:1600});row.status=row.floor.proof.thresholdProven?'BOUNDS_MET_QUALIFICATION_PENDING':'LOWER_'+row.floor.proof.status;if(row.floor.proof.thresholdProven)accepted={level,row};}fs.writeFileSync(path.join(out,`candidate-${mode}-${seed}-${row.sha256.slice(0,8)}.json`),JSON.stringify({level,row},null,2));}}
 }catch(e){row.status='ERROR';row.error=e.message;}
 records.push(row);if(row.route?.status==='witness'||seed%20===0)console.log(JSON.stringify({seed,status:row.status,U:row.replay?.nonClearingDrags,error:row.error,issues:row.issues}));if(accepted)break;
}
const file=path.join(out,`batch-${mode}-${start}-report.json`);fs.writeFileSync(file,JSON.stringify({mode,records,accepted:accepted??null},null,2));console.log(JSON.stringify({file,count:records.length,accepted:Boolean(accepted)}));
