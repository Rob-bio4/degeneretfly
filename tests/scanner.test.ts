import {it,expect,vi,afterEach} from 'vitest';
import {MarketScanner} from '../src/scanner';
import type {Market} from '../src/live-market';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps per-token price windows and leaves failed books unavailable',async()=>{
  vi.useFakeTimers();vi.setSystemTime(1000000);
  const scanner=new MarketScanner(()=>[{yesTokenId:'1'},{yesTokenId:'2'}] as Market[]);
  const request=vi.fn(async()=>({ok:true,json:async()=>({bids:[{price:.49,size:5}],asks:[{price:.5,size:2}]})}));vi.stubGlobal('fetch',request);
  await scanner.scan();expect(scanner.checked).toBe(2);expect(scanner.quotes.get('1')?.warm).toBe(false);
  vi.advanceTimersByTime(60000);await scanner.scan();expect(scanner.quotes.get('1')?.warm).toBe(true);expect(scanner.quotes.get('2')?.history).toHaveLength(2);
  request.mockRejectedValue(new Error('Unavailable'));await scanner.scan();expect(scanner.checked).toBe(4);expect(scanner.quotes.get('1')?.history).toHaveLength(2);
});
