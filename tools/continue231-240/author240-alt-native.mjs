import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compileSpatial, each, normalizeClears, NONE, key, cleared } from '../continuation211-colored-witness.mjs';
import { ROOT, digest } from './common.mjs';
const source = 'tools/continue231-240/author240-alt-floor.cs';
export function payload240(level, api, options = {}) {
  assert.equal(level.id, 240);
  assert(!level.shutters?.length && !level.generators?.length && !level.flipDoors?.length);
  assert(level.blocks.length <= 32 && level.blocks.every(b => !b.layers && !b.keyId && !b.lockedBy && !b.star));
  const c = compileSpatial(level, api), groups = new Map();
  for (const [i, b] of level.blocks.entries()) {
    const sig = digest(Object.fromEntries(Object.entries(b).filter(([k]) => !['id', 'x', 'y'].includes(k))));
    if (!groups.has(sig)) groups.set(sig, []); groups.get(sig).push(i);
  }
  const p = { width: c.W, height: c.H, goalClears: c.totalClears,
    initial: [...c.initial].map(v => v === NONE ? 511 : v), groups: [...groups.values()].filter(g => g.length > 1),
    covers: [], floor: 21, maxStates: 800000, maxMilliseconds: 5000, ...options,
    blocks: c.blocks.map(b => ({ layers: 1, ice: b.ice, reveal: 0, lockCount: 0, keyIndices: [], forbidden: [[0, 0, 0, 0]],
      poses: b.poses.map(p => p && ({ mask: Array.from({ length: 4 }, (_, i) => p.mask[i] ?? 0), neighbors: p.neighbors,
        exits: p.exits.map(list => list.length ? Math.min(...list.map(ex => ex.gate.frozen ?? 0)) : -1) })) })) };
  return { c, p };
}
export function run240(p) {
  const root = ROOT + '/author240-alt/native'; fs.mkdirSync(root, { recursive: true });
  const sourceHash = digest(fs.readFileSync(source)), exe = path.resolve(root, 'grid-' + sourceHash.slice(0, 12) + '.exe');
  if (!fs.existsSync(exe)) execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',
    ['/nologo', '/optimize+', '/r:System.Web.Extensions.dll', '/out:' + exe, path.resolve(source)], { windowsHide: true, stdio: 'pipe' });
  const dir = path.resolve(root, `run-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 7)}`);
  fs.mkdirSync(dir); const input = dir + '/input.json', output = dir + '/output.json';
  fs.writeFileSync(input, JSON.stringify(p)); execFileSync(exe, [input, output], { windowsHide: true, stdio: 'pipe', timeout: p.maxMilliseconds + 7000 });
  return { ...JSON.parse(fs.readFileSync(output)), input, output, inputSha256: digest(p), source, sourceHash };
}
export function lower240(level, api, options = {}) {
  const { p } = payload240(level, api, options);
  return { ...run240(p), levelSha256: digest(level),
    abstraction: 'Full labeled inventory; static colored-grid forbidden poses and horizontal axes preserved. Optional contact and omitted concave exit sweep only add transitions. Monotone final-body removals normalized; identity quotient includes every property except ID and pose.' };
}
export function witness240(level, api) {
  const { c, p } = payload240(level, api, { floor: 31, maxStates: 180000, maxMilliseconds: 1800 });
  const nativeSource = 'tools/continue231-240/author240-alt-witness.cs';
  p.blocks.forEach((b, i) => {
    b.traffic = Array(c.W * c.H).fill(0);
    b.gateThresholds = c.blocks[i].layers.map((_, stage) => Math.min(999, ...c.blocks[i].poses.flatMap(p => p ? p.exits[stage].map(e => e.gate.frozen ?? 0) : [])));
    b.distances = c.blocks[i].layers.map((_, stage) => {
      const distances=Array(c.W*c.H).fill(100),queue=[];
      c.blocks[i].poses.forEach((pose,j)=>{if(pose?.exits[stage].length){distances[j]=0;queue.push(j);}});
      for(let j=0;j<queue.length;j++)for(const n of c.blocks[i].poses[queue[j]].neighbors)if(distances[n]>distances[queue[j]]+1){distances[n]=distances[queue[j]]+1;queue.push(n);}
      return distances;
    });
  });
  const root = ROOT + '/author240-alt/native-witness'; fs.mkdirSync(root, { recursive: true });
  const sourceHash = digest(fs.readFileSync(nativeSource)), exe = path.resolve(root, 'witness-' + sourceHash.slice(0, 12) + '.exe');
  if (!fs.existsSync(exe)) execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe', ['/nologo', '/optimize+', '/r:System.Web.Extensions.dll', '/out:' + exe, path.resolve(nativeSource)], { windowsHide: true, stdio: 'pipe' });
  const dir = path.resolve(root, `run-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 7)}`); fs.mkdirSync(dir);
  const input = dir + '/input.json', output = dir + '/output.json'; fs.writeFileSync(input, JSON.stringify(p));
  execFileSync(exe, [input, output], { windowsHide: true, stdio: 'pipe', timeout: p.maxMilliseconds + 7000 });
  const result = { ...JSON.parse(fs.readFileSync(output)), input, output, source: nativeSource, sourceHash, inputSha256: digest(p), witnessOnly: true };
  if (result.path) {
    let s = c.initial; const drags = [], compare = (state, values) => key(state) === key(Uint16Array.from(values.map(v => v === 511 ? NONE : v)));
    for (const [i, step] of result.path.entries()) {
      if (i) { let found, drag; each(c, s, (n, cost, get) => { if (compare(n, step.raw)) { found = n; drag = get(); return false; } }); assert(found, 'Native raw gesture missing'); s = found; drags.push(drag); }
      else assert(compare(s, step.raw));
      const normal = normalizeClears(c, s); s = normal.s; drags.push(...normal.drags); assert(compare(s, step.normalized));
    }
    assert.equal(cleared(c, s), c.totalClears); result.drags = drags;
  }
  return result;
}
export function qualify240(level, drags, api, options = {}) {
  const { c, p } = payload240(level, api, options), states = [c.initial], seen = new Set([JSON.stringify([...c.initial])]);
  const normal=s=>{
    if(p.goalClears===c.totalClears)return normalizeClears(c,s).s;
    for(;;){if(cleared(c,s)>=p.goalClears)return s;let next;each(c,s,(candidate,cost)=>{if(cost===0&&cleared(c,candidate)>cleared(c,s)){next=candidate;return false;}});if(!next)return s;s=next;}
  };
  for (let i = 0; i < states.length && states.length < 80; i++) each(c, states[i], s => {
    const k = JSON.stringify([...s]); if (!seen.has(k)) { states.push(s); seen.add(k); }
    if (states.length >= 80) return false;
  });
  const model = new api.PuzzleModel(level); model.startCountdown();
  for (const drag of drags) {
    model.beginAction(); for (const q of drag.path) assert(model.moveBlockStep(drag.blockId, ...q));
    if (drag.exitSide) assert(model.tryExit(drag.blockId, drag.exitSide).ok); assert(model.commitAction());
    const snapshot = model.snapshot(); states.push(Uint16Array.from(level.blocks.map(b => {
      const live = snapshot.blocks.find(v => v.id === b.id); return live ? live.y * level.width + live.x : NONE;
    })));
  }
  const canonical = s => { const x = s.slice(); for (const g of p.groups) { const v = g.map(i => x[i]).sort((a, b) => a - b); g.forEach((i, j) => x[i] = v[j]); } return x; };
  const text = s => { const b = Buffer.alloc(s.length * 2); s.forEach((v, i) => b.writeUInt16LE(v === NONE ? 511 : v, i * 2)); return b.toString('base64'); };
  const native = run240({ ...p, successorsOnly: true, states: states.map(s => [...s].map(v => v === NONE ? 511 : v)) }); let transitions = 0;
  for (const [i, s] of states.entries()) {
    const expected = new Set(); if(cleared(c,s)<p.goalClears)each(c, s, (n, cost) => expected.add(cost + ':' + text(canonical(normal(n)))));
    // C# OrderBy uses the host's culture; compare both sets in JS ordinal order.
    assert.deepEqual([...expected].sort(), [...native.rows[i].successors].sort()); assert.equal(text(normal(s)), native.rows[i].normalized);
    transitions += expected.size;
  }
  return { passed: true, states: states.length, transitions, goalClears:p.goalClears, levelSha256: digest(level), native,
    method: 'Independent optional-contact held-gesture successor enumeration for opening branches and every strict original-route state; colored-grid legal poses and axes retained.' };
}


