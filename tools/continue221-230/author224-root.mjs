import fs from 'node:fs';
import {api,tile,recolorBag,recolor,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from './author-hard20260930/grid-witness.mjs';
import {gridFloor} from './author-hard20260930/grid-floor224.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {runtimeNativeArtIssues} from './runtime-native-art.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/author224-root';fs.mkdirSync(out,{recursive:true});
const rect=(w,h)=>Array.from({length:w*h},(_,p)=>[p%w,Math.floor(p/w)]),S=rect(1,1),H2=rect(2,1),V2=rect(1,2),H3=rect(3,1),V3=rect(1,3),Q=rect(2,2),R6=rect(2,3);
const template=[[V2,'blue'],[H2,'red'],[S,'orange'],[V3,'green'],[H2,'red'],[R6,'cyan'],[S,'red'],[S,'cyan'],[S,'orange'],[V2,'cyan'],[V3,'red'],[H3,'orange'],[S,'orange'],[H2,'cyan'],[Q,'green',10],[Q,'red',10],[Q,'blue',10]];
const core=process.env.CORE==='1';
if(core)for(const [i,b]of template.entries())b[0]=i>=14?rect(3,3):i===11?H2:S;
const hiddenBase=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/hard/candidate-224-g1406.json')).blocks.filter(b=>b.shutterId);
hiddenBase.find(b=>b.id==='h0').shape=S;
hiddenBase.find(b=>b.id==='h3').shape=H3;
const R=rng(Number(process.argv[2]??224990)),run=Date.now(),omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const deadline=Date.now()+240000;
for(let n=0;n<Number(process.argv[3]??180)&&Date.now()<deadline;n++){
 const seed=R.state();R.random();const cells=rect(7,6).map(([x,y])=>[x,y+4]),spec=template.map(([shape,color,frozen],i)=>({id:'l224-o'+i,shape,color,...(frozen?{frozen}:{})}));
 const pins=core?{'l224-o11':[4,9],'l224-o2':[6,8],'l224-o8':[4,7],'l224-o12':[3,6],'l224-o14':[0,7],'l224-o15':[4,4],'l224-o16':[0,4]}:{'l224-o5':[0,4],'l224-o14':[n%2?0:2,8],'l224-o15':[5,8],'l224-o16':[5,6]};
 const blocks=tile(spec,cells,{seed,pins,maxNodes:12000,preferLarge:false});if(!blocks)continue;
 if(!recolorBag(blocks,{seed,pins:{...(core?{'l224-o2':'orange','l224-o8':'orange','l224-o12':'orange'}:{}),[core?'l224-o11':'l224-o5']:'orange','l224-o14':'green','l224-o15':'red','l224-o16':'blue'}}))continue;
 const hidden=tile(hiddenBase,rect(7,4),{seed:seed+91,pins:{h0:[4,0],h7:[6,0]},maxNodes:16000,preferLarge:false}),shutters=[{id:'curtain',x:0,y:0,width:7,height:4,count:8}];
 if(!hidden||!recolor(hidden,['red','blue','yellow','cyan','orange'],{seed:seed+57,pins:{h1:'red',h0:'yellow',h7:'yellow'}})){if(process.env.DIAGNOSTIC&&n<10)console.log(JSON.stringify({n,reject:hidden?'hidden-colors':'hidden-tile'}));continue;}
 const grids=['blue','red'].map(color=>({id:'l224-grid-'+color,color,cells:blocks.filter(b=>b.frozen&&b.color===color).flatMap(b=>b.shape.map(([x,y])=>[b.x+x,b.y+y])).slice(0,4)}));
 if(core){const h=hidden.find(b=>b.color==='blue');if(!h)continue;const [dx,dy]=h.shape[0];grids.find(g=>g.color==='blue').cells=[[0,4],[0,5],[0,6],[h.x+dx,h.y+dy]];}
 const ports=[['left',4,3],['left',7,3],['right',4,3],['right',7,3],['left',0,3],['right',0,3],['top',0,3],['top',4,3],['bottom',0,3],['bottom',4,3]],chosen=[ports[0],...R.shuffle(ports.slice(1))];
 const gates=['orange','yellow','cyan','blue','red','green'].map((color,i)=>({id:'l224-g-'+color,color,side:chosen[i][0],offset:chosen[i][1],size:chosen[i][2],...([0,0,4,10,14,16][i]?{frozen:[0,0,4,10,14,16][i]}:{})}));
 if(core){const p={orange:['bottom',4,3],yellow:['top',4,3],cyan:['right',7,3],blue:['top',0,3],red:['left',0,3],green:['left',7,3]};for(const g of gates)[g.side,g.offset,g.size]=p[g.color];}
 const level={id:224,name:'彩格冰封回廊',difficulty:'hard',width:7,height:10,timeSeconds:150,reward:200,parMoves:16,preservedMoveTarget:42,mechanismRules:'revised-2026-09-27-v1.5',blocks:[...blocks,...hidden],gates,shutters,coloredGrids:grids,mechanismAdaptation:{userAuthorized:'221–230有限失败后换色换形重生成',change:'保源7x10满矩形、17开局+10隐藏全库存、三冰块10、四冰门4/10/14/16、真实7x4帘8、蓝红各4彩格。源开局31格与本游戏满铺冲突：三冰原2格改SQ2、普通cyanSQ2改2x3、greenV2/redV2改V3、orangeH2改H3，合计+11格。原创排布及必要换色，隐藏保28格源原向清单。'}};
 const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code)),artIssues=runtimeNativeArtIssues(level);if(issues.length||artIssues.length){if(process.env.DIAGNOSTIC&&n<10)console.log(JSON.stringify({n,reject:issues,artIssues}));continue;}
 if(core)level.mechanismAdaptation.change='源17开局/10隐藏与所有机关数/初值保持；三冰体改原向SQ3，14普通体适配13S+1H2覆盖42格，隐藏两H2分别改S/H3且仍10体28格。源7x10全矩形保持，蓝红各4彩格在对应冻结体下，换形色重生成，不冒称源形状一致。';
 let w,rep,proof,error;try{w=searchSpatial(level,api,{floor:21,maxMilliseconds:1600,maxStates:30000,maxTransitions:400000,symmetry:true,diagnosticTrace:true});if(w.drags)rep=api.replayRevisedRoute(level,w.drags);if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=16&&rep.nonClearingDrags<=20)proof=gridFloor(level,{floor:16,maxMilliseconds:8000,maxStates:1500000});}catch(e){error=e.message;}
 const row={n,seed,sha:digest(level),status:w?.status,clears:w?.maxClearsSeen,cost:w?.partialCost,U:rep?.nonClearingDrags,L:proof?.status,error};fs.appendFileSync(out+`/attempts-${run}.jsonl`,JSON.stringify(row)+'\n');
 if(w?.maxClearsSeen>=12&&!rep?.complete)fs.writeFileSync(out+`/partial-${run}-${n}.json`,JSON.stringify({level,witness:w,row},null,2));
 if(rep?.valid&&rep.complete){const file=out+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:w.drags,replay:rep,proof,row,status:'PENDING_QUALIFICATION'},null,2));console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}else if(n%10===0)console.log(JSON.stringify(row));
}
