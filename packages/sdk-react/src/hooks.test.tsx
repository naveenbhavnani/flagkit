import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FlagKitProvider } from './FlagKitProvider';
import {
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
import type { FlagEvaluation, ApiResponse } from '@flagkit/sdk-js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createSuccessResponse = <T,>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

const mockFlags: FlagEvaluation[] = [
  { flagKey: 'boolean-flag', value: true, variationKey: 'on', reason: 'DEFAULT' },
  { flagKey: 'string-flag', value: 'test-value', variationKey: 'variation-1', reason: 'TARGETING' },
  { flagKey: 'number-flag', value: 42, variationKey: 'variation-2', reason: 'ROLLOUT' },
  { flagKey: 'json-flag', value: { key: 'value', count: 123 }, variationKey: 'variation-3', reason: 'DEFAULT' },
];

describe('React Hooks', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createSuccessResponse({ flags: mockFlags }),
    });
  });

  describe('useBooleanFlag', () => {
    function BooleanFlagConsumer() {
      const value = useBooleanFlag('boolean-flag', false);
      return <div data-testid="value">{value ? 'true' : 'false'}</div>;
    }

    it('should return boolean flag value', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <BooleanFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('true');
      });
    });

    it('should return default value for missing flag', async () => {
      function MissingFlagConsumer() {
        const value = useBooleanFlag('missing-flag', false);
        return <div data-testid="value">{value ? 'true' : 'false'}</div>;
      }

      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <MissingFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('false');
      });
    });
  });

  describe('useStringFlag', () => {
    function StringFlagConsumer() {
      const value = useStringFlag('string-flag', 'default');
      return <div data-testid="value">{value}</div>;
    }

    it('should return string flag value', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <StringFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });
    });

    it('should return default value for missing flag', async () => {
      function MissingFlagConsumer() {
        const value = useStringFlag('missing-flag', 'default-value');
        return <div data-testid="value">{value}</div>;
      }

      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <MissingFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('default-value');
      });
    });
  });

  describe('useNumberFlag', () => {
    function NumberFlagConsumer() {
      const value = useNumberFlag('number-flag', 0);
      return <div data-testid="value">{value}</div>;
    }

    it('should return number flag value', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <NumberFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('42');
      });
    });

    it('should return default value for missing flag', async () => {
      function MissingFlagConsumer() {
        const value = useNumberFlag('missing-flag', 999);
        return <div data-testid="value">{value}</div>;
      }

      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <MissingFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('999');
      });
    });
  });

  describe('useJSONFlag', () => {
    function JSONFlagConsumer() {
      const value = useJSONFlag<{ key: string; count: number }>('json-flag', { key: '', count: 0 });
      return (
        <div>
          <div data-testid="key">{value.key}</div>
          <div data-testid="count">{value.count}</div>
        </div>
      );
    }

    it('should return JSON flag value', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <JSONFlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('key')).toHaveTextContent('value');
        expect(screen.getByTestId('count')).toHaveTextContent('123');
      });
    });
  });

  describe('useFlagValue', () => {
    function FlagValueConsumer() {
      const value = useFlagValue('string-flag', 'default');
      return <div data-testid="value">{value}</div>;
    }

    it('should return flag value', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <FlagValueConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });
    });
  });

  describe('useFlag', () => {
    function FlagConsumer() {
      const flag = useFlag('boolean-flag');
      return (
        <div>
          <div data-testid="exists">{flag ? 'yes' : 'no'}</div>
          {flag && (
            <>
              <div data-testid="key">{flag.flagKey}</div>
              <div data-testid="reason">{flag.reason}</div>
            </>
          )}
        </div>
      );
    }

    it('should return flag evaluation details', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <FlagConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('exists')).toHaveTextContent('yes');
        expect(screen.getByTestId('key')).toHaveTextContent('boolean-flag');
        expect(screen.getByTestId('reason')).toHaveTextContent('DEFAULT');
      });
    });
  });

  describe('useFlags', () => {
    function FlagsConsumer() {
      const flags = useFlags();
      const flagKeys = Object.keys(flags);
      return (
        <div>
          <div data-testid="count">{flagKeys.length}</div>
          <div data-testid="keys">{flagKeys.join(',')}</div>
        </div>
      );
    }

    it('should return all flags', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <FlagsConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('4');
      });

      const keys = screen.getByTestId('keys').textContent;
      expect(keys).toContain('boolean-flag');
      expect(keys).toContain('string-flag');
      expect(keys).toContain('number-flag');
      expect(keys).toContain('json-flag');
    });
  });

  describe('useFlagKitReady', () => {
    function ReadyConsumer() {
      const isReady = useFlagKitReady();
      return <div data-testid="ready">{isReady ? 'ready' : 'not-ready'}</div>;
    }

    it('should return ready state', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <ReadyConsumer />
        </FlagKitProvider>
      );

      // Initially not ready
      expect(screen.getByTestId('ready')).toHaveTextContent('not-ready');

      // Wait for ready
      await waitFor(() => {
        expect(screen.getByTestId('ready')).toHaveTextContent('ready');
      });
    });
  });

  describe('useFlagKitError', () => {
    it('should return null when no error', async () => {
      function ErrorConsumer() {
        const error = useFlagKitError();
        return <div data-testid="error">{error ? error.message : 'no-error'}</div>;
      }

      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <ErrorConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });

    it('should return error when initialization fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      function ErrorConsumer() {
        const error = useFlagKitError();
        return <div data-testid="error">{error ? error.message : 'no-error'}</div>;
      }

      render(
        <FlagKitProvider options={{ sdkKey: 'invalid-key', pollingInterval: 0, enableStreaming: false }}>
          <ErrorConsumer />
        </FlagKitProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });
  });

  describe('useFlagKitClient', () => {
    function ClientConsumer() {
      const client = useFlagKitClient();
      return <div data-testid="client">{client ? 'has-client' : 'no-client'}</div>;
    }

    it('should return client instance', async () => {
      render(
        <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
          <ClientConsumer />
        </FlagKitProvider>
      );

      expect(screen.getByTestId('client')).toHaveTextContent('has-client');
    });
  });
});
