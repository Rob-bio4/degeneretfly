import {it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createLedger} from '../engine/ledger.mjs';
const initial=()=>({weights:[0,0,0],lessons:458,error:0,correct:0,cash:100,holdings:{},fills:[]});
it('migrates once, persists restart, and prevents simultaneous browser writers',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fly-ledger-test-'));
  try{
    const store=await createLedger(dir);let first=await store.update({client:'browser-one',revision:-1,memory:initial()},100);
    expect(first.memory.lessons).toBe(458);
    const second=await store.update({client:'browser-two',revision:-1,memory:{...initial(),lessons:0}},200);
    expect(second.writable).toBe(false);expect(second.memory.lessons).toBe(458);
    first=await store.update({client:'browser-one',revision:first.revision,memory:{...initial(),lessons:459}},300);
    const reopened=await createLedger(dir);expect(reopened.read().memory.lessons).toBe(459);
    const takeover=await store.update({client:'browser-two',revision:-1,memory:initial()},13000);
    expect(takeover.writable).toBe(true);expect(takeover.memory.lessons).toBe(459);
    await expect(store.update({client:'browser-two',revision:takeover.revision,memory:initial()},14000)).rejects.toThrow('Invalid ledger');
  }finally{await rm(dir,{recursive:true,force:true});}
});
