# Webhooks

Receive real-time HTTP notifications when call events occur in your OrtaVox account.

## What Are Webhooks?

Webhooks are HTTP POST requests that OrtaVox sends to a URL you control whenever a significant event occurs — a call starts, ends, fails, a tool is invoked, or a campaign completes. Instead of polling the API to check call status, your backend receives events the moment they happen.

**Common uses:**

- Persist call transcripts and metrics to your database after `call.ended`
- Update CRM records when a call completes or fails
- Trigger follow-up workflows (send an SMS recap, create a support ticket, update a contact's status)
- Push real-time events to your analytics stack (Datadog, Segment, Mixpanel)
- Alert your team when an `agent.error` occurs
- Log tool invocations from `tool.called` events for audit purposes

---

## Setup

You can configure a global webhook URL that receives all events, or set a per-agent webhook URL that only receives events for that agent.

### Global Webhook (Recommended)

Configure in **Dashboard → Settings → Webhooks → Add Endpoint**, or via the API:

```bash
curl -X POST https://api.ortavox.ai/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "url": "https://api.yourdomain.com/webhooks/ortavox",
    "events": ["call.started", "call.ended", "call.failed", "agent.error", "campaign.completed"],
    "description": "Production webhook"
  }'
```

### Per-Agent Webhook

Set `webhookUrl` on an agent to override the global URL for that agent's events:

```bash
curl -X PATCH https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{ "webhookUrl": "https://api.yourdomain.com/webhooks/support-agent" }'
```

<Note>
If both a global webhook URL and a per-agent webhook URL are configured, OrtaVox sends the event to both endpoints.
</Note>

---

## All Events

| Event | When Fired |
|---|---|
| `call.initiated` | Outbound call created in OrtaVox, before dialing begins. Includes `scheduledAt` if the call is scheduled. |
| `call.started` | Call connected and the agent has begun speaking. Fired for inbound, outbound, and web calls. |
| `call.ended` | Call ended for any reason. Full transcript, metrics, cost breakdown, and termination reason included. |
| `call.failed` | Call could not connect (no answer, busy, invalid number, carrier error). |
| `agent.error` | Agent threw an unrecoverable error during a live call (LLM timeout, TTS provider failure, etc.). |
| `tool.called` | Agent invoked a function tool during a call. Includes tool name, input parameters, and the tool's return value. |
| `tool.completed` | Tool execution finished. Fired after OrtaVox receives the tool's response and the agent resumes speaking. |
| `campaign.started` | A bulk campaign began dialing. |
| `campaign.paused` | A running campaign was paused. |
| `campaign.resumed` | A paused campaign resumed. |
| `campaign.completed` | All contacts in a campaign have been attempted. Includes aggregate result counts. |

---

## Payload Structure

All webhook payloads share a common envelope:

```json
{
  "event": "call.ended",
  "timestamp": "2026-02-25T14:05:37Z",
  "accountId": "acc_112233",
  ...event-specific fields...
}
```

### call.initiated

```json
{
  "event": "call.initiated",
  "timestamp": "2026-02-25T14:00:00Z",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "direction": "outbound",
  "toNumber": "+14155551234",
  "fromNumber": "+18005559999",
  "scheduledAt": null,
  "metadata": {
    "contactId": "crm_8821",
    "campaignId": "camp_abc789"
  }
}
```

### call.started

```json
{
  "event": "call.started",
  "timestamp": "2026-02-25T14:00:08Z",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "direction": "outbound",
  "toNumber": "+14155551234",
  "fromNumber": "+18005559999",
  "metadata": {
    "contactId": "crm_8821"
  }
}
```

### call.ended

The richest payload — includes transcript, metrics, cost, and termination reason.

```json
{
  "event": "call.ended",
  "timestamp": "2026-02-25T14:05:37Z",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "direction": "outbound",
  "toNumber": "+14155551234",
  "fromNumber": "+18005559999",
  "durationMs": 329000,
  "terminationReason": "user_hangup",
  "sentiment": "positive",
  "metadata": {
    "contactId": "crm_8821",
    "campaignId": "camp_abc789"
  },
  "transcript": [
    {
      "role": "agent",
      "text": "Hi Alice, I'm an AI assistant calling from Riverside Clinic. I'm reaching out about your appointment tomorrow at 10 AM with Dr. Kim. Are you still able to make it?",
      "startMs": 0,
      "durationMs": 7200
    },
    {
      "role": "user",
      "text": "Yes, I'll be there.",
      "startMs": 8400,
      "durationMs": 1800
    },
    {
      "role": "agent",
      "text": "Wonderful! We'll see you tomorrow. Have a great day.",
      "startMs": 10800,
      "durationMs": 3100
    }
  ],
  "metrics": {
    "turnCount": 3,
    "interruptionCount": 0,
    "agentSpeakingRatio": 0.61,
    "sttLatencyMs": { "mean": 178, "p50": 170, "p95": 260 },
    "llmTtftMs": { "mean": 215, "p50": 200, "p95": 370 },
    "ttsTtfbMs": { "mean": 88, "p50": 85, "p95": 120 },
    "e2eLatencyMs": { "mean": 481, "p50": 460, "p95": 690 }
  },
  "cost": {
    "llm": 0.00041,
    "tts": 0.19,
    "stt": 0.0052,
    "infrastructure": 0.018,
    "total": 0.21361
  },
  "quality": {
    "score": 94,
    "grade": "excellent",
    "components": {
      "responsiveness": 96,
      "naturalness": 92
    }
  }
}
```

### call.failed

```json
{
  "event": "call.failed",
  "timestamp": "2026-02-25T14:00:45Z",
  "callId": "call_fail_001",
  "agentId": "agent_abc123",
  "direction": "outbound",
  "toNumber": "+14155550000",
  "fromNumber": "+18005559999",
  "failureReason": "no_answer",
  "attempts": 1,
  "metadata": {
    "contactId": "crm_8823"
  }
}
```

### agent.error

```json
{
  "event": "agent.error",
  "timestamp": "2026-02-25T14:02:11Z",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "error": {
    "code": "LLM_TIMEOUT",
    "message": "OpenAI API did not respond within 30 seconds",
    "provider": "openai",
    "retryable": true
  }
}
```

### tool.called

```json
{
  "event": "tool.called",
  "timestamp": "2026-02-25T14:03:22Z",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "toolCallId": "tc_99887",
  "toolName": "check_appointment_availability",
  "parameters": {
    "date": "2026-03-05",
    "time": "10:00",
    "doctorId": "dr_kim"
  },
  "response": {
    "available": true,
    "confirmationCode": "APPT-4421"
  },
  "durationMs": 312
}
```

### campaign.completed

```json
{
  "event": "campaign.completed",
  "timestamp": "2026-02-25T22:48:00Z",
  "campaignId": "camp_abc789",
  "name": "February Appointment Reminders",
  "results": {
    "totalContacts": 500,
    "answered": 342,
    "voicemail": 87,
    "noAnswer": 51,
    "failed": 12,
    "pending": 0
  },
  "totalCost": 48.72,
  "completedAt": "2026-02-25T22:48:00Z"
}
```

---

## Security — Signature Verification

Every webhook request from OrtaVox includes an `x-ortavox-signature` header containing an HMAC-SHA256 signature of the raw request body. You must verify this signature before processing any event.

**Header format:**

```
x-ortavox-signature: sha256=3a7b9c2d4e1f...
```

The signature is computed as:

```
HMAC-SHA256(webhookSigningSecret, rawRequestBody)
```

Your signing secret is available in **Dashboard → Settings → Webhooks → [your endpoint] → Signing Secret**.

### Verification Code

<Tabs>
<Tab title="TypeScript (Express)">
```typescript
import express from "express";
import crypto from "crypto";

const app = express();

function verifyOrtavoxSignature(
  rawBody: Buffer,
  signatureHeader: string,
  signingSecret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(rawBody)
    .digest("hex");

  const received = signatureHeader.replace("sha256=", "");

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    );
  } catch {
    return false; // buffers differ in length
  }
}

app.post(
  "/webhooks/ortavox",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-ortavox-signature"] as string;

    if (
      !signature ||
      !verifyOrtavoxSignature(
        req.body,
        signature,
        process.env.ORTAVOX_WEBHOOK_SECRET!
      )
    ) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());
    console.log("Received verified event:", event.event);

    // Handle events
    switch (event.event) {
      case "call.ended":
        handleCallEnded(event);
        break;
      case "call.failed":
        handleCallFailed(event);
        break;
      case "agent.error":
        handleAgentError(event);
        break;
      // ... other events
    }

    // Respond with 2xx within 10 seconds
    res.status(200).json({ received: true });
  }
);

async function handleCallEnded(event: any) {
  await db.calls.upsert({
    where: { callId: event.callId },
    create: {
      callId: event.callId,
      agentId: event.agentId,
      durationMs: event.durationMs,
      terminationReason: event.terminationReason,
      sentiment: event.sentiment,
      qualityScore: event.quality.score,
      transcript: JSON.stringify(event.transcript),
      totalCost: event.cost.total,
      endedAt: new Date(event.timestamp),
    },
    update: { /* same fields */ },
  });
}
```
</Tab>
<Tab title="Python (FastAPI)">
```python
import hashlib
import hmac
import json
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

def verify_ortavox_signature(
    raw_body: bytes,
    signature_header: str,
    signing_secret: str,
) -> bool:
    expected = hmac.new(
        signing_secret.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    received = signature_header.replace("sha256=", "")

    return hmac.compare_digest(expected, received)


@app.post("/webhooks/ortavox")
async def handle_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("x-ortavox-signature", "")

    if not verify_ortavox_signature(
        raw_body,
        signature,
        os.environ["ORTAVOX_WEBHOOK_SECRET"],
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(raw_body)
    event_type = event.get("event")
    print(f"Received verified event: {event_type}")

    if event_type == "call.ended":
        await handle_call_ended(event)
    elif event_type == "call.failed":
        await handle_call_failed(event)
    elif event_type == "agent.error":
        await handle_agent_error(event)

    # Respond with 2xx within 10 seconds
    return JSONResponse({"received": True})


async def handle_call_ended(event: dict):
    await db.calls.upsert(
        call_id=event["callId"],
        agent_id=event["agentId"],
        duration_ms=event["durationMs"],
        termination_reason=event["terminationReason"],
        sentiment=event.get("sentiment"),
        quality_score=event["quality"]["score"],
        transcript=event["transcript"],
        total_cost=event["cost"]["total"],
    )


async def handle_call_failed(event: dict):
    print(f"Call {event['callId']} failed: {event['failureReason']}")
    await notify_crm(
        contact_id=event.get("metadata", {}).get("contactId"),
        status="call_failed",
        reason=event["failureReason"],
    )
```
</Tab>
</Tabs>

<Warning>
Always use `crypto.timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) for signature comparison. Standard string equality (`===` or `==`) is vulnerable to timing attacks that can allow an attacker to forge valid signatures.
</Warning>

---

## Retry Logic

If your endpoint does not return a `2xx` response, OrtaVox automatically retries the delivery on this schedule:

| Attempt | Delay After Previous |
|---|---|
| Initial delivery | Immediately when event fires |
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |

After 4 total attempts (initial + 3 retries) without a `2xx` response, the delivery is marked as failed. Failed deliveries are visible in **Dashboard → Settings → Webhooks → [endpoint] → Delivery Log**.

**Conditions that trigger a retry:**

- HTTP status code outside the `2xx` range (including `3xx` redirects — OrtaVox does not follow redirects)
- Response takes longer than **10 seconds** (request times out)
- Network-level error (DNS failure, connection refused, TLS error)

### Handling Duplicates

Because retries can cause the same event to be delivered more than once (for example, if your server processes the event but crashes before responding), design your webhook handler to be **idempotent**. Use the `callId` (or `campaignId`, `toolCallId`, etc.) as an idempotency key:

```typescript
async function handleCallEnded(event: any) {
  // Upsert rather than insert — safe to call multiple times with the same callId
  await db.callResults.upsert({
    where: { callId: event.callId },
    create: { ...mapEventToRecord(event) },
    update: { ...mapEventToRecord(event) },
  });
}
```

---

## Responding to Webhooks

Your endpoint must:

1. Return an HTTP `2xx` status code within **10 seconds**
2. Return any response body (OrtaVox ignores the body content)

**Process events asynchronously.** If your event handling logic takes more than a few seconds (database writes, third-party API calls), acknowledge the webhook immediately and process in the background:

```typescript
app.post("/webhooks/ortavox", express.raw({ type: "application/json" }), (req, res) => {
  // Verify signature synchronously
  const event = JSON.parse(req.body.toString());

  // Acknowledge immediately — do not wait for processing
  res.status(200).json({ received: true });

  // Process asynchronously (queue, worker, etc.)
  eventQueue.push(event);
});
```

---

## Testing Webhooks

### Local Development with ngrok

Expose your local server to the internet during development:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

ngrok prints a public URL like `https://abc123.ngrok-free.app`. Use this as your webhook URL when registering with OrtaVox. The ngrok web inspector at [localhost:4040](http://localhost:4040) lets you inspect payloads and replay deliveries.

### Webhook.site

For quick testing without running a local server, use [webhook.site](https://webhook.site). Copy the unique URL it gives you, register it with OrtaVox, and observe incoming payloads in your browser.

### Trigger a Test Event

Send a test `webhook.test` ping to your endpoint from the dashboard:

1. Go to **Dashboard → Settings → Webhooks**
2. Click your endpoint
3. Click **Send Test Event**

OrtaVox sends a minimal payload:

```json
{
  "event": "webhook.test",
  "timestamp": "2026-02-25T14:00:00Z",
  "message": "This is a test webhook delivery from OrtaVox."
}
```

Your endpoint should return `200` and log the received payload. If it does, your signature verification and endpoint routing are working correctly.

### Replay a Failed Delivery

If a delivery fails, you can manually replay it from the dashboard:

1. Go to **Dashboard → Settings → Webhooks → [endpoint] → Delivery Log**
2. Find the failed delivery
3. Click **Replay**

This re-sends the exact original payload with the same signature — useful for recovering from a temporary outage in your webhook handler.
