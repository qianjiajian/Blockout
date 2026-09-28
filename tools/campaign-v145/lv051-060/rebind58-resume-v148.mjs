import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const root = 'deliverables/remake31-200-v145-20260924/batches/lv051-060';
const proofRoot = `${root}/root58`;
const candidate = `${root}/rebuild58/enriched-1790263144600.json`;
const prior = `${proofRoot}/continued-proof-179026-resume.json`;
const output = `${proofRoot}/continued-proof-179026-resume-v148.json`;
const lock = verifyRulesLock();
if (!lock.ok) throw new Error('rules lock must pass before rebinding');
const d = JSON.parse(fs.readFileSync(candidate, 'utf8'));
const compiled = await build({
  stdin: {resolveDir: process.cwd(), contents: "export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},
  bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', logLevel: 'silent'
});
const cli = path.resolve('tools/campaign-v145/lv051-060/continue58-terminal-cli-v147.mjs');
const meta = await build({entryPoints: [cli], bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent'});
const refs = [...new Set([
  ...Object.keys(compiled.metafile.inputs),
  ...Object.keys(meta.metafile.inputs),
  candidate,
  d.sourceReview,
  'docs/rules/manifest.json',
  'docs/mechanism-rules-v1.48.0.md',
  'tests/campaign-v145/lv051-060/terminal-normalized-floor58-v147.test.mjs',
  'tests/campaign-v145/lv051-060/continuable-terminal58-v147.test.mjs'
].filter(p => p !== '<stdin>'))];
const bindings = Object.fromEntries(refs.map(p => [p, digest(fs.readFileSync(p))]));
const fingerprint = digest({bindings, coreBundleSha256: digest(compiled.outputFiles[0].text)});
const hashFile = async file => {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
};
const frontier = fs.readdirSync(proofRoot)
  .filter(name => /^terminal-frontier-1790299004912\.bin$/.test(name))
  .map(name => path.join(proofRoot, name))[0];
if (!frontier) throw new Error('expected latest 2.49GB frontier missing');
const stat = fs.statSync(frontier);
const checkpoint = {file: frontier, sha256: await hashFile(frontier), bytes: stat.size};
const old = JSON.parse(fs.readFileSync(prior, 'utf8'));
const out = {
  ...old,
  fingerprint,
  bindings,
  ruleVersion: lock.activeVersion,
  checkedAt: new Date().toISOString(),
  checkpoint,
  proof: {...old.proof, termination: 'checkpoint-written-resume-ready'},
  priorProof: old.priorProof ?? null
};
fs.writeFileSync(output, JSON.stringify(out, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({output, ruleVersion: lock.activeVersion, fingerprint, checkpoint}));
