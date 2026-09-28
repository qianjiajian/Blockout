import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {LEVELS,getLevelStrict} from '/src/core/levels.ts';

// Independent browser harness: the game constructs its own PuzzleModel from
// getLevel() through the unmodified loadLevel() entry. No candidate injection.
class MemoryHost extends WebHost {
  data = new Map();
  operations = [];
  constructor(){
    super();
    this.data.set('color-escape-save-v1',{
      schemaVersion:1,currentLevel:1,highestLevel:200,coins:9999,sound:false,haptic:false,reducedMotion:false,language:'zh-CN',
      boosterUnlockSeen:['time','rocket','pulse'],
      featureSeen:['basics',...new Set(LEVELS.flatMap(l=>l.featureIntro?[l.featureIntro.kind]:[]))],
      boosters:{time:0,rocket:0,pulse:0},bestStars:{},bestMoves:{},rewardedLevels:[],
      journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:[]},achievementProgress:{claimedIds:[]},
      metaDiscovery:{collectionViewedItemIds:[]},selectedJourneyEpisode:1,dailyStreak:0,lastDailyCompletedDay:''
    });
  }
  storageRead(key){this.operations.push({kind:'read',key});return this.data.has(key)?{status:'ok',value:structuredClone(this.data.get(key))}:{status:'missing'};}
  storageGet(key,fallback){const r=this.storageRead(key);return r.status==='ok'?r.value:fallback;}
  storageSet(key,value){this.operations.push({kind:'write',key});this.data.set(key,structuredClone(value));return true;}
  music(){} sound(){} vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),baseLoad=game.loadLevel.bind(game);
const loaded=[];
window.__COLOR_ESCAPE__=game;
window.__REVISED_FORMAL_LEVELS__={
  load(levelId){
    const formal=getLevelStrict(levelId);
    if(formal.mechanismRules!=='revised-2026-09-21-v1.2')throw Error(`Formal Lv${levelId} overlay is not installed`);
    // These only suppress irrelevant informational UI in the isolated save.
    game.save.boosterUnlockSeen=['time','rocket','pulse'];
    game.save.featureSeen=['basics',...new Set(LEVELS.flatMap(l=>l.featureIntro?[l.featureIntro.kind]:[]))];
    game.save.sound=false;game.save.haptic=false;game.save.language='zh-CN';
    baseLoad(levelId,true);
    if(game.model.level!==formal)throw Error('Formal load entry did not retain the exact LEVELS object');
    game.updateToastVisible=false;
    loaded.push({levelId,at:performance.now(),formalObjectIdentity:true});
    document.querySelector('#status').textContent=`正式第${levelId}关 · 自然计时 · 内存测试存档`;
    return{level:structuredClone(formal),formalObjectIdentity:game.model.level===getLevelStrict(levelId),debug:game.getDebugState()};
  },
  formal(levelId){return structuredClone(getLevelStrict(levelId));},
  identity(){return game.model.level===getLevelStrict(game.model.level.id);},
  storage(){return{operations:structuredClone(host.operations),loaded:structuredClone(loaded),backend:'MemoryHost'};}
};
game.start();
