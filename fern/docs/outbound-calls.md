# Outbound Calls

Trigger your AI agent to dial a phone number programmatically via a single API call.

## Overview

Outbound calls let your backend initiate a phone call to any E.164 number. OrtaVox instructs your telephony provider to originate the call, waits for the recipient to answer, and then connects your agent. The entire STT → LLM → TTS pipeline activates the moment the call is answered.

**Common use cases:**

- Appointment reminders ("Your appointment is tomorrow at 2pm — press 1 to confirm")
- Payment follow-ups and collections
- Lead qualification and warm outreach
- Post-service surveys
- Proactive fraud or account alerts
- Prescription ready and delivery notifications

---

## Prerequisites

- At least one agent configured in OrtaVox
- A `fromNumber` (your phone number) registered with your telephony provider and configured in OrtaVox
- The recipient's phone number in [E.164 format](https://en.wikipedia.org/wiki/E.164) (e.g., `+14155551234`)

<Warning>
Your `fromNumber` must be an active number from your connected telephony provider (Twilio, Telnyx, etc.) that OrtaVox has authorization to originate calls on. Numbers not configured in your account will return a `400 Bad Request`.
</Warning>

---

## Make an Outbound Call

### `POST /v1/calls/phone`

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const call = await client.calls.createPhoneCall({
  agentId: "agent_abc123",
  toNumber: "+14155551234",
  fromNumber: "+18005559999",
  metadata: {
    contactId: "crm_contact_887",
    callPurpose: "appointment_reminder",
    appointmentDate: "2026-02-26",
    appointmentTime: "14:00",
  },
});

console.log("Call ID:", call.data.callId);
console.log("Status:", call.data.status); // "initiated"
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

call = client.calls.create_phone_call(
    agent_id="agent_abc123",
    to_number="+14155551234",
    from_number="+18005559999",
    metadata={
        "contact_id": "crm_contact_887",
        "call_purpose": "appointment_reminder",
        "appointment_date": "2026-02-26",
        "appointment_time": "14:00",
    },
)

print("Call ID:", call.data.call_id)
print("Status:", call.data.status)  # "initiated"
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "agentId": "agent_abc123",
    "toNumber": "+14155551234",
    "fromNumber": "+18005559999",
    "metadata": {
      "contactId": "crm_contact_887",
      "callPurpose": "appointment_reminder",
      "appointmentDate": "2026-02-26",
      "appointmentTime": "14:00"
    }
  }'
