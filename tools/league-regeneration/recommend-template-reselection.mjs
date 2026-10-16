/* Recommend mainline template sources for finite league difficulty retries.
 * Proxy only: parMoves-clearLoad is not a formal lower/upper certificate.
 * This file never edits LEVELS or league production data. */
import fs from 'node:fs';
import { build } from 'esbuild';
const out='deliverables/league-regeneration-20261005/template/template-reselection-recommendations.json';
const input='deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const load=l=>l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
const stats=l=>{const clear=load(l),over=(l.parMoves??0)-clear,sh=l.shutters?.length??0,gen=l.generators?.length??0,ice=l.blocks.filter(b=>(b.frozen??0)>0).length,layers=l.blocks.filter(b=>(b.layers?.length??1)>1).length;return{sourceLevelId:l.id,name:l.name,difficulty:l.difficulty,clearLoad:clear,parMoves:l.parMoves??null,proxyOverhead:over,mechanismWeight:sh*2+gen*3+ice+layers,proxyScore:over+sh*2+gen*3+ice+layers,blocks:l.blocks.length,shutters:sh,generators:gen,ice,layers};};
const pool=LEVELS.map(stats);
const cadence=i=>((i-1)%5===2?'super':'hard');
const target=d=>d==='super'?25:18;
const used=new Set();const rows=[];
for(let index=1;index<=100;index++){
 const difficulty=cadence(index),goal=target(difficulty);
 const ranked=pool.filter(x=>!used.has(x.sourceLevelId)).map(x=>({...x,distance:Math.abs(x.proxyOverhead-goal),inBand:x.proxyOverhead>=(difficulty==='super'?21:16)&&x.proxyOverhead<=(difficulty==='super'?30:20)})).sort((a,b)=>Number(b.inBand)-Number(a.inBand)||a.distance-b.distance||b.mechanismWeight-a.mechanismWeight||a.sourceLevelId-b.sourceLevelId);
 const pick=ranked[0]; if(!pick)throw new Error('pool exhausted'); used.add(pick.sourceLevelId);
 const alternates=ranked.slice(1,9).map(x=>({sourceLevelId:x.sourceLevelId,proxyOverhead:x.proxyOverhead,proxyScore:x.proxyScore,distance:x.distance,inBand:x.inBand,blocks:x.blocks,mechanismWeight:x.mechanismWeight}));
 rows.push({index,difficulty,targetProxyOverhead:goal,recommended:pick,alternates,plan:['clone-mainline-level','preserve-mechanism-inventory-and-board-mask','finite-shape-recolor-or-same-shape-layout-variants:8','run-fresh-route-replay','certify-L-and-U-on-final-same-object','audit-score-blocks-after-half-route']});
}
const recommendations={schemaVersion:1,generatedAt:new Date().toISOString(),source:'src/core/levels.ts',input,formalEligibility:false,proxyWarning:'proxyOverhead = parMoves - clearLoad is a template-selection heuristic, never a lower/upper bound certificate; every selected variant needs fresh same-object route/L/U/score evidence.',finiteVariantBudget:8,thresholds:{hard:{lower:16,upper:20},super:{lower:21,upper:30}},poolSize:pool.length,rows,summary:{hardRows:rows.filter(r=>r.difficulty==='hard').length,superRows:rows.filter(r=>r.difficulty==='super').length,selectedInProxyBand:rows.filter(r=>r.recommended.inBand).length,uniqueSourceIds:new Set(rows.map(r=>r.recommended.sourceLevelId)).size,highProxySources:pool.filter(x=>x.proxyOverhead>=16).length,superBandSources:pool.filter(x=>x.proxyOverhead>=21&&x.proxyOverhead<=30).length}};
fs.mkdirSync('deliverables/league-regeneration-20261005/template',{recursive:true});fs.writeFileSync(out,JSON.stringify(recommendations,null,2)+'\n');console.log(JSON.stringify({out,summary:recommendations.summary},null,2));
