# Knowledge Base

A **Knowledge Base** lets your agent answer questions grounded in your own documents. Upload product manuals, help articles, FAQs, pricing sheets, or any reference material and OrtaVox will automatically make that content available to the agent during calls — no prompt stuffing or manual context management required.

---

## How It Works

OrtaVox uses **Retrieval-Augmented Generation (RAG)** to connect your documents to the agent's LLM:

```
Call starts → User asks a question
     |
     v
OrtaVox encodes the user's query as a semantic vector
     |
     v
Vector search runs against your Knowledge Base index
     |
     v
Top-k most relevant document chunks are retrieved
     |
     v
Retrieved chunks are injected into the LLM context window
     |
     v
LLM generates a response grounded in your document content
     |
     v
Agent speaks the answer to the caller
```

This means the agent can accurately answer questions about content that would not fit in a system prompt, stays up to date as you add or replace documents, and cites only information that actually exists in your files.

<Note>
OrtaVox uses a chunk size of 512 tokens with 64-token overlap by default. Documents are re-indexed automatically within 60 seconds of upload or update.
</Note>

---

## Supported File Formats

| Format | Extension | Notes |
|---|---|---|
| PDF | `.pdf` | Text-based PDFs only. Scanned image PDFs are not supported. |
| Word Document | `.docx` | Standard Office Open XML format. |
| Plain Text | `.txt` | UTF-8 encoded. |
| Markdown | `.md`, `.mdx` | Headings and structure are preserved during chunking. |
| CSV | `.csv` | Each row is treated as a separate chunk with column headers as context. |
| Web Page | URL | OrtaVox fetches and indexes the page content at the time of submission. |

---

## Size Limits

| Limit | Value |
|---|---|
| Max file size | 100 MB per file |
| Max total storage | 1 GB per organization |
| Max documents per KB | 500 |
| Max Knowledge Bases | 20 per organization |

<Warning>
Approaching the 1 GB organization limit will degrade indexing performance. Archive or delete unused Knowledge Bases regularly to stay within limits.
</Warning>

---

## Create a Knowledge Base

`POST https://api.ortavox.ai/v1/knowledge-bases`

<Tabs>
  <Tab title="TypeScript">
```typescript
import { OrtavoxClient } from "ortavox";

const client = new OrtavoxClient({ apiKey: process.env.ORTAVOX_API_KEY });

const kb = await client.knowledgeBases.create({
  name: "Acme Product Documentation",
  description: "Product manuals, FAQs, and pricing for all Acme Corp products."
});

console.log("Knowledge Base created:", kb.data.id);
```
  </Tab>
  <Tab title="Python">
```python
import os
from ortavox import OrtavoxClient

client = OrtavoxClient(api_key=os.environ["ORTAVOX_API_KEY"])

kb = client.knowledge_bases.create(
    name="Acme Product Documentation",
    description="Product manuals, FAQs, and pricing for all Acme Corp products."
)

print("Knowledge Base created:", kb.data.id)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/knowledge-bases \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Product Documentation",
    "description": "Product manuals, FAQs, and pricing for all Acme Corp products."
  }'
```
  </Tab>
</Tabs>

---

## Upload a Document

`POST https://api.ortavox.ai/v1/knowledge-bases/{kbId}/documents`

Upload a file as multipart form data, or submit a URL to index web content.

### Upload a File

<Tabs>
  <Tab title="TypeScript">
```typescript
import fs from "fs";
import FormData from "form-data";

// Upload a PDF file
const form = new FormData();
form.append("file", fs.createReadStream("./docs/product-manual.pdf"));
form.append("name", "ProSuite 3.0 Manual");
form.append("metadata", JSON.stringify({ product: "ProSuite", version: "3.0" }));

const doc = await client.knowledgeBases.uploadDocument("kb_abc123", form);

console.log("Document uploaded:", doc.data.id, "— status:", doc.data.status);
// status: "indexing" | "ready" | "failed"
```
  </Tab>
  <Tab title="Python">
```python
# Upload a PDF file
with open("./docs/product-manual.pdf", "rb") as f:
    doc = client.knowledge_bases.upload_document(
        kb_id="kb_abc123",
        file=f,
        name="ProSuite 3.0 Manual",
        metadata={"product": "ProSuite", "version": "3.0"}
    )

print("Document uploaded:", doc.data.id, "— status:", doc.data.status)
# status: "indexing" | "ready" | "failed"
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/knowledge-bases/kb_abc123/documents \
  -H "Authorization: Bearer sk_live_..." \
  -F "file=@./docs/product-manual.pdf" \
  -F 'name=ProSuite 3.0 Manual' \
  -F 'metadata={"product":"ProSuite","version":"3.0"}'
```
  </Tab>
</Tabs>

### Index a URL

<Tabs>
  <Tab title="TypeScript">
```typescript
const doc = await client.knowledgeBases.addUrl("kb_abc123", {
  url: "https://docs.acmecorp.com/prosuite/faq",
  name: "ProSuite FAQ",
  metadata: { source: "web", product: "ProSuite" }
});

console.log("URL indexed:", doc.data.id);
```
  </Tab>
  <Tab title="Python">
