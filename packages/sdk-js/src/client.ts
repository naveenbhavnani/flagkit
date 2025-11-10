import type {
  FlagKitOptions,
  EvaluationContext,
  FlagEvaluation,
  ApiResponse,
  SdkEventType,
  EventListener,
  CacheEntry,
  SdkEvent,
} from './types';

/**
 * FlagKit JavaScript SDK Client
 */
export class FlagKitClient {
  private options: Required<FlagKitOptions>;
  private flags: Map<string, FlagEvaluation> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private pollingTimer?: ReturnType<typeof setInterval>;
  private websocket: WebSocket | null = null;
  private initialized = false;
  private eventListeners: Map<SdkEventType, Set<EventListener>> = new Map();
  private fetchImpl: typeof fetch;
  private context?: EvaluationContext;

  constructor(options: FlagKitOptions) {
    this.options = {
      sdkKey: options.sdkKey,
      apiUrl: options.apiUrl || 'http://localhost:3001',
      pollingInterval: options.pollingInterval ?? 30000,
      enableStreaming: options.enableStreaming ?? false,
      streamUrl: options.streamUrl || 'ws://localhost:3001',
      timeout: options.timeout || 10000,
      enableCache: options.enableCache ?? true,
      fetch: options.fetch || globalThis.fetch,
      sdkVersion: options.sdkVersion || '0.1.0',
    };

    this.fetchImpl = this.options.fetch.bind(globalThis);
  }

  /**
   * Initialize the SDK and fetch flags
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchFlags();
      this.initialized = true;
      this.emit('ready', undefined);

      // Start polling if enabled
      if (this.options.pollingInterval > 0) {
        this.startPolling();
      }

      // Connect WebSocket if enabled
      if (this.options.enableStreaming) {
        this.connectWebSocket();
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch all flags from the API
   */
  private async fetchFlags(): Promise<void> {
    const url = `${this.options.apiUrl}/sdk/v1/client/${this.options.sdkKey}/flags`;

    this.log('Fetching flags from:', url);

    const response = await this.fetchImpl(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch flags: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse<{ flags: FlagEvaluation[] }>;

    if (!data.success || !data.data) {
      throw new Error(data.error?.message || 'Failed to fetch flags');
    }

    // Convert array of flag evaluations to Map
    this.flags.clear();
    for (const flag of data.data.flags) {
      this.flags.set(flag.flagKey, flag);
    }
    this.log('Fetched', this.flags.size, 'flags');
  }

  /**
   * Start polling for flag updates
   */
  private startPolling(): void {
    this.log('Starting polling with interval:', this.options.pollingInterval, 'ms');

    this.pollingTimer = setInterval(async () => {
      try {
        // Create a snapshot of current flags
        const oldFlags = new Map(this.flags);
        await this.fetchFlags();

        // Check if flags changed by comparing Map entries
        let hasChanges = oldFlags.size !== this.flags.size;
        if (!hasChanges) {
          for (const [key, value] of this.flags) {
            if (JSON.stringify(oldFlags.get(key)) !== JSON.stringify(value)) {
              hasChanges = true;
              break;
            }
          }
        }

        if (hasChanges) {
          this.log('Flags updated');
          this.emit('update', this.flags);
        }
      } catch (error) {
        this.log('Polling error:', error);
        this.emit('error', error);
      }
    }, this.options.pollingInterval);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
      this.log('Polling stopped');
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    if (typeof WebSocket === 'undefined') {
      this.log('WebSocket not available in this environment');
      return;
    }

    const wsUrl = `${this.options.streamUrl}/sdk/v1/client/${this.options.sdkKey}/stream`;
    this.log('Connecting to WebSocket:', wsUrl);

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        this.log('WebSocket connected');
        this.emit('connection', { connected: true });
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.log('WebSocket message received:', message);

          if (message.type === 'flag_update') {
            // Update the specific flag
            if (message.data && message.data.flagKey) {
              this.flags.set(message.data.flagKey, message.data);
              this.emit('update', this.flags);
            }
          }
        } catch (error) {
          this.log('WebSocket message parse error:', error);
        }
      };

      this.websocket.onerror = (error) => {
        this.log('WebSocket error:', error);
        this.emit('error', error);
      };

