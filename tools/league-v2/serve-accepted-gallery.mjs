import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('deliverables/league-v2-20261008/formal-layouts'),port=Number(process.argv[2]??5186);
const provenance=JSON.parse(await fs.readFile(path.join(root,'provenance.json'),'utf8'));
if(provenance.status!=='FORMAL_100_ACCEPTED_NOT_PUBLISHED'||provenance.count!==100)throw Error('Accepted local atlas required');
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name)),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
  const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Accepted local atlas http://127.0.0.1:${port}/`));
