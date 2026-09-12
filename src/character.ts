import * as T from 'three';
const sphere=new T.SphereGeometry(1,32,24);
export function makeFly(){
  const fly=new T.Group();
  const skin=new T.MeshPhysicalMaterial({color:0x123f35,metalness:.6,roughness:.36,clearcoat:.42});
  skin.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float grain=fract(sin(dot(vViewPosition.xyz,vec3(127.1,311.7,74.7)))*43758.5453); diffuseColor.rgb *= .76+.38*grain;');};
  const dark=new T.MeshStandardMaterial({color:0x12251e,roughness:.65,metalness:.45});
  const gold=new T.MeshStandardMaterial({color:0xe5ad47,metalness:1,roughness:.21});
  const jewel=new T.MeshPhysicalMaterial({color:0xfcf0bd,metalness:.7,roughness:.09,clearcoat:1});
  const add=(material:T.Material,pos:number[],scale:number[])=>{const m=new T.Mesh(sphere,material);m.position.set(pos[0]!,pos[1]!,pos[2]!);m.scale.set(scale[0]!,scale[1]!,scale[2]!);m.castShadow=true;m.receiveShadow=true;fly.add(m);return m;};
  const tube=(points:number[][],radius:number,material:T.Material)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));const m=new T.Mesh(new T.TubeGeometry(curve,20,radius,8,false),material);m.castShadow=true;fly.add(m);return m;};
  add(skin,[0,1.3,0],[.47,.55,.35]);add(skin,[0,1.05,.08],[.49,.37,.39]);
  for(let i=0;i<4;i++){const band=new T.Mesh(new T.TorusGeometry(.43-i*.015,.014,8,48),dark);band.rotation.x=Math.PI/2;band.scale.y=.84;band.position.set(0,.91+i*.115,.04);fly.add(band);}
  add(skin,[0,1.72,0],[.36,.32,.3]);
  const head=add(skin,[0,2.2,.08],[.48,.47,.39]);
  const eyeBase=new T.MeshPhysicalMaterial({color:0x831a48,metalness:.4,roughness:.29,clearcoat:.7});
  for(const side of [-1,1]){
    add(eyeBase,[side*.31,2.24,.3],[.285,.355,.25]);
    // Individually faceted compound eyes, placed on the ellipsoidal surface.
    const hex=new T.CylinderGeometry(.019,.019,.007,6),eyeMat=new T.MeshStandardMaterial({color:0xc44574,metalness:.65,roughness:.28});
    const facets=new T.InstancedMesh(hex,eyeMat,280);const dummy=new T.Object3D();let k=0;
    for(let row=-8;row<=8;row++)for(let col=-8;col<=8;col++){
      const u=col*.108+(row%2)*.054,v=row*.105;if(u*u+v*v>.91)continue;
      const z=Math.sqrt(1-u*u-v*v),normal=new T.Vector3(u/.285,v/.355,z/.25).normalize();
      dummy.position.set(side*.31+u*.285,2.24+v*.355,.3+z*.25);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);dummy.updateMatrix();facets.setMatrixAt(k,dummy.matrix);facets.setColorAt(k,new T.Color().setHSL(.92+Math.sin(k)*.015,.55,.22+(k%7)*.027));k++;
    }facets.count=k;fly.add(facets);
    tube([[side*.22,2.52,.06],[side*.3,2.79,.04],[side*.43,2.9,.14]],.028,skin);
    add(skin,[side*.43,2.9,.14],[.046,.068,.044]);
    // Legs, articulated feet, and three fingers on each hand.
    tube([[side*.25,.92,.04],[side*.32,.55,.15],[side*.29,.16,.3]],.073,skin);
    add(dark,[side*.29,.1,.36],[.12,.10,.23]);
    for(let toe=0;toe<3;toe++)tube([[side*.29+(toe-1)*.055,.1,.43],[side*.29+(toe-1)*.074,.055,.56]],.024,skin);
    const elbow=[side*.63,1.35,.18],wrist=[side*.67,1.45,.59];
    tube([[side*.33,1.72,0],elbow,wrist],.082,skin);
    add(skin,[side*.67,1.43,.7],[.13,.07,.15]);
    for(let finger=0;finger<3;finger++)tube([[side*.67+(finger-1)*.08,1.43,.74],[side*.67+(finger-1)*.085,1.40,.89],[side*.67+(finger-1)*.075,1.34,.93]],.025,skin);
    for(let ring=0;ring<3;ring++){
      const b=new T.Mesh(new T.TorusGeometry(.11,.022,8,24),gold);b.rotation.x=Math.PI/2;b.position.set(side*.66,1.43,.51+ring*.05);fly.add(b);
    }
    const watch=add(gold,[side*.67,1.54,.60],[.105,.024,.13]);watch.rotation.z=side*.15;
    add(jewel,[side*.67,1.566,.6],[.075,.007,.10]);
    // Paired translucent, veined wings behind the shoulders.
    const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.16,.34,.58,.38,.57,-.17);shape.bezierCurveTo(.5,-.67,.18,-.85,0,0);
    const wing=new T.Mesh(new T.ShapeGeometry(shape,24),new T.MeshPhysicalMaterial({color:0xb8d4de,transparent:true,opacity:.33,roughness:.16,metalness:.15,side:T.DoubleSide,depthWrite:false}));
    wing.position.set(side*.12,1.96,-.27);wing.scale.x=side;wing.rotation.y=side*.6;wing.rotation.z=side*-.28;fly.add(wing);
    for(let vein=0;vein<5;vein++)tube([[side*.13,1.93,-.28],[side*(.24+vein*.055),1.75,-.35],[side*(.2+vein*.07),1.4+vein*.06,-.37]],.003,new T.MeshBasicMaterial({color:0x81979c,transparent:true,opacity:.5}));
  }
  tube([[0,2.22,.47],[0,2.07,.60],[0,1.98,.68]],.049,skin);
  add(dark,[0,1.98,.69],[.034,.031,.015]);
  // Gold Cuban-link chain, with interlocked elliptical links and pendant.
  for(let i=0;i<44;i++){
    const a=i/44*Math.PI*2;const link=new T.Mesh(new T.TorusGeometry(.047,.013,7,12),gold);
    link.position.set(Math.sin(a)*.34,1.77-Math.max(0,Math.cos(a))*.4,Math.cos(a)*.32+.015);
    link.rotation.set(Math.PI/3,(i%2)*1.1,-Math.sin(a)*.7);link.scale.set(1,.74,1);fly.add(link);
  }
  const pendant=new T.Mesh(new T.BoxGeometry(.22,.115,.03),gold);pendant.position.set(0,1.35,.36);fly.add(pendant);
  for(let i=0;i<21;i++)add(jewel,[(i%7-3)*.027,1.32+Math.floor(i/7)*.029,.379],[.012,.012,.009]);
  return {group:fly,head};
}
