import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {search} from './author-search68-69.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const seed=Number(process.env.SEED??1470068),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],{api}=await loadApi();
let base=JSON.parse(fs.readFileSync(process.argv[2])),rank=Number(process.env.RANK??11),attempt=0,valid=0,witness=0;
const deadline=Date.now()+Number(process.env.SECONDS??300)*1000,out='deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69';
while(Date.now()<deadline){attempt++;const data=structuredClone(base),l=data.level;
 for(let z=0;z<1+Math.floor(rng.rand()*3);z++){
  if(rng.rand()<0.3){const g=pick(l.gates),n={...g,offset:g.offset+pick([-2,-1,1,2])};if(rng.rand()<0.25)n.side=pick(['top','bottom','left','right']);Object.assign(g,n);}
  else {const a=pick(rng.rand()<0.85?l.blocks.filter(b=>!b.shutterId):l.blocks),choices=l.blocks.filter(b=>b!==a&&b.shutterId===a.shutterId&&JSON.stringify(b.shape)===JSON.stringify(a.shape));if(!choices.length)continue;const b=pick(choices),ax=a.x,ay=a.y;a.x=b.x;a.y=b.y;b.x=ax;b.y=ay;}
 }
 try{api.validateLevel(l);if(!auditOpeningCoverage(new api.PuzzleModel(l).snapshot()).passed||!auditGateSpanLimits(l).passed)continue;const errors=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(errors.length)continue;}catch{continue;}
 valid++;const result=search(l,{floor:21,maxStates:150000,maxMilliseconds:2500,orderSeed:attempt%l.blocks.length});if(result.status!=='witness')continue;
 const replay=api.replayRevisedRoute(l,result.drags);if(!replay.valid||!replay.complete)continue;witness++;
 const lower=checkLiftFloor(l,api,{floor:16,maxStates:500000,maxMilliseconds:10000});
 const file=`${out}/mutate68-${seed}-${attempt}-${Date.now()}.json`;
 if(lower.cost>=rank||lower.status!=='relaxed-shortcut')fs.writeFileSync(file,JSON.stringify({...data,levelSha256:digest(l),drags:result.drags,replay,search:result,lowerBound:lower,lowerBoundStatus:lower.thresholdProven?'PASS':lower.status,pointerStatus:'NOT_RUN',formalAdopted:false,mutation:{seed,attempt,parentSha256:digest(base.level)}},null,2));
 console.log(JSON.stringify({attempt,valid,witness,U:replay.nonClearingDrags,lower:lower.status,L:lower.cost??lower.floor,file}));
 if(lower.thresholdProven)break;
 if(lower.cost>rank){base=data;rank=lower.cost;console.log(JSON.stringify({rank,parent:file}));}
}
console.log(JSON.stringify({attempt,valid,witness,rank}));
