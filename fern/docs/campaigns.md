# Campaigns

Schedule and execute outbound voice calls to lists of contacts at scale.

## What Are Campaigns?

A campaign is a managed batch of outbound phone calls executed against a contact list. You define the contacts, the agent, the calling schedule, and the rate — OrtaVox handles dialing, retry logic, concurrency, AMD detection, and result aggregation.

**Common use cases:**

- **Appointment reminders** — call patients, clients, or customers 24–48 hours before a scheduled appointment
- **Payment follow-ups** — reach out to accounts with overdue invoices at a controlled pace
- **Lead qualification** — have your agent call inbound web leads within minutes of form submission
- **Survey collection** — gather post-service feedback from a list of recently closed tickets
- **Event or product announcements** — proactively notify opted-in contacts about upcoming deadlines or releases

<Warning>
Outbound calling campaigns carry significant legal obligations including TCPA in the US, CASL in Canada, and equivalent regulations in other jurisdictions. You are responsible for ensuring prior consent has been obtained for all contacts in your list. See the [Compliance guide](./compliance.md) before launching any campaign.
</Warning>

---

## Campaign Lifecycle

```
draft → running → paused → running → completed
                         ↘ cancelled
```

| Status | Description |
|---|---|
| `draft` | Campaign created but not yet started. Contacts and schedule can still be modified. |
| `running` | Calls are actively being dialed according to the schedule. |
| `paused` | Dialing is temporarily suspended. Calls already connected continue to completion. |
| `completed` | All contacts have been attempted (within `maxAttempts`). |
| `cancelled` | Campaign was manually cancelled. No further calls will be made. |

---

## Create a Campaign

### `POST /v1/campaigns`

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const campaign = await client.campaigns.create({
  name: "February Appointment Reminders",
  agentId: "agent_abc123",
  contacts: [
    {
      toNumber: "+14155551001",
      variables: {
        patientName: "Alice Johnson",
        appointmentDate: "February 26th",
        appointmentTime: "10:00 AM",
        doctorName: "Dr. Kim",
      },
    },
    {
      toNumber: "+14155551002",
      variables: {
        patientName: "Bob Martinez",
        appointmentDate: "February 26th",
        appointmentTime: "2:30 PM",
        doctorName: "Dr. Patel",
      },
    },
    // ... up to 100,000 contacts per campaign
  ],
  fromNumber: "+18005559999",
  scheduleConfig: {
    startAt: "2026-02-25T16:00:00Z", // 8am PT
    endAt: "2026-02-25T23:00:00Z",   // 3pm PT
    timezone: "America/Los_Angeles",
    callsPerMinute: 10,
    maxAttempts: 2,
    retryAfterMinutes: 60,
  },
  recordingEnabled: false,
  amdEnabled: true,
  voicemailMessage:
    "Hi {{patientName}}, this is a reminder from Riverside Clinic. Your appointment with {{doctorName}} is on {{appointmentDate}} at {{appointmentTime}}. Please call us at 555-9999 to confirm.",
});

console.log("Campaign ID:", campaign.data.campaignId);
console.log("Status:", campaign.data.status); // "draft"
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

campaign = client.campaigns.create(
    name="February Appointment Reminders",
    agent_id="agent_abc123",
    contacts=[
        {
            "toNumber": "+14155551001",
            "variables": {
                "patientName": "Alice Johnson",
                "appointmentDate": "February 26th",
                "appointmentTime": "10:00 AM",
                "doctorName": "Dr. Kim",
            },
        },
        {
            "toNumber": "+14155551002",
            "variables": {
                "patientName": "Bob Martinez",
                "appointmentDate": "February 26th",
                "appointmentTime": "2:30 PM",
                "doctorName": "Dr. Patel",
            },
        },
    ],
    from_number="+18005559999",
    schedule_config={
        "startAt": "2026-02-25T16:00:00Z",
        "endAt": "2026-02-25T23:00:00Z",
        "timezone": "America/Los_Angeles",
        "callsPerMinute": 10,
        "maxAttempts": 2,
        "retryAfterMinutes": 60,
    },
    amd_enabled=True,
    voicemail_message=(
        "Hi {{patientName}}, this is a reminder from Riverside Clinic. "
        "Your appointment with {{doctorName}} is on {{appointmentDate}} "
        "at {{appointmentTime}}. Please call us at 555-9999 to confirm."
    ),
)

