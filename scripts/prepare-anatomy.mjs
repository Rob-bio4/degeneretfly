// Derived visualization geometry; original MaleCNS CC-BY-4.0 attribution applies.
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
const directory=new URL('../public/data/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('anatomy.json',directory),'utf8'));
for(const region of manifest.regions)for(const file of region.fragments){
  const bytes=await readFile(new URL(file,directory));
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const n=new DataView(buffer).getUint32(0,true),g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,4,n*3),3));
  g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,4+n*12),1));
  const edges=new T.EdgesGeometry(g,28).getAttribute('position').array;
  await writeFile(new URL(file+'.edges',directory),new Uint8Array(edges.buffer));
  g.dispose();
}
console.log('Prepared anatomical branch outlines for immediate browser loading.');
