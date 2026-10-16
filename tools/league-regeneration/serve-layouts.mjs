import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const root=path.resolve('deliverables/league-layout-atlas-20261008');
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('Outside gallery');res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('Not found');}}).listen(Number(process.argv[2]??5185),'127.0.0.1',()=>console.log('League layout atlas ready'));
