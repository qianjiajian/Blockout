// Copy a mature scoring-only input harness into a new immutable evidence scope.
import fs from'node:fs';import assert from'node:assert/strict';
const dir='tools/star-targets161-170';fs.mkdirSync(dir,{recursive:true});
let runner=fs.readFileSync('tools/star-targets101-110/playtest.mjs','utf8')
 .replaceAll('star-targets101-110','star-targets161-170')
 .replaceAll('src/core/remake101to110.ts','src/core/remake161to170.ts')
 .replaceAll('101–110 scoring-only','161/167/168/170 scoring-only')
 .replaceAll('allTenScoringLevelsValidated','allFourScoringLevelsValidated')
 .replaceAll('pointer-support','pointer')
 .replaceAll('tools/star-targets161-170/prepare.mjs','tools/star-targets161-170/prepare-harness.mjs')
 .replaceAll('deliverables/star-targets161-170-20260927/plan.json','deliverables/star-targets161-170-20260927/pointer/plan.json')
 .replace('note:[102,109].includes(id)?"User-accepted below original L16; this scoring verification does not change that status.":"Scoring and route only; no current lower-bound recertification."','note:"Scoring-only verification; unchanged full-inventory difficulty evidence remains separate."');
assert(!runner.includes('star-targets101-110'));fs.writeFileSync(dir+'/playtest.mjs',runner,{flag:'wx'});
let browser=fs.readFileSync('tools/star-targets101-110/browser.mjs','utf8').replace('[101,102,103,104,105,106,107,108,109,110]','[161,167,168,170]').replace('ten explicitly','four explicitly');fs.writeFileSync(dir+'/browser.mjs',browser,{flag:'wx'});
const html=fs.readFileSync('tools/star-targets101-110/index.html','utf8').replaceAll('star-targets101-110','star-targets161-170').replaceAll('101–110','161/167/168/170');fs.writeFileSync(dir+'/index.html',html,{flag:'wx'});
console.log('Prepared isolated four-level scoring harness; no production file or old evidence modified.');
