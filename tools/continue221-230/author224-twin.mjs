import fs from 'node:fs';
import {api,tile,recolorBag,recolor,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from './author-hard20260930/grid-witness.mjs';
import {gridFloor} from './author-hard20260930/grid-floor224.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {runtimeNativeArtIssues} from './runtime-native-art.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/224-twin';fs.mkdirSync(out,{recursive:true});
const rect=(w,h,x=0,y=0)=>Array.from({length:w*h},(_,p)=>[x+p%w,y+Math.floor(p/w)]),H2=rect(2,1),V2=rect(1,2),H3=rect(3,1),Q=rect(2,2);
const hiddenBase=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/hard/candidate-224-g1406.json')).blocks.filter(b=>b.shutterId);
const R=rng(Number(process.argv[2]??22477001)),run=Date.now(),limit=Number(process.argv[3]??600),deadline=Date.now()+240000;
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const counts={tile:0,color:0,hidden:0,audit:0,search:0};
let best=0;
for(let n=0;n<limit&&Date.now()<deadline;n++){
  const seed=R.state();R.random();
  const a=[{id:'a-ice',shape:Q,color:'blue',frozen:10},{id:'a-start',shape:H3,color:'orange'},...Array.from({length:7},(_,i)=>({id:'a-'+i,shape:R.random()<.5?H2:V2,color:['orange','orange','cyan','cyan','cyan','yellow','yellow'][i]}))];
  const b=[{id:'b-red',shape:Q,color:'red',frozen:10},{id:'b-green',shape:Q,color:'green',frozen:10},{id:'b-start',shape:H3,color:'yellow'},...Array.from({length:5},(_,i)=>({id:'b-'+i,shape:R.random()<.5?H2:V2,color:['yellow','yellow','cyan','cyan','orange'][i]}))];
  const top=tile(a,rect(7,3),{seed,maxNodes:5000,pins:{'a-ice':[2,0],'a-start':[0,2]},preferLarge:false});
  const bottom=tile(b,rect(7,3,0,7),{seed:seed+1,maxNodes:5000,pins:{'b-red':[0,8],'b-green':[5,8],'b-start':[2,7]},preferLarge:false});
  if(!top||!bottom){counts.tile++;continue;}
  if(!recolorBag(top,{seed:seed+2,pins:{'a-ice':'blue','a-start':'orange'}})||!recolorBag(bottom,{seed:seed+3,pins:{'b-red':'red','b-green':'green','b-start':'yellow'}})){counts.color++;continue;}
  const hidden=tile(hiddenBase,rect(7,4,0,3),{seed:seed+4,maxNodes:14000,preferLarge:false});
  if(!hidden||!recolor(hidden,['orange','yellow','cyan','blue','red','green'],{seed:seed+5,pins:{h1:'red'}})){counts.hidden++;continue;}
  const blocks=[...top,...bottom,...hidden];
  const coloredGrids=['blue','red'].map(color=>({id:'grid-'+color,color,cells:blocks.filter(b=>b.frozen&&b.color===color).flatMap(b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]))}));
  const positions={orange:['left',0,3],yellow:['right',7,3],cyan:['right',0,3],blue:['left',7,3],red:['top',4,3],green:['bottom',2,3]};
  if(n%3===1)positions.red=['right',4,3];if(n%3===2)positions.green=['left',4,3];
  const gates=['orange','yellow','cyan','blue','red','green'].map((color,i)=>({id:'g-'+color,color,side:positions[color][0],offset:positions[color][1],size:positions[color][2],...([0,0,4,10,14,16][i]?{frozen:[0,0,4,10,14,16][i]}:{})}));
  const level={id:224,name:'彩格双湾',difficulty:'hard',width:7,height:10,timeSeconds:150,reward:200,parMoves:16,preservedMoveTarget:42,mechanismRules:'revised-2026-09-27-v1.5',blocks,gates,shutters:[{id:'curtain',x:0,y:3,width:7,height:4,count:8}],coloredGrids,mechanismAdaptation:{userAuthorized:'221–230有限失败后换色换形重生成',change:'保持来源7×10满矩形、17开局+10隐藏共27体、三数字冰10、四冰门4/10/14/16、单28格帘8及红蓝各4彩格。三冰改SQ2、普通开局改12H2/V2+2H3，共42格；帘中置y3分开两处启动区。隐藏保五异形种类T4/Z4/L4/两L3及全部10体28格，普通颜色和位置原创适配，红Z4使用已有q0素材。'}};
  const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code)),art=runtimeNativeArtIssues(level);
  if(issues.length||art.length){counts.audit++;if(counts.audit<3)console.log(JSON.stringify({reject:'audit',issues,art}));continue;}
  counts.search++;
  let w,rep,proof,error;
  try{w=searchSpatial(level,api,{floor:21,maxMilliseconds:2000,maxStates:45000,maxTransitions:500000,symmetry:true,diagnosticTrace:true});if(w.drags)rep=api.replayRevisedRoute(level,w.drags);if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=16&&rep.nonClearingDrags<=20)proof=gridFloor(level,{floor:16,maxMilliseconds:8000,maxStates:1500000});}catch(e){error=e.message;}
  const row={n,seed,sha:digest(level),status:w?.status,clears:w?.maxClearsSeen,U:rep?.nonClearingDrags,L:proof?.status,error};
  fs.appendFileSync(out+`/attempts-${run}.jsonl`,JSON.stringify(row)+'\n');
  if((w?.maxClearsSeen??0)>best){best=w.maxClearsSeen;fs.writeFileSync(out+`/best-${run}.json`,JSON.stringify({level,w,row},null,2));console.log(JSON.stringify({...row,best:true}));}
  if(rep?.valid&&rep.complete){const file=out+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:w.drags,replay:rep,proof,row,status:'PENDING_QUALIFICATION'},null,2));console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}
}
fs.writeFileSync(out+`/batch-${run}.json`,JSON.stringify({counts,best},null,2));console.log(JSON.stringify({counts,best}));
