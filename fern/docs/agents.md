# Agents

An **agent** is the central entity in OrtaVox. It is a persistent, reusable configuration that defines exactly how your AI voice assistant will listen, think, and speak. Every call you start is powered by an agent.

Concretely, an agent bundles together:

- **Transcriber (STT)** — converts the caller's speech into text in real time
- **Model (LLM)** — reads the conversation, follows your instructions, and generates a response
- **Voice (TTS)** — synthesizes the model's response back into natural-sounding speech
- **Tools** — optional function definitions that let the agent call your APIs mid-conversation
- **Prompt** — your system prompt that shapes personality, scope, and behavior

Agents are created once and reused across many calls. You can update an agent at any time; changes are applied to future calls while calls already in progress continue using the configuration they started with.

---

## Create an Agent

`POST https://api.ortavox.ai/v1/agents/create`

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const agent = await client.agents.create({
  name: "Customer Support Agent",
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en"
  },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: `You are a friendly customer support agent for Acme Corp.
Keep responses concise and helpful. If you cannot resolve an issue, offer to transfer the caller.`,
    temperature: 0.7,
    maxTokens: 512
  },
  voice: {
    provider: "elevenlabs",
    voiceId: "dqzVFKHwZvR9YMQoFM67",
    speed: 1.0,
    stability: 0.75
  },
  firstMessage: "Hi, thanks for calling Acme support. How can I help you today?",
  endCallMessage: "Thanks for calling. Have a great day!",
  endCallAfterSilenceMs: 30000,
  maxCallDurationMs: 1800000,
  recordingEnabled: true,
  webhookUrl: "https://api.yourapp.com/webhooks/ortavox",
  metadata: { team: "support", tier: "pro" }
});

console.log("Created agent:", agent.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

agent = client.agents.create(
    name="Customer Support Agent",
    transcriber={
        "provider": "deepgram",
        "model": "nova-3",
        "language": "en"
    },
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": (
            "You are a friendly customer support agent for Acme Corp. "
            "Keep responses concise and helpful. If you cannot resolve an issue, "
            "offer to transfer the caller."
        ),
        "temperature": 0.7,
        "max_tokens": 512
    },
    voice={
        "provider": "elevenlabs",
        "voice_id": "dqzVFKHwZvR9YMQoFM67",
        "speed": 1.0,
        "stability": 0.75
    },
    first_message="Hi, thanks for calling Acme support. How can I help you today?",
    end_call_message="Thanks for calling. Have a great day!",
    end_call_after_silence_ms=30000,
    max_call_duration_ms=1800000,
    recording_enabled=True,
    webhook_url="https://api.yourapp.com/webhooks/ortavox",
    metadata={"team": "support", "tier": "pro"}
)

print("Created agent:", agent.data.id)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/agents/create \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent",
    "transcriber": {
      "provider": "deepgram",
      "model": "nova-3",
      "language": "en"
    },
    "model": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "systemPrompt": "You are a friendly customer support agent for Acme Corp.",
      "temperature": 0.7,
      "maxTokens": 512
    },
    "voice": {
      "provider": "elevenlabs",
      "voiceId": "dqzVFKHwZvR9YMQoFM67",
      "speed": 1.0,
      "stability": 0.75
    },
    "firstMessage": "Hi, thanks for calling Acme support. How can I help you today?",
    "endCallMessage": "Thanks for calling. Have a great day!",
    "endCallAfterSilenceMs": 30000,
    "maxCallDurationMs": 1800000,
    "recordingEnabled": true,
    "webhookUrl": "https://api.yourapp.com/webhooks/ortavox",
    "metadata": { "team": "support", "tier": "pro" }
  }'
