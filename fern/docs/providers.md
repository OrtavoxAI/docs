# Providers & Models

OrtaVox is provider-agnostic. Every agent is a composition of independently configured STT, LLM, and TTS components. You choose the best provider for each stage of your pipeline — and you can swap any component with a single configuration change, no code changes required.

This page covers every supported provider, their available models, pricing, and the tradeoffs to consider when selecting your stack.

<Info>
All provider costs are passed through to your account at cost plus a **15% markup** on the Pay-As-You-Go plan. See the [Pricing page](https://ortavox.ai/pricing) for volume and subscription plan rates.
</Info>

---

## Speech-to-Text (STT)

The transcriber converts the caller's spoken audio into text for the LLM to process. Transcriber performance directly impacts conversation naturalness: slow or inaccurate STT adds perceived latency and causes misunderstandings.

### STT Provider Comparison

| Provider | Model | Cost / min | Languages | Best For |
|---|---|---|---|---|
| AssemblyAI | Universal | $0.0025 | 99+ | Highest accuracy, noisy environments, non-English |
| Deepgram | Nova-3 | $0.0077 | 30+ | Lowest latency, real-time phone conversations |
| Deepgram | Nova-2 | $0.0058 | 30+ | Balanced accuracy/latency, cost-sensitive workloads |

### AssemblyAI

**Provider key:** `assemblyai`

AssemblyAI Universal is the most accurate model in the OrtaVox lineup. It uses a universal acoustic model trained on diverse real-world audio — accents, background noise, technical jargon, and multiple languages with the same model.

```json
{
  "transcriber": {
    "provider": "assemblyai",
    "model": "universal",
    "language": "en"
  }
}
```

**Strengths:**
- Best Word Error Rate (WER) across tested providers
- Handles heavy accents and noisy audio (call centers, outdoor environments) well
- Largest language coverage: 99+ languages with a single model identifier

**Tradeoffs:**
- Higher latency than Deepgram Nova-3 (~20–40ms more per utterance)
- Higher cost per minute

### Deepgram Nova-3

**Provider key:** `deepgram`, **model:** `nova-3`

Nova-3 is Deepgram's latest and fastest model. It is purpose-built for real-time streaming and telephony, making it the best choice for latency-sensitive applications where sub-second response times are critical.

```json
{
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-3",
    "language": "en"
  }
}
```

**Strengths:**
- Lowest transcription latency in the lineup
- Excellent accuracy on clean audio and English telephony
- Streaming interim results enable earlier LLM processing

**Tradeoffs:**
- Smaller language coverage than AssemblyAI
- Accuracy on heavily accented or noisy audio trails AssemblyAI Universal

### Deepgram Nova-2

**Provider key:** `deepgram`, **model:** `nova-2`

Nova-2 is the previous generation Deepgram model. It offers a solid balance of accuracy and cost for applications where Nova-3's speed advantage is not critical.

```json
{
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "en"
  }
}
```

**Strengths:**
- Lower cost than Nova-3
- Well-tested and stable for production workloads

**Tradeoffs:**
- Slower than Nova-3
- Marginally lower accuracy than Nova-3 on modern speech

---

## Large Language Models (LLM)

The model is the reasoning core of your agent. It receives the full conversation history, your system prompt, and any retrieved knowledge or tool results, and generates the agent's next response.

Models are grouped below by cost tier. Prices are in USD per million tokens (input / output).

### Budget Tier

Ideal for high-volume use cases where cost matters more than maximum reasoning depth. Still capable of natural, helpful conversations.

| Provider | Model | Input / M tokens | Output / M tokens | Notes |
|---|---|---|---|---|
| OpenAI | GPT-4.1 nano | $0.10 | $0.40 | Fastest OpenAI model; good for simple Q&A |
| Google | Gemini 2.5 Flash Lite | $0.10 | $0.40 | Lowest latency Gemini; strong multilingual |
| OpenAI | GPT-4o mini | $0.15 | $0.60 | Reliable OpenAI baseline; wide ecosystem support |

```json
{ "model": { "provider": "openai", "model": "gpt-4o-mini" } }
```

### Balanced Tier

Best for most production voice agents. Strong reasoning, fast enough for real-time conversation, and reasonable cost.

| Provider | Model | Input / M tokens | Output / M tokens | Notes |
|---|---|---|---|---|
| Google | Gemini 2.5 Flash | $0.30 | $2.50 | Best reasoning-to-cost ratio; strong tool use |
| OpenAI | GPT-4.1 mini | $0.40 | $1.60 | Balanced OpenAI option; good at following instructions |
| Anthropic | Claude 4.5 Haiku | $0.80 | $4.00 | Low latency; excels at instruction-following |

```json
{ "model": { "provider": "anthropic", "model": "claude-haiku-4-5" } }
```

### Premium Tier

For complex, high-stakes conversations that require maximum reasoning ability, nuanced judgment, or multi-step planning. Higher cost per token is offset by fewer turns wasted on misunderstandings.

| Provider | Model | Input / M tokens | Output / M tokens | Notes |
|---|---|---|---|---|
| OpenAI | GPT-4.1 | $2.00 | $8.00 | Strong instruction-following and tool use |
| OpenAI | GPT-4o | $2.50 | $10.00 | OpenAI flagship; best overall conversational quality |
| Anthropic | Claude 4.5 Sonnet | $3.00 | $15.00 | Best-in-class reasoning; excellent for complex agent tasks |

```json
{ "model": { "provider": "openai", "model": "gpt-4o" } }
```

### All LLM Provider Keys

| Provider | Key |
|---|---|
| OpenAI | `openai` |
| Anthropic | `anthropic` |
| Google | `google` |
| Groq | `groq` |
| DeepSeek | `deepseek` |

---

## Text-to-Speech (TTS)

The voice provider synthesizes the LLM's text response into audio that is streamed to the caller in real time. Voice quality, naturalness, and latency vary significantly across providers — this is often the most noticeable differentiator in call quality from the caller's perspective.

### TTS Provider Comparison

| Provider | Model | Cost / M chars | Notes |
|---|---|---|---|
| Inworld | TTS 1.5 Mini | $5 | Lowest cost; suitable for utility, IVR-style agents |
| Inworld | TTS 1.5 Max | $10 | Better expressiveness than Mini; still budget-friendly |
| OpenAI | TTS-1 | $15 | Good general-purpose quality; consistent and reliable |
| Deepgram | Aura-2 | $30 | Low latency; clean and professional |
| Cartesia | Sonic 3 | $50 | Ultra-low TTFB; excellent for latency-sensitive applications |
| ElevenLabs | Flash v2.5 | $110 | Near-human naturalness with very low latency |
| ElevenLabs | Multilingual v2 | $220 | Most natural voice quality; 29 languages |

### Inworld

**Provider key:** `inworld`

Inworld offers the lowest-cost TTS options in the lineup, making it ideal for high-volume, cost-sensitive deployments where extreme voice naturalness is not the primary requirement.

```json
{
  "voice": {
    "provider": "inworld",
    "voiceId": "evelyn",
    "model": "tts-1-5-mini"
  }
}
```

### OpenAI

**Provider key:** `openai`

OpenAI TTS-1 provides reliable, neutral-sounding synthesis at a reasonable price. Good default choice when you don't have strong voice quality requirements.

```json
{
  "voice": {
    "provider": "openai",
    "voiceId": "nova",
    "model": "tts-1"
  }
}
```

Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Deepgram

**Provider key:** `deepgram`

Deepgram Aura-2 is optimized for phone-quality audio and professional-sounding synthetic voices. Well-suited for call center and telephony deployments.

```json
{
  "voice": {
    "provider": "deepgram",
    "voiceId": "aura-luna-en",
    "model": "aura-2"
  }
}
```

### Cartesia

**Provider key:** `cartesia`

Cartesia Sonic 3 delivers industry-leading Time To First Byte (TTFB), making it the best choice for applications where the first word of the agent's response must arrive as quickly as possible.

```json
{
  "voice": {
    "provider": "cartesia",
    "voiceId": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "model": "sonic-3"
  }
}
```

### ElevenLabs

**Provider key:** `elevenlabs`

ElevenLabs produces the most natural-sounding synthetic voices available. Flash v2.5 achieves this quality with competitive latency. Multilingual v2 supports 29 languages from a single voice clone, making it the top choice for international deployments.

ElevenLabs exposes additional voice quality controls — `stability`, `similarityBoost`, `style`, and `useSpeakerBoost` — documented in the [Voice Settings guide](./voice-settings.md).

```json
{
  "voice": {
    "provider": "elevenlabs",
    "voiceId": "dqzVFKHwZvR9YMQoFM67",
    "model": "eleven_flash_v2_5",
    "stability": 0.75,
    "similarityBoost": 0.85
  }
}
```

---

## Provider Selection Guide

Use this decision framework when choosing providers for a new agent.

### Optimize for Latency

```
STT:   Deepgram Nova-3  (lowest STT latency)
LLM:   GPT-4o mini      (fast, small model)
TTS:   Cartesia Sonic 3 (lowest TTS TTFB)
```

Target: end-to-end turn latency of 500–800ms on a clean connection.

### Optimize for Quality

```
STT:   AssemblyAI Universal  (best accuracy)
LLM:   Claude 4.5 Sonnet     (best reasoning)
TTS:   ElevenLabs Flash v2.5 (most natural voice)
```

Target: highest perceived conversation quality; best for premium customer-facing applications.

### Optimize for Cost

```
STT:   Deepgram Nova-2     (balanced cost/quality)
LLM:   GPT-4.1 nano        (lowest token cost)
TTS:   Inworld TTS 1.5 Mini ($5/M chars)
```

Target: maximum call volume within a budget; suitable for automated outbound campaigns.

### Optimize for Non-English Calls

```
STT:   AssemblyAI Universal      (99+ language coverage)
LLM:   Gemini 2.5 Flash          (strong multilingual reasoning)
TTS:   ElevenLabs Multilingual v2 (29 languages, single voice)
```

<Tip>
Mixing tiers across pipeline stages is perfectly valid. For example: Deepgram Nova-3 (low-latency STT) + GPT-4o (premium LLM) + OpenAI TTS-1 (mid-range TTS) gives you excellent reasoning quality with lower TTS spend than ElevenLabs.
</Tip>

---

## Next Steps

- **[Agents](./agents.md)**: Configure `transcriber`, `model`, and `voice` on your agent.
- **[Voice Settings](./voice-settings.md)**: Fine-tune ElevenLabs and cross-provider voice parameters.
- **[Pricing](https://ortavox.ai/pricing)**: Full billing details and plan comparison.
