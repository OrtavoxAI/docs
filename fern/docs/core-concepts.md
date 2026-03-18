# Core Concepts

**The mental model behind every OrtaVox voice agent — from a single conversation to a fleet of 10,000 concurrent calls.**

Understanding these building blocks will help you configure agents correctly, debug unexpected behavior, and architect integrations that scale.

---

## Agents

An **agent** is the central entity in OrtaVox. It is a persistent, reusable configuration that defines everything about how your AI voice assistant listens, thinks, and speaks. Every call you start is powered by an agent.

An agent bundles five things together:

| Component | What it does |
|---|---|
| **Transcriber (STT)** | Converts the caller's speech into text in real time |
| **Model (LLM)** | Reads the conversation, follows your instructions, generates a response |
| **Voice (TTS)** | Synthesizes the model's text response into natural-sounding audio |
| **System Prompt** | Defines the agent's personality, scope, constraints, and persona |
| **Tools** | Optional function definitions the agent can call against your APIs mid-conversation |

Agents are created once and reused across many calls. You can update an agent at any time; changes apply to future calls while calls in progress continue using the configuration they started with.

Every agent has a globally unique **`agentId`** (e.g. `agent_abc123`). This identifier is used across the API — to initiate calls, attach tools, retrieve analytics, and manage versions.

<Tip>
Think of an agent as a job description: it defines what the voice assistant is supposed to do. A call is the actual shift — a live instance of that agent talking to a real person.
</Tip>

---

## Calls

A **call** is an active, real-time conversation session between a user and an agent. Calls are ephemeral — they start, run, and end. When a call ends, its transcript, metrics, cost data, and post-call analysis are all finalized and stored.

OrtaVox supports two types of calls:

### Web Calls (WebRTC / Browser)

Web calls connect directly from a browser, mobile app, or any WebRTC-capable client. Audio travels over an encrypted WebRTC channel managed by LiveKit. There is no phone number involved.

**Best for:** In-app voice assistants, customer support widgets, AI demos, kiosks, interactive voice flows embedded in your product.

**How it works:**
1. Your server calls `POST /v1/calls/web` and receives a `roomToken`.
2. Your frontend uses that token to connect to the LiveKit room via the LiveKit client SDK.
3. The OrtaVox agent is already in the room and begins the conversation immediately.

### Phone Calls (PSTN / SIP)

Phone calls use traditional telephony. OrtaVox connects to the PSTN via SIP trunking — either through your own Twilio, Telnyx, or Vonage account, or via OrtaVox-managed telephony.

**Best for:** Outbound sales, appointment reminders, inbound support hotlines, automated surveys, bulk campaigns.

**Subtypes:**
- **Outbound** — your server triggers a call to a specific phone number via `POST /v1/calls/phone`.
- **Inbound** — a caller dials a number you have associated with an agent. OrtaVox answers automatically.

<Note>
For phone calls, OrtaVox handles the SIP→WebRTC bridging internally. You configure your telephony provider in the dashboard under Settings → Telephony. The agent pipeline is identical for both web and phone calls; only the audio transport layer differs.
</Note>

---

## Sessions & Rooms

OrtaVox's real-time audio layer is powered by **LiveKit** — an open-source WebRTC infrastructure platform. Every call gets its own isolated LiveKit **room**.

### Rooms

A **room** is a virtual, encrypted space where audio participants connect. When you initiate a web call, OrtaVox:

1. Creates a LiveKit room with a unique `roomName`.
2. Joins the agent worker to that room.
3. Returns a **`roomToken`** — a short-lived JWT that your client uses to join the same room.

The `roomToken` has a 15-minute TTL. Request it immediately before the user initiates the call — do not cache it.

### Sessions

A **session** represents the full lifecycle of a call from initialization to completion. The `sessionId` is stable across reconnections and is the key you use to look up transcripts, metrics, and recordings after the call ends.

```
Call Initiated
     │
     ▼
Room Created → Agent Joins → User Connects → Conversation → Call Ends
                                                                  │
                                                                  ▼
                                                     Metrics & Analysis Finalized
                                                     Webhooks Dispatched
```

