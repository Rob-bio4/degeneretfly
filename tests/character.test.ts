import {it,expect} from 'vitest';
import {makeFly,type Gesture} from '../src/character';
it('plays bounded expressive gestures and returns to typing without moving the seat',()=>{
  const fly=makeFly();const mood={dopamine:.6,octopamine:.5,serotonin:.6,acetylcholine:.7,speaking:true,active:true};
  for(const gesture of ['win','loss','wave','groom','lean'] as Gesture[]){
    fly.react(gesture);let extent=0;
    for(let i=0;i<420;i++){fly.animate(i/60,1/60,mood);extent=Math.max(extent,Math.abs(fly.arms[0]!.rotation.x),Math.abs(fly.arms[1]!.rotation.x));expect(Number.isFinite(fly.head.rotation.x)).toBe(true);}
    expect(extent).toBeGreaterThan(.1);expect(fly.group.position.y).toBe(0);expect(fly.gesture).toBe(null);
  }
});
