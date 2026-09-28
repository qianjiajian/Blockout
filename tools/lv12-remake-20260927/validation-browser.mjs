import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict,LEVELS} from '/src/core/levels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';

// This new browser context uses only a memory host, never player persistence.
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
const otherDefinitions=JSON.stringify(LEVELS.filter(l=>l.id!==12));
const host=new MemoryHost(),game=new ColorEscapeGame(host);
let candidateInjected=false,loaded=false;
function verifyIdentity(){
  if(!loaded)throw Error('Level 12 has not been loaded');
  const level=getLevelStrict(12);
  if(game.model.level!==level)throw Error('Game must use the exact selected LEVELS object');
  if(JSON.stringify(LEVELS.filter(l=>l.id!==12))!==otherDefinitions)throw Error('Other levels changed');
  if(!candidateInjected&&(LEVELS[11]!==formalObjects[11]||JSON.stringify(LEVELS)!==formalDefinitions))throw Error('Formal definitions mutated');
  return {level:structuredClone(level),candidateInjected,formalObjectIdentity:!candidateInjected,
    formalDefinitionsUnchanged:JSON.stringify(LEVELS)===formalDefinitions,other199Unchanged:true,
    entryMethod:'ColorEscapeGame.loadLevel(12, true)'};
}
window.__COLOR_ESCAPE__=game;
window.__LV12_VALIDATION__={
  load(mode,candidate){
    if(loaded)throw Error('One isolated page per validation');
    if(!['formal','candidate'].includes(mode))throw Error('Invalid mode');
    if(mode==='candidate'){
      if(candidate?.id!==12)throw Error('Candidate id must be 12');
      candidateInjected=true;LEVELS[11]=structuredClone(candidate);
    }else if(candidate!==undefined)throw Error('Formal mode cannot inject data');
    if(getLevelStrict(12).mechanismRules!=='revised-2026-09-23-v1.4')throw Error('Wrong Lv12 runtime');
    game.loadLevel(12,true);game.updateToastVisible=false;loaded=true;
    return verifyIdentity();
  },
  verifyIdentity,
  storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations),save:structuredClone(host.data.get('color-escape-save-v1'))};},
};
game.start();
