# Function Calling & Tools

Tools give your voice agents the ability to take real-world action mid-conversation. Instead of just talking, your agent can look up order statuses, check calendar availability, book appointments, update CRM records, and more — all while keeping the conversation flowing naturally.

---

## What Tools Are

A **tool** is a JSON Schema definition that describes a function your backend exposes. When the LLM decides to invoke a tool, OrtaVox pauses speech synthesis, sends an HTTP POST request to your server with the extracted parameters, waits for your response, and then resumes the conversation with the result incorporated.

From the caller's perspective, the agent pauses for a moment (typically under 300ms for fast backends) and then responds with real, live data. No conversation restart, no awkward hold music.

---

## How It Works

```
User speaks
     |
     v
Agent Engine (STT) → transcribes audio to text
     |
     v
LLM receives transcript + conversation history + tool definitions
     |
     v
LLM decides to call a tool: check_order_status(order_id="ORD-8821")
     |
     v
OrtaVox sends HTTP POST to your serverUrl with parameters as JSON body
     |
     v
Your server executes logic, returns JSON response
     |
     v
OrtaVox feeds response back to LLM as tool result
     |
     v
LLM generates natural language reply based on the result
     |
     v
TTS synthesizes the reply → agent speaks to the caller
```

The complete round-trip from user speech to agent spoken reply — including a tool call — typically takes 800ms–1.5s depending on your backend latency.

---

## Tool Schema Format

Tools are defined using standard JSON Schema for parameters, with OrtaVox-specific fields for the server endpoint.

```json
{
  "name": "check_order_status",
  "description": "Look up the current status of a customer order by order ID.",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "The order ID to look up, e.g. ORD-8821"
      }
    },
    "required": ["order_id"]
  },
  "serverUrl": "https://api.yourapp.com/tools/order-status"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique snake_case identifier. The LLM uses this to select the tool. Make it descriptive. |
| `description` | string | Yes | Plain-English explanation of what the tool does. The LLM reads this to decide when to call it. Be specific. |
| `parameters` | object | Yes | JSON Schema `object` describing all accepted parameters and which are required. |
| `serverUrl` | string | Yes | HTTPS endpoint OrtaVox will POST to when the tool is invoked. Must be publicly reachable. |
| `headers` | object | No | Additional HTTP headers sent with each tool invocation, e.g. authorization secrets. |
| `timeoutMs` | integer | No | Per-invocation timeout override. Max 30000. Defaults to 30000. |

<Tip>
Write `description` as if you are telling the LLM exactly when and why to call the tool. Vague descriptions lead to tools being called at the wrong time or not at all. Good: "Look up the current status of an order when the user asks where their package is." Bad: "Gets order info."
</Tip>

---

## Creating and Attaching a Tool

### Step 1: Create the Tool

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const tool = await client.tools.create({
  name: "check_order_status",
  description:
    "Look up the current status of a customer order. Call this when the user asks where their order is or what the status of their purchase is.",
  parameters: {
    type: "object",
    properties: {
      order_id: {
        type: "string",
        description: "The order ID, e.g. ORD-8821"
      }
    },
    required: ["order_id"]
  },
  serverUrl: "https://api.yourapp.com/tools/order-status",
  headers: {
    Authorization: "Bearer your_internal_tool_secret"
  }
});

console.log("Tool created:", tool.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

tool = client.tools.create(
    name="check_order_status",
    description=(
        "Look up the current status of a customer order. "
        "Call this when the user asks where their order is or "
        "what the status of their purchase is."
    ),
    parameters={
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The order ID, e.g. ORD-8821"
            }
        },
        "required": ["order_id"]
    },
    server_url="https://api.yourapp.com/tools/order-status",
    headers={"Authorization": "Bearer your_internal_tool_secret"}
)

print("Tool created:", tool.data.id)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/tools \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "check_order_status",
    "description": "Look up the current status of a customer order when the user asks where their order is.",
    "parameters": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "The order ID, e.g. ORD-8821"
        }
      },
      "required": ["order_id"]
    },
    "serverUrl": "https://api.yourapp.com/tools/order-status",
    "headers": {
      "Authorization": "Bearer your_internal_tool_secret"
    }
  }'
```
  </Tab>
</Tabs>

### Step 2: Attach the Tool to an Agent

<Tabs>
  <Tab title="TypeScript">
```typescript
await client.agents.update("agent_abc123", {
  model: {
    tools: ["tool_xyz789"]
  }
});
```
  </Tab>
  <Tab title="Python">
```python
client.agents.update(
    "agent_abc123",
    model={"tools": ["tool_xyz789"]}
)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X PATCH https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": {
      "tools": ["tool_xyz789"]
    }
  }'
```
  </Tab>
</Tabs>

Alternatively, define tools inline when creating an agent:

<Tabs>
  <Tab title="TypeScript">
