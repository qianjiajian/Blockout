import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {search} from './author-search68-69.mjs';
const path=process.argv[2],data=JSON.parse(fs.readFileSync(path));
const {api}=await loadApi(),level=data.level;
for(let orderSeed=0;orderSeed<Number(process.env.ORDERS??1);orderSeed++){
 const result=search(level,{floor:Number(process.env.FLOOR??40),maxStates:Number(process.env.STATES??500000),maxMilliseconds:Number(process.env.MS??50000),orderSeed});
 console.log(JSON.stringify({...result,bestState:undefined,drags:undefined}));
 if(result.status!=='witness')continue;
 const replay=api.replayRevisedRoute(level,result.drags);console.log(JSON.stringify(replay));
 if(!replay.valid||!replay.complete)continue;
 const file=`deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69/solved${level.id}-${Date.now()}.json`;
 fs.writeFileSync(file,JSON.stringify({...data,result:undefined,levelSha256:digest(level),drags:result.drags,replay,search:result,lowerBoundStatus:'NOT_RUN',pointerStatus:'NOT_RUN',formalAdopted:false},null,2));console.log(file);break;
}