print("Campaign ID:", campaign.data.campaign_id)
print("Status:", campaign.data.status)  # "draft"
```
</Tab>
<Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "name": "February Appointment Reminders",
    "agentId": "agent_abc123",
    "fromNumber": "+18005559999",
    "contacts": [
      {
        "toNumber": "+14155551001",
        "variables": {
          "patientName": "Alice Johnson",
          "appointmentDate": "February 26th",
          "appointmentTime": "10:00 AM",
          "doctorName": "Dr. Kim"
        }
      }
    ],
    "scheduleConfig": {
      "startAt": "2026-02-25T16:00:00Z",
      "endAt": "2026-02-25T23:00:00Z",
      "timezone": "America/Los_Angeles",
      "callsPerMinute": 10,
      "maxAttempts": 2,
      "retryAfterMinutes": 60
    },
    "amdEnabled": true,
    "voicemailMessage": "Hi {{patientName}}, reminder from Riverside Clinic..."
  }'
```
</Tab>
</Tabs>

---

## Contact List Format

Each contact in the `contacts` array must have a `toNumber` in E.164 format and may optionally include per-contact `variables` that override agent template placeholders.

```json
{
  "contacts": [
    {
      "toNumber": "+14155551001",
      "contactId": "crm_8821",
      "variables": {
        "firstName": "Alice",
        "accountBalance": "$349.00",
        "dueDate": "March 1st"
      }
    },
    {
      "toNumber": "+14155551002",
      "contactId": "crm_8822",
      "variables": {
        "firstName": "Bob",
        "accountBalance": "$89.50",
        "dueDate": "March 5th"
      }
    }
  ]
}
```

| Field | Required | Description |
|---|:---:|---|
| `toNumber` | Yes | Recipient phone number in E.164 format |
| `contactId` | No | Your CRM or internal ID. Included in per-contact result payloads for easy correlation. |
| `variables` | No | Key-value pairs injected into the agent's system prompt wherever `{{variableName}}` placeholders appear |

**Variable injection in agent prompt:**

```
You are calling {{firstName}} regarding their account balance of {{accountBalance}},
which is due on {{dueDate}}. Ask if they would like to make a payment today.
```

OrtaVox replaces these placeholders with each contact's specific values before the call begins.

<Note>
Maximum contacts per campaign: 100,000. For larger lists, split into multiple campaigns or contact support for enterprise limits.
</Note>

---

## Schedule Configuration

| Field | Type | Description |
|---|---|---|
| `startAt` | string | ISO 8601 UTC datetime when dialing may begin |
| `endAt` | string | ISO 8601 UTC datetime when dialing must stop for the day |
| `timezone` | string | IANA timezone name used for daily calling window enforcement (e.g., `America/New_York`) |
| `callsPerMinute` | integer | Maximum concurrent dial rate (1–60). Your telephony provider's rate limits apply. |
| `maxAttempts` | integer | Maximum number of times to attempt each contact (1–5, default: 1) |
| `retryAfterMinutes` | integer | Minutes to wait before retrying an unanswered contact (default: 60) |
| `retryOnStatuses` | array | Which outcomes to retry: `["no_answer", "busy", "voicemail"]` (default: `["no_answer", "busy"]`) |

<Info>
The `startAt`/`endAt` window is enforced daily for multi-day campaigns. OrtaVox will only dial within the configured hours each day and resume on the next day if contacts remain. OrtaVox does not enforce TCPA calling-hours restrictions automatically — you are responsible for configuring appropriate windows per jurisdiction.
</Info>

---

## Start, Pause, and Cancel a Campaign

Campaigns are created in `draft` status. You must explicitly start them.