<Warning>
Do not confuse `callId` and `sessionId`. The `callId` identifies the API-level call record. The `sessionId` is the LiveKit session identifier. Both are returned on `call.started` and `call.ended` webhook events. Most analytics and transcript lookups use `callId`.
</Warning>

---

## Tools / Function Calling

**Tools** extend your agent beyond conversation. A tool is a JSON Schema definition that tells the LLM: "here is a function you can call, here are its parameters, and here is what it does."

When the LLM decides to call a tool, OrtaVox executes an HTTP request to your configured endpoint, waits for the response (up to 30 seconds), and injects the result back into the conversation context. The agent then continues speaking based on what your API returned.

### Example Tool Definition

```json
{
  "name": "get_account_balance",
  "description": "Look up the current account balance for a customer. Call this whenever the user asks about their balance, account funds, or how much they have.",
  "parameters": {
    "type": "object",
    "properties": {
      "account_id": {
        "type": "string",
        "description": "The customer's account identifier"
      }
    },
    "required": ["account_id"]
  },
  "endpoint": "https://api.yourapp.com/internal/balance",
  "method": "POST"
}
```

Tools are defined once, stored in OrtaVox, and attached to agents by ID. A single tool can be reused across many agents.

<Tip>
Write detailed, example-rich tool descriptions. The LLM decides when to call a tool based entirely on the description. Vague descriptions lead to missed tool calls; specific descriptions with examples lead to reliable invocations.
</Tip>

See the [Function Calling guide](./function-calling.md) for the full schema reference, built-in tools (transfer call, end call), and advanced multi-step patterns.

---

## Knowledge Base

A **knowledge base** is a document store attached to an agent. Documents are chunked, embedded, and stored in a vector index. At inference time, OrtaVox performs a semantic search against the knowledge base using the current conversation context and injects the most relevant passages into the LLM's context window.

This is **Retrieval-Augmented Generation (RAG)** — the agent can answer questions grounded in your documents without hallucinating.

**Supported document types:** PDF, DOCX, TXT, Markdown, web URLs (scraped automatically).

**Common use cases:**
- Product documentation and FAQ lookup
- Policy and compliance reference
- Internal knowledge bases for support agents
- Real estate listings, legal clauses, medical protocols

```
User asks a question
         │
         ▼
OrtaVox embeds the question
         │
         ▼
Vector search against your knowledge base
         │
         ▼
Top-k relevant chunks retrieved
         │
         ▼
Chunks injected into LLM context window
         │
         ▼
Agent answers with grounded, accurate information
```

<Info>
Knowledge base retrieval adds approximately 50–100ms to LLM latency. For latency-critical applications, keep your knowledge base focused and small. Broad, unfocused knowledge bases increase retrieval time and reduce answer precision.
</Info>

---

## Dynamic Variables

**Dynamic variables** are `{{variable_name}}` placeholders embedded in your agent's system prompt, first message, or any text field. At call creation time, you supply values for each variable and OrtaVox substitutes them before the agent says its first word.

This lets you build a single agent and personalize every call without creating separate agents for every customer.

### Example

**System prompt with variables:**
```
You are a support agent for {{company_name}}. You are speaking with {{customer_name}}, a {{subscription_tier}} customer. Their account number is {{account_id}}. Today is {{date}}.
```

**Call initiation with variable values:**
```json
{
  "agentId": "agent_abc123",
  "variables": {
    "company_name": "Acme Corp",
    "customer_name": "Sarah",
    "subscription_tier": "Pro",
    "account_id": "ACC-88821",
    "date": "February 25, 2026"
  }
}
```

**What the agent sees at runtime:**
```
You are a support agent for Acme Corp. You are speaking with Sarah, a Pro customer. Their account number is ACC-88821. Today is February 25, 2026.
```

<Warning>
Variables are substituted server-side before the call starts. If a variable is referenced in the prompt but not provided at call creation, OrtaVox will return a `400` error. Always supply all variables your prompt references.
</Warning>

---

## Providers

