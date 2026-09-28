import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
import {searchLiftWitness} from './lift-witness-search.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',baseFile=root+'/draft66-1201-1790249551254.json',base=JSON.parse(fs.readFileSync(baseFile)),{api}=await loadApi(),seed=Number(process.env.SEED??1476601),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],end=Date.now()+Number(process.env.SECONDS??240)*1000;
for(let attempt=1;Date.now()<end;attempt++){
 const level=structuredClone(base.level),gate=pick(level.gates),side=pick(['top','bottom','left','right']),length=['top','bottom'].includes(side)?level.width:level.height,size=gate.size;
 gate.side=side;gate.offset=Math.floor(rng.rand()*(length-size+1));
 const used=new Set();let okay=true;for(const g of level.gates)for(let j=0;j<g.size;j++){const k=g.side+':'+(j+g.offset);if(used.has(k))okay=false;used.add(k);}if(!okay)continue;
 if(level.blocks.filter(b=>(b.layers??[b.color]).includes(gate.color)).some(b=>1+Math.max(...b.shape.map(p=>['left','right'].includes(side)?p[1]:p[0]))>size))continue;
 try{api.validateLevel(level);}catch{continue;}
 const search=searchLiftWitness(level,{floor:16,maxMilliseconds:1000,maxStates:100000,orderSeed:attempt%level.blocks.length});if(search.status!=='witness'||search.cost<11)continue;
 const replay=api.replayRevisedRoute(level,search.drags);if(!replay.valid||!replay.complete)throw Error('bad witness');
 const proof=checkLiftFloor(level,api,{floor:11,maxMilliseconds:30000,maxStates:800000});console.log(JSON.stringify({attempt,U:search.cost,proof:proof.status,cost:proof.cost,states:proof.states}));
 if(proof.thresholdProven){const out=root+'/draft66-refined-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({ruleVersion:'1.47.0',level,drags:search.drags,replay,search,proof,sourceStatus:'review-required',levelSha256:digest(level),formalAdopted:false,reproduction:{baseFile,baseFileSha256:digest(fs.readFileSync(baseFile)),seed,attempt,tool:'tools/campaign-v145/lv061-070/refine66.mjs',toolSha256:digest(fs.readFileSync('tools/campaign-v145/lv061-070/refine66.mjs'))}},null,2));console.log(out);break;}
}
