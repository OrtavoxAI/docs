# How Billing Works

**OrtaVox uses usage-based billing with transparent provider pass-through. You pay for what you use — no seat fees, no call minimums, no hidden markups on telephony.**

---

## Billing Model Overview

Every dollar you spend on OrtaVox breaks down into two categories:

1. **Platform fee** — OrtaVox's infrastructure charge for running your agent: audio streaming, real-time orchestration, WebRTC/LiveKit rooms, VAD, tool execution, post-call analysis, and the API itself. Billed per minute of active call time.

2. **Provider costs** — The pass-through cost of the AI services your agent uses: STT transcription, LLM inference, and TTS synthesis. OrtaVox bills you the provider's actual rate plus a 15% service markup (PAYG) or 10% (Enterprise). There are no provider contracts to manage — OrtaVox consolidates all provider billing into a single invoice.

All plans use **pre-paid credits**. You load credits into your account and they are consumed as calls run. You never receive an unexpected invoice at the end of the month.

---

## PAYG Plan

The Pay-As-You-Go plan is available to all accounts with no minimum commitment or approval required.

### Rate Card

| Component | Rate | Billing basis |
|---|---|---|
| **Platform fee** | $0.055 / min | Per minute of active call (billed in 1-second increments) |
| **STT — AssemblyAI Universal** | $0.0025 / min + 15% | Billed on audio duration processed |
| **STT — Deepgram Nova-3** | $0.0077 / min + 15% | Billed on audio duration processed |
| **STT — Deepgram Nova-2** | $0.0059 / min + 15% | Billed on audio duration processed |
| **LLM** | Actual tokens × model rate + 15% | Input and output tokens billed separately per model |
| **TTS** | Actual characters × provider rate + 15% | Per character synthesized |
| **Telephony (outbound)** | Pass-through + 15% | Twilio/Telnyx per-minute rates, billed by your configured trunk |
| **Recording storage** | $0.0005 / min stored | Billed on recorded call duration, not storage time |

<Note>
LLM and TTS rates vary significantly by provider and model. See the [Providers guide](./providers.md) for a full model-by-model rate breakdown. LLM input and output tokens are billed at different rates by most providers — OrtaVox passes both through with the 15% markup applied to the combined total.
</Note>

### Example: 2-Minute Web Call

A typical 2-minute web call using a common fast-path provider stack:

| Component | Calculation | Cost |
|---|---|---|
| Platform fee | 2 min × $0.055 | $0.1100 |
| STT — Deepgram Nova-3 | 2 min × $0.0077 × 1.15 | $0.0177 |
| LLM — GPT-4o-mini (~6,000 input + 350 output tokens) | (~$0.00090 + ~$0.00021) × 1.15 | $0.0013 |
| TTS — Cartesia Sonic 3 (~1,200 chars synthesized) | 1,200 / 1,000,000 × $50 × 1.15 | $0.0001 |
| **Total** | | **~$0.13 / call** |

**At scale:**
- 1,000 calls/month: ~$130
- 10,000 calls/month: ~$1,300
- 100,000 calls/month: Enterprise pricing applies

<Info>
The example above assumes approximately 6,000 LLM input tokens per call (system prompt + 14 conversation turns of history) and 350 output tokens (agent responses). Your actual token usage will vary based on system prompt length, conversation depth, and whether tools are invoked. Actual billing always uses real call metrics — tokens and characters from each call — not estimates.
</Info>

---

## Enterprise Plan

For teams processing high call volumes or requiring contractual guarantees, OrtaVox offers an Enterprise plan.

| Feature | PAYG | Enterprise |
|---|---|---|
| Platform fee | $0.055 / min | From $0.040 / min (negotiated volume) |
| Provider markup | 15% | 10% |
| Minimum commitment | None | Custom |
| SLA | Best-effort | 99.9% uptime SLA, 4-hour response |
| Dedicated support | Email only | Dedicated Slack channel + CSM |
| Custom telephony routing | Standard | Priority |
| Data residency | Shared infrastructure | Dedicated region available |
| Invoice payment | Credit card (pre-paid) | Net-30 invoice |

Contact [hello@ortavox.ai](mailto:hello@ortavox.ai) to start an Enterprise conversation. Typical Enterprise onboarding takes 3–5 business days.

---

## Turnkey Delivery

OrtaVox offers a managed build-and-operate service for teams that want a production-grade voice AI deployment without building the integration themselves.

| Tier | What is included | Starting price |
|---|---|---|
| **Starter Turnkey** | Agent configuration, prompt engineering, webhook integration, testing | From $1,000 build fee |
| **Growth Turnkey** | All of Starter + dashboard customization, CRM integration, campaign setup | From $2,500 build fee |
| **Enterprise Turnkey** | All of Growth + dedicated infrastructure, custom analytics, ongoing optimization | Custom |

All Turnkey tiers use the same underlying platform fee structure. The build fee is a one-time project cost; ongoing usage is billed at your plan's per-minute rate.

---

## Credits System

All OrtaVox plans use a pre-paid credit system. Credits are denominated in USD and consumed as calls run.

### Getting Credits

