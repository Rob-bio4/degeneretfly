import { describe, expect, it } from 'vitest';
import { LIFConnectome } from '../src/connectome';
import type { SensoryFrame } from '../src/types';

const bullishFrame: SensoryFrame = {
  imbalance: 0.95,
  velocity1m: 0.08,
  spreadCompression: 0.03,
  bid: 0.51,
  ask: 0.52,
  spread: 0.01,
  mid: 0.515,
  timestamp: Date.now(),
  isLive: false,
};

describe('LIFConnectome', () => {
  it('keeps resting neurons sub-threshold without a sensory frame', () => {
    const network = new LIFConnectome();
    for (let i = 0; i < 120; i += 1) network.step(1000 / 120);
    expect(network.getVoltage('MBON-02')).toBeLessThan(-48);
  });

  it('converts strong market telemetry into sensory spikes', () => {
    const network = new LIFConnectome();
    network.setSensoryFrame(bullishFrame);
    const spikes = Array.from({ length: 240 }, () => network.step(1000 / 120)).flat();
    expect(spikes.some((spike) => spike.neuronId === 'ALPN-L')).toBe(true);
    expect(spikes.some((spike) => spike.neuronId === 'OL-L')).toBe(true);
  });
});
