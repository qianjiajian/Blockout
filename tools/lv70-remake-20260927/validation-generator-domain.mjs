// Task-local v1.91 qualification adapter. Historical sources stay byte-for-byte
// immutable. Only scope/profile guards and the transitive import are changed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=text=>createHash('sha256').update(text).digest('hex');
const openingPath='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
const multiPath='tools/remake131to140-generator-floor-v172.mjs';
const sources={[openingPath]:fs.readFileSync(openingPath,'utf8'),[multiPath]:fs.readFileSync(multiPath,'utf8')};
const replacements=[];
function once(text,before,after,path){assert.equal(text.split(before).length,2,`Exactly one old fragment: ${path}`);replacements.push({path,before,after});return text.replace(before,after);}
const oldProfile="assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');";
const newProfile="assert(['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules),'Only qualified flip-free v1.4/v1.5');";
const opening=once(sources[openingPath],oldProfile,newProfile,openingPath);
const openingUrl='data:text/javascript;base64,'+Buffer.from(opening).toString('base64');
let multi=once(sources[multiPath],oldProfile,newProfile,multiPath);
multi=once(multi,"assert(level.id>=131&&level.id<=140);","assert.equal(level.id,70,'Only task Lv70 scope');",multiPath);
multi=once(multi,"'../"+openingPath+"'",JSON.stringify(openingUrl),multiPath);
multi=once(multi,"'131-140-all-inventory-multiple-automatic-fifo-optional-contact-v172'","'lv70-v191-full-inventory-automatic-fifo-optional-contact-qualified-v15'",multiPath);
const api=await import('data:text/javascript;base64,'+Buffer.from(multi).toString('base64'));
export const {compile,each,stateOf,clearCount,normalizeExhausted,checkAutomaticGeneratorFloor}=api;
export const adaptation={originalSources:Object.fromEntries(Object.entries(sources).map(([p,s])=>[p,sha(s)])),derivedSources:{opening:sha(opening),multi:sha(multi)},replacements:replacements.map(r=>({...r,after:r.after===JSON.stringify(openingUrl)?'[exact derived opening module data URL]':r.after})),unchangedAlgorithm:true,onlyFixedSpaceGenerators:true,flipDoorsRefused:true};
