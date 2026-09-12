/** Public market data courtesy of Polymarket Gamma, CLOB and Data APIs. */
import type { SensoryFrame, MarketDescriptor } from './types';
export interface Level {price:number;size:number}
export interface Market extends MarketDescriptor {conditionId:string;slug:string;volume?:number}
export interface Quote extends SensoryFrame {token:string;bids:Level[];asks:Level[];history:{time:number;price:number}[];warm:boolean}
export interface Tape {id:string;timestamp:number;price:number;size:number;side:string;outcome:string}
export function levels(input:unknown,desc=false):Level[]{
  if(!Array.isArray(input))return [];
  return input.map(x=>({price:Number(x.price),size:Number(x.size)})).filter(x=>Number.isFinite(x.price)&&Number.isFinite(x.size)&&x.price>0&&x.price<1&&x.size>0).sort((a,b)=>desc?b.price-a.price:a.price-b.price);
}
const array=(v:unknown):string[]=>{try{const a=typeof v==='string'?JSON.parse(v):v;return Array.isArray(a)?a.map(String):[];}catch{return[];}};
const get=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(14000),cache:'no-store'});if(!r.ok)throw new Error(`Feed ${r.status}`);return r.json();};
export class PolymarketFeed {
  markets:Market[]=[];selectedMarket:Market|null=null;quote:Quote|null=null;tape:Tape[]=[];
  onQuote:((q:Quote)=>void)|null=null;onStatus:((s:string)=>void)|null=null;onTape:(()=>void)|null=null;
  private socket:WebSocket|null=null;private generation=0;private history:{time:number;price:number}[]=[];private heartbeat=0;private timer=0;private rotation=0;private selectedIndex=0;
  async start(){
    this.onStatus?.('Connecting to Polymarket');
    try{
      const events=await get('/api/events');const all:Market[]=[];
      for(const event of events){for(const m of event.markets??[]){
        if(!m.active||m.closed||m.enableOrderBook===false||m.acceptingOrders===false)continue;
        const outcomes=array(m.outcomes),ids=array(m.clobTokenIds),i=outcomes.findIndex(x=>x.toLowerCase()==='yes');if(i<0||!ids[i])continue;
        const probability=Number(array(m.outcomePrices)[i]);
        if(!Number.isFinite(probability)||probability<=.04||probability>=.96)continue;
        all.push({id:String(m.id),question:m.question,yesTokenId:ids[i]!,conditionId:m.conditionId,slug:m.slug,liquidity:Number(m.liquidityNum??m.liquidity??0),volume:Number(m.volume24hr??0)});
      }}
      this.markets=[...new Map(all.map(m=>[m.id,m])).values()].sort((a,b)=>(b.volume??0)-(a.volume??0));
      for(const [index,m] of this.markets.slice(0,80).entries()){
          try{const book=await get('/api/book?token_id='+m.yesTokenId);const b=levels(book.bids,true)[0],a=levels(book.asks)[0];if(b&&a&&a.price>=b.price&&b.price>.03&&a.price<.97){this.selectedIndex=index;await this.selectMarket(m.id);return;}}catch{/* Inspect next available market. */}
      }
      this.onStatus?.('Waiting for a tradable order book');
    }catch{this.onStatus?.('Connection interrupted · retrying');}
    this.timer=window.setTimeout(()=>void this.start(),15000);
  }
  async selectMarket(id:string){
    const m=this.markets.find(x=>x.id===id);if(!m)return;
    const generation=++this.generation;this.socket?.close();clearTimeout(this.timer);clearInterval(this.heartbeat);
    clearTimeout(this.rotation);
    this.quote=null;this.history=[];this.tape=[];this.selectedMarket=m;this.onStatus?.('Connecting · '+m.question);
    let lastTape=0;
    const refresh=async()=>{
      if(generation!==this.generation)return;
      try{const book=await get('/api/book?token_id='+m.yesTokenId);if(generation!==this.generation)return;this.accept(book);}
      catch{if(generation===this.generation)this.onStatus?.('Connection interrupted · orders paused');}
      if(generation===this.generation&&Date.now()-lastTape>10000){lastTape=Date.now();void get('/api/trades?market='+m.conditionId).then(rows=>{
        if(generation!==this.generation||!Array.isArray(rows))return;
        for(const row of rows)this.addTape({id:`${row.transactionHash}:${row.asset}:${row.side}:${row.size}`,timestamp:Number(row.timestamp)*1000,price:Number(row.price),size:Number(row.size),side:String(row.side),outcome:String(row.outcome)});
      }).catch(()=>{});}
      if(generation===this.generation)this.timer=window.setTimeout(refresh,3000);
    };
    void refresh();
    void get('/api/trades?market='+m.conditionId).then(rows=>{
      if(generation!==this.generation||!Array.isArray(rows))return;
      for(const row of rows)this.addTape({id:`${row.transactionHash}:${row.asset}:${row.side}:${row.size}`,timestamp:Number(row.timestamp)*1000,price:Number(row.price),size:Number(row.size),side:String(row.side),outcome:String(row.outcome)});
    }).catch(()=>{});
    const ws=new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');this.socket=ws;
    ws.onopen=()=>{if(generation!==this.generation)return ws.close();ws.send(JSON.stringify({assets_ids:[m.yesTokenId],type:'market'}));this.heartbeat=window.setInterval(()=>{if(ws.readyState===1)ws.send('PING');},10000);};
    ws.onmessage=e=>{if(generation!==this.generation||e.data==='PONG')return;try{
      const parsed=JSON.parse(e.data);for(const msg of Array.isArray(parsed)?parsed:[parsed]){
        // Trade history uses Data API transaction IDs exclusively to avoid
        // counting the same fill twice across websocket and REST delivery.
        if(msg.event_type==='book'&&msg.asset_id===m.yesTokenId)this.accept(msg);
      }
    }catch{/* Ignore non-data keepalive messages. */}};
    ws.onclose=()=>{if(generation===this.generation)clearInterval(this.heartbeat);};
    ws.onerror=()=>ws.close();
    this.rotation=window.setTimeout(()=>this.rotate(),90000);
  }
  private rotate(){
    if(this.markets.length<2)return;
    const next=(this.selectedIndex+1)%this.markets.length;const candidate=this.markets[next];
    if(candidate){this.selectedIndex=next;void this.selectMarket(candidate.id);}
  }
  private addTape(row:Tape){if(!Number.isFinite(row.price)||!Number.isFinite(row.size)||!Number.isFinite(row.timestamp)||this.tape.some(x=>x.id===row.id))return;this.tape.push(row);this.tape.sort((a,b)=>b.timestamp-a.timestamp);this.onTape?.();}
  private accept(book:{bids:unknown;asks:unknown}){
    const bids=levels(book.bids,true),asks=levels(book.asks);if(!bids[0]||!asks[0]||bids[0].price>asks[0].price){this.onStatus?.('Waiting for order book liquidity');this.quote=null;return;}
    const time=Date.now(),bid=bids[0].price,ask=asks[0].price,mid=(bid+ask)/2,spread=ask-bid;
    const previous=this.history.filter(x=>x.time<=time-60000).at(-1);
    if(!this.history.length||time-this.history.at(-1)!.time>800)this.history.push({time,price:mid});
    this.history=this.history.filter(x=>x.time>time-600000);
    const b=bids.slice(0,5).reduce((s,x)=>s+x.size,0),a=asks.slice(0,5).reduce((s,x)=>s+x.size,0);
    const quote:Quote={token:this.selectedMarket!.yesTokenId,bids,asks,history:[...this.history],warm:!!previous,imbalance:(b-a)/(b+a),velocity1m:previous?(mid-previous.price)/previous.price:0,spreadCompression:this.quote?this.quote.spread-spread:0,bid,ask,spread,mid,timestamp:time,isLive:true};
    this.quote=quote;this.onStatus?.('Live · Polymarket');this.onQuote?.(quote);
  }
  stop(){this.generation++;this.socket?.close();clearTimeout(this.timer);clearInterval(this.heartbeat);}
}
