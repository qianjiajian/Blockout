import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict,LEVELS} from '/src/core/levels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';
import {getFormal231to240LevelStrict} from '/src/core/formal231to240Data.ts';

// Test-only host. Never read/write the player's browser or WeChat save.
class MemoryHost extends WebHost {
  data=new Map(); operations=[];
  constructor(){
    super();
    this.data.set('color-escape-save-v1',{
      schemaVersion:1,currentLevel:1,highestLevel:200,coins:0,sound:false,haptic:false,
      reducedMotion:false,language:'zh-CN',boosterUnlockSeen:['time','rocket','pulse'],
      featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],
      boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[],
      lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
    });
  }
  storageRead(key){this.operations.push({kind:'read',key});return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'};}
  storageGet(key,fallback){const r=this.storageRead(key);return r.status==='ok'?r.value:fallback;}
  storageSet(key,value){this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true;}
  music(){} sound(){} vibrate(){}
  resolveLeaderboardProvince(){return Promise.resolve(null);}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),load=game.loadLevel.bind(game);
window.__COLOR_ESCAPE__=game;
window.__REMAKE_FORMAL__={
  load(id,overlay){
    if(!Number.isInteger(id)||id<231||id>240)throw Error('Only isolated 231–240 data are in scope');
    if(LEVELS.length!==200)throw Error('Unexpected production boundary');
    for(let n=201;n<=id;n++)LEVELS.push(n===id&&!overlay?getFormal231to240LevelStrict(id):{...structuredClone(LEVELS[199]),id:n});
    const level=getLevelStrict(id);
    if(overlay){if(overlay.id!==id)throw Error("Wrong overlay ID");for(const k of Object.keys(level))delete level[k];Object.assign(level,structuredClone(overlay));}
    if(level.mechanismRules!=='revised-2026-09-27-v1.5')throw Error('Wrong runtime');
    load(id,true);game.updateToastVisible=false;
    if(game.model.level!==level)throw Error('Actual entry must use the exact formal LEVELS object');
    if(!overlay&&level!==getFormal231to240LevelStrict(id))throw Error('Formal registry object identity lost');
    return {level:structuredClone(level),memoryObjectIdentity:true,formalObjectIdentity:!overlay,candidateOverlay:!!overlay,testCampaignScaffold:true,productionCampaignValidated:false};
  },
  boundary(){return {productionBoundary:200,memoryLevelCount:LEVELS.length,testCampaignScaffold:true};},
  storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations),save:structuredClone(host.data.get('color-escape-save-v1'))};},
};
game.start();
