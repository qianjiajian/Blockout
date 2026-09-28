import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {pack,seededRng} from '../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {checkSymmetryGeneratorFloor} from './validation-symmetry-floor.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.93.0','1.94.0','1.95.0'].includes(lock.activeVersion));
const seed=Number(process.argv[2]??193070),seconds=Number(process.argv[3]??60),mode=process.argv[4]??'library',rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const {api}=await loadApi(),baselineFile='deliverables/lv70-remake-20260927/baseline.json',base=JSON.parse(fs.readFileSync(baselineFile)).level;
const design=fs.readFileSync('tools/lv70-remake-20260927/design-search.mjs','utf8');
const statistics=new Function('assert','return '+design.slice(design.indexOf('export function statistics')+7,design.indexOf('\nlet attempts=0')))(assert);
const library=JSON.parse(fs.readFileSync('deliverables/lv70-remake-20260927/design-search-1790507968492/report.json')).rows.filter(x=>x.status==='witness'&&x.cost>=4&&x.cost<=14).map(x=>({file:x.file,level:JSON.parse(fs.readFileSync(x.file)).level}));
const cargoIds=new Set(base.generators[0].queueBlockIds),cargo=base.blocks.filter(b=>cargoIds.has(b.id));
const root=`deliverables/lv70-remake-20260927/design-ice-light-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const deadline=Date.now()+seconds*1000,rows=[],issues={};let attempts=0,valid=0,solved=0,best=null,bestPartial=null,saved=0;
const issue=k=>{issues[k]=(issues[k]??0)+1;};
while(Date.now()<deadline){
 const source=pick(library),level=structuredClone(source.level),i=attempts++;
 const order=rng.shuffle(['green','pink','yellow']),counts=[1,pick([5,6,7,8,9,10]),pick([12,14,16,18])];
 const opening=base.blocks.filter(b=>!cargoIds.has(b.id));
 const tiles=i%2===0?level.blocks.filter(b=>!cargoIds.has(b.id)).map(b=>({...b,sourceId:b.id})):pack(opening.map(b=>({kind:b.shape[1][0]?'H2':'V2',sourceId:b.id,color:b.color})),base.playable,rng,8000,true);
 if(!tiles){issue('packing');continue;}
 level.blocks=[...tiles.map(b=>({id:b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color})),...structuredClone(cargo)];
 const blueGate=level.gates.find(g=>g.color==='blue'),g=blueGate;
 const canFirst=level.blocks.filter(b=>!cargoIds.has(b.id)&&b.color==='blue').some(b=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));return (g.side==='left'?b.x===0:g.side==='right'?b.x+w===6:g.side==='top'?b.y===0:b.y+h===7)&&(g.side==='top'||g.side==='bottom'?b.x>=g.offset&&b.x+w<=g.offset+g.size:b.y>=g.offset&&b.y+h<=g.offset+g.size);});
 if(!canFirst){issue('no-first-blue-exit');continue;}

 level.gates.forEach(g=>{if(g.color!=='blue')g.frozen=counts[order.indexOf(g.color)];});
 if(true){
  const remaining=rng.shuffle([...cargo]),queues=[[],[]],firstBlue=pick([0,1]);
  queues[firstBlue].push(remaining.shift());queues[1-firstBlue].push(remaining.shift());
  let dead=false;
  while(remaining.length){let added=false;for(const gi of rng.shuffle([0,1])){
   if(queues[gi].length>=(gi===0?9:8))continue;
   let options=remaining.map((b,j)=>({b,j})).filter(({b})=>b.color!==queues[gi].at(-1)?.color);
   if(!options.length)continue;
   options.sort((a,b)=>order.indexOf(a.b.color)-order.indexOf(b.b.color));
   const selected=pick(options.slice(0,i%4===0?options.length:Math.min(3,options.length)));
   queues[gi].push(remaining.splice(selected.j,1)[0]);added=true;break;
  }if(!added){dead=true;break;}}
  if(dead){issue('queue-order');continue;}
  level.generators.forEach((g,j)=>g.queueBlockIds=queues[j].map(b=>b.id));

 }
 for(const g of level.generators)for(const id of g.queueBlockIds){const b=level.blocks.find(b=>b.id===id);[b.x,b.y]=g.spawn;}
 if(!auditGeneratorQueueColors(level).passed){issue('queue-color');continue;}
 try{api.validateLevel(level);}catch(e){issue(e.message);continue;}valid++;
 const weight=pick([20,60,150]),result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:70000,maxMilliseconds:450,weight,orderSeed:i%36});
 const recipe={attempt:i,sourceFile:source.file,order,counts,queueIds:level.generators.map(g=>g.queueBlockIds),weight,orderSeed:i%36,status:result.status,cost:result.cost,states:result.states,bestClears:result.bestClears??null};rows.push(recipe);
 if(result.status!=='witness'){
  if(!bestPartial||result.states>bestPartial.result.states){bestPartial={...recipe,level,result};}
  continue;
 }
 solved++;const replay=api.replayRevisedRoute(level,result.drags);assert(replay.valid&&replay.complete);
 const stats=statistics(level,result.drags,api);recipe.statistics=stats;
 let cleared=0,cargoClears=0;stats.gateUnlocks=[];for(const [at,d]of result.drags.entries())if(d.exitSide){cleared++;if(cargoIds.has(d.blockId))cargoClears++;for(const g of level.gates)if(g.frozen===cleared)stats.gateUnlocks.push({color:g.color,count:g.frozen,step:at+1,blockId:d.blockId,byGenerated:cargoIds.has(d.blockId),cargoClearsBeforeUnlock:cargoClears});}
 if(result.cost<11){issue('under-band-witness');continue;}
 // Two independent heuristic routes reject cheap alternatives before a floor.
 let shortcut=false;for(const w of [10,40]){const alt=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:11,maxStates:30000,maxMilliseconds:250,weight:w,orderSeed:w});if(alt.status==='witness'){recipe.cheapRoute=alt;shortcut=true;break;}}
 if(shortcut){issue('low-weight-shortcut');continue;}
 const floor=checkSymmetryGeneratorFloor(level,api,{floor:11,maxStates:250000,maxMilliseconds:1800});recipe.floor={...floor,drags:undefined};
 if(floor.status==='relaxed-shortcut'){issue('floor-shortcut');continue;}
 const score=(floor.thresholdProven?1000:0)+stats.generatedMultiCellRepositions*10+(stats.bothMachinesHaveGeneratedMultiCellReposition?50:0)+Math.min(...stats.machines.map(m=>m.firstSpawn.openingRemaining))-result.cost;
 if(!best||score>best.score){
  level.preservedMoveTarget=result.drags.length;const file=`${root}/candidate-${i}.json`;
  const data={level,drags:result.drags,replay,statistics:stats,floor,recipe,levelSha256:digest(level),ruleVersion:lock.activeVersion,sourceInventoryDifferences:{openingShapeColor:[],queueShapeColor:[],gateIce:level.gates.filter(g=>g.color!=='blue').map(g=>({color:g.color,sourceInitial:1,authoredInitial:g.frozen}))}};
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});saved++;best={file,score,U:result.cost,stats,floor:floor.status};console.log(JSON.stringify({attempts,valid,solved,saved,best}));
  if(floor.thresholdProven&&(stats.generatedMultiCellRepositions>=2||stats.gateUnlocks.some(g=>g.count>1&&g.cargoClearsBeforeUnlock>0)))break;
 }
 if(valid%20===0)console.log(JSON.stringify({attempts,valid,solved,best:best?.file,issues}));
}
if(bestPartial)fs.writeFileSync(root+'/best-partial.json',JSON.stringify(bestPartial,null,2)+'\n',{flag:'wx'});
const report={seed,seconds,mode,attempts,valid,solved,saved,best,issues,rows,ruleVersion:lock.activeVersion,status:best?.floor==='threshold-proven'?'FLOOR_AND_ROUTE_FOUND_MECHANISM_PENDING':'BOUNDED_SEARCH_NO_CERTIFIED_CANDIDATE'};
fs.writeFileSync(root+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({root,...report,rows:undefined}));
