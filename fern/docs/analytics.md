# Analytics

Monitor call performance, quality scores, latency breakdowns, and usage across all your voice agents.

## Dashboard Overview

The OrtaVox dashboard at [app.ortavox.ai/dashboard](https://app.ortavox.ai/dashboard) provides a real-time view of your voice infrastructure health.

**Top-level metric cards:**

| Card | Description |
|---|---|
| **Total Calls** | Count of calls in the selected date range, by direction (inbound / outbound / web) |
| **Total Minutes** | Aggregated call duration across all calls |
| **Avg E2E Latency** | Mean end-to-end response latency across all turns in the period |
| **Success Rate** | Percentage of calls that connected and had at least one agent utterance |
| **Total Cost** | Estimated cost breakdown by provider (LLM, TTS, STT, infrastructure) |
| **Quality Score** | Mean quality score (0–100) across all completed calls |

**Filters available:**

- Date range (preset: today, 7d, 30d, or custom)
- Agent
- Call direction (inbound / outbound / web)
- Call status (completed / failed / all)
- Provider (filter by LLM, STT, or TTS provider)

---

## Call-Level Metrics

Every completed call generates a detailed metrics record accessible via the dashboard or API.

| Metric | Field | Description |
|---|---|---|
| **Total Duration** | `duration_ms` | Total call duration from connect to disconnect, in milliseconds |
| **STT Latency** | `stt_latency_ms` | Time from when the user stops speaking to when the transcript is ready |
| **LLM Time-to-First-Token** | `llm_ttft_ms` | Time from transcript ready to first LLM output token |
| **TTS Time-to-First-Byte** | `tts_ttfb_ms` | Time from first LLM sentence chunk to first synthesized audio byte |
| **End-to-End Latency** | `e2e_latency_ms` | Total response latency: `stt_latency_ms + llm_ttft_ms + tts_ttfb_ms` |
| **Interruption Count** | `interruption_count` | Number of times the user spoke while the agent was speaking |
| **Turn Count** | `turn_count` | Total number of conversational turns (user utterance + agent response pairs) |
| **Agent Speaking Ratio** | `agent_speaking_ratio` | Fraction of call duration where the agent was speaking (0.0–1.0) |
| **Sentiment** | `sentiment` | Post-call sentiment classification: `positive`, `neutral`, or `negative` |

All latency metrics are reported as percentile distributions:

```json
{
  "e2e_latency_ms": {
    "mean": 520,
    "p50": 490,
    "p75": 580,
    "p90": 710,
    "p95": 830,
    "p99": 1240
  }
}
```

---

## Latency Targets

Understanding what "good" looks like:

| Metric | Excellent | Good | Needs Attention |
|---|---|---|---|
| `stt_latency_ms` (mean) | < 150ms | < 250ms | > 400ms |
| `llm_ttft_ms` (mean) | < 200ms | < 400ms | > 700ms |
| `tts_ttfb_ms` (mean) | < 100ms | < 200ms | > 350ms |
| `e2e_latency_ms` (mean) | < 500ms | < 800ms | > 1,500ms |

<Tip>
For the lowest-latency path, use **Deepgram Nova-3** (STT) + **Groq-hosted Llama 3.1 70B** or **GPT-4o-mini** (LLM) + **Cartesia Sonic** (TTS). This combination reliably achieves sub-500ms e2e latency.
</Tip>

---

## Quality Score

OrtaVox computes a **Quality Score (0–100)** for every completed call. This composite score is designed to surface problematic sessions without requiring manual review of every transcript.

**Score composition:**

| Component | Weight | Description |
|---|---|---|
| Responsiveness | 50% | Derived from `e2e_latency_ms`. Higher latency = lower score. |
| Naturalness | 50% | Derived from `interruption_count`, `agent_speaking_ratio`, and call completion (whether the user hung up early). |

**Score interpretation:**

| Range | Grade | Recommended Action |
|---|---|---|
| 90–100 | Excellent | No action needed |
| 75–89 | Good | Monitor for trends |
| 60–74 | Fair | Review calls in this range; check for latency spikes or high interruptions |
| 40–59 | Poor | Investigate promptly — likely a provider issue or agent misconfiguration |
| < 40 | Critical | Alert your team; check provider status pages |

Set up a webhook listener that fires an internal alert whenever a `call.ended` payload has `quality.score < 60`:

```typescript
app.post("/webhooks/ortavox", express.raw({ type: "application/json" }), (req, res) => {
  const event = JSON.parse(req.body.toString());
  if (event.event === "call.ended" && event.quality?.score < 60) {
    alertOps({
      message: `Low quality call detected: ${event.callId} (score: ${event.quality.score})`,
      url: `https://app.ortavox.ai/calls/${event.callId}`,
    });
  }
  res.status(200).send("OK");
});
```

---

## Latency Breakdown Chart

The dashboard's **Latency Breakdown** chart shows per-call STT + LLM TTFT + TTS TTFB stacked as a bar chart over time. This makes it immediately visible when one component in the pipeline degrades.

If you see a spike in the chart:

1. Check the **Provider Status** tab to see if the affected provider reported an incident
2. Filter calls by agent to determine if the issue is isolated to one agent's provider config
3. Temporarily switch to an alternative provider under **Agents → Settings** if the degradation persists

---

## Analytics API

### Summary Analytics

Retrieve aggregated metrics for a date range and optional agent filter.

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const analytics = await client.analytics.getSummary({
  from: "2026-01-01",
  to: "2026-01-31",
  agentId: "agent_abc123", // optional
});

console.log("Total calls:", analytics.data.summary.totalCalls);
console.log("Success rate:", analytics.data.summary.successRate);
console.log("Avg e2e latency:", analytics.data.summary.avgE2eLatencyMs);
console.log("Total cost:", analytics.data.summary.totalCost);
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

analytics = client.analytics.get_summary(
    from_date="2026-01-01",
    to_date="2026-01-31",
    agent_id="agent_abc123",  # optional
)

print("Total calls:", analytics.data.summary.total_calls)
print("Success rate:", analytics.data.summary.success_rate)
print("Avg e2e latency:", analytics.data.summary.avg_e2e_latency_ms)
```
</Tab>
<Tab title="cURL">
```bash
curl "https://api.ortavox.ai/v1/analytics?from=2026-01-01&to=2026-01-31&agentId=agent_abc123" \
  -H "Authorization: Bearer sk_live_..."
```
</Tab>
</Tabs>

