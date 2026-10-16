import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict, LEVELS} from '/src/core/levels.ts';
import {FORMAL_221_230_LEVELS, getFormal221to230LevelStrict} from '/src/core/formal221to230Data.ts';
import {FEATURE_INTRO_POLICY} from '/src/game/featureIntroPolicy.ts';

// This host and the campaign scaffold exist only in the isolated test page.
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
const productionBoundary=LEVELS.length;
if(productionBoundary!==200)throw Error('Production LEVELS must remain 200');
if(FORMAL_221_230_LEVELS.length!==10)throw Error('The formal registry must contain all ten levels');
const host=new MemoryHost(),game=new ColorEscapeGame(host),load=game.loadLevel.bind(game);
window.__COLOR_ESCAPE__=game;
window.__REMAKE_FORMAL__={
  load(id){
    if(!Number.isInteger(id)||id<221||id>230)throw Error('Only the formal 221–230 registry is in scope');
    if(LEVELS.length!==productionBoundary)throw Error('Each level requires a fresh isolated page');
    const level=getFormal221to230LevelStrict(id);
    if(FORMAL_221_230_LEVELS.find(value=>value.id===id)!==level)throw Error('Strict getter lost registry identity');
    let productionExcluded=false;
    try{getLevelStrict(id);}catch(error){productionExcluded=error instanceof RangeError;}
    if(!productionExcluded)throw Error('The target must be absent from the production campaign');
    // Existing game navigation clamps by LEVELS.length. Bridge the gap only in
    // this page: 201–220 are unplayed placeholders; 221 onward are registry refs.
    for(let n=201;n<=id;n++)LEVELS.push(n<221?{...structuredClone(LEVELS[199]),id:n}:getFormal221to230LevelStrict(n));
    if(getLevelStrict(id)!==level)throw Error('Scaffold must preserve the actual registry reference');
    if(level.mechanismRules!=='revised-2026-09-27-v1.5')throw Error('Wrong runtime');
    load(id,true);game.updateToastVisible=false;
    if(game.model.level!==level)throw Error('Actual game entry lost the formal registry reference');
    return {level:structuredClone(level),formalObjectIdentity:true,registryObjectIdentity:true,
      formalRegistryObjectIdentity:true,candidateOverlay:false,productionCampaignObjectIdentity:false,
      productionBoundary,productionTargetExcludedBeforeScaffold:productionExcluded,
      testCampaignScaffold:true,scaffold:{unplayedPlaceholderIds:Array.from({length:20},(_,i)=>201+i),
        actualRegistryReferenceIds:Array.from({length:id-220},(_,i)=>221+i),scope:'isolated-browser-memory-only'}};
  },
  storage(){return {backend:'MemoryHost',operations:structuredClone(host.operations),save:structuredClone(host.data.get('color-escape-save-v1'))};},
};
game.start();
