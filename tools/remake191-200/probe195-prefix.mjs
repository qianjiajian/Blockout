import fs from 'node:fs';
import {keyFloor} from './author194-196/key-floor.mjs';
import {ROOT,writeNew,digest,ruleGate} from './common.mjs';
ruleGate();const file=ROOT+'/author194-196/candidate195-1790523872649.json',d=JSON.parse(fs.readFileSync(file));
const results=['pink','blue'].map(goalKeyGroup=>({goalKeyGroup,result:keyFloor(d.level,{floor:16,goalKeyGroup,maxMilliseconds:3000,maxStates:300000})}));
const out=ROOT+'/prefix195-probe-'+Date.now()+'.json';writeNew(out,{candidate:file,levelSha256:digest(d.level),budgetPerGoal:{maxMilliseconds:3000,maxStates:300000},results,formalAdopted:false});console.log(JSON.stringify({out,results:results.map(r=>({group:r.goalKeyGroup,status:r.result.status,states:r.result.discoveredStates,shortcut:r.result.relaxedNonClearingDrags}))}));
