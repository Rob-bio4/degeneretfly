/**
 * Male CNS v1.0-inspired demonstrator sub-circuit.
 * Data lineage credit: FlyWire Consortium; Princeton University Murthy Lab and
 * Seung Lab; MRC Laboratory of Molecular Biology (LMB), Cambridge; and the
 * HHMI Janelia Research Campus FlyEM team, specifically the MaleCNS v1.0 dataset.
 *
 * This is a compact functional mapping for visualization, not the full dataset
 * and not a claim of neuron-by-neuron biological fidelity.
 */
import type {
  NeuronDefinition,
  Neurotransmitter,
  SensoryFrame,
  SpikeEvent,
  SynapseDefinition,
} from './types';

export const NEURONS: readonly NeuronDefinition[] = [
  { id: 'ALPN-L', label: 'ALPN-L', neuropil: 'ALPN', position: [-0.54, 0.20, 0.08], thresholdMv: -51, restMv: -70, resetMv: -66, tauMs: 18, refractoryMs: 8 },
  { id: 'ALPN-R', label: 'ALPN-R', neuropil: 'ALPN', position: [0.54, 0.20, 0.08], thresholdMv: -51, restMv: -70, resetMv: -66, tauMs: 18, refractoryMs: 8 },
  { id: 'OL-L', label: 'OPTIC-L', neuropil: 'OPTIC', position: [-0.78, 0.04, 0.02], thresholdMv: -52, restMv: -70, resetMv: -66, tauMs: 15, refractoryMs: 7 },
  { id: 'OL-R', label: 'OPTIC-R', neuropil: 'OPTIC', position: [0.78, 0.04, 0.02], thresholdMv: -52, restMv: -70, resetMv: -66, tauMs: 15, refractoryMs: 7 },
  { id: 'CX-PB', label: 'CX-PB', neuropil: 'CX', position: [0, 0.17, 0.18], thresholdMv: -50, restMv: -69, resetMv: -65, tauMs: 22, refractoryMs: 10 },
  { id: 'CX-FSB', label: 'CX-FSB', neuropil: 'CX', position: [0, -0.03, 0.23], thresholdMv: -50, restMv: -69, resetMv: -65, tauMs: 24, refractoryMs: 10 },
  { id: 'MB-KC', label: 'MB-KC', neuropil: 'MB', position: [-0.27, 0.38, 0.13], thresholdMv: -49, restMv: -70, resetMv: -67, tauMs: 28, refractoryMs: 12 },
  { id: 'MBON-02', label: 'MBON-02', neuropil: 'MB', position: [0.28, 0.38, 0.13], thresholdMv: -48, restMv: -69, resetMv: -66, tauMs: 30, refractoryMs: 12 },
  { id: 'DNp01', label: 'DNp01 BUY', neuropil: 'DN', position: [-0.18, -0.42, 0.14], thresholdMv: -47, restMv: -70, resetMv: -68, tauMs: 26, refractoryMs: 30 },
  { id: 'DNp02', label: 'DNp02 SELL', neuropil: 'DN', position: [0.18, -0.42, 0.14], thresholdMv: -47, restMv: -70, resetMv: -68, tauMs: 26, refractoryMs: 30 },
] as const;

export const SYNAPSES: readonly SynapseDefinition[] = [
  { id: 's01', from: 'ALPN-L', to: 'MB-KC', transmitter: 'ACh', weightMv: 20, delayMs: 11 },
  { id: 's02', from: 'ALPN-R', to: 'MB-KC', transmitter: 'ACh', weightMv: 20, delayMs: 12 },
  { id: 's03', from: 'OL-L', to: 'CX-PB', transmitter: 'ACh', weightMv: 20, delayMs: 8 },
  { id: 's04', from: 'OL-R', to: 'CX-PB', transmitter: 'ACh', weightMv: 20, delayMs: 8 },
  { id: 's05', from: 'MB-KC', to: 'MBON-02', transmitter: 'ACh', weightMv: 24, delayMs: 9 },
  { id: 's06', from: 'CX-PB', to: 'CX-FSB', transmitter: 'ACh', weightMv: 23, delayMs: 10 },
  { id: 's07', from: 'CX-FSB', to: 'MBON-02', transmitter: 'ACh', weightMv: 15, delayMs: 10 },
  { id: 's08', from: 'MBON-02', to: 'DNp01', transmitter: 'ACh', weightMv: 24, delayMs: 12 },
  { id: 's09', from: 'CX-FSB', to: 'DNp02', transmitter: 'ACh', weightMv: 24, delayMs: 12 },
  { id: 's10', from: 'ALPN-R', to: 'CX-PB', transmitter: 'GABA', weightMv: -7, delayMs: 9 },
  { id: 's11', from: 'OL-L', to: 'MBON-02', transmitter: 'Glutamate', weightMv: -8, delayMs: 10 },
  { id: 's12', from: 'DNp01', to: 'DNp02', transmitter: 'GABA', weightMv: -12, delayMs: 5 },
  { id: 's13', from: 'DNp02', to: 'DNp01', transmitter: 'GABA', weightMv: -12, delayMs: 5 },
] as const;

