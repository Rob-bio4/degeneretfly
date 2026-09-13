import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {FlyAgent} from '../src/agent';
import {LIFConnectome} from '../src/connectome';
import {levels,type Quote,type Market} from '../src/live-market';
const market:Market={id:'1',question:'Test contract',yesTokenId:'123',conditionId:'0x123',slug:'test',liquidity:100};
const quote=(timestamp=Date.now()):Quote=>({token:'123',bids:[{price:.49,size:100}],asks:[{price:.50,size:4},{price:.51,size:100}],history:[],warm:true,bid:.49,ask:.50,mid:.495,spread:.01,imbalance:.8,velocity1m:.01,spreadCompression:0,timestamp,isLive:true});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(1000000);const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('execution safeguards',()=>{
  it('connects LIF motor spikes to a bounded exploration and timed exit',()=>{
    const a=new FlyAgent(),n=new LIFConnectome();let q=quote();a.observe(q);n.setSensoryFrame(q);n.setDecisionDrive(a.intent(q));
    const spikes=Array.from({length:120},()=>n.step(8.333)).flat();expect(spikes.some(s=>s.neuronId==='DNp01')).toBe(true);
    const entry=a.act('BUY',q,market)!;expect(entry).not.toBeNull();expect(entry.quantity*entry.price).toBeLessThanOrEqual(2);expect(entry.reason).toContain('exploration');
    vi.advanceTimersByTime(61000);q=quote();a.observe(q);n.setDecisionDrive(a.intent(q));const outputs=Array.from({length:120},()=>n.step(8.333)).flat();expect(outputs.some(s=>s.neuronId==='DNp02')).toBe(true);
    const exit=a.act('SELL',q,market)!;expect(exit).not.toBeNull();expect(exit.pnl).toBeLessThan(0);expect(a.memory.holdings['123']).toBeUndefined();expect(a.memory.lessons).toBe(1);
  });
  it('rejects stale, future, cold, and wrong-token quotes',()=>{const a=new FlyAgent();a.prediction=.04;expect(a.act('BUY',quote(Date.now()-9000),market)).toBeNull();expect(a.act('BUY',quote(Date.now()+1),market)).toBeNull();expect(a.act('BUY',{...quote(),warm:false},market)).toBeNull();expect(a.act('BUY',{...quote(),token:'999'},market)).toBeNull();});
  it('walks asks, conserves cash and blocks duplicate execution',()=>{const a=new FlyAgent();a.prediction=.04;const q=quote();const f=a.act('BUY',q,market)!;expect(f.quantity).toBe(15);expect(f.price).toBeCloseTo((4*.5+11*.51)/15);expect(a.memory.cash+f.price*f.quantity).toBeCloseTo(100);expect(f.slippage).toBeCloseTo(.11);expect(a.act('BUY',q,market)).toBeNull();expect(new FlyAgent().memory.fills).toHaveLength(1);});
  it('never spends beyond cash or sells nonexistent inventory',()=>{const a=new FlyAgent();a.prediction=.04;a.memory.cash=1;const f=a.act('BUY',quote(),market)!;expect(f.quantity).toBe(2);expect(a.memory.cash).toBe(0);const b=new FlyAgent();expect(b.act('SELL',{...quote(),token:'other'},{...market,yesTokenId:'other'})).toBeNull();});
  it('learns only from matured same-token observations',()=>{const a=new FlyAgent();a.observe(quote());vi.advanceTimersByTime(59000);a.observe(quote());expect(a.memory.lessons).toBe(0);vi.advanceTimersByTime(1000);a.observe({...quote(),mid:.52});expect(a.memory.lessons).toBe(1);expect(a.memory.weights[0]).toBeGreaterThan(.002);});
  it('drops pending lessons on market switches',()=>{const a=new FlyAgent();a.observe(quote());vi.advanceTimersByTime(61000);a.observe({...quote(),token:'456'});expect(a.memory.lessons).toBe(0);});
});
it('sanitizes and sorts actual order-book levels',()=>{expect(levels([{price:'0.5',size:'3'},{price:'0.4',size:'2'},{price:'NaN',size:'8'},{price:'0.9',size:'-1'}])).toEqual([{price:.4,size:2},{price:.5,size:3}]);});
