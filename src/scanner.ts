import {levels,type Market,type Quote} from './live-market';
export class MarketScanner {
  quotes=new Map<string,Quote>();checked=0;private cursor=0;private busy=false;private timer=0;
  onQuote:(q:Quote)=>void=()=>{};
  constructor(private markets:()=>Market[]){}
  start(){this.timer=window.setInterval(()=>void this.scan(),2000);void this.scan();}
  stop(){clearInterval(this.timer);}
  history(token:string){return this.quotes.get(token)?.history??[];}
  async scan(){
    if(this.busy)return;this.busy=true;
    try{const all=this.markets();if(!all.length)return;
      // A rolling 24-contract watchlist; six genuine books per batch.
      const page=Math.floor(Date.now()/240000)*24%all.length;
      const batch=Array.from({length:Math.min(6,all.length)},(_,i)=>all[(page+(this.cursor+i)%Math.min(24,all.length))%all.length]!);this.cursor=(this.cursor+6)%24;
      await Promise.all(batch.map(async m=>{try{
        const r=await fetch('/api/book?token_id='+m.yesTokenId,{signal:AbortSignal.timeout(6000)});if(!r.ok)return;
        const book=await r.json(),bids=levels(book.bids,true),asks=levels(book.asks);if(!bids[0]||!asks[0]||bids[0].price>asks[0].price)return;
        const time=Date.now(),old=this.quotes.get(m.yesTokenId),bid=bids[0].price,ask=asks[0].price,mid=(bid+ask)/2,spread=ask-bid;
        const history=[...(old?.history??[]).filter(p=>time-p.time<180000),{time,price:mid}];
        const past=history.filter(p=>p.time<=time-60000&&p.time>=time-75000).at(-1);
        const b=bids.slice(0,5).reduce((s,l)=>s+l.size,0),a=asks.slice(0,5).reduce((s,l)=>s+l.size,0);
        const q:Quote={token:m.yesTokenId,bids,asks,bid,ask,mid,spread,history,timestamp:time,warm:!!past,velocity1m:past?(mid-past.price)/past.price:0,spreadCompression:old?old.spread-spread:0,imbalance:(b-a)/(b+a),isLive:true};
        this.quotes.set(q.token,q);this.checked++;this.onQuote(q);
      }catch{/* A failed book is unavailable, never replaced. */}}));
    }finally{this.busy=false;}
  }
}
