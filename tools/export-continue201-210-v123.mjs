import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
const bundle = await build({ entryPoints: ['src/core/formal201to210Data.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const module = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const levels = module.CANDIDATE_201_210_LEVELS;
const payload = { schemaVersion: 1, ruleVersion: 'v1.123.0', status: 'ISOLATED_CANDIDATE_ONLY', formalIds: [201,210], levels };
await writeFile('deliverables/continue201-210-20260929/candidate-levels-v123.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(levels.map(l => `${l.id}:${l.difficulty}:L${l.designTargets?.minimumRepositionOverhead}:par${l.preservedMoveTarget}`).join(' '));
