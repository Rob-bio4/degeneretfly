import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const development=process.argv.includes('--dev');
const vite=development ? await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'}) : null;
const hosts={gamma:'https://gamma-api.polymarket.com',clob:'https://clob.polymarket.com',data:'https://data-api.polymarket.com'};
const routes={'/api/events':['gamma','/events'], '/api/book':['clob','/book'], '/api/trades':['data','/trades']};
const cache=new Map();
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname==='/api/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true}));}
  if(url.pathname.startsWith('/api/')){
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const route=routes[url.pathname]; if(!route){res.writeHead(404);return res.end();}
    const upstream=new URL(route[1],hosts[route[0]]);
    if(url.pathname==='/api/events') Object.entries({active:'true',closed:'false',limit:'70',order:'volume24hr',ascending:'false'}).forEach(([k,v])=>upstream.searchParams.set(k,v));
    if(url.pathname==='/api/book'){
      const token=url.searchParams.get('token_id');if(!/^\d{1,100}$/.test(token??'')){res.writeHead(400);return res.end('Invalid token');}
      upstream.searchParams.set('token_id',token);
    }
    if(url.pathname==='/api/trades'){
      const market=url.searchParams.get('market');if(!/^0x[0-9a-f]{64}$/i.test(market??'')){res.writeHead(400);return res.end('Invalid market');}
      upstream.searchParams.set('market',market);upstream.searchParams.set('limit','100');
    }
    const key=upstream.href;const entry=cache.get(key);const ttl=url.pathname==='/api/events'?30000:url.pathname==='/api/trades'?3000:800;
    try{
      if(entry&&Date.now()-entry.time<ttl){res.setHeader('Content-Type','application/json');return res.end(entry.body);}
      const result=await fetch(upstream,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
      const body=await result.text();res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
      if(result.ok){if(cache.size>300)cache.clear();cache.set(key,{body,time:Date.now()});}
      res.writeHead(result.status);return res.end(body);
    }catch{res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Market connection unavailable'}));}
  }
  if(vite)return vite.middlewares(req,res);
  try{
    const dist=path.join(root,'dist');let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
    if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}
    try{if(!(await stat(file)).isFile())file=path.join(dist,'index.html');}catch{if(path.extname(file)){res.writeHead(404);return res.end();}file=path.join(dist,'index.html');}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.swc':'text/plain','.bin':'application/octet-stream'};
    res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
  }catch{res.writeHead(500);res.end('Build the project with npm run build.');}
});
server.listen(Number(process.env.PORT??4173),process.env.HOST??'127.0.0.1',()=>console.log('The Degeneret Fly: http://localhost:'+(process.env.PORT??4173)));
process.on('SIGINT',()=>{vite?.close();server.close();process.exit(0);});
