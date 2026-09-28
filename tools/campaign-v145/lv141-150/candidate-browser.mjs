import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {PuzzleModel} from '/src/core/PuzzleModel.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';

class MemoryHost extends WebHost {
 data=new Map();operations=[];
 constructor(){super();this.data.set('color-escape-save-v1',{
  schemaVersion:1,currentLevel:1,highestLevel:200,coins:0,sound:false,haptic:false,reducedMotion:false,language:'zh-CN',
  boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],
  boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
 });}
 storageRead(key){this.operations.push({kind:'read',key});return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'};}
 storageGet(key,fallback){const r=this.storageRead(key);return r.status==='ok'?r.value:fallback;}
 storageSet(key,value){this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true;}
 music(){}sound(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),baseLoad=game.loadLevel.bind(game);
window.__COLOR_ESCAPE__=game;
window.__BATCH_CANDIDATE__={
 load(level){
  if(level.id<141||level.id>150||level.mechanismRules!=='revised-2026-09-23-v1.4')throw Error('Outside explicit candidate scope');
  baseLoad(level.id,true);
  // Match the production model's deferred exit-completion semantics. Candidate
  // data injection is explicit; no claim of identity with production LEVELS.
  game.model=new PuzzleModel(structuredClone(level),{deferExitCompletion:true});
  game.captureInitialGeneratorSpawns();game.updateToastVisible=false;game.dirty=true;game.scheduleFrame();
  return {level:structuredClone(game.model.level),candidateInjection:true,formalObjectIdentity:false};
 },
 storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations)};},
};
game.start();
