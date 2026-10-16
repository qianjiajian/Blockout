import fs from 'node:fs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {mechanismsUsedByDailyCandidate,levelSha256} from '../daily-challenge/formal-v2/contract.mjs';

/** Common game construction audit, independent from daily slot identities.
 * The final league proof contract separately checks source/board, budget,
 * scores, band, broad layout diversity and Pointer/time acceptance. */
export async function auditLeagueMechanismStructure(runtime,level,index){
  const issues=[];try{runtime.validateLevel(level);}catch(e){issues.push(`validateLevel:${e.message}`);}
  const used=mechanismsUsedByDailyCandidate(level),unlocks=new Map(runtime.MECHANISM_GUIDE.map(m=>[m.id,m.unlockLevel]));
  for(const m of used)if(unlocks.get(m)>index)issues.push(`mechanism-before-unlock:${m}`);
  if(index===8&&!used.includes('irregular-board'))issues.push('first-unlock-requires-real-irregular-board');
  const construction=runtime.auditRevisedCandidate(level,undefined);
  for(const i of construction.issues)if(i.category!=='source'&&i.code!=='wrong-rule-profile')issues.push(`construction:${i.code}`);
  const hidden=auditHiddenCoverage(level),queue=auditGeneratorQueueColors(level);
  if(!hidden.passed)issues.push(...hidden.issues.map(i=>`hidden:${i.code}`));
  if(!queue.passed)issues.push(...queue.issues.map(i=>`queue:${i.code}`));
  const art=[];
  for(const b of level.blocks){const match=runtime.matchFormalBlockShape(b.shape,'native-only');if(!match||match.quarterTurns!==0){issues.push(`non-native-shape:${b.id}`);continue;}
    const layers=b.layers?.length?b.layers:[b.color];for(const [i,color]of layers.entries())for(const kind of i<layers.length-1?['solid','shell']:['solid']){
      const path=runtime.GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[match.shapeId];
      if(!path||!fs.existsSync(`public/${path}`))issues.push(`missing-art:${b.id}:${color}:${kind}:${match.shapeId}`);
      else art.push({blockId:b.id,color,kind,shapeId:match.shapeId,path});
    }
  }
  return {passed:issues.length===0,index,levelSha256:levelSha256(level),issues:[...new Set(issues)],mechanisms:used,hidden,queue,art};
}