<Tabs>
<Tab title="TypeScript">
```typescript
// Start
await client.campaigns.start("camp_abc789");

// Pause (active calls finish; new dials stop)
await client.campaigns.pause("camp_abc789");

// Resume
await client.campaigns.resume("camp_abc789");

// Cancel (permanent; cannot be restarted)
await client.campaigns.cancel("camp_abc789");
```
</Tab>
<Tab title="Python">
```python
# Start
client.campaigns.start("camp_abc789")

# Pause
client.campaigns.pause("camp_abc789")

# Resume
client.campaigns.resume("camp_abc789")

# Cancel
client.campaigns.cancel("camp_abc789")
```
</Tab>
<Tab title="cURL">
```bash
# Start
curl -X POST https://api.ortavox.ai/v1/campaigns/camp_abc789/start \
  -H "Authorization: Bearer sk_live_..."

# Pause
curl -X POST https://api.ortavox.ai/v1/campaigns/camp_abc789/pause \
  -H "Authorization: Bearer sk_live_..."

# Resume
curl -X POST https://api.ortavox.ai/v1/campaigns/camp_abc789/resume \
  -H "Authorization: Bearer sk_live_..."

# Cancel
curl -X POST https://api.ortavox.ai/v1/campaigns/camp_abc789/cancel \
  -H "Authorization: Bearer sk_live_..."
```
</Tab>
</Tabs>

---

## Campaign Results

### Get Campaign Summary

```bash
curl https://api.ortavox.ai/v1/campaigns/camp_abc789 \
  -H "Authorization: Bearer sk_live_..."
```

```json
{
  "data": {
    "campaignId": "camp_abc789",
    "name": "February Appointment Reminders",
    "status": "completed",
    "totalContacts": 500,
    "results": {
      "answered": 342,
      "voicemail": 87,
      "noAnswer": 51,
      "failed": 12,
      "pending": 0
    },
    "startedAt": "2026-02-25T16:00:00Z",
    "completedAt": "2026-02-25T22:48:00Z",
    "totalCost": 48.72
  }
}
```

### Per-Contact Results

Each contact gets an outcome recorded against your `contactId` (if provided):

```bash
curl "https://api.ortavox.ai/v1/campaigns/camp_abc789/contacts?status=failed" \
  -H "Authorization: Bearer sk_live_..."
```

```json
{
  "data": [
    {
      "toNumber": "+14155551003",
      "contactId": "crm_8823",
      "status": "failed",
      "failureReason": "invalid_number",
      "attempts": 1,
      "callIds": ["call_fail_001"]
    },
    {
      "toNumber": "+14155551004",
      "contactId": "crm_8824",
      "status": "no_answer",
      "attempts": 2,
      "callIds": ["call_noan_007", "call_noan_019"]
    }
  ]
}
```

Per-contact statuses:

| Status | Description |
|---|---|
| `answered` | A live human answered and spoke with the agent |
| `voicemail` | AMD detected voicemail; message was left (if `voicemailMessage` configured) |
| `no_answer` | No answer within the ring timeout across all attempts |
| `busy` | Line was busy across all attempts |
| `failed` | Technical failure (invalid number, carrier error, agent error) |
| `pending` | Not yet dialed |
| `skipped` | Contact was on your do-not-call list or was opted out |

---

## Export Results

Download full campaign results as CSV for import into your CRM or data warehouse:

```bash
curl "https://api.ortavox.ai/v1/campaigns/camp_abc789/export?format=csv" \
  -H "Authorization: Bearer sk_live_..." \
  -o campaign_results.csv
```

The CSV includes: `contactId`, `toNumber`, `status`, `failureReason`, `attempts`, `durationMs`, `callId`, `startedAt`.

---

## Webhook Events

| Event | When Fired |
|---|---|
| `campaign.started` | Campaign begins dialing |
| `campaign.paused` | Campaign is paused |
| `campaign.resumed` | Campaign resumes from paused state |
| `campaign.completed` | All contacts have been attempted |
| `campaign.cancelled` | Campaign was cancelled |
| `call.initiated` | Per-contact — call created, before dialing |
| `call.started` | Per-contact — call answered by a human |
| `call.ended` | Per-contact — call completed with transcript and metrics |
| `call.failed` | Per-contact — call could not connect |

All per-contact call events include `campaignId` in the payload for correlation.

### Example: campaign.completed Payload

```json
{
  "event": "campaign.completed",
  "campaignId": "camp_abc789",
  "name": "February Appointment Reminders",
  "timestamp": "2026-02-25T22:48:00Z",
  "results": {
    "totalContacts": 500,
    "answered": 342,
    "voicemail": 87,
    "noAnswer": 51,
    "failed": 12
  },
  "totalCost": 48.72
}
```

---

## Full Example: 500-Contact Appointment Reminder Campaign

