import fs from 'node:fs';import assert from 'node:assert/strict';
let code=fs.readFileSync('tools/continue231-240/author232-beam-v2-route.mjs','utf8');
function swap(a,b){assert(code.includes(a),a);code=code.replace(a,b);}
swap('function prepareWitnessOrdering(c){',"function prepareWitnessOrdering(c){const focus=c.blocks.findIndex(b=>b.id==='l232-b7');");
swap('if(!active(c,s,i))continue;const b=c.blocks[i];',"if(!active(c,s,i))continue;if(focus>=0&&visible(c,s,focus)&&i!==focus)continue;const b=c.blocks[i];");
swap('blocked+route.steps*.015','blocked+route.steps*.05');
swap('const score=i=>nodes[i].clears*1000-',"const focus=c.blocks.findIndex(b=>b.id==='l232-b7');const score=i=>nodes[i].clears*(focus>=0&&visible(c,nodes[i].s,focus)?3:1000)-");
code='// WITNESS ONLY: focus ordering never supports a lower bound; all output requires full actual-model replay.\n'+code;
fs.writeFileSync('tools/continue231-240/author232-root-focus-route.mjs',code,{flag:'wx'});
let runner=fs.readFileSync('tools/continue231-240/author232-root5-search.mjs','utf8');
runner=runner.replace("from './author232-beam-v2-route.mjs'","from './author232-root-focus-route.mjs'").replaceAll('root5-','root6-').replaceAll('root5-search','root6-search');
fs.writeFileSync('tools/continue231-240/author232-root6-search.mjs',runner,{flag:'wx'});
