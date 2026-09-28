// New-rule audit input is the first operable model state, not raw authored
// records. In particular a zero-count lift is still hidden while occupied.
export function stableOpeningBlocks(level, PuzzleModel) {
  if(level.mechanismRules?.startsWith('revised-')) {
    const model=new PuzzleModel(level);model.start();const snapshot=model.snapshot();
    return snapshot.blocks.filter(b=>!b.shutterId||snapshot.shutters.find(s=>s.id===b.shutterId)?.revealed);
  }
  const queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));
  const closed=new Set((level.shutters??[]).filter(s=>s.count>0).map(s=>s.id));
  return level.blocks.filter(b=>!queued.has(b.id)&&!(b.shutterId&&closed.has(b.shutterId)));
}
