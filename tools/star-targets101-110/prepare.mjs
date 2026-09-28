// New scoring evidence only. The historical runners and reports are unchanged.
import fs from 'node:fs';
const dir='tools/star-targets101-110';
let runner=fs.readFileSync('tools/star-targets51-60/playtest.mjs','utf8')
 .replaceAll('star-targets51-60','star-targets101-110')
 .replaceAll('src/core/remake51to60.ts','src/core/remake101to110.ts')
 .replaceAll('52/54/55/56/58/59 scoring-only','101–110 scoring-only')
 .replaceAll('other194Preserved','otherLevelsPreserved')
 .replaceAll('historicalRoutesPreserved','historicalEvidencePreserved')
 .replaceAll('allSixScoringLevelsValidated','allTenScoringLevelsValidated')
 .replace("'tools/star-targets101-110/prepare.mjs']","'tools/star-targets101-110/prepare.mjs','deliverables/star-targets101-110-20260927/plan.json']")
 .replace('assert.equal(replay.effectiveDrags,TARGETS[id]);','assert.equal(replay.effectiveDrags,row.drags.length);assert(replay.effectiveDrags<=TARGETS[id]);')
 .replace('assert.equal(final.moves,TARGETS[id]);','assert.equal(final.moves,drags.length);assert(final.moves<=TARGETS[id]);')
 .replace('assert.equal(result.storage.save.bestMoves[String(id)],TARGETS[id]);','assert.equal(result.storage.save.bestMoves[String(id)],drags.length);')
 .replace('note:id===59?"The user-authorized formal level keeps its lower bound UNKNOWN; this scoring run does not certify L16.":id===58?"The accepted lower-bound exception remains unchanged; this is a scoring verification.":"This run verifies scoring and full playability; no new lower-bound claim."',
 'note:[102,109].includes(id)?"User-accepted below original L16; this scoring verification does not change that status.":"Scoring and route only; no current lower-bound recertification."');
fs.writeFileSync(dir+'/playtest.mjs',runner,{flag:'wx'});
let browser=fs.readFileSync('tools/star-targets51-60/browser.mjs','utf8').replace('[52,54,55,56,58,59]','[101,102,103,104,105,106,107,108,109,110]').replace('six explicitly','ten explicitly');
fs.writeFileSync(dir+'/browser.mjs',browser,{flag:'wx'});
fs.writeFileSync(dir+'/index.html',fs.readFileSync('tools/star-targets51-60/index.html','utf8').replaceAll('star-targets51-60','star-targets101-110').replace('52/54/55/56/58/59','101–110'),{flag:'wx'});