```
</Tab>
</Tabs>

**Response:**

```json
{
  "data": {
    "callId": "call_xyz789",
    "status": "initiated",
    "toNumber": "+14155551234",
    "fromNumber": "+18005559999",
    "agentId": "agent_abc123",
    "createdAt": "2026-02-25T14:00:00Z"
  }
}
```

---

## Request Parameters

### Required

| Parameter | Type | Description |
|---|---|---|
| `agentId` | string | ID of the agent to use for this call. Mutually exclusive with `agent` (inline config). |
| `toNumber` | string | Recipient phone number in E.164 format. Must include country code and `+` prefix. |
| `fromNumber` | string | Your caller ID in E.164 format. Must be a number configured in your OrtaVox account. |

### Optional

| Parameter | Type | Description |
|---|---|---|
| `agent` | object | Inline agent configuration. Use instead of `agentId` to define the agent inline without pre-creating one. |
| `metadata` | object | Arbitrary key-value pairs attached to the call. Available in webhooks and agent prompt templates. |
| `maxRetries` | integer | Number of redial attempts if `toNumber` does not answer (default: `0`, max: `3`). |
| `retryAfterMs` | integer | Milliseconds to wait between retry attempts (default: `60000` / 1 minute). |
| `scheduledAt` | string | ISO 8601 UTC datetime to schedule the call. If omitted, call initiates immediately. |
| `maxCallDurationMs` | integer | Hard cap on call duration in milliseconds (default: `600000` / 10 minutes, max: `3600000`). |
| `recordingEnabled` | boolean | Record the call audio (default: `false`). |
| `amdEnabled` | boolean | Enable answering machine detection (default: `false`). See AMD section below. |
| `voicemailMessage` | string | Text for the agent to speak if AMD detects a voicemail. Requires `amdEnabled: true`. |
| `callId` | string | Your own unique identifier for this call. Must be unique per account. |

---

## Inline Agent Configuration

For one-off calls where you don't want to pre-create an agent, pass the agent configuration inline:

```json
{
  "toNumber": "+14155551234",
  "fromNumber": "+18005559999",
  "agent": {
    "name": "Appointment Reminder Agent",
    "model": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "systemPrompt": "You are calling {{metadata.patientName}} to remind them of their appointment on {{metadata.appointmentDate}} at {{metadata.appointmentTime}}. Keep the call under 60 seconds."
    },
    "voice": {
      "provider": "elevenlabs",
      "voiceId": "rachel"
    },
    "transcriber": {
      "provider": "deepgram",
      "model": "nova-2-phonecall"
    }
  },
  "metadata": {
    "patientName": "Sarah Johnson",
    "appointmentDate": "February 26th",
    "appointmentTime": "2:00 PM"
  }
}
```

<Tip>
Use `nova-2-phonecall` as your Deepgram STT model for outbound phone calls. It is specifically trained on telephony audio and handles background noise and PSTN compression artifacts better than the standard `nova-3` model.
</Tip>

---

## Answering Machine Detection (AMD)

AMD detects whether a live human or a voicemail system answered the call, and adjusts agent behavior accordingly.

Enable AMD by setting `amdEnabled: true`. OrtaVox waits up to 5 seconds after the call is answered before the agent begins speaking, giving the AMD engine time to classify the pickup.

| Detection Result | Agent Behavior |
|---|---|
| Human detected | Agent proceeds normally with its greeting |
| Voicemail detected | Agent speaks the `voicemailMessage` text and hangs up |
| Uncertain after timeout | Agent proceeds as if a human answered |

```json
{
  "agentId": "agent_abc123",
  "toNumber": "+14155551234",
  "fromNumber": "+18005559999",
  "amdEnabled": true,
  "voicemailMessage": "Hi, this is a reminder from Riverside Dental that your appointment is scheduled for tomorrow at 2 PM. Please call us back at 555-9999 to confirm or reschedule. Have a great day!"
}
```

<Note>
AMD accuracy depends on your telephony provider's AMD implementation. Twilio and Telnyx both provide AMD signals that OrtaVox uses natively. For other providers, OrtaVox falls back to its own audio-based detection which has slightly higher latency.
</Note>

---

## Call Scheduling

Schedule a call for a future time by providing `scheduledAt` as an ISO 8601 UTC datetime:

<Tabs>
<Tab title="TypeScript">
```typescript
const scheduledCall = await client.calls.createPhoneCall({
  agentId: "agent_abc123",
  toNumber: "+14155551234",
  fromNumber: "+18005559999",
  // Schedule for 9 AM Eastern tomorrow
  scheduledAt: "2026-02-26T14:00:00Z",
  metadata: {
    reason: "payment_follow_up",
  },
});

console.log("Scheduled call ID:", scheduledCall.data.callId);
console.log("Status:", scheduledCall.data.status); // "scheduled"
```
</Tab>
<Tab title="Python">
```python
from datetime import datetime, timezone

scheduled_call = client.calls.create_phone_call(
    agent_id="agent_abc123",
    to_number="+14155551234",
    from_number="+18005559999",
    scheduled_at="2026-02-26T14:00:00Z",
    metadata={"reason": "payment_follow_up"},
)

print("Status:", scheduled_call.data.status)  # "scheduled"
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "agentId": "agent_abc123",
    "toNumber": "+14155551234",
    "fromNumber": "+18005559999",
    "scheduledAt": "2026-02-26T14:00:00Z"
  }'
```
</Tab>
</Tabs>

To cancel a scheduled call before it fires:

```bash
curl -X DELETE https://api.ortavox.ai/v1/calls/call_xyz789 \
  -H "Authorization: Bearer sk_live_..."
