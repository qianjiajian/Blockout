import fs from'node:fs';
import assert from'node:assert/strict';
import{loadIsolatedApi}from'./isolated-api.mjs';
import{check129Floor,verify129RouteProjection}from'./check129.mjs';
import{digest}from'../../../revised-preview-validation-v160.mjs';
import{ruleGate}from'../../../remake121to130-v172.mjs';
const api=await loadIsolatedApi(),lock=ruleGate(),input=process.argv[2],d=JSON.parse(fs.readFileSync(input));
const projection=verify129RouteProjection(d.level,d.drags,api);assert(projection.valid,projection.error);
const mutations=[['foreign-id',l=>l.id=127],['changed-geometry',l=>l.playable.pop()],['missing-body',l=>l.blocks.pop()],['missing-queue',l=>l.generators[0].queueBlockIds.pop()],['extra-generator',l=>l.generators.push({...l.generators[0],id:'bad'})],['queue-ice',l=>l.blocks.find(b=>b.id===l.generators[0].queueBlockIds[0]).frozen=1],['time-generator',l=>l.generators[0].trigger='time'],['bomb',l=>l.blocks[0].timedBombSeconds=11],['key',l=>l.blocks[0].keyId='bad'],['axis',l=>l.blocks[0].movementAxis='horizontal'],['lift',l=>l.shutters[0].skin='lift'],['changed-cover-count',l=>l.shutters[0].count=22],['missing-shell',l=>delete l.blocks.find(b=>b.layers).layers],['ice-value',l=>l.blocks.find(b=>b.frozen).frozen=9],['gate-value',l=>l.gates.find(g=>g.color==='red').frozen=3],['star',l=>l.blocks[0].star=true]];
const negative=mutations.map(([label,mutate])=>{const l=structuredClone(d.level);mutate(l);const result=check129Floor(l,api,{floor:11,maxStates:1,maxMilliseconds:1});assert.equal(result.status,'unsupported',label);return{label,status:result.status,reason:result.reason};});
// Assert the copied algorithms differ only in the explicit domain import/name.
const root='tools/campaign-v145/lv121-130/',text=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
assert.equal(text(root+'round3-c/generator-floor129.mjs'),text(root+'round3-b/generator-floor127.mjs').replaceAll('Lv127','Lv129').replaceAll('./generator-domain127.mjs','./generator-domain129.mjs'));
assert.equal(text(root+'round3-c/generator-plain129.mjs'),text(root+'round3-b/generator-plain127.mjs').replaceAll('./generator-floor127.mjs','./generator-floor129.mjs'));
const proof=check129Floor(d.level,api,{floor:11,maxStates:1000000,maxMilliseconds:30000});assert(proof.thresholdProven,JSON.stringify(proof));
const tools=['generator-domain129.mjs','generator-floor129.mjs','generator-plain129.mjs','check129.mjs','qualify129.mjs'].map(name=>({path:root+'round3-c/'+name,sha256:digest(fs.readFileSync(root+'round3-c/'+name))}));
const report={passed:true,ruleVersion:lock.activeVersion,input,levelSha256:digest(d.level),routeSha256:digest(d.drags),projection,negative,proof,tools,algorithmMatchesQualified127:true,method:'Explicit129 domain,39real bodies,9fixed FIFO cargo,4shells,2ordinary countdown covers,ice10 retained. Optional-spawn graph plus atomic plain-cargo clears; no queue identity quotient, no shell-peel normalization.'};
const file='deliverables/campaign121-130-v146-20260924/round3-c/qualified129-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,passed:true,states:proof.exploredStates,negative:negative.length,projectionCost:projection.projectedNonClearingDrags}));
