# Post-Call Analysis

**Automatically extract structured, typed data from every call transcript — no manual review required.**

---

## What Is Post-Call Analysis?

Post-call analysis is a built-in OrtaVox feature that runs a structured extraction pass against every call transcript after the call ends. You configure a list of extraction tasks on your agent — each task specifying a field name, data type, and optional description or enum values — and OrtaVox automatically produces a typed JSON object for every completed call.

The analysis is performed by an LLM that reads the full call transcript and extracts exactly the fields you defined. Results are delivered two ways:

1. **Webhook** — included in the `call.ended` event payload under the `analysis` key. This is the recommended integration pattern.
2. **API** — available at `GET /v1/calls/{callId}/analysis` at any point after the call ends.

**Common use cases:**
- Automatically update CRM fields (deal stage, outcome, next action) after every sales call
- Route callbacks to the right queue based on extracted callback date and reason
- Monitor quality metrics (sentiment, resolution rate) across thousands of calls
- Trigger follow-up emails or SMS based on structured outcomes
- Build a sales pipeline dashboard driven entirely by call analysis data

---

## Configuring Analysis on an Agent

Add a `postCallAnalysis` array to your agent configuration. Each entry in the array is an extraction task.

### Supported Field Types

| Type | Description | Example result |
|---|---|---|
| `string` | Free-form text extracted from the transcript | `"March 5th at 2pm"` |
| `enum` | One of a fixed set of allowed values you define | `"interested"` |
| `boolean` | `true` or `false` | `true` |
| `number` | Numeric value (integer or decimal) | `3` |

### Example Configuration

```json
{
  "postCallAnalysis": [
    {
      "name": "call_outcome",
      "type": "enum",
      "options": ["interested", "not_interested", "callback_requested", "converted", "do_not_call"],
      "description": "What was the primary outcome of this call? Choose the option that best describes the result."
    },
    {
      "name": "user_sentiment",
      "type": "enum",
      "options": ["positive", "neutral", "negative"],
      "description": "What was the caller's overall emotional tone throughout the conversation?"
    },
    {
      "name": "follow_up_required",
      "type": "boolean",
      "description": "Did the caller request or does the situation require a follow-up contact?"
    },
    {
      "name": "callback_date",
      "type": "string",
      "description": "If the caller requested a callback, what date and time did they specify? Return null if no callback was requested."
    },
    {
      "name": "product_interest",
      "type": "string",
      "description": "Which specific product, plan, or feature did the caller express interest in? Return null if not mentioned."
    },
    {
      "name": "objections_raised",
      "type": "number",
      "description": "How many distinct objections or concerns did the caller raise during the conversation?"
    }
  ]
}
```

---

## Configuring via the SDK

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const agent = await client.agents.create({
  name: "Sales Qualification Agent",
  transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: "You are a sales qualification agent for Acme Corp.",
  },
  voice: { provider: "cartesia", voiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22" },
  webhookUrl: "https://api.yourapp.com/webhooks/ortavox",

  // Post-call analysis configuration
  postCallAnalysis: [
    {
      name: "call_outcome",
      type: "enum",
      options: ["interested", "not_interested", "callback_requested", "converted", "do_not_call"],
      description: "What was the primary outcome of this call?",
    },
    {
      name: "user_sentiment",
      type: "enum",
      options: ["positive", "neutral", "negative"],
    },
    {
      name: "follow_up_required",
      type: "boolean",
      description: "Did the caller request or does the situation require a follow-up?",
    },
    {
      name: "callback_date",
      type: "string",
      description: "Requested callback date and time, if any. Return null if none.",
    },
    {
      name: "objections_raised",
      type: "number",
      description: "How many distinct objections did the caller raise?",
    },
  ],
});

console.log("Agent created:", agent.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

agent = client.agents.create(
    name="Sales Qualification Agent",
    transcriber={"provider": "deepgram", "model": "nova-3", "language": "en"},
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": "You are a sales qualification agent for Acme Corp.",
    },
    voice={"provider": "cartesia", "voice_id": "79a125e8-cd45-4c13-8a67-188112f4dd22"},
    webhook_url="https://api.yourapp.com/webhooks/ortavox",

    # Post-call analysis configuration
    post_call_analysis=[
        {
            "name": "call_outcome",
            "type": "enum",
            "options": ["interested", "not_interested", "callback_requested", "converted", "do_not_call"],
            "description": "What was the primary outcome of this call?",
        },
        {
            "name": "user_sentiment",
            "type": "enum",
            "options": ["positive", "neutral", "negative"],
        },
        {
            "name": "follow_up_required",
            "type": "boolean",
            "description": "Did the caller request or does the situation require a follow-up?",
        },
        {
            "name": "callback_date",
            "type": "string",
            "description": "Requested callback date and time, if any. Return null if none.",
        },
        {
            "name": "objections_raised",
            "type": "number",
            "description": "How many distinct objections did the caller raise?",
        },
    ],
)

