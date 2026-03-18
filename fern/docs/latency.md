# Latency Guide

**Understanding, measuring, and optimizing end-to-end latency in OrtaVox voice agents.**

---

## Why Latency Matters in Voice AI

Human conversation has a natural rhythm. In a real phone call between two people, the gap between one person finishing a sentence and the other beginning their reply is typically 200–300ms. This gap is so ingrained in human cognition that deviations from it create an immediate, visceral reaction:

| Response time | User perception |
|---|---|
| < 300ms | Natural — feels like talking to a person |
| 300–500ms | Slightly perceptible pause — still acceptable |
| 500–700ms | Noticeable lag — feels "slow" or "loading" |
| > 700ms | Robotic, broken, frustrating — users disengage |
| > 1000ms | Unacceptable for production voice applications |

**OrtaVox's latency target is < 600ms p50 end-to-end** — from the moment the user stops speaking to the moment they hear the first word of the agent's reply.

This is not a marketing number. It is the result of streaming at every stage, running inference on optimized model-provider pairs, and deploying edge workers close to your users.

---

## Latency Breakdown

End-to-end latency is the sum of four sequential stages. Each has a target range and optimization levers.

| Stage | Component | Target | Notes |
|---|---|---|---|
| Speech detection | VAD (Silero) | ~50ms | Tune with `endpointingMs` — see below |
| Transcription | STT provider | 100–200ms | Deepgram Nova-3 is consistently fastest |
| LLM first token | LLM provider | 200–400ms | Dominated by model size and provider infrastructure |
| TTS first chunk | TTS provider | 80–150ms | Cartesia Sonic 3 has industry-leading TTFB |
| Network / WebRTC | LiveKit | 20–50ms | Use nearest OrtaVox region |
| **Total (fast path)** | | **< 450–600ms** | Deepgram Nova-3 + GPT-4o-mini + Cartesia Sonic 3 |

<Note>
These are p50 targets under normal load. p95 latency will be higher, particularly for the LLM stage, which can spike to 600–900ms under provider load. Monitor your actual p95 via `GET /v1/calls/{callId}` → `metrics.latency.p95`.
</Note>

---

## Stage 1 — Speech Detection (VAD)

**Voice Activity Detection (VAD)** determines when the user has finished speaking. OrtaVox uses Silero VAD, a lightweight neural model running at the edge.

VAD latency itself is fast (~50ms). The dominant factor is `endpointingMs` — the configured silence duration OrtaVox waits after the user stops speaking before it sends the audio to STT.

| `endpointingMs` value | Effect |
|---|---|
| 100ms | Very responsive. May cut off slow speakers or natural mid-sentence pauses. |
| 200ms | Good for fast-paced conversations and clear audio. |
| 300ms (default) | Balanced. Works well for most voice applications. |
| 500ms+ | Feels sluggish. Users may think the agent is not listening. |

**Tuning recommendation:** Start at 300ms. Lower to 200ms for fast-paced applications (sales calls, quick-question flows). Raise to 400–500ms for older callers, noisy environments, or when you see frequent mid-sentence cutoffs in your transcripts.

```json
{
  "endpointingMs": 250
}
```

<Warning>
Setting `endpointingMs` below 100ms is not supported. Values that are too low cause the agent to interrupt users mid-sentence, which is significantly worse than a slightly longer pause.
</Warning>

---

## Stage 2 — Transcription (STT)

STT latency is the time from when the VAD endpoint fires to when OrtaVox has a final transcript to send to the LLM.

**Provider comparison:**

| Provider | Model | Typical latency | Best for |
|---|---|---|---|
| Deepgram | Nova-3 | 100–150ms | English, speed-critical applications |
| Deepgram | Nova-2 | 110–170ms | English, broad dialect support |
| AssemblyAI | Universal | 150–220ms | Multilingual, noisy audio |
| OpenAI | Whisper | 300–600ms | High accuracy, not latency-optimized |

<Tip>
For English-language agents where latency is a priority, **Deepgram Nova-3** is the recommended STT provider. It consistently delivers the lowest transcription latency in OrtaVox's provider benchmark tests.
</Tip>

---

## Stage 3 — LLM Inference (First Token)

LLM latency is measured as **Time-to-First-Token (TTFT)** — the time from when OrtaVox sends the request to the LLM to when the first token of the response arrives.

OrtaVox begins TTS synthesis as soon as the first complete sentence is available in the token stream — not after the full response is generated. This means the effective user-perceived LLM latency is TTFT + time to first sentence, not TTFT + full response generation time.

**Provider and model comparison:**

| Provider | Model | Typical TTFT | Best for |
|---|---|---|---|
| Groq | Llama 3.3 70B | 150–250ms | Fastest open-source option |
| OpenAI | GPT-4.1 nano | 180–300ms | Fast, cheap, good quality for simple tasks |
| Google | Gemini 2.5 Flash Lite | 200–350ms | Low-latency frontier model |
| OpenAI | GPT-4o-mini | 200–350ms | Balanced quality and speed |
| Anthropic | Claude Haiku 3.5 | 200–400ms | Fast Anthropic option |
| OpenAI | GPT-4o | 350–600ms | Higher quality, more latency |
| Anthropic | Claude Sonnet 4.5 | 350–650ms | High quality, more latency |

**The biggest latency lever at the LLM stage is your system prompt length.** A 4,000-token system prompt adds significant time to every request because the model must attend to it before generating the first token. Keep prompts concise — 500 tokens or fewer for latency-sensitive applications.

