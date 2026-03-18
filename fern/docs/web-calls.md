# Web Calls

Embed a real-time voice AI agent directly in any browser or web application using WebRTC.

## What Are Web Calls?

Web calls are browser-to-agent voice conversations that run over WebRTC via the LiveKit real-time infrastructure. When a user clicks "Talk to an agent" on your website, OrtaVox provisions a secure audio room, connects your configured agent to it, and hands the browser a short-lived token to join. The entire session — STT, LLM inference, TTS synthesis — runs in OrtaVox's managed pipeline. Your frontend only needs to handle audio I/O.

**Common use cases:**

- **Website assistant** — answer product questions on landing pages without a support ticket
- **Support widget** — voice-first alternative to live chat, embedded in a help center
- **Product demo agent** — guided interactive demo that walks prospects through features
- **Onboarding flow** — voice-driven setup wizard for SaaS products
- **Accessibility interface** — voice input/output for users who prefer or require it

---

## Prerequisites

Before creating a web call:

1. An active OrtaVox account — [app.ortavox.ai](https://app.ortavox.ai)
2. A secret API key (`sk_live_...`) from **Dashboard → Developer → API Keys**
3. At least one agent created and configured with an LLM, STT provider, and TTS provider

<Warning>
Never expose your `sk_live_...` secret key in browser-side code. All calls to `POST /v1/calls/web` must be made from your backend server. Return only the ephemeral `token` and `url` to the client.
</Warning>

---

## How It Works

```
Browser                 Your Backend              OrtaVox API           LiveKit Room
  │                          │                        │                      │
  │── POST /api/start-call ──▶│                        │                      │
  │                          │── POST /v1/calls/web ──▶│                      │
  │                          │                        │── provision room ────▶│
  │                          │◀── { token, url } ─────│                      │
  │◀──── { token, url } ─────│                        │                      │
  │                          │                        │                      │
  │── room.connect(url, token) ────────────────────────────────────────────▶ │
  │◀─────────────────────── real-time audio (WebRTC) ──────────────────────  │
```

1. Your backend calls `POST /v1/calls/web` with your `agentId`
2. OrtaVox creates a LiveKit room and returns a short-lived `token` and WebSocket `url`
3. Your frontend connects to the room using the LiveKit SDK
4. OrtaVox automatically joins the room as the agent participant
5. Audio flows bidirectionally — user mic in, agent voice out

---

## Step 1 — Initiate a Web Call (Backend)

Call `POST /v1/calls/web` from your server to create a session. This is the only step that requires your secret API key.

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

// Express route example
app.post("/api/start-call", async (req, res) => {
  const session = await client.calls.createWebCall({
    agentId: "agent_abc123",
    metadata: {
      userId: req.user.id,
      plan: req.user.plan,
    },
  });

  res.json({
    token: session.data.token,
    url: session.data.url,
    callId: session.data.callId,
  });
});
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()
client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

@app.post("/api/start-call")
async def start_call(request: Request):
    user = request.state.user  # your auth middleware

    session = client.calls.create_web_call(
        agent_id="agent_abc123",
        metadata={
            "user_id": user.id,
            "plan": user.plan,
        },
    )

    return JSONResponse({
        "token": session.data.token,
        "url": session.data.url,
        "call_id": session.data.call_id,
    })
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/web \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "agentId": "agent_abc123",
    "metadata": {
      "userId": "usr_999",
      "plan": "pro"
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
    "roomName": "room_5f3a1b",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "url": "wss://engine.ortavox.ai",
    "expiresAt": "2026-02-25T15:30:00Z"
  }
}
```

| Field | Description |
|---|---|
| `callId` | Stable identifier for this call. Use for analytics and webhook correlation. |
| `roomName` | LiveKit room name — useful for debugging. |
| `token` | Short-lived JWT valid for 30 minutes. Pass this to the frontend. |
| `url` | WebSocket URL for the LiveKit room. Pass alongside `token`. |
| `expiresAt` | Token expiry. If the user has not connected by this time, request a new token. |

---

## Step 2 — Connect from the Browser

### Option A — Raw LiveKit Client

Install the LiveKit JavaScript SDK:

```bash
npm install livekit-client
```

```typescript
import {
  Room,
  RoomEvent,
  Track,
  RoomConnectOptions,
} from "livekit-client";

