import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root = 'deliverables/remake31-200-v145-20260924/batches/lv051-060/root58';
const priorPath = process.argv[2];
const outputPath = process.argv[3];
if (!priorPath || !outputPath) throw new Error('usage: prior.json output.json');
const prior = JSON.parse(fs.readFileSync(priorPath, 'utf8'));
const frontier = fs.readdirSync(root)
  .filter(name => /^terminal-frontier-\d+\.bin$/.test(name))
  .map(name => ({name, mtime: fs.statSync(path.join(root, name)).mtimeMs}))
  .sort((a, b) => b.mtime - a.mtime)[0];
if (!frontier) throw new Error('no terminal frontier');
const file = path.join(root, frontier.name);
const hash = crypto.createHash('sha256');
await new Promise((resolve, reject) => {
  const stream = fs.createReadStream(file);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', resolve);
});
const stat = fs.statSync(file);
const out = structuredClone(prior);
out.checkedAt = new Date().toISOString();
out.priorProof = prior.priorProof ?? null;
out.checkpoint = {file, sha256: hash.digest('hex'), bytes: stat.size};
out.proof = {...prior.proof, termination: 'checkpoint-written-resume-ready'};
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({outputPath, checkpoint: out.checkpoint}));
