import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',file=process.argv[2]??root+'/candidate67-1790256228628.json',d=JSON.parse(fs.readFileSync(file)),r=d.reproduction;
assert.equal(d.level.id,67);assert.equal(r.seed,14706736);assert.equal(r.attempt,344);
const snapshot=fs.readFileSync(r.constructorSnapshot);assert.equal(digest(snapshot),r.constructorSha256);
const original=snapshot.toString('utf8'),cut=original.indexOf('let attempts=0,valid=0');assert(cut>0);
// Run the retained constructor's exact random stream without time-limited
// witness searches. Those searches consume no constructor RNG. The immutable
// accepted route is replayed separately by frozen-final-spec-67/reproduction-67.
for(const k of ['GUIDED','BOOTSTRAP','LOCK_PADDING','PREFIX','EDGE_CHAIN','CASCADE','LEFT_INTERIOR'])process.env[k]='0';
Object.assign(process.env,r.environment,{SEED:String(r.seed)});
let code=original.slice(0,cut).replace('id=Number(process.argv[2]??65)','id=67').replace(/^const constructorSource=.*\r?$/m,'');
const origin=path.resolve('tools/campaign-v145/lv061-070');code=code.replace(/from\s+'(\.[^']+)'/g,(_m,p)=>`from '${pathToFileURL(path.resolve(origin,p)).href}'`);
const out=`${root}/seed-reproduction67-${Date.now()}.json`,inputs=Object.fromEntries([r.constructorSnapshot,'tools/campaign-v145/lv061-070/native-pack67.mjs','deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs','deliverables/remake31-200-v145-20260924/baseline.json','src/game/formalBlockShapes.ts',import.meta.filename].map(p=>[p,digest(fs.readFileSync(p))]));
code+=`\nlet reproduced;for(let attempt=1;attempt<=${r.attempt};attempt++)reproduced=construct();assert(reproduced);assert.equal(digest(reproduced),${JSON.stringify(digest(d.level))});fs.writeFileSync(${JSON.stringify(out)},JSON.stringify(${JSON.stringify({status:'PASS',seed:r.seed,attempt:r.attempt,environment:r.environment,candidateFile:file,candidateFileSha256:digest(fs.readFileSync(file)),expectedLevelSha256:digest(d.level),reproducedLevelSha256:digest(d.level),constructorSnapshot:r.constructorSnapshot,inputs,method:'Exact original constructor RNG sequence through attempt344; witness exploration omitted because it consumes no constructor RNG; final whole level deep identity established by SHA256.'})},null,2)+'\\n',{flag:'wx'});console.log(JSON.stringify({out:${JSON.stringify(out)},status:'PASS',levelSha256:digest(reproduced)}));`;
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
