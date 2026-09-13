# The Degeneret Fly

A little instinct. A lot of market.

A green, gold-wearing 3D fruit fly watches a live Polymarket workstation. Beside him, reconstructed MaleCNS anatomy carries branching light pulses from a leaky integrate-and-fire circuit. Order flow becomes sensory input; predictions become lessons; every accepted decision becomes a permanent entry in his browser's $100 ledger.

![The Degeneret Fly workstation and MaleCNS anatomy](docs/screenshot.png)

## Run locally

Requires Node.js **20.19+ or 22.12+** and npm. No wallet, API key, account login, or Python setup is needed.

```bash
git clone https://github.com/Rob-bio4/degeneretfly.git
cd degeneretfly
npm ci
npm run dev
```

Open **http://localhost:4173/**. Keep the terminal open. Stop with Ctrl+C.

For the optimized build:

```bash
npm run check
npm start
```

`npm run check` runs thirteen automated tests, TypeScript checking, and the production build. `npm start` serves the generated `dist/` with the same public-data proxy. Default binding is loopback only. Override `PORT` if 4173 is occupied. Do not run development and production servers on the same port.

For Kokoro **Adam**, local **Qwen 2.5 0.5B Q4**, and sequential Kick replies, follow [Streamer setup](docs/STREAMER-SETUP.md). Start with `npm run setup:models`, then click **Enable Adam** in the app. For genuine body-to-body synapse extraction through the official API, follow [Phase 1: MaleCNS connectivity](docs/CONNECTOME.md). That optional extraction requires Python and a neuPrint token; ordinary viewing does not.

## The story

### 1. He senses the order book

The local server discovers active YES contracts through Polymarket Gamma. It favors recent trading volume, excludes near-resolved prices, and verifies a two-sided CLOB book before selecting a contract. The fly automatically rotates through discovered eligible contracts with a three-minute observation dwell, and keeps focus while a position remains open. The monitor shows its current focus; it does not scan the entire exchange simultaneously.

Actual top-five depth imbalance, a full minute of observed midpoint velocity, and changes in spread become effective membrane-driving inputs. There are no price generators. An unavailable or stale feed pauses decisions. A newly selected market must accumulate sixty seconds of observations.

### 2. His circuit fires

`requestAnimationFrame` advances a fixed 8.333 ms LIF integration step. Membrane potentials leak toward rest, incoming synaptic impulses change voltage, and threshold crossings produce spikes followed by a refractory interval. Antennal-lobe and optic channels feed Central Complex/Mushroom Body abstractions, then descending output channels.

The visible anatomy comes from the public **MaleCNS v1.0** release. The application ships 90 anatomical compartment meshes and 42 sampled SWC skeletons, including DNge104_R body `12781` and DNge104_L body `556329`. One sampled skeleton has no segments inside the displayed brain bounding box, so the viewer reports **41 visible reconstructed neurons**. All coordinates share one anatomical frame; SWC coordinates are converted from 8 nm voxels to nanometers. Compartment edges are precomputed without repositioning individual structures.

Important distinction: this is authentic reconstructed **morphology**, not the entire connectome's connectivity. The ten-channel functional circuit and its thirteen synaptic links are authored abstractions, not an imported body-to-body synapse table. Its labels are functional channel names, not validated MaleCNS root IDs. Light pulses depict model activity over anatomical branches, not recordings of a living fly. The compact activity overlay does not localize activity to an individually verified biological neuron.

Acetylcholine is assigned positive weights; GABA and glutamate receive negative weights in this circuit. These are modeling choices: biological transmitter effects depend on receptor and cell context. The displayed mV values are model voltages. Violet branching light marks neural activity; green marks descending activity. There are no particle-orb representations.

### 3. He learns from what happened next

Once the observation window is ready, the learner stores a feature vector and a predicted sixty-second price change every ten seconds. Only a later, same-token observation can score that prediction. A bounded online gradient update adjusts three feature weights. Market switches discard pending lessons to prevent cross-contract contamination.

This teaches a small price-response model, not language understanding or guaranteed trading skill. There is no historical training corpus, news analysis, or claim of profitability. The lesson counter shows actual completed prediction evaluations. Weights persist between visits in the same browser.

### 4. A decision must earn its place

A descending spike can request a fill, but the execution checks must also pass: fresh quote, completed warmup, seven-second cooldown, sufficient cash/inventory, healthy storage, and a learned edge greater than the full spread plus a 0.0005 price buffer. A separate bounded $2 pressure-exploration path is available at most once per minute when bid imbalance exceeds 0.30 and spread is at most 0.015. Existing positions can also exit on a 5% loss, 4% gain, or sixty-second evaluation threshold. Entries stop near the end of a market dwell so outcomes have time to mature. Intent drives the authored descending channels; their threshold crossings gate fills, not the language model.

Buys walk actual ask depth, sells walk actual bid depth. A buy is limited to $8 and fifteen shares, with no borrowing or shorting. Slippage is the depth-weighted fill's deviation from the best executable quote. Cash plus inventory marked at the last observed bid produces equity. Closed-win percentage counts profitable sell fills, not resolved market outcomes. Fees, queue position, settlement, and fill competition are not modeled.

The **Fly history** is a local execution ledger, not exchange-confirmed orders. It starts with $100, never sends an order or accesses a funded wallet, and saves every fill in localStorage. **Polymarket tape** is a separate read-only feed of public exchange trade reports. This separation keeps the character's decisions distinct from other traders' transactions.