```python
doc = client.knowledge_bases.add_url(
    kb_id="kb_abc123",
    url="https://docs.acmecorp.com/prosuite/faq",
    name="ProSuite FAQ",
    metadata={"source": "web", "product": "ProSuite"}
)

print("URL indexed:", doc.data.id)
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X POST https://api.ortavox.ai/v1/knowledge-bases/kb_abc123/documents \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.acmecorp.com/prosuite/faq",
    "name": "ProSuite FAQ",
    "metadata": { "source": "web", "product": "ProSuite" }
  }'
```
  </Tab>
</Tabs>

---

## List Documents in a Knowledge Base

`GET https://api.ortavox.ai/v1/knowledge-bases/{kbId}/documents`

<Tabs>
  <Tab title="TypeScript">
```typescript
const docs = await client.knowledgeBases.listDocuments("kb_abc123");

for (const doc of docs.data) {
  console.log(`${doc.name} — ${doc.status} — ${doc.chunkCount} chunks`);
}
```
  </Tab>
  <Tab title="Python">
```python
docs = client.knowledge_bases.list_documents("kb_abc123")

for doc in docs.data:
    print(f"{doc.name} — {doc.status} — {doc.chunk_count} chunks")
```
  </Tab>
  <Tab title="cURL">
```bash
curl https://api.ortavox.ai/v1/knowledge-bases/kb_abc123/documents \
  -H "Authorization: Bearer sk_live_..."
```
  </Tab>
</Tabs>

### Document Status Values

| Status | Meaning |
|---|---|
| `indexing` | File received, vector indexing in progress. Typically completes within 60 seconds. |
| `ready` | Document is indexed and available for retrieval during calls. |
| `failed` | Indexing failed. Check `document.error` for details (e.g., encrypted PDF, unsupported encoding). |

---

## Attach a Knowledge Base to an Agent

Once a Knowledge Base has at least one document with `status: "ready"`, attach it to an agent:

<Tabs>
  <Tab title="TypeScript">
```typescript
await client.agents.update("agent_abc123", {
  knowledgeBaseIds: ["kb_abc123"]
});

console.log("Knowledge Base attached to agent.");
```
  </Tab>
  <Tab title="Python">
```python
client.agents.update(
    "agent_abc123",
    knowledge_base_ids=["kb_abc123"]
)

print("Knowledge Base attached to agent.")
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X PATCH https://api.ortavox.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "knowledgeBaseIds": ["kb_abc123"]
  }'
```
  </Tab>
</Tabs>

An agent can be attached to multiple Knowledge Bases. OrtaVox searches across all attached KBs simultaneously and merges the top results before injecting them into context.

---

## Delete a Document

`DELETE https://api.ortavox.ai/v1/knowledge-bases/{kbId}/documents/{documentId}`

<Tabs>
  <Tab title="TypeScript">
```typescript
await client.knowledgeBases.deleteDocument("kb_abc123", "doc_xyz789");
```
  </Tab>
  <Tab title="Python">
```python
client.knowledge_bases.delete_document("kb_abc123", "doc_xyz789")
```
  </Tab>
  <Tab title="cURL">
```bash
curl -X DELETE \
  https://api.ortavox.ai/v1/knowledge-bases/kb_abc123/documents/doc_xyz789 \
  -H "Authorization: Bearer sk_live_..."
```
  </Tab>
</Tabs>

---

## Best Practices

### Structure Your Documents for Retrieval

RAG retrieval works at the chunk level (typically 300–600 words). Chunks that mix unrelated topics degrade retrieval quality. Follow these guidelines:

- **One topic per section.** Use clear headings (H2/H3) to break up content. OrtaVox respects heading boundaries when chunking Markdown and DOCX files.
- **Include the question in FAQ documents.** Write "Q: How do I reset my password? A: ..." rather than just the answer. This improves semantic matching against caller questions.
- **Avoid tables for critical facts.** Table cells are chunked as plain text and lose their relational structure. Put key specifications in prose instead, or in addition.

### Tag Documents with Metadata

Metadata is stored alongside each chunk and can be used to filter retrieval in the future. Tag documents by product, version, region, or audience:

```json
{
  "metadata": {
    "product": "ProSuite",
    "version": "3.0",
    "region": "US",
    "audience": "customer"
  }
}
```

### Keep Documents Fresh

URL-indexed documents are fetched once at submission time. For web pages that change frequently:

- Set a reminder to re-submit the URL after major content updates.
- For version-controlled documentation, upload files directly from your CI/CD pipeline after each release.

<Tip>
Use the OrtaVox API in your deployment pipeline to automatically update your Knowledge Base whenever you publish new documentation. Delete the old document and upload the new version — re-indexing completes within 60 seconds.
</Tip>

### Supplement with a System Prompt

Tell the agent how to use the Knowledge Base in its system prompt:

```text
You have access to Acme Corp's product documentation. When a user asks about product features,
pricing, or troubleshooting, search your knowledge base before answering. If you cannot find
the answer, say "I don't have that information on hand — let me connect you with a specialist"
and offer to transfer the call.
```

### Avoid Overly Large Single Files

A single 100 MB PDF creates thousands of chunks. During retrieval, only the top-k most relevant chunks are used (default k=5). Splitting a large document into focused sub-documents (e.g., one per product chapter) tends to produce more accurate retrieval than one massive file.

---

## Next Steps

- **[Agents](./agents.md)**: Create and configure the agent you will attach your Knowledge Base to.
- **[Function Calling](./function-calling.md)**: Use tools to fetch live data that doesn't belong in static documents.
- **[Webhooks](./webhooks.md)**: Receive per-turn retrieval metadata in call event payloads (coming soon).
