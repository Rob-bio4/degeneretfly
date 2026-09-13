import {FlyVoice} from './voice';
import type {Fill,FlyAgent} from './agent';
import type {PolymarketFeed} from './live-market';
export interface ChatTurn {sequence:number;id:string;username:string;content:string}
type Turn={kind:'trade'|'chat'|'idle';text?:string;chat?:ChatTurn};
export class Streamer {
  voice=new FlyVoice();private trades:Turn[]=[];private chats:Turn[]=[];private busy=false;private lastTalk=0;private lastLessons:number;private idleIndex=0;private cursor=0;private polling=false;private timer=0;
  onLine:(text:string)=>void=()=>{};onStatus:(text:string)=>void=()=>{};onKick:(text:string)=>void=()=>{};
  constructor(private feed:PolymarketFeed,private agent:FlyAgent){this.lastLessons=agent.memory.lessons;}
  get backlog(){return this.trades.length+this.chats.length;}
  get canTrade(){return this.trades.length<12;}
  async enable(){await this.voice.enable();this.onStatus('Adam is warming up…');void fetch('/api/models',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>{if(!r.ok)throw new Error();this.onStatus('Qwen + Adam ready');void this.pump();}).catch(()=>this.onStatus('Model unavailable · run npm run setup:models'));}
  mute(){this.voice.mute();this.onStatus('Voice muted');}
  start(){this.timer=window.setInterval(()=>{void this.poll();void this.pump();},2000);void this.poll();}
  stop(){clearInterval(this.timer);this.voice.mute();}
  entry(fill:Fill){
    const outcome=fill.side==='BUY'?'Entry locked, chat':fill.pnl>=0?'Exit filled. Banked a W':'Exit filled. Took the L';
    const text=`${outcome}. ${fill.side==='BUY'?'Bought':'Sold'} ${fill.quantity.toFixed(1)} YES shares in ${fill.market}, at ${(fill.price*100).toFixed(1)} cents.${fill.side==='SELL'?` Realized ${fill.pnl<0?'minus ':''}${Math.abs(fill.pnl).toFixed(2)} dollars.`:''}`;
    this.trades.push({kind:'trade',text});this.onLine(text);void this.pump();
  }
  receive(chat:ChatTurn){if(this.chats.length>=100){this.onKick('Chat backlog full · waiting');return false;}this.chats.push({kind:'chat',chat});return true;}
  private async poll(){
    if(this.polling)return;this.polling=true;
    try{const r=await fetch('/api/kick/messages?after='+this.cursor);if(!r.ok)throw new Error();const data=await r.json();
      if(data.latest<this.cursor)this.cursor=0;
      for(const message of data.messages){if(!this.receive(message))break;this.cursor=message.sequence;}
      this.onKick(!data.configured?'Kick setup needed':!data.lastMessage?'Kick ready · waiting for messages':data.gap?'Kick reconnected · some older messages expired':`Kick received chat · ${this.chats.length} replies waiting`);
    }catch{this.onKick('Kick bridge reconnecting');}finally{this.polling=false;}
  }
  private state(){const q=this.feed.quote;return {market:this.feed.selectedMarket?.question,quoteFresh:!!q&&Date.now()-q.timestamp<8000,bid:q?.bid,ask:q?.ask,learning:{completed:this.agent.memory.lessons,pending:this.agent.pendingLessons,error:this.agent.memory.error},mood:{dopamine:this.agent.dopamine,octopamine:this.agent.octopamine,serotonin:this.agent.serotonin,acetylcholine:this.agent.acetylcholine},state:this.agent.state,ledger:{cash:this.agent.memory.cash,equity:this.agent.equity,fillCount:this.agent.memory.fills.length}};}
  private idle(){
    const a=this.agent,q=this.feed.quote;const n=this.idleIndex++;
    if(!q||Date.now()-q.timestamp>8000)return 'Chat, the feed is taking a breather. Waiting for a fresh book before moving these diamond hands.';
    if(a.memory.lessons>this.lastLessons){const count=a.memory.lessons-this.lastLessons;this.lastLessons=a.memory.lessons;return `Chat, ${count} new ${count===1?'lesson':'lessons'} scored. ${a.memory.lessons} total. I compared my prediction with the later price and adjusted my weights. Tiny brain, doing the homework.`;}
    if(!q.warm)return `Scoping ${this.feed.selectedMarket?.question}. Building a full minute of price memory. Can't speedrun the homework, ser.`;
    const lines=[`The next prediction check is ${a.nextLessonSeconds??60} seconds away. ${a.pendingLessons} lessons in flight. We learn from what actually happens next.`,
      `Bid ${(q.bid*100).toFixed(1)}, ask ${(q.ask*100).toFixed(1)} cents. ${q.imbalance>0?'More size on the bid side':'More size on the ask side'}. Watching whether that pressure sticks, chat.`,
      `${a.octopamine>.5?'Feeling twitchy. This spread and price movement have my wings going':'Steady wings, chat. Staying patient'}. ${a.state}.`,
      `My next-minute estimate is ${Math.abs(a.prediction*100).toFixed(2)} cents ${a.prediction>=0?'up':'down'}. The spread is ${(q.spread*100).toFixed(2)} cents. ${Math.abs(a.prediction)>q.spread?'Checking execution conditions':'That spread needs paying before I get excited'}.`,
      `Ledger check, chat. ${a.memory.cash.toFixed(2)} dollars cash, ${Object.keys(a.memory.holdings).length} open positions. The chain stays heavy. The sizing stays small.`];return lines[n%lines.length]!;
  }
  async pump(){
    if(this.busy||!this.voice.enabled)return;
    const turn=this.trades.shift()??this.chats.shift()??(Date.now()-this.lastTalk>5000?{kind:'idle' as const,text:this.idle()}:null);if(!turn)return;
    this.busy=true;
    try{
      let text=turn.text;
      if(turn.chat&&!text){this.onStatus(`Replying to ${turn.chat.username}…`);const r=await fetch('/api/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...turn.chat,context:this.state()}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw new Error('Qwen reply failed');text=`${turn.chat.username}, ${(await r.json()).text}`;turn.text=text;}
      this.onLine(text!);this.onStatus(`Adam speaking · ${this.backlog} queued`);await this.voice.speak(text!);this.lastTalk=Date.now();
    }catch(error){
      if(turn.kind==='trade')this.trades.unshift(turn);else if(turn.kind==='chat')this.chats.unshift(turn);
      this.lastTalk=Date.now();this.onStatus(this.voice.enabled?`Voice paused: ${String((error as Error).message)}`:'Voice muted');
    }finally{this.busy=false;}
  }
}
