import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='tools/campaign-v145/lv131-140/agent139-140/';
const cs=fs.readFileSync(root+'native-progress-witness139.cs','utf8');
fs.writeFileSync(root+'native-cut-witness139.cs',cs,{flag:'wx'});
let js=fs.readFileSync(root+'native-progress-witness139.mjs','utf8').replaceAll('native-progress-witness139','native-cut-witness139');
const from=js.indexOf(" if(['left','right'].includes"),to=js.indexOf(' const sourceHash=',from);assert(from>0&&to>from);
js=js.slice(0,from)+`
 // Pure upper-search hint for this new split-row family. It is not a certified
 // floor checker. Independent full PuzzleModel route replay remains mandatory.
 assert(target.shape.length===1&&c.W===9&&c.H===13&&c.covers.length===2&&c.covers.every(co=>co.x===2&&co.width===4));
 const corridorRows=c.covers.reduce((mask,co)=>{for(let y=co.y;y<co.y+co.height;y++)mask|=1<<y;return mask;},0);
 p.leftRows=c.blocks.map(b=>b.poses.map((pose,pos)=>!pose?0:b.shape.reduce((m,[dx,dy])=>pos%c.W+dx===0&&(corridorRows&(1<<(Math.floor(pos/c.W)+dy)))!==0?m|(1<<(Math.floor(pos/c.W)+dy)):m,0)));
 p.rightRows=c.blocks.map(b=>b.poses.map((pose,pos)=>!pose?0:b.shape.reduce((m,[dx,dy])=>pos%c.W+dx===1&&(corridorRows&(1<<(Math.floor(pos/c.W)+dy)))!==0?m|(1<<(Math.floor(pos/c.W)+dy)):m,0)));
`+js.slice(to);
fs.writeFileSync(root+'native-cut-witness139.mjs',js,{flag:'wx'});
