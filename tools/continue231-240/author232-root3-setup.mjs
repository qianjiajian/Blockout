import fs from 'node:fs';import assert from 'node:assert/strict';
let code=fs.readFileSync('tools/continue231-240/author232-root2-generator.mjs','utf8');
const changes=[
 ["color:'red',x:2,y:0},{...opening[9],color:'blue',x:6,y:1}","color:'red',x:0,y:2},{...opening[9],color:'blue',x:6,y:2}"],
 ["['red','top',[2,0],3,0],['blue','right',[7,1],3,0]","['red','left',[0,2],3,0],['blue','right',[7,2],3,0]"],
 ["['green','left',[0,1],3,6]","['green','top',[2,0],3,6]"],
 ['红普通与绿冰6在顶口/左口互换位置（门色和计数保持），两源四格体改原向SQ2并固定顶红/右蓝首清','红蓝普通门移至左右侧第3行起三格，绿冰6保顶口（门色和计数保持），两源四格体改原向SQ2并固定左右第3行首清'],
 ["name:'双帘·连环升降'","name:'双帘·双向升降'"]
];for(const[a,b]of changes){assert(code.includes(a),a);code=code.replace(a,b);}
fs.writeFileSync('tools/continue231-240/author232-root3-generator.mjs',code,{flag:'wx'});
let runner=fs.readFileSync('tools/continue231-240/author232-root2-route.mjs','utf8');
runner=runner.replaceAll('root2','root3');
fs.writeFileSync('tools/continue231-240/author232-root3-route.mjs',runner,{flag:'wx'});
