import fs from 'node:fs';
import {loadApi} from '../../remake21to30-v120.mjs';
const {api}=await loadApi(),p='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/',d=JSON.parse(fs.readFileSync(p+'gate6-prototype64.json'));
d.drags=d.drags.slice(0,11);d.replay=api.replayRevisedRoute(d.level,d.drags);d.notComplete=true;console.log(d.replay);fs.writeFileSync(p+'gate6-prefix64.json',JSON.stringify(d,null,2));
let tool=fs.readFileSync('tools/campaign-v145/lv061-070/optimize-route64.mjs','utf8').replaceAll('OUTPUT,writeNew,ruleGate','writeNew,ruleGate').replaceAll('ruleGate();const input',"const OUTPUT='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';ruleGate();const input").replaceAll('/root64/','/').replace('round<5','round<20');
fs.writeFileSync('tools/campaign-v145/lv061-070/author-refine64.mjs',tool);
