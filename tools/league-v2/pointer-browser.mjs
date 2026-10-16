import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';
import {LeagueRun} from '/src/core/leagueRun.ts';
import {getLeagueLevel} from '/src/core/leagueLevels.ts';

class MemoryHost extends WebHost{
 data=new Map();operations=[];
 constructor(){super();this.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:6,highestLevel:200,coins:1200,
  sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',boosterUnlockSeen:['time','rocket','pulse'],
  featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],boosters:{time:0,rocket:0,pulse:0},
  bestStars:{},bestMoves:{},rewardedLevels:[1,2,3,4,5],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}});}
 storageRead(key){this.operations.push({kind:'read',key});return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'};}
 storageGet(key,fallback){const r=this.storageRead(key);return r.status==='ok'?r.value:fallback;}
 storageSet(key,value){this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true;}
 music(){} sound(){} vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
window.__LEAGUE_CANDIDATE__={
 load(candidate,formalRegistry=false){
  if(!candidate.accepted||candidate.level.id!==900000+candidate.index||!candidate.specials?.length)throw Error('Verified league candidate required');
  game.openLeague();if(!game.save.league||game.save.league.pending)throw Error('Expected fresh in-memory league season');
  game.save.league.season.cleared=Array.from({length:candidate.index-1},(_,i)=>i+1);
  game.save.league.season.scoreHistory=game.save.league.season.cleared.map(()=>({atMs:game.save.league.season.joinedMs,score:0}));
  game.save.league.season.score=0;game.persist();
  this.entryBaseline=structuredClone(game.save);
  if(formalRegistry){
   const registered=getLeagueLevel(candidate.index);
   if(JSON.stringify(registered.level)!==JSON.stringify(candidate.level)||JSON.stringify(registered.specials)!==JSON.stringify(candidate.specials))throw Error('Current formal registry differs from candidate');
   game.startLeaguePrototype();
  }else{
   // Candidate-only data injection; actual production model, input, renderer,
   // animations, countdown and league success transaction are exercised.
   const run=new LeagueRun(game.save.league,candidate.index,structuredClone(candidate.level),candidate.specials,Date.now());
   game.resetPuzzlePresentation();game.playableClockSlices.reset();game.lastFrame=0;
   game.leagueRun=run;game.leagueRunResult=undefined;game.model=run.model;
   game.leagueChallengeNotice=false;game.leagueInfo=false;game.leagueScroll.cancel();game.screen='playing';
   game.releaseFormalPageArt();game.releaseWinArt();game.captureInitialGeneratorSpawns();
  }
  game.updateToastVisible=false;game.dirty=true;game.scheduleFrame();
  const audit={calls:0,rotated:0,canvasRotationCalls:0},draw=game.drawFormalWholeBlockAt.bind(game);
  game.drawFormalWholeBlockAt=function(image,match,...args){
   audit.calls++;if(match.quarterTurns!==0)audit.rotated++;
   const rotate=game.ctx.rotate;game.ctx.rotate=function(angle){if(angle!==0)audit.canvasRotationCalls++;return rotate.call(this,angle);};
   try{return draw(image,match,...args);}finally{game.ctx.rotate=rotate;}
  };
  this.drawAudit=audit;
  return {level:structuredClone(game.model.level),entryBaseline:this.entryBaseline,candidateInjection:!formalRegistry,formalRegistryIdentity:formalRegistry};
 },
 snapshot(){return game.model.snapshot();},
 storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations),persistedSave:structuredClone(host.data.get('color-escape-save-v1'))};},
};
game.start();
