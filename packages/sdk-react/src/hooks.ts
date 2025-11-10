import { useState, useEffect } from 'react';
import type { FlagEvaluation, FlagValue } from '@flagkit/sdk-js';
import { useFlagKitContext } from './FlagKitProvider';

/**
 * Hook to get a boolean flag value
 */
export function useBooleanFlag(flagKey: string, defaultValue: boolean): boolean {
  const { client, isReady } = useFlagKitContext();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!isReady || !client) {
      setValue(defaultValue);
      return;
    }

    // Get initial value
    setValue(client.getBooleanFlag(flagKey, defaultValue));

    // Listen for updates
    const handleUpdate = () => {
      setValue(client.getBooleanFlag(flagKey, defaultValue));
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey, defaultValue]);

  return value;
}

/**
 * Hook to get a string flag value
 */
export function useStringFlag(flagKey: string, defaultValue: string): string {
  const { client, isReady } = useFlagKitContext();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!isReady || !client) {
      setValue(defaultValue);
      return;
    }

    setValue(client.getStringFlag(flagKey, defaultValue));

    const handleUpdate = () => {
      setValue(client.getStringFlag(flagKey, defaultValue));
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey, defaultValue]);

  return value;
}

/**
 * Hook to get a number flag value
 */
export function useNumberFlag(flagKey: string, defaultValue: number): number {
  const { client, isReady } = useFlagKitContext();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!isReady || !client) {
      setValue(defaultValue);
      return;
    }

    setValue(client.getNumberFlag(flagKey, defaultValue));

    const handleUpdate = () => {
      setValue(client.getNumberFlag(flagKey, defaultValue));
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey, defaultValue]);

  return value;
}

/**
 * Hook to get a JSON flag value
 */
export function useJSONFlag<T = unknown>(flagKey: string, defaultValue: T): T {
  const { client, isReady } = useFlagKitContext();
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (!isReady || !client) {
      setValue(defaultValue);
      return;
    }

    setValue(client.getJSONFlag<T>(flagKey, defaultValue));

    const handleUpdate = () => {
      setValue(client.getJSONFlag<T>(flagKey, defaultValue));
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey, defaultValue]);

  return value;
}

/**
 * Generic hook to get any flag value
 */
export function useFlagValue<T extends FlagValue>(
  flagKey: string,
  defaultValue: T
): T {
  const { client, isReady } = useFlagKitContext();
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (!isReady || !client) {
      setValue(defaultValue);
      return;
    }

    const flag = client.getFlag(flagKey);
    setValue((flag?.value as T) ?? defaultValue);

    const handleUpdate = () => {
      const flag = client.getFlag(flagKey);
      setValue((flag?.value as T) ?? defaultValue);
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey, defaultValue]);

  return value;
}

/**
 * Hook to get full flag evaluation details
 */
export function useFlag(flagKey: string): FlagEvaluation | undefined {
  const { client, isReady } = useFlagKitContext();
  const [flag, setFlag] = useState<FlagEvaluation | undefined>(undefined);

  useEffect(() => {
    if (!isReady || !client) {
      setFlag(undefined);
      return;
    }

    setFlag(client.getFlag(flagKey));

    const handleUpdate = () => {
      setFlag(client.getFlag(flagKey));
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady, flagKey]);

  return flag;
}

/**
 * Hook to get all flags
 */
export function useFlags(): Record<string, FlagEvaluation> {
  const { client, isReady } = useFlagKitContext();
  const [flags, setFlags] = useState<Record<string, FlagEvaluation>>({});

  useEffect(() => {
    if (!isReady || !client) {
      setFlags({});
      return;
    }

    setFlags(client.getAllFlags());

    const handleUpdate = () => {
      setFlags(client.getAllFlags());
    };

    client.on('update', handleUpdate);
    return () => client.off('update', handleUpdate);
  }, [client, isReady]);

  return flags;
}

/**
 * Hook to check if SDK is ready
 */
export function useFlagKitReady(): boolean {
  const { isReady } = useFlagKitContext();
  return isReady;
}

/**
 * Hook to get SDK error
 */
export function useFlagKitError(): Error | null {
  const { error } = useFlagKitContext();
  return error;
}

/**
 * Hook to get the FlagKit client instance
 */
export function useFlagKitClient() {
  const { client } = useFlagKitContext();
  return client;
}
