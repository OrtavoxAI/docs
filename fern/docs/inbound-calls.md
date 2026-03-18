# Inbound Calls

Route incoming phone calls to your OrtaVox voice agent via SIP.

## How It Works

When someone dials your phone number, your telephony provider (Twilio, Telnyx, etc.) needs to know where to send the call. You configure your provider to forward incoming calls to OrtaVox's SIP ingress endpoint. OrtaVox receives the call, looks up which agent is mapped to that inbound profile, and connects the caller to the agent.

```
Caller dials your number
         │
         ▼
  Your Phone Provider  (Twilio / Telnyx / Vonage)
  (receives PSTN call)
         │
         │  SIP INVITE → https://sip.ortavox.ai/inbound/{profile_id}
         ▼
  OrtaVox SIP Ingress
  (authenticates, routes)
         │
         ▼
  Your Agent  (begins greeting, STT/LLM/TTS pipeline active)
         │
         ▼
  Caller hears agent voice
```

---

## Prerequisites

- A phone number provisioned with Twilio, Telnyx, Vonage, or a SIP trunk provider
- An OrtaVox agent created and configured ([create one in the dashboard](https://app.ortavox.ai/agents) or via `POST /v1/agents/create`)
- Your secret API key (`sk_live_...`) from **Dashboard → Developer → API Keys**

---

## Step 1 — Create an Inbound Profile

An inbound profile maps an OrtaVox agent to a SIP entry point. Each profile gets a unique webhook URL you configure at your provider.

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const profile = await client.phone.createInboundProfile({
  name: "Customer Support Line",
  agentId: "agent_abc123",
});

console.log("SIP Webhook URL:", profile.data.sipWebhookUrl);
// https://sip.ortavox.ai/inbound/prof_7x9k2m
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

profile = client.phone.create_inbound_profile(
    name="Customer Support Line",
    agent_id="agent_abc123",
)

print("SIP Webhook URL:", profile.data.sip_webhook_url)
# https://sip.ortavox.ai/inbound/prof_7x9k2m
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/phone/inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "name": "Customer Support Line",
    "agentId": "agent_abc123"
  }'
```
</Tab>
</Tabs>

**Response:**

```json
{
  "data": {
    "profileId": "prof_7x9k2m",
    "name": "Customer Support Line",
    "agentId": "agent_abc123",
    "sipWebhookUrl": "https://sip.ortavox.ai/inbound/prof_7x9k2m",
    "status": "active",
    "createdAt": "2026-02-25T10:00:00Z"
  }
}
```

---

## Step 2 — Get Your SIP Webhook URL

Your SIP webhook URL has the format:

```
https://sip.ortavox.ai/inbound/{profile_id}
```

Copy this URL. You will paste it into your telephony provider's configuration in Step 3.

---

## Step 3 — Configure Your Provider

### Twilio

Twilio can forward inbound calls to OrtaVox using either a TwiML webhook or a SIP domain. The TwiML webhook approach is simpler and recommended for most setups.

**Option A — TwiML Webhook (Recommended)**

1. Open [console.twilio.com](https://console.twilio.com) and navigate to **Phone Numbers → Manage → Active Numbers**
2. Click your phone number
3. Under **Voice & Fax**, set **A Call Comes In** to **Webhook**
4. Paste your OrtaVox SIP webhook URL into the URL field:
   ```
   https://sip.ortavox.ai/inbound/prof_7x9k2m
   ```
5. Set the HTTP method to **HTTP POST**
6. Click **Save**

OrtaVox will receive the Twilio webhook, accept the call, and connect your agent.

**Option B — TwiML App (Programmatic)**

If you prefer to control call routing in code, create a TwiML App that points to your OrtaVox webhook:

```typescript
// Generate TwiML that forwards to OrtaVox
// (host this at your own URL and point Twilio to it)
import twilio from "twilio";

const response = new twilio.twiml.VoiceResponse();
response.connect().stream({
  url: "wss://sip.ortavox.ai/inbound/prof_7x9k2m",
});

console.log(response.toString());
```

---

### Telnyx

1. Log in to [telnyx.com/sign-in](https://telnyx.com/sign-in) and go to **Voice → SIP Connections**
2. Create a new SIP Connection or open an existing one
3. Under **Inbound**, set **Webhook URL** to your OrtaVox SIP webhook URL:
   ```
   https://sip.ortavox.ai/inbound/prof_7x9k2m
   ```
4. Set the **Webhook API Version** to **API v2**
5. Assign the SIP Connection to your phone number under **Numbers → My Numbers**

---

### Vonage (Nexmo)

1. Open [dashboard.nexmo.com](https://dashboard.nexmo.com) and go to **Numbers → Your Numbers**
2. Click **Edit** next to the number you want to use
3. Set **Inbound Webhook URL** to:
   ```
   https://sip.ortavox.ai/inbound/prof_7x9k2m
   ```
4. Save the changes

---

### Generic SIP Trunk

For any RFC 3261-compliant SIP provider, configure your trunk to send an INVITE to:

```
sip:inbound@sip.ortavox.ai:5061;profile=prof_7x9k2m
```

OrtaVox requires:
- TLS transport (port 5061)
- SRTP for media encryption
- Standard SIP re-INVITE for hold/resume support

---

## Call Metadata

When a call arrives, OrtaVox automatically captures and attaches the following metadata to the call session and all related webhook events:

| Field | Description | Example |
|---|---|---|
| `callerNumber` | The E.164 number that dialed in | `+14155551234` |
| `calledNumber` | Your phone number that was dialed | `+18005559999` |
| `callId` | OrtaVox-generated unique call identifier | `call_xyz789` |
| `profileId` | The inbound profile that handled the call | `prof_7x9k2m` |
| `timestamp` | ISO 8601 UTC timestamp when the call was received | `2026-02-25T14:30:00Z` |
| `provider` | The detected telephony provider | `twilio` |

This metadata is available in:
- The `call.started` webhook payload
- The `call.ended` webhook payload (including transcript and metrics)
- `GET /v1/calls/{callId}` API response

---

## Dynamic Routing

Static inbound profiles always route to the same agent. Dynamic routing lets you route different callers to different agents at runtime — based on caller ID, time of day, IVR selection, or any logic you choose.

To use dynamic routing, omit `agentId` from the inbound profile and provide a `serverUrl` instead. When a call arrives, OrtaVox POSTs the call details to your `serverUrl` and uses the `agentId` your server returns.

### Create a Dynamic Inbound Profile

<Tabs>
<Tab title="TypeScript">
```typescript
const profile = await client.phone.createInboundProfile({
  name: "Dynamic Support Router",
  serverUrl: "https://api.yourdomain.com/ortavox/route",
  // No agentId — OrtaVox will ask your server
});
```
</Tab>
<Tab title="Python">
```python
profile = client.phone.create_inbound_profile(
    name="Dynamic Support Router",
    server_url="https://api.yourdomain.com/ortavox/route",
    # No agent_id — OrtaVox will ask your server
)
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/phone/inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "name": "Dynamic Support Router",
    "serverUrl": "https://api.yourdomain.com/ortavox/route"
  }'
