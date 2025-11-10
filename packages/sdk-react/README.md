# @flagkit/sdk-react

Official React SDK for FlagKit feature flags with hooks.

## Installation

```bash
npm install @flagkit/sdk-react
# or
yarn add @flagkit/sdk-react
# or
pnpm add @flagkit/sdk-react
```

## Quick Start

```tsx
import { FlagKitProvider, useBooleanFlag } from '@flagkit/sdk-react';

// Wrap your app with the provider
function App() {
  return (
    <FlagKitProvider options={{ sdkKey: 'your-client-sdk-key' }}>
      <YourApp />
    </FlagKitProvider>
  );
}

// Use flags in your components
function YourApp() {
  const showNewUI = useBooleanFlag('new-ui', false);
  const theme = useStringFlag('theme', 'light');
  
  return (
    <div className={theme}>
      {showNewUI ? <NewUI /> : <OldUI />}
    </div>
  );
}
```

## Provider Setup

Wrap your application with `FlagKitProvider`:

```tsx
import { FlagKitProvider } from '@flagkit/sdk-react';

function App() {
  return (
    <FlagKitProvider 
      options={{
        sdkKey: 'your-client-sdk-key',
        apiUrl: 'http://localhost:3001',
        pollingInterval: 30000,
        enableStreaming: false,
      }}
    >
      <YourApp />
    </FlagKitProvider>
  );
}
```

## Available Hooks

### `useBooleanFlag`

Get a boolean flag value:

```tsx
function MyComponent() {
  const isEnabled = useBooleanFlag('feature-enabled', false);
  
  return isEnabled ? <NewFeature /> : null;
}
```

### `useStringFlag`

Get a string flag value:

```tsx
function MyComponent() {
  const theme = useStringFlag('theme', 'light');
  
  return <div className={theme}>...</div>;
}
```

### `useNumberFlag`

Get a number flag value:

```tsx
function MyComponent() {
  const maxItems = useNumberFlag('max-items', 10);
  
  return <ItemList limit={maxItems} />;
}
```

### `useJSONFlag`

Get a JSON flag value with type safety:

```tsx
interface Config {
  timeout: number;
  retries: number;
}

function MyComponent() {
  const config = useJSONFlag<Config>('api-config', {
    timeout: 5000,
    retries: 3,
  });
  
  return <div>Timeout: {config.timeout}ms</div>;
}
```

### `useFlagValue`

Generic hook to get any flag value:

```tsx
function MyComponent() {
  const value = useFlagValue('my-flag', 'default');
  
  return <div>{value}</div>;
}
```

### `useFlag`

Get full flag evaluation details:

```tsx
function MyComponent() {
  const flag = useFlag('my-flag');
  
  if (!flag) return null;
  
  return (
    <div>
      <div>Value: {flag.value}</div>
      <div>Variation: {flag.variationKey}</div>
      <div>Reason: {flag.reason}</div>
    </div>
  );
}
```

### `useFlags`

Get all flags:

```tsx
function DebugPanel() {
  const flags = useFlags();
  
  return (
    <div>
      {Object.entries(flags).map(([key, flag]) => (
        <div key={key}>
          {key}: {JSON.stringify(flag.value)}
        </div>
      ))}
    </div>
  );
}
```

### `useFlagKitReady`

Check if the SDK is ready:

```tsx
function MyComponent() {
  const isReady = useFlagKitReady();
  
  if (!isReady) {
    return <LoadingSpinner />;
  }
  
  return <App />;
}
```

### `useFlagKitError`

Get SDK initialization error:

```tsx
function MyComponent() {
  const error = useFlagKitError();
  
  if (error) {
    return <ErrorMessage error={error} />;
  }
  
  return <App />;
}
```

### `useFlagKitClient`

Access the underlying client instance:

```tsx
function MyComponent() {
  const client = useFlagKitClient();
  
  const handleRefresh = async () => {
    await client?.refresh();
  };
  
  return <button onClick={handleRefresh}>Refresh Flags</button>;
}
```

## Advanced Usage

### User Context

Update user context dynamically:

```tsx
function UserProvider({ children }) {
  const client = useFlagKitClient();
  
  useEffect(() => {
    const user = getCurrentUser();
    
    client?.updateContext({
      userId: user.id,
      userEmail: user.email,
      attributes: {
        tier: user.tier,
        beta: user.isBetaTester,
      }
    });
  }, [client]);
  
  return <>{children}</>;
}
```

### Real-time Updates

Flags automatically update when changes occur (via polling or WebSocket):

```tsx
function MyComponent() {
  // This hook automatically re-renders when the flag changes
  const showNewUI = useBooleanFlag('new-ui', false);
  
  return showNewUI ? <NewUI /> : <OldUI />;
}
```

### Loading States

```tsx
function MyComponent() {
  const isReady = useFlagKitReady();
  const error = useFlagKitError();
  const showNewUI = useBooleanFlag('new-ui', false);
  
  if (!isReady) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorMessage error={error} />;
  }
  
  return showNewUI ? <NewUI /> : <OldUI />;
}
```

### Feature Toggles

```tsx
function FeatureToggle({ flagKey, children, fallback = null }) {
  const isEnabled = useBooleanFlag(flagKey, false);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

// Usage
function App() {
  return (
    <FeatureToggle flagKey="new-dashboard">
      <NewDashboard />
    </FeatureToggle>
  );
}
```

### A/B Testing

```tsx
function MyComponent() {
  const variant = useStringFlag('homepage-variant', 'control');
  
  switch (variant) {
    case 'variant-a':
      return <VariantA />;
    case 'variant-b':
      return <VariantB />;
    default:
      return <Control />;
  }
}
```

## TypeScript Support

Full TypeScript support with type definitions:

```tsx
import type { 
  FlagKitOptions,
  FlagEvaluation,
  EvaluationContext,
} from '@flagkit/sdk-react';
```

## Best Practices

1. **Provider at root**: Place `FlagKitProvider` at the root of your app
2. **Single provider**: Use only one provider instance
3. **Default values**: Always provide sensible defaults to hooks
4. **Loading states**: Show loading UI while flags are initializing
5. **Error handling**: Display errors gracefully using `useFlagKitError`

## Examples

### Complete Example

```tsx
import { FlagKitProvider, useBooleanFlag, useFlagKitReady, useFlagKitError } from '@flagkit/sdk-react';

function App() {
  return (
    <FlagKitProvider options={{ sdkKey: process.env.REACT_APP_FLAGKIT_SDK_KEY! }}>
      <AppContent />
    </FlagKitProvider>
  );
}

function AppContent() {
  const isReady = useFlagKitReady();
  const error = useFlagKitError();
  
  if (!isReady) {
    return <div>Loading flags...</div>;
  }
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return <HomePage />;
}

function HomePage() {
  const showNewUI = useBooleanFlag('new-ui', false);
  const theme = useStringFlag('theme', 'light');
  
  return (
    <div className={theme}>
      <h1>Welcome!</h1>
      {showNewUI && <NewFeature />}
    </div>
  );
}
```

## License

MIT
