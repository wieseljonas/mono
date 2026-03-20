import {
  BaseConnector,
  ConnectionTestResult,
  FetchOptions,
  FetchState,
  ResumableFetchOptions,
  WebhookEventMapping,
  WebhookHandlerOptions,
  WebhookVerificationResult,
} from "../base/BaseConnector";

/**
 * Copy-ready CDC connector template.
 *
 * Rename this class and folder, then replace all TODO sections.
 */
export class TemplateConnector extends BaseConnector {
  static getConfigSchema() {
    return {
      fields: [
        {
          name: "api_key",
          label: "API Key",
          type: "password",
          required: true,
          helperText: "Source API key/token",
        },
        {
          name: "api_base_url",
          label: "API Base URL",
          type: "string",
          required: false,
          helperText: "Base URL for the source API",
        },
      ],
    };
  }

  getMetadata() {
    return {
      name: "Template",
      version: "1.0.0",
      description: "Copy-ready CDC connector template",
      supportedEntities: ["records"],
      supportsCdc: true,
    };
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const base = super.validateConfig();
    const errors = [...base.errors];

    if (!this.dataSource.config.api_key) {
      errors.push("API key is required");
    }

    return { valid: errors.length === 0, errors };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // TODO: call a lightweight authenticated endpoint from the source API.
    return {
      success: false,
      message: "Template connector: implement testConnection()",
    };
  }

  getAvailableEntities(): string[] {
    // TODO: return all syncable entity names for this source.
    return ["records"];
  }

  // Optional override:
  // Use this when you need a hierarchical entity tree (sub-entities) or
  // destination layout hints per entity.
  // getEntityMetadata(): EntityMetadata[] {
  //   return super.getEntityMetadata();
  // }

  supportsResumableFetching(): boolean {
    return true;
  }

  async fetchEntityChunk(options: ResumableFetchOptions): Promise<FetchState> {
    const { state } = options;

    // TODO:
    // 1) Read state cursor/offset/page.
    // 2) Fetch one chunk from source API.
    // 3) Emit rows via options.onBatch(rows).
    // 4) Return next resumable state.
    return {
      cursor: state?.cursor,
      offset: state?.offset,
      page: state?.page,
      totalProcessed: state?.totalProcessed || 0,
      hasMore: false,
      iterationsInChunk: (state?.iterationsInChunk || 0) + 1,
      metadata: state?.metadata,
    };
  }

  async fetchEntity(options: FetchOptions): Promise<void> {
    let state: FetchState | undefined;

    do {
      state = await this.fetchEntityChunk({
        ...options,
        state,
        maxIterations: 10,
      });
    } while (state.hasMore);
  }

  supportsWebhooks(): boolean {
    return true;
  }

  async verifyWebhook(
    options: WebhookHandlerOptions,
  ): Promise<WebhookVerificationResult> {
    const { payload, headers, secret } = options;
    void headers;
    void secret;

    // TODO:
    // - Verify signature with source-specific algorithm/library.
    // - Parse and return the canonical event object.
    const event = typeof payload === "string" ? JSON.parse(payload) : payload;
    return { valid: true, event };
  }

  getWebhookEventMapping(eventType: string): WebhookEventMapping | null {
    // TODO: map every emitted source event type to entity + operation.
    const mappings: Record<string, WebhookEventMapping> = {
      "record.created": { entity: "records", operation: "upsert" },
      "record.updated": { entity: "records", operation: "upsert" },
      "record.deleted": { entity: "records", operation: "delete" },
    };

    return mappings[eventType] || null;
  }

  getSupportedWebhookEvents(): string[] {
    // TODO: keep this in lockstep with getWebhookEventMapping().
    return ["record.created", "record.updated", "record.deleted"];
  }

  extractWebhookData(event: any): { id: string; data: any } | null {
    // TODO:
    // - return a stable record ID used for upsert/delete keys.
    // - return normalized data payload for destination writers.
    const data = event?.data || event?.object || event;
    const id = data?.id;
    if (!id) return null;

    return {
      id: String(id),
      data,
    };
  }
}
