import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FlagKitProvider, useFlagKitContext } from './FlagKitProvider';
import type { FlagEvaluation, ApiResponse } from '@flagkit/sdk-js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createSuccessResponse = <T,>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

// Test component that uses the context
function TestConsumer() {
  const { client, isReady, error } = useFlagKitContext();

  return (
    <div>
      <div data-testid="ready">{isReady ? 'ready' : 'not-ready'}</div>
      <div data-testid="error">{error ? error.message : 'no-error'}</div>
      <div data-testid="client">{client ? 'has-client' : 'no-client'}</div>
    </div>
  );
}

describe('FlagKitProvider', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should provide client context to children', async () => {
    const mockFlags: FlagEvaluation[] = [
      { flagKey: 'test-flag', value: true, variationKey: 'on', reason: 'DEFAULT' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createSuccessResponse({ flags: mockFlags }),
    });

    render(
      <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
        <TestConsumer />
      </FlagKitProvider>
    );

    // Initially not ready
    expect(screen.getByTestId('ready')).toHaveTextContent('not-ready');
    expect(screen.getByTestId('client')).toHaveTextContent('has-client');

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('ready')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should handle initialization errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    render(
      <FlagKitProvider options={{ sdkKey: 'invalid-key', pollingInterval: 0, enableStreaming: false }}>
        <TestConsumer />
      </FlagKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });

    expect(screen.getByTestId('ready')).toHaveTextContent('not-ready');
  });

  it('should throw error when useFlagKitContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useFlagKitContext must be used within a FlagKitProvider');

    consoleSpy.mockRestore();
  });

  it('should cleanup on unmount', async () => {
    const mockFlags: FlagEvaluation[] = [
      { flagKey: 'test-flag', value: true, variationKey: 'on', reason: 'DEFAULT' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createSuccessResponse({ flags: mockFlags }),
    });

    const { unmount } = render(
      <FlagKitProvider options={{ sdkKey: 'test-sdk-key', pollingInterval: 0, enableStreaming: false }}>
        <TestConsumer />
      </FlagKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ready')).toHaveTextContent('ready');
    });

    // Unmount should call client.close()
    unmount();

    // No assertions needed - just ensuring no errors on cleanup
  });
});
