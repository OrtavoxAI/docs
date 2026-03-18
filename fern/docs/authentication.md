# Authentication

OrtaVox uses **API keys** to authenticate every request. There are two key types with different scopes and security requirements. Understanding the distinction is essential before you write your first line of integration code.

---

## API Key Types

| Property | Public Key | Secret Key |
|---|---|---|
| **Format** | `pk_live_...` | `sk_live_...` |
| **Use from** | Browser, mobile app | Server only |
| **Scope** | Web calls only | Full API access |
| **Rate limit** | 60 requests/min | 300 requests/min |
| **Safe to commit?** | No | No |
| **Safe to ship client-side?** | Yes | **Never** |

### Public Keys (`pk_live_...`)

Public keys are designed for use in environments where the key is visible to end users — browser JavaScript, React Native apps, or any client-side code. They are intentionally restricted to a narrow set of operations.

**Allowed operations:**
- `POST /v1/calls/web-call` — start a web call session for a pre-configured agent.

**Blocked operations:**
- Creating or modifying agents
- Initiating phone calls (inbound or outbound)
- Accessing analytics or call recordings
- Managing API keys
- All other server-side operations

### Secret Keys (`sk_live_...`)

Secret keys grant full access to the OrtaVox API. They must never appear in client-side code, browser network requests, build artifacts, public repositories, or environment files that are committed to source control.

**Allowed operations:** All endpoints.

<Warning>
If a secret key is exposed, rotate it immediately from **Settings → API Keys** in the dashboard. Leaked secret keys can be used to create agents, initiate calls, and access call transcripts and analytics on your account.
</Warning>

---

## Getting Your API Keys

1. Sign in at [app.ortavox.ai](https://app.ortavox.ai).
2. Navigate to **Settings → API Keys** in the sidebar.
3. Click **Create Key** and choose **Public** or **Secret**.
4. Copy the key immediately — it is shown only once at creation time.

Both key types are scoped to your organization. If you need separate keys for separate projects or environments, create distinct keys and label them clearly (e.g. `Production — Backend`, `Staging — Backend`).

---

## Using Your API Key

All requests are authenticated with a standard HTTP `Authorization` header using the `Bearer` scheme.

<CodeBlocks>
```typescript TypeScript
import Ortavox from 'ortavox';

// Server-side: use your secret key from an environment variable
const client = new Ortavox({
  apiKey: process.env.ORTAVOX_API_KEY, // sk_live_...
});

// Or pass it directly to fetch if not using the SDK
const response = await fetch('https://api.ortavox.ai/v1/agents', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.ORTAVOX_API_KEY}`,
    'Content-Type': 'application/json',
  },
});
```
```python Python
import os
from ortavox import Ortavox

# Server-side: use your secret key from an environment variable
client = Ortavox(api_key=os.environ["ORTAVOX_API_KEY"])  # sk_live_...

# Or use requests directly if not using the SDK
import requests

response = requests.get(
    "https://api.ortavox.ai/v1/agents",
    headers={
        "Authorization": f"Bearer {os.environ['ORTAVOX_API_KEY']}",
        "Content-Type": "application/json",
    },
)
```
```bash cURL
# Secret key for server-side requests
curl https://api.ortavox.ai/v1/agents \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json"

# Public key for browser-initiated web calls only
curl -X POST https://api.ortavox.ai/v1/calls/web-call \
  -H "Authorization: Bearer pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "agentId": "agent_01jk..." }'
```
</CodeBlocks>

---

## Environment Variable Best Practices

Store your keys in environment variables and load them via a `.env` file during local development. Never hardcode keys in source files.

**`.env` (local development — never commit this file)**

```bash
# OrtaVox API keys
ORTAVOX_API_KEY=sk_live_...          # Secret key for server-side operations
ORTAVOX_PUBLIC_KEY=pk_live_...       # Public key for browser/client use

# Optional: webhook signing secret (see Webhook Verification below)
ORTAVOX_WEBHOOK_SECRET=whsec_...
```

**`.gitignore` — ensure `.env` is excluded**

```
.env
.env.local
.env.*.local
```

<Tip>
In production, inject secrets via your platform's secret management — AWS Secrets Manager, Railway environment variables, Vercel environment variables, Kubernetes Secrets, etc. Do not use `.env` files in production containers.
</Tip>

**TypeScript / Node.js — loading with `dotenv`**

```typescript
import 'dotenv/config'; // npm install dotenv

import Ortavox from 'ortavox';

const client = new Ortavox({
  apiKey: process.env.ORTAVOX_API_KEY!,
});
```

**Python — loading with `python-dotenv`**

```python
from dotenv import load_dotenv  # pip install python-dotenv
import os

load_dotenv()

