import type { Quote, Market } from './live-market';
export interface Fill {id:number;timestamp:number;market:string;token:string;side:'BUY'|'SELL';quantity:number;price:number;pnl:number;slippage:number;reason:string}
export interface Holding {quantity:number;cost:number;mark:number;name:string;openedAt?:number}
export interface Memory {weights:number[];lessons:number;error:number;correct:number;cash:number;holdings:Record<string,Holding>;fills:Fill[]}
const KEY='degeneretfly.ledger.v2';
export const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
export class FlyAgent {
  memory:Memory={weights:[0.002,0.002,0.001],lessons:0,error:0,correct:0,cash:100,holdings:{},fills:[]};
  private pending:{time:number;token:string;mid:number;x:number[];prediction:number}[]=[];
  private lastLesson=0;private lastFill=0;private consumedQuote=0;
  storageHealthy=true;prediction=0;dopamine=0;octopamine=0;serotonin=0;acetylcholine=0;state='Observing';
  get pendingLessons(){return this.pending.length;}
  get nextLessonSeconds(){return this.pending.length?Math.max(0,Math.ceil((this.pending[0]!.time+60000-Date.now())/1000)):null;}
  intent(q:Quote,now=Date.now()){
    const holding=this.memory.holdings[q.token];
    const learned=this.prediction>q.spread+.0005;
    const explore=!holding&&q.imbalance>.30&&q.spread<=.015&&now-this.lastFill>=60000;
    const exit=!!holding&&(this.prediction< -q.spread-.0005||q.bid<holding.cost*.95||q.bid>holding.cost*1.04||now-(holding.openedAt??now)>=60000);
    return {buy:(learned||explore)&&!holding&&this.memory.cash>=1,sell:exit,explore:!learned&&explore};
  }
  constructor(){try{const raw=localStorage.getItem(KEY);if(raw){const m=JSON.parse(raw);if(Array.isArray(m.weights)&&m.weights.length===3&&m.weights.every(Number.isFinite)&&Number.isFinite(m.cash)&&m.cash>=0&&Array.isArray(m.fills)&&m.holdings){this.memory=m;this.lastFill=m.fills.at(-1)?.timestamp??0;}}}catch{this.storageHealthy=false;}}
  private features(q:Quote){return [q.imbalance,clamp(q.velocity1m*30,-1,1),clamp(q.spreadCompression*100,-1,1)];}
  observe(q:Quote){
    const now=Date.now();const x=this.features(q);
    if(now-q.timestamp>8000||now<q.timestamp)return;
    for(const lesson of this.pending.filter(p=>p.token===q.token&&now-p.time>=60000&&now-p.time<=75000)){
      const actual=q.mid-lesson.mid,error=actual-lesson.prediction;
      this.memory.weights=this.memory.weights.map((w,i)=>clamp(w+.08*error*lesson.x[i]!,-.04,.04));
      this.memory.lessons++;this.memory.correct+=Number(Math.sign(actual)===Math.sign(lesson.prediction)&&actual!==0);
      this.memory.error+=(Math.abs(error)-this.memory.error)/this.memory.lessons;
      this.dopamine=clamp(.5+error*25);
    }
    this.pending=this.pending.filter(p=>p.token===q.token&&now-p.time<60000);
    this.prediction=x.reduce((s,v,i)=>s+v*this.memory.weights[i]!,0);
    if(q.warm&&now-this.lastLesson>10000){this.pending.push({time:now,token:q.token,mid:q.mid,x,prediction:this.prediction});this.lastLesson=now;}
    const holding=this.memory.holdings[q.token];if(holding)holding.mark=q.bid;
    this.octopamine=clamp(Math.abs(q.velocity1m)*12+q.spread*8);
    this.acetylcholine=clamp(Math.abs(q.imbalance)*.7+Math.abs(q.velocity1m)*8);
    this.serotonin=1-clamp(Math.abs(this.prediction)*15+this.octopamine*.4);
    this.state=!q.warm?'Building a minute of memory':this.octopamine>.7?'Watching volatility':Math.abs(this.prediction)>q.spread?'Evaluating an edge':'Waiting for an edge';
    this.save();
  }
  act(side:'BUY'|'SELL',q:Quote,market:Market,now=Date.now()):Fill|null{
    if(q.token!==market.yesTokenId||!q.warm||now<q.timestamp||now-q.timestamp>8000||now-this.lastFill<7000||this.consumedQuote===q.timestamp||!this.storageHealthy)return null;
    const h=this.memory.holdings[q.token];
    // Learned edge must cover a full spread and an extra execution-cost buffer.
    const {buy,sell,explore}=this.intent(q,now);
    if((side==='BUY'&&!buy)||(side==='SELL'&&!sell))return null;
    const book=side==='BUY'?q.asks:q.bids;
    const budget=Math.min(this.memory.cash,explore?2:8);
    let remaining=side==='BUY'?Math.min(15,budget/q.ask):Math.min(h?.quantity??0,15),qty=0,value=0;
    for(const level of book){if(remaining<=1e-8)break;const affordable=side==='BUY'?Math.max(0,(budget-value)/level.price):Infinity;const take=Math.min(remaining,level.size,affordable);qty+=take;value+=take*level.price;remaining-=take;}
    if(qty<1)return null;
    const price=value/qty,pnl=side==='SELL'?(price-(h?.cost??price))*qty:0;
    if(side==='BUY'){
      const old=h?.quantity??0;this.memory.holdings[q.token]={quantity:old+qty,cost:((h?.cost??0)*old+value)/(old+qty),mark:q.bid,name:market.question,openedAt:h?.openedAt??now};this.memory.cash-=value;
    }else{this.memory.cash+=value;h!.quantity-=qty;if(h!.quantity<1e-6)delete this.memory.holdings[q.token];}
    const fill:Fill={id:this.memory.fills.length+1,timestamp:now,market:market.question,token:q.token,side,quantity:qty,price,pnl,slippage:Math.abs(price-(side==='BUY'?q.ask:q.bid))*qty,reason:side==='BUY'?(explore?'DNp01 → $2 pressure exploration; sixty-second observation':'MB output → DNp01; learned edge clears spread'):'DNp02 → risk / sixty-second evaluation exit'};
    this.memory.fills.push(fill);this.lastFill=now;this.consumedQuote=q.timestamp;this.dopamine=clamp(.5+pnl/2);this.save();return fill;
  }
  get equity(){return this.memory.cash+Object.values(this.memory.holdings).reduce((s,h)=>s+h.quantity*h.mark,0);}
  get wins(){const closed=this.memory.fills.filter(f=>f.side==='SELL');return closed.length?closed.filter(f=>f.pnl>0).length/closed.length:null;}
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.memory));this.storageHealthy=true;}catch{this.storageHealthy=false;this.state='Storage full · decisions paused';}}
}
