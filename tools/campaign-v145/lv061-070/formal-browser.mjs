import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict,LEVELS} from '/src/core/levels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';

// Test-only host; never use the player's browser or WeChat save.
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
}
const formalObjects=[...LEVELS],formalDefinitions=JSON.stringify(LEVELS);
const host=new MemoryHost(),game=new ColorEscapeGame(host);
function verifyIdentity(id){
  if(!Number.isInteger(id)||id<61||id>70)throw Error('Only integer level ids 61–70 are in scope');
  const level=getLevelStrict(id);
  if(LEVELS[id-1]!==formalObjects[id-1]||level!==formalObjects[id-1])throw Error('Formal LEVELS object replaced');
  if(JSON.stringify(LEVELS)!==formalDefinitions)throw Error('Formal LEVELS definitions mutated');
  if(game.model.level!==level)throw Error('Game must use the exact formal LEVELS object');
  return {level:structuredClone(level),candidateInjected:false,formalObjectIdentity:true,formalDefinitionsUnchanged:true,entryMethod:'ColorEscapeGame.loadLevel(id, true)'};
}
window.__COLOR_ESCAPE__=game;
window.__REMAKE_FORMAL__={
  load(id){
    if(!Number.isInteger(id)||id<61||id>70)throw Error('Only integer level ids 61–70 are in scope');
    if(getLevelStrict(id).mechanismRules!=='revised-2026-09-23-v1.4')throw Error('Wrong runtime');
    // Existing public production entry. No candidate argument, overlay or LEVELS write.
    game.loadLevel(id,true);game.updateToastVisible=false;
    return verifyIdentity(id);
  },
  verifyIdentity,
  storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations)};},
};
game.start();
