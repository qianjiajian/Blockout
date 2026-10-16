import fs from 'node:fs';
import {build} from 'esbuild';
import {tile,recolor,recolorBag,rng,api} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {floor226} from './floor226.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/author226';fs.mkdirSync(out,{recursive:true});
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],Q2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],T4:[[0,0],[0,1],[1,1],[0,2]]};
const five=process.env.FIVE==='1',narrow=process.env.NARROW==='1',W=five?5:narrow?4:6,H=five?10:narrow?13:9,sx=narrow&&!five?1:2;
const bag=['Q2','Q2','Q2','L3','V2','Q2','H2','Q2','V2','H2','H2','H2',narrow?'S':'H2','V2',narrow?'S':'H2','S','T4','S','S','S','S','S','S','S','S'];
if(five)for(const i of [10,11,12,14])bag[i]='S';
const cells=Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]),R=rng(Number(process.env.SEED??226930)),run=Date.now();
const ports=five?[['bottom',0,2],['bottom',3,2],...['left','right'].flatMap(s=>[0,3,7].map(o=>[s,o,3]))]:narrow?[['bottom',0,2],['bottom',2,2],...['left','right'].flatMap(s=>[0,3,6,10].map(o=>[s,o,3]))]:[['top',4,2],['bottom',0,3],['bottom',3,3],['left',0,3],['left',3,3],['left',6,3],['right',0,3],['right',3,3],['right',6,3]];
const fits=(p,b)=>{const[s,o,z]=p,w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;return s==='top'?b.y===0&&b.x>=o&&b.x+w<=o+z:s==='bottom'?b.y+h===H&&b.x>=o&&b.x+w<=o+z:s==='left'?b.x===0&&b.y>=o&&b.y+h<=o+z:b.x+w===W&&b.y>=o&&b.y+h<=o+z;};
for(let n=0;n<Number(process.env.COUNT??120);n++){
 const seed=R.state();R.random();const spec=bag.map((s,i)=>({id:'l226-b'+i,shape:shapes[s],color:'red'}));
 Object.assign(spec[0],{color:'green',lockedBy:'red',lockCount:1});Object.assign(spec[1],{color:'red',layers:['red','blue'],frozen:17});Object.assign(spec[2],{color:'yellow',lockedBy:'blue',lockCount:2});Object.assign(spec[5],{color:'blue',layers:['blue','red']});Object.assign(spec[7],{color:'red',layers:['red','green']});spec[6].keyId='blue';spec[8].keyId='red';spec[20].keyId='blue';
 if(five){const colors=['green','red','yellow','yellow','green','blue','blue','red','yellow','green','blue','yellow','cyan','blue','yellow','blue','green','yellow','yellow','cyan','yellow','cyan','blue','cyan','green'];spec.forEach((b,i)=>b.color=colors[i]);}
 const blocks=tile(spec,cells,{seed,maxNodes:12000,pins:{'l226-b1':[sx,0]},preferLarge:false});if(!blocks)continue;
 const pins={'l226-b0':'green','l226-b1':'red','l226-b2':'yellow','l226-b5':'blue','l226-b7':'red','l226-b6':'blue','l226-b8':'yellow','l226-b20':'yellow','l226-b16':'green'};
 if(five?!recolorBag(blocks,{seed,pins:{'l226-b0':'green','l226-b1':'red','l226-b2':'yellow','l226-b5':'blue','l226-b7':'red'}}):!recolor(blocks,['red','yellow','cyan','green','blue'],{seed,pins,filter:(b,c)=>b.id in pins||['red','yellow','cyan'].includes(c)||Number(b.id.slice(6))%4===0}))continue;
 const starter=R.shuffle(blocks.filter(b=>(five?['red','yellow'].includes(b.color):b.color==='red')&&!b.frozen&&!b.lockedBy&&ports.some(p=>fits(p,b))))[0];if(!starter)continue;
 const first=R.shuffle(ports.filter(p=>fits(p,starter)))[0],ps=[first,...R.shuffle(ports.filter(p=>p!==first))];
 const gates=[starter.color,starter.color==='red'?'yellow':'red','cyan','blue','green'].map((color,i)=>({id:'l226-g-'+color,color,side:ps[i][0],offset:ps[i][1],size:ps[i][2],...([0,0,3,12,18][i]?{frozen:[0,0,3,12,18][i]}:{})}));
 const queue=['blue','yellow','blue'].map((color,i)=>({id:'l226-q'+i,x:sx,y:0,shape:i===1?shapes.L3:shapes.V2,color}));
 const level={id:226,name:'钥匙与补货',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',width:6,height:9,playable:cells,timeSeconds:180,reward:200,parMoves:31,preservedMoveTarget:48,blocks:[...blocks,...queue],gates,generators:[{id:'l226-machine',side:'top',offset:2,size:2,spawn:[2,0],queueBlockIds:queue.map(b=>b.id)}],designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:2.6,minimumRepositionOverhead:13},mechanismAdaptation:{userAuthorized:'竞品221–230原创续作，有限失败后允许换色换形重生成',change:'226保25开局/3队列/3壳/3钥匙/锁1和2/数冰17/冰门3、12、18。原50格轮廓适配54格矩形，4S改H2；冰T改SQ2，非冰T及L改原向素材。队列蓝V2黄L3蓝V2完整真实FIFO；数冰挡口17前不可投放。'}};
 level.width=W;level.height=H;level.generators[0].offset=sx;level.generators[0].spawn=[sx,0];
 if(process.env.TIGHT==='1')for(const g of level.gates)if(['red','yellow'].includes(g.color))g.size=2;
 if(narrow)level.mechanismAdaptation.change=level.mechanismAdaptation.change.replace('54格矩形，4S改H2','52格矩形，2S改H2');
 if(five)level.mechanismAdaptation.change='保源25开局50占格及其外色总量、3壳、数冰17、2锁计数1和2、3钥匙、四?（实为3）冰门3/12/18、真实3FIFO蓝V2黄L3蓝V2。原创5x10矩形满铺，冰T4→SQ2，其余T/L改原向素材，个体普通色重排。';
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 let witness,rep,error,issues;try{issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code));if(!issues.length){const projected={...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4'};witness=searchSpatial(projected,api,{floor:16,maxStates:25000,maxMilliseconds:1300,maxTransitions:500000,orderSeed:n%28});if(witness.status==='witness')rep=api.replayRevisedRoute(level,witness.drags);}}catch(e){error=e.message;}
 const row={n,seed,sha:digest(level),status:witness?.status,U:rep?.nonClearingDrags,complete:rep?.complete,issues,error};fs.appendFileSync(out+'/attempts-'+run+'.jsonl',JSON.stringify(row)+'\n');
 if(rep?.valid&&rep.complete){const bound=rep.nonClearingDrags>=11?floor226(level):null;const file=out+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:witness.drags,replay:rep,bound,iteration:row,status:'ROUTE_ONLY_PENDING_FLOOR_QUALIFICATION',formalAdopted:false},null,2));console.log(JSON.stringify({...row,file,proof:bound?.proof.status}));if(bound?.proof.thresholdProven)break;}else if(n%10===0)console.log(JSON.stringify(row));
}
