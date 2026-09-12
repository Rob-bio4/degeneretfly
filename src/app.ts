import './app.css';
import { Studio } from './studio';
import { PolymarketFeed } from './live-market';
import { FlyAgent } from './agent';
import { LIFConnectome } from './connectome';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const feed=new PolymarketFeed(),agent=new FlyAgent(),network=new LIFConnectome();
el<HTMLSelectElement>('market').disabled=true;
let voiceEnabled=false,lastVoice=0;
const voiceButton=document.createElement('button');voiceButton.textContent='Enable fly voice';voiceButton.className='voice-toggle';voiceButton.onclick=()=>{voiceEnabled=!voiceEnabled;voiceButton.textContent=voiceEnabled?'Mute fly voice':'Enable fly voice';if(!voiceEnabled)speechSynthesis.cancel();};el('pause').parentElement?.append(voiceButton);
function flySays(text:string){if(!voiceEnabled||!('speechSynthesis' in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.08;u.pitch=.78;u.volume=.82;speechSynthesis.speak(u);}
let studio:Studio|null=null;
try{studio=new Studio(el<HTMLCanvasElement>('studio'),el<HTMLCanvasElement>('brain'));}catch{el('anatomy-status').textContent='WebGL unavailable on this device';}
void studio?.anatomy.load().then(n=>{el('anatomy-status').textContent=`${n.regions} compartments · ${n.neurons} reconstructed neurons`;}).catch(()=>{el('anatomy-status').textContent='Anatomy unavailable · check local data assets';});
let paused=false,tab:'ledger'|'tape'='ledger',page=0,last=performance.now(),accumulator=0,lastUi=0,lastDraw=0;
let spikes:number[]=[];let marketId='';
const money=(v:number)=>v.toLocaleString('en-US',{style:'currency',currency:'USD'});
const chemistry=[['dopamine','Dopamine'],['octopamine','Octopamine'],['serotonin','Serotonin'],['acetylcholine','ACh']] as const;
for(const [key,name] of chemistry){const row=document.createElement('div');row.className='bio';const label=document.createElement('span');label.textContent=name;const track=document.createElement('div'),bar=document.createElement('i');bar.id='bar-'+key;track.append(bar);const value=document.createElement('b');value.id='bio-'+key;value.textContent='—';row.append(label,track,value);el('biology').append(row);}
function draw(){studio?.draw(feed.quote,feed.tape,agent.memory.fills,feed.selectedMarket?.question??'Connecting to Polymarket');}
feed.onStatus=status=>{el('connection').textContent=status;if(feed.selectedMarket?.id!==marketId){marketId=feed.selectedMarket?.id??'';const select=el<HTMLSelectElement>('market');select.replaceChildren(...feed.markets.map(m=>{const o=new Option(m.question,m.id);o.selected=m.id===marketId;return o;}));network.reset();page=0;history();}};
feed.onQuote=q=>{network.setSensoryFrame(q);agent.observe(q);el('bid').textContent=(q.bid*100).toFixed(2)+'¢';el('ask').textContent=(q.ask*100).toFixed(2)+'¢';el('velocity').textContent=q.warm?(q.velocity1m*100).toFixed(2)+'%':'Collecting 60s';if(q.warm&&Date.now()-lastVoice>18000){lastVoice=Date.now();const mood=agent.octopamine>.6?'volatility is spicy':'order flow looks interesting';flySays(`Yo chat, ${mood}. Bid ${(q.bid*100).toFixed(0)} cents, ask ${(q.ask*100).toFixed(0)}. I am watching the tape.`);}};
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
  if(fresh&&!paused){accumulator+=dt;while(accumulator>=8.333){for(const spike of network.step(8.333)){
    spikes.push(now);el('region').textContent=spike.neuropil;const motor=spike.neuropil==='DN';studio?.spike(motor);
    if(motor&&feed.selectedMarket){const fill=agent.act(spike.neuronId==='DNp01'?'BUY':'SELL',q,feed.selectedMarket);if(fill){history();flySays(`${fill.side==='BUY'?'Aped in':'Took profit'} ${fill.quantity.toFixed(1)} shares at ${(fill.price*100).toFixed(0)} cents. The neurons called it.`);}}
  }accumulator-=8.333;}}else{accumulator=0;}
  studio?.render(dt/1000);
  if(now-lastUi>400){lastUi=now;spikes=spikes.filter(t=>now-t<1000);el('hz').textContent=String(spikes.length);el('voltage').textContent=network.getVoltage('MBON-02').toFixed(1)+' mV';
    el('signal-dot').classList.toggle('live',!!fresh);el('age').textContent=q?((Date.now()-q.timestamp)/1000).toFixed(1)+'s':'—';
    if(q&&!fresh)el('connection').textContent='Feed stale · waiting';el('fly-state').textContent=paused?'Taking a breather':!fresh?'Waiting for market input':agent.state;
    for(const [key] of chemistry){el('bar-'+key).style.width=(fresh?agent[key]*100:0)+'%';el('bio-'+key).textContent=fresh?String(Math.round(agent[key]*100)):'—';}
    el('equity').textContent=money(agent.equity);const pnl=agent.equity-100;el('pnl').textContent=money(pnl);el('pnl').className=pnl>=0?'positive':'negative';el('cash').textContent=money(agent.memory.cash);el('positions').textContent=String(Object.keys(agent.memory.holdings).length);el('wins').textContent=agent.wins===null?'—':Math.round(agent.wins*100)+'%';el('lessons').textContent=String(agent.memory.lessons);
  }
  if(now-lastDraw>1000){draw();lastDraw=now;}
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});
window.addEventListener('beforeunload',()=>feed.stop());
history();void feed.start();requestAnimationFrame(animate);
