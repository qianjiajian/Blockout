import {buildGlobalCandidate,boardCells,absoluteCells,bodyFootprint,digest,random,rectangular,longBar} from './diversity-layout-factory.mjs';

export const COMPOSITIONAL_FACTORY_VERSION='distributed-anchor-global-retiling-v2';
const cellKey=p=>p.join(',');
const quadrant=(b,l)=>Number(b.x+(Math.max(...b.shape.map(p=>p[0]))+1)/2>=l.width/2)
  +2*Number(b.y+(Math.max(...b.shape.map(p=>p[1]))+1)/2>=l.height/2);
const adjacent=(a,b)=>absoluteCells(a).some(([x,y])=>absoluteCells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
const shuffled=(xs,r)=>xs.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);

/** No source or reference is solved here. A 25–35% distributed footprint
 * scaffold is transferred without rotation; the remaining cells are globally
 * exact-covered, with all unselected reference footprints forbidden. Thus
 * accidental reconstruction of a reference body is rejected during tiling.
 */
export function buildCompositionalCandidate(source,reference,runtime,options={}){
  const {seed=1}=options,r=random(seed^0x512acd3);
  if(!reference.accepted||!reference.level||!reference.drags)throw Error('Only recorded successful witnesses may be geometric references');
  const ref=reference.level,cells=boardCells(source),allowed=new Set(cells.map(cellKey));
  const minimumArea=Math.ceil(cells.length*.25),maximumArea=Math.floor(cells.length*.35);
  const moveCounts=new Map();for(const d of reference.drags)if(!d.exitSide)moveCounts.set(d.blockId,(moveCounts.get(d.blockId)??0)+1);
  const xs=Array.from({length:Math.abs(source.width-ref.width)+1},(_,i)=>Math.min(0,source.width-ref.width)+i);
  const ys=Array.from({length:Math.abs(source.height-ref.height)+1},(_,i)=>Math.min(0,source.height-ref.height)+i);
  const translations=shuffled(xs.flatMap(dx=>ys.map(dy=>({dx,dy}))),r).slice(0,16);
  let scaffold,selectionTrials=0;
  for(const shift of translations){
    const eligible=ref.blocks.map(b=>({...b,x:b.x+shift.dx,y:b.y+shift.dy})).filter(b=>
      absoluteCells(b).every(p=>allowed.has(cellKey(p)))&&(options.irregular||rectangular(b.shape)));
    if(eligible.length<13)continue;
    for(let attempt=0;attempt<32;attempt++){
      selectionTrials++;
      const selected=[],present=new Set();let area=0;
      const ordering=eligible.map(b=>({b,score:r()+Math.min(3,moveCounts.get(b.id)??0)*.13})).sort((a,b)=>b.score-a.score).map(x=>x.b);
      for(const b of ordering){
        if(area+b.shape.length>maximumArea||selected.length>eligible.length-11)continue;
        const q=quadrant(b,source);
        if(present.size<3&&present.has(q))continue;
        selected.push(b);present.add(q);area+=b.shape.length;
        if(area>=minimumArea&&present.size>=3)break;
      }
      if(area<minimumArea||present.size<3||eligible.length-selected.length<10)continue;
      const edges=selected.flatMap((b,i)=>selected.slice(i+1).filter(a=>adjacent(a,b)).map(a=>[b.id,a.id]));
      const score=edges.length+selected.reduce((n,b)=>n+(moveCounts.get(b.id)??0),0)*.2+r()*.1;
      if(!scaffold||score>scaffold.score)scaffold={selected,eligible,area,present:[...present],shift,edges,score};
    }
  }
  if(!scaffold)return{ok:false,phase:'reference-scaffold',reason:'cannot-retain-distributed-quarter-with-ten-body-rebuild',selectionTrials};
  const fixedSet=new Set(scaffold.selected.map(bodyFootprint));
  const forbiddenFootprints=scaffold.eligible.filter(b=>!fixedSet.has(bodyFootprint(b))).map(bodyFootprint);
  const refMean=boardCells(ref).length/ref.blocks.length;
  const bodyCount=options.bodyCount??Math.max(scaffold.selected.length+10,Math.round(cells.length/(refMean+(.2*r()-.1))));
  const shapeProfile=options.shapeProfile??(ref.blocks.filter(b=>longBar(b.shape)).length/ref.blocks.length>=.65?'axial-bars':'balanced');
  const referenceExitField=scaffold.eligible.flatMap(b=>absoluteCells(b).map(([x,y])=>({x,y,side:ref.gates.find(g=>g.color===b.color)?.side}))).filter(p=>p.side);
  const built=buildGlobalCandidate(source,runtime,{...options,bodyCount,shapeProfile,fixedBlocks:scaffold.selected,forbiddenFootprints,
    referenceExitField,referenceExitFieldMode:options.referenceExitFieldMode??'none'});
  const refEvidence={referenceLevelId:ref.id,referenceLevelSha256:digest(ref),referenceCandidatePath:options.referencePath,
    referenceCandidateSha256:options.referenceFileSha256,referenceDifficulty:reference.difficulty,referenceL:reference.L,referenceU:reference.U,
    referenceRouteUsedForSearch:false,referenceRouteOnlyWeightsScaffold:true,translation:scaffold.shift,
    fixedFootprints:scaffold.selected.map(b=>({referenceBlockId:b.id,x:b.x,y:b.y,shape:b.shape,oldNonclearDragCount:moveCounts.get(b.id)??0})),
    fixedArea:scaffold.area,fixedAreaFraction:scaffold.area/cells.length,scaffoldQuadrants:scaffold.present,
    retainedAdjacencyEdges:scaffold.edges,forbiddenOldFootprints:forbiddenFootprints,selectionTrials,
    referenceExitFieldMode:options.referenceExitFieldMode??'none',referenceExitFieldUsedForSearch:false};
  if(!built.ok)return{...built,reference:refEvidence};
  const newFootprints=new Set(built.level.blocks.map(bodyFootprint)),oldFootprints=new Set(scaffold.eligible.map(bodyFootprint));
  const rebuilt=scaffold.eligible.filter(b=>!newFootprints.has(bodyFootprint(b))),newBodies=built.level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b)));
  const commonArea=scaffold.eligible.filter(b=>newFootprints.has(bodyFootprint(b))).reduce((n,b)=>n+b.shape.length,0);
  const changedQuadrants=[...new Set(rebuilt.map(b=>quadrant(b,source)))];
  const gateKey=g=>`${g.side}:${g.offset}:${g.size}`,oldGates=new Set(ref.gates.map(gateKey));
  const unchangedGates=built.level.gates.filter(g=>oldGates.has(gateKey(g))).length;
  if(commonArea!==scaffold.area||rebuilt.length<10||newBodies.length<10||changedQuadrants.length<3)
    return{ok:false,phase:'reference-change-audit',reason:'insufficient-global-physical-rebuild',reference:refEvidence};
  if(unchangedGates>Math.floor(built.level.gates.length*.35))return{ok:false,phase:'reference-change-audit',reason:'most-exit-geometries-must-change',reference:refEvidence};
  return{...built,factoryVersion:COMPOSITIONAL_FACTORY_VERSION,construction:{...built.construction,
    compositional:{...refEvidence,actualRetainedArea:commonArea,actualRetainedFraction:commonArea/cells.length,
      rebuiltReferenceBodies:rebuilt.length,newFootprintBodies:newBodies.length,changedQuadrants,
      referenceGateCount:ref.gates.length,candidateGateCount:built.level.gates.length,unchangedGateGeometries:unchangedGates,
      candidateOriginalOrientationOnly:true,globalMirrorOrRotationApplied:false,
      scope:'Reference footprint constraints cover only 25–35% of the selected normal mainline board. Every other eligible reference footprint is forbidden; at least ten bodies across at least three quadrants and most exits are rebuilt. These are construction facts, not difficulty or formal acceptance.'}}};
}
