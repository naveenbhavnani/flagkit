# FlagKit End-to-End Demo

This guide walks you through a complete FlagKit workflow, from setup to using feature flags in a real application.

## Demo Overview

In this demo, you'll:
1. Set up FlagKit locally
2. Create an organization and project
3. Create feature flags with targeting rules
4. Integrate flags into a React application
5. Test different user contexts and targeting scenarios

**Time to complete:** 20-30 minutes

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm 8+
- A code editor

## Part 1: Initial Setup (5 minutes)

### 1.1 Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd flagkit

# Install dependencies
pnpm install
```

### 1.2 Configure Environment

```bash
# Set up API environment
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flagkit_demo"
JWT_SECRET="demo-secret-key-for-testing-only-min-32-chars"
PORT=3001
```

```bash
# Set up Web environment
cd ../web
cp .env.example .env.local
```

Edit `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 1.3 Initialize Database

```bash
cd ../api

# Run migrations
pnpm prisma migrate dev

# Seed with demo data
pnpm prisma db seed
```

The seed creates:
- User: `admin@example.com` / `admin123`
- Organization: "Acme Corp"
- Project: "Web Application"
- Environments: Development, Staging, Production

### 1.4 Start Servers

```bash
# Terminal 1 - API Server
cd apps/api
pnpm dev

# Terminal 2 - Web Dashboard
cd apps/web
pnpm dev
```

Servers running at:
- Dashboard: http://localhost:3000
- API: http://localhost:3001

## Part 2: Dashboard Setup (5 minutes)

### 2.1 Login

1. Open http://localhost:3000
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`

### 2.2 Explore Organization

You should see "Acme Corp" organization with the "Web Application" project.

### 2.3 Create Your First Flag

1. Click on "Web Application" project
2. Click "Create Flag" button
3. Fill in the form:
   - **Flag Key**: `new-checkout-ui`
   - **Name**: "New Checkout UI"
   - **Description**: "Rollout new checkout user interface"
   - **Type**: Boolean

4. Add variations:
   - Variation 1: `true` (value: `true`)
   - Variation 2: `false` (value: `false`)

5. Click "Create Flag"

### 2.4 Configure Development Environment

1. Click on the flag you just created
2. Find the "Development" environment section
3. Click "Configure"
4. Set:
   - **Enabled**: ✅ (checked)
   - **Default Variation**: `true`
5. Click "Save"

### 2.5 Get SDK Key

1. Go to the project settings (or check the seed output)
2. Copy the Development environment SDK key

For seeded data, the Development SDK key is in the format:
```
sdk_dev_<random-string>
```

You can find it by running:
```bash
cd apps/api
pnpm prisma studio
# Navigate to Environment table, find Development environment, copy sdkKey
```

## Part 3: Create Advanced Targeting (5 minutes)

### 3.1 Create Feature Flag with Targeting

Create another flag with more advanced targeting:

1. Click "Create Flag"
2. Fill in:
   - **Flag Key**: `premium-features`
   - **Name**: "Premium Features"
   - **Description**: "Features for premium tier users"
   - **Type**: Boolean
3. Create flag with same variations (`true`/`false`)

### 3.2 Configure Targeting Rules

1. Click on "premium-features" flag
2. Go to Development environment
3. Enable the flag
4. In the targeting rules section (JSON for now), add:

```json
{
  "enabled": true,
  "defaultVariationKey": "false",
  "targetingRules": [
    {
      "id": "rule-1",
      "description": "Premium tier users",
      "conditions": [
        {
          "attribute": "tier",
          "operator": "equals",
          "value": "premium"
        }
      ],
      "conditionLogic": "AND",
      "variationKey": "true"
    }
  ]
}
```

This rule:
- Targets users with attribute `tier: "premium"`
- Shows `true` for premium users
- Shows `false` (default) for everyone else

### 3.3 Create Percentage Rollout Flag

Create one more flag for gradual rollout:

1. Click "Create Flag"
2. Fill in:
   - **Flag Key**: `new-dashboard`
   - **Name**: "New Dashboard"
   - **Type**: Boolean
3. Create flag

4. Configure Development environment:

```json
{
  "enabled": true,
  "defaultVariationKey": "true",
  "rolloutPercentage": 50,
  "targetingRules": []
}
```

This shows the new dashboard to 50% of users (stable bucketing based on userId).

## Part 4: Build Demo React App (10 minutes)

### 4.1 Create Demo App

```bash
# In a new directory outside flagkit
npx create-next-app@latest flagkit-demo --typescript --tailwind --app
cd flagkit-demo
```

### 4.2 Install FlagKit SDK

Since the SDKs are not published yet, we'll build and link them:

```bash
# Build the SDKs
cd /path/to/flagkit/packages/sdk-js
pnpm build

