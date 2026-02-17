import { parseUnits } from 'viem';
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

// USDC has 6 decimals
const USDC_DECIMALS = 6;

export const config = {
  // Network
  rpcUrl: requireEnv('RPC_URL'),

  // Contracts (Base Mainnet)
  contracts: {
    demoPurchase: requireEnv('DEMO_PURCHASE_ADDRESS') as `0x${string}`,
    adRegistry: requireEnv('AD_REGISTRY_ADDRESS') as `0x${string}`,
    identityRegistry: requireEnv('IDENTITY_REGISTRY_ADDRESS') as `0x${string}`,
    usdc: requireEnv('USDC_ADDRESS') as `0x${string}`,
  },

  // Validator wallet
  validatorPrivateKey: requireEnv('VALIDATOR_PRIVATE_KEY') as `0x${string}`,

  // Settlement configuration (USDC)
  settlement: {
    amountUsdc: optionalEnv('SETTLEMENT_AMOUNT_USDC', '0.1'),
    get amountRaw() {
      return parseUnits(this.amountUsdc, USDC_DECIMALS);
    },
  },

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

  // Checkpoint file path
  checkpointPath: './data/checkpoint.json',
} as const;

export type Config = typeof config;
