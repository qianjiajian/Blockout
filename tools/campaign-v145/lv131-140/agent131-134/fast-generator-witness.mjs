// Local witness-only adapter. Every accepted route must independently replay
// through current revisedLevelSearch; this adapter cannot certify a floor.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let source=fs.readFileSync('tools/campaign-v145/lv061-070/automatic-generator-floor.mjs','utf8');
source=source.replace("'../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs'",JSON.stringify(pathToFileURL(path.resolve('deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs')).href));
source=source.replace('function search(level,','export function searchWitness(level,');
source=source.replace('const score=i=>-nodes[i].cost;','const score=i=>nodes[i].clears*1000-nodes[i].cost;');
source=source.replace("status:'relaxed-shortcut'","status:'witness'");
source=source.replace('},{orderSeed});if(stop)break;','},{orderSeed,optionalExit:false});if(stop)break;');
source=source.replace("status:stop?'unknown':'threshold-proven',thresholdProven:!stop","status:stop?'unknown':'exhausted',thresholdProven:false");
const loaded=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
export const searchFast=loaded.searchWitness;
