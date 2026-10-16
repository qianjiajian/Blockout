import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {constants as bufferConstants} from 'node:buffer';

// Storage codec only. No game model, history merge, solver, ledger or mutable
// global state. The reader returns JSON values; history qualification is the
// consumer's separate responsibility. No full-bundle JSON string is created.
export const PACK_VERSION = 'ordered-json-event-pack-v1';
export const MAX_CHUNK_BYTES = 500_000_000;
export const DEFAULT_CHUNK_BYTES = 16 * 1024 * 1024;
export const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const HEX = /^[a-f0-9]{64}$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = bytes => new TextDecoder('utf-8', {fatal:true}).decode(bytes);
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const exactKeys = (o, keys) => assert.deepEqual(Object.keys(o).sort(), [...keys].sort(), 'Unexpected storage schema');
const integer = (n, min, max, label) => assert(Number.isSafeInteger(n) && n >= min && n <= max, label);
const isIndex = key => /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < 4294967295;

function objectKeys(value, canonical) {
  const proto = Object.getPrototypeOf(value);
  assert(proto === Object.prototype || proto === null, 'Only plain JSON objects are supported');
  let keys = Object.keys(value);
  assert.equal(Object.getOwnPropertySymbols(value).length, 0, 'JSON symbol keys are unsupported');
  for (const key of keys) assert(own(Object.getOwnPropertyDescriptor(value, key), 'value'), 'JSON accessors are unsupported');
  if (canonical) keys = keys.filter(key => value[key] !== undefined);
  // canonicalJson sorts strings, then Object.fromEntries/JSON.stringify puts
  // integer-index keys first in numeric order. Simple lexicographic sorting
  // alone is NOT compatible with the frozen canonicalJson implementation.
  return canonical ? keys.filter(isIndex).sort((a, b) => Number(a) - Number(b)).concat(keys.filter(k => !isIndex(k)).sort()) : keys;
}

function* stringSegments(value, limit = 16384) {
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + limit, value.length);
    if (end < value.length && end > start && /[\uD800-\uDBFF]/.test(value[end - 1]) && /[\uDC00-\uDFFF]/.test(value[end])) end--;
    if (end === start) end = Math.min(start + 2, value.length);
    yield value.slice(start, end); start = end;
  }
}

function* quoted(value) {
  yield '"';
  for (const part of stringSegments(value)) yield JSON.stringify(part).slice(1, -1);
  yield '"';
}

// Explicit stack avoids call-stack growth and keeps auxiliary traversal memory
// proportional to depth rather than pushing an entire large array at once.
function* walk(value, canonical = false) {
  const active = new WeakSet(), stack = [{kind:'value', value}];
  while (stack.length) {
    const f = stack[stack.length - 1];
    if (f.kind === 'array') {
      if (f.index === f.value.length) { stack.pop(); active.delete(f.value); yield ['endArray']; continue; }
      const i = f.index++, present = own(f.value, i); assert(canonical || present, 'Sparse arrays are unsupported');
      if (present) assert(own(Object.getOwnPropertyDescriptor(f.value, String(i)), 'value'), 'Array accessors are unsupported');
      if (i) yield ['comma'];
      stack.push({kind:'value', value:canonical && (!present || f.value[i] === undefined) ? null : f.value[i]}); continue;
    }
    if (f.kind === 'object') {
      if (f.index === f.keys.length) { stack.pop(); active.delete(f.value); yield ['endObject']; continue; }
      const i = f.index++, key = f.keys[i]; if (i) yield ['comma'];
      yield ['key', key]; stack.push({kind:'value', value:f.value[key]}); continue;
    }
    stack.pop(); const v = f.value;
    if (v === null || typeof v === 'string' || typeof v === 'boolean') { yield ['scalar', v]; continue; }
    if (typeof v === 'number') { assert(canonical || Number.isFinite(v), 'Nonfinite JSON number'); yield ['scalar', Number.isFinite(v) ? v : null]; continue; }
    assert(v && typeof v === 'object', 'Unsupported JSON value');
    assert(!active.has(v), 'Cyclic JSON object'); active.add(v);
    if (Array.isArray(v)) {
      assert.equal(Object.getOwnPropertySymbols(v).length, 0, 'Array symbol keys are unsupported');
      if (!canonical) assert.equal(Object.keys(v).length, v.length, 'Sparse or extended arrays are unsupported');
      stack.push({kind:'array', value:v, index:0}); yield ['startArray'];
    } else { stack.push({kind:'object', value:v, keys:objectKeys(v, canonical), index:0}); yield ['startObject']; }
  }
}

