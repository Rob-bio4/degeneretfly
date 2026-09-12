import { mkdir, writeFile, readFile } from 'node:fs/promises';
const root = new URL('../public/data/', import.meta.url);
await mkdir(root, { recursive: true });
const base = 'https://storage.googleapis.com/flyem-male-cns/';
async function get(path, binary = false) {
  const response = await fetch(base + path, {signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}
const props = await get('rois/fullbrain-roi-v4/segment_properties/info');
const labels = props.inline.properties[0].values;
const regions = [];
for (let i=0; i<props.inline.ids.length; i++) {
  const id=props.inline.ids[i], label=labels[i];
  const manifest=await get(`rois/fullbrain-roi-v4/mesh/${id}:0`);
  const fragments=[];
  for (let j=0;j<manifest.fragments.length;j++) {
    const name=`roi-${id}-${j}.bin`;
    const bytes=await get(`rois/fullbrain-roi-v4/mesh/${encodeURIComponent(manifest.fragments[j])}`,true);
    await writeFile(new URL(name,root),bytes); fragments.push(name);
  }
  regions.push({id,label,fragments});
  if(i%15===0) console.log(`Brain compartments ${i+1}/${labels.length}`);
}
const prefix='v1.0/segmentation/skeletons-malecns/skeletons-swc/';
const listUrl=`https://storage.googleapis.com/storage/v1/b/flyem-male-cns/o?prefix=${encodeURIComponent(prefix)}&maxResults=1000&fields=items(name)`;
const listing=await (await fetch(listUrl)).json();
const names=listing.items.filter(x=>x.name.endsWith('.swc')).map(x=>x.name);
const ids=['12781','556329',...names.filter((_,i)=>i%23===0).slice(0,40).map(x=>x.split('/').at(-1).replace('.swc',''))];
const skeletons=[];
for(const id of ids){
  const file=`${id}.swc`;
  try { await readFile(new URL(file,root)); }
  catch { await writeFile(new URL(file,root),await get(prefix+file,true)); }
  skeletons.push({id,file,label:id==='12781'?'DNge104_R':id==='556329'?'DNge104_L':`Body ${id}`});
}
await writeFile(new URL('anatomy.json',root),JSON.stringify({dataset:'MaleCNS v1.0',source:'https://male-cns.janelia.org/download/',license:'CC-BY-4.0',units:'Meshes: nm. SWC: 8 nm voxels.',regions,skeletons},null,2));
console.log(`${regions.length} authentic compartments, ${skeletons.length} neuron skeletons downloaded.`);
