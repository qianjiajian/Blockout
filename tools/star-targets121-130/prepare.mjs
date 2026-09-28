// Creates this task's independent harness from the previously reviewed live-input loop.
// Preparation never launches a browser or edits production data.
import fs from 'node:fs';
const ROOT='tools/star-targets121-130';
let body=fs.readFileSync('tools/star-targets141-150/playtest.mjs','utf8');body=body.slice(body.indexOf('const snapshotRoot='));
body=body.replaceAll('tools/star-targets141-150/index.html','tools/star-targets121-130/index.html');
const begin=body.indexOf('  report.acceptedConcurrentData='),end=body.indexOf('  const freshBuild=',begin);
if(begin<0||end<0)throw Error('Reference input-loop boundary changed');
body=body.slice(0,begin)+"  assert.deepEqual(report.currentWorkspaceDrift,[],'Runtime/art/rule/tool drift requires separate concrete review');\n"+body.slice(end);
body=body.replace("afterLock.activeVersion==='1.78.0'","afterLock.activeVersion===lock.activeVersion").replace('report.fullTenLevelBatchValidated=true','report.allThreeScoringLevelsValidated=true');
body=body.replace("for(const {id,level}of candidates)assert.deepEqual(clean(fresh.LEVELS[id-1]),level,'Current final requested map changed during Pointer input');","assert.deepEqual(clean(fresh.LEVELS),levels,'All200 formal objects preserved during Pointer');");
fs.writeFileSync(ROOT+'/playtest.mjs',fs.readFileSync(ROOT+'/playtest-header.txt','utf8')+'\n'+body);
let browser=fs.readFileSync('tools/star-targets141-150/browser.mjs','utf8').replace('[141,142,143,144,145,146,147,148,149,150]','[122,126,127]').replace('Only the ten explicitly authorized scoring verifications','Only the three explicitly authorized scoring verifications');fs.writeFileSync(ROOT+'/browser.mjs',browser);
let html=fs.readFileSync('tools/star-targets141-150/index.html','utf8').replaceAll('star-targets141-150','star-targets121-130').replace('141–150','122/126/127');fs.writeFileSync(ROOT+'/index.html',html);
