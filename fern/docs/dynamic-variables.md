# Dynamic Variables

Dynamic variables let you personalize every call with real-time data — customer names, account details, product context — without creating a separate agent for each scenario. Write your system prompt once with placeholders, then fill them in at call creation time.

---

## How It Works

Use the `{{variable_name}}` syntax anywhere in your agent's `systemPrompt` or `firstMessage`. When a call is initiated, OrtaVox replaces every `{{placeholder}}` with the corresponding value you pass in the `variables` map.

```
System Prompt (at agent creation time):
  "You are calling {{customer_name}} from {{company_name}}.
   Their account balance is ${{balance}}. Help them with any questions."

Variables (at call initiation time):
  { "customer_name": "Sarah", "company_name": "Acme", "balance": "150.00" }

Resolved System Prompt (what the LLM receives):
  "You are calling Sarah from Acme. Their account balance is $150.00.
   Help them with any questions."
```

This separation keeps your agent configuration generic and reusable while making every individual call feel personally tailored to the caller.

---

## System-Provided Variables

OrtaVox automatically injects the following variables into every call. You do not need to pass these manually — they are always available.

| Variable | Example Value | Description |
|---|---|---|
| `{{current_time}}` | `14:35` | Current time in 24-hour format (UTC). |
| `{{current_date}}` | `2026-02-25` | Current date in ISO 8601 format (UTC). |
| `{{call_id}}` | `call_a1b2c3d4` | Unique ID of this call session. |
| `{{caller_number}}` | `+14155550100` | The caller's phone number (phone calls only; empty for web calls). |
| `{{agent_number}}` | `+18005550199` | The inbound/outbound number the call is routed through (phone calls only). |

<Tip>
Use `{{current_date}}` and `{{current_time}}` in your system prompt to give the agent temporal awareness without hard-coding dates that go stale. For example: "Today is {{current_date}}. Do not suggest appointments in the past."
</Tip>

---

## Custom Variables

Define any variable name you like. Pass its value in the `variables` object when initiating a call.

### Setting Variables in Your Agent

```text
System prompt:
You are a billing specialist at {{company_name}}. You are speaking with {{customer_name}}.

Account details:
- Account number: {{account_number}}
- Current balance: ${{balance}}
- Membership tier: {{tier}}

Your goal is to help them {{call_reason}}. Be concise and empathetic.
```

```text
First message:
Hi {{customer_name}}, this is {{agent_name}} from {{company_name}} support.
I'm calling about your account ending in {{account_last4}}. Is now a good time?
```

### Passing Variables at Call Initiation

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const call = await client.calls.initiate({
  agentId: "agent_abc123",
  type: "outbound",
  phoneNumber: "+14155550100",
  variables: {
    customer_name: "Sarah",
    company_name: "Acme Corp",
    account_number: "ACC-98712",
    balance: "150.00",
    tier: "Gold",
    call_reason: "resolve an overdue payment",
    agent_name: "Alex",
    account_last4: "8712"
  }
});

console.log("Call initiated:", call.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

call = client.calls.initiate(
    agent_id="agent_abc123",
    type="outbound",
    phone_number="+14155550100",
    variables={
        "customer_name": "Sarah",
        "company_name": "Acme Corp",
        "account_number": "ACC-98712",
        "balance": "150.00",
        "tier": "Gold",
        "call_reason": "resolve an overdue payment",
        "agent_name": "Alex",
        "account_last4": "8712"
    }
)

print("Call initiated:", call.data.id)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/calls/initiate \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_abc123",
    "type": "outbound",
    "phoneNumber": "+14155550100",
    "variables": {
      "customer_name": "Sarah",
      "company_name": "Acme Corp",
      "account_number": "ACC-98712",
      "balance": "150.00",
      "tier": "Gold",
      "call_reason": "resolve an overdue payment",
      "agent_name": "Alex",
      "account_last4": "8712"
    }
  }'