interface NeuronState {
  voltageMv: number;
  refractoryRemainingMs: number;
  synapticImpulseMv: number;
}

interface PendingImpulse {
  dueMs: number;
  synapse: SynapseDefinition;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export class LIFConnectome {
  readonly states = new Map<string, NeuronState>();
  private readonly outgoing = new Map<string, SynapseDefinition[]>();
  private readonly pending: PendingImpulse[] = [];
  private sensoryFrame: SensoryFrame | null = null;
  private clockMs = 0;

  constructor() {
    for (const neuron of NEURONS) {
      this.states.set(neuron.id, {
        voltageMv: neuron.restMv,
        refractoryRemainingMs: 0,
        synapticImpulseMv: 0,
      });
      this.outgoing.set(neuron.id, []);
    }
    for (const synapse of SYNAPSES) this.outgoing.get(synapse.from)?.push(synapse);
  }

  setSensoryFrame(frame: SensoryFrame): void {
    this.sensoryFrame = frame;
  }

  reset(): void {
    this.clockMs = 0;
    this.pending.length = 0;
    for (const neuron of NEURONS) {
      const state = this.states.get(neuron.id);
      if (state) Object.assign(state, { voltageMv: neuron.restMv, refractoryRemainingMs: 0, synapticImpulseMv: 0 });
    }
  }

  step(dtMs: number): SpikeEvent[] {
    const safeDt = clamp(dtMs, 0, 34);
    this.clockMs += safeDt;
    this.deliverPending();
    const spikes: SpikeEvent[] = [];

    for (const neuron of NEURONS) {
      const state = this.states.get(neuron.id);
      if (!state) continue;
      if (state.refractoryRemainingMs > 0) {
        state.refractoryRemainingMs -= safeDt;
        state.voltageMv = neuron.resetMv;
        state.synapticImpulseMv = 0;
        continue;
      }

      const externalCurrentMv = this.externalCurrent(neuron.id);
      const leakMv = neuron.restMv - state.voltageMv;
      state.voltageMv += (leakMv + externalCurrentMv) * (safeDt / neuron.tauMs);
      state.voltageMv += state.synapticImpulseMv;
      state.synapticImpulseMv = 0;

      if (state.voltageMv >= neuron.thresholdMv) {
        state.voltageMv = neuron.resetMv;
        state.refractoryRemainingMs = neuron.refractoryMs;
        const outgoing = this.outgoing.get(neuron.id) ?? [];
        const event: SpikeEvent = {
          neuronId: neuron.id,
          neuropil: neuron.neuropil,
          timestampMs: this.clockMs,
          outgoing,
        };
        spikes.push(event);
        for (const synapse of outgoing) this.pending.push({ dueMs: this.clockMs + synapse.delayMs, synapse });
      }
    }

    return spikes;
  }

  getVoltage(neuronId: string): number {
    return this.states.get(neuronId)?.voltageMv ?? -70;
  }

  private deliverPending(): void {
    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      const impulse = this.pending[index];
      if (!impulse || impulse.dueMs > this.clockMs) continue;
      const target = this.states.get(impulse.synapse.to);
      if (target) target.synapticImpulseMv += impulse.synapse.weightMv;
      this.pending.splice(index, 1);
    }
  }

  private externalCurrent(neuronId: string): number {
    if (!this.sensoryFrame) return neuronId.startsWith('ALPN') || neuronId.startsWith('OL') ? 2.5 : 0;
    const { imbalance, velocity1m, spreadCompression } = this.sensoryFrame;
    const positiveImbalance = Math.max(0, imbalance);
    const negativeImbalance = Math.max(0, -imbalance);
    const positiveVelocity = Math.max(0, velocity1m * 100);
    const negativeVelocity = Math.max(0, -velocity1m * 100);
    const compression = Math.max(0, spreadCompression);

    switch (neuronId) {
      case 'ALPN-L': return clamp(12 + positiveImbalance * 30 + compression * 240, 0, 38);
      case 'ALPN-R': return clamp(12 + negativeImbalance * 30 + Math.max(0, -spreadCompression) * 210, 0, 38);
      case 'OL-L': return clamp(10 + positiveVelocity * 15, 0, 36);
      case 'OL-R': return clamp(10 + negativeVelocity * 15, 0, 36);
      default: return 0;
    }
  }
}

export const transmitterColor = (transmitter: Neurotransmitter): number => {
  if (transmitter === 'ACh') return Math.random() > 0.45 ? 0x36f5ff : 0xffc857;
  return 0xff2ebd;
};
