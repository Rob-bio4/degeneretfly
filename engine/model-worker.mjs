import {parentPort,workerData} from 'node:worker_threads';
import {env,pipeline} from '@huggingface/transformers';
import {fileURLToPath} from 'node:url';
env.cacheDir=fileURLToPath(new URL('../.models/',import.meta.url));
let model;
async function load(){
  if(model)return model;
  parentPort.postMessage({status:'Loading '+workerData.kind});
  if(workerData.kind==='qwen')model=await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{dtype:'q4',device:'cpu',session_options:{intraOpNumThreads:3}});
  else{const {KokoroTTS}=await import('kokoro-js');model=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'});}
  parentPort.postMessage({status:'Ready'});return model;
}
let chain=Promise.resolve();
parentPort.on('message',job=>{chain=chain.then(async()=>{
  try{const engine=await load();let result;
    if(job.type==='warm')result={ready:true};
    else if(workerData.kind==='qwen'){
      const output=await engine(job.messages,{max_new_tokens:85,do_sample:true,temperature:.7,top_p:.88,repetition_penalty:1.12,return_full_text:false});
      const generated=output[0].generated_text;
      result={text:(typeof generated==='string'?generated:generated.at(-1).content).trim()};
    }else{const audio=await engine.generate(job.text,{voice:'am_adam',speed:1.08});result={wav:audio.toWav()};}
    parentPort.postMessage({id:job.id,result});
  }catch(error){parentPort.postMessage({id:job.id,error:String(error.message??error)});}
});});
