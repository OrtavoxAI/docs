# Debugging

**A practical guide to diagnosing and resolving issues with OrtaVox voice agents.**

---

## Call Logs

Every call generates a detailed, timestamped log of everything that happened in the pipeline — VAD events, STT results, LLM requests and responses, TTS synthesis events, tool calls, errors, and disconnections.

### Accessing Logs

**Dashboard:** Navigate to Calls → select a call → Logs tab. Logs are searchable and filterable by level and timestamp.

**API:**

```bash
GET https://api.ortavox.ai/v1/calls/{callId}/logs
Authorization: Bearer sk_live_...
```

**Response:**

```json
{
  "callId": "call_xyz789",
  "logs": [
    {
      "timestamp": "2026-02-25T14:30:00.000Z",
      "level": "INFO",
      "stage": "session",
      "message": "Agent joined room. Session active.",
      "data": { "roomName": "room_abc123", "agentVersion": 3 }
    },
    {
      "timestamp": "2026-02-25T14:30:02.143Z",
      "level": "INFO",
      "stage": "stt",
      "message": "Transcription complete.",
      "data": { "transcript": "Hi, I'd like to check my account balance.", "latencyMs": 137 }
    },
    {
      "timestamp": "2026-02-25T14:30:02.541Z",
      "level": "INFO",
      "stage": "llm",
      "message": "LLM first token received.",
      "data": { "ttftMs": 398, "model": "gpt-4o-mini" }
    },
    {
      "timestamp": "2026-02-25T14:30:02.654Z",
      "level": "INFO",
      "stage": "tool",
      "message": "Tool called: get_account_balance",
      "data": { "parameters": { "account_id": "ACC-88821" }, "responseMs": 234 }
    },
    {
      "timestamp": "2026-02-25T14:30:05.220Z",
      "level": "WARN",
      "stage": "tts",
      "message": "TTS provider responded slowly.",
      "data": { "ttfbMs": 412, "provider": "elevenlabs", "threshold": 300 }
    }
  ]
}
```

### Log Levels

| Level | Meaning |
|---|---|
| `INFO` | Normal pipeline events — session start/end, transcriptions, LLM turns, tool calls. |
| `WARN` | Non-fatal anomalies — slow provider response, near-timeout tool call, high latency turn. |
| `ERROR` | Pipeline failures — LLM timeout, invalid API key, tool server unreachable, STT failure. |

<Tip>
Filter logs to `WARN` and `ERROR` first when diagnosing a problematic call. `INFO` logs are useful for tracing the full call flow, but errors and warnings surface the actionable issues immediately.
</Tip>

---

## Common Issues

