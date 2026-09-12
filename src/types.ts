export type Neurotransmitter = 'ACh' | 'GABA' | 'Glutamate';
export type Neuropil = 'ALPN' | 'OPTIC' | 'CX' | 'MB' | 'DN';

export interface NeuronDefinition {
  id: string;
  label: string;
  neuropil: Neuropil;
  position: readonly [number, number, number];
  thresholdMv: number;
  restMv: number;
  resetMv: number;
  tauMs: number;
  refractoryMs: number;
}

export interface SynapseDefinition {
  id: string;
  from: string;
  to: string;
  transmitter: Neurotransmitter;
  weightMv: number;
  delayMs: number;
}

export interface SpikeEvent {
  neuronId: string;
  neuropil: Neuropil;
  timestampMs: number;
  outgoing: readonly SynapseDefinition[];
}

export interface SensoryFrame {
  imbalance: number;
  velocity1m: number;
  spreadCompression: number;
  bid: number;
  ask: number;
  spread: number;
  mid: number;
  timestamp: number;
  isLive: boolean;
}

export interface MarketDescriptor {
  id: string;
  question: string;
  yesTokenId: string;
  noTokenId?: string;
  liquidity: number;
}

export interface TradeRecord {
  id: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  executionPrice: number;
  midpoint: number;
  slippage: number;
  realizedPnl: number;
  timestamp: number;
  market: string;
  trigger: string;
}