**Response:**

```json
{
  "data": {
    "summary": {
      "totalCalls": 3842,
      "completedCalls": 3591,
      "failedCalls": 251,
      "successRate": 0.935,
      "totalMinutes": 14283,
      "avgDurationMs": 222900,
      "avgE2eLatencyMs": 531,
      "avgQualityScore": 82.4,
      "totalCost": 1284.72
    },
    "byDirection": {
      "inbound": { "count": 1204, "successRate": 0.96 },
      "outbound": { "count": 2417, "successRate": 0.92 },
      "web": { "count": 221, "successRate": 0.98 }
    },
    "costByProvider": {
      "llm": 184.33,
      "tts": 892.10,
      "stt": 128.71,
      "infrastructure": 79.58
    }
  }
}
```

### Per-Call Metrics

Retrieve detailed metrics for a single call.

<Tabs>
<Tab title="TypeScript">
```typescript
const call = await client.calls.get("call_xyz789");

console.log("Duration:", call.data.durationMs, "ms");
console.log("Quality score:", call.data.quality.score);
console.log("E2E latency (mean):", call.data.metrics.e2eLatencyMs.mean, "ms");
console.log("Sentiment:", call.data.sentiment);
```
</Tab>
<Tab title="Python">
```python
call = client.calls.get("call_xyz789")

print("Duration:", call.data.duration_ms, "ms")
print("Quality score:", call.data.quality.score)
print("E2E latency (mean):", call.data.metrics.e2e_latency_ms.mean, "ms")
print("Sentiment:", call.data.sentiment)
```
</Tab>
<Tab title="cURL">
```bash
curl https://api.ortavox.ai/v1/calls/call_xyz789 \
  -H "Authorization: Bearer sk_live_..."
```
</Tab>
</Tabs>

**Response (metrics segment):**

```json
{
  "data": {
    "callId": "call_xyz789",
    "agentId": "agent_abc123",
    "direction": "outbound",
    "status": "completed",
    "durationMs": 183400,
    "terminationReason": "user_hangup",
    "sentiment": "positive",
    "quality": {
      "score": 87,
      "grade": "good",
      "components": {
        "responsiveness": 84,
        "naturalness": 90
      }
    },
    "metrics": {
      "turnCount": 8,
      "interruptionCount": 1,
      "agentSpeakingRatio": 0.54,
      "sttLatencyMs": { "mean": 182, "p50": 175, "p95": 290 },
      "llmTtftMs": { "mean": 228, "p50": 210, "p95": 380 },
      "ttsTtfbMs": { "mean": 91, "p50": 88, "p95": 130 },
      "e2eLatencyMs": { "mean": 501, "p50": 478, "p95": 710 }
    },
    "cost": {
      "llm": 0.0009,
      "tts": 0.42,
      "stt": 0.011,
      "infrastructure": 0.027,
      "total": 0.4589
    }
  }
}
```

