# SDKs & Clients

**OrtaVox provides official server-side SDKs for TypeScript/Node.js and Python, and relies on LiveKit's client SDKs to connect audio in the browser and on mobile.**

---

## How the SDKs Fit Together

OrtaVox uses a two-SDK model:

- **OrtaVox Server SDK** — used on your backend to manage agents, initiate calls, handle campaigns, and consume analytics. This is what you use to call `https://api.ortavox.ai`.
- **LiveKit Client SDK** — used on the frontend (browser, iOS, Android) to connect the user's microphone and speaker to the LiveKit room that OrtaVox provisions for each call.

<Note>
OrtaVox wraps LiveKit for the WebRTC transport layer. You use the OrtaVox SDK to create and manage agents, calls, and campaigns. You use the LiveKit SDK to connect audio — specifically, you pass the `roomToken` that OrtaVox returns to the LiveKit client to join the room. The two SDKs are complementary, not interchangeable.
</Note>

```
Your Backend                          Your Frontend
─────────────────────────             ──────────────────────────────
OrtaVox Server SDK                    LiveKit Client SDK
  │                                     │
  │  POST /v1/calls/web                 │  room.connect(url, roomToken)
  │  ← { roomToken, roomName }          │
  │                                     │
  └──── roomToken ─────────────────────►│
                                        │  Audio stream ◄──► OrtaVox Agent
```

---

## Server SDKs

Use the server SDK to manage your OrtaVox resources from your backend. Never expose your API key to the client.

| Language | Package | Install |
|---|---|---|
| TypeScript / Node.js | `ortavox-sdk` | `npm install ortavox-sdk` |
| Python | `ortavox-sdk` | `pip install ortavox-sdk` |
| Go | — | Coming soon |
| Ruby | — | Coming soon |
| Java | — | Coming soon |

---

## Client SDKs

Use a LiveKit client SDK on the frontend to connect the user's audio to the OrtaVox room. OrtaVox returns a `roomToken` and `roomUrl` when you initiate a web call — pass these directly to the LiveKit client.

| Platform | Package | Notes |
|---|---|---|
| Web (React) | `@livekit/components-react` | Pre-built `<LiveKitRoom>` component. Fastest integration path for React apps. |
| Web (vanilla JS) | `livekit-client` | Full control over room connection and track management. |
| React Native | `@livekit/react-native` | iOS and Android support via a single package. |
| iOS (Swift) | LiveKit Swift SDK | Native Swift client. Install via Swift Package Manager. |
| Android | LiveKit Android SDK | Native Kotlin client. Install via Maven. |
| Flutter | `livekit_client` | Cross-platform mobile via Dart/Flutter. |