// Canonical hashing additionally supports the frozen helper's optional undefined
// fields and sparse/undefined array entries (omitted and null respectively).
// Storage intentionally rejects these before reserving output: it never silently
// drops unknown fields or changes the supplied bundle's actual values.
export function* iterateJsonTokens(value, {canonical = false} = {}) {
  for (const [kind, v] of walk(value, canonical)) {
    if (kind === 'key') { yield* quoted(v); yield ':'; }
    else if (kind === 'scalar') { if (typeof v === 'string') yield* quoted(v); else yield JSON.stringify(v); }
    else yield {startArray:'[',endArray:']',startObject:'{',endObject:'}',comma:','}[kind];
  }
}

export function hashJsonStream(value, {canonical = false} = {}) {
  const hash = createHash('sha256'); let bytes = 0, pending = '', units = 0;
  const flush = () => { const b = Buffer.from(pending); hash.update(b); bytes += b.length; pending = ''; units = 0; };
  for (const token of iterateJsonTokens(value, {canonical})) { pending += token; units += token.length; if (units >= 65536) flush(); }
  if (units) flush();
  assert(Number.isSafeInteger(bytes), 'JSON byte counter overflow');
  return {sha256:hash.digest('hex'), bytes};
}

function* storageEvents(value, segmentChars) {
  for (const [kind, v] of walk(value)) {
    if (kind === 'comma') continue;
    if (kind === 'key' || kind === 'scalar' && typeof v === 'string') {
      const tag = kind === 'key' ? 'k' : 's';
      if (v.length <= segmentChars) yield [tag, v];
      else { yield [tag.toUpperCase()]; for (const part of stringSegments(v, segmentChars)) yield ['t', part]; yield ['e']; }
    } else if (kind === 'scalar') yield Object.is(v, -0) ? ['z'] : ['v', v];
    else yield [{startObject:'o',endObject:'O',startArray:'a',endArray:'A'}[kind]];
  }
}

function limits(options) {
  const chunkTargetBytes = options.chunkTargetBytes ?? DEFAULT_CHUNK_BYTES;
  integer(chunkTargetBytes, 128, MAX_CHUNK_BYTES, 'Invalid chunk target');
  integer(options.maxTotalBytes, 1, Number.MAX_SAFE_INTEGER, 'Explicit finite maxTotalBytes is required');
  return {chunkTargetBytes, maxTotalBytes:options.maxTotalBytes};
}

/** Exclusive output directory; partial failures never publish a manifest.
 * maxTotalBytes is deliberately mandatory: callers must explicitly review the
 * aggregate bound for this new format, rather than silently raising old limits. */