print("Agent created:", agent.data.id)
```
  </Tab>
</Tabs>

---

## Consuming Analysis Results

### Via Webhook (`call.ended`)

Analysis results are included in the `call.ended` webhook payload under the `analysis` key. This fires after the call ends and analysis is complete — typically within 10–30 seconds of call termination.

```json
{
  "event": "call.ended",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "duration": 187000,
  "status": "completed",
  "terminationReason": "user_hangup",
  "timestamp": "2026-02-25T14:33:00Z",
  "analysis": {
    "call_outcome": "callback_requested",
    "user_sentiment": "positive",
    "follow_up_required": true,
    "callback_date": "February 28th at 10am",
    "objections_raised": 2,
    "analysisModel": "gpt-4.1-mini",
    "analysisCompletedAt": "2026-02-25T14:33:18Z"
  },
  "conversation": {
    "transcript": [...]
  },
  "metrics": { ... },
  "costs": { ... }
}
```

### Via API

Fetch analysis for any completed call at any time:

```bash
GET https://api.ortavox.ai/v1/calls/{callId}/analysis
Authorization: Bearer sk_live_...
```

**Response:**

```json
{
  "callId": "call_xyz789",
  "status": "completed",
  "analysis": {
    "call_outcome": "callback_requested",
    "user_sentiment": "positive",
    "follow_up_required": true,
    "callback_date": "February 28th at 10am",
    "objections_raised": 2
  },
  "analysisModel": "gpt-4.1-mini",
  "analysisCompletedAt": "2026-02-25T14:33:18Z"
}
```

### Handling Analysis in Your Webhook Handler

<Tabs>
  <Tab title="TypeScript">
```typescript
import express from "express";
import crypto from "crypto";

const app = express();

app.post(
  "/webhooks/ortavox",
  express.raw({ type: "application/json" }),
  (req, res) => {
    // Verify signature
    const sig = req.headers["x-ortavox-signature"] as string;
    const expected = crypto
      .createHmac("sha256", process.env.WEBHOOK_SECRET!)
      .update(req.body)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig.replace("sha256=", "")))) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "call.ended" && event.analysis) {
      const { call_outcome, user_sentiment, follow_up_required, callback_date } = event.analysis;

      console.log(`Call ${event.callId}: outcome=${call_outcome}, sentiment=${user_sentiment}`);

      // Example: update CRM
      if (call_outcome === "interested" || call_outcome === "callback_requested") {
        await updateCrmDeal(event.metadata?.leadId, {
          stage: call_outcome === "converted" ? "closed_won" : "follow_up",
          sentiment: user_sentiment,
          callbackDate: callback_date ?? null,
          followUpRequired: follow_up_required,
        });
      }

      // Example: schedule callback
      if (follow_up_required && callback_date) {
        await scheduleCallback(event.callId, callback_date);
      }
    }

    res.status(200).send("OK");
  }
);
```
  </Tab>
  <Tab title="Python">
```python
import hmac
import hashlib
import os
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhooks/ortavox")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature_header = request.headers.get("x-ortavox-signature", "")
    secret = os.getenv("WEBHOOK_SECRET", "").encode()

    expected_mac = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    received_mac = signature_header.replace("sha256=", "")

    if not hmac.compare_digest(expected_mac, received_mac):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = await request.json()

    if event.get("event") == "call.ended" and event.get("analysis"):
        analysis = event["analysis"]
        call_outcome = analysis.get("call_outcome")
        user_sentiment = analysis.get("user_sentiment")
        follow_up_required = analysis.get("follow_up_required")
        callback_date = analysis.get("callback_date")

        print(f"Call {event['callId']}: outcome={call_outcome}, sentiment={user_sentiment}")

        # Example: update CRM
        if call_outcome in ("interested", "callback_requested", "converted"):
            await update_crm_deal(
                lead_id=event.get("metadata", {}).get("lead_id"),
                stage="closed_won" if call_outcome == "converted" else "follow_up",
                sentiment=user_sentiment,
                callback_date=callback_date,
                follow_up_required=follow_up_required,
            )

        # Example: schedule callback
        if follow_up_required and callback_date:
            await schedule_callback(event["callId"], callback_date)

    return {"status": "ok"}
