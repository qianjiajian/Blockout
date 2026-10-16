import fs from 'node:fs';
import {loadSpatialApi,searchSpatial} from '../../continuation211-colored-witness.mjs';
import {loadRuntime,verifyCandidate,levelSha256} from './contract.mjs';
import {replayDecorated} from './mechanism-decorate.mjs';
const OUT='deliverables/daily-formal-v2-20261007/mechanism-lab/grid-search-v1';fs.mkdirSync(OUT,{recursive:true});
const base=JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/design-lab/stage1-d1-10-seed.json'));
const api=await loadSpatialApi(),runtime=await loadRuntime(),rows=[];
for(const b of base.level.blocks)for(const [dx,dy]of b.shape){
 const cell=[b.x+dx,b.y+dy];if(cell[1]===5)continue;
 const level=structuredClone(base.level);level.coloredGrids=[{id:'grid-search-fixture',color:b.color,cells:[cell]}];
 const result=searchSpatial(level,api,{floor:21,maxStates:30000,maxMilliseconds:2000,maxTransitions:250000,weight:2,normalize:true});
 const row={cell,color:b.color,levelSha256:levelSha256(level),status:result.status,U:result.cost,exploredStates:result.exploredStates,termination:result.termination};
 if(result.drags){
  try{const actual=replayDecorated(runtime,level,result.drags);row.actualU=actual.nonClearingDrags;
   const cert=await verifyCandidate(runtime,{formalId:'daily-mechanisms-colored-grid-200-d1-fixture',stageKey:'mechanisms-colored-grid-200',difficulty:1,sourceLevelId:2,level,drags:result.drags},{lowerBudget:{maxStates:150000,maxTransitions:1000000,maxMilliseconds:15000}});
   row.certified=cert.accepted;row.evidencePath=`${OUT}/grid-${cell.join('-')}.json`;
   fs.writeFileSync(row.evidencePath,JSON.stringify({fixtureOnly:true,search:result,actual,certified:cert},null,2)+'\n');
  }catch(error){row.error=error.message;}
 }
 rows.push(row);fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(row));
}
