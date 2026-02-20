import {
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  encodeFunctionData,
  type Hex,
  type WalletClient,
  type Account,
} from 'viem';
import { Attribution } from 'ox/erc8021';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { config } from './config.js';
import { isActionProcessed } from './registry.js';
import { CAMPAIGN_REGISTRY_ABI } from './abis/CampaignRegistry.js';
import { createChildLogger } from './utils/logger.js';
import type { SettlementInfo } from './settlement.js';

const logger = createChildLogger('payment');

// ERC-8021 builder code suffix for Base attribution
const BUILDER_CODE_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_koehzjn1'] });

let walletClient: WalletClient;
let validatorAccount: Account;

/**
 * Initialize the wallet client for sending payments
 */
export function initPayment(): { walletClient: WalletClient; account: Account } {
  validatorAccount = privateKeyToAccount(config.validatorPrivateKey);

  // Wallet client uses HTTP — derive from WSS URL if needed
  const httpUrl = config.rpcUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

  walletClient = createWalletClient({
    account: validatorAccount,
    chain: base,
    transport: http(httpUrl),
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

/**
 * Generate a deterministic action hash from purchaseId + adId
 */
function generateActionHash(purchaseId: bigint, adId: bigint): `0x${string}` {
  return keccak256(encodePacked(['uint256', 'uint256'], [purchaseId, adId]));
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: `0x${string}`;
  actionHash?: `0x${string}`;
  error?: string;
  attempts: number;
}

/**
 * Execute a settlement by calling processAction() on CampaignRegistry
 *
 * This triggers the campaign's escrowed budget to pay the publisher
 * the CPA amount defined in the campaign.
 */
export async function executePayment(settlement: SettlementInfo): Promise<PaymentResult> {
  const { publisherId, adId, campaignId, purchaseEvent } = settlement;
  const actionHash = generateActionHash(purchaseEvent.purchaseId, adId);

  logger.info(
    {
      campaignId: campaignId.toString(),
      publisherId: publisherId.toString(),
      adId: adId.toString(),
      purchaseId: purchaseEvent.purchaseId.toString(),
      validatorId: config.validatorId.toString(),
      actionHash,
    },
    'Executing processAction settlement'
  );

  // Check if action was already processed
  try {
    const alreadyProcessed = await isActionProcessed(actionHash);
    if (alreadyProcessed) {
      logger.warn(
        { actionHash, purchaseId: purchaseEvent.purchaseId.toString(), adId: adId.toString() },
        'Action already processed — skipping duplicate'
      );
      return {
        success: false,
        actionHash,
        error: 'Action already processed',
        attempts: 0,
      };
    }
  } catch (error) {
    logger.warn(
      { error, actionHash },
      'Failed to check if action is already processed — proceeding anyway'
    );
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt < config.retry.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        logger.debug(
          { attempt: attempt + 1, delayMs: delay },
          'Retrying processAction after delay'
        );
        await sleep(delay);
      }

      // Encode calldata and append ERC-8021 builder code suffix for Base attribution
      const calldata = encodeFunctionData({
        abi: CAMPAIGN_REGISTRY_ABI,
        functionName: 'processAction',
        args: [campaignId, publisherId, config.validatorId, actionHash],
      });
      const dataWithAttribution = (calldata + BUILDER_CODE_SUFFIX.slice(2)) as Hex;

      const hash = await walletClient.sendTransaction({
        to: config.contracts.campaignRegistry,
        data: dataWithAttribution,
        chain: base,
        account: validatorAccount,
      });

      logger.info(
        {
          transactionHash: hash,
          actionHash,
          campaignId: campaignId.toString(),
          publisherId: publisherId.toString(),
          purchaseId: purchaseEvent.purchaseId.toString(),
          attempts: attempt + 1,
        },
        'processAction settlement sent successfully'
      );

      return {
        success: true,
        transactionHash: hash,
        actionHash,
        attempts: attempt + 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;

      logger.error(
        {
          error: errorMessage,
          campaignId: campaignId.toString(),
          publisherId: publisherId.toString(),
          attempt: attempt + 1,
          maxAttempts: config.retry.maxAttempts,
        },
        'processAction attempt failed'
      );
    }
  }

  logger.error(
    {
      campaignId: campaignId.toString(),
      publisherId: publisherId.toString(),
      purchaseId: purchaseEvent.purchaseId.toString(),
      attempts: config.retry.maxAttempts,
      lastError,
    },
    'processAction settlement failed after all retries'
  );

  return {
    success: false,
    actionHash,
    error: lastError,
    attempts: config.retry.maxAttempts,
  };
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