async function startVoiceCall(token: string, url: string) {
  const room = new Room({
    // Automatically resubscribe to tracks after a brief network interruption
    adaptiveStream: true,
    dynacast: true,
  });

  const connectOptions: RoomConnectOptions = {
    autoSubscribe: true,
  };

  // Connect to the OrtaVox-managed room
  await room.connect(url, token, connectOptions);

  // Enable the user's microphone
  await room.localParticipant.setMicrophoneEnabled(true);

  // Play agent audio as it arrives
  room.on(
    RoomEvent.TrackSubscribed,
    (track, _publication, participant) => {
      if (
        track.kind === Track.Kind.Audio &&
        participant.identity !== room.localParticipant.identity
      ) {
        const audioEl = track.attach();
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
      }
    }
  );

  // Clean up detached tracks to avoid memory leaks
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });

  // Handle disconnection
  room.on(RoomEvent.Disconnected, (reason) => {
    console.log("Call ended:", reason);
    // Update your UI state here
  });

  return room;
}

// To end the call:
// await room.disconnect();
```

### Option B — @livekit/components-react (Recommended for React)

Install the LiveKit React components package:

```bash
npm install @livekit/components-react livekit-client
```

```tsx
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface VoiceWidgetProps {
  token: string;
  serverUrl: string;
  onCallEnd?: () => void;
}

export function VoiceWidget({ token, serverUrl, onCallEnd }: VoiceWidgetProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onCallEnd}
    >
      {/* Renders all remote audio tracks automatically */}
      <RoomAudioRenderer />
      <AgentStatusUI />
    </LiveKitRoom>
  );
}

function AgentStatusUI() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="agent-ui">
      <p className="status">Agent is {state}</p>
      {audioTrack && (
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={7}
        />
      )}
    </div>
  );
}
```

---

## Custom React Hook — useVoiceAssistant

For teams that want full control over UI state without the LiveKit components library, here is a lightweight custom hook that wraps the LiveKit room lifecycle:

```tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";

type CallState =
  | "idle"
  | "connecting"
  | "connected"
  | "agent-speaking"
  | "user-speaking"
  | "reconnecting"
  | "ended"
  | "error";

