import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync(new URL('./author232-nested2.mjs',import.meta.url),'utf8');
assert(text.includes("from '../continuation211-colored-witness.mjs'"));
text=text.replace("from '../continuation211-colored-witness.mjs'","from '../regeneration211-design/fifo-witness214.mjs'");
text=text.replace("row.route=searchSpatial(level,api,{floor:16,maxMilliseconds:5000,maxStates:60000,maxTransitions:750000,normalize:true,orderSeed:seed%19})","const routeInput=structuredClone(level);routeInput.mechanismRules='revised-2026-09-23-v1.4';row.route=searchSpatial(routeInput,api,{floor:16,maxMilliseconds:4000,maxStates:40000,maxTransitions:750000,normalize:true,orderSeed:seed%19})");
fs.writeFileSync(new URL('./author232-fast.mjs',import.meta.url),text,{flag:'wx'});
