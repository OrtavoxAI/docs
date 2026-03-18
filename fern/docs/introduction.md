# Introduction

**Real-time Voice AI infrastructure. Sub-600ms, production-grade, developer-first.**

OrtaVox is the infrastructure layer that powers conversational voice AI — from a single support agent to a fleet of 10,000 concurrent outbound callers. We handle the hard parts: ultra-low-latency audio streaming, real-time transcription, LLM orchestration, speech synthesis, and telephony integration. You focus on the product.

---

## What Is OrtaVox?

OrtaVox is a **Voice AI infrastructure platform** that wires together the full STT → LLM → TTS pipeline into a single, managed, real-time system. Every component is configurable — swap providers, tune latency, bring your own telephony — without re-architecting anything.

Think of it as the Stripe of voice AI: a few lines of configuration get you a production-grade voice agent. The plumbing is our problem.

<Info>
OrtaVox is not a no-code bot builder. It is a developer-first infrastructure platform designed for teams that want programmatic control, transparent pricing, and the flexibility to evolve their stack over time.
</Info>

---

## Why OrtaVox?

| Capability | Details |
|---|---|
| **Transparent, predictable pricing** | Flat platform fee of $0.055/min PAYG. No per-feature surcharges, no hidden telephony markups. |
| **Bring your own telephony** | Connect Twilio, Telnyx, Vonage, or any SIP trunk. You own the number relationship. |
| **15+ LLM providers** | OpenAI, Anthropic, Google Gemini, Groq, Mistral, and more — including open-source models via Ollama. |
| **7+ TTS providers** | ElevenLabs, Cartesia, OpenAI TTS, Deepgram Aura, Inworld, AWS Polly, Azure Neural. |
| **3 STT providers** | Deepgram, AssemblyAI, and OpenAI Whisper. |
| **Morocco data residency** | Run your stack entirely within Morocco for regulated industries and data sovereignty. |
| **Open-source model support** | Route LLM requests to self-hosted Llama, Mistral, or Mixtral instances. |
| **Turnkey delivery** | Dashboard, SDKs, webhooks, analytics, and post-call analysis — all included. |

---

## Key Capabilities

- **Web calls** — embed a live voice agent directly in any browser or mobile app using WebRTC via LiveKit.
- **Phone calls — inbound** — assign a phone number and let OrtaVox answer and route calls automatically.
- **Phone calls — outbound** — programmatically initiate single calls with a one-line API call.
- **Bulk campaigns** — orchestrate thousands of concurrent outbound calls from a contact list with throttling, retry logic, and real-time progress tracking.
- **Function calling** — give agents the ability to query databases, book appointments, update CRMs, or call any HTTP endpoint mid-conversation.
- **Knowledge base** — attach documents and let the agent retrieve relevant context at inference time.
- **Analytics** — call volume, duration, cost, error rates, and provider latency — all queryable via API or visible in the dashboard.
- **Webhooks** — receive real-time events for `call.started`, `call.ended`, `call.failed`, and more.
- **Post-call analysis** — automatic transcription, sentiment scoring, topic tagging, and structured summaries delivered after every call.

---

## Quick Start

Choose the path that matches where you are:

<CardGroup cols={3}>
  <Card
    title="Dashboard Quickstart"
    icon="play"
    href="/docs/quickstart-dashboard"
  >
    Deploy your first agent in 5 minutes — no code required. Use the OrtaVox dashboard to configure, test, and ship.
  </Card>
  <Card
    title="API Quickstart"
    icon="terminal"
    href="/docs/quickstart-api"
  >
    Make your first voice call in under 3 minutes using the TypeScript or Python SDK.
  </Card>
  <Card
    title="API Reference"
    icon="code"
    href="/api"
  >
    Full OpenAPI reference for every endpoint, request schema, and response shape.
  </Card>
</CardGroup>

---

## How OrtaVox Works

Every call passes through a three-stage real-time pipeline. Understanding this model helps you configure each stage for your use case and tune end-to-end latency.

### Stage 1 — Speech-to-Text (STT)

When the user speaks, OrtaVox streams the raw audio to your configured transcription provider. The provider returns a final transcript segment the moment it detects end-of-turn (via Voice Activity Detection).

**Target latency:** < 200 ms from end-of-speech to final transcript.

**Supported providers:** Deepgram Nova-3, AssemblyAI Nano, OpenAI Whisper.

### Stage 2 — LLM Inference

The transcript — combined with conversation history, system prompt, and any tool results — is sent to the configured language model. OrtaVox begins streaming the response token by token the moment the first token is available (streaming mode is always on).

**Target latency:** Time-to-first-token (TTFT) varies by model and provider. Groq and Fireworks are fastest for open-source models; GPT-4o-mini and Gemini Flash are fastest among frontier models.

**Supported providers:** OpenAI, Anthropic, Google Gemini, Groq, Mistral, and self-hosted via Ollama-compatible endpoints.

### Stage 3 — Text-to-Speech (TTS)

As LLM tokens stream in, OrtaVox assembles complete sentence chunks and sends them to the TTS provider in parallel. The first audio chunk begins playing before the full LLM response has finished generating.

**Target latency:** < 100 ms from first sentence chunk to first audio frame.

**Supported providers:** ElevenLabs, Cartesia, OpenAI TTS, Deepgram Aura, Inworld, AWS Polly, Azure Neural.

### End-to-End Latency

```
User stops speaking
        │
        ▼
  [STT transcription]    ~150–200ms
        │
        ▼
  [LLM first token]      ~100–250ms  (model-dependent)
        │
        ▼
  [TTS first audio]      ~80–100ms
        │
        ▼
  Agent begins speaking
```

**Total: < 600 ms** on the fast path (Deepgram Nova-3 + GPT-4o-mini + Cartesia Sonic).

<Tip>
To achieve sub-500ms consistently, use Deepgram Nova-3 for STT, a Groq-hosted model for LLM, and Cartesia Sonic for TTS. This combination is pre-validated by the OrtaVox team for production use.
</Tip>

---

## OrtaVox vs. the Alternatives

OrtaVox competes directly with Vapi and Retell AI. Here is how the platforms compare on the dimensions that matter for production deployments.

| Feature | OrtaVox | Vapi | Retell AI |
|---|:---:|:---:|:---:|
| Transparent, flat-rate pricing | ✓ | Partial | ✗ |
| Turnkey delivery (dashboard + SDKs + webhooks + analytics) | ✓ | ✗ | ✗ |
| Self-hosted / on-premise option | ✓ | ✗ | ✗ |
| Open-source model support (Llama, Mistral, etc.) | ✓ | ✗ | ✗ |
| Bring your own telephony (SIP trunk) | ✓ | ✓ | ✓ |
| Morocco data residency | ✓ | ✗ | ✗ |
| Sub-600ms end-to-end latency | ✓ | ✓ | ✓ |
| Bulk outbound campaigns | ✓ | Partial | ✓ |
| Post-call analysis included | ✓ | Add-on | Add-on |

<Note>
Comparison data is based on publicly available documentation and pricing pages as of Q1 2026. Features and pricing change frequently — verify against each provider's current documentation before making a purchasing decision.
</Note>

---

## Next Steps

- [Authentication](/docs/authentication) — get your API keys and understand key types.
- [Dashboard Quickstart](/docs/quickstart-dashboard) — deploy an agent in 5 minutes without writing code.
- [API Quickstart](/docs/quickstart-api) — make your first programmatic voice call.
- [Core Concepts](/docs/core-concepts) — understand agents, calls, sessions, and events.
