import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {rectangular} from './design-layout-factory.mjs';

// A read-only route descriptor, never a solver or a mechanism certificate.
export function plainRouteFeatures(level,drags){
  const bodies=new Map(level.blocks.map(b=>[b.id,{id:b.id,block:b,poses:[[b.x,b.y]],steps:0,firstDrag:null,firstActionExit:false,clearsBeforeFirst:null,exitSide:null}]));
  const firstColour={},removalOrder=[];let clears=0;
  for(const [i,d]of drags.entries()){
    const b=bodies.get(d.blockId);if(!b)throw Error('Unknown route body');
    if(b.firstDrag===null){b.firstDrag=i;b.firstActionExit=Boolean(d.exitSide);b.clearsBeforeFirst=clears;}
    b.poses.push(...d.path);b.steps+=d.path.length;
    if(d.exitSide){b.exitSide=d.exitSide;if(firstColour[b.block.color]===undefined)firstColour[b.block.color]=clears;clears++;removalOrder.push(b.id);}
  }
  const axis=[...bodies.values()].filter(b=>b.steps>0&&(b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide)||b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide)))
    .map(b=>({id:b.id,axis:['top','bottom'].includes(b.exitSide)?'vertical':'horizontal',steps:b.steps,clearsBeforeFirst:b.clearsBeforeFirst}));
  const firstActionExitRectangles=[...bodies.values()].filter(b=>b.firstActionExit&&b.block.shape.length>=2&&rectangular(b.block.shape)&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<=level.blocks.length-2)
    .map(b=>({id:b.id,area:b.block.shape.length,firstDrag:b.firstDrag,clearsBeforeFirst:b.clearsBeforeFirst}));
  return{bodyCount:level.blocks.length,axis,firstActionExitRectangles,lateBodies:[...bodies.values()].filter(b=>b.clearsBeforeFirst>=9).map(b=>({id:b.id,clearsBeforeFirst:b.clearsBeforeFirst})),firstColour,firstColourSum:Object.values(firstColour).reduce((a,b)=>a+b,0),completeInventory:clears===level.blocks.length,fullBoardSearch:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url).toLowerCase()===process.argv[1].toLowerCase()){
  const root='deliverables/league-v2-20261008/design',labels=process.argv.slice(2),rows=[];
  for(const label of labels){
    const report=JSON.parse(fs.readFileSync(`${root}/${label}/report.json`));
    for(const row of report.accepted??[]){const p=JSON.parse(fs.readFileSync(row.path));rows.push({...row,features:plainRouteFeatures(p.level,p.drags)});}
  }
  fs.writeFileSync(`${root}/tail-route-features.json`,JSON.stringify({status:'READ_ONLY_PLAIN_ROUTE_DESCRIPTORS_NOT_MECHANISM_PROOF',labels,rows},null,2)+'\n');
  for(const r of rows)console.log(JSON.stringify({path:r.path,source:r.sourceLevelId,L:r.L,bodies:r.features.bodyCount,axis:r.features.axis.length,firstExitRect:r.features.firstActionExitRectangles.length,lateBodies:r.features.lateBodies.length}));
}
