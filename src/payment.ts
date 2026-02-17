import {
  createWalletClient,
  http,
  formatUnits,
  type WalletClient,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { config } from './config.js';
import { getPublicClient } from './registry.js';
import { createChildLogger } from './utils/logger.js';
import type { SettlementInfo } from './settlement.js';

const logger = createChildLogger('payment');

const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for transfer and balanceOf
const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

let walletClient: WalletClient;
let validatorAccount: Account;

/**
 * Initialize the wallet client for sending payments
 */
export function initPayment(): { walletClient: WalletClient; account: Account } {
  validatorAccount = privateKeyToAccount(config.validatorPrivateKey);

  walletClient = createWalletClient({
    account: validatorAccount,
    chain: base,
    transport: http(config.rpcUrl),
  });

  logger.info(
    { validatorAddress: validatorAccount.address },
    'Payment client initialized'
  );

  return { walletClient, account: validatorAccount };
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  const delay = config.retry.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.retry.maxDelayMs);
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: `0x${string}`;
  error?: string;
  attempts: number;
}

/**
 * Execute a USDC settlement payment to the publisher
 *
 * Transfers the configured USDC amount to the publisher wallet
 * with retry logic for failed transactions
 */
export async function executePayment(settlement: SettlementInfo): Promise<PaymentResult> {
  const { publisherWallet, publisherId, adId, purchaseEvent } = settlement;
  const amount = config.settlement.amountRaw;

  logger.info(
    {
      publisherWallet,
      publisherId: publisherId.toString(),
      adId: adId.toString(),
      purchaseId: purchaseEvent.purchaseId.toString(),
      amount: formatUnits(amount, USDC_DECIMALS) + ' USDC',
    },
    'Executing USDC settlement payment'
  );

  let lastError: string | undefined;

  for (let attempt = 0; attempt < config.retry.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        logger.debug(
          { attempt: attempt + 1, delayMs: delay },
          'Retrying payment after delay'
        );
        await sleep(delay);
      }

      // Transfer USDC to publisher wallet on Base Mainnet
      const hash = await walletClient.writeContract({
        address: config.contracts.usdc,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [publisherWallet, amount],
        chain: base,
        account: validatorAccount,
      });

      logger.info(
        {
          transactionHash: hash,
          publisherWallet,
          publisherId: publisherId.toString(),
          amount: formatUnits(amount, USDC_DECIMALS) + ' USDC',
          purchaseId: purchaseEvent.purchaseId.toString(),
          attempts: attempt + 1,
        },
        'USDC settlement payment sent successfully'
      );

      return {
        success: true,
        transactionHash: hash,
        attempts: attempt + 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;

      logger.error(
        {
          error: errorMessage,
          publisherWallet,
          attempt: attempt + 1,
          maxAttempts: config.retry.maxAttempts,
        },
        'Payment attempt failed'
      );
    }
  }

  logger.error(
    {
      publisherWallet,
      publisherId: publisherId.toString(),
      purchaseId: purchaseEvent.purchaseId.toString(),
      attempts: config.retry.maxAttempts,
      lastError,
    },
    'USDC settlement payment failed after all retries'
  );

  return {
    success: false,
    error: lastError,
    attempts: config.retry.maxAttempts,
  };
}

/**
 * Get the validator's USDC balance
 */
export async function getValidatorUsdcBalance(): Promise<bigint> {
  const publicClient = getPublicClient();
  const balance = await publicClient.readContract({
    address: config.contracts.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [validatorAccount.address],
  });
  return balance;
}

/**
 * Get the validator account address
 */
export function getValidatorAddress(): `0x${string}` {
  if (!validatorAccount) {
    throw new Error('Payment not initialized. Call initPayment() first.');
  }
  return validatorAccount.address;
}