```typescript
const agent = await client.agents.create({
  name: "Order Support Agent",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: "You are an order support agent. Use check_order_status to look up orders.",
    tools: [
      {
        name: "check_order_status",
        description: "Look up the status of a customer order by order ID.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID" }
          },
          required: ["order_id"]
        },
        serverUrl: "https://api.yourapp.com/tools/order-status"
      }
    ]
  },
  voice: { provider: "openai", voiceId: "nova" }
});
```
  </Tab>
  <Tab title="Python">
```python
agent = client.agents.create(
    name="Order Support Agent",
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": "You are an order support agent. Use check_order_status to look up orders.",
        "tools": [
            {
                "name": "check_order_status",
                "description": "Look up the status of a customer order by order ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string", "description": "The order ID"}
                    },
                    "required": ["order_id"]
                },
                "server_url": "https://api.yourapp.com/tools/order-status"
            }
        ]
    },
    voice={"provider": "openai", "voice_id": "nova"}
)
```
  </Tab>
</Tabs>

---

## Building a Tool Server

Your tool server is a plain HTTP server. OrtaVox sends a `POST` request to the `serverUrl` with a JSON body containing the parameters the LLM extracted from the conversation. Your server processes the request and returns a JSON response.

### Request Format (What OrtaVox Sends)

```json
{
  "tool": "check_order_status",
  "call_id": "call_a1b2c3d4",
  "parameters": {
    "order_id": "ORD-8821"
  }
}
```

### Response Format (What Your Server Returns)

Return any JSON object. The entire response body is passed to the LLM as the tool result.

```json
{
  "status": "shipped",
  "carrier": "FedEx",
  "tracking_number": "7489234832984",
  "estimated_delivery": "2026-02-27",
  "last_location": "Oakland, CA"
}
```

### Express.js Example

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/tools/order-status", async (req, res) => {
  const { parameters, call_id } = req.body;
  const { order_id } = parameters;

  // Validate the internal secret your tool was created with
  const authHeader = req.headers["authorization"];
  if (authHeader !== "Bearer your_internal_tool_secret") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch from your database or internal service
    const order = await db.orders.findById(order_id);

    if (!order) {
      return res.json({
        found: false,
        message: `No order found with ID ${order_id}. Ask the customer to double-check the number.`
      });
    }

    return res.json({
      status: order.status,
      carrier: order.carrier,
      tracking_number: order.trackingNumber,
      estimated_delivery: order.estimatedDelivery
    });
  } catch (err) {
    return res.json({
      error: true,
      message: "Unable to retrieve order status right now. Please tell the customer to try again later."
    });
  }
});

app.listen(3000);
```

### FastAPI Example

```python
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ToolRequest(BaseModel):
    tool: str
    call_id: str
    parameters: dict

@app.post("/tools/order-status")
async def check_order_status(request: Request, body: ToolRequest):
    auth = request.headers.get("authorization")
    if auth != "Bearer your_internal_tool_secret":
        raise HTTPException(status_code=401, detail="Unauthorized")

    order_id = body.parameters.get("order_id")
    if not order_id:
        return {"error": True, "message": "No order ID provided."}

    # Fetch from your database
    order = await db.get_order(order_id)

    if not order:
        return {
            "found": False,
            "message": f"No order found with ID {order_id}. Ask the customer to double-check."
        }

    return {
        "status": order["status"],
        "carrier": order["carrier"],
        "tracking_number": order["tracking_number"],
        "estimated_delivery": order["estimated_delivery"]
    }
