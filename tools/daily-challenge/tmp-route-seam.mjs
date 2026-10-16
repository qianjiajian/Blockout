import { build } from "esbuild";
const b=await build({stdin:{resolveDir:process.cwd(),loader:"ts",contents:`export { validateLevel } from "./src/core/PuzzleModel.ts"; export { replayRevisedRoute } from "./src/core/revisedLevelSearch.ts";`},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const {validateLevel,replayRevisedRoute}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString("base64")}`);
const N=31,h=N*2,w=2,gates=[],blocks=[],seams=[];for(let i=0;i<N;i++){const y=2*i;gates.push({id:`rg-${i}`,side:"right",offset:y,size:1,color:"red"},{id:`bg-${i}`,side:"left",offset:y,size:1,color:"blue"});blocks.push({id:`a-${i}`,x:0,y,shape:[[0,0]],color:"red"},{id:`b-${i}`,x:1,y,shape:[[0,0]],color:"blue"});if(i<N-1)seams.push({orientation:"horizontal",offset:y+2,start:0,size:w});}
const l={mechanismRules:"revised-2026-09-23-v1.4",id:910031,name:"seam pairs",difficulty:"super",timeSeconds:999,reward:0,width:w,height:h,gates,blocks,seams};validateLevel(l);const drags=[];for(let i=0;i<N;i++){const y=2*i;drags.push({blockId:`a-${i}`,path:[[0,y+1]]},{blockId:`b-${i}`,path:[[0,y]],exitSide:"left"},{blockId:`a-${i}`,path:[[0,y],[1,y]],exitSide:"right"});}

const r=replayRevisedRoute(l,drags); console.log(r);