Refer to the [LiveKit documentation](https://docs.livekit.io) for detailed client SDK installation, room connection, and track publishing guides.

---

## TypeScript / Node.js SDK

### Installation

```bash
npm install ortavox
```

### Client Instantiation

```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({
  apiKey: process.env.ORTAVOX_API_KEY, // Never hardcode keys
});
```

### Create an Agent

```typescript
const agent = await client.agents.create({
  name: "Sales Qualification Agent",
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en",
  },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: `You are a sales qualification agent for {{company_name}}.
Your goal is to understand the prospect's needs and determine if they are a good fit.
Keep responses under 2 sentences. Be warm, professional, and direct.`,
    temperature: 0.7,
    maxTokens: 256,
  },
  voice: {
    provider: "cartesia",
    voiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    speed: 1.05,
  },
  firstMessage: "Hi {{first_name}}, thanks for your time today. I wanted to learn more about what you're looking for — can you tell me a bit about your current setup?",
  endCallAfterSilenceMs: 25000,
  maxCallDurationMs: 900000,
  recordingEnabled: true,
  webhookUrl: "https://api.yourapp.com/webhooks/ortavox",
});

console.log("Agent created:", agent.data.id);
// → Agent created: agent_abc123
```

### Initiate a Web Call

```typescript
const call = await client.calls.createWebCall({
  agentId: "agent_abc123",
  variables: {
    company_name: "Acme Corp",
    first_name: "Sarah",
  },
  metadata: {
    userId: "usr_789",
    source: "pricing-page",
  },
});

// Pass roomToken to your frontend — do not cache it
console.log(call.data.roomToken); // short-lived JWT
console.log(call.data.roomUrl);   // wss://livekit.ortavox.ai
console.log(call.data.callId);    // call_xyz789
```

### Initiate a Phone Call (Outbound)

```typescript
const call = await client.calls.createPhoneCall({
  agentId: "agent_abc123",
  to: "+12025550147",       // E.164 format
  from: "+18005551234",     // Your OrtaVox-managed number
  variables: {
    company_name: "Acme Corp",
    first_name: "James",
  },
  metadata: {
    leadId: "lead_99210",
    campaign: "q1-outbound",
  },
});

console.log("Call initiated:", call.data.callId);
console.log("Status:", call.data.status); // → "dialing"
```

### List Agents

```typescript
const agents = await client.agents.list({
  limit: 20,
  offset: 0,
});

agents.data.forEach((agent) => {
  console.log(agent.id, agent.name, agent.version);
});
```

### Get an Agent

```typescript
const agent = await client.agents.get("agent_abc123");

console.log(agent.data.name);                   // → "Sales Qualification Agent"
console.log(agent.data.model.model);            // → "gpt-4o-mini"
console.log(agent.data.version);                // → 3
console.log(agent.data.createdAt);              // → "2026-02-01T10:00:00Z"
```

### Update an Agent

```typescript
// Only fields you pass are changed. Everything else is preserved.
const updated = await client.agents.update("agent_abc123", {
  model: {
    systemPrompt: "Updated prompt — now more concise and direct.",
    temperature: 0.5,
  },
  endCallAfterSilenceMs: 20000,
  recordingEnabled: false,
});

console.log("New version:", updated.data.version); // → 4
```

### Delete an Agent

```typescript
await client.agents.delete("agent_abc123");
// Returns 204 No Content on success
```

---

## Python SDK

### Installation

```bash
pip install ortavox
```

### Client Instantiation

```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])
```

### Create an Agent

```python
agent = client.agents.create(
    name="Sales Qualification Agent",
    transcriber={
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en",
    },
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": (
            "You are a sales qualification agent for {{company_name}}. "
            "Your goal is to understand the prospect's needs and determine fit. "
            "Keep responses under 2 sentences. Be warm, professional, and direct."
        ),
        "temperature": 0.7,
        "max_tokens": 256,
    },
    voice={
        "provider": "cartesia",
        "voice_id": "79a125e8-cd45-4c13-8a67-188112f4dd22",
        "speed": 1.05,
    },
    first_message=(
        "Hi {{first_name}}, thanks for your time today. "
        "I wanted to learn more about what you're looking for — "
        "can you tell me a bit about your current setup?"
    ),
    end_call_after_silence_ms=25000,
    max_call_duration_ms=900000,
    recording_enabled=True,
    webhook_url="https://api.yourapp.com/webhooks/ortavox",
)

print("Agent created:", agent.data.id)
# → Agent created: agent_abc123
```

### Initiate a Web Call

```python
call = client.calls.create_web_call(
    agent_id="agent_abc123",
    variables={
        "company_name": "Acme Corp",
        "first_name": "Sarah",
    },
    metadata={
        "user_id": "usr_789",
        "source": "pricing-page",
    },
)

# Pass room_token to your frontend — do not cache it
print(call.data.room_token)  # short-lived JWT
print(call.data.room_url)    # wss://livekit.ortavox.ai
print(call.data.call_id)     # call_xyz789
```

### Initiate a Phone Call (Outbound)

```python
call = client.calls.create_phone_call(
    agent_id="agent_abc123",
    to="+12025550147",      # E.164 format
    from_="+18005551234",   # Your OrtaVox-managed number
    variables={
        "company_name": "Acme Corp",
        "first_name": "James",
    },
    metadata={
        "lead_id": "lead_99210",
        "campaign": "q1-outbound",
    },
)

print("Call initiated:", call.data.call_id)
print("Status:", call.data.status)  # → "dialing"
```

### List Agents

```python
agents = client.agents.list(limit=20, offset=0)

for agent in agents.data:
    print(agent.id, agent.name, agent.version)
```

### Get an Agent

```python
agent = client.agents.get("agent_abc123")

print(agent.data.name)                    # → "Sales Qualification Agent"
print(agent.data.model["model"])          # → "gpt-4o-mini"
print(agent.data.version)                 # → 3
print(agent.data.created_at)             # → "2026-02-01T10:00:00Z"
```

### Update an Agent

```python
# Only fields you pass are changed. Everything else is preserved.
updated = client.agents.update(
    "agent_abc123",
    model={
        "system_prompt": "Updated prompt — now more concise and direct.",
        "temperature": 0.5,
    },
    end_call_after_silence_ms=20000,
    recording_enabled=False,
)

print("New version:", updated.data.version)  # → 4
```

### Delete an Agent

```python
client.agents.delete("agent_abc123")
# Returns None on success (204 No Content)
```

---

## Connecting Audio on the Frontend (Web / React)

Once your backend has called `createWebCall` and returned the `roomToken` and `roomUrl`, use the LiveKit React components to connect the user's audio:

```bash
npm install @livekit/components-react livekit-client
```

```tsx
import { LiveKitRoom, useVoiceAssistant, BarVisualizer } from "@livekit/components-react";

interface VoiceCallProps {
  roomUrl: string;
  roomToken: string;
}

export function VoiceCall({ roomUrl, roomToken }: VoiceCallProps) {
  return (
    <LiveKitRoom
      serverUrl={roomUrl}
      token={roomToken}
      connect={true}
      audio={true}
      video={false}
    >
      <AgentVisualizer />
    </LiveKitRoom>
  );
}

function AgentVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div>
      <p>Agent status: {state}</p>
      {audioTrack && (
        <BarVisualizer trackRef={audioTrack} style={{ height: 60 }} />
      )}
    </div>
  );
}
```

For vanilla JavaScript (without React), use `livekit-client` directly:

```typescript
import { Room, RoomEvent } from "livekit-client";

const room = new Room();

await room.connect(roomUrl, roomToken, {
  autoSubscribe: true,
});

room.on(RoomEvent.TrackSubscribed, (track) => {
  if (track.kind === "audio") {
    track.attach(); // attaches to an <audio> element
  }
});
```

---

## Error Handling

All SDK methods throw typed errors. Always wrap API calls in try/catch:

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient, OrtavoxAPIError } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

