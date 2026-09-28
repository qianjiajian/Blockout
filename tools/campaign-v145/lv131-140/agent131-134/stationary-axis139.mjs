import fs from 'node:fs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input));
const b=id=>d.level.blocks.find(b=>b.id===`n139-opening-${id}`);b(0).y=5;for(const id of [26,27,28])b(id).y=4;
const file=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-axis139-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({...d,input,changes:'Relocate horizontal blue H3 axis from row4 to row5 and displaced three S bodies to row4. Intermediate uncolored geometry; prior checks/proof invalid; fresh checks required.',checks:undefined,proof:undefined,formalAdopted:false},null,2));console.log(file);
