# Compliance

Legal obligations and best practices for operating AI voice agents on telephony networks.

<Warning>
OrtaVox is a voice AI infrastructure provider. We provide tools to build and operate voice agents — we do not provide legal advice and we do not enforce compliance on your behalf. You are solely responsible for ensuring that your use of OrtaVox complies with all applicable laws and regulations in every jurisdiction where you operate. This page is informational only and does not constitute legal advice. Consult your legal counsel before deploying voice agents at scale.
</Warning>

---

## TCPA — United States

The **Telephone Consumer Protection Act (TCPA)** is the primary federal law governing automated calls and texts in the United States. Violations carry statutory damages of **$500–$1,500 per call**, and class actions are common.

### Key Requirements

| Requirement | Details |
|---|---|
| **Prior express written consent** | Required for marketing or promotional calls made with an auto-dialer or artificial/prerecorded voice. Consent must be signed (wet or electronic) and clearly disclose that calls may be made using automated technology. |
| **Informational calls** | Calls that are purely informational (appointment reminders, fraud alerts, package notifications) with no marketing content require prior express consent — but not necessarily written consent. |
| **Calling hours** | Calls must only be placed between **8:00 AM and 9:00 PM in the recipient's local time**. This is a hard legal limit, not a best practice. |
| **Identification** | The agent must identify the calling entity within the first 30 seconds of the call. |
| **AI disclosure** | FTC guidelines increasingly require disclosure that the call is AI-generated. Several states (California, Illinois) have explicit AI disclosure requirements for automated voice calls. |
| **Opt-out** | Callers must be given the ability to opt out, and opt-outs must be honored within **10 business days**. The agent should be able to record opt-out requests and your system should add them to a DNC list. |
| **National DNC Registry** | You must check the [FTC's National Do Not Call Registry](https://www.donotcall.gov/) before calling any consumer. Established business relationships provide limited exceptions. |

### Configuring Compliance in OrtaVox

**Calling hours:** Configure campaign `scheduleConfig.startAt` and `scheduleConfig.endAt` using the recipient's timezone, not UTC. Use per-contact timezone metadata if your list spans multiple time zones.

**Opt-out tool:** Give your agent a function tool to register opt-outs in real time:

```json
{
  "name": "register_opt_out",
  "description": "Called when the contact says they do not want to receive future calls",
  "parameters": {
    "type": "object",
    "properties": {
      "phoneNumber": {
        "type": "string",
        "description": "The phone number to add to the do-not-call list"
      },
      "reason": {
        "type": "string",
        "description": "The reason provided by the contact"
      }
    },
    "required": ["phoneNumber"]
  }
}
```

**Agent identification in system prompt:**

```
You are an AI voice assistant calling on behalf of Riverside Clinic.
At the start of the call, always say: "Hi {{firstName}}, I'm an AI calling
from Riverside Clinic about your upcoming appointment."
If the person asks to be removed from future calls, use the register_opt_out
tool immediately and end the call politely.
```

---

## GDPR — European Union

The **General Data Protection Regulation** applies to any processing of personal data of EU residents, regardless of where your company is based.

### Key Requirements

| Requirement | Details |
|---|---|
| **Lawful basis** | You must have a lawful basis for processing the contact's data (consent, legitimate interest, contract, etc.). For cold marketing calls, consent is typically required. |
| **Data minimization** | Collect only the data necessary for the call. Avoid storing sensitive categories of data (health, financial) unless strictly necessary. |
| **Right to erasure** | Contacts may request deletion of their data, including call recordings and transcripts. Honor these requests promptly. |
| **Data processing agreement (DPA)** | If OrtaVox processes personal data on your behalf, you need a DPA in place. Contact [legal@ortavox.ai](mailto:legal@ortavox.ai) to request the standard DPA. |
| **Data residency** | OrtaVox offers an EU-hosted option. If you process EU resident data, consider configuring data residency appropriately. Contact sales for regional deployment options. |
| **Recording retention** | Do not retain recordings longer than necessary. Configure `agent.dataStorageRetentionDays` appropriately (see Data Retention section below). |

### Data Subject Access Requests

Use the OrtaVox API to retrieve and delete call data in response to DSARs:

```bash
# Retrieve all calls for a contact's phone number
curl "https://api.ortavox.ai/v1/calls?phoneNumber=%2B14155551234" \
  -H "Authorization: Bearer sk_live_..."

# Delete a specific call's data (transcript, recording)
curl -X DELETE https://api.ortavox.ai/v1/calls/call_xyz789/data \
  -H "Authorization: Bearer sk_live_..."
```

---

## LMNDA / Law 09-08 — Morocco

Morocco's **Law 09-08** on Personal Data Protection is administered by the **CNDP** (Commission Nationale de contrôle de la protection des Données à caractère Personnel).

### Key Requirements

| Requirement | Details |
|---|---|
| **Data sovereignty** | Personal data of Moroccan residents may not be transferred outside Morocco without adequate protections or CNDP authorization. |
| **Self-hosted option** | OrtaVox offers a Morocco-hosted deployment for regulated industries (banking, healthcare, telecom). Contact [sales@ortavox.ai](mailto:sales@ortavox.ai) for on-premise or private cloud setup. |
| **Registration** | Certain data processing activities require registration with the CNDP before commencing. |
| **Consent** | Prior consent is required for the processing of personal data. Marketing calls require explicit consent. |

<Info>
OrtaVox's Morocco data residency option keeps all call audio, transcripts, and metadata within Moroccan infrastructure. No data traverses international networks. This is designed for customers operating under Law 09-08 data sovereignty requirements.
</Info>

---

## CASL — Canada

The **Canadian Anti-Spam Legislation** covers commercial electronic messages and, by extension, automated commercial voice calls.

### Key Requirements

| Requirement | Details |
|---|---|
| **Express consent** | Required for commercial calls where there is no prior business relationship. Consent must be clearly obtained and documented. |
| **Implied consent** | Applies if you have an existing business relationship with the contact (customer within the past 2 years, or prospect who provided their information). Implied consent expires. |
| **Identification** | Must identify the organization making the call. |
| **Opt-out mechanism** | A readily accessible and functional opt-out mechanism must be provided. |
| **National DNCL** | Canada maintains a National Do Not Call List. Check it before dialing consumer numbers. |

---

## Calling Hours — Best Practices

Configure calling hours to respect local time in the recipient's jurisdiction:

| Jurisdiction | Recommended Window | Legal Limit |
|---|---|---|
| United States (TCPA) | 9:00 AM – 8:00 PM local | 8:00 AM – 9:00 PM local |
| Canada (CASL/CRTC) | 9:00 AM – 8:00 PM local | 9:00 AM – 9:30 PM local |
| United Kingdom (Ofcom) | 9:00 AM – 6:00 PM local | No hard law, guidance-based |
| European Union | 9:00 AM – 6:00 PM local | Varies by member state |
| Morocco | 9:00 AM – 7:00 PM local | Guidance-based |
| Australia (ACMA) | 9:00 AM – 8:00 PM local (Mon–Fri) | 9:00 AM – 8:00 PM, no Sundays |

Avoid calling on public holidays in the recipient's country. Consider building a holiday calendar check into your campaign pre-flight validation.

---

## Recording Disclosure

Many jurisdictions require that parties be informed before a call is recorded.

| Jurisdiction | Requirement |
|---|---|
| **United States — Federal** | One-party consent (federal). You only need your own consent. |
| **California (CA Penal Code § 632)** | All-party consent. Must disclose before recording begins. |
| **EU / GDPR** | Consent or legitimate interest required. Disclosure best practice. |
| **Canada** | Disclosure required under PIPEDA. |

When `recordingEnabled: true`, include this disclosure in your agent's opening line:

```
"This call may be recorded for quality and training purposes."
```

Add this to your system prompt:

```
At the very beginning of every call, before anything else, say:
"This call may be recorded for quality and training purposes."
```

<Warning>
If you enable call recording without proper disclosure, you may be violating wiretapping or privacy laws in your jurisdiction. All-party consent states (including California) require explicit disclosure before recording begins.
</Warning>

---

## Do-Not-Call Lists

OrtaVox does not maintain a DNC list on your behalf. You are responsible for:

1. **Maintaining your own internal DNC list** — contacts who have opted out of calls
2. **Checking national registries** before dialing consumer numbers:
   - US: [donotcall.gov](https://www.donotcall.gov/) (FTC National DNC Registry)
   - Canada: [lnnte-dncl.gc.ca](https://www.lnnte-dncl.gc.ca/) (Canada National DNCL)
   - UK: [tpsonline.org.uk](https://www.tpsonline.org.uk/) (TPS)
3. **Filtering your contact list** against both lists before uploading to a campaign

### Implementing Real-Time Opt-Out

When a contact opts out during a call, handle the `tool.called` webhook for your `register_opt_out` tool and immediately add them to your DNC database:

```typescript
app.post("/webhooks/ortavox", express.raw({ type: "application/json" }), async (req, res) => {
  const event = JSON.parse(req.body.toString());

  if (event.event === "tool.called" && event.toolName === "register_opt_out") {
    const { phoneNumber, reason } = event.parameters;

    // Add to your DNC database
    await db.dncList.upsert({
      where: { phoneNumber },
      create: {
        phoneNumber,
        reason,
        optedOutAt: new Date(),
        callId: event.callId,
      },
      update: {
        reason,
        optedOutAt: new Date(),
      },
    });

    console.log(`Opt-out registered for ${phoneNumber}: ${reason}`);
  }

  res.status(200).send("OK");
});
```

---

## STIR/SHAKEN — Caller ID Authentication

STIR/SHAKEN is a framework that cryptographically authenticates caller ID information to reduce spoofing. It is mandated by the FCC for US carriers and adopted in Canada.

- **Your provider** (Twilio, Telnyx, etc.) handles STIR/SHAKEN signing. You do not configure this in OrtaVox directly.
- Ensure your telephony provider has proper STIR/SHAKEN attestation (A-level attestation provides the strongest trust signal).
- Use a dedicated `fromNumber` that is registered to your business and not shared with other organizations.
- Calls with spoofed or unverified caller ID are increasingly flagged as spam by carriers, reducing answer rates.

Contact your telephony provider for STIR/SHAKEN setup instructions.

---

## Data Retention

Control how long OrtaVox retains call recordings, transcripts, and metadata by configuring `dataStorageRetentionDays` on your agent:

```json
{
  "name": "Support Agent",
  "dataStorageRetentionDays": 90
}
```

| Value | Description |
|---|---|
| `1` | Minimum retention — data deleted after 24 hours |
| `30` | Recommended for high-volume compliance environments |
| `90` | Recommended default for most use cases |
| `365` | One year — suitable for quality assurance archives |
| `730` | Maximum — two years |

After the configured retention period, all call data (audio recordings, transcripts, metadata) is permanently deleted from OrtaVox infrastructure and cannot be recovered.

<Info>
OrtaVox does not automatically export call data before deletion. If you need a long-term archive, configure your webhooks to receive `call.ended` payloads (which include the full transcript) and store them in your own data warehouse.
</Info>

---

## AI Disclosure

Disclosing that a caller is an AI is a rapidly evolving legal requirement.

| Jurisdiction | Status |
|---|---|
| **United States — Federal** | No current federal law, but FTC has signaled enforcement intentions. Several states have enacted or proposed AI disclosure requirements. |
| **California (SB 1001)** | Prohibited to use a bot to deceive a person into thinking they are communicating with a human. Disclosure required on request. |
| **EU (AI Act)** | AI systems interacting with humans in real-time must disclose their AI nature at the start of the interaction. |
| **Morocco** | No specific AI disclosure law, but general consumer protection and non-deception principles apply. |

**Recommended practice:** Always disclose AI status at the start of every call, regardless of jurisdiction. This is both the ethical standard and the direction of regulatory travel. Configure your agent's opening line:

```
"Hi {{firstName}}, I'm an AI assistant from [Your Company]. I'm calling about..."
```

Never configure an agent to claim to be a human or to deny being an AI when asked directly.
