import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyRulesLock} from './verify-rules-lock.mjs';
const out='deliverables/league-full-20261001',reports={
 full:'playtest-results/league-full/1790842853218/report.json',
 flow:'playtest-results/league-full-flow/1790842752534/report.json',
 cross:'playtest-results/league-full-cross/1790842961351/report.json',
 ui:'playtest-results/league-full-ui/1790842961336/report.json',
};
assert(verifyRulesLock().ok);
const tests=JSON.parse(await readFile(`${out}/tests-final.json`,'utf8'));assert.equal(tests.numPassedTests,66);assert.equal(tests.numFailedTests,0);
for(const file of Object.values(reports)){const r=JSON.parse(await readFile(file,'utf8'));assert.equal(r.status,'PASS');assert.equal(r.errors.length,0);assert.equal((r.rows??r.results).length,2);}
const full=JSON.parse(await readFile(reports.full,'utf8'));
for(const row of full.rows){assert.equal(row.results.length,100);assert.equal(row.earned,9000);for(let i=0;i<100;i++){assert.equal(row.results[i].index,i+1);assert.equal(row.results[i].points,90);}}
const catalog=JSON.parse(await readFile(`${out}/catalog-verification.json`,'utf8'));assert.equal(catalog.status,'PASS');assert.equal(catalog.rows.length,100);
const scenarios=JSON.parse(await readFile(`${out}/season-scenarios.json`,'utf8'));assert.equal(scenarios.status,'PASS');
const files=['src/core/league.ts','src/core/leagueAccount.ts','src/core/leagueRun.ts','src/core/leagueLevels.ts','src/core/leagueLevelData.ts','src/game/ColorEscapeGame.ts','src/game/leagueUi.ts','src/game/leagueScroll.ts','src/game/leagueArtStore.ts','src/core/PuzzleModel.ts','src/core/levels.ts','src/core/formal201to210Data.ts','src/core/formal211to220Data.ts','src/core/formal221to230Data.ts','tools/generate-league-catalog.mjs','tools/verify-league-catalog.mjs','tools/playtest-league-full.mjs','tools/playtest-league-full-flow.mjs','tools/playtest-league-full-cross.mjs','tools/playtest-league-full-ui.mjs','docs/rules/mechanism-rules-v1.134.0.md',`${out}/tests-final.json`,`${out}/catalog-verification.json`,`${out}/season-scenarios.json`,...Object.values(reports),...Array.from({length:100},(_,i)=>`${out}/levels/${String(i+1).padStart(3,'0')}.json`)];
const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile(`${out}/completion.json`,JSON.stringify({status:'PASS_FULL_LEAGUE',activeVersion:'1.134.0',tests:66,typecheck:'PASS',reports,catalog:{count:100,difficulty:'hard',freshLower:16,completeUpperRange:[16,20],dragRange:[37,41],seconds:180,specialsPerLevel:9,totalPoints:9000,geometry:'Disclosed project-original 217 architecture reused. 100 different actual opening arrangements, including 27 vertical / 73 alternate horizontal rectangle packings. Not 100 different board outlines or exact competitor levels.'},features:['home entry and unlock condition','personal Beijing 15-day cycle','49 delayed simulated opponents / tie priority / vertical 50-row list','eight tiers and glory stars','100 independent sequential levels / successful points / non-repeat','real badges / boosters / undo / failed and abandoned discard','success reward then league / total completion wait','event-time cross-period discard','frozen settlement / atomic coin claim / current anchored period','candidate-preserving save retry / main campaign isolation'],scope:{realPointer:true,naturalDateRAF:true,all100MapsBothViewports:true,privateStorage:true,physicalDevice:false,humanBlindTest:false,published:false,productionCampaignLimit:200},fixtures:['private isolated browser accounts','user reduced-motion setting for 100-map runs','near-timeout .2 second flow fixture','historical valid old-window and shifted full-season timestamps','explicit synthetic Node calendar forecasts','art 503 / unavailable storage failure injection'],hashes},null,2));
console.log('PASS full league completion: 100 x 2 actual Pointer routes, 66 tests, preserved source/proof/report SHA');