---

## Stage 4 — TTS Synthesis (First Chunk)

TTS latency is measured as **Time-to-First-Byte (TTFB)** of audio — the time from when OrtaVox sends the first sentence chunk to the TTS provider to when the first audio frame is ready to stream.

**Provider comparison:**

| Provider | Model | Typical TTFB | Best for |
|---|---|---|---|
| Cartesia | Sonic 3 | 60–100ms | Fastest TTFB available |
| OpenAI | TTS-1 | 100–150ms | Good balance of quality and speed |
| Deepgram | Aura | 100–160ms | Low latency, natural voice |
| ElevenLabs | Turbo v2.5 | 130–200ms | High quality, slightly more latency |
| ElevenLabs | Multilingual v2 | 200–350ms | Multilingual quality, higher latency |
| AWS Polly | Neural | 80–130ms | Very fast, robotic quality |

<Tip>
**Cartesia Sonic 3** is the recommended TTS provider for latency-sensitive applications. It consistently delivers the lowest TTFB of any OrtaVox-supported TTS provider while maintaining high voice quality.
</Tip>

---

## Checking Actual Latency

Every completed call exposes a `metrics` object with latency percentiles broken down by pipeline stage.

```bash
GET https://api.ortavox.ai/v1/calls/{callId}
Authorization: Bearer sk_live_...
```

**Response (metrics object):**

```json
{
  "callId": "call_xyz789",
  "duration": 187000,
  "metrics": {
    "latency": {
      "endToEnd": {
        "p50": 487,
        "p90": 623,
        "p95": 741,
        "p99": 1102
      },
      "stt": {
        "p50": 138,
        "p90": 189,
        "p95": 224
      },
      "llm": {
        "ttft": {
          "p50": 243,
          "p90": 381,
          "p95": 512
        }
      },
      "tts": {
        "ttfb": {
          "p50": 87,
          "p90": 124,
          "p95": 168
        }
      }
    },
    "turns": 14,
    "interruptions": 2
  }
}
```

All values are in milliseconds. Use `p50` as your baseline measurement and `p95` to understand tail latency that real users experience during spikes.

---

## Streaming Architecture

OrtaVox's streaming pipeline is what makes sub-600ms end-to-end latency achievable. There is **no stage that waits for a previous stage to fully complete** before starting.

```
VAD endpoint fires
       │
       ▼ (immediately)
Audio streamed to STT ──► transcript arrives
                                  │
                                  ▼ (immediately)
                          LLM request sent ──► token stream begins
                                                      │
                                                      ▼ (first sentence complete)
                                              TTS synthesis starts ──► audio frames streamed
                                                                              │
                                                                              ▼ (immediately)
                                                                      User hears agent speak
```

Each arrow is "fire as soon as data is available" — not "wait for the previous step to finish." This pipeline overlap is the primary architectural reason OrtaVox achieves real-time voice latency at scale.

---

## Latency Optimization Checklist

Apply these in order — items at the top have the highest impact:

1. **Choose a fast STT provider.** Use Deepgram Nova-3 for English. It typically saves 50–100ms over alternatives.

2. **Choose a fast LLM for your use case.** For simple, scripted, or structured flows, GPT-4.1 nano or Gemini 2.5 Flash Lite is dramatically faster than GPT-4o or Claude Sonnet. Use larger models only when reasoning quality requires it.

3. **Choose Cartesia Sonic 3 for TTS.** The 30–100ms TTFB advantage over ElevenLabs is audible.

4. **Keep your system prompt concise.** Every 500 additional tokens in your system prompt adds approximately 30–60ms of LLM latency. Aim for under 500 tokens for latency-critical agents. Use dynamic variables to inject per-call context rather than bloating the base prompt.

5. **Tune `endpointingMs` for your audience.** Lower values (200–250ms) feel faster. Test with real users in your target demographic before going to production.

6. **Avoid verbose tool calls in the hot path.** Tool execution pauses speech and adds the round-trip time to your server to the latency budget. Keep tool response payloads small and your server fast. Set a local cache for frequently-called lookups.

7. **Use the nearest OrtaVox region.** OrtaVox deploys agent workers in multiple regions. Your `roomUrl` will point to the nearest region automatically, but confirm your users are distributed correctly by checking the `region` field in `call.ended` metrics.

8. **Set `maxTokens` conservatively.** A lower `maxTokens` bound forces shorter LLM responses, which means the agent finishes speaking faster and the next turn begins sooner. For FAQ-style agents, 128–256 tokens per turn is often sufficient.

---

## `endpointingMs` Reference

`endpointingMs` is configured at the agent level. It defines how long OrtaVox waits after the VAD detects silence before treating the user's turn as complete.

| Field | Type | Default | Min | Max |
|---|---|---|---|---|
| `endpointingMs` | integer | `300` | `100` | `2000` |

```json
{
  "endpointingMs": 250
}
```

<Info>
`endpointingMs` is a latency/accuracy tradeoff, not a latency/latency tradeoff. Lowering it reduces perceived response time but increases the risk of cutting off users who speak with natural pauses. Monitor your `interruptions` metric in call data — a rising rate indicates `endpointingMs` may be set too low.
</Info>

---

## Next Steps

- **[Providers](./providers.md)** — Full comparison of all supported STT, LLM, and TTS providers.
- **[Debugging](./debugging.md)** — How to diagnose unexpected latency spikes in production.
- **[Analytics](./analytics.md)** — Aggregate latency trends across calls, agents, and campaigns.
