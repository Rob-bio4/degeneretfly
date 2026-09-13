import http from 'node:http';
import {verify} from 'node:crypto';
// Official Kick public key: https://docs.kick.com/events/webhook-security
const PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;
export function authenticKick(headers,raw,key=PUBLIC_KEY,now=Date.now()){
  const id=headers['kick-event-message-id'],stamp=headers['kick-event-message-timestamp'],signature=headers['kick-event-signature'];
  if(typeof id!=='string'||typeof stamp!=='string'||typeof signature!=='string'||!Number.isFinite(Date.parse(stamp))||Math.abs(now-Date.parse(stamp))>300000)return false;
  try{return verify('RSA-SHA256',Buffer.concat([Buffer.from(`${id}.${stamp}.`),raw]),key,Buffer.from(signature,'base64'));}catch{return false;}
}
export async function bodyBytes(req,max=16384){const parts=[];let count=0;for await(const chunk of req){count+=chunk.length;if(count>max)throw new Error('Request too large');parts.push(chunk);}return Buffer.concat(parts);}
export function kickBridge(){
  const messages=[],seen=new Set();let sequence=0,lastMessage=0;
  const broadcaster=process.env.KICK_BROADCASTER_USER_ID;
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='POST'||req.url!=='/kick/webhook'){res.writeHead(404);return res.end();}
    if(!broadcaster){res.writeHead(503);return res.end('Configure broadcaster');}
    try{const raw=await bodyBytes(req,65536);
      if(!authenticKick(req.headers,raw)){res.writeHead(401);return res.end();}
      const event=JSON.parse(raw.toString());
      if(req.headers['kick-event-type']==='chat.message.sent'&&String(event.broadcaster?.user_id)===broadcaster){
        const id=String(event.message_id??req.headers['kick-event-message-id']);
        if(!seen.has(id)&&typeof event.content==='string'&&event.sender?.username){
          seen.add(id);lastMessage=Date.now();messages.push({sequence:++sequence,id,username:String(event.sender.username).slice(0,40),content:event.content.replace(/\[emote:\d+:([^\]]+)\]/g,'$1').slice(0,500),timestamp:lastMessage});
          if(messages.length>1000)messages.shift();if(seen.size>2000)seen.delete(seen.values().next().value);
        }
      }res.writeHead(204);res.end();
    }catch{res.writeHead(400);res.end();}
  });
  server.on('error',error=>console.error('Kick listener:',error.message));
  server.listen(Number(process.env.KICK_WEBHOOK_PORT??4174),'127.0.0.1');
  return {server,read:(after)=>({configured:!!broadcaster,lastMessage,latest:sequence,messages:messages.filter(m=>m.sequence>after),gap:messages.length>0&&after>0&&after<messages[0].sequence-1})};
}
