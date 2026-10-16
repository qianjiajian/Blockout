import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { FEATURE_INTRO_POLICY } from '/src/game/featureIntroPolicy.ts';
import { createDailyChallengeState, dailyChallengeDayKey } from '/src/core/dailyChallenge.ts';

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
window.__COLOR_ESCAPE__ = game;
window.__DAILY_CANDIDATE__ = {
  load(candidate, formalRegistry = false) {
    if (candidate.schemaVersion!==2 || !candidate.accepted || candidate.level.id!==candidate.sourceLevelId) throw Error('Verified v2 candidate required');
    // Use the actual production levelOverride entry and all production drawing,
    // hit testing, deferred departures, clocks and daily settlement. Only the
    // data object and volatile save are injected; no move/timer is mocked.
    const level=structuredClone(candidate.level), dayKey=dailyChallengeDayKey();
    let assignment;
    if(formalRegistry){
      const unlockLevel=Number(candidate.stageKey.split('-').at(-1));
      const daily=createDailyChallengeState(dayKey,unlockLevel);
      const slot=daily.pools[candidate.difficulty].findIndex(row=>row.id===candidate.formalId);
      if(slot<0)throw Error('Formal slot is absent from the production pool');
      assignment=daily.pools[candidate.difficulty][slot];
      if(assignment.layoutSha256!==candidate.levelSha256 || assignment.proofSchemaVersion!==2)throw Error('Runtime slot differs from certified v2 object');
      daily.selected[candidate.difficulty]=slot;
      game.save.dailyChallenge=daily;game.save.currentLevel=1;game.save.highestLevel=unlockLevel;
      this.entryBaseline={coins:game.save.coins,inspiration:game.save.collectionProgress.inspiration,
        currentLevel:game.save.currentLevel,highestLevel:game.save.highestLevel,
        bestStars:structuredClone(game.save.bestStars),bestMoves:structuredClone(game.save.bestMoves),rewardedLevels:structuredClone(game.save.rewardedLevels)};
      game.persist();
      game.screen='dailyChallenge';game.startDailyChallenge(candidate.difficulty);
      if(game.screen!=='playing'||!game.save.activeRun?.daily||game.save.dailyChallenge.attemptsRemaining!==4)throw Error('Production challenge entry did not commit');
    }else{
      game.loadLevel(level.id,false,false,level);
      game.save.currentLevel=1;
      game.save.dailyChallenge=createDailyChallengeState(dayKey,200);
      game.save.activeRun={...game.createRunJournal(level.id),returnLevelId:1,daily:true,dailyDayKey:dayKey,
        dailyChallengeDifficulty:candidate.difficulty,dailyChallengeSourceLevelId:level.id,lifeStarted:true};
      game.dailyChallengePendingDifficulty=candidate.difficulty;
    }
    game.updateToastVisible=false;
    game.screen='playing';game.dirty=true;game.scheduleFrame();
    const audit={calls:0,rotated:0,canvasRotationCalls:0};
    const draw=game.drawFormalWholeBlockAt.bind(game);
    game.drawFormalWholeBlockAt=function(image,match,...args){
      audit.calls++;if(match.quarterTurns!==0)audit.rotated++;
      const rotate=game.ctx.rotate;
      game.ctx.rotate=function(angle){if(angle!==0)audit.canvasRotationCalls++;return rotate.call(this,angle);};
      try{return draw(image,match,...args);}finally{game.ctx.rotate=rotate;}
    };
    this.drawAudit=audit;
    return {level:structuredClone(game.model.level),assignment,entryBaseline:this.entryBaseline,candidateInjection:!formalRegistry,formalRegistryIdentity:formalRegistry};
  },
  snapshot(){return game.model.snapshot();},
  storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations)};},
};
game.start();
