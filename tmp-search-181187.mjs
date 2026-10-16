import fs from 'node:fs';
import {loadApi} from './tools/remake181to190-v146.mjs';
const {api}=await loadApi();
const files={181:'deliverables/remake181-190-v146-20260924/source181-185/candidate181-enriched-v147-1790250902589.json',187:'deliverables/remake181-190-v146-20260924/proof-support/candidate187-enriched-v147-1790248152967.json'};
for(const id of [181,187]){
 const d=JSON.parse(fs.readFileSync(files[id]));
 const level=structuredClone(d.level);
 if(id===181) for(const b of level.blocks) delete b.timedBombSeconds;
 const result=api.searchRevisedLevel(level,{maxStates:100000,maxDragStates:300,maxTransitions:500000,maxMilliseconds:60000});
 console.log(JSON.stringify({id,status:result.status,termination:result.termination,witnessFound:result.witnessFound,exploredStates:result.exploredStates,discoveredStates:result.discoveredStates,attemptedTransitions:result.attemptedTransitions,replay:result.replay,reasons:result.reasons,drags:result.drags?.length},null,2));
 if(result.witnessFound) fs.writeFileSync(`deliverables/star-targets181-187-20260929/search-${id}.json`,JSON.stringify({id,source:files[id],level,drags:result.drags,search:result},null,2)+'\n');
}