OrtaVox is **provider-agnostic**. Each component of the pipeline — STT, LLM, TTS — can be independently configured to use whichever provider best fits your requirements for language support, latency, cost, or quality.

| Pipeline Stage | Supported Providers |
|---|---|
| **STT (Speech-to-Text)** | Deepgram Nova-3, AssemblyAI Universal, OpenAI Whisper, Gladia Solaria, Cartesia Ink |
| **LLM** | OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, Ollama (self-hosted) |
| **TTS (Text-to-Speech)** | ElevenLabs, Cartesia, OpenAI TTS, Deepgram Aura, Inworld, AWS Polly, Azure Neural, Google Gemini TTS |

You switch providers by changing a single field on the agent. No infrastructure changes, no redeployment.

**Per-agent configuration:** Each agent has its own provider configuration. You can run a Deepgram + GPT-4o-mini + Cartesia agent alongside an AssemblyAI + Claude Sonnet + ElevenLabs agent with no conflicts.

See the [Providers guide](./providers.md) for a full comparison of latency, language support, and cost characteristics per provider.

---

## Campaigns

A **campaign** is a scheduled bulk outbound calling job. You define a contact list — each row being a phone number plus optional per-contact variables — and OrtaVox works through the list with configurable concurrency, retry logic, and throttling.

**Key campaign properties:**

| Property | Description |
|---|---|
| `agentId` | Which agent handles each call |
| `contacts` | Array of `{ phoneNumber, variables }` objects |
| `maxConcurrency` | How many calls to run simultaneously (default: 10) |
| `retryOnNoAnswer` | Whether to retry contacts that do not pick up |
| `startAt` | ISO-8601 datetime to begin dialing (optional) |
| `callbackTimeZone` | Time zone used for scheduling and retry windows |

Each contact in a campaign can have its own `variables` map, which feeds the agent's dynamic variable substitution. This means every call in a 50,000-contact campaign can greet the recipient by name and reference their specific data.

<Info>
Campaign progress is streamed in real time. Use the `campaign.progress` webhook event or poll `GET /v1/campaigns/{campaignId}` to monitor completion rate, answer rate, and error count.
</Info>

---

## Webhooks

**Webhooks** are HTTP callbacks that OrtaVox sends to your server when significant events occur. They are the primary mechanism for integrating OrtaVox call data into your own systems — CRMs, databases, analytics pipelines, notification services.

**Core webhook events:**

| Event | When it fires |
|---|---|
| `call.started` | Agent has joined the room and the session is live |
| `call.ended` | Call has completed; transcript, metrics, cost, and analysis are all included |
| `call.failed` | Call could not be established or the pipeline errored |
| `tool.called` | Agent invoked a function tool and received a response |
| `agent.error` | The agent pipeline encountered a recoverable or fatal error |
| `campaign.progress` | A campaign contact was processed (called, answered, or failed) |

Webhooks include an `x-ortavox-signature` HMAC header for verification. Always verify this signature before processing the payload.

See the [Webhooks guide](./webhooks.md) for payload shapes, signature verification examples, and retry logic.

---

## Post-Call Analysis

**Post-call analysis** is structured data automatically extracted from a call's transcript after the call ends. You configure a list of extraction tasks on the agent — each task specifying what to extract and in what format — and OrtaVox runs an LLM analysis pass against the transcript and returns the results.

**Supported extraction types:** `string`, `enum`, `boolean`, `number`.

**Example:** extract call outcome (enum), whether follow-up is required (boolean), and a requested callback date (string). This data is delivered in the `call.ended` webhook under the `analysis` key, and is also available via `GET /v1/calls/{callId}/analysis`.

See the [Post-Call Analysis guide](./post-call-analysis.md) for configuration schema and integration patterns.

---

## Pipeline Diagram

The complete request lifecycle of a single conversation turn — from user speech to agent reply:

