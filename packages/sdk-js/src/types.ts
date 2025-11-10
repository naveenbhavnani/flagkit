/**
 * SDK Configuration options
 */
export interface FlagKitOptions {
  /** SDK key (client or server key from environment) */
  sdkKey: string;
  
  /** API base URL (default: https://api.flagkit.io) */
  apiUrl?: string;
  
  /** Polling interval in milliseconds (default: 30000ms = 30s, set to 0 to disable) */
  pollingInterval?: number;
  
  /** Enable WebSocket for real-time updates (default: false) */
  enableStreaming?: boolean;
  
  /** WebSocket URL (default: wss://api.flagkit.io) */
  streamUrl?: string;
  
  /** Request timeout in milliseconds (default: 10000ms = 10s) */
  timeout?: number;
  
  /** Enable local caching (default: true) */
  enableCache?: boolean;
  
  /** Custom fetch implementation (for Node.js environments) */
  fetch?: typeof fetch;
  
  /** SDK version to send in headers */
  sdkVersion?: string;
}

/**
 * Evaluation context for targeting
 */
export interface EvaluationContext {
  /** User ID for targeting */
  userId?: string;
  
  /** User email */
  userEmail?: string;
  
  /** User attributes for targeting rules */
  attributes?: Record<string, string | number | boolean>;
  
  /** Custom properties */
  [key: string]: unknown;
}

/**
 * Flag value types
 */
export type FlagValue = boolean | string | number | object;

/**
 * Flag evaluation result
 */
export interface FlagEvaluation<T = FlagValue> {
  /** Flag key */
  flagKey: string;
  
  /** Evaluated value */
  value: T;
  
  /** Variation key that was selected */
  variationKey: string;
  
  /** Reason for the evaluation */
  reason: 'DEFAULT' | 'TARGETING' | 'ROLLOUT' | 'DISABLED' | 'NO_CONFIG' | 'ERROR' | 'CACHED';
  
  /** Error message if evaluation failed */
  error?: string;
}

/**
 * Flag definition from API
 */
export interface Flag {
  /** Flag ID */
  id: string;
  
  /** Flag key */
  key: string;
  
  /** Flag name */
  name: string;
  
  /** Flag description */
  description?: string;
  
  /** Flag type */
  type: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  
  /** Flag status */
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  
  /** Available variations */
  variations: FlagVariation[];
  
  /** Tags */
  tags: string[];
}

/**
 * Flag variation definition
 */
export interface FlagVariation {
  /** Variation ID */
  id: string;
  
  /** Variation key */
  key: string;
  
  /** Variation name */
  name: string;
  
  /** Variation value */
  value: FlagValue;
  
  /** Variation description */
  description?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Success status */
  success: boolean;
  
  /** Response data */
  data?: T;
  
  /** Error information */
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * SDK Event types
 */
export type SdkEventType = 
  | 'ready'           // SDK initialized and flags loaded
  | 'update'          // Flags updated (from polling or streaming)
  | 'error'           // Error occurred
  | 'connection'      // WebSocket connection state changed
  | 'evaluation';     // Flag evaluated

/**
 * SDK Event data
 */
export interface SdkEvent {
  type: SdkEventType;
  timestamp: Date;
  data?: unknown;
}

/**
 * Event listener callback
 */
export type EventListener = (event: SdkEvent) => void;

/**
 * Cache entry
 */
export interface CacheEntry<T = FlagValue> {
  value: T;
  timestamp: number;
  ttl?: number;
}
