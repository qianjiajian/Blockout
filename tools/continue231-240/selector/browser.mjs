import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {LEVELS,getLevelStrict} from '/src/core/levels.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';
import {FORMAL_231_240_LEVELS,getFormal231to240LevelStrict} from '/src/core/formal231to240Data.ts';
import {TEMPORARY_TEST_LEVEL_IDS,getTemporaryTestLevelStrict} from '/src/game/temporaryTestLevelCatalog.ts';
class MemoryHost extends WebHost {
 data=new Map();operations=[];
 constructor(){super();this.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:2,highestLevel:200,coins:10000,sound:false,haptic:false,reducedMotion:false,language:'zh-CN',boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics',...FEATURE_INTRO_POLICY.map(x=>x.kind)],boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[1],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}});}
 storageRead(k){this.operations.push(['read',k]);return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,fallback){const r=this.storageRead(k);return r.status==='ok'?r.value:fallback;}
 storageSet(k,v){this.operations.push(['write',k]);this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}resolveLeaderboardProvince(){return Promise.resolve(null);}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
window.__CONTINUATION_SELECTOR__={
 ids:FORMAL_231_240_LEVELS.map(x=>x.id),catalog:[...TEMPORARY_TEST_LEVEL_IDS],
 storage:()=>JSON.stringify([...host.data]),
 identity(id){const level=getFormal231to240LevelStrict(id);let productionRejects=false;try{getLevelStrict(id);}catch{productionRejects=true;}return{level,registryIdentity:game.model.level===level,catalogIdentity:getTemporaryTestLevelStrict(id)===level,productionCount:LEVELS.length,productionRejects};}
};
game.start();game.updateToastVisible=false;
