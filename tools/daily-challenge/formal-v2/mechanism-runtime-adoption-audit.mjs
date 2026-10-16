import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from './contract.mjs';
const OUT='deliverables/daily-formal-v2-20261007/mechanism-lab/runtime-adoption-audit';fs.mkdirSync(OUT,{recursive:true});
const paths=['src/core/dailyChallenge.ts','src/core/formalDailyChallengeData.ts','src/game/ColorEscapeGame.ts'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes();
const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:[
 'export * from "./src/core/dailyChallenge.ts";',
 'export {LEVELS} from "./src/core/levels.ts";',
 'export {FORMAL_DAILY_CHALLENGE_CATALOG} from "./src/core/formalDailyChallengeData.ts";',
].join('\n')},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const runtime=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const oldState=runtime.createDailyChallengeState('2026-10-07',1,runtime.LEVELS,12345);
oldState.attemptsRemaining=2;oldState.completed[1]=true;oldState.rewarded[1]=true;
const oldAssignment=structuredClone(runtime.getDailyChallengeAssignment(oldState,3));
const oldLevel=runtime.cloneDailyChallengeLevel(oldAssignment);
const stage=runtime.FORMAL_DAILY_CHALLENGE_CATALOG.find(s=>s.stageKey===oldState.stageKey);
const row=stage.difficulties['3'].candidates[oldState.selected[3]];
const original=structuredClone(row);
// An isolated in-memory catalogue replacement; no on-disk registry, player
// save, storage bridge, or application instance is read or changed.
row.sourceLevelId=198;row.layoutSha256='b'.repeat(64);
const reconciled=runtime.reconcileDailyChallengeState(structuredClone(oldState),new Date('2026-10-07T18:00:00+08:00'),1,runtime.LEVELS);
const newAssignment=runtime.getDailyChallengeAssignment(reconciled,3),newLevel=runtime.cloneDailyChallengeLevel(newAssignment);
Object.assign(row,original);
const result={simulationOnly:true,actualPlayerStorageAccessed:false,sourceFilesChanged:false,
 scenario:'Same-day application catalogue replacement with stable formal slot ID but changed source and layout identity',
 before:{dayKey:oldState.dayKey,selected:oldState.selected,assignment:oldAssignment,levelSha256:levelSha256(oldLevel),attempts:oldState.attemptsRemaining,completed:oldState.completed,rewarded:oldState.rewarded},
 after:{dayKey:reconciled.dayKey,selected:reconciled.selected,assignment:newAssignment,levelSha256:levelSha256(newLevel),attempts:reconciled.attemptsRemaining,completed:reconciled.completed,rewarded:reconciled.rewarded},
 observations:{sameFormalId:oldAssignment.id===newAssignment.id,sourceChanged:oldAssignment.sourceLevelId!==newAssignment.sourceLevelId,actualLevelChanged:levelSha256(oldLevel)!==levelSha256(newLevel),declaredLayoutShaNotChecked:levelSha256(newLevel)!==newAssignment.layoutSha256,attemptBalancePreserved:reconciled.attemptsRemaining===2,completedAndRewardedPreserved:reconciled.completed[1]&&reconciled.rewarded[1]},
 sourceHashesBefore:before,sourceHashesAfter:hashes()};
if(JSON.stringify(result.sourceHashesBefore)!==JSON.stringify(result.sourceHashesAfter))throw Error('Source drift during read-only simulation');
fs.writeFileSync(`${OUT}/same-day-catalog-swap.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.observations));