```
  </Tab>
</Tabs>

---

## Custom Analysis Prompts

You can override the default analysis system prompt and summary prompt to fine-tune how OrtaVox instructs the LLM to perform extraction.

| Field | Description | Max length |
|---|---|---|
| `analysisSuccessPrompt` | Injected when the call completed normally. Used to set context and tone for the extraction LLM. | 2000 characters |
| `analysisSummaryPrompt` | Used to generate a free-form human-readable summary of the call alongside the structured fields. | 2000 characters |

**Example:**

```json
{
  "analysisSuccessPrompt": "You are analyzing a transcript from an outbound sales qualification call made by Acme Corp. The agent's goal was to identify if the prospect is a good fit for our Pro plan ($299/month). Focus on intent signals, budget references, and timeline mentions when extracting fields.",
  "analysisSummaryPrompt": "Write a 2-3 sentence summary of this call for the sales team. Mention the prospect's main concern, their sentiment, and the agreed next step if any."
}
```

The `analysisSummaryPrompt` result is returned as a `summary` string field alongside the structured extraction fields:

```json
{
  "analysis": {
    "call_outcome": "callback_requested",
    "user_sentiment": "positive",
    "follow_up_required": true,
    "callback_date": "March 5th at 2pm",
    "summary": "The prospect showed strong interest in the Pro plan but wanted to review the pricing with their finance team first. They have a positive tone throughout and agreed to a follow-up call on March 5th at 2pm. No major objections were raised."
  }
}
```

---

## Analysis Model

By default, OrtaVox uses `gpt-4.1-mini` to run post-call analysis. This model is fast, cost-effective, and accurate for structured extraction tasks.

You can override this per-agent:

```json
{
  "postCallAnalysis": [...],
  "analysisModel": "gpt-4o"
}
```

<Note>
Using a larger model (e.g. `gpt-4o`) may improve accuracy on complex extraction tasks — particularly for long calls, nuanced sentiment, or fields requiring inference rather than literal extraction. It will increase analysis cost, which is billed at the model's standard token rate plus the OrtaVox 15% provider markup.
</Note>

---

## Analysis Timing

Post-call analysis runs asynchronously after the call ends. The `call.ended` webhook fires only after analysis is complete and included in the payload. Typical analysis completion times:

| Call duration | Analysis time |
|---|---|
| Under 5 minutes | 5–15 seconds |
| 5–15 minutes | 10–30 seconds |
| Over 15 minutes | 20–60 seconds |

If you need the transcript immediately (before analysis is ready), listen for the `call.ended` event with `analysis: null` — this fires first — and then poll `GET /v1/calls/{callId}/analysis` until the status is `completed`.

<Info>
Analysis failures do not block the `call.ended` webhook. If analysis fails (e.g. due to an LLM provider outage), the `analysis` field will be `null` and `analysisStatus` will be `"failed"`. You can retry analysis manually via `POST /v1/calls/{callId}/analysis/retry`.
</Info>

---

## Integration Patterns

### CRM Auto-Update

Configure a webhook handler that reads `call_outcome` and `user_sentiment` and pushes directly to your CRM via its API — no manual data entry.

### Callback Scheduling

Extract `callback_date` as a `string` field, parse it with an NLP date parser (e.g. Chrono.js or dateparser in Python), and schedule the follow-up call via your campaign API.

### Quality Monitoring Dashboard

Aggregate `user_sentiment` and `call_outcome` across all calls by agent, day, and campaign. Build a dashboard showing sentiment distribution and conversion rate without listening to a single recording.

### Sales Pipeline Automation

Map `call_outcome` enum values directly to CRM deal stages. `converted` → Closed Won. `callback_requested` → Follow Up. `not_interested` → Disqualified. Run this mapping in your webhook handler — zero manual pipeline management.

---

## Next Steps

- **[Webhooks](./webhooks.md)** — Full webhook payload reference and signature verification.
- **[Agents](./agents.md)** — Complete agent configuration reference.
- **[Analytics](./analytics.md)** — Aggregate call metrics, cost breakdowns, and trend analysis.