interface UseVoiceAssistantOptions {
  onTranscript?: (speaker: "user" | "agent", text: string) => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const roomRef = useRef<Room | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const connect = useCallback(async (url: string, token: string) => {
    setCallState("connecting");

    try {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => setCallState("connected"));
      room.on(RoomEvent.Reconnecting, () => setCallState("reconnecting"));
      room.on(RoomEvent.Reconnected, () => setCallState("connected"));

      room.on(RoomEvent.Disconnected, () => {
        setCallState("ended");
        options.onEnd?.();
      });

      // Play agent audio
      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (
          track.kind === Track.Kind.Audio &&
          participant.identity !== room.localParticipant.identity
        ) {
          const el = track.attach();
          el.autoplay = true;
          document.getElementById("ortavox-audio-root")?.appendChild(el);
          setCallState("agent-speaking");
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        setCallState("connected");
      });

      await room.connect(url, token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      setCallState("error");
      options.onError?.(err as Error);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  return { callState, isMuted, connect, disconnect, toggleMute };
}
```

Usage:

```tsx
export function SupportButton() {
  const { callState, isMuted, connect, disconnect, toggleMute } =
    useVoiceAssistant({
      onEnd: () => console.log("Call ended"),
    });

  const handleStart = async () => {
    // Call your backend to get a token
    const res = await fetch("/api/start-call", { method: "POST" });
    const { token, url } = await res.json();
    await connect(url, token);
  };

  if (callState === "idle" || callState === "ended") {
    return <button onClick={handleStart}>Talk to Support</button>;
  }

  return (
    <div>
      <span>Status: {callState}</span>
      <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
      <button onClick={disconnect}>End Call</button>
    </div>
  );
}
```

---

## Advanced Features

### Metadata Injection

Pass any key-value pairs in the `metadata` field when creating the web call. This data is:

- Available in all webhook payloads for this call
- Accessible to the agent's system prompt via `{{metadata.key}}` template syntax
- Returned in the `call.ended` event for post-call processing

```json
{
  "agentId": "agent_abc123",
  "metadata": {
    "userId": "usr_999",
    "accountTier": "enterprise",
    "currentPage": "/pricing",
    "cartValue": "349.00",
    "locale": "en-US"
  }
}
```

The agent's system prompt can reference these values:

```
You are a sales assistant. The user is on the {{metadata.currentPage}} page
and their cart value is ${{metadata.cartValue}}. Their account tier is
{{metadata.accountTier}}.
```

### Custom Call ID

Supply your own `callId` to correlate OrtaVox calls with records in your own database:

```json
{
  "agentId": "agent_abc123",
  "callId": "your-internal-session-id-7842"
}
```

<Note>
Custom call IDs must be unique per account. If you reuse an ID, the API returns a `409 Conflict` error.
</Note>

### Call Recording

Enable recording at call creation time. Recordings are stored for the duration configured in your agent's `dataStorageRetentionDays` setting and retrievable via `GET /v1/calls/{callId}/recording`.

```json
{
  "agentId": "agent_abc123",
  "recordingEnabled": true
}
```

<Warning>
Recording laws vary by jurisdiction. Many regions require you to disclose to the caller that the call is being recorded. Configure your agent's opening prompt to include this disclosure where required.
</Warning>

---

## Events

Subscribe to these webhook events to respond to web call lifecycle changes. Configure your webhook URL in **Dashboard → Settings → Webhooks** or via `POST /v1/webhooks`.

### call.started

Fired when the agent has joined the room and the session is live.

```json
{
  "event": "call.started",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "roomName": "room_5f3a1b",
  "timestamp": "2026-02-25T14:00:00Z",
  "metadata": {
    "userId": "usr_999"
  }
}
```

### call.ended

Fired after the call completes with full transcript and metrics.

```json
{
  "event": "call.ended",
  "callId": "call_xyz789",
  "agentId": "agent_abc123",
  "durationMs": 183400,
  "terminationReason": "user_hangup",
  "timestamp": "2026-02-25T14:03:03Z",
  "transcript": [
    { "speaker": "agent", "text": "Hi! How can I help you today?", "startMs": 0 },
    { "speaker": "user", "text": "I have a question about pricing.", "startMs": 3200 },
    { "speaker": "agent", "text": "Of course! Our Pro plan starts at...", "startMs": 5100 }
  ],
  "metrics": {
    "e2eLatencyMs": { "mean": 520, "p50": 490, "p95": 780 },
    "sttLatencyMs": { "mean": 185 },
    "llmTtftMs": { "mean": 230 },
    "ttsTtfbMs": { "mean": 95 },
    "interruptionCount": 1
  },
  "cost": {
    "llm": 0.0009,
    "tts": 0.42,
    "stt": 0.011,
    "total": 0.4319
  }
}
```

---

## Best Practices

### Handle Connection Errors Gracefully

Wrap `room.connect()` in a try/catch and surface a user-friendly message. Common failure modes: microphone permission denied, WebSocket blocked by a corporate firewall, token expired.

```typescript
try {
  await room.connect(url, token);
} catch (err) {
  if (err.message.includes("Permission denied")) {
    showError("Microphone access is required. Please allow microphone access and try again.");
  } else {
    showError("Unable to connect. Please check your internet connection.");
  }
}
```

### Implement Reconnect with Backoff

The LiveKit SDK automatically attempts reconnection on brief network interruptions. For persistent failures, implement a retry button rather than auto-reconnecting indefinitely.

```typescript
room.on(RoomEvent.Disconnected, async (reason) => {
  if (reason === DisconnectReason.SIGNAL_CLOSE) {
    // Transient network issue — SDK will auto-reconnect
    setCallState("reconnecting");
  } else {
    // Permanent disconnect (server closed, token expired, etc.)
    setCallState("ended");
    await room.disconnect();
  }
});
```

### Show a Speaking Indicator

Use `RoomEvent.ActiveSpeakersChanged` to detect when the agent is speaking and render a visual indicator. This significantly improves perceived quality.

```typescript
room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
  const agentSpeaking = speakers.some(
    (s) => s.identity !== room.localParticipant.identity
  );
  setAgentSpeaking(agentSpeaking);
});
```

### Request Microphone Permission Early

Request microphone access before initiating the call so the user sees the browser permission prompt at a natural moment rather than mid-conversation.

```typescript
async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // release immediately
    return true;
  } catch {
    return false;
  }
}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| No audio from agent | Audio track not attached to DOM | Call `track.attach()` and append the element to `document.body` |
| Microphone not working | Browser permission denied | Call `navigator.mediaDevices.getUserMedia` before `room.connect` and handle the `NotAllowedError` |
| `401 Unauthorized` on connect | Expired or invalid token | Tokens expire after 30 minutes. Request a fresh token from your backend. |
| `WebSocket connection failed` | Corporate firewall blocking WSS | Verify port 443 is open and the firewall permits WebSocket Upgrade headers |
| Agent joins but does not speak | Agent misconfigured (no TTS) | Check agent config in the dashboard — ensure a TTS provider and voice are set |
| Echo in audio | Speaker audio feeding back into mic | Recommend headphones in UI; WebRTC echo cancellation works but is not perfect with loud speakers |
| High latency (> 1.5s) | Slow LLM or TTS provider | Switch to Groq + Cartesia Sonic for the lowest-latency path |
| Call drops after 10 minutes | `maxCallDurationMs` too low | Increase `max_call_duration` on the agent, up to 3600s (1 hour) |
