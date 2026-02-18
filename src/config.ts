import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // Network
  rpcUrl: requireEnv('RPC_URL'),

  // Contracts (Base Mainnet)
  contracts: {
    demoPurchase: requireEnv('DEMO_PURCHASE_ADDRESS') as `0x${string}`,
    adRegistry: requireEnv('AD_REGISTRY_ADDRESS') as `0x${string}`,
    identityRegistry: requireEnv('IDENTITY_REGISTRY_ADDRESS') as `0x${string}`,
    campaignRegistry: requireEnv('CAMPAIGN_REGISTRY_ADDRESS') as `0x${string}`,
  },

  // Validator wallet
  validatorPrivateKey: requireEnv('VALIDATOR_PRIVATE_KEY') as `0x${string}`,

  // Validator identity token ID
  validatorId: BigInt(requireEnv('VALIDATOR_ID')),

  // Logging
  logLevel: optionalEnv('LOG_LEVEL', 'info'),

  // Optional: Starting block
  startBlock: process.env.START_BLOCK ? BigInt(process.env.START_BLOCK) : undefined,

  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 10000, // 10 seconds
  },
} as const;

export type Config = typeof config;
