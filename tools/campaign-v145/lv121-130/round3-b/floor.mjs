import fs from 'node:fs';
import {api,save,hash} from './common.mjs';
import {checkAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),c=raw.candidate??raw,level=c.level,floor=Number(process.argv[3]??5),ms=Number(process.argv[4]??30000);
let short=search(level,{floor,maxStates:2000000,maxMilliseconds:ms});let rep=short.status==='witness'?api.replayRevisedRoute(level,short.drags):null;
if(rep?.valid&&rep?.complete)console.log(JSON.stringify({shortcutFile:save(`shortcut${level.id}`,{input,levelSha256:hash(level),search:short,replay:rep}),cost:short.cost}));
else {let result=await checkAdvancedFloor(level,{floor,maxStates:1000000,maxMilliseconds:ms,maxTransitions:30000000,maxDragStates:10000});console.log(JSON.stringify({file:save(`floor${level.id}`,{input,levelSha256:hash(level),result}),status:result.status,termination:result.termination,states:result.discoveredStates}));}
