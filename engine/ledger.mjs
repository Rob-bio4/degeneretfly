import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';

export function validMemory(m){
  return !!m&&Array.isArray(m.weights)&&m.weights.length===3&&m.weights.every(Number.isFinite)
    &&Number.isInteger(m.lessons)&&m.lessons>=0&&Number.isFinite(m.error)&&Number.isInteger(m.correct)
    &&Number.isFinite(m.cash)&&m.cash>=0&&Array.isArray(m.fills)&&!!m.holdings
    &&Object.values(m.holdings).every(h=>h&&[h.quantity,h.cost,h.mark].every(Number.isFinite)&&h.quantity>=0)
    &&m.fills.every((f,i)=>f.id===i+1&&['BUY','SELL'].includes(f.side)&&typeof f.token==='string'&&typeof f.market==='string'&&[f.timestamp,f.quantity,f.price,f.pnl,f.slippage].every(Number.isFinite));
}
export async function createLedger(directory){
  await mkdir(directory,{recursive:true});const file=path.join(directory,'ledger.json');
  let memory=null,revision=0,owner='',expires=0,chain=Promise.resolve();
  try{const saved=JSON.parse(await readFile(file,'utf8'));if(!validMemory(saved.memory))throw new Error('Invalid saved ledger');memory=saved.memory;revision=saved.revision;}catch(e){if(e.code!=='ENOENT')throw e;}
  const snapshot=()=>({memory,revision,owner,expires});
  const persist=async(next)=>{const data=JSON.stringify({revision:revision+1,memory:next});await writeFile(file+'.tmp',data,{mode:0o600});await rename(file+'.tmp',file);memory=next;revision++;};
  return {read:snapshot,update(body,now=Date.now()){
    const job=chain.then(async()=>{
      if(typeof body.client!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(body.client))throw new Error('Invalid client');
      if(owner&&owner!==body.client&&expires>now)return {...snapshot(),writable:false};
      // First browser imports its existing local history once. Later browsers never overwrite it.
      if(!memory){if(!validMemory(body.memory))throw new Error('Invalid migration');await persist(body.memory);}
      else if(owner===body.client&&expires>now&&body.revision===revision&&body.memory){
        if(!validMemory(body.memory)||body.memory.lessons<memory.lessons||body.memory.fills.length<memory.fills.length)throw new Error('Invalid ledger update');
        if(JSON.stringify(body.memory.fills.slice(0,memory.fills.length))!==JSON.stringify(memory.fills))throw new Error('History is append-only');
        await persist(body.memory);
      }
      owner=body.client;expires=now+12000;return {...snapshot(),writable:true};
    });chain=job.catch(()=>{});return job;
  }};
}