This example creates a campaign for 500 patients, dials at 10 calls/minute, retries no-answers once after 60 minutes, and uses AMD to leave a voicemail for machines.

<Tabs>
<Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";
import { readContactsFromCRM } from "./crm";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

// Load contacts from your CRM
const crmContacts = await readContactsFromCRM({ appointmentDate: "2026-02-26" });

const contacts = crmContacts.map((c) => ({
  toNumber: c.phoneE164,
  contactId: c.id,
  variables: {
    firstName: c.firstName,
    appointmentTime: c.appointmentTime,
    doctorName: c.doctorName,
    clinicPhone: "555-9999",
  },
}));

const campaign = await client.campaigns.create({
  name: "Feb 26 Appointment Reminders",
  agentId: "agent_appointment_reminder",
  contacts,
  fromNumber: "+18005559999",
  scheduleConfig: {
    startAt: "2026-02-25T16:00:00Z",   // 8am PT
    endAt: "2026-02-25T23:00:00Z",     // 3pm PT — leaves room before 9pm local
    timezone: "America/Los_Angeles",
    callsPerMinute: 10,
    maxAttempts: 2,
    retryAfterMinutes: 60,
    retryOnStatuses: ["no_answer", "busy"],
  },
  amdEnabled: true,
  voicemailMessage:
    "Hi {{firstName}}, this is a reminder from Riverside Clinic. " +
    "Your appointment is tomorrow at {{appointmentTime}} with {{doctorName}}. " +
    "Please call {{clinicPhone}} to confirm or reschedule. Thank you.",
});

// Start immediately
await client.campaigns.start(campaign.data.campaignId);
console.log(`Campaign ${campaign.data.campaignId} is now running.`);
```
</Tab>
<Tab title="Python">
```python
import os
from ortavox import OrtavoxClient
from crm import read_contacts_from_crm

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

# Load contacts from your CRM
crm_contacts = read_contacts_from_crm(appointment_date="2026-02-26")

contacts = [
    {
        "toNumber": c["phone_e164"],
        "contactId": c["id"],
        "variables": {
            "firstName": c["first_name"],
            "appointmentTime": c["appointment_time"],
            "doctorName": c["doctor_name"],
            "clinicPhone": "555-9999",
        },
    }
    for c in crm_contacts
]

campaign = client.campaigns.create(
    name="Feb 26 Appointment Reminders",
    agent_id="agent_appointment_reminder",
    contacts=contacts,
    from_number="+18005559999",
    schedule_config={
        "startAt": "2026-02-25T16:00:00Z",
        "endAt": "2026-02-25T23:00:00Z",
        "timezone": "America/Los_Angeles",
        "callsPerMinute": 10,
        "maxAttempts": 2,
        "retryAfterMinutes": 60,
        "retryOnStatuses": ["no_answer", "busy"],
    },
    amd_enabled=True,
    voicemail_message=(
        "Hi {{firstName}}, this is a reminder from Riverside Clinic. "
        "Your appointment is tomorrow at {{appointmentTime}} with {{doctorName}}. "
        "Please call {{clinicPhone}} to confirm or reschedule. Thank you."
    ),
)

client.campaigns.start(campaign.data.campaign_id)
print(f"Campaign {campaign.data.campaign_id} is now running.")
```
</Tab>
</Tabs>

---

## Compliance Checklist

<Warning>
Violations of telemarketing laws can result in fines up to $1,500 per call (TCPA) or $10 million per violation (CASL). OrtaVox provides infrastructure only. Legal compliance is entirely your responsibility.
</Warning>

Before launching any campaign:

- [ ] Prior express written consent obtained for all contacts (required for marketing calls in the US)
- [ ] Do-not-call (DNC) list checked against your contact list before upload
- [ ] National DNC registry checked (US: FTC; Canada: DNCL)
- [ ] Calling hours configured within legal windows (8am–9pm local time in the US)
- [ ] Agent identifies itself as AI at the start of every call
- [ ] Voicemail message identifies the calling organization and includes a callback number
- [ ] Opt-out mechanism in place (agent can say "remove me from future calls" and trigger a webhook that adds to your DNC list)
- [ ] Recording disclosure included in agent prompt if `recordingEnabled: true`

See the full [Compliance guide](./compliance.md) for jurisdiction-specific requirements.
