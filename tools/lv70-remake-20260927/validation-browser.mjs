import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict,LEVELS} from '/src/core/levels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';
class MemoryHost extends WebHost{
 data=new Map();operations=[];
 constructor(){super();this.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:200,coins:0,sound:false,haptic:false,reducedMotion:false,language:'zh-CN',boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics',...FEATURE_INTRO_POLICY.filter(x=>x.showUnlockPopup).map(x=>x.kind)],boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}});}
 storageRead(key){this.operations.push({kind:'read',key});return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'};}
 storageGet(key,fallback){const r=this.storageRead(key);return r.status==='ok'?r.value:fallback;}
 storageSet(key,value){this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true;}
 music(){}sound(){}vibrate(){}
}
const formalObjects=[...LEVELS],formalDefinitions=JSON.stringify(LEVELS),otherDefinitions=JSON.stringify(LEVELS.filter(l=>l.id!==70));
const host=new MemoryHost(),game=new ColorEscapeGame(host);let injected=false,loaded=false;
function verifyIdentity(){if(!loaded)throw Error('Lv70 not loaded');const level=getLevelStrict(70);if(game.model.level!==level)throw Error('Exact LEVELS object required');if(JSON.stringify(LEVELS.filter(l=>l.id!==70))!==otherDefinitions)throw Error('Other199 mutated');if(!injected&&(LEVELS[69]!==formalObjects[69]||JSON.stringify(LEVELS)!==formalDefinitions))throw Error('Formal data mutated');return {level:structuredClone(level),candidateInjected:injected,formalObjectIdentity:!injected,formalDefinitionsUnchanged:JSON.stringify(LEVELS)===formalDefinitions,other199Unchanged:true,entryMethod:'ColorEscapeGame.loadLevel(70,false), then real Home Play Pointer'};}
window.__COLOR_ESCAPE__=game;
window.__LV70_VALIDATION__={load(mode,candidate){if(loaded)throw Error('Only one test per isolated page');if(!['formal','candidate'].includes(mode))throw Error('Invalid mode');if(mode==='candidate'){if(candidate?.id!==70)throw Error('Only Lv70');injected=true;LEVELS[69]=structuredClone(candidate);}else if(candidate!==undefined)throw Error('No formal injection');if(getLevelStrict(70).mechanismRules!=='revised-2026-09-27-v1.5')throw Error('Wrong profile');game.loadLevel(70,false);game.updateToastVisible=false;loaded=true;return verifyIdentity();},verifyIdentity,storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations),save:structuredClone(host.data.get('color-escape-save-v1'))};}};
game.start();