from ortavox import Ortavox

client = Ortavox(api_key=os.environ["ORTAVOX_API_KEY"])
```

---

## Webhook Signature Verification

When OrtaVox sends a webhook event to your endpoint, it includes an `x-ortavox-signature` header containing an HMAC-SHA256 signature of the raw request body. You must verify this signature before processing the payload.

**How the signature is computed:**

```
HMAC-SHA256(raw_request_body, ORTAVOX_WEBHOOK_SECRET)
```

The result is hex-encoded and sent in the `x-ortavox-signature` header.

Your webhook signing secret (`whsec_...`) is available in the dashboard under **Settings → Webhooks → Signing Secret**.

<Warning>
Always verify webhook signatures before processing events. An unverified webhook handler is an open endpoint — any actor can POST arbitrary data to it and trigger actions in your system.
</Warning>

<CodeBlocks>
```typescript TypeScript
import crypto from 'crypto';
import express from 'express';

const app = express();

// Use raw body parser — signature verification requires the exact raw bytes
app.use('/webhooks/ortavox', express.raw({ type: 'application/json' }));

app.post('/webhooks/ortavox', (req, res) => {
  const signature = req.headers['x-ortavox-signature'] as string;
  const secret = process.env.ORTAVOX_WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body.toString());

  switch (event.type) {
    case 'call.started':
      console.log('Call started:', event.data.callId);
      break;
    case 'call.ended':
      console.log('Call ended. Duration:', event.data.durationSeconds, 's');
      break;
    case 'call.failed':
      console.error('Call failed:', event.data.reason);
      break;
  }

  res.status(200).json({ received: true });
});

function verifyWebhookSignature(
  payload: Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}
```
```python Python
import hashlib
import hmac
import os

from fastapi import FastAPI, HTTPException, Request

app = FastAPI()


@app.post("/webhooks/ortavox")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("x-ortavox-signature", "")
    secret = os.environ["ORTAVOX_WEBHOOK_SECRET"]

    if not verify_webhook_signature(payload, signature, secret):
        raise HTTPException(status_code=401, detail="Invalid signature")

    import json
    event = json.loads(payload)

    if event["type"] == "call.started":
        print("Call started:", event["data"]["callId"])
    elif event["type"] == "call.ended":
        print("Call ended. Duration:", event["data"]["durationSeconds"], "s")
    elif event["type"] == "call.failed":
        print("Call failed:", event["data"]["reason"])

    return {"received": True}


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not signature or not secret:
        return False

    expected = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    # Use compare_digest to prevent timing attacks
    return hmac.compare_digest(signature, expected)
```
</CodeBlocks>

<Note>
Always use a constant-time comparison function (`crypto.timingSafeEqual` in Node.js, `hmac.compare_digest` in Python) when comparing signatures. Standard string equality (`===`, `==`) is vulnerable to timing attacks.
</Note>

---

## Error Responses

Authentication failures return standard HTTP error codes. All error responses share the same JSON shape:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key.",
  "statusCode": 401
}
```

| Status Code | Error | Cause | Resolution |
|---|---|---|---|
| `401 Unauthorized` | `Invalid or missing API key` | The `Authorization` header is absent, malformed, or the key has been deleted. | Check that the header is present and the key is valid in your dashboard. |
| `403 Forbidden` | `Public keys cannot access this endpoint` | A `pk_live_...` key was used on a server-only endpoint (e.g. creating an agent or initiating a phone call). | Move this operation to your backend and use a secret key. |
| `429 Too Many Requests` | `Rate limit exceeded` | Your key has exceeded 60 req/min (public) or 300 req/min (secret). | Inspect the `Retry-After` response header and back off for the indicated number of seconds. |

**Rate limit headers** — included on every response:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1740499200
Retry-After: 12          (only present on 429 responses)
```

`X-RateLimit-Reset` is a Unix timestamp (UTC) indicating when the current rate limit window resets.

---

## Key Rotation

Rotate secret keys periodically or immediately if a key is suspected to be compromised:

1. In the dashboard, navigate to **Settings → API Keys**.
2. Click **Create Key** and create a new secret key.
3. Update the `ORTAVOX_API_KEY` environment variable in all environments using the new key.
4. Verify your services are healthy on the new key.
5. Return to the dashboard and **Delete** the old key.

<Info>
OrtaVox does not enforce automatic key expiry, but a 90-day rotation schedule is recommended for production secret keys as a security best practice.
</Info>

---

## Next Steps

- [API Quickstart](/docs/quickstart-api) — create an agent and start a call using your key.
- [Webhooks](/docs/webhooks) — configure your webhook endpoint and explore all event types.
- [API Reference](/api) — full schema documentation for every endpoint.
