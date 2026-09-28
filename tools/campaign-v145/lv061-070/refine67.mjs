import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
import {searchLiftWitness} from './lift-witness-search.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',baseFile=root+'/draft67-54-1790251128707.json',base=JSON.parse(fs.readFileSync(baseFile)),{api}=await loadApi();
const variants=[{blue:{offset:3}},{blue:{size:3}},{red:{offset:6}},{red:{size:3}},{blue:{offset:3},red:{offset:6}},{blue:{offset:3},red:{size:3}}];
for(const [i,changes]of variants.entries()){
 const level=structuredClone(base.level);for(const[color,patch]of Object.entries(changes))Object.assign(level.gates.find(g=>g.color===color),patch);api.validateLevel(level);
 const search=searchLiftWitness(level,{floor:16,maxMilliseconds:5000,maxStates:250000,orderSeed:i});if(search.status!=='witness'){console.log(JSON.stringify({i,status:search.status,best:search.best?.clears}));continue;}
 const replay=api.replayRevisedRoute(level,search.drags);if(!replay.valid||!replay.complete)throw Error('witness replay failed');const out=root+'/draft67-gate-'+i+'-'+Date.now()+'.json';
 const proof=checkLiftFloor(level,api,{floor:11,maxMilliseconds:20000,maxStates:300000});fs.writeFileSync(out,JSON.stringify({ruleVersion:'1.47.0',level,drags:search.drags,replay,search,proof,levelSha256:digest(level),sourceStatus:'review-required',formalAdopted:false,reproduction:{baseFile,baseFileSha256:digest(fs.readFileSync(baseFile)),enumeratedVariant:i,changes,toolSha256:digest(fs.readFileSync(import.meta.filename))}},null,2));console.log(JSON.stringify({out,U:search.cost,proof:proof.status,cost:proof.cost,states:proof.states}));if(proof.thresholdProven)break;
}
