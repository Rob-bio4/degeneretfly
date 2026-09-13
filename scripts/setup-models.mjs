import {runModel,closeModels} from '../engine/models.mjs';
try{
  console.log('Downloading and warming Qwen2.5 0.5B Q4 locally. First run can take several minutes.');
  await runModel('qwen',{type:'warm'});console.log('Qwen Q4 ready.');
  console.log('Downloading and warming Kokoro with Adam.');
  await runModel('kokoro',{type:'warm'});console.log('Kokoro Adam ready.');
}finally{await closeModels();}
