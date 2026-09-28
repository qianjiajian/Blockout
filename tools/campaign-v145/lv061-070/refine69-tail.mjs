import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {stateOf} from './lift-floor.mjs';
import {compile} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {searchStage} from './stage-search69.mjs';
import {checkCanonicalLiftFloor} from './canonical-lift-floor.mjs';
import {pack,rect,SHAPES,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const data=JSON.parse(fs.readFileSync(process.argv[2])),{api}=await loadApi(),rng=seededRng(Number(process.env.SEED??1471169)),out='deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69',source=JSON.parse(fs.readFileSync(data.sourceReview));
if(process.env.ALT_GATES){Object.assign(data.level.gates.find(g=>g.color==='yellow'),{side:'right',offset:7,size:3});Object.assign(data.level.gates.find(g=>g.color==='cyan'),{side:'bottom',offset:0,size:3});Object.assign(data.level.gates.find(g=>g.color==='green'),{side:'left',offset:7,size:3});}
if(process.env.ALT_GATES==='2'){Object.assign(data.level.gates.find(g=>g.color==='green'),{side:'right',offset:7,size:3});Object.assign(data.level.gates.find(g=>g.color==='yellow'),{side:'left',offset:7,size:3});}
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
const deadline=Date.now()+Number(process.env.SECONDS??180)*1000;let attempts=0,best=0;const bestByGoal={};
while(Date.now()<deadline){attempts++;const row=structuredClone(data),level=row.level;
 for(const s of source.stages){if(['cover6','cover9','cover11'].includes(s.id))continue;const region=level.shutters.find(b=>b.id===`v147-69-${s.id}`),items=structuredClone(s.items);if(s.id==='cover6')items.push({sourceId:'cover6-fill-0',kind:'SINGLE',color:'blue'});const bs=pack(items,rect(region.width,region.height).map(([x,y])=>[region.x+x,region.y+y]),rng,10000,false);if(!bs)throw Error('Packing unexpectedly failed');for(const b of bs){const body=level.blocks.find(p=>p.id===`v147-69-${b.sourceId}`);body.x=b.x;body.y=b.y;body.shape=b.shape;}}
 
 let drags=structuredClone(row.drags),cost=row.cost,pr=api.replayRevisedRoute(level,drags);if(!pr.valid)continue;let state=stateOf(compile(level),JSON.parse(pr.finalStateKey)),ok=true;
 for(const [goal,cap]of [[11,Number(process.env.CAP11??7)],[18,Number(process.env.CAP18??9)],[24,10],[Infinity,10]]){if(goal<=row.goal)continue;const result=searchStage(level,{startState:state,goalClears:goal,floor:cap-cost+1,maxStates:150000,maxMilliseconds:Number(process.env.MS??2000),weight:Number(process.env.WEIGHT??1000),orderSeed:attempts%level.blocks.length});if(result.status!=='witness'){ok=false;break;}state=result.state;cost+=result.cost;drags.push(...result.drags);if(goal>best||cost<(bestByGoal[goal]??Infinity)){best=Math.max(best,goal);bestByGoal[goal]=cost;const file=`${out}/tail69-stage-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({...row,drags,cost,goal,levelSha256:digest(level)},null,2));console.log(JSON.stringify({attempts,goal,cost,file}));}}
 if(!ok)continue;const replay=api.replayRevisedRoute(level,drags);if(!replay.valid||!replay.complete)throw Error('Bad complete witness');const proof=checkCanonicalLiftFloor(level,api,{floor:5,maxStates:500000,maxMilliseconds:15000}),file=`${out}/tail69-complete-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({...row,drags,cost,replay,lowerBound:proof,levelSha256:digest(level)},null,2));console.log(JSON.stringify({file,U:replay.nonClearingDrags,status:proof.status}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({attempts,best}));