| Issue | Likely cause | Fix |
|---|---|---|
| Agent not responding | LLM API key invalid or provider outage | Check LLM provider API key in dashboard Settings → Providers. Verify the key has sufficient quota. |
| High latency (> 800ms) | Slow LLM model or STT provider | Switch to a faster provider — Deepgram Nova-3 for STT, GPT-4.1 nano or Groq for LLM. See the [Latency guide](./latency.md). |
| Transcript inaccurate | Wrong STT language configured | Set `transcriber.language` to the correct BCP-47 code (e.g. `"es"` for Spanish, `"fr"` for French). |
| Call disconnects early | `endCallAfterSilenceMs` too low | Increase to `30000` or higher. The default is `30000`; do not lower below `10000` in production. |
| Tool not called | Tool description too vague or schema mismatch | Add clear examples and trigger phrases to the tool description. The LLM decides to call tools based solely on the description. |
| Webhook not received | Server not reachable or returning non-2xx | Use [Webhook.site](https://webhook.site) to test that OrtaVox can reach your endpoint. Check your server returns `200` within 5 seconds. |
| `roomToken` invalid | Token expired (15-minute TTL) | Request a fresh `roomToken` immediately before the user initiates the call. Do not cache tokens. |
| Agent interrupts user mid-sentence | `endpointingMs` too low | Increase to `300`–`400ms`. Low values cause the agent to treat mid-sentence pauses as end-of-turn. |
| Agent does not end call | `end_call` tool not configured or LLM not invoking it | Add an explicit instruction in the system prompt: "When the conversation is complete, call the `end_call` tool." |
| First message not spoken | Agent using `firstMessage` but user already spoke | Do not send audio to the room before the `call.started` event fires. The agent will speak first when it joins. |
| High STT error rate | Noisy audio environment | Switch to AssemblyAI Universal, which handles noisy audio better. Lower `endpointingMs` to reduce background noise pickup. |
| LLM response cut off | `maxTokens` too low | Increase `model.maxTokens`. Default is `1024`; if responses are truncated mid-sentence, increase to `2048`. |

---

## Debug Mode

Enable `debugMode` on a call to receive verbose, structured logs in the `call.ended` webhook payload. This is useful when reproducing a specific issue or inspecting exactly what the LLM received as context.

```typescript
const call = await client.calls.createWebCall({
  agentId: "agent_abc123",
  debugMode: true, // enables verbose webhook logs
});
```

With `debugMode: true`, the `call.ended` webhook includes:

```json
{
  "event": "call.ended",
  "callId": "call_xyz789",
  "debug": {
    "turns": [
      {
        "turnIndex": 1,
        "userTranscript": "Hi, I'd like to check my account balance.",
        "llmPayload": {
          "model": "gpt-4o-mini",
          "messages": [...],
          "tools": [...]
        },
        "llmResponse": "Sure, let me look that up for you. One moment.",
        "toolCalls": [
          {
            "name": "get_account_balance",
            "parameters": { "account_id": "ACC-88821" },
            "result": { "balance": "$1,204.50" },
            "latencyMs": 234
          }
        ],
        "ttsText": "Sure, let me look that up for you. One moment.",
        "endToEndLatencyMs": 521
      }
    ]
  }
}
```

<Warning>
`debugMode` produces large webhook payloads. Do not enable it in production for all calls — use it selectively when investigating specific issues, then disable. Large payloads can slow down your webhook handler and increase storage costs if you are persisting events.
</Warning>

---

## Testing Webhooks Locally

OrtaVox sends webhooks to the URL you configure on the agent. During local development, your server is not publicly accessible. Use [ngrok](https://ngrok.com) to expose your local server to the internet.

### Setup

```bash
# Install ngrok
brew install ngrok # macOS

# Expose your local server (running on port 3000)
ngrok http 3000
```

ngrok will output a public HTTPS URL:

```
Forwarding  https://a1b2c3d4.ngrok.io → http://localhost:3000
```

### Configure the Webhook URL

```typescript
const agent = await client.agents.update("agent_abc123", {
  webhookUrl: "https://a1b2c3d4.ngrok.io/webhooks/ortavox",
});
```

Now OrtaVox can reach your local server. Use the ngrok dashboard at `http://127.0.0.1:4040` to inspect webhook requests and replay them without making a new call.

### Testing Tool Servers Locally

If your agent uses tools that call your backend, configure the tool's `endpoint` to your ngrok URL as well:

```typescript
const tool = await client.tools.create({
  name: "check_availability",
  endpoint: "https://a1b2c3d4.ngrok.io/internal/availability",
  // ...
});
```

<Note>
Free ngrok sessions generate a new URL each time you restart. Either use a paid ngrok account with a fixed subdomain, or update the `webhookUrl` and tool endpoints each time you restart your tunnel.
</Note>

---

## Error Codes Reference

When the OrtaVox API returns an error, the response includes an HTTP status code and a JSON body with a machine-readable `code` and human-readable `message`.

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "No agent found with id agent_abc123. Verify the agentId and that it belongs to your account.",
    "status": 404
  }
}
```

### HTTP Status Codes

| Status | Meaning | Common causes |
|---|---|---|
| `400` | Bad Request | Missing required fields, invalid field values, variable references in prompt not satisfied, malformed JSON. |
| `401` | Unauthorized | Missing or invalid `Authorization` header. The API key does not exist or has been revoked. |
| `403` | Forbidden | The API key does not have permission for this operation. Public keys cannot create agents or initiate phone calls. |
| `404` | Not Found | The resource (`agentId`, `callId`, `toolId`) does not exist or does not belong to your account. |
| `429` | Too Many Requests | Rate limit exceeded. Retry after the duration specified in the `Retry-After` response header. |
| `500` | Internal Server Error | OrtaVox infrastructure error. If this persists, check the [OrtaVox status page](https://status.ortavox.ai) or contact support. |

### Common Application-Level Error Codes

| Code | Status | Description |
|---|---|---|
| `AGENT_NOT_FOUND` | 404 | The `agentId` does not exist on this account. |
| `INSUFFICIENT_CREDITS` | 402 | Your account has run out of pre-paid credits. Top up via dashboard Settings → Billing. |
| `INVALID_PHONE_NUMBER` | 400 | The `to` number is not a valid E.164 formatted phone number. |
| `PROVIDER_API_KEY_MISSING` | 400 | The agent references a provider (e.g. OpenAI) for which no API key is configured in your account. |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many concurrent calls or API requests. See the rate limits in the API reference. |
| `ROOM_TOKEN_EXPIRED` | 401 | The `roomToken` passed to LiveKit has expired. Its TTL is 15 minutes. Request a new web call. |
| `VARIABLE_MISSING` | 400 | A `{{variable_name}}` referenced in the agent's prompt was not supplied in the call's `variables` map. |
| `TOOL_TIMEOUT` | 500 | A tool HTTP request to your server did not respond within 30 seconds. |
| `CAMPAIGN_NOT_FOUND` | 404 | The `campaignId` does not exist on this account. |

---

## Diagnosing a Specific Call

When a user reports an issue with a specific call, this is the recommended diagnostic sequence:

1. **Get the `callId`.** It is returned when the call is initiated and included in all webhook payloads. If you log webhook events, search your logs for the call.

2. **Fetch the call record.**
   ```bash
   GET https://api.ortavox.ai/v1/calls/{callId}
   ```
   Check `status`, `terminationReason`, `metrics.latency`, and `costs`.

3. **Fetch the call logs.**
   ```bash
   GET https://api.ortavox.ai/v1/calls/{callId}/logs
   ```
   Filter to `WARN` and `ERROR` entries. The `stage` field tells you which pipeline component had the issue.

4. **Fetch the transcript.**
   ```bash
   GET https://api.ortavox.ai/v1/calls/{callId}/transcript
   ```
   Read the conversation from the user's perspective. Does the agent's behavior make sense given what was said?

5. **Check post-call analysis.**
   ```bash
   GET https://api.ortavox.ai/v1/calls/{callId}/analysis
   ```
   If analysis fields look wrong, the issue may be a prompt or tool problem — not an infrastructure problem.

---

## Getting Support

**Documentation:** You are here. Start with the relevant guide before opening a ticket.

**Status page:** Check [status.ortavox.ai](https://status.ortavox.ai) for current infrastructure incidents and historical uptime.

**Email:** [hello@ortavox.ai](mailto:hello@ortavox.ai) — include your `callId` and a description of the issue. Requests with a `callId` are resolved significantly faster than requests without one.

**Discord community:** Join the OrtaVox Discord for real-time community support, provider discussions, and to share what you are building. Link available in your dashboard.

<Info>
When contacting support, always include: your account email, the relevant `callId` (if the issue is call-specific), and the exact error message or log entry you are seeing. This allows the support team to pull your logs and trace the issue directly, without back-and-forth.
</Info>

---

## Next Steps

- **[Latency Guide](./latency.md)** — Diagnose and optimize end-to-end latency.
- **[Webhooks](./webhooks.md)** — Signature verification and retry behavior.
- **[Providers](./providers.md)** — Switch providers when a specific one is causing issues.
- **[API Reference](/api)** — Full endpoint and error code reference.