```
  </Tab>
</Tabs>

---

## Agent Fields Reference

### Top-Level Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | — | Human-readable label for the agent. Shown in the dashboard and logs. |
| `firstMessage` | string | No | `null` | The exact message the agent speaks when a call connects. If omitted, the agent waits for the user to speak first. |
| `endCallMessage` | string | No | `null` | Message spoken by the agent immediately before hanging up (e.g. after silence timeout or when `end_call` tool fires). |
| `endCallAfterSilenceMs` | integer | No | `30000` | Milliseconds of user silence after which the agent ends the call. Minimum: `5000`. Set to `0` to disable. |
| `maxCallDurationMs` | integer | No | `3600000` | Hard cap on call length in milliseconds. When reached, the agent speaks `endCallMessage` and hangs up. Maximum: `7200000` (2 hours). |
| `recordingEnabled` | boolean | No | `false` | When `true`, OrtaVox records the full call audio and provides a download URL in the post-call webhook payload. |
| `webhookUrl` | string | No | `null` | HTTPS URL that receives call lifecycle events (call started, ended, failed, transcripts). See the [Webhooks guide](./webhooks.md). |
| `metadata` | object | No | `{}` | Arbitrary key-value pairs attached to the agent. Returned on all API responses and webhook payloads for your internal tracking. |

---

### `transcriber` Object

Controls how the caller's speech is converted to text.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `transcriber.provider` | string | Yes | — | STT provider. One of: `deepgram`, `assemblyai`. |
| `transcriber.model` | string | No | Provider default | Model name. For Deepgram: `nova-3`, `nova-2`. For AssemblyAI: `universal`. |
| `transcriber.language` | string | No | `"en"` | BCP-47 language code, e.g. `"en"`, `"es"`, `"fr"`, `"de"`. See the [Providers guide](./providers.md) for per-provider language support. |

---

### `model` Object

Controls the LLM that generates the agent's responses.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `model.provider` | string | Yes | — | LLM provider. One of: `openai`, `anthropic`, `google`, `groq`, `deepseek`. |
| `model.model` | string | Yes | — | Model identifier, e.g. `"gpt-4o"`, `"claude-sonnet-4-5"`, `"gemini-2.5-flash"`. |
| `model.systemPrompt` | string | No | `""` | The system prompt injected at the start of every conversation. Defines personality, scope, and instructions. Supports [dynamic variables](./dynamic-variables.md). |
| `model.temperature` | float | No | `0.8` | Sampling temperature controlling response creativity. Range: `0.0` (deterministic) to `2.0` (very creative). |
| `model.maxTokens` | integer | No | `1024` | Maximum completion tokens the LLM will generate per turn. Lower values produce shorter, faster responses. |
| `model.tools` | array | No | `[]` | List of tool IDs (strings) or inline tool definition objects to attach to this agent. See [Function Calling](./function-calling.md). |

---

### `voice` Object

Controls text-to-speech synthesis.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `voice.provider` | string | Yes | — | TTS provider. One of: `elevenlabs`, `cartesia`, `openai`, `deepgram`, `inworld`. |
| `voice.voiceId` | string | Yes | — | Provider-specific voice identifier. Browse available voices in the [Dashboard](https://app.ortavox.ai/voices). |
| `voice.speed` | float | No | `1.0` | Speech rate multiplier. Range: `0.5` (very slow) to `2.0` (very fast). |
| `voice.stability` | float | No | `0.75` | ElevenLabs only. Controls voice consistency across sentences. Range: `0.0` (expressive) to `1.0` (stable). |

<Info>
Additional ElevenLabs-specific settings (`similarityBoost`, `style`, `useSpeakerBoost`) and cross-provider settings (backchannels, interruption sensitivity, ambient sound) are documented in the [Voice Settings guide](./voice-settings.md).
</Info>

---

## Get an Agent

`GET https://api.ortavox.ai/v1/agents/{agentId}`

<Tabs>
  <Tab title="TypeScript">
```typescript
const agent = await client.agents.get("agent_abc123");
console.log(agent.data.name, agent.data.version);
```
  </Tab>
  <Tab title="Python">
```python
agent = client.agents.get("agent_abc123")
print(agent.data.name, agent.data.version)
```
  </Tab>
  <Tab title="cURL">
```bash
curl https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer sk_live_..."
```
  </Tab>
</Tabs>

---

## Update an Agent

`PATCH https://api.ortavox.ai/v1/agents/{agentId}`

Send only the fields you want to change. Unspecified fields are left unchanged. Every update increments the agent's version number.

<Tabs>
  <Tab title="TypeScript">
```typescript
const updated = await client.agents.update("agent_abc123", {
  model: {
    systemPrompt: "You are an updated, more concise support agent.",
    temperature: 0.6
  },
  endCallAfterSilenceMs: 20000
});

console.log("New version:", updated.data.version);
```
  </Tab>
  <Tab title="Python">
```python
updated = client.agents.update(
    "agent_abc123",
    model={
        "system_prompt": "You are an updated, more concise support agent.",
        "temperature": 0.6
    },
    end_call_after_silence_ms=20000
)

print("New version:", updated.data.version)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X PATCH https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": {
      "systemPrompt": "You are an updated, more concise support agent.",
      "temperature": 0.6
    },
    "endCallAfterSilenceMs": 20000
  }'
```
  </Tab>
</Tabs>

---

## Delete an Agent

`DELETE https://api.ortavox.ai/v1/agents/{agentId}`

<Warning>
Deleting an agent is irreversible. Calls already completed that reference this agent ID will retain their logs and recordings, but you will no longer be able to fetch the agent configuration.
</Warning>

<Tabs>
  <Tab title="TypeScript">
