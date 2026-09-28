import fs from 'node:fs';
import assert from 'node:assert/strict';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const source=process.argv[2], maxMilliseconds=Number(process.argv[3]??30000), maxStates=Number(process.argv[4]??1000000);
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const data=JSON.parse(fs.readFileSync(source)), qualificationFile='deliverables/lv17-remake-20260927/validation-qualification-1790495649173.json';
const qualification=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(qualification.status,'PASS');
const bindings={};const bind=p=>bindings[p]=digest(fs.readFileSync(p));
for(const p of [source,qualificationFile,'tools/lv17-remake-20260927/design-floor.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md'])bind(p);
for(const[p,h]of Object.entries(qualification.bindings)){assert.equal(digest(fs.readFileSync(p)),h,p);bind(p);}
const started=Date.now(),floor=checkSymmetryFloor(data.level,{floor:11,maxMilliseconds,maxStates});
const output=`deliverables/lv17-remake-20260927/design-floor-${Date.now()}.json`;
const report={source,ruleVersion:lock.activeVersion,levelSha256:digest(data.level),routeUpperBound:data.replay?.nonClearingDrags??null,qualificationFile,budgets:{maxMilliseconds,maxStates},floor,elapsedMs:Date.now()-started,bindings,drift:Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h)};
assert.deepEqual(report.drift,[]);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,...floor,relaxedRoute:undefined,elapsedMs:report.elapsedMs}));