      this.websocket.onclose = () => {
        this.log('WebSocket disconnected');
        this.emit('connection', { connected: false });

        // Attempt to reconnect after a delay if still initialized
        if (this.initialized && this.options.enableStreaming) {
          setTimeout(() => {
            if (this.initialized) {
              this.connectWebSocket();
            }
          }, 5000);
        }
      };
    } catch (error) {
      this.log('WebSocket connection error:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get a boolean flag value
   */
  getBooleanFlag(key: string, defaultValue = false): boolean {
    this.ensureInitialized();

    const flag = this.flags.get(key);
    if (!flag) {
      this.log('Flag not found:', key, '- returning default:', defaultValue);
      return defaultValue;
    }

    if (typeof flag.value === 'boolean') {
      return flag.value;
    }

    this.log('Flag value is not boolean:', key, '- returning default:', defaultValue);
    return defaultValue;
  }

  /**
   * Get a string flag value
   */
  getStringFlag(key: string, defaultValue = ''): string {
    this.ensureInitialized();

    const flag = this.flags.get(key);
    if (!flag) {
      this.log('Flag not found:', key, '- returning default:', defaultValue);
      return defaultValue;
    }

    if (typeof flag.value === 'string') {
      return flag.value;
    }

    this.log('Flag value is not string:', key, '- returning default:', defaultValue);
    return defaultValue;
  }

  /**
   * Get a number flag value
   */
  getNumberFlag(key: string, defaultValue = 0): number {
    this.ensureInitialized();

    const flag = this.flags.get(key);
    if (!flag) {
      this.log('Flag not found:', key, '- returning default:', defaultValue);
      return defaultValue;
    }

    if (typeof flag.value === 'number') {
      return flag.value;
    }

    this.log('Flag value is not number:', key, '- returning default:', defaultValue);
    return defaultValue;
  }

  /**
   * Get a JSON flag value
   */
  getJSONFlag<T = unknown>(key: string, defaultValue: T): T {
    this.ensureInitialized();

    const flag = this.flags.get(key);
    if (!flag) {
      this.log('Flag not found:', key, '- returning default:', defaultValue);
      return defaultValue;
    }

    return (flag.value as T) ?? defaultValue;
  }

  /**
   * Get raw flag evaluation details
   */
  getFlag(key: string): FlagEvaluation | undefined {
    this.ensureInitialized();
    return this.flags.get(key);
  }

  /**
   * Get all flags
   */
  getAllFlags(): Record<string, FlagEvaluation> {
    this.ensureInitialized();
    return Object.fromEntries(this.flags);
  }

  /**
   * Update user context and optionally re-evaluate flags
   */
  async updateContext(context: EvaluationContext, reevaluate = true): Promise<void> {
    this.context = context;
    this.log('Context updated:', context);

    if (reevaluate && this.initialized) {
      await this.fetchFlags();
      this.emit('update', this.flags);
    }
  }

  /**
   * Get current context
   */
  getContext(): EvaluationContext | undefined {
    return this.context;
  }

  /**
   * Evaluate a specific flag with custom context
   */
  async evaluateFlag(flagKey: string, context?: EvaluationContext): Promise<FlagEvaluation | null> {
    const url = `${this.options.apiUrl}/sdk/v1/client/${this.options.sdkKey}/evaluate`;

    this.log('Evaluating flag:', flagKey, 'with context:', context || this.context);

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagKey,
          context: context || this.context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate flag: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ApiResponse<FlagEvaluation>;

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Failed to evaluate flag');
      }

      return data.data;
    } catch (error) {
      this.log('Flag evaluation error:', error);
      return null;
    }
  }

  /**
   * Add event listener
   */
  on(event: SdkEventType, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: SdkEventType, listener: EventListener): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: SdkEventType, data?: unknown): void {
    const sdkEvent: SdkEvent = {
      type: event,
      timestamp: new Date(),
      data,
    };

    this.eventListeners.get(event)?.forEach((listener) => {
      try {
        listener(sdkEvent);
      } catch (error) {
        this.log('Event listener error:', error);
      }
    });
  }

  /**
   * Clean up and close the SDK
   */
  close(): void {
    this.stopPolling();
    this.flags.clear();
    this.initialized = false;
    this.eventListeners.clear();

    // Close WebSocket if open
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.log('SDK closed');
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure SDK is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('FlagKit SDK is not initialized. Call initialize() before accessing flags.');
    }
  }

  /**
   * Debug logging
   */
  private log(...args: unknown[]): void {
    // Only log in development or if debug mode is explicitly enabled
    // You can add a debug flag to FlagKitOptions if needed
    if (process.env.NODE_ENV === 'development') {
      console.log('[FlagKit]', ...args);
    }
  }
}
