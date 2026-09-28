import fs from 'node:fs';
import {loadApi,auditDraft} from '../../../remake141to150-v173.mjs';
import {checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
const {api}=await loadApi();for(const input of process.argv.slice(2)){const d=JSON.parse(fs.readFileSync(input));let audit;try{audit=auditDraft(d,api);}catch(e){console.log(JSON.stringify({input,auditError:e.message}));continue;}const proof=checkAxisFloor(d.level,api,{floor:11,maxStates:600000,maxMilliseconds:12000});const file='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/proof148-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({input,level:d.level,audit,proof},null,2));console.log(JSON.stringify({file,input,proof}));}
