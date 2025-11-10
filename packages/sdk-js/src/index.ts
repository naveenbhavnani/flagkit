/**
 * FlagKit JavaScript SDK
 *
 * @example
 * ```typescript
 * import { FlagKitClient } from '@flagkit/sdk-js';
 *
 * const client = new FlagKitClient({
 *   sdkKey: 'your-client-sdk-key',
 *   apiUrl: 'https://api.flagkit.io',
 *   context: {
 *     userId: 'user-123',
 *     attributes: {
 *       tier: 'premium',
 *       beta: true
 *     }
 *   }
 * });
 *
 * await client.initialize();
 *
 * // Use flags
 * const showNewUI = client.getBooleanFlag('new-ui', false);
 * const theme = client.getStringFlag('theme', 'light');
 * ```
 */

export { FlagKitClient } from './client';
export type {
  FlagKitOptions,
  EvaluationContext,
  FlagEvaluation,
  FlagValue,
  Flag,
  FlagVariation,
  ApiResponse,
  SdkEventType,
  SdkEvent,
  EventListener,
  CacheEntry,
} from './types';
