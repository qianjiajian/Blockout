import assert from 'node:assert/strict';
import {checkAxisPrefixFloor} from '../../lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {projection} from '../../../remake121to130-bomb-replay-v172.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export function check145Floor(level,api,options={}){
 assert.equal(level.id,145);assert.equal(level.shutters?.length,1);assert.equal(level.shutters[0].count,10);assert(!level.shutters[0].skin||level.shutters[0].skin==='shutter');
 const p=projection(level),result=checkAxisPrefixFloor(p,api,{floor:11,maxStates:200000,maxMilliseconds:15000,...options,goalClears:10});
 return{...result,sourceLevelSha256:digest(level),projectedLevelSha256:digest(p),argument:'Remove deadlines only, preserving every physical bomb body and shell. Every timed win reaches clear10. Curtain10 remains entirely closed before that stopping event, so its full mask stays and no hidden body can participate beforehand. Prove no such prefix at cost0–10; full timed completion is verified separately.'};
}
