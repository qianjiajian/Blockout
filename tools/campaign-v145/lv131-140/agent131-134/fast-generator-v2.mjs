// Witness-only adapter of the qualified true FIFO graph. Canonical contacts;
// free-clear closure is used only when every finite queue has fully emitted.
// No lower-bound claim is made. Authoritative replay remains mandatory.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let source=fs.readFileSync('tools/remake131to140-generator-floor-v172.mjs','utf8');
source=source.replace("'../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs'",JSON.stringify(pathToFileURL(path.resolve('deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs')).href));
source=source.replace('function search(level,','export function searchWitness(level,').replace('const score=i=>-nodes[i].cost;','const score=i=>nodes[i].clears*100-nodes[i].cost;');
source=source.replace("status:'relaxed-shortcut'","status:'witness'").replace('},{orderSeed});if(stop)break;','},{orderSeed,optionalExit:false});if(stop)break;').replace('return false;}});if(!found)','return false;}},{optionalExit:false});if(!found)');
source=source.replace("status:stop?'unknown':'threshold-proven',thresholdProven:!stop","status:stop?'unknown':'exhausted',thresholdProven:false");
const loaded=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
export const searchFast=loaded.searchWitness;