```
                    ┌─────────────────────────────────────┐
                    │           OrtaVox Pipeline           │
                    └─────────────────────────────────────┘

  User speaks
       │
       ▼
┌─────────────┐    raw audio stream (WebRTC / SIP)
│ VAD (Silero)│  ◄── detects end-of-turn (~50ms)
└──────┬──────┘
       │  audio segment
       ▼
┌─────────────────┐
│  STT Provider   │  ◄── Deepgram Nova-3 / AssemblyAI / Whisper
│  (Transcriber)  │      produces text transcript (~100–200ms)
└────────┬────────┘
         │  transcript text
         ▼
┌──────────────────────────────────────┐
│             LLM Provider             │  ◄── OpenAI / Anthropic / Groq / etc.
│  (system prompt + history + tools)   │      streams first token (~200–400ms)
└────────────────────┬─────────────────┘
                     │  token stream
                     ▼
            ┌────────────────┐
            │  Sentence      │  ◄── OrtaVox assembles complete
            │  Chunker       │      sentence chunks in real time
            └───────┬────────┘
                    │  sentence chunks
                    ▼
          ┌──────────────────┐
          │   TTS Provider   │  ◄── Cartesia / ElevenLabs / OpenAI
          │   (Voice synth)  │      streams audio frames (~80–150ms)
          └────────┬─────────┘
                   │  audio frames (WebRTC)
                   ▼
            User hears agent response

  ──────────────────────────────────────
  Total end-to-end: < 600ms (p50)
  ──────────────────────────────────────
```

---

## Request Lifecycle

A step-by-step trace of a single conversation turn — from the moment the user stops speaking to the moment they hear the agent's response:

1. **User stops speaking.** The VAD (Voice Activity Detection) module — Silero, running at the edge — detects silence and marks the end of the user's turn. This triggers after `endpointingMs` of silence (default: 300ms).

2. **Audio segment is finalized.** The audio from the start of the user's speech to the detected endpoint is packaged and streamed to the STT provider.

3. **Transcription runs.** The STT provider (e.g. Deepgram Nova-3) processes the audio and returns a text transcript. For a typical 5-second utterance, this takes 100–200ms.

4. **LLM receives context.** OrtaVox assembles the full LLM payload: system prompt (with dynamic variables already substituted), conversation history, the new user message, and any tool definitions. This payload is sent to the configured LLM provider.

5. **Streaming begins.** The LLM returns its first token. OrtaVox does not wait for the full response — it begins processing the token stream immediately. Time-to-first-token (TTFT) is typically 200–400ms depending on model and provider.

6. **Sentence chunking.** OrtaVox's sentence chunker accumulates streaming tokens until it detects a complete sentence boundary (`.`, `?`, `!`, or a long clause). The first complete sentence chunk is sent to TTS immediately — before the LLM has finished generating the full response.

7. **TTS synthesis starts.** The TTS provider receives the first sentence chunk and begins synthesizing audio. The first audio frame is available in 80–150ms (Cartesia Sonic 3 is fastest).

8. **Audio plays.** Audio frames are streamed back to the user over WebRTC. The user begins hearing the agent's response while the LLM is still generating the remainder of the reply.

9. **Interruption handling.** If the user speaks while the agent is talking, OrtaVox's interruption detection fires, cancels the remaining TTS audio and LLM tokens, and immediately starts a new transcription cycle with the user's new input.

10. **Tool calls (if any).** If the LLM emits a function call instead of a text response, OrtaVox executes the tool, waits for your server to respond, and re-enters the LLM with the tool result injected into context. Speech synthesis is paused during tool execution.

11. **Turn ends.** When the agent's full response has been spoken, the VAD resumes listening for the user's next turn.

---

## Next Steps

- **[Agents](./agents.md)** — Full agent configuration reference including all fields and versioning.
- **[Web Calls](./web-calls.md)** — Embed a voice agent directly in your browser or mobile app.
- **[Phone Calls](./phone-calls.md)** — Make and receive calls over PSTN/SIP.
- **[Function Calling](./function-calling.md)** — Give your agent the ability to call your APIs mid-conversation.
- **[Providers](./providers.md)** — Compare STT, LLM, and TTS providers by latency, quality, and cost.
- **[Webhooks](./webhooks.md)** — Receive real-time call events on your server.
