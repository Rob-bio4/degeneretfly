# Local streamer setup

## Adam + Qwen

From this repository, run `npm ci`, then `npm run setup:models`. The first setup downloads roughly 0.9 GB plus tokenizer assets into ignored `.models/`. Internet is needed for that download; inference subsequently runs on your CPU in separate Node workers. Allow several GB of free RAM. Run `npm run dev`, open http://localhost:4173/ and click **Enable Adam** to unlock audio. Browser autoplay rules require this interaction, including through OBS's Interact window.

Models: `onnx-community/Qwen2.5-0.5B-Instruct`, **q4**, and `onnx-community/Kokoro-82M-v1.0-ONNX`, **q8**, voice **am_adam**. `node scripts/check-models.mjs` performs a real inference/audio smoke test. This tiny language model has limited reasoning and may produce weak replies; it never controls execution or learning weights. No Ollama process is required.

Only one turn generates/speaks at a time. Trade announcements take priority after the current sentence; viewer replies remain FIFO. When chat is quiet, the fly describes live book conditions, upcoming prediction checks, scored lessons and its local ledger, with occasional “Hey chat” greetings and synchronized waves. Mute stops playback. A voice backlog pauses new entries but does not block risk exits. Only the primary browser speaks/trades; other browsers read its shared ledger. Pending speech/chat queues are session memory, not a durable inbox; leave the primary browser instance running. Capture that browser's audio in OBS and avoid duplicating it through desktop audio.

## Kick chat

The integration reads official signed `chat.message.sent` webhooks. It speaks replies on stream; it does not post text messages to Kick or accept chat trading commands.

1. Create an application in your Kick account's developer settings. Follow the [official Kick developer documentation](https://docs.kick.com/).
2. Create a local `.env` file containing `KICK_BROADCASTER_USER_ID=YOUR_NUMERIC_CHANNEL_USER_ID`. Restart the app after changing it.
3. Provide a public HTTPS tunnel to **127.0.0.1:4174 only** using your tunnel provider. Set the Kick application's webhook URL to `https://YOUR-TUNNEL/kick/webhook`, and enable webhooks. Do not expose port 4173: it contains local inference and the development UI.
4. Obtain an authorized access token following Kick's OAuth documentation, with the permissions required for event subscriptions. Never put a token in browser code or Git.
5. Using the [official event subscriptions endpoint](https://docs.kick.com/events/subscribe-to-events), subscribe to `chat.message.sent`, version `1`, method `webhook`, for your broadcaster user ID. Check existing subscriptions first to avoid duplicates. Its POST body is:

```json
{"broadcaster_user_id":123456,"events":[{"name":"chat.message.sent","version":1}],"method":"webhook"}
```

Replace `123456` with your ID. The endpoint is `https://api.kick.com/public/v1/events/subscriptions`; authenticate using your authorized Bearer token in a local API client. Keep the tunnel and local server running.

6. Send a real chat message in your channel. The HUD should change from waiting to received chat, show a reply queue, and Adam should answer after the current turn. Test two different messages to confirm order. No channel credentials are included in this repository.

The webhook listener checks Kick's RSA signature, timestamp freshness and broadcaster ID, deduplicates message IDs, and retains up to 1,000 recent messages. The browser buffers up to 100 replies. High-volume chat can exceed retention; the UI reports detected gaps, not a guarantee that every historical message was answered. HTTPS, tunnel availability and a real Kick account are required for end-to-end verification. Automated tests verify signatures and tamper rejection, not live Kick delivery.

## Learning and movement

The fly remains seated, returning its hands to the keyboard between gestures. ACh modulates attention/typing; octopamine drives twitch/wing arousal; serotonin damps restless motion; dopamine affects expressive nods. Profitable exits trigger raised-arm celebrations; losing exits trigger tabletop slams. Idle cycles add screen-leaning and antenna grooming. Mouth motion and bigger nods follow playback. These are model indices, not hormone concentrations.

History, cash, holdings, predictor weights and completed lessons now live in `.runtime/ledger.json`, shared across browsers on this PC using the same server. That local file is excluded from Git. Open the existing browser first on upgrade to migrate its old history. Keep a backup of the file; no cloud account stores it. Pending prediction windows restart after a page reload. See README's persistence section for ownership and save timing.

Market dwell is three minutes so sixty-second predictions can mature. Pending lessons expire after gaps, rather than being scored against a much later price. The completed counter advances only after a valid later same-market observation. Open positions hold market focus until an exit; risk rules may close after sixty seconds. A bounded $2 pressure-exploration path provides learning opportunities alongside learned-edge entries. A descending model spike still gates every fill. Learning does not guarantee profit.

See [scientific extraction setup](CONNECTOME.md) for authentic MaleCNS connectivity. It is a separate Phase 1 export, not yet the running conductance network.
