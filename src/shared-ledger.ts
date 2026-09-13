import type {FlyAgent} from './agent';
export class SharedLedger {
  private client=crypto.randomUUID();private revision=-1;private expires=0;private busy=false;private owner=false;
  status='Connecting to local ledger';onChange=()=>{};
  constructor(private agent:FlyAgent){agent.sharedStorage=true;}
  get writable(){return this.owner&&Date.now()<this.expires-2000;}
  async sync(){
    if(this.busy)return;this.busy=true;
    try{
      const r=await fetch('/api/ledger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:this.client,revision:this.revision,memory:this.agent.memory}),signal:AbortSignal.timeout(7000)});
      if(!r.ok)throw new Error('Local save failed');const data=await r.json();
      if(!this.owner||!data.writable||!this.writable)this.agent.restore(data.memory);
      this.revision=data.revision;this.expires=data.expires;this.owner=data.writable;
      this.status=this.writable?'Local ledger saved · primary desk':'Shared ledger · another browser is driving';this.onChange();
    }catch{this.owner=false;this.status='Local storage unavailable · decisions paused';}finally{this.busy=false;}
  }
}
