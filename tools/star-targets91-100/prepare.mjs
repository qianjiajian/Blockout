// Reuse the reviewed real-input loop without changing historical tools/reports.
import fs from 'node:fs';
const root='tools/star-targets91-100',previous='tools/star-targets41-50';
let playtest=fs.readFileSync(previous+'/playtest.mjs','utf8')
 .replaceAll('star-targets41-50','star-targets91-100')
 .replaceAll('src/core/remake41to50.ts','src/core/remake91to100.ts')
 .replaceAll('41/43/44/46/47/48/50 scoring-only','91–100 scoring-only')
 .replaceAll('other193Preserved','otherLevelsPreserved')
 .replaceAll('allSevenScoringLevelsValidated','allRequestedScoringLevelsValidated')
 .replace(",'tools/star-targets91-100/playtest-header.txt'",'');
// Source routes may have been repaired under later rules. Pin the separately
// audited sourceEvidence to the exact current gameplay, not the old batch route.
const originalStart=playtest.indexOf('for(const row of witnesses.rows){\n const original=row.originalSource;');
const compiledStart=playtest.indexOf('const compiled=await build',originalStart);
if(originalStart<0||compiledStart<0)throw Error('Reviewed harness header changed');
playtest=playtest.slice(0,originalStart)+playtest.slice(compiledStart);
fs.writeFileSync(root+'/playtest.mjs',playtest);
let browser=fs.readFileSync(previous+'/browser.mjs','utf8')
 .replace("import {ColorEscapeGame}","import {IDS} from './config.mjs';\nimport {ColorEscapeGame}")
 .replace('[41,43,44,46,47,48,50].includes(id)','IDS.includes(id)')
 .replace('seven explicitly','explicitly');
fs.writeFileSync(root+'/browser.mjs',browser);
fs.writeFileSync(root+'/index.html',fs.readFileSync(previous+'/index.html','utf8')
 .replaceAll('star-targets41-50','star-targets91-100')
 .replaceAll('41/43/44/46/47/48/50','91–100'));
