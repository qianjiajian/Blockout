import fs from 'node:fs';
const src=fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/source146-150/route150-mask.mjs','utf8');
const text=`import {projectAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
import {compileLevel,forEachGesture,clearCount} from '../../../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey} from '../../../remake21to30-symmetry-floor-v139.mjs';
let api;export function search150(level,apiArg,milliseconds=300,maxCost=10){api=apiArg;return search(level,milliseconds,maxCost);}
`+src.slice(src.indexOf('class Heap'),src.indexOf('const omit='));
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-c/search150.mjs',text);