```

---

## Webhook Events

OrtaVox fires these events over the lifecycle of an outbound call. Configure your webhook URL in **Dashboard → Settings → Webhooks** or via `POST /v1/webhooks`.

| Event | When Fired |
|---|---|
| `call.initiated` | Call created in OrtaVox, before dialing starts. Payload includes `callId` and `scheduledAt` if applicable. |
| `call.started` | Recipient answered and the agent is speaking. Payload includes `callId`, `agentId`, `timestamp`. |
| `call.ended` | Call completed for any reason. Full transcript, metrics, and cost breakdown included. |
| `call.failed` | Call could not connect. Payload includes `failureReason`. |

### call.failed Failure Reasons

| `failureReason` | Description |
|---|---|
| `no_answer` | Recipient did not answer within the ring timeout |
| `busy` | Recipient's line was busy |
| `rejected` | Call was declined by the recipient |
| `invalid_number` | `toNumber` is not a valid or dialable number |
| `from_number_not_configured` | `fromNumber` is not registered in your OrtaVox account |
| `carrier_error` | The telephony provider reported a network or routing error |
| `agent_error` | The agent threw an unrecoverable error during the call |
| `max_duration_exceeded` | Call was cut off because it reached `maxCallDurationMs` |

---

## Error Handling

Always handle the `call.failed` webhook in your application. For critical workflows (payment calls, medical reminders), log the `failureReason` and trigger a fallback action.

<Tabs>
<Tab title="TypeScript">
```typescript
app.post("/webhooks/ortavox", express.raw({ type: "application/json" }), (req, res) => {
  // Verify signature first (see Webhooks guide)
  const event = JSON.parse(req.body.toString());

  if (event.event === "call.failed") {
    const { callId, failureReason, metadata } = event;

    console.error(`Call ${callId} failed: ${failureReason}`);

    switch (failureReason) {
      case "no_answer":
      case "busy":
        // Enqueue for retry at a different time
        scheduleRetry(metadata.contactId, { delayHours: 2 });
        break;
      case "invalid_number":
        // Flag the number in your CRM
        markNumberInvalid(metadata.contactId);
        break;
      case "from_number_not_configured":
        // This is a configuration error — alert your team
        notifyOps(`fromNumber not configured: ${event.fromNumber}`);
        break;
      default:
        logFailure(callId, failureReason);
    }
  }

  res.status(200).send("OK");
});
```
</Tab>
<Tab title="Python">
```python
@app.post("/webhooks/ortavox")
async def handle_webhook(request: Request):
    # Verify signature first (see Webhooks guide)
    event = await request.json()

    if event["event"] == "call.failed":
        call_id = event["callId"]
        reason = event["failureReason"]
        metadata = event.get("metadata", {})

        print(f"Call {call_id} failed: {reason}")

        if reason in ("no_answer", "busy"):
            schedule_retry(metadata.get("contact_id"), delay_hours=2)
        elif reason == "invalid_number":
            mark_number_invalid(metadata.get("contact_id"))
        elif reason == "from_number_not_configured":
            notify_ops(f"fromNumber not configured: {event.get('fromNumber')}")
        else:
            log_failure(call_id, reason)

    return {"status": "ok"}
```
</Tab>
</Tabs>

---

## Best Practices

1. **Validate E.164 format before calling.** Use a library like `libphonenumber` to validate and normalize numbers before submitting. Malformed numbers always result in `call.failed` with `invalid_number`.

   ```typescript
   import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

   function toE164(raw: string, defaultCountry = "US"): string | null {
     if (!isValidPhoneNumber(raw, defaultCountry)) return null;
     return parsePhoneNumber(raw, defaultCountry).format("E.164");
   }
   ```

2. **Set a reasonable `maxCallDurationMs`.** The default is 10 minutes. For appointment reminders, 90 seconds (90000ms) is appropriate. Uncapped calls can accumulate significant cost.

3. **Always handle `call.failed`.** Never assume a call connected. Implement fallback logic — SMS, email, or a retry queue — for unreachable numbers.

4. **Respect calling hour restrictions.** Never dial before 8 AM or after 9 PM in the recipient's local time. See the [Compliance guide](./compliance.md) for TCPA requirements.

5. **Use metadata for CRM correlation.** Pass your internal `contactId`, `opportunityId`, or `ticketId` in `metadata` so you can match call events back to your records without a separate lookup.

6. **Test with your own number first.** Before calling real contacts, use your personal number to verify the agent's prompt, voice, and behavior are correct.
