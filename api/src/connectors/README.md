# Connector Authoring Guide (Source of Truth)

This is the canonical, repo-native guide for creating connectors in this codebase.
If this file and other docs conflict, follow the runtime contract in:

- `api/src/connectors/base/BaseConnector.ts`
- `api/src/connectors/registry.ts`
- `api/src/sync/connector-registry.ts`
- `api/src/routes/webhooks.ts`
- `api/src/inngest/functions/webhook-flow.ts`

## 1) Real Connector Contract

At minimum, every connector class must extend `BaseConnector` and implement:

- `testConnection(): Promise<ConnectionTestResult>`
- `getAvailableEntities(): string[]`
- `fetchEntity(options: FetchOptions): Promise<void>`
- `getMetadata(): { name, version, description, author?, supportedEntities, supportsCdc? }`

Common optional methods used heavily in production:

- `validateConfig()`
- `getEntityMetadata()`
- `supportsResumableFetching()` + `fetchEntityChunk()`
- `supportsWebhooks()`
- `verifyWebhook()`
- `getWebhookEventMapping()`
- `getSupportedWebhookEvents()`
- `extractWebhookData()`

Repo-specific convention not expressed in `BaseConnector` type:

- `static getConfigSchema()` is expected by UI/registry code and should be present on real connectors.

## 2) Discovery and Naming Rules (No Manual Registry Edits)

Connectors are auto-discovered by folder + export convention.
Do not manually edit a static connector map.

Required structure for a connector type `my-service`:

```text
api/src/connectors/my-service/
  connector.ts
  index.ts
  icon.svg
```

Rules used by runtime registries:

- API runtime registry (`api/src/connectors/registry.ts`) scans connector subfolders and imports `./<folder>/index`.
- Sync registry (`api/src/sync/connector-registry.ts`) lazily imports `../connectors/<folder>`.
- Each connector module must export a class whose export name ends with `Connector`.
- Connector `type` is the folder name.

## 3) Track A: Basic Connector (Full/Incremental Sync)

Implement this when you only need pull-based sync (no webhook CDC):

1. `static getConfigSchema()` for UI form generation.
2. `validateConfig()` to guard required credentials/config.
3. `testConnection()` with a cheap auth/health request.
4. `getAvailableEntities()` (and optionally `getEntityMetadata()`).
5. `fetchEntity()` for complete fetch behavior.
6. Prefer resumable sync: `supportsResumableFetching() === true` + `fetchEntityChunk()`.

Notes:

- Use `onBatch` to emit records.
- Use `onProgress` if counts are available.
- Honor `since` for incremental sync.
- Respect rate limits (`this.getRateLimitDelay()` / `this.sleep()`).

## 4) Track B: CDC-Capable Connector (Webhook + Mapping + Extraction)

CDC support is not one method. It is the combination of:

- `getMetadata().supportsCdc = true`
- webhook support methods
- robust event type mapping
- stable payload extraction
- resumable fetching for backfill/resume where source API requires it

Minimum CDC method set:

- `supportsWebhooks()`
- `verifyWebhook()`
- `getWebhookEventMapping()`
- `getSupportedWebhookEvents()`
- `extractWebhookData()`

## 5) End-to-End Webhook CDC Runtime Path

### Step 1: Verification input and event persistence (`api/src/routes/webhooks.ts`)

- `verifyWebhook()` receives:
  - `payload`: raw UTF-8 request body text
  - `headers`: incoming webhook headers
  - `secret`: flow webhook secret
- The route stores a normalized `eventType` using:
  - `event.type`
  - `event.event_type`
  - `event.action`
  - `event.event.object_type + "." + event.event.action`

### Step 2: Event mapping + extraction (`api/src/inngest/functions/webhook-flow.ts`)

- Runtime calls `connector.getWebhookEventMapping(eventType)`.
- Runtime calls `connector.extractWebhookData(webhookEvent.rawPayload)`.
- `extractWebhookData()` must return stable shape:

```ts
{ id: string; data: Record<string, unknown> }
```

- For activity-like sources, runtime may resolve sub-entities (example: `activities:${data._type}`), so mappings and extracted payload should be consistent with entity naming.

### Step 3: Destination write behavior (delete semantics differ by destination)

- **MongoDB path**: `delete` mapping performs hard delete (`deleteOne`).
- **SQL/warehouse path**:
  - upsert: write with key columns
  - delete: behavior depends on `flow.deleteMode`
    - `hard`: physical delete by keys
    - `soft`: upsert record with `is_deleted/deleted_at`
- **BigQuery CDC path**:
  - webhook event is appended as a change event (`pending`)
  - materialization applies operation later
  - delete semantics are resolved by CDC materialization logic, not immediate table DML in webhook handler

## 6) Canonical Copy Template

Use this scaffold as the starting point for new CDC connectors:

- `api/src/connectors/template/connector.ts`
- `api/src/connectors/template/index.ts`
- `api/src/connectors/template/icon.svg`

The `template` folder is intentionally excluded from runtime discovery.
Copy it to a new folder name (for example `my-service`) and rename the class.

Follow `stripe/connector.ts` and `close/connector.ts` for production-grade patterns.

## 7) Query-Based Connector Clarifications

- GraphQL and PostHog query definitions are flow/transfer-level configuration, then injected at sync runtime.
- Connector config still holds credentials/base connection settings.
- REST is already implemented in this repo (`api/src/connectors/rest`), not a future placeholder.

## 8) One-Shot Authoring Checklist (Human + LLM)

- [ ] folder name matches connector type
- [ ] exported class name ends with `Connector`
- [ ] `index.ts` re-exports the connector class
- [ ] `static getConfigSchema()` implemented
- [ ] `getMetadata()` implemented, with `supportsCdc` set correctly
- [ ] `validateConfig()` implemented
- [ ] `testConnection()` implemented
- [ ] `getAvailableEntities()` implemented (and `getEntityMetadata()` if hierarchical)
- [ ] `fetchEntity()` implemented
- [ ] resumable sync implemented (`supportsResumableFetching` + `fetchEntityChunk`) when needed
- [ ] `supportsWebhooks()` implemented for CDC connectors
- [ ] `verifyWebhook()` validates signature using raw UTF-8 body input
- [ ] `getWebhookEventMapping()` covers all emitted source event types
- [ ] `getSupportedWebhookEvents()` aligns with mapping
- [ ] `extractWebhookData()` always returns stable `{ id, data }`
- [ ] mapped entity names align with flow/destination table naming
- [ ] tested with one full-sync run and one real webhook payload