```typescript
await client.agents.delete("agent_abc123");
```
  </Tab>
  <Tab title="Python">
```python
client.agents.delete("agent_abc123")
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X DELETE https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer sk_live_..."
```
  </Tab>
</Tabs>

---

## Agent Versioning

Every time you update an agent, OrtaVox increments its `version` number and archives the previous configuration. This gives you a full audit trail and the ability to pin calls to a specific version.

### How Versioning Works

- **Latest version** is used by default when you start a new call with an `agentId`.
- **Previous versions** are retrievable but not editable.
- **In-progress calls** are never affected by updates — they continue with the version they started on.

### Fetch a Specific Version

```bash
GET https://api.ortavox.ai/v1/agents/{agentId}/versions/{version}
```

<Tabs>
  <Tab title="TypeScript">
```typescript
// List all versions
const versions = await client.agents.listVersions("agent_abc123");

// Fetch a specific version
const v2Config = await client.agents.getVersion("agent_abc123", 2);
console.log(v2Config.data.model.systemPrompt);
```
  </Tab>
  <Tab title="Python">
```python
# List all versions
versions = client.agents.list_versions("agent_abc123")

# Fetch a specific version
v2_config = client.agents.get_version("agent_abc123", 2)
print(v2_config.data.model.system_prompt)
```
  </Tab>
  <Tab title="cURL">
```bash
# List all versions
curl https://api.ortavox.ai/v1/agents/agent_abc123/versions \
  -H "Authorization: Bearer sk_live_..."

# Fetch version 2 specifically
curl https://api.ortavox.ai/v1/agents/agent_abc123/versions/2 \
  -H "Authorization: Bearer sk_live_..."
```
  </Tab>
</Tabs>

### Pin a Call to a Specific Agent Version

When initiating a call, pass `agentVersion` to lock the call to that version regardless of future updates.

<Tabs>
  <Tab title="TypeScript">
```typescript
const call = await client.calls.initiate({
  agentId: "agent_abc123",
  agentVersion: 3,
  type: "web"
});
```
  </Tab>
  <Tab title="Python">
```python
call = client.calls.initiate(
    agent_id="agent_abc123",
    agent_version=3,
    type="web"
)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/initiate \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_abc123",
    "agentVersion": 3,
    "type": "web"
  }'
```
  </Tab>
</Tabs>

---

## Transient Agents

A **transient agent** lets you pass the full agent configuration inline when initiating a call, without pre-creating and storing an agent. This is useful for:

- Highly dynamic call scenarios where every call has a unique configuration
- Testing and prototyping without cluttering your agent list
- Per-user customizations at call time

<Note>
Transient agents are not stored, cannot be retrieved after the call ends, and do not appear in your agent list. Use persistent agents when you want consistent configuration across many calls.
</Note>

Pass the full config in the `agent` field of a call initiation request instead of `agentId`:

<Tabs>
  <Tab title="TypeScript">
```typescript
const call = await client.calls.initiate({
  type: "web",
  agent: {
    name: "One-Off Demo Agent",
    transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt: "You are a demo agent. Keep all answers under 2 sentences.",
      temperature: 0.5
    },
    voice: { provider: "openai", voiceId: "nova" },
    firstMessage: "Hey! This is a live demo. Ask me anything."
  }
});
```
  </Tab>
  <Tab title="Python">
```python
call = client.calls.initiate(
    type="web",
    agent={
        "name": "One-Off Demo Agent",
        "transcriber": {"provider": "deepgram", "model": "nova-3", "language": "en"},
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are a demo agent. Keep all answers under 2 sentences.",
            "temperature": 0.5
        },
        "voice": {"provider": "openai", "voice_id": "nova"},
        "first_message": "Hey! This is a live demo. Ask me anything."
    }
)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/initiate \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web",
    "agent": {
      "name": "One-Off Demo Agent",
      "transcriber": { "provider": "deepgram", "model": "nova-3", "language": "en" },
      "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "systemPrompt": "You are a demo agent. Keep all answers under 2 sentences.",
        "temperature": 0.5
      },
      "voice": { "provider": "openai", "voiceId": "nova" },
      "firstMessage": "Hey! This is a live demo. Ask me anything."
    }
  }'
```
  </Tab>
</Tabs>

---

## Next Steps

- **[Dynamic Variables](./dynamic-variables.md)**: Inject per-call data into system prompts and first messages.
- **[Function Calling](./function-calling.md)**: Give your agent the ability to call your APIs.
- **[Voice Settings](./voice-settings.md)**: Fine-tune speech speed, stability, backchannels, and more.
- **[Providers](./providers.md)**: Compare STT, LLM, and TTS providers to find the right stack for your use case.
