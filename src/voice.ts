export class FlyVoice {
  enabled=false;speaking=false;onSpeaking:(active:boolean)=>void=()=>{};
  private stopPlayback:(()=>void)|null=null;private controller:AbortController|null=null;private context:AudioContext|null=null;
  async enable(){this.enabled=true;this.context??=new AudioContext();await this.context.resume();}
  mute(){this.enabled=false;this.controller?.abort();this.stopPlayback?.();this.speaking=false;this.onSpeaking(false);}
  async speak(text:string){
    if(!this.enabled)throw new Error('Voice is muted');
    this.controller=new AbortController();
    const response=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,700)}),signal:this.controller.signal});
    if(!response.ok)throw new Error('Kokoro unavailable. Check model status.');
    const bytes=await response.arrayBuffer();if(!this.enabled)throw new Error('Voice is muted');
    // Web Audio is unlocked by the enable-button gesture, including in OBS.
    const buffer=await this.context!.decodeAudioData(bytes);const source=this.context!.createBufferSource();source.buffer=buffer;source.connect(this.context!.destination);
    await new Promise<void>((resolve,reject)=>{
      let stopped=false;this.stopPlayback=()=>{stopped=true;source.stop();reject(new Error('Voice is muted'));};
      source.onended=()=>{this.stopPlayback=null;this.speaking=false;this.onSpeaking(false);if(!stopped)resolve();};
      this.speaking=true;this.onSpeaking(true);source.start();
    });
  }
}
