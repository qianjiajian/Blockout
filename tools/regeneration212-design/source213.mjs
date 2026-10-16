import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency,OUT} from './design212.mjs';
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]],Q2=[[0,0],[1,0],[0,1],[1,1]],Q3=Array.from({length:9},(_,p)=>[p%3,Math.floor(p/3)]),T4=[[1,0],[0,1],[1,1],[2,1]],L3=[[0,0],[0,1],[1,1]],L4=[[0,0],[0,1],[1,1],[2,1]];
const B=(id,color,x,y,shape=S,more={})=>({id:`l213-${id}`,color,x,y,shape,...more});
const footprint=b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`);
export function source213(seed=213001){
 let state=seed|0;const rnd=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};
 const U={shutterId:'l213-upper'},I={...U,frozen:5};
 const upper=[B('ice-a','cyan',0,0,V2,I),B('ice-b','pink',1,0,L3,I),B('ice-c','yellow',3,0,V2,I),B('ice-d','pink',4,0,V2,I),B('ice-e','cyan',5,0,V2,I),B('ice-f','green',6,0,V2,I),B('ice-g','orange',2,2,L4,I),
 B('upper-a','yellow',0,2,V2,U),B('upper-b','blue',1,2,V2,U),B('upper-c','yellow',5,2,S,U),B('upper-d','pink',6,2,V3,U),B('upper-e','blue',5,3,V2,U),B('upper-f','blue',0,4,V2,U),B('upper-g','cyan',1,4,V2,U),B('upper-h','pink',3,4,V2,U),B('upper-i','cyan',5,5,H2,U)];
 if(seed>=213700)for(const[id,color]of[['ice-e','green'],['ice-f','cyan'],['upper-f','pink'],['upper-h','blue']])upper.find(b=>b.id===`l213-${id}`).color=color;
 const lower=seed>=213600
 ?[B('red-t','red',1,10,T4),B('green-square','green',0,7,Q3),B('orange-tall','orange',4,9,V3),B('ice1-blue-orange','orange',0,10,V2,{frozen:1,layers:['blue','orange']}),B('yellow-square','yellow',5,9,Q2),B('blue-base','blue',5,11,H2),B('start-blue','blue',5,7,Q2)]
 :[B('red-t','red',2,7,T4),B('green-square','green',0,9,Q3),B('orange-tall','orange',3,9,V3),B('ice1-blue-orange','orange',4,9,V2,{frozen:1,layers:['blue','orange']}),B('yellow-square','yellow',5,9,Q2),B('blue-base','blue',5,11,H2),B('start-blue','blue',5,7,Q2)];
 const lift=[B('lift-shell','blue',5,9,Q2,{shutterId:'l213-lift',layers:['yellow','blue']}),B('lift-blue','blue',5,11,H2,{shutterId:'l213-lift'})];
 function fill(blocks,cells,group){const taken=new Set(blocks.flatMap(footprint));let n=0;for(const[x,y]of cells){if(taken.has(`${x},${y}`))continue;const options=seed>=213800&&group==='lower'?['red','yellow','green','blue']:['red','yellow','green','blue','pink','cyan','orange'];for(let i=options.length-1;i>0;i--){const j=rnd(i+1);[options[i],options[j]]=[options[j],options[i]];}let chosen;for(const color of options){const b=B(`${group}-fill-${n}`,color,x,y,S,group==='upper'?U:{});if(!adjacency([...blocks,b]).length){chosen=b;break;}}if(!chosen)return false;blocks.push(chosen);n++;}return true;}
 if(!fill(upper,Array.from({length:42},(_,p)=>[p%7,Math.floor(p/7)]),'upper'))return null;
 if(!fill(lower,[[3,6],...Array.from({length:35},(_,p)=>[p%7,7+Math.floor(p/7)])],'lower'))return null;
 return {id:213,name:'双域升降·213',difficulty:'normal',mechanismRules:'revised-2026-09-27-v1.5',width:7,height:12,
 playable:[...Array.from({length:42},(_,p)=>[p%7,Math.floor(p/7)]),[3,6],...Array.from({length:35},(_,p)=>[p%7,7+Math.floor(p/7)])],
 timeSeconds:150,reward:200,parMoves:8,preservedMoveTarget:36,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:12,calibratedDifficulty:1.4},
 gates:[{id:'l213-orange',color:'orange',side:'top',offset:2,size:3,frozen:10},{id:'l213-cyan',color:'cyan',side:'right',offset:0,size:2,frozen:9},{id:'l213-pink',color:'pink',side:'left',offset:3,size:3,frozen:9},{id:'l213-yellow',color:'yellow',side:'left',offset:7,size:2,frozen:2},{id:'l213-blue',color:'blue',side:'right',offset:7,size:2},{id:'l213-red',color:'red',side:'bottom',offset:1,size:3,frozen:1},{id:'l213-green',color:'green',side:'bottom',offset:4,size:3,frozen:2}],
 shutters:[{id:'l213-upper',x:0,y:0,width:7,height:6,count:3,skin:'shutter'},{id:'l213-lift',x:5,y:9,width:2,height:3,count:0,skin:'lift'}],blocks:[...lower,...upper,...lift],
 mechanismAdaptation:{userAuthorized:'211–220上下界未达后允许颜色、种类与必要布局重生成；同规则验证后正式接入',change:'来源216/224/226/228/268秒逐帧；保7×12上下双区与1格颈、上卷帘3、2×3升降真实后层、7个隐藏冰5及开局冰1蓝壳橙芯V2、后层黄壳蓝芯Q2、原7门6冰计数。源上区2内部墙与普通空格填实为78格无内墙；所有上下隐藏层及开局实物满铺。两个非原向异形改原向L3/L4与V3+S，普通增补块颜色与位置为原创适配。源中心橙描边格语义UNKNOWN；不捏造彩格机制。'}};
}
async function run(){
 fs.mkdirSync(`${OUT}/source213`,{recursive:true});const api=await loadSpatialApi();
 const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`export{replayRevisedRoute}from'./src/core/revisedLevelSearch.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),core=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
 const history=[],startSeed=Number(process.argv[2]??213500);
 for(let n=0;n<8;n++){const level=source213(startSeed+n);if(!level){history.push({n,status:'COLORING_FAILED'});continue;}let audit;try{audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),upperAdjacency:adjacency(level.blocks.filter(b=>b.shutterId==='l213-upper')),openingAdjacency:adjacency(level.blocks.filter(b=>!b.shutterId)),liftAdjacency:adjacency(level.blocks.filter(b=>b.shutterId==='l213-lift')),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:core.auditRevisedMechanismContract(level)};}catch(e){history.push({n,status:'INVALID',error:e.message});console.log(n,e.message);continue;}
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.upperAdjacency.length&&!audit.openingAdjacency.length&&!audit.liftAdjacency.length&&!audit.mechanismIssues.length;
 const packet={level,levelSha256:digest(level),audit,sourceStatus:'SOURCE_MECHANISM_COUNTS_PRESERVED_DESIGN_ADAPTATIONS_DECLARED',formalAdopted:false};
 if(passed){packet.search=searchSpatial(level,api,{floor:Infinity,normalize:startSeed>=213800,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:n});if(packet.search.status==='witness'){packet.replay=core.replayRevisedRoute(level,packet.search.drags);if(packet.replay.complete&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.lowerBound=searchSpatial(level,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000});}}
 const row={n,levelSha256:packet.levelSha256,status:passed?'STRUCTURAL_PASS':'STRUCTURAL_FAIL',search:packet.search?{...packet.search,drags:undefined,partialDrags:undefined,partialState:undefined}:undefined,replay:packet.replay};history.push(row);
 const file=`${OUT}/source213/candidate213-${startSeed+n}.json`;if(fs.existsSync(file))throw Error('Do not overwrite previous evidence');fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(n,row.status,packet.search?.status,packet.search?.maxClearsSeen,packet.replay?.error??'');
 }
 fs.writeFileSync(`${OUT}/source213/history213-${startSeed}.json`,JSON.stringify({finiteCap:8,routeBudgetMs:4000,formalAdopted:false,history},null,2));
}
if(process.argv[1]?.endsWith('source213.mjs'))await run();
