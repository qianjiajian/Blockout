import fs from 'node:fs';
const target='tools/resolve78-20260927',previous='tools/star-targets71-80';
const old=fs.readFileSync(previous+'/playtest.mjs','utf8');
let loop=old.slice(old.indexOf('const snapshotRoot='))
 .replaceAll('star-targets71-80','resolve78-20260927')
 .replaceAll('assert.equal(final.moves,TARGETS[id]);','assert.equal(final.moves,drags.length);')
 .replaceAll('assert.equal(result.earnedStars,3);','assert.equal(result.earnedStars,api.evaluateLevelStars(level,result.completionMetrics).earnedStars);')
 .replaceAll('assert.equal(result.conditions.moveTarget,TARGETS[id]);','assert.equal(result.conditions.moveTarget,stars.moveTarget);')
 .replaceAll('assert(result.conditions.moveAchieved&&result.conditions.timeAchieved);assert.equal(result.conditions.earnedStars,3);','assert.equal(result.conditions.moveAchieved,drags.length<=stars.moveTarget);assert(result.conditions.timeAchieved);assert.equal(result.conditions.earnedStars,drags.length<=stars.moveTarget?3:2);')
 .replaceAll('`${TARGETS[id]}次拖动内完成`','`${stars.moveTarget}次拖动内完成`')
 .replaceAll("assert.deepEqual(result.starImages.sort(),['starCenter','starLeft','starRight'],'All three actual result-star sprites must be active');", "assert.equal(result.starImages.filter(n=>!n.startsWith('empty')).length,result.earnedStars,'Actually drawn bright stars must match earned stars');assert.equal(result.starImages.length,3);")
 .replaceAll("assert.equal(result.storage.save.bestStars[String(id)],3);assert.equal(result.storage.save.bestMoves[String(id)],TARGETS[id]);", "assert.equal(result.storage.save.bestStars[String(id)],result.earnedStars);assert.equal(result.storage.save.bestMoves[String(id)],drags.length);")
 .replaceAll('allFiveScoringLevelsValidated','formalRouteValidated')
 .replaceAll('oldStarTargets:data.oldStars,newStarTargets:stars','starTargets:stars')
 .replaceAll('scoring verification','solve verification')
 .replaceAll('must use the new total-drag value','must preserve the current scoring target')
 .replaceAll('`lv${id}-three-stars.png`','`lv${id}-settlement.png`');
if(loop.includes('TARGETS['))throw Error('Leftover score-adjustment equality');
fs.writeFileSync(target+'/playtest.mjs',fs.readFileSync(target+'/playtest-header.txt','utf8')+'\n'+loop);
fs.writeFileSync(target+'/browser.mjs',fs.readFileSync(previous+'/browser.mjs','utf8').replace('[71,75,76,78,79]','[78]').replace('Only the five explicitly authorized scoring verifications','Only the Level 78 solve verification'));
fs.writeFileSync(target+'/index.html',fs.readFileSync(previous+'/index.html','utf8').replaceAll('star-targets71-80','resolve78-20260927').replaceAll('71/75/76/78/79三星条件正式输入验收','第78关重新求解正式输入验收'));
