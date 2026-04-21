## POS Hub (offline LAN bridge)

This is a lightweight local service intended to run on a **server PC on the same LAN/Wi‑Fi** as your tills.

It provides a stable place to integrate **local hardware** (PDQ terminals, printers, cash drawers) and to support **offline** operation when the internet is down.

### Run

From the repo root:

```bash
node pos-hub/server.mjs
```

The default port is `8787`. Override with:

```bash
PORT=8787 node pos-hub/server.mjs
```

### Endpoints

- `GET /health`: health check
- `GET /info`: hub identity + LAN IPs + queue status
- `GET /sync/status`: hub sync status (queue size + last sync)
- `POST /sync/run`: trigger hub sync (requires env vars)
- `GET /pdq/terminals?provider=dojo&status=Available`: list Dojo terminals (optionally filtered by status)
- `POST /pdq/start-sale`: start a PDQ sale (returns paymentIntentId + terminalSessionId)
- `GET /pdq/status?paymentIntentId=...`: poll Dojo payment status
- `PUT /pdq/cancel-session?terminalSessionId=...`: request cancellation of a terminal session
- `GET /pdq/session?terminalSessionId=...`: retrieve terminal session (includes SignatureVerificationRequired)
- `PUT /pdq/signature?terminalSessionId=...`: submit signature acceptance/rejection
- `POST /print/raw`: send raw text to a network printer (TCP, default port 9100)
- `POST /pdq/sale`: stub PDQ sale (queues request to `pos-hub/data/queue.jsonl`)
- `POST /pdq/refund`: stub PDQ refund (queues request to `pos-hub/data/queue.jsonl`)
- `POST /queue/billUpsert`: queue bill upsert for later sync
- `POST /queue/paymentTransaction`: queue payment transaction for later sync
- `POST /queue/paymentTransactionUpdate`: queue payment transaction update (e.g. void payment) for later sync
- `GET /queue/tail?limit=25`: view last queued items

### Configure in the app

In the app:

- `POS → Settings → Offline / Hub`: set **Hub Base URL** (example: `http://192.168.1.10:8787`) and enable hub.
- `POS → Settings → Integrations → PDQ (LAN via POS Hub)`: enable PDQ and optionally set PDQ parameters (terminal IP/port).

### Dojo (PDQ provider) configuration

The hub implements **Dojo Pay at Counter** using the Dojo API (`https://api.dojo.tech/`).

Set these environment variables on the hub PC:

- `DOJO_SECRET_KEY`: your Dojo secret key (example prefixes: `sk_sandbox_` or `sk_prod_`)
- `DOJO_VERSION`: API version (defaults to `2025-09-10`)
- `DOJO_RESELLER_ID`: required header for terminal APIs
- `DOJO_SOFTWARE_HOUSE_ID`: required header for terminal APIs
- `DOJO_TERMINAL_ID`: optional default terminalId (you can also set terminalId in the POS PDQ integration config)

In the app:

- `POS → Settings → Integrations → PDQ (LAN via POS Hub)`:
  - Provider: **Dojo**
  - Terminal ID: `tm_...`

### Sync queued operations back to Firebase (when internet returns)

The hub keeps an offline queue in `pos-hub/data/queue.jsonl`. When you have internet again, you can replay that queue into Firebase RTDB.

1) Install hub deps (once):

```bash
cd pos-hub
npm install
```

2) Set env vars:

- `GOOGLE_APPLICATION_CREDENTIALS`: path to a Firebase Admin service account JSON file
- `FIREBASE_DATABASE_URL`: your RTDB URL (example: `https://your-project-id.firebaseio.com`)

3) Run sync:

```bash
cd pos-hub
npm run sync
```

On success, the queue file is archived to `pos-hub/data/queue.synced.<timestamp>.jsonl`.

