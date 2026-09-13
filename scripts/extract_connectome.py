"""Official MaleCNS extraction. Anatomy is data; electrical parameters are assumptions.

Credits: FlyWire Consortium; Princeton University Murthy Lab and Seung Lab;
MRC Laboratory of Molecular Biology (LMB), Cambridge; HHMI Janelia Research
Campus FlyEM team (MaleCNS v1.0). Polymarket supplies market data, not anatomy.
MIT software: Robillionair OÜ. Dataset retains its own CC-BY-4.0 license.
"""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DATASET = "male-cns:v1.0"
SERVER = "https://neuprint.janelia.org"


def clean(value):
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if hasattr(value, "tolist"):
        return clean(value.tolist())
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def assemble(ids, neurons, aggregates, contacts, nt_columns):
    """Pure conversion: preserve contacts, including shared polyadic T-bars."""
    found = {str(n['bodyId']) for n in neurons}
    if found != set(ids):
        raise ValueError(f"Body selection mismatch: missing={set(ids)-found}, extra={found-set(ids)}")
    expected = {(str(r['bodyId_pre']), str(r['bodyId_post'])): int(r['weight']) for r in aggregates}
    grouped = defaultdict(list)
    for row in contacts:
        pair = (str(row['bodyId_pre']), str(row['bodyId_post']))
        if pair not in expected:
            raise ValueError(f"Unexpected contact pair {pair}")
        grouped[pair].append(row)
    edges = []
    for (source, target), count in sorted(expected.items()):
        rows = sorted(grouped[(source, target)], key=lambda r: tuple(r[f'{a}_{s}'] for s in ('pre', 'post') for a in 'xyz'))
        if len(rows) != count:
            raise ValueError(f"Count mismatch {source}->{target}: aggregate={count}, contacts={len(rows)}. No export written.")
        coordinates, probabilities, confidence = [], [], []
        for row in rows:
            xyz = [float(row[f'{axis}_{side}']) * 8 for side in ('pre', 'post') for axis in 'xyz']
            if not all(math.isfinite(v) for v in xyz):
                raise ValueError('Invalid coordinate')
            coordinates.append(xyz)
            probabilities.append([clean(row.get(k)) for k in nt_columns])
            confidence.append([clean(row.get('confidence_pre')), clean(row.get('confidence_post'))])
        # Average unique presynaptic sites, not PSD count (polyadic bias).
        sites = {tuple(x[:3]): p for x, p in zip(coordinates, probabilities)}
        means = {k: sum(v)/len(v) for i, k in enumerate(nt_columns)
                 if (v := [p[i] for p in sites.values() if p[i] is not None])}
        edges.append(dict(source=source, target=target, synapseCount=count,
                          transmitter=max(means, key=means.get) if means else None,
                          transmitterProbabilities=means, contactsNm=coordinates,
                          contactTransmitterProbabilities=probabilities, confidence=confidence))
    nodes = [dict(id=str(n['bodyId']), bodyId=str(n['bodyId']), rootId=None,
                  cellType=clean(n.get('type')), instance=clean(n.get('instance')),
                  properties=clean({k: v for k, v in n.items() if k != 'bodyId'}),
                  modelDefaults=dict(restingPotentialMv=-60, thresholdPotentialMv=-45,
                                     provenance='illustrative, not measured from this neuron')) for n in neurons]
    connected = {e[k] for e in edges for k in ('source', 'target')}
    return dict(nodes=nodes, edges=edges,
                report=dict(nodeCount=len(nodes), edgeCount=len(edges), contactCount=len(contacts),
                            isolatedBodyIds=sorted(set(ids)-connected)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT/'public/data/anatomy.json')
    parser.add_argument('--body-ids', nargs='+', help='Explicit body IDs; otherwise all visible skeleton IDs')
    parser.add_argument('--output', type=Path, default=ROOT/'public/data/connectivity.mcns.v1.json')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args()
    if args.output.exists() and not args.overwrite:
        parser.error('Output exists; use --overwrite explicitly.')
    ids = list(set(args.body_ids or [str(s['id']) for s in json.loads(args.manifest.read_text())['skeletons']]))
    if not ids or any(not i.isdecimal() or int(i) <= 0 for i in ids):
        parser.error('Body IDs must be positive integers.')
    ids.sort(key=int)
    if not {'12781', '556329'} <= set(ids):
        parser.error('Selection must include DNge104 bodies 12781 and 556329.')
    token = os.environ.get('NEUPRINT_TOKEN')
    if not token:
        parser.error('Set NEUPRINT_TOKEN locally from your neuPrint account; do not paste it into chat.')
    from neuprint import Client, NeuronCriteria, SynapseCriteria, fetch_neurons, fetch_simple_connections, fetch_synapse_connections
    print('Connecting to official neuPrint dataset...', flush=True)
    client = Client(SERVER, dataset=DATASET, token=token)
    print('Reading dataset metadata...', flush=True)
    meta = clean(client.fetch_meta())
    criteria = NeuronCriteria(bodyId=[int(i) for i in ids], client=client)
    print('Reading selected neuron annotations...', flush=True)
    neurons = fetch_neurons(criteria, omit_rois=True, returned_columns='all', client=client)
    print('Reading aggregate connections...', flush=True)
    aggregates = fetch_simple_connections(criteria, criteria, min_weight=1, client=client)
    nt_keys = client.fetch_synapse_nt_keys()
    nt_columns = [key.replace('nt', '').replace('Prob', '').lower() for key in nt_keys]
    contacts = []
    # Batch by source to bound API requests and avoid the client's empty-concat edge case.
    for source in sorted(set(aggregates['bodyId_pre'])):
        table = fetch_synapse_connections(
            NeuronCriteria(bodyId=int(source), client=client), criteria,
            SynapseCriteria(confidence=0, primary_only=True, client=client),
            min_total_weight=1, batch_size=100, nt='all' if nt_keys else None, client=client)
        contacts.extend(table.to_dict('records'))
        print(f'Fetched source {source}: {len(table)} contacts', flush=True)
    payload = assemble(ids, neurons.to_dict('records'), aggregates.to_dict('records'), contacts, nt_columns)
    payload.update(schemaVersion=1, dataset=DATASET, idNamespace='neuprint.bodyId',
                   provenance=dict(server=SERVER, extractedAt=datetime.now(timezone.utc).isoformat(),
                                   clientVersion=importlib.metadata.version('neuprint-python'), metadata=meta,
                                   selectedBodyIds=ids, confidenceCutoff=0, minimumWeight=1,
                                   coordinateScaleNm=[8, 8, 8], coordinateOrder=['preX','preY','preZ','postX','postY','postZ'],
                                   neurotransmitterColumns=nt_columns,
                                   neurotransmitterSource='presynaptic site predictions; null means unavailable',
                                   source='https://male-cns.janelia.org/download/', license='CC-BY-4.0'),
                   limitations=['Induced subgraph, not a complete sensory-to-motor circuit.',
                                'Body IDs are not CAVE root IDs. No root-ID mapping asserted.',
                                'No measured voltages, hormone concentrations, or spike recordings.',
                                'Transmitter prediction alone does not establish receptor-dependent polarity.'])
    data = json.dumps(clean(payload), separators=(',', ':'), allow_nan=False).encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix='.connectome-', dir=args.output.parent)
    try:
        with os.fdopen(handle, 'wb') as stream:
            stream.write(data)
        os.replace(temporary, args.output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(json.dumps(payload['report'], indent=2))
    print(f'Wrote {args.output}; SHA256 {hashlib.sha256(data).hexdigest()}')


if __name__ == '__main__':
    try:
        main()
    except ValueError as error:
        print(f'Validation failed: {error}', file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # Do not echo authenticated request objects, headers or credentials.
        status = getattr(getattr(error, 'response', None), 'status_code', None)
        print(f'Extraction failed ({type(error).__name__}, HTTP status {status}). No replacement graph published. Check access, dataset and query compatibility.', file=sys.stderr)
        sys.exit(1)
