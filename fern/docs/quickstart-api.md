# Quickstart — API

**Make your first voice call in under 3 minutes.**

This guide takes you from zero to a running browser-based voice call using the OrtaVox SDK. You will install the SDK, create an agent, start a web call session, and connect from the browser.

---

## Prerequisites

- **Node.js 18+** (for TypeScript/JavaScript) or **Python 3.9+** (for Python)
- An OrtaVox account at [app.ortavox.ai](https://app.ortavox.ai)
- A secret API key (`sk_live_...`) from **Settings → API Keys**

<Warning>
Secret keys (`sk_live_...`) must only be used server-side. Never include them in client-side code, environment files committed to source control, or public repositories. Use public keys (`pk_live_...`) for any code running in the browser.
</Warning>

---

## Step 1 — Install the SDK

<CodeBlocks>
```bash TypeScript
npm install ortavox
```
```bash Python
pip install ortavox
```
</CodeBlocks>

Set your API key as an environment variable:

```bash
# .env
ORTAVOX_API_KEY=sk_live_...
```

<Tip>
Use `dotenv` (Node.js) or `python-dotenv` (Python) to load `.env` files during development. Never hardcode API keys in source files.
</Tip>

---

## Step 2 — Create an Agent

An **agent** is a reusable configuration that defines how your voice AI behaves — which transcriber it listens with, which LLM it reasons with, and which TTS voice it speaks with. Agents are created once and reused across many calls.

<CodeBlocks>
```typescript TypeScript
import Ortavox from 'ortavox';

const client = new Ortavox({ apiKey: process.env.ORTAVOX_API_KEY });

const agent = await client.agents.create({
  name: 'Support Agent',
  transcriber: {
    provider: 'deepgram',
    model: 'nova-3',
    language: 'en',
  },
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful voice assistant. Be concise and friendly.',
    temperature: 0.7,
    maxTokens: 500,
  },
  voice: {
    provider: 'cartesia',
    voiceId: 'sonic-english',
  },
});

console.log('Agent created:', agent.id);
// Agent created: agent_01jk...
```
```python Python
import os
from ortavox import Ortavox

client = Ortavox(api_key=os.environ["ORTAVOX_API_KEY"])

agent = client.agents.create(
    name="Support Agent",
    transcriber={
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
    },
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": "You are a helpful voice assistant. Be concise and friendly.",
        "temperature": 0.7,
        "max_tokens": 500,
    },
    voice={
        "provider": "cartesia",
        "voice_id": "sonic-english",
    },
)

print("Agent created:", agent.id)
# Agent created: agent_01jk...
```
```bash cURL
curl -X POST https://api.ortavox.ai/v1/agents \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Agent",
    "transcriber": {
      "provider": "deepgram",
      "model": "nova-3",
      "language": "en"
    },
    "model": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "systemPrompt": "You are a helpful voice assistant. Be concise and friendly.",
      "temperature": 0.7,
      "maxTokens": 500
    },
    "voice": {
      "provider": "cartesia",
      "voiceId": "sonic-english"
    }
  }'
```
</CodeBlocks>

The API returns an agent object. Save the `id` — you will pass it to every call you create.

<Note>
Agents are persistent and reusable. You typically create agents once (in your setup script or dashboard) and reference them by ID at call time. You do not need to re-create the agent before every call.
</Note>

---

## Step 3 — Start a Web Call

A **web call** creates a real-time WebRTC session hosted on OrtaVox's LiveKit infrastructure. The API returns a short-lived `roomToken` that your frontend uses to connect. The token expires after 60 seconds if unused.

This request must be made **server-side** because it requires your secret key.

<CodeBlocks>
```typescript TypeScript
// Called from your backend (e.g. an Express route handler)
const call = await client.calls.createWebCall({
  agentId: agent.id,
  // Optional: pass metadata to identify this session in analytics
  metadata: {
    customerId: 'cust_abc123',
    source: 'support-widget',
  },
});

console.log('Room token:', call.roomToken);
console.log('Room URL:', call.roomUrl);

// Return these to your frontend — do NOT return your API key
res.json({ roomToken: call.roomToken, roomUrl: call.roomUrl });
```
```python Python
# Called from your backend (e.g. a FastAPI route handler)
call = client.calls.create_web_call(
    agent_id=agent.id,
    metadata={
        "customer_id": "cust_abc123",
        "source": "support-widget",
    },
)

print("Room token:", call.room_token)
print("Room URL:", call.room_url)

# Return these to your frontend — do NOT return your API key
return {"roomToken": call.room_token, "roomUrl": call.room_url}
```
```bash cURL
curl -X POST https://api.ortavox.ai/v1/calls/web-call \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_01jk..."
  }'

# Response:
# {
#   "id": "call_9xz...",
#   "roomToken": "eyJhbGciOiJIUzI1NiIs...",
#   "roomUrl": "wss://livekit.ortavox.ai",
#   "status": "created"
# }
```
</CodeBlocks>

---

## Step 4 — Connect from the Browser

Use the [LiveKit JavaScript SDK](https://github.com/livekit/client-sdk-js) to connect to the room using the `roomToken` and `roomUrl` returned from your backend. The user's microphone stream is published automatically once connected.

```typescript
// Browser / React / Vue — install: npm install livekit-client
import { Room, RoomEvent } from 'livekit-client';

async function startVoiceCall(roomUrl: string, roomToken: string) {
  const room = new Room({
    // Optimize for voice: disable video, enable noise suppression
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // Listen for the agent's audio track
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === 'audio') {
      // Attach the agent's audio to the DOM so it plays through speakers
      const audioElement = track.attach();
      document.body.appendChild(audioElement);
    }
  });

  // Connect to the OrtaVox-managed LiveKit room
  await room.connect(roomUrl, roomToken);

  // Publish the user's microphone — the agent starts listening immediately
  await room.localParticipant.setMicrophoneEnabled(true);

  console.log('Connected. The agent is now listening.');

  return room;
}

// To end the call:
// await room.disconnect();
```

<Info>
OrtaVox manages the LiveKit room lifecycle. You do not need a LiveKit account or server. The `roomUrl` and `roomToken` are issued and managed entirely by OrtaVox.
</Info>

---

## Complete Example (Backend + Frontend)

Here is the full flow in one place:

**Backend (Node.js / Express):**

```typescript
import express from 'express';
import Ortavox from 'ortavox';

const app = express();
const client = new Ortavox({ apiKey: process.env.ORTAVOX_API_KEY });

// Pre-create your agent once at startup (or create it in the dashboard)
let agentId: string;

app.get('/start-call', async (req, res) => {
  try {
    const call = await client.calls.createWebCall({ agentId });
    // Only expose the room token — never the API key
    res.json({ roomToken: call.roomToken, roomUrl: call.roomUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start call' });
  }
});

app.listen(3000);
```

**Frontend:**

```typescript
// Fetch the token from your backend
const { roomToken, roomUrl } = await fetch('/start-call').then(r => r.json());

// Connect to the call
const room = await startVoiceCall(roomUrl, roomToken);
```

---

## Supported Providers

### Speech-to-Text (STT)

| Provider | Models | Best For |
|---|---|---|
| `deepgram` | `nova-3`, `nova-2`, `enhanced` | English, low latency (recommended) |
| `assemblyai` | `nano`, `best` | Multilingual, high accuracy |
| `openai` | `whisper-1` | When OpenAI is already in your stack |

### LLM

| Provider | Models | Best For |
|---|---|---|
| `openai` | `gpt-4o`, `gpt-4o-mini`, `o4-mini` | General purpose, tool use |
| `anthropic` | `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-3-5` | Complex reasoning, long context |
| `google` | `gemini-2.0-flash`, `gemini-1.5-pro` | Fast, multilingual |
| `groq` | `llama-3.3-70b`, `mixtral-8x7b` | Lowest latency, open-source |

### Text-to-Speech (TTS)

| Provider | Models / Voice IDs | Best For |
|---|---|---|
| `cartesia` | `sonic-english`, `sonic-multilingual` | Lowest TTS latency (recommended) |
| `elevenlabs` | Any voice ID from your ElevenLabs library | Highest voice quality |
| `openai` | `alloy`, `nova`, `shimmer`, `echo`, `fable`, `onyx` | Simple, no external account needed |
| `deepgram` | `aura-asteria-en`, `aura-luna-en` | Low latency, good quality |
| `inworld` | Inworld voice IDs | Character-focused voices |

---

## Next Steps

<CardGroup cols={3}>
  <Card
    title="Phone Calls"
    icon="phone"
    href="/docs/phone-calls"
  >
    Extend your agent to answer inbound calls and make outbound calls on real phone numbers.
  </Card>
  <Card
    title="Function Calling"
    icon="wrench"
    href="/docs/function-calling"
  >
    Let the agent invoke backend tools — look up orders, check availability, send notifications — mid-conversation.
  </Card>
  <Card
    title="Webhooks"
    icon="webhook"
    href="/docs/webhooks"
  >
    Subscribe to call lifecycle events and receive real-time transcripts, analysis, and cost data after every call.
  </Card>
</CardGroup>
