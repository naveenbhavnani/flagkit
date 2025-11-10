/**
 * Basic usage example of @flagkit/sdk-js
 *
 * Run this example:
 * 1. Start your FlagKit API server
 * 2. Create an environment and get the client SDK key
 * 3. Create a test flag
 * 4. Update SDK_KEY below with your actual key
 * 5. Run: pnpm tsx examples/basic.ts
 */

import { FlagKitClient } from '../src';

// Replace with your actual SDK key
const SDK_KEY = 'your-client-sdk-key-here';

async function main() {
  console.log('🚀 FlagKit SDK Example\n');

  // Initialize the SDK
  const client = new FlagKitClient({
    sdkKey: SDK_KEY,
    apiUrl: 'http://localhost:3001',
    debug: true, // Enable debug logging
    context: {
      userId: 'user-123',
      attributes: {
        tier: 'premium',
        region: 'us-east',
      },
    },
  });

  // Listen for SDK events
  client.on('ready', () => {
    console.log('✅ SDK is ready!\n');
  });

  client.on('update', (flags) => {
    console.log('🔄 Flags updated:', flags);
  });

  client.on('error', (error) => {
    console.error('❌ SDK error:', error);
  });

  try {
    // Initialize and fetch flags
    await client.initialize();

    // Get all flags
    console.log('\n📋 All Flags:');
    const allFlags = client.getAllFlags();
    console.log(JSON.stringify(allFlags, null, 2));

    // Use boolean flags
    console.log('\n🎯 Boolean Flag Example:');
    const newFeature = client.getBooleanFlag('new-feature', false);
    console.log(`new-feature = ${newFeature}`);

    // Use string flags
    console.log('\n📝 String Flag Example:');
    const theme = client.getStringFlag('theme', 'light');
    console.log(`theme = ${theme}`);

    // Use number flags
    console.log('\n🔢 Number Flag Example:');
    const maxItems = client.getNumberFlag('max-items', 10);
    console.log(`max-items = ${maxItems}`);

    // Get raw flag details
    console.log('\n🔍 Flag Details:');
    const flag = client.getFlag('new-feature');
    if (flag) {
      console.log(`Key: ${flag.key}`);
      console.log(`Value: ${flag.value}`);
      console.log(`Variation: ${flag.variationKey}`);
      console.log(`Enabled: ${flag.enabled}`);
      console.log(`Reason: ${flag.reason}`);
    }

    // Evaluate flag with custom context
    console.log('\n🎲 Custom Context Evaluation:');
    const result = await client.evaluateFlag('new-feature', {
      userId: 'user-456',
      attributes: {
        tier: 'free',
      },
    });
    console.log('Evaluation result:', result);

    // Update user context
    console.log('\n🔄 Updating Context:');
    await client.updateContext(
      {
        userId: 'user-789',
        attributes: {
          tier: 'enterprise',
        },
      },
      true // Re-evaluate flags immediately
    );

    console.log('\n✨ Example completed successfully!');

    // Keep alive for polling (demonstrates automatic updates)
    console.log('\n⏱️  SDK will poll for updates every 60 seconds...');
    console.log('Press Ctrl+C to exit\n');
  } catch (error) {
    console.error('Error:', error);
    client.close();
    process.exit(1);
  }
}

main();
