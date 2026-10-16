import fs from 'node:fs';
import {build} from 'esbuild';
import {tile,recolor,rng} from '../remake191-200/author194-196/common.mjs';
import {searchFlipWitness} from '../remake191-200/author194-196/flip-search.mjs';
import {searchSpatial,loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));
const bund=await build({stdin:{resolveDir:process.cwd(),contents:"export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts'; export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api={...await loadSpatialApi(),...await import('data:text/javascript;base64,'+Buffer.from(bund.outputFiles[0].text).toString('base64'))};
const OUT='deliverables/continue221-230-20260930/author225';fs.mkdirSync(OUT,{recursive:true});
const run=Date.now(),log=OUT+'/attempts-'+run+'.jsonl',R=rng(Number(process.env.SEED??225930));
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]]};
const shapeBag=[...Array(6).fill('S'),...Array(3).fill('H2'),...Array(3).fill('H3'),...Array(11).fill('V2'),'V3','L3','L3','L4','L4'];
const originalMask=process.env.SOURCE_MASK==='1',W=originalMask?7:6,H=originalMask?9:10;
const cells=Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]).filter(([x,y])=>!originalMask||!((x===0&&(y===0||y===8))||(x===6&&y===4)));
const ports=originalMask?[['top',1,3],['top',4,3],['bottom',1,3],['bottom',4,3],['left',1,3],['left',4,3],['left',5,3],['right',0,3],['right',5,3],['right',6,3]]:[['top',0,3],['top',3,3],['bottom',0,3],['bottom',3,3],['left',0,3],['left',3,3],['left',7,3],['right',0,3],['right',3,3],['right',7,3]];
const fits=(p,b)=>{const[s,o,z]=p,w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;return s==='top'?b.y===0&&b.x>=o&&b.x+w<=o+z:s==='bottom'?b.y+h===H&&b.x>=o&&b.x+w<=o+z:s==='left'?b.x===0&&b.y>=o&&b.y+h<=o+z:b.x+w===W&&b.y>=o&&b.y+h<=o+z;};
for(let n=0;n<Number(process.env.COUNT??100);n++){
 const seed=R.state();R.random();const spec=shapeBag.map((s,i)=>({id:'l225-b'+i,shape:shapes[s],color:'red'}));
 const blocks=tile(spec,cells,{seed,maxNodes:5000,preferLarge:false});if(!blocks)continue;
 if(!recolor(blocks,['red','green','yellow','blue','purple'],{seed}))continue;
 if(!blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0))throw Error('Native art required');
 const starter=R.shuffle(blocks.filter(b=>b.color==='red'&&ports.some(p=>fits(p,b))))[0];if(!starter)continue;
 const first=R.shuffle(ports.filter(p=>fits(p,starter)))[0];const ps=[first,...R.shuffle(ports.filter(p=>p!==first))];
 const gates=['red','green','yellow','blue','purple'].map((color,i)=>({id:'l225-g-'+color,color,side:ps[i][0],offset:ps[i][1],size:ps[i][2]}));
 const level={mechanismRules:'revised-2026-09-27-v1.5',id:225,name:'翻门交接',difficulty:'easy',timeSeconds:150,reward:200,parMoves:28,preservedMoveTarget:45,width:6,height:10,playable:cells,blocks,gates:gates.slice(0,2),flipDoors:gates.slice(2).map(g=>({...g,initiallyOpen:g.color==='yellow'})),designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:1.2,minimumRepositionOverhead:6},mechanismAdaptation:{userAuthorized:'221-230竞品续作与失败后换色换形重生成',change:'225来源385/387秒28体57格、黄开蓝紫关三翻门；中央内孔按本游戏硬规则改为6x10满矩形，保28体并将三个H2扩为H3补3格；原向L形及全部颜色、排列原创。'}};
 level.width=W;level.height=H;if(originalMask)level.mechanismAdaptation.change='保源7×9异形分类，原中央内孔违反无内墙规则，改为上下对称的原创外边缘缺口（60格）。保28体、3翻门黄开蓝紫关；3个H2→H3补来源57到60的3格差，全部形状原向、色序和排列原创。';
 const sha=digest(level);let witness,rep,proof,error;
 try{api.validateLevel(level);witness=searchFlipWitness(level,{maxCost:10,maxStates:30000,maxMilliseconds:650,orderSeed:n%28});if(witness.status==='witness'){rep=api.replayRevisedRoute(level,witness.drags);if(rep.valid&&rep.complete&&rep.nonClearingDrags>=5&&rep.nonClearingDrags<=10){const projected={...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4',flipDoors:[],gates:[...level.gates,...level.flipDoors.map(({initiallyOpen,...g})=>g)]};proof=searchSpatial(projected,api,{floor:5,prove:true,maxStates:60000,maxMilliseconds:1200,maxTransitions:1500000});}}}catch(e){error=e.message;}
 const row={n,seed,sha,status:witness?.status,U:rep?.nonClearingDrags,complete:rep?.complete,proof:proof?.status,error};fs.appendFileSync(log,JSON.stringify(row)+'\n');
 if(rep?.valid&&rep.complete){const file=OUT+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,levelSha256:sha,drags:witness.drags,replay:rep,proof,lowerBoundProjection:'All three flip doors permanently open: includes every real exit and cannot increase reposition cost; all bodies and shapes retained; omitted concave exit sweep further relaxes only.',opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),sourceFrame:'../source225226/frame-387.png',sourceStatus:'KNOWN_28_OPENING_BODIES_3_FLIP_PHASES',pointerValidated:false,formalAdopted:false,iteration:row},null,2));console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}
 else if(n%10===0)console.log(JSON.stringify(row));
}
