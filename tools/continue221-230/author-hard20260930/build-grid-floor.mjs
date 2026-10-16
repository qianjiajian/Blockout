import fs from 'node:fs';
const root='tools/continue221-230/author-hard20260930/';
let native=fs.readFileSync('tools/remake191-200/author194-196/native-keys32.cs','utf8');
native=native.replace('public class BodyInput{','public class BodyInput{public long[][] forbidden;')
 .replace('public class Body{','public class Body{public Mask128[] forbidden;')
 .replace('new Body{layers=b.layers','new Body{forbidden=b.forbidden.Select(Mask).ToArray(),layers=b.layers')
 .replaceAll('other=occupied^b.poses[start].mask','other=(occupied^b.poses[start].mask)|b.forbidden[stage]')
 .replace('native-mask128-fixed-cover-prefix-identity-quotient-stop-at-goal-v172','native-mask128-colored-grid-fixed-cover-identity-quotient-v1');
fs.writeFileSync(root+'native-grid32.cs',native);
let reference=fs.readFileSync('tools/remake111to120-spatial-floor-v147.mjs','utf8');
reference=reference.replace("'./revised-preview-validation-v160.mjs'","'../../revised-preview-validation-v160.mjs'")
 .replace("'flipDoors','coloredGrids','elevators'","'flipDoors','elevators'")
 .replace('const out=Array(c.words).fill(0);for(const co of c.covers)','const out=Array(c.words).fill(0);if(excluded>=0){const b=c.blocks[excluded],color=b.layers[s[excluded]>>>7];for(const grid of c.level.coloredGrids??[])if(grid.color!==color)add(out,mask(grid.cells,c.W,c.words));}for(const co of c.covers)');
fs.writeFileSync(root+'grid-reference-v147.mjs',reference);
