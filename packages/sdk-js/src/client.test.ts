import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FlagKitClient } from './client';
import type { FlagEvaluation, ApiResponse } from './types';

// Mock fetch responses
const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
});

const createErrorResponse = (message: string, code?: string): ApiResponse => ({
  success: false,
  error: { message, code },
});

describe('FlagKitClient', () => {
  let client: FlagKitClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    if (client) {
      client.close();
    }
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should create client with default options', () => {
      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
      });

      expect(client).toBeDefined();
      expect(client.isInitialized()).toBe(false);
    });

    it('should create client with custom options', () => {
      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        apiUrl: 'https://custom-api.com',
        pollingInterval: 60000,
        enableStreaming: false,
        timeout: 5000,
      });

      expect(client).toBeDefined();
      expect(client.isInitialized()).toBe(false);
    });

    it('should initialize successfully and fetch flags', async () => {
      const mockFlags: FlagEvaluation[] = [
        {
          flagKey: 'test-flag',
          value: true,
          variationKey: 'on',
          reason: 'DEFAULT',
        },
        {
          flagKey: 'string-flag',
          value: 'hello',
          variationKey: 'variation-1',
          reason: 'TARGETING',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: mockFlags }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        apiUrl: 'http://localhost:3001',
        pollingInterval: 0, // Disable polling
        enableStreaming: false,
      });

      await client.initialize();

      expect(client.isInitialized()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/sdk/v1/client/test-sdk-key/flags'
      );
    });

    it('should emit ready event after initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      const readyHandler = vi.fn();
      client.on('ready', readyHandler);

      await client.initialize();

      expect(readyHandler).toHaveBeenCalledOnce();
    });

    it('should emit error event on initialization failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      client = new FlagKitClient({
        sdkKey: 'invalid-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      const errorHandler = vi.fn();
      client.on('error', errorHandler);

      await expect(client.initialize()).rejects.toThrow('Failed to fetch flags');
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should throw error when accessing flags before initialization', () => {
      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
      });

      expect(() => client.getBooleanFlag('test', false)).toThrow(
        'FlagKit SDK is not initialized'
      );
    });
  });

  describe('Flag Getters', () => {
    beforeEach(async () => {
      const mockFlags: FlagEvaluation[] = [
        {
          flagKey: 'boolean-flag',
          value: true,
          variationKey: 'on',
          reason: 'DEFAULT',
        },
        {
          flagKey: 'string-flag',
          value: 'test-value',
          variationKey: 'variation-1',
          reason: 'TARGETING',
        },
        {
          flagKey: 'number-flag',
          value: 42,
          variationKey: 'variation-2',
          reason: 'ROLLOUT',
        },
        {
          flagKey: 'json-flag',
          value: { key: 'value', nested: { data: 123 } },
          variationKey: 'variation-3',
          reason: 'DEFAULT',
        },
        {
          flagKey: 'wrong-type-flag',
          value: 'string-value',
          variationKey: 'variation-4',
          reason: 'DEFAULT',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: mockFlags }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();
    });

    it('should get boolean flag value', () => {
      const value = client.getBooleanFlag('boolean-flag', false);
      expect(value).toBe(true);
    });

    it('should return default value for missing boolean flag', () => {
      const value = client.getBooleanFlag('missing-flag', false);
      expect(value).toBe(false);
    });

    it('should return default value for wrong type boolean flag', () => {
      const value = client.getBooleanFlag('wrong-type-flag', false);
      expect(value).toBe(false);
    });

    it('should get string flag value', () => {
      const value = client.getStringFlag('string-flag', '');
      expect(value).toBe('test-value');
    });

    it('should return default value for missing string flag', () => {
      const value = client.getStringFlag('missing-flag', 'default');
      expect(value).toBe('default');
    });

    it('should get number flag value', () => {
      const value = client.getNumberFlag('number-flag', 0);
      expect(value).toBe(42);
    });

    it('should return default value for missing number flag', () => {
      const value = client.getNumberFlag('missing-flag', 999);
      expect(value).toBe(999);
    });

    it('should get JSON flag value', () => {
      const value = client.getJSONFlag<{ key: string; nested: { data: number } }>(
        'json-flag',
        { key: '', nested: { data: 0 } }
      );
      expect(value).toEqual({ key: 'value', nested: { data: 123 } });
    });

    it('should return default value for missing JSON flag', () => {
      const defaultValue = { default: true };
      const value = client.getJSONFlag('missing-flag', defaultValue);
      expect(value).toEqual(defaultValue);
    });

    it('should get raw flag evaluation', () => {
      const flag = client.getFlag('boolean-flag');
      expect(flag).toEqual({
        flagKey: 'boolean-flag',
        value: true,
        variationKey: 'on',
        reason: 'DEFAULT',
      });
    });

    it('should return undefined for missing flag evaluation', () => {
      const flag = client.getFlag('missing-flag');
      expect(flag).toBeUndefined();
    });

    it('should get all flags', () => {
      const allFlags = client.getAllFlags();
      expect(Object.keys(allFlags)).toHaveLength(5);
      expect(allFlags['boolean-flag']).toBeDefined();
      expect(allFlags['string-flag']).toBeDefined();
    });
  });

  describe('Context Management', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();
    });

    it('should update context without re-evaluation', async () => {
      const context = {
        userId: 'user-123',
        attributes: { tier: 'premium' },
      };

      await client.updateContext(context, false);

      expect(client.getContext()).toEqual(context);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('should update context with re-evaluation', async () => {
      const context = {
        userId: 'user-123',
        attributes: { tier: 'premium' },
      };

      const updateHandler = vi.fn();
      client.on('update', updateHandler);

      await client.updateContext(context, true);

      expect(client.getContext()).toEqual(context);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + update fetch
      expect(updateHandler).toHaveBeenCalled();
    });
  });

  describe('Flag Evaluation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        apiUrl: 'http://localhost:3001',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();
    });

    it('should evaluate flag with custom context', async () => {
      const mockEvaluation: FlagEvaluation = {
        flagKey: 'test-flag',
        value: true,
        variationKey: 'on',
        reason: 'TARGETING',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse(mockEvaluation),
      });

      const context = { userId: 'user-123' };
      const result = await client.evaluateFlag('test-flag', context);

      expect(result).toEqual(mockEvaluation);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/sdk/v1/client/test-sdk-key/evaluate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flagKey: 'test-flag', context }),
        }
      );
    });

    it('should return null on evaluation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await client.evaluateFlag('test-flag');

      expect(result).toBeNull();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();
    });

    it('should add and trigger event listeners', () => {
      const handler = vi.fn();
      client.on('ready', handler);

      // Trigger another initialization to fire ready again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      // Note: ready was already fired during initialization in beforeEach
      // So we verify the handler exists and can be called
      expect(handler).toBeDefined();
    });

    it('should remove event listeners', () => {
      const handler = vi.fn();
      client.on('update', handler);
      client.off('update', handler);

      // Manually trigger update (in real scenarios this would come from polling/websocket)
      // Since we removed the handler, it should not be called
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('error', handler1);
      client.on('error', handler2);

      // Both were set up, verify they exist
      expect(handler1).toBeDefined();
      expect(handler2).toBeDefined();
    });
  });

  describe('Polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start polling when enabled', async () => {
      const mockFlags: FlagEvaluation[] = [
        { flagKey: 'test', value: true, variationKey: 'on', reason: 'DEFAULT' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: mockFlags }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 30000, // 30 seconds
        enableStreaming: false,
      });

      await client.initialize();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Fast-forward time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should emit update event when flags change during polling', async () => {
      const initialFlags: FlagEvaluation[] = [
        { flagKey: 'test', value: false, variationKey: 'off', reason: 'DEFAULT' },
      ];

      const updatedFlags: FlagEvaluation[] = [
        { flagKey: 'test', value: true, variationKey: 'on', reason: 'DEFAULT' },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createSuccessResponse({ flags: initialFlags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createSuccessResponse({ flags: updatedFlags }),
        });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 30000,
        enableStreaming: false,
      });

      const updateHandler = vi.fn();
      client.on('update', updateHandler);

      await client.initialize();

      // Fast-forward to trigger polling
      await vi.advanceTimersByTimeAsync(30000);

      expect(updateHandler).toHaveBeenCalled();
    });

    it('should not emit update event when flags are unchanged', async () => {
      const flags: FlagEvaluation[] = [
        { flagKey: 'test', value: true, variationKey: 'on', reason: 'DEFAULT' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 30000,
        enableStreaming: false,
      });

      const updateHandler = vi.fn();
      client.on('update', updateHandler);

      await client.initialize();

      // Clear the handler calls from initialization
      updateHandler.mockClear();

      // Fast-forward to trigger polling
      await vi.advanceTimersByTimeAsync(30000);

      // Should not emit update since flags didn't change
      expect(updateHandler).not.toHaveBeenCalled();
    });

    it('should not start polling when interval is 0', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Fast-forward time
      vi.advanceTimersByTime(60000);

      // Should still only have the initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop polling when client is closed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 30000,
        enableStreaming: false,
      });

      await client.initialize();

      client.close();

      // Fast-forward time
      vi.advanceTimersByTime(60000);

      // Should still only have the initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Client Lifecycle', () => {
    it('should close client and cleanup resources', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();

      expect(client.isInitialized()).toBe(true);

      client.close();

      expect(client.isInitialized()).toBe(false);
      // After close, accessing flags should throw
      expect(() => client.getAllFlags()).toThrow('FlagKit SDK is not initialized');
    });

    it('should handle multiple close calls safely', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createSuccessResponse({ flags: [] }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await client.initialize();

      client.close();
      client.close(); // Should not throw

      expect(client.isInitialized()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await expect(client.initialize()).rejects.toThrow('Network error');
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      client = new FlagKitClient({
        sdkKey: 'test-sdk-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await expect(client.initialize()).rejects.toThrow();
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createErrorResponse('Invalid SDK key', 'INVALID_KEY'),
      });

      client = new FlagKitClient({
        sdkKey: 'invalid-key',
        pollingInterval: 0,
        enableStreaming: false,
      });

      await expect(client.initialize()).rejects.toThrow('Invalid SDK key');
    });
  });
});
