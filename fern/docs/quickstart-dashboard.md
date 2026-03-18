# Quickstart — Dashboard

**Deploy your first agent in 5 minutes.** No code required.

This guide walks through creating and testing a voice agent entirely inside the OrtaVox dashboard. You will have a live, callable agent by the end.

<Note>
If you prefer to work programmatically, see the [API Quickstart](/docs/quickstart-api) for TypeScript, Python, and cURL examples.
</Note>

---

## Prerequisites

- An OrtaVox account. Sign up free at [app.ortavox.ai](https://app.ortavox.ai).
- A modern browser (Chrome or Edge recommended for microphone access during testing).

---

## Step 1 — Create an Account

Navigate to [app.ortavox.ai](https://app.ortavox.ai) and sign up with your email address or Google account. Email verification is required before you can create agents or make calls.

Once verified, you will land on the **Dashboard home** showing your usage overview, recent calls, and quick-action buttons.

<Info>
New accounts come with a small free credit balance so you can test without adding a payment method. Credits are applied automatically at $0.055/min.
</Info>

---

## Step 2 — Create an Agent

From the dashboard sidebar, navigate to **Agents** and click **New Agent**.

You will see the agent configuration panel with the following fields:

**Basic Settings**

| Field | Description |
|---|---|
| **Name** | An internal label for your agent. This is not spoken to callers. |
| **System Prompt** | The core instructions that define your agent's personality, role, and behavior. |
| **First Message** | Optional. What the agent says when it picks up the call. Leave blank for the agent to wait for the user to speak first. |

**Transcriber (STT)**

| Field | Description |
|---|---|
| **Provider** | Choose from Deepgram, AssemblyAI, or OpenAI Whisper. |
| **Model** | The specific transcription model. Deepgram `nova-3` is recommended for English. |
| **Language** | The primary spoken language for this agent. |

**Model (LLM)**

| Field | Description |
|---|---|
| **Provider** | OpenAI, Anthropic, Google, Groq, or a custom endpoint. |
| **Model** | The specific LLM (e.g. `gpt-4o-mini`, `claude-3-5-haiku`, `gemini-2.0-flash`). |
| **Temperature** | Controls response creativity. `0.7` is a good starting point for conversational agents. |
| **Max Tokens** | Cap on LLM output length per turn. `500` works well for voice (shorter responses). |

**Voice (TTS)**

| Field | Description |
|---|---|
| **Provider** | ElevenLabs, Cartesia, OpenAI TTS, Deepgram Aura, or Inworld. |
| **Voice** | The specific voice. Each provider offers a preview button. |
| **Speed** | Playback speed multiplier. `1.0` is natural; `1.1` saves latency on longer responses. |

**Example System Prompt**

For a customer support agent, use something like the following in the System Prompt field:

```
You are Alex, a friendly customer support agent for OrtaVox. Greet callers warmly
and help them with any questions. Be concise — keep responses under 30 words when
possible. If you do not know the answer to a question, say so honestly and offer to
escalate to a human agent.
```

<Tip>
Voice agents work best with short, punchy responses. Instruct the LLM to stay under 30 words per turn — long sentences cause awkward pauses while TTS renders the full response.
</Tip>

Once all fields are filled, click **Save Agent**. The agent is created instantly and appears in your agents list with a unique Agent ID.

---

## Step 3 — Test in Browser

On the agent detail page, click the **Test Agent** button in the top-right corner of the dashboard.

A modal opens with a browser-based soft phone. OrtaVox will request microphone access — click **Allow** in your browser's permission prompt.

Once connected:

1. The agent speaks its **First Message** (if configured), or waits silently.
2. Speak naturally — the agent will transcribe, respond, and speak back in real time.
3. The **Live Transcript** panel on the right shows each turn as it happens.
4. Click **End Call** when finished.

After the call ends, OrtaVox generates a **Post-Call Summary** showing the full transcript, call duration, estimated cost, and any latency metrics.

<Note>
Browser-based testing uses your public key (`pk_live_...`) automatically. No additional configuration is needed for this step.
</Note>

---

## Step 4 — Connect a Phone Number (Optional)

To make your agent reachable on a real phone number, navigate to **Phone Numbers** in the sidebar.

OrtaVox supports two provisioning methods:

**Option A — Buy a Number via OrtaVox**

Click **Buy Number**, select a country and area code, and confirm. The number is provisioned immediately and linked to your account.

**Option B — Bring Your Own Number (SIP Trunk)**

Click **Import Number** and enter your SIP trunk credentials from Twilio, Telnyx, or Vonage:

| Field | Where to find it |
|---|---|
| SIP Domain | Your carrier's SIP domain (e.g. `sip.telnyx.com`) |
| Username | Your SIP username / account SID |
| Password | Your SIP password / auth token |
| Phone Number | The E.164-formatted number (e.g. `+12125551234`) |

<Warning>
SIP credentials give OrtaVox the ability to make and receive calls on your behalf. Store them only in the OrtaVox dashboard — never commit them to source control.
</Warning>

Once the number is imported or purchased, navigate to **Agents → [Your Agent] → Phone Settings** and assign the number. You can assign separate numbers for inbound and outbound.

---

## Step 5 — Make a Call

**Inbound test:** Call the phone number you just configured. Your agent will answer and begin the conversation.

**Outbound test:** Navigate to **Calls → New Call**, enter a destination number in E.164 format (e.g. `+12125551234`), select your agent, and click **Start Call**. OrtaVox will dial the number immediately.

Both call types appear in real time on the **Calls** dashboard with live status, duration, and transcript preview.

---

## What Happens Next?

After a call ends, OrtaVox automatically processes:

- **Full transcript** — every turn, timestamped to the second.
- **Post-call analysis** — sentiment, topics, outcome classification, and a plain-English summary.
- **Cost breakdown** — platform fee plus per-provider usage (STT, LLM, TTS) itemized separately.

All of this is visible in the call detail view and also delivered via webhook if you have one configured.

---

## Next Steps

<CardGroup cols={3}>
  <Card
    title="API Quickstart"
    icon="terminal"
    href="/docs/quickstart-api"
  >
    Move beyond the dashboard. Create agents and initiate calls programmatically using the TypeScript or Python SDK.
  </Card>
  <Card
    title="Function Calling"
    icon="wrench"
    href="/docs/function-calling"
  >
    Give your agent the ability to look up data, book appointments, or call any HTTP endpoint during a conversation.
  </Card>
  <Card
    title="Phone Calls"
    icon="phone"
    href="/docs/phone-calls"
  >
    Configure inbound routing, outbound dialing, and bulk campaigns using your own SIP trunk or an OrtaVox number.
  </Card>
</CardGroup>
