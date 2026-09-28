import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {checkNativePrunedFloor} from './prefix96.mjs';
const {api}=await loadApi(),input=process.argv[2],d=JSON.parse(fs.readFileSync(input));for(const goalClears of [6,8]){const proof=checkNativePrunedFloor(d.level,api,{floor:11,goalClears,maxStates:1000000,maxMilliseconds:10000}),file='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/prefix-proof148-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({input,level:d.level,goalClears,proof,qualified:false},null,2));console.log(JSON.stringify({file,goalClears,proof}));}
