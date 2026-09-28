import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {checkAutomaticGeneratorFloor} from './validation-generator-domain.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.91.0','1.92.0'].includes(lock.activeVersion));
const baseFile='deliverables/lv70-remake-20260927/design-search-1790507968492/attempt-643.json';
const base=JSON.parse(fs.readFileSync(baseFile)),{api}=await loadApi();
const design=fs.readFileSync('tools/lv70-remake-20260927/design-search.mjs','utf8');
const statistics=new Function('assert','return '+design.slice(design.indexOf('export function statistics')+7,design.indexOf('\nlet attempts=0')))(assert);
let seed=Number(process.argv[2]??643191);const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rand()*a.length)];
const root=`deliverables/lv70-remake-20260927/root-refine643-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const deadline=Date.now()+55000,rows=[],counts={valid:0,solved:0,mechanism:0};let accepted;
for(let i=0;Date.now()<deadline;i++){
 const level=structuredClone(base.level),gen=level.generators[1];gen.offset=pick([2,3,4]);gen.spawn=[0,gen.offset];
 const cargoIds=new Set(level.generators.flatMap(g=>g.queueBlockIds));
 const bodies=level.blocks.filter(b=>!cargoIds.has(b.id));
 for(let n=0;n<(i%3)+1;n++){const a=pick(bodies),others=bodies.filter(b=>b!==a&&JSON.stringify(b.shape)===JSON.stringify(a.shape));const b=pick(others);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}
 if(i%3!==0){const q=gen.queueBlockIds,a=q.findIndex(id=>level.blocks.find(b=>b.id===id).shape.length===2),b=pick(q.map((id,j)=>[id,j]).filter(([id])=>level.blocks.find(b=>b.id===id).shape.length===2))[1];[q[a],q[b]]=[q[b],q[a]];}
 for(const g of level.generators)for(const id of g.queueBlockIds){const b=level.blocks.find(b=>b.id===id);[b.x,b.y]=g.spawn;}
 if(!auditGeneratorQueueColors(level).passed)continue;
 const taken=new Set(level.generators.flatMap(g=>[-1,0,1].map(k=>g.side+':'+(g.offset+k))));let valid=true;
 for(const g of level.gates){const fits=()=>Array.from({length:g.size},(_,k)=>g.side+':'+(g.offset+k)).every(x=>!taken.has(x));
  if(!fits()||(g.color==='pink'&&i%4===0)){
   const opts=[];for(const side of ['left','right','bottom','top'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?6:7);offset++){
    const cells=Array.from({length:size},(_,k)=>side==='top'?[offset+k,0]:side==='bottom'?[offset+k,6]:side==='left'?[0,offset+k]:[5,offset+k]);
    if(cells.every(p=>level.playable.some(q=>q[0]===p[0]&&q[1]===p[1]))&&cells.every((_,k)=>!taken.has(side+':'+(offset+k))))opts.push({side,size,offset});
   }if(!opts.length){valid=false;break;}Object.assign(g,pick(opts));
  }for(let k=0;k<g.size;k++)taken.add(g.side+':'+(g.offset+k));
 }if(!valid)continue;
 try{api.validateLevel(level);const issues=api.auditRevisedCandidate(level,undefined).issues.filter(x=>x.category!=='source'&&x.code!=='wrong-rule-profile');if(issues.length)continue;}catch{continue;}
 counts.valid++;const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:40000,maxMilliseconds:250,weight:1000,orderSeed:i%36});
 if(result.status!=='witness'||result.cost<11)continue;
 counts.solved++;const replay=api.replayRevisedRoute(level,result.drags);assert(replay.valid&&replay.complete);const stats=statistics(level,result.drags,api);
 if(stats.machines.some(m=>m.firstSpawn.openingRemaining<5)||stats.generatedMultiCellRepositions<2)continue;counts.mechanism++;
 const floor=checkAutomaticGeneratorFloor(level,api,{floor:11,maxStates:150000,maxMilliseconds:1500});
 level.preservedMoveTarget=result.drags.length;
 const file=`${root}/candidate-${i}.json`,data={level,drags:result.drags,replay,statistics:stats,floor,baseFile,levelSha256:digest(level),ruleVersion:lock.activeVersion};
 fs.writeFileSync(file,JSON.stringify(data,null,2),{flag:'wx'});rows.push({file,U:result.cost,stats,floor:floor.status});
 console.log(JSON.stringify({file,U:result.cost,genParks:stats.generatedMultiCellRepositions,both:stats.bothMachinesHaveGeneratedMultiCellReposition,floor:floor.status}));
 if(floor.thresholdProven&&stats.bothMachinesHaveGeneratedMultiCellReposition){accepted=file;break;}
}
fs.writeFileSync(root+'/report.json',JSON.stringify({accepted,rows,counts},null,2),{flag:'wx'});console.log(JSON.stringify({root,accepted,rows:rows.length,counts}));