export async function writeHistoryPack(value, {directory, ...options}) {
  assert(typeof directory === 'string' && directory.length, 'Output directory required');
  const {chunkTargetBytes, maxTotalBytes} = limits(options);
  const json = hashJsonStream(value), canonical = hashJsonStream(value, {canonical:true});
  assert(json.bytes <= maxTotalBytes, 'Logical JSON exceeds aggregate bound');
  await fs.mkdir(directory); // No overwrite/reuse, including earlier partial writes.
  const chunks = [], chunkBuffer = Buffer.allocUnsafe(chunkTargetBytes);
  let offset = 1, chunkEvents = 0, totalChunkBytes = 0, eventCount = 0; chunkBuffer[0] = 91;
  async function flush() {
    if (!chunkEvents) return;
    chunkBuffer[offset] = 93; const bytes = chunkBuffer.subarray(0, offset + 1);
    assert(bytes.length <= chunkTargetBytes && bytes.length <= MAX_CHUNK_BYTES);
    assert(totalChunkBytes + bytes.length <= maxTotalBytes, 'Encoded pack exceeds aggregate bound');
    const file = `chunk-${String(chunks.length).padStart(6, '0')}.json`;
    await fs.writeFile(path.join(directory, file), bytes, {flag:'wx'});
    chunks.push({file, sha256:digest(bytes), bytes:bytes.length, eventCount:chunkEvents});
    totalChunkBytes += bytes.length; chunkEvents = 0; offset = 1;
  }
  const segmentChars = Math.max(1, Math.min(16384, Math.floor((chunkTargetBytes - 40) / 6)));
  for (const event of storageEvents(value, segmentChars)) {
    const bytes = Buffer.from(JSON.stringify(event)); // One bounded scalar/event, never a field/bundle.
    assert(bytes.length + 2 <= chunkTargetBytes, 'Event exceeds bounded chunk');
    if (offset + bytes.length + (chunkEvents ? 1 : 0) + 1 > chunkTargetBytes) await flush();
    if (chunkEvents) chunkBuffer[offset++] = 44;
    bytes.copy(chunkBuffer, offset); offset += bytes.length; chunkEvents++; eventCount++;
  }
  await flush();
  const manifest = {version:PACK_VERSION, chunkTargetBytes, maxChunkBytes:MAX_CHUNK_BYTES, maxTotalBytes,
    chunks, totalChunkBytes, eventCount, jsonUtf8Bytes:json.bytes, jsonSha256:json.sha256,
    canonicalJsonUtf8Bytes:canonical.bytes, canonicalProjectionSha256:canonical.sha256};
  const bytes = Buffer.from(JSON.stringify(manifest) + '\n'); assert(bytes.length <= MAX_MANIFEST_BYTES, 'Manifest exceeds bound');
  const manifestPath = path.join(directory, 'manifest.json'); await fs.writeFile(manifestPath, bytes, {flag:'wx'});
  return {descriptor:{path:manifestPath,sha256:digest(bytes)}, manifest};
}

function decoder() {
  const stack = []; let root, hasRoot = false, segmented = null;
  const parent = () => stack[stack.length - 1];
  function setKey(key) { const p = parent(); assert(p?.kind === 'o' && !p.waiting, 'Unexpected object key'); assert(!own(p.value,key), 'Duplicate object key'); p.key = key; p.waiting = true; }
  function accept(value) {
    const p = parent();
    if (!p) { assert(!hasRoot, 'Multiple roots'); root = value; hasRoot = true; }
    else if (p.kind === 'a') p.value.push(value);
    else { assert(p.waiting, 'Object value without key'); Object.defineProperty(p.value, p.key, {value,enumerable:true,writable:true,configurable:true}); p.waiting = false; p.key = null; }
  }
  function consume(e) {
    assert(Array.isArray(e) && typeof e[0] === 'string', 'Invalid storage event'); const tag=e[0];
    if (segmented) {
      if (tag === 't') { assert(e.length === 2 && typeof e[1] === 'string' && e[1].length, 'Invalid string fragment'); segmented.length += e[1].length; assert(segmented.length <= bufferConstants.MAX_STRING_LENGTH, 'Scalar string exceeds V8 limit'); segmented.parts.push(e[1]); return; }
      assert(tag === 'e' && e.length === 1 && segmented.parts.length, 'Unterminated string fragments');
      const {kind, parts} = segmented; segmented = null; const value = parts.join(''); if (kind === 'K') setKey(value); else accept(value); return;
    }
    if (tag === 'k' || tag === 's') { assert(e.length === 2 && typeof e[1] === 'string', 'Invalid string event'); if (tag === 'k') setKey(e[1]); else accept(e[1]); }
    else if (tag === 'K' || tag === 'S') { assert(e.length === 1); if (tag === 'K') assert(parent()?.kind === 'o' && !parent().waiting, 'Unexpected fragmented key'); segmented = {kind:tag,parts:[],length:0}; }
    else if (tag === 'v') { assert(e.length === 2 && (e[1] === null || typeof e[1] === 'boolean' || typeof e[1] === 'number' && Number.isFinite(e[1])), 'Invalid primitive'); accept(e[1]); }
    else if (tag === 'z') { assert(e.length === 1); accept(-0); }
    else if (tag === 'o' || tag === 'a') { assert(e.length === 1); const value = tag === 'o' ? {} : []; accept(value); stack.push({kind:tag,value,waiting:false,key:null}); }
    else if (tag === 'O' || tag === 'A') { assert(e.length === 1 && parent()?.kind === (tag === 'O' ? 'o' : 'a') && !parent().waiting, 'Invalid container close'); stack.pop(); }
    else assert.fail('Unknown storage event: '+tag);
  }
  return {consume, finish(){assert(hasRoot && !stack.length && !segmented, 'Incomplete JSON event stream');return root;}};
}

