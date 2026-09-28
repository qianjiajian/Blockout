import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadApi } from './remake91to100-v146.mjs';
import { digest } from './revised-preview-validation-v160.mjs';
import { verifySource94, verifyMechanisms94 } from './verify-remake94-source-v147.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node tools/author94-cyan0-enrich-v147.mjs <enriched-candidate> [output]');
const candidate = JSON.parse(fs.readFileSync(input, 'utf8'));
const sourcePath = candidate.sourceAdaptation?.constructionReview;
if (!sourcePath) throw new Error('Candidate has no construction review');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const revision = {
  gate: 'r147-94-g5',
  color: 'cyan',
  frozen: 25,
  from: { side: 'bottom', offset: 4, size: 3 },
  to: { side: 'bottom', offset: 0, size: 3 },
  reason: 'Prior layout has a verified real U20 shortcut and fails the super lower bound. This revision changes the cyan port location while preserving source identities, counters and every carrier.'
};
source.status = 'cyan-bottom-offset0 revision; U24; L21 pending';
source.proofStatus = 'Fresh 64-drag U24; L21 pending; old candidate rejected by real U20 counterexample.';
source.portRevision = revision;
const stamp = Date.now();
const sourceOut = path.join(path.dirname(sourcePath), `source94-cyan0-revision-${stamp}.json`);
fs.writeFileSync(sourceOut, `${JSON.stringify(source, null, 2)}\n`, { flag: 'wx' });

const outCandidate = structuredClone(candidate);
outCandidate.sourceAdaptation.constructionReview = sourceOut;
outCandidate.sourceAdaptation.portRevision = revision;
outCandidate.binding[sourceOut] = digest(fs.readFileSync(sourceOut));
delete outCandidate.binding[sourcePath];
const { api } = await loadApi();
outCandidate.rootIndependentRecheck = {
  source: verifySource94(outCandidate),
  mechanisms: verifyMechanisms94(outCandidate, api)
};
const output = process.argv[3] || path.join(path.dirname(input), `candidate94-cyan0-enriched-${stamp}.json`);
fs.writeFileSync(output, `${JSON.stringify(outCandidate, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ output, sourceOut, levelSha256: digest(JSON.stringify(outCandidate.level)), routeSha256: digest(JSON.stringify(outCandidate.drags)), sourceAndMechanismsPassed: true }));

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  // CLI side effects are the intended entry point.
}
