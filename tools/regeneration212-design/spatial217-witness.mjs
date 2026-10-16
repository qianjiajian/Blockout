import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
/** Isolated witness extension only. A route must replay in the strict model.
 * Colored-grid pose filtering is NOT a certified lower-bound implementation.
 * The existing spatial module is loaded without writing or changing it. */
export async function load217WitnessSearch({eagerClear=false,preferOpenGates=false}={}){
 const file='tools/remake201to210-v123-floor.mjs';
 let source=fs.readFileSync(file,'utf8');
 const old='export function compileSpatial(level,api){';
 if(!source.includes(old))throw Error('Spatial source signature changed');
 source=source.replace(old,'function compileWithoutGrids(level,api){');
 source=source.replace("import {build} from 'esbuild';",'');
 source=source.replace(/^export function loadSpatialApi.*\r?$/m,'');
 source=source.replace("'./revised-preview-validation-v160.mjs'",JSON.stringify(pathToFileURL(path.resolve('tools/revised-preview-validation-v160.mjs')).href));
 source=source.replace('normalize=false,diagnosticTrace=false}={}){','normalize=false,diagnosticTrace=false,prefixDrags=[]}={}){');
 source=source.replace(' const normalized=s=>normalize?', ' if(prefixDrags.length){if(prove)throw Error("Prefix routes are witness-only");c.initial=replayDomain(c,prefixDrags,api).state;}\n const normalized=s=>normalize?');
 if(eagerClear)source=source.replace(" if(c.covers.some(co=>co.skin==='lift'&&start[co.stateIndex]===NONE))return{s:start,drags:[]};",'');
 if(preferOpenGates)source=source.replace('const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;',`const nearOpenGate=s=>{let result=0;const count=cleared(c,s);for(let j=0;j<c.N;j++){if(!active(c,s,j))continue;const b=c.blocks[j],p=s[j]&127,x=p%c.W,y=Math.floor(p/c.W);let best=Infinity;for(let q=0;q<b.poses.length;q++){const pose=b.poses[q];if(pose&&pose.exits[0].some(e=>count>=(e.gate.frozen??0)))best=Math.min(best,Math.abs(q%c.W-x)+Math.abs(Math.floor(q/c.W)-y));}if(Number.isFinite(best))result+=best;}return result;};const score=i=>prove?-nodes[i].cost:(nodes[i].heuristicScore??=nodes[i].clears*weight-nodes[i].cost*3-nearOpenGate(nodes[i].s)*5);`);
 source+=`\nexport function compileSpatial(level,api){
 api.validateLevel(level);
 if(level.blocks.some(b=>(b.layers?.length??1)>1))throw Error('217 witness extension supports single-stage bodies only');
 const relaxed=structuredClone(level);delete relaxed.coloredGrids;
 const c=compileWithoutGrids(relaxed,api);c.level=level;
 const grids=new Map((level.coloredGrids??[]).flatMap(g=>g.cells.map(p=>[p.join(','),g.color])));
 for(const b of c.blocks){
  for(let p=0;p<b.poses.length;p++)if(b.poses[p]){
   const x=p%c.W,y=Math.floor(p/c.W);
   if(b.shape.some(([dx,dy])=>{const color=grids.get([x+dx,y+dy].join(','));return color&&color!==b.color;}))b.poses[p]=null;
  }
  for(const pose of b.poses)if(pose)pose.neighbors=pose.neighbors.filter(p=>b.poses[p]);
  if(!b.poses[b.initial])throw Error('Initial body violates colored grid');
 }
 return c;
}\n`;
 const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 return {search(level,spatialApi,options={}){if(options.prove)throw Error('Witness-only extension does not certify bounds');return api.searchSpatial(level,spatialApi,options);}};
}
