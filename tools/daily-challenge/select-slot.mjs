import { readFile, writeFile } from "node:fs/promises";
const input=JSON.parse(await readFile(process.argv[2],"utf8"));
const wanted=process.argv[3];
const slots=[];
for (const stage of input.stages) for (const bucket of Object.values(stage.difficulties)) for (const slot of bucket.candidates) if (!wanted || slot.formalId===wanted || String(slot.sourceLevelId)===wanted) slots.push(slot);
await writeFile(process.argv[4],JSON.stringify({...input,stages:[],slots},null,2));
console.log(slots.length);
