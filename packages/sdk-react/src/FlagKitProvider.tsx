import React, { createContext, useContext, useEffect, useState } from 'react';
import { FlagKitClient, type FlagKitOptions, type SdkEvent } from '@flagkit/sdk-js';

interface FlagKitContextValue {
  client: FlagKitClient | null;
  isReady: boolean;
  error: Error | null;
}

const FlagKitContext = createContext<FlagKitContextValue | null>(null);

export interface FlagKitProviderProps {
  options: FlagKitOptions;
  children: React.ReactNode;
}

/**
 * Provider component that initializes the FlagKit SDK and makes it available to child components
 */
export function FlagKitProvider({ options, children }: FlagKitProviderProps) {
  const [client] = useState(() => new FlagKitClient(options));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize the SDK
    client.initialize().catch((err) => {
      setError(err instanceof Error ? err : new Error('Failed to initialize FlagKit'));
    });

    // Listen for ready event
    const handleReady = () => {
      setIsReady(true);
    };

    // Listen for error events
    const handleError = (event: SdkEvent) => {
      setError(event.data instanceof Error ? event.data : new Error('SDK error occurred'));
    };

    client.on('ready', handleReady);
    client.on('error', handleError);

    // Cleanup
    return () => {
      client.off('ready', handleReady);
      client.off('error', handleError);
      client.close();
    };
  }, [client]);

  return (
    <FlagKitContext.Provider value={{ client, isReady, error }}>
      {children}
    </FlagKitContext.Provider>
  );
}

/**
 * Hook to access the FlagKit context
 */
export function useFlagKitContext(): FlagKitContextValue {
  const context = useContext(FlagKitContext);
  if (!context) {
    throw new Error('useFlagKitContext must be used within a FlagKitProvider');
  }
  return context;
}
