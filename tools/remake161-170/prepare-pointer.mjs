import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='tools/remake161-170';
let browser=fs.readFileSync('tools/remake141to150-browser.mjs','utf8');
browser=browser.replace('id<141||id>150','id<161||id>170').replace('revised-2026-09-23-v1.4','revised-2026-09-27-v1.5');
fs.writeFileSync(root+'/browser.mjs',browser,{flag:'wx'});
let html=fs.readFileSync('tools/remake141to150.html','utf8').replaceAll('141–150','161–170').replace('/tools/remake141to150-browser.mjs','/tools/remake161-170/browser.mjs');
fs.writeFileSync(root+'/index.html',html,{flag:'wx'});
let harness=fs.readFileSync('tools/playtest-remake141to150-v173.mjs','utf8');
harness=harness.replace("import {loadApi,BASELINE,OUTPUT,checkCandidate,ruleGate,VERSION} from './remake141to150-v173.mjs';",`import {BASELINE,ROOT as OUTPUT,auditSpatial,ruleGate} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
const VERSION=ruleGate().activeVersion;
const checkCandidate=async(data,baseline,api)=>({spatial:auditSpatial(data.level,api),route:replay(data.level,data.drags,api,{complete:true}),source:{sourceBindings:{}},sourceValidated:false,lowerBoundCertified:false});
const bombSpatialApi=api=>({replayRevisedRoute:(l,d)=>replay(l,d,api)});`);
harness=harness.replace("'./revised-preview-validation-v160.mjs'","'../revised-preview-validation-v160.mjs'")
 .replace("'./campaign-v145/lv141-150/observed-timing-flips.mjs'","'../campaign-v145/lv141-150/observed-timing-flips.mjs'")
 .replace("import {bombSpatialApi} from './remake141to150-v173.mjs';",'')
 .replace("'./remake121to130-wiring-drift.mjs'","'../remake121to130-wiring-drift.mjs'")
 .replace("'./remake91to100-data-drift.mjs'","'../remake91to100-data-drift.mjs'");
harness=harness.replace('id===141+i','id===161+i').replaceAll('tools/remake141to150-browser.mjs',root+'/browser.mjs')
 .replaceAll('tools/remake141to150.html',root+'/index.html').replaceAll('tools/playtest-remake141to150-v173.mjs',root+'/pointer.mjs')
 .replaceAll('tools/remake141to150-v173.mjs',root+'/common.mjs');
assert(!harness.includes("from './remake"));
fs.writeFileSync(root+'/pointer.mjs',harness,{flag:'wx'});
console.log('Created isolated 161–170 Pointer harness; source validation and floor certification are separate gates.');
