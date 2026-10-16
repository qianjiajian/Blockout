import assert from 'node:assert/strict';
import path from 'node:path';

// Pure string optimization only. No filesystem alias discovery or trust grant.
// A compiler owns an immutable copy of its scope. Changed scope => new compiler;
// clearMemo() only drops results, and never changes the compiled alias rules.
const absolute=p=>path.win32.normalize(p).replaceAll('\\','/').toLowerCase();
const inside=(p,r)=>p===r||p.startsWith(r+'/');
export function compileCanonicalHistoryPath(scope,{maximumMemoEntries=65536}={}){
 assert(path.win32.isAbsolute(scope.baseDirectory));
 assert(Number.isSafeInteger(maximumMemoEntries)&&maximumMemoEntries>=0);
 const snapshot=Object.freeze({baseDirectory:scope.baseDirectory,roots:Object.freeze(scope.roots.map(r=>Object.freeze({
  ...r,aliases:Object.freeze([...r.aliases])}))) });
 // Stable longest-first ordering preserves the old function's first-wins tie
 // behavior, including duplicates. Existing scope validation remains required.
 const aliases=snapshot.roots.flatMap(r=>[r.physicalPath,...r.aliases].map(a=>({from:absolute(a),to:absolute(r.physicalPath)})))
  .sort((a,b)=>b.from.length-a.from.length);
 const memo=new Map();let calls=0,hits=0,misses=0,evictions=0,clears=0;
 function canonical(file){
  assert(typeof file==='string'&&file.length>0,'Nonempty string required');
  // Resolve on EVERY call. Drive-relative paths may depend on ambient cwd/drive
  // state, so memoizing the un-resolved input string would not be equivalent.
  const p=absolute(path.win32.resolve(snapshot.baseDirectory,file));calls++;
  if(memo.has(p)){hits++;return memo.get(p);}misses++;
  const match=aliases.find(x=>inside(p,x.from)),result=match?match.to+p.slice(match.from.length):p;
  if(maximumMemoEntries){if(memo.size===maximumMemoEntries){memo.delete(memo.keys().next().value);evictions++;}memo.set(p,result);}
  return result;
 }
 return Object.freeze({scope:snapshot,canonical,clearMemo(){memo.clear();clears++;},
  stats:()=>({calls,hits,misses,evictions,clears,entries:memo.size,maximumMemoEntries,compiledAliases:aliases.length})});
}