```

<Warning>
Always authenticate tool requests. OrtaVox forwards the `headers` you defined when creating the tool. Verify a shared secret or HMAC signature on every request to prevent unauthorized invocations.
</Warning>

---

## Built-in Tools

OrtaVox provides two native tools that do not require a `serverUrl` — they are handled directly by the platform.

### `transfer_call`

Transfers the active call to a phone number or SIP destination. The agent hands off the caller smoothly.

```json
{
  "name": "transfer_call",
  "description": "Transfer the caller to a human agent when they request it or when the issue cannot be resolved automatically.",
  "parameters": {
    "type": "object",
    "properties": {
      "destination": {
        "type": "string",
        "description": "Phone number (E.164 format) or SIP URI to transfer to"
      },
      "reason": {
        "type": "string",
        "description": "Brief reason for transfer, logged in call analytics"
      }
    },
    "required": ["destination"]
  }
}
```

### `end_call`

Politely ends the call. The agent speaks `endCallMessage` (if configured) before hanging up.

```json
{
  "name": "end_call",
  "description": "End the call politely once the user's issue has been resolved or they have requested to hang up.",
  "parameters": {
    "type": "object",
    "properties": {
      "reason": {
        "type": "string",
        "description": "Reason for ending the call, e.g. issue_resolved, user_requested, no_match"
      }
    }
  }
}
```

To enable either built-in tool, include it in the `model.tools` array on your agent:

```json
{
  "model": {
    "tools": [
      { "name": "transfer_call", "builtin": true },
      { "name": "end_call", "builtin": true }
    ]
  }
}
```

---

## Tool Execution Limits

| Limit | Value | Notes |
|---|---|---|
| Timeout | 30 seconds | If your server does not respond within 30s, OrtaVox returns a timeout error to the LLM and the agent informs the caller gracefully. |
| Max payload | 1 MB | Applies to both the request body sent to your server and the response body returned. |
| Invocations per session | 100 | Across all tools for the duration of one call. |
| Parallel executions | 3 | The LLM may invoke multiple tools simultaneously; max 3 run concurrently. |

<Note>
Tool timeout counts towards overall agent turn latency. Aim for sub-1s responses from your tool server to keep conversations feeling natural. Cache aggressively and avoid synchronous database calls where possible.
</Note>

---

## Advanced Patterns

### Multi-Step Tool Chaining

The LLM can invoke tools sequentially based on earlier results. Guide this with explicit instructions in your system prompt:

```text
When a user wants to book an appointment:
1. Call check_availability with their requested date and time.
2. If available, confirm the time with the user before proceeding.
3. Only call create_booking after the user confirms.
4. After booking, call send_confirmation with the booking ID.
Do not book anything without explicit user confirmation.
```

The LLM respects this ordering and uses the result of each tool call before deciding to proceed.

### Handling Errors Gracefully

Return structured error objects that give the LLM enough context to respond helpfully:

```json
{
  "success": false,
  "error_code": "SLOT_UNAVAILABLE",
  "message": "That time slot is taken. The next available slot is 4:00 PM. Please ask the user if that works."
}
```

The LLM will relay this naturally: *"3pm is already booked. Would 4pm work for you instead?"*

### Parallel Tool Calls

If the LLM determines multiple independent tools are needed simultaneously (up to 3), it invokes them in parallel. OrtaVox waits for all to complete before resuming. Design your tool server to be stateless and handle concurrent requests safely.

---

## End-to-End Example

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

// 1. Create tools
const orderTool = await client.tools.create({
  name: "check_order_status",
  description: "Look up an order's status when the user asks about their shipment.",
  parameters: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "The order ID" }
    },
    required: ["order_id"]
  },
  serverUrl: "https://api.yourapp.com/tools/order-status",
  headers: { Authorization: "Bearer your_internal_tool_secret" }
});

// 2. Create agent with tools
const agent = await client.agents.create({
  name: "Order Support Bot",
  transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: `You are an order support agent for Acme Store.
When a user asks about an order, use check_order_status to look it up.
Always confirm the order ID before calling the tool.`,
    tools: [orderTool.data.id]
  },
  voice: { provider: "elevenlabs", voiceId: "dqzVFKHwZvR9YMQoFM67" },
  firstMessage: "Hi! This is Acme order support. What's your order number?"
});

// 3. Initiate a call
const call = await client.calls.initiate({
  agentId: agent.data.id,
  type: "outbound",
  phoneNumber: "+14155550100"
});

console.log("Call started:", call.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

# 1. Create tool
order_tool = client.tools.create(
    name="check_order_status",
    description="Look up an order's status when the user asks about their shipment.",
    parameters={
        "type": "object",
        "properties": {
            "order_id": {"type": "string", "description": "The order ID"}
        },
        "required": ["order_id"]
    },
    server_url="https://api.yourapp.com/tools/order-status",
    headers={"Authorization": "Bearer your_internal_tool_secret"}
)

# 2. Create agent with tools
agent = client.agents.create(
    name="Order Support Bot",
    transcriber={"provider": "deepgram", "model": "nova-3", "language": "en"},
    model={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "system_prompt": (
            "You are an order support agent for Acme Store. "
            "When a user asks about an order, use check_order_status to look it up. "
            "Always confirm the order ID before calling the tool."
        ),
        "tools": [order_tool.data.id]
    },
    voice={"provider": "elevenlabs", "voice_id": "dqzVFKHwZvR9YMQoFM67"},
    first_message="Hi! This is Acme order support. What's your order number?"
)

# 3. Initiate call
call = client.calls.initiate(
    agent_id=agent.data.id,
    type="outbound",
    phone_number="+14155550100"
)

print("Call started:", call.data.id)
```
  </Tab>
</Tabs>

---

## Next Steps

- **[Agents](./agents.md)**: Attach tools to agents and configure all agent settings.
- **[Webhooks](./webhooks.md)**: Receive tool invocation logs in post-call event payloads.
- **[Knowledge Base](./knowledge-base.md)**: Give the agent access to your documents without writing tool code.
- **[API Reference](/api-reference)**: Full tools endpoint documentation.
