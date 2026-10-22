import fs from 'node:fs';import assert from 'node:assert/strict';
let code=fs.readFileSync('tools/continue231-240/author232-root2-generator.mjs','utf8');
const changes=[
 ["const opening=source.map((b,i)=>({id:'l232-b'+i,color:i===21?'cyan':b.color,shape:chooseShape(b.shape.length)}));","const small=sh(source.map((_,i)=>i).filter(i=>![3,7,9].includes(i))),domino=new Set(small.slice(0,9));const opening=source.map((b,i)=>({id:'l232-b'+i,color:i===21?'cyan':b.color,shape:native[i===3||i===7?14:i===9?7:domino.has(i)?(rand()<.5?2:8):1]}));assert.equal(opening.flatMap(b=>b.shape).length,54);"],
 ["const fixedOpening=[{...opening[3],color:'red',x:2,y:0},{...opening[9],color:'blue',x:6,y:1}];","const fixedOpening=[{...opening[3],color:'red',x:0,y:1},{...opening[9],color:'blue',x:6,y:1},{...opening[7],color:'blue',x:3,y:4}];"],
 ['opening.filter((_,i)=>i!==3&&i!==9)','opening.filter((_,i)=>![3,7,9].includes(i))'],
 ['const ord=new Set([le.i,ri.i]);','const ord=new Set([le.i,ri.i,2]);'],
 ['deep.slice(0,4)','deep.slice(0,3)'],
 ['const fixed=new Set([le.i,ri.i]),','const fixed=new Set([le.i,ri.i,2]),'],
 ["['red','top',[2,0],3,0]","['red','left',[0,1],3,0]"],
 ["['green','left',[0,1],3,6]","['green','top',[2,0],3,6]"],
 ["name:'双帘·连环升降'","name:'双帘·方阵升降'"],
 ['红普通与绿冰6在顶口/左口互换位置（门色和计数保持），两源四格体改原向SQ2并固定顶红/右蓝首清，提供8格真实空间；其余全新排布，另四个普通体按深度和形状混合选择而不一律选最大体。','普通门保左右1起三格，绿冰6保顶口，全部色与计数保持。开局逐体形状原创重分配为2个原向SQ3、1个SQ2、9个原向二格体和14个单格体，仍26体54格；这不是源形状逐体复制。左SQ3和右SQ2可先清获得13格空间，另一蓝SQ3位于下方需向上调度，余三普通体按深度选择。完整四隐藏层库存不增不减。']
];for(const[a,b]of changes){assert(code.includes(a),a);code=code.replace(a,b);}
fs.writeFileSync('tools/continue231-240/author232-root4-generator.mjs',code,{flag:'wx'});
let runner=fs.readFileSync('tools/continue231-240/author232-root2-route.mjs','utf8').replaceAll('root2','root4');
fs.writeFileSync('tools/continue231-240/author232-root4-route.mjs',runner,{flag:'wx'});
