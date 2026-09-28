import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
const input='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/enriched148-1790477823263.json',d=JSON.parse(fs.readFileSync(input)),{api}=await loadApi();
const budgets={floor:11,maxStates:2000000,maxMilliseconds:60000},proof=checkAxisFloor(d.level,api,budgets),out='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/independent-js148-'+Date.now()+'.json';
fs.writeFileSync(out,JSON.stringify({input,budgets,proof,purpose:'Single independent JS verification after terminated qualified native proof, not repeated candidate search'},null,2));console.log(JSON.stringify({out,proof}));
