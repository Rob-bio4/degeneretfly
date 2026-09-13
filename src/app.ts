import './app.css';
import './stream.css';
import { Studio } from './studio';
import { PolymarketFeed } from './live-market';
import { FlyAgent } from './agent';
import { LIFConnectome } from './connectome';
import { Streamer } from './streamer';
import { SharedLedger } from './shared-ledger';
import {MarketScanner} from './scanner';
import {broadcastLayout} from './broadcast';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const feed=new PolymarketFeed(),agent=new FlyAgent(),network=new LIFConnectome();
const shared=new SharedLedger(agent);
const scanner=new MarketScanner(()=>feed.markets);
feed.historyFor=token=>scanner.history(token);
feed.priority=m=>{const q=scanner.quotes.get(m.yesTokenId);return q&&q.warm&&Date.now()-q.timestamp<10000?Math.max(.00001,agent.forecast(q)-q.spread):0;};
scanner.onQuote=q=>{if(shared.writable){agent.observe(q,true);if(feed.quote)agent.prediction=agent.forecast(feed.quote);}};
feed.canRotate=()=>!feed.selectedMarket||!agent.memory.holdings[feed.selectedMarket.yesTokenId];
feed.resumeMarket=()=>Object.entries(agent.memory.holdings).map(([token,h])=>h.market??feed.markets.find(m=>m.yesTokenId===token)).find(Boolean);
el<HTMLSelectElement>('market').disabled=true;
const streamer=new Streamer(feed,agent);
// Voice may be enabled on the OBS view while a different browser owns execution.
streamer.canSpeak=()=>true;
const voiceButton=document.createElement('button');voiceButton.textContent='Enable Adam voice';voiceButton.className='voice-toggle';voiceButton.onclick=()=>{if(streamer.voice.enabled){streamer.mute();voiceButton.textContent='Enable Adam voice';}else{void streamer.enable();voiceButton.textContent='Mute Adam voice';}};el('pause').parentElement?.append(voiceButton);
const streamPanel=document.createElement('section');streamPanel.className='stream-panel';
const subtitle=document.createElement('p'),voiceStatus=document.createElement('span'),kickStatus=document.createElement('span'),learningStatus=document.createElement('span');
subtitle.id='fly-subtitle';subtitle.textContent='Enable Adam to hear the fly think out loud.';voiceStatus.textContent='Kokoro Adam · voice muted';kickStatus.textContent='Kick setup needed';learningStatus.id='learning-status';streamPanel.append(subtitle,voiceStatus,kickStatus,learningStatus);el('pause').parentElement?.after(streamPanel);
streamer.onLine=text=>subtitle.textContent=text;streamer.onStatus=text=>voiceStatus.textContent=text;streamer.onKick=text=>kickStatus.textContent=text;streamer.start();
let studio:Studio|null=null;
const faceCanvas=broadcastLayout(streamPanel);
const scanStatus=document.createElement('span');scanStatus.id='scan-status';streamPanel.append(scanStatus);
streamer.onWave=()=>studio?.react('wave');
try{studio=new Studio(el<HTMLCanvasElement>('studio'),el<HTMLCanvasElement>('brain'));}catch{el('anatomy-status').textContent='WebGL unavailable on this device';}
if(faceCanvas)studio?.attachFaceCamera(faceCanvas);
// Local animation QA only: never creates fills or changes learning data.
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('choreography')){
  const controls=document.createElement('div');controls.className='stream-panel';
  for(const gesture of ['win','loss','wave','groom','lean'] as const){const button=document.createElement('button');button.textContent='Preview '+gesture;button.onclick=()=>studio?.react(gesture);controls.append(button);}streamPanel.after(controls);
}
void studio?.anatomy.load().then(n=>{el('anatomy-status').textContent=`${n.regions} compartments · ${n.neurons} reconstructed neurons`;}).catch(()=>{el('anatomy-status').textContent='Anatomy unavailable · check local data assets';});
let paused=false,tab:'ledger'|'tape'='ledger',page=0,last=performance.now(),accumulator=0,lastUi=0,lastDraw=0;
let spikes:number[]=[];let marketId='';
const money=(v:number)=>v.toLocaleString('en-US',{style:'currency',currency:'USD'});
const chemistry=[['dopamine','Dopamine'],['octopamine','Octopamine'],['serotonin','Serotonin'],['acetylcholine','ACh']] as const;
for(const [key,name] of chemistry){const row=document.createElement('div');row.className='bio';const label=document.createElement('span');label.textContent=name;const track=document.createElement('div'),bar=document.createElement('i');bar.id='bar-'+key;track.append(bar);const value=document.createElement('b');value.id='bio-'+key;value.textContent='—';row.append(label,track,value);el('biology').append(row);}
function draw(){studio?.draw(feed.quote,feed.tape,agent.memory.fills,feed.selectedMarket?.question??'Connecting to Polymarket');}
feed.onStatus=status=>{el('connection').textContent=status;if(feed.selectedMarket?.id!==marketId){marketId=feed.selectedMarket?.id??'';const select=el<HTMLSelectElement>('market');select.replaceChildren(...feed.markets.map(m=>{const o=new Option(m.question,m.id);o.selected=m.id===marketId;return o;}));network.reset();page=0;history();}};
feed.onQuote=q=>{network.setSensoryFrame(q);if(shared.writable)agent.observe(q);el('bid').textContent=(q.bid*100).toFixed(2)+'¢';el('ask').textContent=(q.ask*100).toFixed(2)+'¢';el('velocity').textContent=q.warm?(q.velocity1m*100).toFixed(2)+'%':'Collecting 60s';};
feed.onTape=()=>{el('tape-count').textContent=String(feed.tape.length);if(tab==='tape')history();};
function history(){
  const rows=tab==='ledger'?[...agent.memory.fills].reverse():feed.tape;
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/12)-1));
  const head=el('table-head'),body=el('table-body');head.replaceChildren();body.replaceChildren();
  const titles=tab==='ledger'?['TIME','MARKET','ACTION','SHARES','PRICE','REALIZED P&L','TRIGGER']:['TIME','OUTCOME','SIDE','SHARES','PRICE'];
  const tr=document.createElement('tr');for(const t of titles){const th=document.createElement('th');th.textContent=t;tr.append(th);}head.append(tr);
  for(const row of rows.slice(page*12,(page+1)*12)){
    const tr=document.createElement('tr');const own='quantity' in row;
    const cells=own?[new Date(row.timestamp).toLocaleString(),row.market,row.side,row.quantity.toFixed(3),money(row.price),row.side==='SELL'?money(row.pnl):'—',row.reason]:[new Date(row.timestamp).toLocaleString(),row.outcome,row.side,row.size.toFixed(3),money(row.price)];
    cells.forEach((text,i)=>{const td=document.createElement('td');td.textContent=text;if(i===1)td.className='market-name';if(text==='BUY'||text==='SELL')td.className=text==='BUY'?'positive':'negative';tr.append(td);});body.append(tr);
  }
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=titles.length;td.className='empty';td.textContent=tab==='ledger'?'The fly is observing. Its first decision will appear here.':'Waiting for Polymarket trade reports.';tr.append(td);body.append(tr);}
  el('page').textContent=`Page ${page+1} of ${Math.max(1,Math.ceil(rows.length/12))} · ${rows.length} trades`;
  el<HTMLButtonElement>('previous').disabled=page===0;el<HTMLButtonElement>('next').disabled=(page+1)*12>=rows.length;
  el('fill-count').textContent=String(agent.memory.fills.length);el('tape-count').textContent=String(feed.tape.length);
}
el('tab-ledger').onclick=()=>{tab='ledger';page=0;el('tab-ledger').classList.add('selected');el('tab-tape').classList.remove('selected');el('history-note').textContent='Every fly fill is saved in this browser.';history();};
el('tab-tape').onclick=()=>{tab='tape';page=0;el('tab-tape').classList.add('selected');el('tab-ledger').classList.remove('selected');el('history-note').textContent='Latest 100 reports + trades received during this session.';history();};
el('previous').onclick=()=>{page--;history();};el('next').onclick=()=>{page++;history();};
el('home').onclick=()=>studio?.home();
el('pause').onclick=()=>{paused=!paused;el('pause').textContent=paused?'Resume decisions':'Pause decisions';};
el<HTMLSelectElement>('market').onchange=()=>void feed.selectMarket(el<HTMLSelectElement>('market').value);
el('export').onclick=()=>{const blob=new Blob([JSON.stringify(agent.memory,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='degeneretfly-history.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
function animate(now:number){
  const dt=Math.min(now-last,50);last=now;const q=feed.quote,fresh=q&&Date.now()-q.timestamp<8000;
  network.setDecisionDrive(fresh?agent.intent(q):{buy:false,sell:false});
  if(fresh&&!paused){accumulator+=dt;while(accumulator>=8.333){for(const spike of network.step(8.333)){
    spikes.push(now);el('region').textContent=spike.neuropil;const motor=spike.neuropil==='DN';studio?.spike(motor);
    if(shared.writable&&motor&&feed.selectedMarket&&(spike.neuronId!=='DNp01'||streamer.canTrade)){const fill=agent.act(spike.neuronId==='DNp01'?'BUY':'SELL',q,feed.selectedMarket);if(fill){history();streamer.entry(fill);if(fill.side==='SELL'&&fill.pnl!==0)studio?.react(fill.pnl>0?'win':'loss');void shared.sync();}}
  }accumulator-=8.333;}}else{accumulator=0;}
  studio?.render(dt/1000,{dopamine:agent.dopamine,octopamine:agent.octopamine,serotonin:agent.serotonin,acetylcholine:agent.acetylcholine,speaking:streamer.voice.speaking,active:!!fresh&&!paused});
  if(now-lastUi>400){lastUi=now;spikes=spikes.filter(t=>now-t<1000);el('hz').textContent=String(spikes.length);el('voltage').textContent=network.getVoltage('MBON-02').toFixed(1)+' mV';
    scanStatus.textContent=`${scanner.checked} books checked · ${feed.markets.length} discovered contracts · ${shared.writable?'primary trader':'shared-ledger viewer'}`;
    el('signal-dot').classList.toggle('live',!!fresh);el('age').textContent=q?((Date.now()-q.timestamp)/1000).toFixed(1)+'s':'—';el('history-note').textContent=tab==='ledger'?shared.status:'Public Polymarket tape';
    if(q&&!fresh)el('connection').textContent='Feed stale · waiting';el('fly-state').textContent=paused?'Taking a breather':!fresh?'Waiting for market input':agent.state;
    for(const [key] of chemistry){el('bar-'+key).style.width=(fresh?agent[key]*100:0)+'%';el('bio-'+key).textContent=fresh?String(Math.round(agent[key]*100)):'—';}
    el('equity').textContent=money(agent.equity);const pnl=agent.equity-100;el('pnl').textContent=money(pnl);el('pnl').className=pnl>=0?'positive':'negative';el('cash').textContent=money(agent.memory.cash);el('positions').textContent=String(Object.keys(agent.memory.holdings).length);el('wins').textContent=agent.wins===null?'—':Math.round(agent.wins*100)+'%';el('lessons').textContent=String(agent.memory.lessons);learningStatus.textContent=`${agent.pendingLessons} pending lessons · ${agent.nextLessonSeconds===null?'building observation window':`next score in ${agent.nextLessonSeconds}s`}`;
  }
  if(now-lastDraw>1000){draw();lastDraw=now;}
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});
window.addEventListener('beforeunload',()=>{feed.stop();streamer.stop();scanner.stop();});
let seenFills:number|null=null;
shared.onChange=()=>{history();if(seenFills!==null&&!shared.writable)for(const fill of agent.memory.fills.slice(seenFills)){streamer.entry(fill);if(fill.side==='SELL'&&fill.pnl!==0)studio?.react(fill.pnl>0?'win':'loss');}seenFills=agent.memory.fills.length;const held=feed.resumeMarket();if(shared.writable&&held&&feed.selectedMarket&&feed.selectedMarket.id!==held.id){if(!feed.markets.some(m=>m.id===held.id))feed.markets.unshift(held);void feed.selectMarket(held.id);}};
history();void shared.sync().then(async()=>{await feed.start();scanner.start();});window.setInterval(()=>void shared.sync(),2000);requestAnimationFrame(animate);
