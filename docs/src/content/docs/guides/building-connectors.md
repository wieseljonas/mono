---
title: Building Connectors
description: Learn how to create a new data connector.
---

This guide is a quick start. The canonical source of truth is:

- `api/src/connectors/README.md`
- `api/src/connectors/base/BaseConnector.ts`

## Connector Structure

Create a folder under `api/src/connectors/<source-name>` with:

1. `connector.ts`
2. `index.ts`
3. `icon.svg`

Example:

```text
api/src/connectors/my-service/
  connector.ts
  index.ts
  icon.svg
```

## Discovery (Important)

Do **not** manually register connectors in a static map.

Connectors are auto-discovered by folder/export convention in:

- `api/src/connectors/registry.ts` (API runtime)
- `api/src/sync/connector-registry.ts` (sync runtime)

Your module must export a class whose name ends with `Connector`.

## Required Runtime Contract

Implement the real `BaseConnector` contract:

- `testConnection()`
- `getAvailableEntities()`
- `fetchEntity()`
- `getMetadata()`

Recommended in real connectors:

- `static getConfigSchema()` (used by UI/registry code)
- `validateConfig()`
- `supportsResumableFetching()` + `fetchEntityChunk()`

## Two Implementation Tracks

### Basic connector (pull sync only)

Implement config schema, validation, connection test, entities, and chunked fetch.

### CDC-capable connector (webhook + CDC)

Set `supportsCdc: true` in `getMetadata()` and implement:

- `supportsWebhooks()`
- `verifyWebhook()`
- `getWebhookEventMapping()`
- `getSupportedWebhookEvents()`
- `extractWebhookData()`

Also implement resumable fetching for robust backfill/resume behavior when required by the source API.

## Canonical CDC Template

Copy the template and rename it:

- `api/src/connectors/template/connector.ts`
- `api/src/connectors/template/index.ts`
- `api/src/connectors/template/icon.svg`

Then replace all TODO blocks.

## Query-Based Connector Clarification

- Connector config stores credentials and base connection config.
- Flow/transfer config defines query payloads for query-based connectors.
- GraphQL and PostHog follow this flow-level query pattern.