try {
  const call = await client.calls.createWebCall({ agentId: "agent_abc123" });
  return call.data.roomToken;
} catch (error) {
  if (error instanceof OrtavoxAPIError) {
    console.error(`API error ${error.status}: ${error.message}`);
    // error.status → 400, 401, 403, 404, 429, 500
    // error.code   → "AGENT_NOT_FOUND", "INSUFFICIENT_CREDITS", etc.
  }
  throw error;
}
```
  </Tab>
  <Tab title="Python">
```python
from ortavox import OrtavoxClient
from ortavox.exceptions import OrtavoxAPIError

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

try:
    call = client.calls.create_web_call(agent_id="agent_abc123")
    return call.data.room_token
except OrtavoxAPIError as e:
    print(f"API error {e.status}: {e.message}")
    # e.status → 400, 401, 403, 404, 429, 500
    # e.code   → "AGENT_NOT_FOUND", "INSUFFICIENT_CREDITS", etc.
    raise
```
  </Tab>
</Tabs>

---

## Community-Maintained SDKs

The following SDKs are maintained by the OrtaVox community and are not officially supported. Use them at your own discretion:

| Language | Repository | Status |
|---|---|---|
| PHP | Community GitHub | Experimental |
| .NET / C# | Community GitHub | Experimental |

<Note>
If you have built an SDK for OrtaVox in another language, let us know at hello@ortavox.ai and we will list it here.
</Note>

---

## Next Steps

- **[Authentication](./authentication.md)** — Understanding API key types, scopes, and secure key management.
- **[Web Calls](./web-calls.md)** — Full web call guide including browser integration and token lifecycle.
- **[Phone Calls](./phone-calls.md)** — Outbound and inbound phone call configuration.
- **[API Reference](/api)** — Complete OpenAPI reference for every endpoint and request schema.
