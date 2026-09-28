import fs from 'node:fs';
let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/retile145.mjs','utf8');
s=s.replace("const source=", "const source=");
s=s.replace('for(let n=0;n<800;n++)','for(let n=0;n<600;n++)');
const from="const level=structuredClone(base.level),bs=level.blocks.filter(b=>!b.shutterId);for(const b of bs){if(b.shape.length===3)b.shape=shapes[rnd()<.5?'V3':'H3'];else b.shape=shapes[rnd()<.5?'V2':'H2'];b.color=colors[Math.floor(rnd()*colors.length)];if(b.layers){b.layers[0]=b.color;b.layers[1]=colors.filter(c=>c!==b.color)[Math.floor(rnd()*4)];}}\n const candidates=shuffle(bs.filter(b=>b.shape.length===3));for(let k=0;k<2*(n%4);k+=2){candidates[k].shape=shapes.SQ2;candidates[k+1].shape=shapes[rnd()<.5?'H2':'V2'];}";
const to=`const level=structuredClone(base.level);level.blocks=level.blocks.filter(b=>!b.id.includes('-fill')&&!b.id.endsWith('-h6')&&!b.id.endsWith('-h7'));const bs=level.blocks.filter(b=>!b.shutterId);for(const b of bs){b.shape=shapes.V3;if(b.id.endsWith('-o11'))b.shape=[[0,0],[0,1],[1,1],[2,1],[0,2]];if(b.id.endsWith('-o6')||b.id.endsWith('-o12'))b.shape=shapes.SQ2;if(n%4)b.color=colors[Math.floor(rnd()*colors.length)];if(b.layers){b.layers[0]=b.color;b.layers[1]=colors.filter(c=>c!==b.color)[Math.floor(rnd()*4)];}}
 const hidden=level.blocks.filter(b=>b.shutterId);Object.assign(hidden.find(b=>!b.layers),{x:0,y:6,shape:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],color:'green'});hidden.filter(b=>b.layers).forEach((b,i)=>Object.assign(b,{x:3+i,y:6,shape:shapes.V3}));`;
if(!s.includes(from))throw Error('source changed');s=s.replace(from,to).replaceAll('candidate145-retile-','candidate145-source17-').replaceAll('/retile145-','/source17-');
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/source17.mjs',s);
