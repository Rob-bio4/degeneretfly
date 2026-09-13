import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {runModel,modelStatus,chatPrompt,closeModels} from './engine/models.mjs';
import {kickBridge,bodyBytes} from './engine/kick.mjs';
import {createLedger} from './engine/ledger.mjs';
try{process.loadEnvFile?.();}catch{/* Optional local .env file. */}
const kick=kickBridge();
const root=path.dirname(fileURLToPath(import.meta.url));
const ledger=await createLedger(path.join(root,'.runtime'));
const development=process.argv.includes('--dev');
const vite=development ? await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'}) : null;
const hosts={gamma:'https://gamma-api.polymarket.com',clob:'https://clob.polymarket.com',data:'https://data-api.polymarket.com'};
const routes={'/api/events':['gamma','/events'], '/api/book':['clob','/book'], '/api/trades':['data','/trades']};
const cache=new Map();
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(/(?:^|\/)(?:\.runtime|\.models|\.venv|\.git|\.env[^/]*)\b/.test(decodeURIComponent(url.pathname))){res.writeHead(404);return res.end();}
  if(url.pathname==='/api/ledger'){
    if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host??'')){res.writeHead(403);return res.end();}
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{if(req.method==='GET')return res.end(JSON.stringify(ledger.read()));
      if(req.method!=='POST'){res.writeHead(405);return res.end();}
      return res.end(JSON.stringify(await ledger.update(JSON.parse((await bodyBytes(req,16*1024*1024)).toString()))));
    }catch{res.writeHead(503);return res.end(JSON.stringify({error:'Local ledger could not be saved; decisions paused'}));}
  }
  if(url.pathname==='/api/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true}));}
  if(['/api/models','/api/reply','/api/voice','/api/kick/messages'].includes(url.pathname)){
    const origin=req.headers.origin;
    if(origin&&origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
    res.setHeader('Cache-Control','no-store');
    try{
      if(req.method==='GET'&&url.pathname==='/api/models'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(modelStatus));}
      if(req.method==='GET'&&url.pathname==='/api/kick/messages'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(kick.read(Number(url.searchParams.get('after'))||0)));}
      if(req.method!=='POST'){res.writeHead(405);return res.end();}
      const body=JSON.parse((await bodyBytes(req)).toString());
      if(url.pathname==='/api/voice'){
        if(typeof body.text!=='string'||!body.text.trim()||body.text.length>700)throw new Error('Invalid speech text');
        const result=await runModel('kokoro',{text:body.text});res.setHeader('Content-Type','audio/wav');return res.end(Buffer.from(result.wav));
      }
      if(url.pathname==='/api/models'){await Promise.all([runModel('qwen',{type:'warm'}),runModel('kokoro',{type:'warm'})]);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(modelStatus));}
      if(typeof body.content!=='string'||body.content.length>500||typeof body.username!=='string'||body.username.length>40)throw new Error('Invalid chat message');
      const result=await runModel('qwen',{messages:chatPrompt(body.username,body.content,body.context??{},[])});
      res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({text:result.text.slice(0,500)}));
    }catch(error){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:error.message}));}
  }
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
process.on('SIGINT',()=>{vite?.close();kick.server.close();server.close();void closeModels().finally(()=>process.exit(0));});
