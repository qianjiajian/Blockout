import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL} from './low-band-advanced-context.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const out='deliverables/daily-formal-v4-20261008/proof/low-band-two-entry-root-ready-01';
const toolBindings={},independentTestReports=[];
const specs=[['low-band-advanced-entry-root-repeat-01','LOW_BAND_ADVANCED_ENTRY_PRIVATE_QUALIFICATION_PASS',4],
 ['low-band-advanced-context-root-repeat-01','LOW_BAND_ADVANCED_CONTEXT_PRIVATE_QUALIFICATION_PASS',3],
 ['low-band-append-root-repeat-01','LOW_BAND_APPEND_PROTOCOL_QUALIFICATION_PASS',2]];
for(const [dir,status,count]of specs){const p=`deliverables/daily-formal-v4-20261008/proof/${dir}/report.json`,b=await fs.readFile(p),q=JSON.parse(b);
 assert.equal(q.status,status);assert.equal(q.evidence.length,count);assert(q.evidence.every(t=>t.passed));assert.equal(q.newPublicClaims,0);
 for(const [p,h]of Object.entries(q.toolBindings)){assert.equal(sha(await fs.readFile(p)),h);if(toolBindings[p])assert.equal(toolBindings[p],h);toolBindings[p]=h;}
 independentTestReports.push({path:p,sha256:sha(b)});}
const components={path:'deliverables/daily-formal-v4-20261008/proof/low-band-two-components-root-independent-01/report.json',
 sha256:'2cc9165ac9f4300bf97bf725e99e0c1f8d766bbdc0ffbf0b6bb32992e03dcff6'};
const bytes=await fs.readFile(components.path);assert.equal(sha(bytes),components.sha256);const c=JSON.parse(bytes);
assert.equal(c.status,'INDEPENDENT_LOW_BAND_BASE_AND_D2_KEY_COMPONENTS_PASS');assert.deepEqual(c.errors,[]);
for(const [p,h]of Object.entries(c.toolBindings))assert.equal(sha(await fs.readFile(p)),h);
const runner='tools/daily-challenge/formal-v4/run-low-band-two-advanced.mjs';toolBindings[runner]=sha(await fs.readFile(runner));
for(const d of [LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL])assert.equal(sha(await fs.readFile(d.path)),d.sha256);
const report={status:'ROOT_LOW_BAND_TWO_ADVANCED_ENTRY_READY',passed:true,reviewer:'root independent source review and private test repetitions',
 proposal:LOW_BAND_TWO_PROPOSAL,selection:LOW_BAND_SEED147,toolBindings,independentTestReports,previousComponentReview:components,
 privateEntryContextAppendTests:9,previousIndependentComponentTests:12,
 reviewedProperties:[
  'Only exact original 009 and 013 accepted files may enter their predetermined D2 stages; no metadata alias or failed original retry.',
  'Real source100 20/48-cell redrafts retain full reference ancestry; classification never claims a wholly unrelated board.',
  'Original147 receipt bytes and full legacy public/construction evidence are checked before each stage. New appended records additionally require exact new entry version, configuration and mechanism evidence.',
  'Construction uses one stage-independent identity and a shared maximum10000 complete worlds; actual final object has its own original bounded L21 and full two-model U.',
  'Private controls cover lower shortcuts, terminal generator budget exhaustion, cross-stage retry, false configurations, false appended acceptance, missing147 and namespace abuse.',
  'Root runner executes exactly two rows, reloads each successful record from immutable JSON for the next context, retains failures and never writes production.',
 ],newPublicClaims:0,newActualBaseAdaptations:0,actualTwoNewObjectsValidated:false,currentRuntimeValidationClaimed:false,formalReady:false,productionChanged:false};
await fs.mkdir(out,{recursive:false});const data=JSON.stringify(report,null,2)+'\n';await fs.writeFile(out+'/report.json',data,{flag:'wx'});
console.log(JSON.stringify({path:out+'/report.json',sha256:sha(data),status:report.status}));
