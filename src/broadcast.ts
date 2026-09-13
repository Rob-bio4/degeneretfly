import './broadcast.css';
export function broadcastLayout(streamPanel:HTMLElement){
  const link=document.createElement('a');link.href='/?stream=1';link.textContent='Live studio ↗';document.querySelector('.nav nav')?.append(link);
  if(!new URLSearchParams(location.search).has('stream'))return null;
  document.documentElement.classList.add('broadcast-mode');
  const root=document.createElement('section');root.id='broadcast';
  const header=document.createElement('header');header.className='broadcast-header';header.innerHTML='<b>◈ DEGENERET FLY <span>LIVE DESK</span></b><a href="/">Full dashboard ↗</a>';
  const connection=document.querySelector('.connection')!;header.append(connection);
  const stage=document.querySelector<HTMLElement>('.stage')!;stage.classList.add('broadcast-desk');
  const webcam=document.createElement('div');webcam.className='webcam';webcam.innerHTML='<span>● FLY CAM / LIVE</span>';
  const face=document.createElement('canvas');face.id='facecam';face.setAttribute('aria-label','Live second camera showing the fly face');webcam.append(face);stage.append(webcam);
  const brain=document.querySelector<HTMLElement>('.brain-panel')!,journal=document.querySelector<HTMLElement>('.journal')!;
  const deskInfo=document.createElement('div');deskInfo.className='broadcast-info';deskInfo.append(document.querySelector('.market-strip')!,document.querySelector('.portfolio')!,streamPanel);
  const credits=document.createElement('footer');credits.className='broadcast-credits';credits.textContent=document.querySelector('footer p')!.textContent+' · Built by Robin-kevin Vettik · Robillionair OÜ';
  root.append(header,stage,brain,journal,deskInfo,credits);document.body.append(root);return face;
}
