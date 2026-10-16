import fs from 'node:fs';const x=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/late-65-100.json','utf8'));console.log(x.counts, x.blocked.length, x.accepted.length)
