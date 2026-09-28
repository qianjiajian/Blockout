// Create only this task's harness from the previously reviewed Pointer loop.
// Historical code and evidence stay byte-for-byte unchanged.
import fs from 'node:fs';
const target='tools/star-targets71-80',previous='tools/star-targets41-50';
fs.mkdirSync(target,{recursive:true});
let loop=fs.readFileSync(previous+'/playtest.mjs','utf8')
 .replaceAll('star-targets41-50','star-targets71-80')
 .replaceAll('src/core/remake41to50.ts','src/core/remake71to80.ts')
 .replaceAll('41/43/44/46/47/48/50 scoring-only','71/75/76/78/79 scoring-only')
 .replaceAll('other193Preserved','other195Preserved')
 .replaceAll('allSevenScoringLevelsValidated','allFiveScoringLevelsValidated')
 .replace(" if(row.id===43){assert.equal(source.status,'witness');assert(source.witnessFound&&source.replay?.valid&&source.replay?.complete);}\n else assert.deepEqual(omitTarget(source.level),omitTarget(row.level));", " assert.deepEqual(omitTarget(source.level),omitTarget(row.level));")
 .replace("'tools/star-targets71-80/playtest-header.txt'", "'tools/star-targets71-80/verification.mjs'");
if(loop.includes('row.id===43')||loop.includes('other193'))throw Error('Stale task-specific gate');
fs.writeFileSync(target+'/playtest.mjs',loop);
fs.writeFileSync(target+'/browser.mjs',fs.readFileSync(previous+'/browser.mjs','utf8')
 .replace('[41,43,44,46,47,48,50]','[71,75,76,78,79]').replace('seven explicitly','five explicitly'));
fs.writeFileSync(target+'/index.html',fs.readFileSync(previous+'/index.html','utf8')
 .replaceAll('star-targets41-50','star-targets71-80').replaceAll('41/43/44/46/47/48/50','71/75/76/78/79'));
