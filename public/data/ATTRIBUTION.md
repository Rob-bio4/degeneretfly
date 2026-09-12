# MaleCNS v1.0 anatomical assets

90 full-brain ROI compartment meshes, 42 sampled SWC neuron skeletons, and
derived 28-degree mesh-edge buffers. Exact filenames, body IDs, labels and
source metadata are recorded in `anatomy.json`. SWCs use 8 nm voxels; ROI
coordinates use nanometers. `.edges` files are derived float32 line endpoints
computed by `scripts/prepare-anatomy.mjs`; original meshes remain unmodified.

Source: https://male-cns.janelia.org/download/
Public release: https://storage.googleapis.com/flyem-male-cns/
License: Creative Commons Attribution 4.0 International (CC-BY-4.0).
https://creativecommons.org/licenses/by/4.0/

Credit HHMI Janelia Research Campus, FlyEM team, specifically MaleCNS v1.0;
MRC Laboratory of Molecular Biology (LMB), Cambridge; University of Cambridge
Department of Zoology; and Google Research. Also acknowledge The FlyWire
Consortium and Princeton University (Murthy Lab and Seung Lab) for the broader
connectomics and Codex ecosystem. These credits do not imply endorsement.

DNge104_R body 12781 and DNge104_L body 556329 are included. Other skeletons
are a deterministic sample, not an exhaustive reconstruction or imported
connectivity circuit. Activity overlays originate in project code, not in
experimental activity recordings.

Project code: MIT, copyright 2026 Robillionair OÜ. Market data credit:
Polymarket Gamma, CLOB and Data APIs. Code licensing does not replace the
anatomical data license.
