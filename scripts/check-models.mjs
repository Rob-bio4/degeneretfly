import {runModel,closeModels,chatPrompt} from '../engine/models.mjs';
try{
  const start=Date.now();
  const reply=await runModel('qwen',{messages:chatPrompt('Pixel','Why are you waiting before buying?',{state:'Waiting for an edge',learning:{completed:458,pending:3},market:'A live YES contract',spread:.01,prediction:.002})});
  if(!reply.text?.trim())throw new Error('Qwen returned no reply');console.log('Qwen Q4 reply:',reply.text,'Time:',Date.now()-start,'ms');
  const t=Date.now();const speech=await runModel('kokoro',{text:'Chat, I am watching the spread. Tiny brain, serious homework.'});
  const bytes=Buffer.from(speech.wav);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.length<1000)throw new Error('Invalid Adam WAV');
  console.log('Kokoro Adam WAV:',bytes.length,'bytes. Time:',Date.now()-t,'ms');
}finally{await closeModels();}
