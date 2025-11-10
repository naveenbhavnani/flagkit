/**
 * FlagKit React SDK
 *
 * @example
 * ```tsx
 * import { FlagKitProvider, useBooleanFlag } from '@flagkit/sdk-react';
 *
 * function App() {
 *   return (
 *     <FlagKitProvider options={{ sdkKey: 'your-client-sdk-key' }}>
 *       <YourApp />
 *     </FlagKitProvider>
 *   );
 * }
 *
 * function YourApp() {
 *   const showNewUI = useBooleanFlag('new-ui', false);
 *  
 *   return <div>{showNewUI ? <NewUI /> : <OldUI />}</div>;
 * }
 * ```
 */

export { FlagKitProvider, useFlagKitContext } from './FlagKitProvider';
export type { FlagKitProviderProps } from './FlagKitProvider';

export {
  useBooleanFlag,
  useStringFlag,
  useNumberFlag,
  useJSONFlag,
  useFlagValue,
  useFlag,
  useFlags,
  useFlagKitReady,
  useFlagKitError,
  useFlagKitClient,
} from './hooks';

// Re-export types from the core SDK for convenience
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
} from '@flagkit/sdk-js';
