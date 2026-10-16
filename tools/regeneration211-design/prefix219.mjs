import fs from'node:fs';import{symmetric219}from'./source219.mjs';import{loadSpatialApi}from'./fifo-witness214.mjs';
export const prefix219=[
{blockId:'l219-t',path:[],exitSide:'bottom'},
{blockId:'l219-u',path:[[1,9],[0,9]]},
{blockId:'l219-r',path:[[2,9],[1,9]],exitSide:'bottom'},
{blockId:'l219-u',path:[[1,9],[2,9],[2,8]]},
{blockId:'l219-v',path:[[2,9],[1,9],[0,9]],exitSide:'bottom'},
{blockId:'l219-v',path:[[1,9],[2,9],[3,9]]},
{blockId:'l219-u',path:[[2,9]]},
{blockId:'l219-p',path:[[0,9]]},
{blockId:'l219-q',path:[[0,8]],exitSide:'left'},
{blockId:'l219-s',path:[[2,8],[1,8],[0,8]],exitSide:'left'},
{blockId:'l219-v',path:[],exitSide:'bottom'},
{blockId:'l219-u',path:[[3,9]],exitSide:'bottom'},
{blockId:'l219-p',path:[[1,9],[2,9],[3,9]],exitSide:'bottom'}];
if(process.argv[1]?.endsWith('prefix219.mjs')){const level=symmetric219(),api=await loadSpatialApi(),r=api.replayRevisedRoute(level,prefix219);fs.writeFileSync('deliverables/continue211-220-20260930/design-new/prefix219-evidence.json',JSON.stringify({level,drags:prefix219,replay:r},null,2));console.log({valid:r.valid,complete:r.complete,U:r.nonClearingDrags,clears:r.clearEvents,error:r.error});}
