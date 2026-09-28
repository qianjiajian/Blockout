import fs from 'node:fs';
import {api,save,hash} from './common.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),c=raw.candidate??raw,level=c.level,attempts=[];
for(let orderSeed=0;orderSeed<level.blocks.length;orderSeed++){
 const result=search(level,{floor:31,maxStates:250000,maxMilliseconds:1000,orderSeed,weight:orderSeed%3===0?50:1000});
 attempts.push({orderSeed,status:result.status,cost:result.cost,states:result.states,stop:result.stop});
 if(result.status==='witness'){const replay=api.replayRevisedRoute(level,result.drags);if(replay.valid&&replay.complete){const file=save(`candidate126-improved`,{...raw,priorCandidate:input,candidate:{...c,search:result,replay,levelSha256:hash(level)}});console.log(JSON.stringify({file,cost:result.cost,drags:result.drags.length}));if(result.cost<=30)break;}}
}
console.log(JSON.stringify({file:save('optimize126-attempts',{input,attempts})}));
