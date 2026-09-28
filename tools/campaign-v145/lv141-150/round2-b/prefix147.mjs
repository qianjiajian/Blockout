import assert from 'node:assert/strict';
import {checkAxisPrefixFloor} from '../../lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export function project147(level,api){
 api.validateLevel(level);assert.equal(level.id,147);assert(!level.generators?.length&&!level.flipDoors?.length&&!level.coloredGrids?.length);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.timedBombSeconds&&!b.star));
 const covers=level.shutters.filter(s=>s.skin!=='lift'),lifts=level.shutters.filter(s=>s.skin==='lift');assert.equal(covers.length,3);assert.equal(lifts.length,3);assert(covers.every(s=>s.count>=5));
 const mask=new Set(covers.flatMap(s=>Array.from({length:s.width*s.height},(_,i)=>`${s.x+i%s.width},${s.y+Math.floor(i/s.width)}`)));
 for(const l of lifts){const members=level.blocks.filter(b=>b.shutterId===l.id);assert(members.length);for(const b of members)for(const[dx,dy]of b.shape)assert(b.x+dx>=l.x&&b.x+dx<l.x+l.width&&b.y+dy>=l.y&&b.y+dy<l.y+l.height,'Lift footprint outside guarded rectangle');}
 for(const l of lifts)for(let y=l.y;y<l.y+l.height;y++)for(let x=l.x;x<l.x+l.width;x++)assert(mask.has(`${x},${y}`),'Lift can activate before first curtain');
 assert(new api.PuzzleModel(level).snapshot().shutters.every(s=>!s.revealed));const ids=new Set(lifts.map(s=>s.id)),p=structuredClone(level);p.shutters=p.shutters.filter(s=>!ids.has(s.id));p.blocks=p.blocks.filter(b=>!ids.has(b.shutterId));api.validateLevel(p);
 return{level:p,goalClears:5,sourceLevelSha256:digest(level),projectedLevelSha256:digest(p),argument:'Stop immediately at clear5. All three real lifts lie entirely under the union of still-unrevealed countdown covers whose counters are >=5. Their geometry therefore cannot admit any lift body or player movement before the goal. Preserve all cover masks, opening pieces, gate counters and hidden curtain inventories; omit only unreachable lift inventory in the prefix graph. Every actual winning route reaches this exact prefix at equal reposition cost.'};
}
export function prefix147(level,api,options={}){const p=project147(level,api);return{...checkAxisPrefixFloor(p.level,api,{floor:5,maxStates:100000,maxMilliseconds:1000,...options,goalClears:5}),projection:{...p,level:undefined}};}
