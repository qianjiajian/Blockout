import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {checkSymmetryGeneratorFloor} from './validation-symmetry-floor.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.93.0','1.94.0','1.95.0'].includes(lock.activeVersion));
const {api}=await loadApi();
const files=['design-search-1790507968492/attempt-643.json','design-opposed-1790508541800/attempt-952.json','design-opposed-1790508541800/attempt-265.json'];
const bases=files.map(p=>JSON.parse(fs.readFileSync('deliverables/lv70-remake-20260927/'+p)));
const design=fs.readFileSync('tools/lv70-remake-20260927/design-search.mjs','utf8');
const statistics=new Function('assert','return '+design.slice(design.indexOf('export function statistics')+7,design.indexOf('\nlet attempts=0')))(assert);
let seed=Number(process.argv[2]??193070);const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rand()*a.length)];
const root=`deliverables/lv70-remake-20260927/root-ice-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const deadline=Date.now()+55000,rows=[],counts={valid:0,solved:0,mechanism:0};let accepted;
for(let i=0;Date.now()<deadline;i++){
 const bi=i%3,level=structuredClone(bases[bi].level),gates=level.gates.filter(g=>g.color!=='blue'),gen=pick(level.generators);
 // Make one of the next doors need a queue event, rather than only opening bodies.
 const colors=bi===0?['pink','green','yellow']:['green','pink','yellow'],values=pick([[1,3,18],[1,5,20],[1,7,22],[1,4,16],[1,3,20]]);
 for(const g of gates)g.frozen=values[colors.indexOf(g.color)];
 if(i%2){const q=gen.queueBlockIds,a=Math.floor(rand()*q.length),b=Math.floor(rand()*q.length);[q[a],q[b]]=[q[b],q[a]];}
 if(!auditGeneratorQueueColors(level).passed)continue;
 if(i%4===0){const ids=new Set(level.generators.flatMap(g=>g.queueBlockIds)),bodies=level.blocks.filter(b=>!ids.has(b.id)),a=pick(bodies),b=pick(bodies.filter(b=>b!==a&&JSON.stringify(b.shape)===JSON.stringify(a.shape)));[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}
 try{api.validateLevel(level);const issues=api.auditRevisedCandidate(level,undefined).issues.filter(x=>x.category!=='source'&&x.code!=='wrong-rule-profile');if(issues.length)continue;}catch{continue;}
 counts.valid++;const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:100000,maxMilliseconds:500,weight:pick([10,1000]),orderSeed:i%36});
 if(result.status!=='witness'||result.cost<11)continue;counts.solved++;
 const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete)continue;
 const stats=statistics(level,result.drags,api);counts.mechanism++;
 level.preservedMoveTarget=result.drags.length;
 const floor=result.cost<=15?checkSymmetryGeneratorFloor(level,api,{floor:11,maxStates:250000,maxMilliseconds:2000}):{status:'ABOVE_BAND_NOT_SCREENED',thresholdProven:false};
 const file=`${root}/candidate-${i}.json`,data={level,drags:result.drags,replay,statistics:stats,floor,baseFile:files[bi],levelSha256:digest(level),ruleVersion:lock.activeVersion};
 fs.writeFileSync(file,JSON.stringify(data,null,2),{flag:'wx'});rows.push({file,U:result.cost,stats,floor:floor.status});
 console.log(JSON.stringify({file,U:result.cost,ice:gates.map(g=>[g.color,g.frozen]),genParks:stats.generatedMultiCellRepositions,floor:floor.status}));
 if(floor.thresholdProven&&stats.generatedMultiCellRepositions>=2){accepted=file;break;}
}
fs.writeFileSync(root+'/report.json',JSON.stringify({accepted,rows,counts},null,2),{flag:'wx'});console.log(JSON.stringify({root,accepted,rows:rows.length,counts}));
