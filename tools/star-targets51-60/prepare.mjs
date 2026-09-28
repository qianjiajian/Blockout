// Derive a fresh task-local runner from the already reviewed natural input loop.
// Historical tools and evidence remain immutable.
import fs from 'node:fs';
const root='tools/star-targets51-60';
fs.mkdirSync(root,{recursive:true});
let runner=fs.readFileSync('tools/star-targets31-40/playtest.mjs','utf8');
runner=runner.replaceAll('tools/star-targets31-40','tools/star-targets51-60')
 .replaceAll('deliverables/star-targets31-40-20260927','deliverables/star-targets51-60-20260927')
 .replaceAll('src/core/nativeRemake31to40.ts','src/core/remake51to60.ts')
 .replaceAll(",'tools/star-targets51-60/playtest-header.txt'",'')
 .replaceAll('35/36/38/39 scoring-only','52/54/55/56/58/59 scoring-only')
 .replaceAll('other196Preserved','other194Preserved')
 .replaceAll('allFourScoringLevelsValidated','allSixScoringLevelsValidated')
 .replace('note:id===36?"Current valid route U11 does not recertify the historical simple-band U10; scoring PASS is independent.":"This run verifies scoring and full playability; no new lower-bound claim."',
  'note:id===59?"The user-authorized formal level keeps its lower bound UNKNOWN; this scoring run does not certify L16.":id===58?"The accepted lower-bound exception remains unchanged; this is a scoring verification.":"This run verifies scoring and full playability; no new lower-bound claim."');
fs.writeFileSync(root+'/playtest.mjs',runner);
let browser=fs.readFileSync('tools/star-targets31-40/browser.mjs','utf8')
 .replace('[35,36,38,39]','[52,54,55,56,58,59]').replace('four explicitly','six explicitly');
fs.writeFileSync(root+'/browser.mjs',browser);
let html=fs.readFileSync('tools/star-targets31-40/index.html','utf8')
 .replaceAll('star-targets31-40','star-targets51-60').replace('35/36/38/39','52/54/55/56/58/59');
fs.writeFileSync(root+'/index.html',html);
