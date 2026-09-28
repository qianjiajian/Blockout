import { chromium } from 'playwright';
const ids = [24,26,30,32,34,38,39,47,64,70,87,90,92,95];
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
await page.goto(process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/', {waitUntil:'networkidle'});
const results = await page.evaluate(async ({ids}) => {
  const [{getLevel}, {solveLevelForValidation}] = await Promise.all([import('/src/core/levels.ts'), import('/src/core/levelSolver.ts')]);
  const out=[];
  for (const id of ids) {
    const base=getLevel(id);
    const tryOne=(name, level)=>{ const r=solveLevelForValidation(level, 180000); return {name, solved:r.solved, termination:r.termination, exploredStates:r.exploredStates, minimumDrags:Number.isFinite(r.minimumDrags)?r.minimumDrags:null, replay:r.solved?{moves:r.drags.length, cleared:r.drags.filter(d=>d.exitSide).length}:null, drags:r.solved?r.drags:null, staticUnsatReasons:r.staticUnsatReasons}; };
    const candidates=[];
    const colors=[...new Set(base.blocks.flatMap(b=>[b.color,...(b.layers??[])]))];
    const makeSwap=(a,b)=>{ const l=structuredClone(base); for(const block of l.blocks){ const map=(c)=>c===a?b:c===b?a:c; block.color=map(block.color); if(block.layers) block.layers=block.layers.map(map); } for(const g of l.gates) if(g.color===a)g.color=b; else if(g.color===b)g.color=a; return l; };
    // Prioritize swaps of two existing block colors; this preserves the color histogram and geometry.
    for(let i=0;i<colors.length && !candidates.some(x=>x.solved);i++) for(let j=i+1;j<colors.length && !candidates.some(x=>x.solved);j++) candidates.push({kind:'global-color-swap',colors:[colors[i],colors[j]],...tryOne(`${colors[i]}<->${colors[j]}`,makeSwap(colors[i],colors[j]))});
    // Try one-block recolors toward each existing exit color (smallest local edit).
    if(!candidates.some(x=>x.solved)) for(let bi=0;bi<base.blocks.length && !candidates.some(x=>x.solved);bi++) for(const c of colors) if(c!==base.blocks[bi].color){ const l=structuredClone(base); const old=l.blocks[bi].color; l.blocks[bi].color=c; if(l.blocks[bi].layers) l.blocks[bi].layers=[c,...l.blocks[bi].layers.slice(1)]; candidates.push({kind:'single-block-recolor',blockId:base.blocks[bi].id,from:old,to:c,...tryOne(`${base.blocks[bi].id}:${old}->${c}`,l)}); }
    const hit=candidates.find(x=>x.solved);
    out.push({id, base:{blocks:base.blocks.length,gates:base.gates.length,colors}, candidateCount:candidates.length, candidate:hit??candidates[0]??null, solvedCandidates:candidates.filter(x=>x.solved).slice(0,3)});
  }
  return out;
},{ids});
console.log(JSON.stringify(results));
await browser.close();
