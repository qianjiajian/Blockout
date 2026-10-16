const r=require('./deliverables/league-regeneration-20261004/formal/mid-20-64.json'); for(const i of [20,60]){const x=r.rows.find(q=>q.index===i);console.log('LEVEL',i); console.dir(x,{depth:5});}