1. **Free trial:** Every new account receives **$2.00 in free credit** — no credit card required. This covers approximately 36 minutes of calls on the fast path stack.

2. **Top-up:** Add credits via dashboard Settings → Billing → Add Credits. Minimum top-up is $10. Credits do not expire.

3. **Auto-reload:** Configure automatic reloading so your balance never runs out mid-campaign.

### Free Trial Credit

| | Details |
|---|---|
| Amount | $2.00 |
| Credit card required | No |
| Expiry | 90 days from account creation |
| Restrictions | Web calls only (phone calls require a verified account) |
| Equivalent call time | ~36 minutes (fast-path stack) |

---

## Auto-Reload

Auto-reload prevents your account from running out of credits during an active campaign or high-traffic period.

**Configure in:** Dashboard → Settings → Billing → Auto-Reload

| Setting | Description |
|---|---|
| Reload threshold | When your balance drops to this amount, auto-reload triggers |
| Reload amount | How many dollars of credits to add when the threshold is hit |
| Payment method | The saved card charged for each reload |

**Example configuration:**
- Threshold: $10
- Reload amount: $50

When your balance drops below $10, OrtaVox automatically charges your card $50 and adds $50 in credits. Your campaigns continue without interruption.

<Warning>
If your card declines during an auto-reload and your balance reaches $0, active calls will complete but new calls will not start until credits are added. Campaigns will pause and resume automatically once your balance is restored — no contacts are skipped.
</Warning>

---

## Estimating Costs

### Pricing Calculator

Use the interactive pricing calculator at [ortavox.ai/#pricing](https://ortavox.ai/#pricing) to estimate your monthly cost. Input your expected call volume, average call duration, and provider stack to get an estimated monthly total.

<Note>
The pricing calculator provides estimates based on typical usage patterns. Actual billing uses real call metrics — the exact number of LLM tokens processed and TTS characters synthesized in each call. Calculator estimates assume average values; your actual costs may be higher or lower depending on conversation depth, tool usage, and system prompt length.
</Note>

### Manual Estimation

Use this formula for a rough estimate:

```
Monthly cost ≈ (calls × avg_minutes) × $0.055          ← platform fee
             + (calls × avg_minutes) × STT_rate × 1.15  ← STT
             + (calls × avg_tokens)  × LLM_rate × 1.15  ← LLM
             + (calls × avg_chars)   × TTS_rate × 1.15  ← TTS
```

**Rough per-provider values for estimation:**

| Provider | Rate | Unit |
|---|---|---|
| Deepgram Nova-3 | $0.0077 | per minute of audio |
| AssemblyAI Universal | $0.0025 | per minute of audio |
| GPT-4o-mini | ~$0.00015 | per 1K input tokens; ~$0.0006 per 1K output tokens |
| GPT-4.1 nano | ~$0.00005 | per 1K input tokens; ~$0.0002 per 1K output tokens |
| Cartesia Sonic 3 | $50 | per 1M characters |
| ElevenLabs Turbo v2.5 | $99 | per 1M characters |
| OpenAI TTS-1 | $15 | per 1M characters |

---

## Viewing Usage and Invoices

**Current balance:** Dashboard → Settings → Billing → Current Balance

**Usage breakdown:** Dashboard → Analytics → Costs — filterable by agent, date range, provider, and call type.

**Per-call cost:** Every call record returned by `GET /v1/calls/{callId}` includes a `costs` object:

```json
{
  "costs": {
    "platform": 0.110,
    "stt": 0.0177,
    "llm": 0.0013,
    "tts": 0.0001,
    "total": 0.1291,
    "currency": "USD"
  }
}
```

**Credit history:** Dashboard → Settings → Billing → Credit History shows every top-up, auto-reload, and usage deduction with timestamps.

---

## Frequently Asked Questions

**Is there a free tier?**

Yes. Every new account starts with $2.00 in free credit — no credit card required. This is enough to run approximately 36 minutes of voice calls and build a working proof of concept.

**Do credits expire?**

Free trial credits expire 90 days after account creation. Purchased credits do not expire.

**What happens if I run out of credits mid-call?**

Active calls always complete. OrtaVox does not terminate a call that is already in progress due to a low balance. New calls will not start if the balance is $0 or below after the current call's estimated cost.

**Can I get a refund on unused credits?**

Yes. Contact [hello@ortavox.ai](mailto:hello@ortavox.ai) and unused purchased credits (not free trial credits) can be refunded to your original payment method.

**How are partial minutes billed?**

The platform fee is billed in 1-second increments. A 90-second call is billed as 1.5 minutes, not 2 minutes.

**Can I set a spending cap?**

Yes. Configure a monthly spending cap in Dashboard → Settings → Billing → Spending Limits. When the cap is reached, new calls will not start until the next billing cycle or until you raise the cap.

---

## Next Steps

- **[Quickstart](./quickstart-api.md)** — Make your first call and use your $2 free credit.
- **[Providers](./providers.md)** — Compare provider costs and choose the right stack for your budget.
- **[Latency Guide](./latency.md)** — The fastest providers are often also the cheapest.
- **[Analytics](./analytics.md)** — Monitor cost per call, cost per campaign, and provider cost breakdowns over time.
