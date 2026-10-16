import { build } from "esbuild";
const b=await build({stdin:{resolveDir:process.cwd(),loader:"ts",contents:`export { validateLevel } from "./src/core/PuzzleModel.ts"; export { searchRevisedLevel,replayRevisedRoute } from "./src/core/revisedLevelSearch.ts"; export { checkRevisedRepositionFloor } from "./src/core/revisedRepositionFloor.ts";`},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const {validateLevel,searchRevisedLevel,replayRevisedRoute}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString("base64")}`);
const base=(extra={})=>{const gates=[{id:"rg0",side:"right",offset:0,size:1,color:"red"},{id:"bg0",side:"left",offset:0,size:1,color:"blue"}],blocks=[{id:"a0",x:0,y:0,shape:[[0,0]],color:"red"},{id:"b0",x:1,y:0,shape:[[0,0]],color:"blue"}];return {mechanismRules:"revised-2026-09-23-v1.4",id:991,name:"m",difficulty:"super",timeSeconds:999,reward:0,width:2,height:2,gates,blocks,seams:[],...extra};};
const specs={
 frozen:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red",frozen:1}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red"}]},
 ice:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red",frozen:1}]},
 shell:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red"},{id:"mbg",side:"left",offset:1,size:1,color:"blue"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red",layers:["red","blue"]}]},
 shutter:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"blue"}],blocks:[{id:"mt",x:0,y:1,shape:[[0,0]],color:"red"},{id:"m",x:1,y:1,shape:[[0,0]],color:"blue",shutterId:"s"}],shutters:[{id:"s",x:1,y:1,width:1,height:1,count:1,triggerBlockIds:["mt"]}]},
 axis:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red",movementAxis:"horizontal"}]},
 key:{gates:[{id:"mrg",side:"left",offset:1,size:1,color:"red"},{id:"mbg",side:"right",offset:1,size:1,color:"blue"}],blocks:[{id:"mk",x:0,y:1,shape:[[0,0]],color:"red",keyId:"k"},{id:"m",x:1,y:1,shape:[[0,0]],color:"blue",lockedBy:"k",lockCount:1}]},
 star:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red",star:true}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red",star:true}]},
 grid:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red"}],coloredGrids:[{id:"g",color:"red",cells:[[0,1]]}]},
 irregularBlock:{gates:[{id:"mrg",side:"right",offset:1,size:2,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0],[1,0],[1,1]],color:"red"}],height:3},
 irregularBoard:{gates:[{id:"mrg",side:"right",offset:1,size:1,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red"}],playable:[[0,0],[1,0],[0,1]]},
 lift:{gates:[{id:"mrg",side:"left",offset:1,size:1,color:"red"}],blocks:[{id:"m",x:0,y:1,shape:[[0,0]],color:"red"}],shutters:[{id:"l",x:0,y:1,width:1,height:1,count:1,skin:"lift"}]},
};
for(const [name,s] of Object.entries(specs)){const e={...s};if(e.gates)e.gates=[...e.gates];if(e.blocks)e.blocks=[...e.blocks];let l=base(e); try{validateLevel(l);const q=searchRevisedLevel(l,{maxStates:1000,maxDragStates:100,maxTransitions:100000,maxMilliseconds:1000}); console.log(name,"OK",q.status,q.termination,q.replay?.complete,q.drags.length);}catch(err){console.log(name,"ERR",err.message)}}
