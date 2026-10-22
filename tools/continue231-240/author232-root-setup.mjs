import fs from 'node:fs';
import assert from 'node:assert/strict';
const from='tools/continue231-240/author232-six-dependency.mjs';
let text=fs.readFileSync(from,'utf8');
function replace(a,b){assert(text.includes(a),a);text=text.replace(a,b);}
replace("from '../regeneration211-design/fifo-witness214.mjs'","from './author232-fast-route.mjs'");
replace("out=ROOT+'/author232'","out=ROOT+'/alternate232'");
replace("const sourceFile=out+'/source-ledger.json'","const sourceFile=ROOT+'/author232/source-ledger.json'");
replace("const visible=tiling(opening,mask.filter(([x,y])=>!curtains.some(c=>x>=c.x&&x<c.x+4&&y>=c.y&&y<c.y+3)).reverse());if(!visible)return null;",`const fixedOpening=[{...opening[3],color:'red',x:2,y:0},{...opening[9],color:'blue',x:6,y:1}];
 const fixedCells=new Set(fixedOpening.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(','))));
 const rest=tiling(opening.filter((_,i)=>i!==3&&i!==9),mask.filter(([x,y])=>!fixedCells.has([x,y].join(','))&&!curtains.some(c=>x>=c.x&&x<c.x+4&&y>=c.y&&y<c.y+3)).reverse());if(!rest)return null;
 const visible=[...fixedOpening,...rest];`);
replace("const le=edges('left')[0],ri=edges('right')[0];if(!le||!ri||le.i===ri.i)return null;","const le={b:visible[0],i:0},ri={b:visible[1],i:1};");
replace("['red','left',[0,1],3,0]","['red','top',[2,0],3,0]");
replace("['green','top',[2,0],3,6]","['green','left',[0,1],3,6]");
replace("name:'双帘·回环升降'","name:'双帘·折返升降'");
replace("非q0形状与层铺排作同面积q0适配", "红普通与绿冰6在顶口/左口互换位置（门色和计数保持），两源四格体改原向SQ2并固定顶红/右蓝首清，提供8格真实空间；其余全新排布。非q0形状与层铺排作同面积q0适配");
fs.writeFileSync('tools/continue231-240/author232-root.mjs',text,{flag:'wx'});
