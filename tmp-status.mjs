import fs from 'node:fs';const x=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/formal/formal-status.json','utf8'));console.log(x.ranges.early)
