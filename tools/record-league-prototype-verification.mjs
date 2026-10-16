import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {verifyRulesLock} from "./verify-rules-lock.mjs";
const out="deliverables/league-step4-20261001";
const tests=JSON.parse(await readFile(`${out}/tests-final.json`,"utf8"));assert.equal(tests.numPassedTests,63);assert.equal(tests.numFailedTests,0);assert(verifyRulesLock().ok);
const reports=["playtest-results/league-prototype/1790841281388/report.json","playtest-results/league-prototype/1790841380029/report.json"];
for(const file of reports){const r=JSON.parse(await readFile(file,"utf8"));assert.equal(r.status,"PASS");assert.equal(r.rows.length,2);assert.equal(r.errors.length,0);}
const files=["src/core/league.ts","src/core/leagueAccount.ts","src/core/leagueRun.ts","src/core/leagueTestLevel.ts","src/game/ColorEscapeGame.ts","src/game/leagueUi.ts","src/core/PuzzleModel.ts","src/core/formal211to220Data.ts","src/core/levels.ts","tools/build-league-test-level.mjs","tools/verify-league-test-level.mjs","tools/playtest-league-prototype.mjs","docs/rules/mechanism-rules-v1.133.0.md",`${out}/test-level-proof.json`,`${out}/structure-art-qualification.json`,`${out}/tests-final.json`,...reports];
const hashes={};for(const file of files)hashes[file]=createHash("sha256").update(await readFile(file)).digest("hex");
await writeFile(`${out}/completion.json`,JSON.stringify({status:"PASS_STEP4_SINGLE_LEVEL_PROTOTYPE",activeVersion:"1.133.0",tests:63,typecheck:"PASS",reports,level:{id:900001,leagueNumber:1,seconds:180,specialBlocks:9,points:90,freshLower:16,completeUpper:20,totalDrags:41,geometry:"Disclosed adapted project-original 217 geometry; independent palette/data, not new geometry"},hashes,scope:{realPointer:true,naturalDateRAF:true,privateStorage:true,physicalDevice:false,full100Levels:false,published:false},fixtures:["isolated browser account","near-timeout remainder .2 seconds","valid old-window offline-resume attempt"],next:"Step5: agree 100-level difficulty/time/life/coin/exhaustion and mechanism-teaching contracts, generate and verify actual content"},null,2));console.log("PASS final prototype source/proof/test SHA binding");