## Anatomy, mood and chemistry

The panel exposes dopamine, octopamine, serotonin and acetylcholine as **dimensionless 0–100 activity indices**, not measured concentrations. Dopamine responds to prediction error and realized outcome; octopamine reflects volatility/spread arousal; serotonin represents restraint; ACh reflects sensory drive. These are explanatory state variables, not calibrated neurochemical physiology. Cortisol is deliberately not used as a fly stress readout; octopamine is the relevant insect-inspired channel.

The character is a procedural Three.js interpretation of the supplied character sheet: green chitin, faceted magenta eyes, antennae, proboscis, transparent wings, articulated limbs, and gold jewelry. It is fully volumetric and orbitable, not a flat image or an exact production sculpt of the reference.

## History and controls

- Drag the desk or brain to orbit. Scroll over the desk to zoom. **Reset view** restores the camera.
- **Pause decisions** stops neural decisions while live data and rendering continue.
- Fly history is paginated without discarding fills. **Export fly history** downloads ledger and learning state as JSON.
- The public tape starts with the latest 100 reports, then merges further ten-second Data API polls by transaction identity. It is a session collection, not all historical Polymarket activity; more than 100 trades between polls may leave gaps.
- History and weights belong to this browser origin. Clearing site data erases them. Export regularly. Other browsers and OBS browser sources have separate storage.
- A background/hidden browser may throttle animation and data timers. No catch-up trading occurs when it returns.

## Architecture

| File | Responsibility |
| --- | --- |
| `server.mjs` | Local Vite/static server; fixed-host public API proxy; bounded timeouts and short cache |
| `src/live-market.ts` | Discovery, sorted CLOB depth, websocket book updates, REST recovery and trade reports |
| `src/connectome.ts` | LIF functional circuit, neurotransmitter weights, delays and refractory state |
| `src/agent.ts` | Delayed online learning, risk gates, depth-aware ledger, persistence |
| `src/character.ts` | Procedural volumetric fly and jewelry |
| `src/studio.ts` | Desk, monitor texture, lighting, cameras and animation |
| `src/anatomy.ts` | Real anatomical outlines, SWC branches and traveling-light shader |
| `src/app.ts` | HUD, complete local fill history, export, controls and render loop |
| `public/data/anatomy.json` | Exact source manifest, body IDs, units and provenance |
| `scripts/fetch-anatomy.mjs` | Re-download public anatomical assets |
| `scripts/prepare-anatomy.mjs` | Precompute derived mesh-edge buffers for fast startup |

The asset files are included so normal startup does not require downloading the connectome again. To regenerate:

```bash
node scripts/fetch-anatomy.mjs
node scripts/prepare-anatomy.mjs
npm run build
```

## Live data and safety

The server permits only read-only requests to hardcoded Gamma, CLOB and Data API hosts. It validates token/condition identifiers, bounds requests to ten seconds, and does not accept arbitrary proxy URLs. It has no private-key handling or order submission code. Do not expose the development server publicly. A public deployment needs HTTPS, abuse/rate controls, operational monitoring and a durable per-user store.

Websocket books supplement three-second CLOB polling; REST remains active if the websocket is unavailable. The quote-age indicator is time since receiving a valid book, not the exchange's last trade time. Current holdings in other contracts retain their last observed marks until those contracts are selected again; this is not continuous multi-market valuation. The local ledger does not enforce every exchange venue constraint, such as market-specific minimum order sizes.

If a feed is unavailable, confirm Internet access and inspect `/api/health`. The monitor and status show waiting/stale states until genuine data returns. If anatomy is missing, regenerate assets using the commands above. WebGL2 must be enabled with hardware acceleration for the best experience.

## Streaming

Use an OBS browser source pointed at the local URL, preferably 1920×1080 or larger. Start the local server before opening OBS. Browser sources need permission to access loopback. Keep the source active to preserve observation continuity. The site is responsive; the history and narrative continue below the main scene.

## Academic and institutional credits

- **The FlyWire Consortium** — connectomics and the Codex ecosystem.
- **Princeton University: Murthy Lab and Seung Lab** — FlyWire scientific contributions.
- **MRC Laboratory of Molecular Biology (LMB), Cambridge** — connectomics and MaleCNS collaboration.
- **HHMI Janelia Research Campus, FlyEM team** — specifically the **MaleCNS v1.0 dataset** and public anatomical release.
- **University of Cambridge Department of Zoology** and **Google Research** — MaleCNS dataset collaborators.
- **Polymarket** — Gamma, CLOB and Data APIs.

Primary sources: [MaleCNS downloads and licensing](https://male-cns.janelia.org/download/), [FlyWire Codex MCNS explorer](https://codex.flywire.ai/?dataset=mcns), [Polymarket documentation](https://docs.polymarket.com/). The Codex explorer and Janelia releases may expose different dataset versions; this repository's downloaded assets explicitly use Janelia v1.0. Institutional credit does not imply endorsement.

## License

Code: **MIT License, copyright 2026 Robillionair OÜ**, exclusively. See [LICENSE](LICENSE).

Anatomical meshes, skeletons, and derived outlines retain the upstream **CC-BY-4.0** license; MIT does not relicense that data. See [data attribution](public/data/ATTRIBUTION.md) and the source manifest. Third-party libraries retain their respective licenses.