```
  </Tab>
</Tabs>

---

## Using Variables in First Messages

Dynamic variables work in `firstMessage` exactly the same way as in `systemPrompt`. This is how you open a call with a personalized greeting.

```json
{
  "firstMessage": "Hi {{customer_name}}, I'm calling from {{company_name}}. I see your last order, number {{order_id}}, is ready for pickup. Do you have a moment?"
}
```

The agent speaks this resolved string as soon as the call connects.

---

## Nested Variable Syntax

Variables resolve greedily — the entire `{{...}}` block including the name is replaced. Variable names must be alphanumeric with underscores. No nesting of `{{}}` inside `{{}}` is supported.

| Syntax | Valid | Notes |
|---|---|---|
| `{{customer_name}}` | Yes | Standard single variable |
| `{{order_123}}` | Yes | Numbers allowed in name |
| `{{first_name}} {{last_name}}` | Yes | Multiple variables on one line |
| `{{{{nested}}}}` | No | Nesting is not supported |
| `{{ customer_name }}` | No | No spaces inside braces |

---

## Escaping Literal Braces

To include a literal `{{` or `}}` in your prompt (for example, in a code snippet or JSON example), escape with a backslash:

```text
The API returns data in this format: \{{result: "value"}}.
```

This renders as:

```text
The API returns data in this format: {{result: "value"}}.
```

---

## Variables with Transient Agents

Dynamic variables work identically when using [transient agents](./agents.md#transient-agents). Pass both `agent` (inline config) and `variables` in the same call initiation request:

<Tabs>
  <Tab title="TypeScript">
```typescript
const call = await client.calls.initiate({
  type: "web",
  agent: {
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt: "You are helping {{customer_name}} with a {{product_name}} question."
    },
    voice: { provider: "openai", voiceId: "nova" },
    firstMessage: "Hi {{customer_name}}, how can I help you with {{product_name}} today?"
  },
  variables: {
    customer_name: "Jordan",
    product_name: "ProSuite"
  }
});
```
  </Tab>
  <Tab title="Python">
```python
call = client.calls.initiate(
    type="web",
    agent={
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "system_prompt": "You are helping {{customer_name}} with a {{product_name}} question."
        },
        "voice": {"provider": "openai", "voice_id": "nova"},
        "first_message": "Hi {{customer_name}}, how can I help you with {{product_name}} today?"
    },
    variables={
        "customer_name": "Jordan",
        "product_name": "ProSuite"
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
      "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "systemPrompt": "You are helping {{customer_name}} with a {{product_name}} question."
      },
      "voice": { "provider": "openai", "voiceId": "nova" },
      "firstMessage": "Hi {{customer_name}}, how can I help you with {{product_name}} today?"
    },
    "variables": {
      "customer_name": "Jordan",
      "product_name": "ProSuite"
    }
  }'
```
  </Tab>
</Tabs>

---

## Best Practices

### Validate Variables Before Initiating a Call

Always verify that all required variables are present and non-empty before calling the API. A missing variable results in the placeholder being spoken verbatim to the caller.

<Tabs>
  <Tab title="TypeScript">
```typescript
function buildCallVariables(customer: Customer) {
  const required = ["customer_name", "account_number", "balance"] as const;
  const variables = {
    customer_name: customer.fullName,
    account_number: customer.accountId,
    balance: customer.balance.toFixed(2)
  };

  for (const key of required) {
    if (!variables[key]) {
      throw new Error(`Missing required call variable: ${key}`);
    }
  }

  return variables;
}
```
  </Tab>
  <Tab title="Python">
```python
def build_call_variables(customer: dict) -> dict:
    variables = {
        "customer_name": customer.get("full_name"),
        "account_number": customer.get("account_id"),
        "balance": f'{customer.get("balance", 0):.2f}'
    }

    required = ["customer_name", "account_number", "balance"]
    for key in required:
        if not variables.get(key):
            raise ValueError(f"Missing required call variable: {key}")

    return variables
```
  </Tab>
</Tabs>

### Define Fallbacks in Your Prompt

Instruct the agent how to handle a case where a value could be missing:

```text
You are speaking with {{customer_name}}.
If the customer name is "Unknown", greet them generically as "valued customer."
```

### Keep Sensitive Data Out of Prompts

<Warning>
System prompts are sent to the LLM provider (OpenAI, Anthropic, etc.) as part of each API call and may appear in call transcripts and recordings. Do not inject passwords, full payment card numbers, government IDs, or other highly sensitive data as dynamic variables. Use account last-4 digits, masked identifiers, or reference tokens instead.
</Warning>

### Use Variables for Context, Not Instructions

Dynamic variables are most effective for factual context (who the caller is, what they own, what they owe). Avoid putting behavioral instructions that vary per call into variables — instead encode that logic into multiple well-named agents or use tools to fetch context at runtime.

---

## Next Steps

- **[Agents](./agents.md)**: Set up your `systemPrompt` and `firstMessage`.
- **[Function Calling](./function-calling.md)**: Fetch live data mid-conversation instead of injecting it upfront.
- **[Webhooks](./webhooks.md)**: Receive the `variables` map back in post-call event payloads.