cd /path/to/flagkit/packages/sdk-react
pnpm build

# Link them
cd /path/to/flagkit-demo
pnpm add /path/to/flagkit/packages/sdk-react
```

Or install directly if published:
```bash
pnpm add @flagkit/sdk-react
```

### 4.3 Set Up Provider

Edit `app/layout.tsx`:

```tsx
'use client';

import { FlagKitProvider } from '@flagkit/sdk-react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FlagKitProvider
          config={{
            sdkKey: 'sdk_dev_YOUR_SDK_KEY_HERE', // Replace with your SDK key
            apiUrl: 'http://localhost:3001',
            context: {
              userId: 'user-123',
              attributes: {
                tier: 'free', // Change to 'premium' to test targeting
                region: 'us-west',
              },
            },
          }}
        >
          {children}
        </FlagKitProvider>
      </body>
    </html>
  );
}
```

### 4.4 Create Demo Components

Edit `app/page.tsx`:

```tsx
'use client';

import {
  useBooleanFlag,
  useFlagKit,
  useFlagDetails,
} from '@flagkit/sdk-react';
import { useState } from 'react';

export default function Home() {
  const { initialized, error, updateContext, getAllFlags } = useFlagKit();
  const [userTier, setUserTier] = useState('free');

  // Feature flags
  const newCheckout = useBooleanFlag('new-checkout-ui', false);
  const premiumFeatures = useBooleanFlag('premium-features', false);
  const newDashboard = useBooleanFlag('new-dashboard', false);

  // Get detailed info
  const checkoutDetails = useFlagDetails('new-checkout-ui');
  const premiumDetails = useFlagDetails('premium-features');

  const handleTierChange = async (tier: string) => {
    setUserTier(tier);
    await updateContext({
      userId: 'user-123',
      attributes: {
        tier,
        region: 'us-west',
      },
    });
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading FlagKit...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">FlagKit Demo</h1>

        {/* User Context Control */}
        <div className="mb-8 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">User Context</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">User Tier:</label>
              <div className="space-x-4">
                <button
                  onClick={() => handleTierChange('free')}
                  className={`px-4 py-2 rounded ${
                    userTier === 'free'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => handleTierChange('premium')}
                  className={`px-4 py-2 rounded ${
                    userTier === 'premium'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300'
                  }`}
                >
                  Premium
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Current: userId='user-123', tier='{userTier}'
            </div>
          </div>
        </div>

        {/* Feature Flags Display */}
        <div className="space-y-6">
          <FlagCard
            title="New Checkout UI"
            enabled={newCheckout}
            details={checkoutDetails}
          />

          <FlagCard
            title="Premium Features"
            enabled={premiumFeatures}
            details={premiumDetails}
            description="Only shown to premium tier users"
          />

          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">New Dashboard</h3>
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded ${
                  newDashboard
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {newDashboard ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              50% rollout - stable based on userId
            </p>
          </div>
        </div>

        {/* All Flags Debug */}
        <div className="mt-8 p-6 bg-gray-900 text-gray-100 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Debug: All Flags</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(getAllFlags(), null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}

function FlagCard({
  title,
  enabled,
  details,
  description,
}: {
  title: string;
  enabled: boolean;
  details: any;
  description?: string;
}) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className="mb-4">
        <span
          className={`px-3 py-1 rounded ${
            enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      {description && <p className="text-gray-600 mb-2">{description}</p>}
      <div className="text-sm text-gray-500">
        <div>Variation: {details?.variationKey}</div>
        <div>Reason: {details?.reason}</div>
      </div>
    </div>
  );
}
```

### 4.5 Run Demo App

```bash
pnpm dev
```

Open http://localhost:3000 (or 3002 if 3000 is taken)

## Part 5: Test the Demo (5 minutes)

### 5.1 Test Basic Flags

1. You should see all three flags displayed
2. "New Checkout UI" should be **Enabled** (because we set default to `true`)
3. "Premium Features" should be **Disabled** (because user is on free tier)
4. "New Dashboard" will be either enabled or disabled (50% chance, stable for user-123)

### 5.2 Test User Targeting

1. Click the "Premium" button to change user tier
2. Watch "Premium Features" flag change to **Enabled**
3. Check the debug output - reason should show `TARGETING_RULE:rule-1`

3. Click "Free" to change back
4. "Premium Features" should return to **Disabled**

### 5.3 Test Different Users

Edit `app/layout.tsx` and change the userId:

```tsx
context: {
  userId: 'user-456', // Different user
  attributes: {
    tier: 'free',
  },
}
```

Refresh the page. The "New Dashboard" flag might show a different value because percentage rollout uses stable hashing based on userId.

### 5.4 Test Flag Updates

1. Go back to the dashboard (localhost:3000)
2. Navigate to the "new-checkout-ui" flag
3. In Development environment, change default variation to `false`
4. Save

5. Wait up to 60 seconds (default polling interval)
6. Your demo app should automatically update to show "New Checkout UI" as **Disabled**

## Part 6: Advanced Scenarios

### 6.1 Multiple Targeting Rules

Update "premium-features" flag with multiple rules:

```json
{
  "enabled": true,
  "defaultVariationKey": "false",
  "targetingRules": [
    {
      "id": "rule-beta-testers",
      "description": "Beta testers always get access",
      "conditions": [
        {
          "attribute": "betaTester",
          "operator": "equals",
          "value": true
        }
      ],
      "conditionLogic": "AND",
      "variationKey": "true"
    },
    {
      "id": "rule-premium",
      "description": "Premium tier users",
      "conditions": [
        {
          "attribute": "tier",
          "operator": "equals",
          "value": "premium"
        }
      ],
      "conditionLogic": "AND",
      "variationKey": "true"
    }
  ]
}
```

Rules are evaluated in order - first match wins.

Update your app context to test:

```tsx
context: {
  userId: 'user-123',
  attributes: {
    tier: 'free',
    betaTester: true, // This user should see premium features
  },
}
```

### 6.2 Gradual Rollout

Update "new-dashboard" for gradual rollout to premium users:

```json
{
  "enabled": true,
  "defaultVariationKey": "false",
  "targetingRules": [
    {
      "id": "rule-premium-rollout",
      "description": "50% of premium users",
      "conditions": [
        {
          "attribute": "tier",
          "operator": "equals",
          "value": "premium"
        }
      ],
      "conditionLogic": "AND",
      "variationKey": "true",
      "rolloutPercentage": 50
    }
  ]
}
```

This:
1. Checks if user is premium tier
2. If yes, includes 50% of premium users (stable bucketing)
3. Others see default (false)

### 6.3 Complex Conditions

Test OR logic with multiple conditions:

```json
{
  "enabled": true,
  "defaultVariationKey": "false",
  "targetingRules": [
    {
      "id": "rule-power-users",
      "description": "Premium OR beta testers",
      "conditions": [
        {
          "attribute": "tier",
          "operator": "equals",
          "value": "premium"
        },
        {
          "attribute": "betaTester",
          "operator": "equals",
          "value": true
        }
      ],
      "conditionLogic": "OR",
      "variationKey": "true"
    }
  ]
}
```

## Part 7: Clean Up

When you're done:

```bash
# Stop development servers (Ctrl+C in both terminals)

# Optional: Reset database
cd apps/api
pnpm prisma migrate reset
```

## Key Takeaways

You've now seen:

✅ **Complete Setup** - From database to running servers
✅ **Flag Management** - Creating and configuring flags via dashboard
✅ **SDK Integration** - Using React hooks for clean flag access
✅ **User Targeting** - Conditional feature access based on attributes
✅ **Percentage Rollouts** - Gradual rollouts with stable bucketing
✅ **Real-time Updates** - Automatic flag updates via polling
✅ **Type Safety** - Full TypeScript support throughout

## Next Steps

- Explore other SDK hooks: `useStringFlag`, `useNumberFlag`, `useJSONFlag`
- Try the JavaScript SDK in a non-React app
- Set up multiple environments (staging, production)
- Test targeting rules with different operators (contains, in, greaterThan, matches)
- Implement A/B testing with string flags and multiple variations
- Review the deployment guide for production setup

## Troubleshooting

**Flags not updating in app?**
- Check API server is running
- Verify SDK key is correct
- Check browser console for errors
- Default polling is 60s - wait or refresh

**Can't login to dashboard?**
- Verify seed ran successfully: `pnpm prisma db seed`
- Check API logs for authentication errors
- Clear browser cache/cookies

**Database connection issues?**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Test connection: `pnpm prisma db pull`

---

**Questions or issues?** Open a GitHub issue or check the documentation.
