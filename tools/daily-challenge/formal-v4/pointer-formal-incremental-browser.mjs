import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { FEATURE_INTRO_POLICY } from '/src/game/featureIntroPolicy.ts';
import { createDailyChallengeState, dailyChallengeDayKey, getDailyChallengeAssignment, cloneDailyChallengeLevel } from '/src/core/dailyChallenge.ts';
import { FORMAL_DAILY_300_ENTRIES, FORMAL_DAILY_300_REVISION } from '/src/core/formalDailyChallenge300Data.ts';
import { getDailyChallengeStageV3 } from '/src/core/dailyChallengeStagesV3.ts';
import { FEATURE_UNLOCKS } from '/src/core/featureUnlocks.ts';

class MemoryHost extends WebHost {
  data = new Map(); operations = [];
  constructor() {
    super();
    this.data.set('color-escape-save-v1', { schemaVersion:1,currentLevel:1,highestLevel:200,coins:0,
      sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',
      boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],
      boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[],
      lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0} });
  }
  storageRead(key) { this.operations.push({kind:'read',key}); return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'}; }
  storageGet(key,fallback) { const result=this.storageRead(key);return result.status==='ok'?result.value:fallback; }
  storageSet(key,value) { this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true; }
  music(){} sound(){} vibrate(){}
}

const host = new MemoryHost(), game = new ColorEscapeGame(host);
window.__COLOR_ESCAPE__=game;
const check=(value,message)=>{if(!value)throw Error(message);};
window.__DAILY_FORMAL__={
 prepare(expected){
  check(/^daily-[a-z0-9-]+$/.test(expected.formalId)&&[1,2,3].includes(expected.difficulty),'Selected formal identity required');
  const entry=FORMAL_DAILY_300_ENTRIES.find(e=>e.formalId===expected.formalId);
  check(entry&&entry.layoutSha256===expected.levelSha256&&entry.sourceLevelId===expected.sourceLevelId&&entry.stageKey===expected.stageKey&&entry.difficulty===expected.difficulty,'Compiled formal registry identity mismatch');
  check(entry.admittedInRevision===expected.revision&&entry.proof.routeSha256===expected.routeSha256&&entry.proof.reportSha256===expected.receiptSha256,'Compiled revision/proof identity mismatch');
  check(entry.proof.lowerBound===expected.L&&entry.proof.upperBound===expected.U,'Compiled L/U mismatch');
  const stage=getDailyChallengeStageV3(entry.stageKey);check(stage,'Unknown compiled stage');
  const unlockLevel=stage.unlockLevel,difficulty=entry.difficulty,fixtureProgress=Math.max(unlockLevel,FEATURE_UNLOCKS.dailyChallenge.completedLevel+1);
  this.difficulty=difficulty;
  const daily=createDailyChallengeState(dailyChallengeDayKey(),unlockLevel);
  check(daily.version===2&&daily.profile==='incremental-formal-300-v1'&&daily.catalogRevision===FORMAL_DAILY_300_REVISION,'Current production daily state required');
  const slot=daily.pools[difficulty].findIndex(row=>row.id===expected.formalId);check(slot>=0,'Formal entry absent from production day pool');
  daily.selected[difficulty]=slot;
  const assignment=getDailyChallengeAssignment(daily,difficulty),registryLevel=assignment&&cloneDailyChallengeLevel(assignment);
  check(assignment?.catalogKind==='formal300'&&assignment.catalogRevision===expected.revision&&assignment.layoutSha256===expected.levelSha256&&registryLevel,'Production assignment cannot resolve exact formal entry');
  game.save.currentLevel=1;game.save.highestLevel=fixtureProgress;game.save.dailyChallenge=daily;
  const s=game.save,baseline={coins:s.coins,inspiration:s.collectionProgress.inspiration,currentLevel:s.currentLevel,highestLevel:s.highestLevel,
   bestStars:structuredClone(s.bestStars),bestMoves:structuredClone(s.bestMoves),rewardedLevels:structuredClone(s.rewardedLevels),boosters:structuredClone(s.boosters),lifeState:structuredClone(s.lifeState),attemptsRemaining:daily.attemptsRemaining};
  check(daily.attemptsRemaining===5&&!s.activeRun,'Fresh isolated unlocked fixture required');game.persist();
  const audit={calls:0,rotated:0,canvasRotationCalls:0},draw=game.drawFormalWholeBlockAt.bind(game);
  game.drawFormalWholeBlockAt=function(image,match,...args){audit.calls++;if(match.quarterTurns!==0)audit.rotated++;const rotate=game.ctx.rotate;
   game.ctx.rotate=function(angle){if(angle!==0)audit.canvasRotationCalls++;return rotate.call(this,angle);};
   try{return draw(image,match,...args);}finally{game.ctx.rotate=rotate;}};
  this.drawAudit=audit;game.openDailyChallenge();
  return{assignment,registryLevel,baseline,candidateInjection:false,formalRegistryIdentity:true,registryRevision:FORMAL_DAILY_300_REVISION,
   fixture:{kind:'existing-frozen-day-pool',stageKey:stage.key,stageUnlockLevel:unlockLevel,progressForUnlockedEntry:fixtureProgress,naturalNewDaySelectionClaimed:false}};
 },
 entered(){return{level:structuredClone(game.model.level),assignment:getDailyChallengeAssignment(game.save.dailyChallenge,this.difficulty),
  attemptsRemaining:game.save.dailyChallenge.attemptsRemaining,activeRun:structuredClone(game.save.activeRun),entryEvents:structuredClone(window.__POINTER_OBSERVATIONS__)};},
 storage(){return{backend:'MemoryHost',operations:structuredClone(host.operations)};},
};
game.start();
