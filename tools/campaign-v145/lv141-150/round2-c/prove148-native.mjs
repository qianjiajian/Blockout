import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {checkNativePrunedFloor} from './native96.mjs';
const {api}=await loadApi();for(const input of process.argv.slice(2)){const d=JSON.parse(fs.readFileSync(input)),proof=checkNativePrunedFloor(d.level,api,{floor:11,maxStates:2000000,maxMilliseconds:10000}),file='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/proof148-native-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({input,level:d.level,proof},null,2));console.log(JSON.stringify({file,input,proof}));}
