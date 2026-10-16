import { build } from "esbuild";
const bundle = await build({ stdin:{contents:`export { LEVELS } from "./src/core/levels.ts"; export { MECHANISM_GUIDE } from "./src/core/mechanismCatalog.ts"; export { mechanismsUsedByDailyLevel } from "./src/core/dailyChallenge.ts";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm" });
const {LEVELS, MECHANISM_GUIDE, mechanismsUsedByDailyLevel}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const key = l => [l.mechanismRules||"legacy", ...(mechanismsUsedByDailyLevel(l)||[])].join("|");
const m = new Map(); for (const l of LEVELS) { const k=key(l); const arr=m.get(k)||[]; arr.push(l.id); m.set(k,arr); }
console.log(JSON.stringify({high:LEVELS.filter(l=>Number(l.designTargets?.minimumRepositionOverhead??0)>30||Number(l.preservedMoveTarget??0)>30||Number(l.parMoves??0)>30).map(l=>({id:l.id,par:l.parMoves,preserved:l.preservedMoveTarget,design:l.designTargets?.minimumRepositionOverhead,mechs:mechanismsUsedByDailyLevel(l)})),profiles:[...m.entries()].map(([profile,ids])=>({profile,ids}))},null,2));
