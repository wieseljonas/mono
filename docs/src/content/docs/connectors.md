---
title: SaaS Sync (Connectors)
description: Pull data from SaaS tools like Stripe, PostHog, and Close CRM into your data warehouse.
---

:::caution[Experimental]
Connectors and data sync are experimental features under active development. The API and behavior may change.
:::

Connectors pull data from external services (Stripe, Close CRM, PostHog, REST APIs) and sync it into your connected databases. This lets you query third-party data with SQL alongside your own data.

## Available Connectors

| Connector | Source | Entities |
|---|---|---|
| **Stripe** | Stripe API | Customers, Subscriptions, Invoices, Charges, Products, Prices |
| **PostHog** | PostHog API | Events, Persons, Groups |
| **Close CRM** | Close API | Leads, Contacts, Activities, Opportunities |
| **REST** | Any REST API | Configurable endpoints |

## How It Works

1. **Configure** — Add a connector with API credentials and select which entities to sync
2. **Map** — Choose a destination database and table naming convention
3. **Sync** — Connectors fetch data in chunks with cursor-based pagination
4. **Resume** — If a sync fails, it resumes from the last saved cursor (idempotent upserts)

## Building Custom Connectors

See [Building Connectors](/guides/building-connectors/) for the quick path, then use the in-repo source of truth:

- `api/src/connectors/README.md`
- `api/src/connectors/base/BaseConnector.ts`

The runtime contract is class-based (`BaseConnector`), not the old conceptual interface snippet.
Connectors are auto-discovered by folder/export convention (no manual static registry edits).

For CDC/webhook-capable connectors, the runtime also requires webhook verification, event mapping, and stable payload extraction methods in addition to `supportsCdc` metadata.

Canonical copy template:

- `api/src/connectors/template/connector.ts`
- `api/src/connectors/template/index.ts`
- `api/src/connectors/template/icon.svg`

## Configuration

Connectors are configured per-workspace through the UI or API. Credentials are encrypted at rest using the `ENCRYPTION_KEY` environment variable.
