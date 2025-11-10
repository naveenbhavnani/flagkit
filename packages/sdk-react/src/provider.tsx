import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { FlagKitClient, FlagKitConfig, EvaluationContext, FlagEvaluation } from '@flagkit/sdk-js';

export interface FlagKitContextValue {
  client: FlagKitClient | null;
  flags: Record<string, FlagEvaluation>;
  initialized: boolean;
  error: Error | null;
  updateContext: (context: EvaluationContext) => Promise<void>;
}

const FlagKitContext = createContext<FlagKitContextValue | undefined>(undefined);

export interface FlagKitProviderProps {
  config: FlagKitConfig;
  children: React.ReactNode;
}

/**
 * FlagKit Provider Component
 *
 * Wrap your app with this provider to enable feature flags
 *
 * @example
 * ```tsx
 * <FlagKitProvider config={{ sdkKey: 'your-key' }}>
 *   <App />
 * </FlagKitProvider>
 * ```
 */
export function FlagKitProvider({ config, children }: FlagKitProviderProps) {
  const [client, setClient] = useState<FlagKitClient | null>(null);
  const [flags, setFlags] = useState<Record<string, FlagEvaluation>>({});
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the SDK client
  useEffect(() => {
    const flagKitClient = new FlagKitClient(config);

    // Set up event listeners
    flagKitClient.on('ready', () => {
      setInitialized(true);
      setFlags(flagKitClient.getAllFlags());
    });

    flagKitClient.on('update', (updatedFlags) => {
      setFlags(updatedFlags as Record<string, FlagEvaluation>);
    });

    flagKitClient.on('error', (err) => {
      setError(err as Error);
    });

    // Initialize the client
    flagKitClient.initialize().catch((err) => {
      setError(err as Error);
    });

    setClient(flagKitClient);

    // Cleanup on unmount
    return () => {
      flagKitClient.close();
    };
  }, [config.sdkKey, config.apiUrl]); // Re-initialize if key or URL changes

  // Update context function
  const updateContext = useCallback(
    async (context: EvaluationContext) => {
      if (client) {
        await client.updateContext(context, true);
        setFlags(client.getAllFlags());
      }
    },
    [client]
  );

  const value: FlagKitContextValue = {
    client,
    flags,
    initialized,
    error,
    updateContext,
  };

  return <FlagKitContext.Provider value={value}>{children}</FlagKitContext.Provider>;
}

/**
 * Hook to access the FlagKit context
 *
 * @throws {Error} If used outside of FlagKitProvider
 */
export function useFlagKitContext(): FlagKitContextValue {
  const context = useContext(FlagKitContext);
  if (!context) {
    throw new Error('useFlagKitContext must be used within a FlagKitProvider');
  }
  return context;
}
