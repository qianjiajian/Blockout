// Copy the previously reviewed real-input loop into a task-owned harness.
// Runtime data gates remain local, so historical reports/tools are unchanged.
import fs from 'node:fs';
const root='tools/star-targets41-50';
const previous='tools/star-targets31-40';
let header=fs.readFileSync(previous+'/playtest-header.txt','utf8')
 .replaceAll('star-targets31-40','star-targets41-50')
 .replaceAll('src/core/nativeRemake31to40.ts','src/core/remake41to50.ts')
 .replaceAll('35/36/38/39 scoring-only','41/43/44/46/47/48/50 scoring-only')
 .replaceAll('other196Preserved','other193Preserved');
header=header.replace('const compiled=await build',`for(const row of witnesses.rows){
 const original=row.originalSource;assert(original&&witnesses.evidenceBindings[original.file]===original.sha256);
 assert.equal(digest(fs.readFileSync(original.file)),original.sha256);
 const document=JSON.parse(fs.readFileSync(original.file)),source=document.rows?.find(r=>r.id===row.id)??document;
 assert.equal(source.id??source.levelId,row.id);assert.deepEqual(source.drags,row.drags,'Original immutable route must match the newly audited witness');
 if(row.id===43){assert.equal(source.status,'witness');assert(source.witnessFound&&source.replay?.valid&&source.replay?.complete);}
 else assert.deepEqual(omitTarget(source.level),omitTarget(row.level));
}
const compiled=await build`);
fs.writeFileSync(root+'/playtest-header.txt',header);
let previousPlaytest=fs.readFileSync(previous+'/playtest.mjs','utf8');
let loop=previousPlaytest.slice(previousPlaytest.indexOf('const snapshotRoot='))
 .replaceAll('star-targets31-40','star-targets41-50')
 .replaceAll('allFourScoringLevelsValidated','allSevenScoringLevelsValidated')
 .replace('note:id===36?"Current valid route U11 does not recertify the historical simple-band U10; scoring PASS is independent.":"This run verifies scoring and full playability; no new lower-bound claim."', 'note:data.difficultyNote??"This run verifies scoring and full playability; no new lower-bound or difficulty recertification claim."');
fs.writeFileSync(root+'/playtest.mjs',header+'\n'+loop);
let browser=fs.readFileSync(previous+'/browser.mjs','utf8')
 .replace('[35,36,38,39]','[41,43,44,46,47,48,50]')
 .replace('four explicitly','seven explicitly');
fs.writeFileSync(root+'/browser.mjs',browser);
fs.writeFileSync(root+'/index.html',fs.readFileSync(previous+'/index.html','utf8')
 .replaceAll('star-targets31-40','star-targets41-50')
 .replaceAll('35/36/38/39','41/43/44/46/47/48/50'));
