import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeFly } from './character';
import { Anatomy } from './anatomy';
import type { Quote,Tape } from './live-market';
import type { Fill } from './agent';
export class Studio {
  private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(35,1,.1,100);
  private controls:OrbitControls;private fly=makeFly();private screen:T.CanvasTexture;private ctx:CanvasRenderingContext2D;
  private brainRenderer:T.WebGLRenderer;private brainScene=new T.Scene();private brainCamera=new T.PerspectiveCamera(34,1,.01,50);
  anatomy=new Anatomy();private clock=0;private glow=new T.PointLight(0xb8a1ff,0,4);private kick=0;
  constructor(private canvas:HTMLCanvasElement,private brainCanvas:HTMLCanvasElement){
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.45;
    this.scene.background=new T.Color(0x14171b);this.scene.fog=new T.Fog(0x14171b,13,27);
    this.camera.position.set(6.1,4.5,8.9);this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,1.2,0);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minDistance=4;this.controls.maxDistance=16;
    this.scene.add(new T.HemisphereLight(0xcbe7ff,0x5c4934,2.8));
    const light=(color:number,power:number,pos:number[])=>{const l=new T.SpotLight(color,power,25,Math.PI/4,.5,1.5);l.position.set(pos[0]!,pos[1]!,pos[2]!);l.castShadow=true;l.shadow.mapSize.set(2048,2048);l.shadow.bias=-.00015;this.scene.add(l);return l;};
    light(0xffe1b8,130,[-3,7,4]);light(0x92b6ff,75,[5,5,-3]);light(0xf2a1d0,30,[-5,3,-2]);
    const wood=new T.MeshStandardMaterial({color:0x684a35,roughness:.55,metalness:.06});
    wood.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= .92+.08*sin(vViewPosition.x*85.+sin(vViewPosition.z*20.)*3.);');};
    const metal=new T.MeshStandardMaterial({color:0x171c20,roughness:.34,metalness:.72});
    const box=(w:number,h:number,d:number,mat:T.Material,x:number,y:number,z:number)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;};
    box(40,.1,40,new T.MeshStandardMaterial({color:0x1c2026,roughness:.94}),0,-.12,0);
    box(4.2,.14,1.85,wood,.25,1.29,-.3);
    for(const x of [-1.65,2.15])for(const z of [-1.02,.42])box(.07,1.26,.07,metal,x,.58,z);
    // Padded operator chair: seat, back, arm rests and a five-star base.
    const chair=new T.MeshStandardMaterial({color:0x242a35,roughness:.48,metalness:.25});
    box(.92,.16,.82,chair,-.92,.92,.55);box(.82,1.05,.16,chair,-.92,1.43,.86);
    for(const side of [-1,1]){box(.08,.36,.08,metal,-.92+side*.46,1.13,.55);box(.38,.07,.08,chair,-.92+side*.27,1.32,.55);}
    box(.10,.78,.10,metal,-.92,.45,.55);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(.06,.06,.48,metal,-.92+Math.sin(a)*.22,.08,.55+Math.cos(a)*.22);}
    // A monitor with a real, continuously refreshed data texture.
    box(2.40,1.48,.10,metal,.83,2.25,-.67);box(.12,.42,.10,metal,.83,1.57,-.69);box(.70,.055,.35,metal,.83,1.39,-.66);
    const offscreen=document.createElement('canvas');offscreen.width=1280;offscreen.height=768;this.ctx=offscreen.getContext('2d')!;
    this.screen=new T.CanvasTexture(offscreen);this.screen.colorSpace=T.SRGBColorSpace;
    const display=new T.Mesh(new T.PlaneGeometry(2.29,1.37),new T.MeshBasicMaterial({map:this.screen,toneMapped:false}));display.position.set(.83,2.25,-.608);this.scene.add(display);
    const monitorLight=new T.PointLight(0xafbfff,3,3);monitorLight.position.set(.4,2,-.2);this.scene.add(monitorLight);
    const keyboard=box(1.15,.05,.4,metal,.65,1.4,.15);keyboard.rotation.y=-.1;
    const keyMat=new T.MeshStandardMaterial({color:0x4a5058,roughness:.5});
    for(let r=0;r<4;r++)for(let c=0;c<14;c++)box(.056,.027,.060,keyMat,.15+c*.072,1.441,.018+r*.08);
    box(1.5,.008,.65,new T.MeshStandardMaterial({color:0x202530,roughness:.9}),.95,1.367,.12);
    const mouse=new T.Mesh(new T.SphereGeometry(.12,20,12),metal);mouse.scale.set(.7,.4,1.25);mouse.position.set(1.57,1.43,.14);this.scene.add(mouse);
    // Desk details: workstation, headphones, and warm task lamp.
    box(.45,.75,.72,metal,1.9,.32,-.5);
    for(let i=0;i<5;i++)box(.012,.015,.35,new T.MeshBasicMaterial({color:0xbca4ff}),1.68,.5+i*.07,-.48);
    const cup=new T.Mesh(new T.CylinderGeometry(.105,.08,.20,24),new T.MeshStandardMaterial({color:0xc7b395,roughness:.7}));cup.position.set(1.89,1.47,.03);this.scene.add(cup);
    box(.035,.85,.035,metal,-1.55,1.78,-.89);box(.42,.04,.18,metal,-1.38,2.22,-.89);
    const deskLight=new T.PointLight(0xffcc80,3,2);deskLight.position.set(-1.4,2.15,-.82);this.scene.add(deskLight);
    // Character is a fully volumetric mesh with jewelry and translucent wings.
    this.fly.group.position.set(-1.08,.02,1.1);this.fly.group.rotation.y=2.32;this.fly.group.scale.setScalar(.92);this.scene.add(this.fly.group);
    this.glow.position.set(-1,2.2,1.35);this.scene.add(this.glow);
    this.brainRenderer=new T.WebGLRenderer({canvas:brainCanvas,antialias:true,alpha:true});this.brainRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.brainCamera.position.set(0,.1,6.1);this.brainScene.add(this.anatomy.group);this.anatomy.group.position.y=.08;
    const brainControls=new OrbitControls(this.brainCamera,brainCanvas);brainControls.enableZoom=false;brainControls.enablePan=false;brainControls.autoRotate=false;
    new ResizeObserver(()=>this.resize()).observe(canvas.parentElement!);new ResizeObserver(()=>this.resize()).observe(brainCanvas.parentElement!);
    this.resize();this.draw(null,[],[],'Connecting to Polymarket');
  }
  private resize(){for(const [canvas,renderer,camera] of [[this.canvas,this.renderer,this.camera],[this.brainCanvas,this.brainRenderer,this.brainCamera]] as const){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)continue;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
  render(dt:number){this.clock+=dt;this.controls.update();this.fly.group.position.y=.02+Math.sin(this.clock*1.7)*.012;this.fly.group.rotation.z=Math.sin(this.clock*.55)*.012;this.fly.group.rotation.x=Math.sin(this.clock*.42)*.008;this.kick=Math.max(0,this.kick-dt*2);this.fly.head.rotation.z=Math.sin(this.clock*.7)*.025+this.kick*.04;this.fly.head.rotation.y=Math.sin(this.clock*.9)*.035;this.fly.group.traverse(o=>{if(o.name==='wing')o.rotation.x=Math.sin(this.clock*18)*.055;});this.glow.intensity=this.kick*3;this.anatomy.update(this.clock);this.renderer.render(this.scene,this.camera);this.brainRenderer.render(this.brainScene,this.brainCamera);}
  spike(motor:boolean){this.anatomy.spike(this.clock,motor);if(motor)this.kick=1;}
  home(){this.camera.position.set(6.1,4.5,8.9);this.controls.target.set(0,1.2,0);}
  draw(q:Quote|null,tape:Tape[],fills:Fill[],question:string){
    const c=this.ctx;c.fillStyle='#0b101a';c.fillRect(0,0,1280,768);
    c.fillStyle='#f0f2ff';c.font='bold 30px sans-serif';c.fillText('Polymarket',38,54);c.font='15px monospace';c.fillStyle=q&&Date.now()-q.timestamp<8000?'#b5f3b2':'#f0cb81';c.fillText(q&&Date.now()-q.timestamp<8000?'● LIVE ORDER FLOW':'CONNECTING',975,49);
    c.strokeStyle='#293044';c.beginPath();c.moveTo(35,76);c.lineTo(1245,76);c.stroke();
    c.font='22px sans-serif';c.fillStyle='#eef0fa';c.fillText(question.slice(0,92),38,117);
    c.font='bold 58px sans-serif';c.fillText(q?`${(q.mid*100).toFixed(1)}¢`:'—',38,197);c.font='16px monospace';c.fillStyle='#8e99af';c.fillText('YES  /  MARKET PROBABILITY',38,230);
    c.font='19px monospace';c.fillStyle='#aadbbb';c.fillText('BID  '+(q?q.bid.toFixed(3):'—'),830,180);c.fillStyle='#e59cae';c.fillText('ASK  '+(q?q.ask.toFixed(3):'—'),1060,180);
    if(q&&q.history.length>1){const points=q.history,low=Math.min(...points.map(p=>p.price))-.001,high=Math.max(...points.map(p=>p.price))+.001;c.strokeStyle='#ad9ff8';c.lineWidth=3;c.beginPath();points.forEach((p,i)=>{const x=38+i/(points.length-1)*750,y=395-(p.price-low)/(high-low)*120;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();}
    c.fillStyle='#8e99af';c.font='15px monospace';c.fillText('OBSERVED PRICE / THIS SESSION',38,443);c.fillText('ORDER BOOK',865,257);
    for(let i=0;i<6;i++){const b=q?.bids[i],a=q?.asks[i];c.font='16px monospace';c.fillStyle='#aadbbb';if(b)c.fillText(`${b.price.toFixed(3)}  ${b.size.toFixed(0)}`,865,293+i*24);c.fillStyle='#e59cae';if(a)c.fillText(`${a.price.toFixed(3)}  ${a.size.toFixed(0)}`,1060,293+i*24);}
    c.fillStyle='#f0f2ff';c.font='bold 17px sans-serif';c.fillText('LIVE MARKET TAPE',38,493);c.fillText('FLY LEDGER',824,493);
    c.font='16px monospace';tape.slice(0,7).forEach((t,i)=>{c.fillStyle=t.side==='BUY'?'#aadbbb':'#e59cae';c.fillText(`${new Date(t.timestamp).toISOString().slice(11,19)}  ${t.side.padEnd(4)}  ${t.outcome.slice(0,8).padEnd(8)}  ${t.size.toFixed(2)} @ ${t.price.toFixed(3)}`,38,529+i*29);});
    fills.slice(-7).reverse().forEach((f,i)=>{c.fillStyle=f.side==='BUY'?'#aadbbb':'#e59cae';c.fillText(`${f.side} ${f.quantity.toFixed(1)} @ ${f.price.toFixed(3)}`,824,529+i*29);});
    if(!tape.length){c.fillStyle='#657083';c.fillText('Waiting for market trades',38,532);}if(!fills.length){c.fillStyle='#657083';c.fillText('Observing the market',824,532);}
    this.screen.needsUpdate=true;
  }
}
