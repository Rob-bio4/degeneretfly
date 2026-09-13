import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Streamer} from '../src/streamer';
import {FlyAgent} from '../src/agent';
import {PolymarketFeed,MARKET_DWELL_MS,type Quote} from '../src/live-market';
beforeEach(()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('finishes real-time lessons before every automatic market rotation',()=>{
  vi.useFakeTimers();const a=new FlyAgent();let total=0;
  for(let market=0;market<3;market++){
    const before=a.memory.lessons;
    for(let elapsed=0;elapsed<MARKET_DWELL_MS;elapsed+=3000){vi.setSystemTime(1000000+total+elapsed);
      const q:Quote={token:String(market),timestamp:Date.now(),warm:elapsed>=60000,bid:.49,ask:.5,mid:.495+elapsed/1e8,spread:.01,imbalance:.3,velocity1m:.001,spreadCompression:0,bids:[{price:.49,size:100}],asks:[{price:.5,size:100}],history:[],isLive:true};a.observe(q);
    }expect(a.memory.lessons).toBeGreaterThan(before);total+=MARKET_DWELL_MS;
  }
});
it('does not score predictions after a long outage',()=>{
  vi.useFakeTimers();vi.setSystemTime(1000000);const a=new FlyAgent();const q={token:'a',timestamp:Date.now(),warm:true,mid:.5,bid:.49,spread:.02,imbalance:.2,velocity1m:0,spreadCompression:0} as Quote;
  a.observe(q);vi.advanceTimersByTime(120000);a.observe({...q,timestamp:Date.now()});expect(a.memory.lessons).toBe(0);
});
it('waits for the complete spoken reply, then speaks trade events before the next chat',async()=>{
  const streamer=new Streamer(new PolymarketFeed(),new FlyAgent());streamer.voice.enabled=true;
  const generated:string[]=[];vi.stubGlobal('fetch',vi.fn(async(_url,opts)=>{generated.push(JSON.parse(opts.body).username);return {ok:true,json:async()=>({text:'Welcome to the desk.'})};}));
  let finish:()=>void=()=>{};const spoken:string[]=[];
  vi.spyOn(streamer.voice,'speak').mockImplementation(text=>{spoken.push(text);return new Promise<void>(resolve=>finish=resolve);});
  streamer.receive({sequence:1,id:'1',username:'First',content:'Hello'});streamer.receive({sequence:2,id:'2',username:'Second',content:'Hello'});
  const first=streamer.pump();await vi.waitFor(()=>expect(spoken).toHaveLength(1));await streamer.pump();expect(generated).toEqual(['First']);
  streamer.entry({id:1,timestamp:Date.now(),market:'Example contract',token:'1',side:'SELL',quantity:2,price:.4,pnl:-.2,slippage:0,reason:'stop'});
  finish();await first;const second=streamer.pump();await vi.waitFor(()=>expect(spoken).toHaveLength(2));expect(spoken[1]).toContain('Took the L');expect(generated).toEqual(['First']);finish();await second;
  const third=streamer.pump();await vi.waitFor(()=>expect(spoken).toHaveLength(3));expect(generated).toEqual(['First','Second']);finish();await third;
});