```
</Tab>
</Tabs>

### Implement the Routing Endpoint

OrtaVox sends a `POST` request to your `serverUrl` with these fields:

```json
{
  "callId": "call_xyz789",
  "callerNumber": "+14155551234",
  "calledNumber": "+18005559999",
  "timestamp": "2026-02-25T14:30:00Z",
  "profileId": "prof_7x9k2m"
}
```

Your server must respond within **3 seconds** with the `agentId` to use for this call:

<Tabs>
<Tab title="TypeScript">
```typescript
import express from "express";

const app = express();
app.use(express.json());

// Business hours: 8am–6pm ET Mon–Fri
function isBusinessHours(): boolean {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const hour = et.getHours();
  const day = et.getDay(); // 0 = Sun, 6 = Sat
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
}

app.post("/ortavox/route", async (req, res) => {
  const { callerNumber, calledNumber } = req.body;

  // Route VIP callers to dedicated agent
  const vipNumbers = ["+14155557777", "+14155558888"];
  if (vipNumbers.includes(callerNumber)) {
    return res.json({ agentId: "agent_vip_concierge" });
  }

  // Route by time of day
  if (isBusinessHours()) {
    return res.json({ agentId: "agent_live_support" });
  } else {
    return res.json({
      agentId: "agent_after_hours",
      // Optionally inject metadata for the agent
      metadata: { afterHours: true },
    });
  }
});
```
</Tab>
<Tab title="Python">
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from datetime import datetime
import pytz

app = FastAPI()

VIP_NUMBERS = {"+14155557777", "+14155558888"}

def is_business_hours() -> bool:
    et = pytz.timezone("America/New_York")
    now = datetime.now(et)
    return now.weekday() < 5 and 8 <= now.hour < 18  # Mon–Fri, 8am–6pm ET

@app.post("/ortavox/route")
async def route_call(request: Request):
    body = await request.json()
    caller = body.get("callerNumber")

    if caller in VIP_NUMBERS:
        return JSONResponse({"agentId": "agent_vip_concierge"})

    if is_business_hours():
        return JSONResponse({"agentId": "agent_live_support"})
    else:
        return JSONResponse({
            "agentId": "agent_after_hours",
            "metadata": {"afterHours": True},
        })
```
</Tab>
</Tabs>

If your routing server is unreachable or returns an error, OrtaVox will reject the call with a busy signal. Always deploy your routing endpoint with high availability.

<Tip>
You can also return additional `metadata` from your routing endpoint. This metadata will be injected into the call session and available in all webhook payloads, identical to metadata passed at call creation time.
</Tip>

---

## Managing Inbound Profiles

### List All Profiles

```bash
curl https://api.ortavox.ai/v1/phone/inbound \
  -H "Authorization: Bearer sk_live_..."
```

### Update a Profile

```bash
curl -X PATCH https://api.ortavox.ai/v1/phone/inbound/prof_7x9k2m \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{ "agentId": "agent_new_456" }'
```

### Disable a Profile

Set `status: "inactive"` to stop OrtaVox from accepting calls on this profile without deleting it.

```bash
curl -X PATCH https://api.ortavox.ai/v1/phone/inbound/prof_7x9k2m \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{ "status": "inactive" }'
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Caller hears fast busy or silence | SIP webhook URL not configured at provider | Verify your provider's webhook URL points to `https://sip.ortavox.ai/inbound/{profile_id}` |
| Agent doesn't answer | Profile status is `inactive` | Set profile status to `active` via `PATCH /v1/phone/inbound/{profileId}` |
| Dynamic routing timeout | Your server took > 3 seconds to respond | Optimize your routing logic; consider caching agent lookups |
| Routing endpoint returning 500 | Bug in your routing server | Check your server logs; OrtaVox will use busy signal as fallback |
| Caller ID shows "Unknown" | Provider not passing `From` header | Check your Twilio/Telnyx SIP settings to ensure caller ID passthrough is enabled |
| Call drops immediately | TLS or SRTP mismatch | Ensure your SIP trunk is configured for TLS on port 5061 and SRTP for media |
