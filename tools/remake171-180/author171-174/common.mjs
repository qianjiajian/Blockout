import fs from 'node:fs';
import {loadApi as loadBase,PROFILE,original,TARGETS,auditSpatial,digest,ruleGate} from '../common.mjs';
import {loadApi,replay} from '../replay.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {compile,search} from '../../remake161-170/author168-170/search.mjs';
import {loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
export {PROFILE,TARGETS,auditSpatial,digest,ruleGate,replay,pack,SHAPES,seededRng,rect,compile,search};
export const api=(await loadApi()).api,spatial=await loadSpatialApi();
export const OUT='deliverables/remake171-180-20260927/author171-174';
export const save=(name,data)=>{const f=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(f,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return f;};
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
SHAPES.Z4=[api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===5).cells];
export function base(id){const l=structuredClone(original().levels[id-1].level);Object.assign(l,{mechanismRules:PROFILE,difficulty:TARGETS[id].difficulty,blocks:[],gates:[],shutters:[]});for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];return l;}
export function noTime(l){const r=structuredClone(l);for(const b of r.blocks)delete b.timedBombSeconds;return r;}
export function colour(blocks,palette,rng,pins={}){const adjacent=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));const adj=blocks.map(a=>blocks.map((b,i)=>a!==b&&adjacent(a,b)?i:-1).filter(i=>i>=0)),done=new Set();for(const b of blocks)if(pins[b.id]){b.color=pins[b.id];done.add(blocks.indexOf(b));}let nodes=0;function go(){if(++nodes>10000)return false;if(done.size===blocks.length)return true;const i=rng.shuffle(blocks.map((_,i)=>i).filter(i=>!done.has(i))).sort((a,b)=>adj[b].filter(j=>done.has(j)).length-adj[a].filter(j=>done.has(j)).length)[0];for(const col of rng.shuffle(palette)){if(adj[i].some(j=>done.has(j)&&blocks[j].color===col))continue;blocks[i].color=col;done.add(i);if(go())return true;done.delete(i);}return false;}return go();}
