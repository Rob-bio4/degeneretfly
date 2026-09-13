# Phase 1: genuine MaleCNS connectivity

The exporter uses the official `neuprint-python` client against `https://neuprint.janelia.org`, dataset **male-cns:v1.0**. This is the [pipeline recommended by Janelia](https://male-cns.janelia.org/download/), not scraping Codex's viewer. [Official client documentation](https://connectome-neuprint.github.io/neuprint-python/docs/queries.html).

## Run on Windows

Install Python 3.12, then run these commands from the repository directory:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r scripts/requirements-connectome.txt
# Get your token in your account at https://neuprint.janelia.org
# This prompt avoids putting the token in shell command history.
$connectomeSecret = Read-Host 'neuPrint API token' -AsSecureString
$env:NEUPRINT_TOKEN = [System.Net.NetworkCredential]::new('', $connectomeSecret).Password
try {
  .venv\Scripts\python scripts/extract_connectome.py
} finally {
  Remove-Item Env:NEUPRINT_TOKEN
}
```

Linux/macOS: `python3 -m venv .venv`, activate with `source .venv/bin/activate`, install the same requirements, set `NEUPRINT_TOKEN` in your local environment and run `python scripts/extract_connectome.py`. Never commit or send the token. The Node server's `.env` is not read by this Python command.

Default selection is every SWC body in `public/data/anatomy.json`, including `12781` and `556329`. To extract only the two descending neurons, pass `--body-ids 12781 556329`. This does not guarantee a connection between them. Use `--overwrite` only to explicitly replace a prior export.

## Output contract

`public/data/connectivity.mcns.v1.json` is compact JSON. Nothing is written until every selected body is present and each aggregate edge weight equals its retrieved contact count. Failed requests leave any prior export intact. An empty induced graph remains empty. The script prints a SHA256 checksum and isolation/contact report.

- `nodes`: string `id` and `bodyId`, actual `cellType`, `instance`, database properties, and separately labeled illustrative electrical defaults. `rootId` is null: neuPrint body IDs are not CAVE root IDs.
- `edges`: directed `source`, `target`, `synapseCount`; `contactsNm` rows `[preX,preY,preZ,postX,postY,postZ]`; paired confidence values; per-contact transmitter probability arrays.
- `provenance.neurotransmitterColumns`: the ordered labels for those arrays. Presynaptic predictions are requested for **all available transmitters**, including ACh/GABA/glutamate/dopamine/octopamine where provided. Missing predictions are null, never guessed from cell names. The edge's summary transmitter is the maximum of mean probabilities across unique T-bars, not a receptor/polarity measurement.
- `provenance`: fixed dataset/server, extraction timestamp, client version, database metadata, selected IDs and the 8 nm voxel conversion. No anatomical display recentering is baked into contact coordinates.
- `report`: nodes, edges, contacts and isolated body IDs. Each presynaptic-to-postsynaptic pair remains a contact; multiple PSDs sharing a T-bar are preserved.

No extra confidence cutoff is applied beyond the database's own release filtering. Synapse coordinates and weights must agree; a mismatch requires investigating the dataset, not silently rescaling counts. Default queries only include connections **among** selected bodies, not all their external partners. This small morphology sample is not a validated closed sensory-to-motor circuit.

## Scientific boundaries and next phases

Phase 1 deliberately does **not** switch the running authored ten-channel circuit to this file. That requires Phase 2's validated loader and conductance solver, followed by Phase 3's animation bridge. Do not label current lightning as measured or anatomically localized spike recordings.

The connectome contains anatomical connectivity and transmitter predictions, not measured voltages, hormone concentrations or an animal's thoughts. Eyes looking at the rendered monitor are currently animation: market features enter the model numerically, not through reconstructed photoreceptor transduction.

The existing dopamine index increases for positive realized PnL and decreases for negative PnL; online learning separately updates feature weights using delayed prediction error. These are computational signals. Profit reward is not evidence of biological learning in these reconstructed cells. Other displayed neuromodulator indices are likewise dimensionless models.

Future conductance currents must use a consistent sign convention (e.g. `g*(Erev-V)` as inward depolarizing drive). Glutamate polarity needs receptor assumptions. A 120 Hz integration/measurement rate cannot resolve 80 Hz gamma: use smaller internal steps and a defined windowed spectral estimator before displaying 40–80 Hz power. E/I, firing-rate and synchrony-derived stress is an unvalidated model index, not a seizure or excitotoxicity diagnosis. A 0.5 m/s propagation speed and soma-origin spikes are explicit assumptions, not per-cell measurements.

## Tests and attribution

```powershell
.venv\Scripts\python -m unittest discover -s scripts -p 'test_*.py'
```

Unit fixtures test conversion and validation; they are not exported or served as anatomy. A live authenticated extraction is required to validate actual dataset availability and selected connectivity.

Credit: **FlyWire Consortium; Princeton University Murthy Lab and Seung Lab; MRC Laboratory of Molecular Biology (LMB), Cambridge; HHMI Janelia Research Campus FlyEM team, specifically MaleCNS v1.0**. MaleCNS also credits University of Cambridge Department of Zoology and Google Research. **Polymarket** supplies Gamma/CLOB/Data market feeds, not connectome data. Dataset: CC-BY-4.0; extraction software: MIT, **Robillionair OÜ**.
