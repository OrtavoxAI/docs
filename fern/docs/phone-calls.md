# Phone Calls

Connect your voice AI agents to real phone networks using your own telephony provider.

## Overview

OrtaVox uses a **Bring Your Own Telephony (BYOT)** model. This means OrtaVox does not sell or manage phone numbers directly. Instead, you connect your existing numbers from any supported SIP provider — Twilio, Telnyx, Vonage, or any standards-compliant SIP trunk — and OrtaVox acts as the voice AI engine behind them.

This design gives you full control over your number relationships, per-minute rates, and carrier agreements while OrtaVox handles the STT → LLM → TTS pipeline.

<Warning>
OrtaVox does not sell, provision, or port phone numbers. You must bring a phone number from your own telephony provider. If you do not have one, sign up with Twilio or Telnyx and acquire a number there before proceeding.
</Warning>

---

## Architecture

```
Caller / Recipient
       │
       │  PSTN (standard telephone network)
       ▼
Your Phone Provider  (Twilio / Telnyx / Vonage / SIP trunk)
       │
       │  SIP over TLS + media (RTP)
       ▼
OrtaVox Voice Engine  (STT → LLM → TTS pipeline)
       │
       │  WebSocket / gRPC (internal)
       ▼
Your Configured Agent  (your prompt, tools, provider stack)
```

Your provider forwards call audio to OrtaVox's SIP endpoint. OrtaVox transcribes incoming audio, sends it to your LLM, synthesizes the response, and streams the audio back — all in real time.

---

## Call Directions

OrtaVox supports two directions of telephony:

### Inbound Calls

A person dials your phone number. Your provider receives the call, looks up the configured SIP forwarding rule, and routes the audio stream to OrtaVox. Your agent answers.

**Use cases:** customer support hotlines, appointment scheduling lines, order status lines, 24/7 IVR replacement.

### Outbound Calls

Your backend triggers OrtaVox to dial a phone number on your behalf. OrtaVox instructs your provider to originate the call, the recipient's phone rings, and your agent speaks when they answer.

**Use cases:** appointment reminders, payment follow-ups, lead qualification, survey collection, proactive alerts.

---

## Supported Providers

| Provider | Inbound | Outbound | SIP Type | Notes |
|---|:---:|:---:|---|---|
| Twilio | Yes | Yes | TwiML webhook or SIP domain | Widest geographic coverage |
| Telnyx | Yes | Yes | SIP connection profile | Competitive per-minute pricing |
| Vonage (Nexmo) | Yes | Yes | SIP trunk | Strong EU coverage |
| Bandwidth | Yes | Yes | SIP trunk | US-focused, carrier-grade |
| Any SIP trunk | Yes | Yes | RFC 3261 SIP | Must support TLS + SRTP |

<Info>
OrtaVox has pre-built configuration guides for Twilio and Telnyx. For other providers, use the generic SIP trunk instructions in the Inbound and Outbound Calls pages.
</Info>

---

## Inbound vs. Outbound — Quick Comparison

| | Inbound | Outbound |
|---|---|---|
| **Who initiates** | Caller dials your number | OrtaVox dials the recipient |
| **Setup required** | Create inbound profile, configure SIP webhook at provider | Create outbound call via API; `fromNumber` must be registered |
| **Key API endpoint** | `POST /v1/phone/inbound` | `POST /v1/calls/phone` |
| **Caller ID shown** | Your phone number | Your `fromNumber` |
| **Dynamic routing** | Yes — route to different agents by caller ID, IVR option, etc. | Not applicable |
| **Answering machine detection** | Not applicable | Optional — set `amdEnabled: true` |
| **Scheduling** | Not applicable | Optional — `scheduledAt` field |
| **Bulk execution** | Not applicable | Yes — via Campaigns |

---

## Prerequisites

Before configuring phone calls, ensure you have:

1. An active OrtaVox account with at least one agent created
2. A phone number from a supported provider (Twilio, Telnyx, Vonage, or a SIP trunk)
3. SIP credentials or webhook URLs from your provider (obtained during provider setup)
4. Your OrtaVox secret API key (`sk_live_...`) from **Dashboard → Developer → API Keys**

---

## Next Steps

- [Inbound Calls](./inbound-calls.md) — configure your provider to route incoming calls to OrtaVox and set up dynamic agent routing
- [Outbound Calls](./outbound-calls.md) — trigger single outbound calls via the API, configure AMD, and schedule future calls
- [Campaigns](./campaigns.md) — orchestrate bulk outbound calls to contact lists with rate limiting and retry logic
- [Compliance](./compliance.md) — TCPA, GDPR, calling hours, recording disclosure, and DNC list obligations
