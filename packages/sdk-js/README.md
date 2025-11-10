# @flagkit/sdk-js

Official JavaScript/TypeScript SDK for FlagKit feature flags.

## Installation

```bash
npm install @flagkit/sdk-js
# or
yarn add @flagkit/sdk-js
# or
pnpm add @flagkit/sdk-js
```

## Quick Start

```typescript
import { FlagKitClient } from '@flagkit/sdk-js';

// Initialize the client
const client = new FlagKitClient({
  sdkKey: 'your-client-sdk-key',
  apiUrl: 'http://localhost:3001', // Optional, defaults to production URL
});

// Initialize and wait for flags to load
await client.initialize();

// Use flags
const showNewUI = client.getBooleanFlag('new-ui', false);
const theme = client.getStringFlag('theme', 'light');
const maxItems = client.getNumberFlag('max-items', 10);
```

## Configuration Options

```typescript
interface FlagKitOptions {
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
```

## Basic Usage

### Initialize the SDK

```typescript
const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
});

await client.initialize();
```

### Get Flag Values

```typescript
// Boolean flags
const isEnabled = client.getBooleanFlag('feature-enabled', false);

// String flags
const theme = client.getStringFlag('theme', 'light');

// Number flags
const maxRetries = client.getNumberFlag('max-retries', 3);

// JSON flags
const config = client.getJSONFlag<{ timeout: number }>('api-config', {
  timeout: 5000
});
```

### Get Flag Evaluation Details

```typescript
const flag = client.getFlag('my-flag');
if (flag) {
  console.log(flag.value);         // The flag value
  console.log(flag.variationKey);  // Which variation was selected
  console.log(flag.reason);        // Why this value was returned
}
```

## Advanced Features

### User Context

Provide user context for targeting:

```typescript
const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
});

await client.initialize();

// Update context
await client.updateContext({
  userId: 'user-123',
  userEmail: 'user@example.com',
  attributes: {
    tier: 'premium',
    beta: true
  }
});
```

### Real-time Updates with WebSocket

```typescript
const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
  enableStreaming: true,
});

client.on('update', (event) => {
  console.log('Flags updated:', event.data);
});

client.on('connection', (event) => {
  console.log('Connection status:', event.data);
});

await client.initialize();
```

### Polling for Updates

```typescript
const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
  pollingInterval: 60000, // Poll every 60 seconds
});

await client.initialize();
```

### Event Listeners

```typescript
// Listen for SDK ready
client.on('ready', () => {
  console.log('SDK is ready!');
});

// Listen for flag updates
client.on('update', (event) => {
  console.log('Flags updated');
});

// Listen for errors
client.on('error', (event) => {
  console.error('SDK error:', event.data);
});

// Listen for evaluations
client.on('evaluation', (event) => {
  console.log('Flag evaluated:', event.data);
});
```

### Refresh Flags

```typescript
// Manually refresh flags
await client.refresh();
```

### Cleanup

```typescript
// Close the client and cleanup resources
client.close();
```

## Node.js Usage

For Node.js environments, you need to provide a fetch implementation:

```typescript
import { FlagKitClient } from '@flagkit/sdk-js';
import fetch from 'node-fetch';

const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
  fetch: fetch as any,
});
```

Or use Node.js 18+ which has built-in fetch:

```typescript
const client = new FlagKitClient({
  sdkKey: 'your-sdk-key',
  fetch: globalThis.fetch,
});
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type { 
  FlagKitOptions, 
  FlagEvaluation, 
  EvaluationContext,
  SdkEvent 
} from '@flagkit/sdk-js';
```

## Error Handling

```typescript
try {
  await client.initialize();
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}

// Flag operations return default values on error
const value = client.getBooleanFlag('my-flag', false); // Returns false if flag doesn't exist
```

## Best Practices

1. **Initialize once**: Create a single client instance and reuse it
2. **Wait for ready**: Wait for initialization before using flags
3. **Use default values**: Always provide sensible default values
4. **Handle errors**: Listen for error events and handle them gracefully
5. **Clean up**: Call `client.close()` when done

## License

MIT