export async function readHistoryPack(descriptor, {readBytes = p => fs.readFile(p), maxTotalBytes} = {}) {
  assert(typeof descriptor?.path === 'string' && HEX.test(descriptor.sha256??''), 'Exact pack descriptor required');
  integer(maxTotalBytes, 1, Number.MAX_SAFE_INTEGER, 'Explicit finite maxTotalBytes is required');
  const manifestBytes = Buffer.from(await readBytes(descriptor.path));
  assert(manifestBytes.length <= MAX_MANIFEST_BYTES, 'Manifest exceeds bound'); assert.equal(digest(manifestBytes), descriptor.sha256, 'Manifest SHA mismatch');
  const m = JSON.parse(utf8(manifestBytes));
  exactKeys(m,['version','chunkTargetBytes','maxChunkBytes','maxTotalBytes','chunks','totalChunkBytes','eventCount','jsonUtf8Bytes','jsonSha256','canonicalJsonUtf8Bytes','canonicalProjectionSha256']);
  assert.equal(m.version, PACK_VERSION); assert.equal(m.maxChunkBytes, MAX_CHUNK_BYTES); limits(m);
  assert(m.maxTotalBytes <= maxTotalBytes, 'Manifest aggregate bound exceeds caller authorization');
  assert(Array.isArray(m.chunks) && m.chunks.length > 0); integer(m.totalChunkBytes,1,m.maxTotalBytes,'Pack total bytes'); integer(m.eventCount,1,Number.MAX_SAFE_INTEGER,'Pack events');
  integer(m.jsonUtf8Bytes,1,m.maxTotalBytes,'Logical JSON bytes'); integer(m.canonicalJsonUtf8Bytes,1,m.maxTotalBytes,'Canonical JSON bytes'); assert(HEX.test(m.jsonSha256) && HEX.test(m.canonicalProjectionSha256));
  const d = decoder(), fileBindings = {[descriptor.path]:descriptor.sha256}; let total = 0, events = 0;
  for (const [i, c] of m.chunks.entries()) {
    exactKeys(c,['file','sha256','bytes','eventCount']); assert.equal(c.file,`chunk-${String(i).padStart(6,'0')}.json`,'Missing/reordered/unsafe chunk'); assert(HEX.test(c.sha256));
    integer(c.bytes,1,Math.min(m.chunkTargetBytes,MAX_CHUNK_BYTES),'Chunk byte limit'); integer(c.eventCount,1,Number.MAX_SAFE_INTEGER,'Chunk event count');
    total += c.bytes; assert(Number.isSafeInteger(total) && total <= m.totalChunkBytes && total <= maxTotalBytes, 'Aggregate byte overflow');
    const p = path.join(path.dirname(descriptor.path),c.file), bytes = Buffer.from(await readBytes(p));
    assert.equal(bytes.length,c.bytes,'Chunk byte mismatch'); assert.equal(digest(bytes),c.sha256,'Chunk SHA mismatch'); fileBindings[p]=c.sha256;
    const values = JSON.parse(utf8(bytes)); // Exactly one bounded shard.
    assert(Array.isArray(values) && values.length === c.eventCount,'Chunk event mismatch'); for(const event of values)d.consume(event); events += values.length;
  }
  assert.equal(total,m.totalChunkBytes); assert.equal(events,m.eventCount);
  const value=d.finish(), json=hashJsonStream(value), canonical=hashJsonStream(value,{canonical:true});
  assert.deepEqual(json,{sha256:m.jsonSha256,bytes:m.jsonUtf8Bytes},'Logical order/value SHA mismatch');
  assert.deepEqual(canonical,{sha256:m.canonicalProjectionSha256,bytes:m.canonicalJsonUtf8Bytes},'Canonical projection SHA mismatch');
  return {value,manifest:m,fileBindings};
}