### List Calls with Filters

Retrieve a paginated list of calls with filtering:

<Tabs>
<Tab title="TypeScript">
```typescript
const calls = await client.calls.list({
  from: "2026-01-01",
  to: "2026-01-31",
  agentId: "agent_abc123",
  direction: "outbound",
  status: "completed",
  minQualityScore: 0,
  maxQualityScore: 60, // surface low-quality calls
  limit: 50,
  cursor: undefined, // pagination cursor from previous response
});
```
</Tab>
<Tab title="Python">
```python
calls = client.calls.list(
    from_date="2026-01-01",
    to_date="2026-01-31",
    agent_id="agent_abc123",
    direction="outbound",
    status="completed",
    min_quality_score=0,
    max_quality_score=60,
    limit=50,
)
```
</Tab>
<Tab title="cURL">
```bash
curl "https://api.ortavox.ai/v1/calls?from=2026-01-01&to=2026-01-31&direction=outbound&maxQualityScore=60&limit=50" \
  -H "Authorization: Bearer sk_live_..."
```
</Tab>
</Tabs>

---

## Export

### CSV Export via Dashboard

1. Navigate to [app.ortavox.ai/calls](https://app.ortavox.ai/calls)
2. Apply your desired filters (date range, agent, direction, status)
3. Click **Export → CSV**

The exported CSV includes all call-level fields: `callId`, `agentId`, `direction`, `status`, `durationMs`, `e2eLatencyMs`, `qualityScore`, `sentiment`, `cost`, `startedAt`, `endedAt`.

### CSV Export via API

```bash
curl "https://api.ortavox.ai/v1/calls?from=2026-01-01&to=2026-01-31&format=csv" \
  -H "Authorization: Bearer sk_live_..." \
  -o calls_january.csv
```

---

## Programmatic Monitoring Example

This example queries the analytics API daily and posts a summary to Slack:

```typescript
import { OrtavoxClient } from "ortavox";
import { WebClient } from "@slack/web-api";

const ortavox = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });
const slack = new WebClient(process.env.SLACK_TOKEN);

async function dailyReport() {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  const analytics = await ortavox.analytics.getSummary({
    from: yesterday,
    to: today,
  });

  const { summary } = analytics.data;

  await slack.chat.postMessage({
    channel: "#voice-ai-ops",
    text: [
      `*OrtaVox Daily Report — ${yesterday}*`,
      `Calls: ${summary.totalCalls} | Success: ${(summary.successRate * 100).toFixed(1)}%`,
      `Avg Latency: ${summary.avgE2eLatencyMs}ms | Avg Quality: ${summary.avgQualityScore.toFixed(1)}`,
      `Total Cost: $${summary.totalCost.toFixed(2)}`,
      summary.avgQualityScore < 70 ? ":rotating_light: Quality score below threshold — review low-scoring calls." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

// Run daily at 7am UTC via your scheduler (cron, GitHub Actions, etc.)
dailyReport();
```

---

## Best Practices

1. **Monitor latency by provider, not just overall.** STT latency spikes from Deepgram and LLM TTFT spikes from OpenAI have different root causes and different remediation steps. The dashboard's breakdown chart makes this easy to distinguish.

2. **Set up quality score alerts.** Pipe `call.ended` webhooks to your observability stack (Datadog, Grafana, PagerDuty) and alert when the rolling 1-hour average quality score drops below 70.

3. **Review transcripts for low-quality calls.** The quality score identifies calls worth reviewing, but the transcript reveals why. Click any call in the dashboard to see the full turn-by-turn transcript and tool execution log.

4. **Track cost per agent.** If costs spike, filter by agent in the dashboard to identify which agent's provider configuration is responsible. Switching from GPT-4o to GPT-4o-mini typically reduces LLM cost by 5–10x with minimal quality impact for straightforward tasks.

5. **Export data to your own warehouse for long-term trends.** OrtaVox retains data for the duration configured in your agent's `dataStorageRetentionDays`. For multi-month or multi-year trend analysis, export daily and load into BigQuery, Snowflake, or your BI tool of choice.
