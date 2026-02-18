import { type Log, formatEther, decodeEventLog } from 'viem';
import { config } from './config.js';
import { DEMO_PURCHASE_ABI } from './abis/DemoPurchase.js';
import { getPublicClient } from './registry.js';
import { getSettlementInfo, type PurchaseEvent } from './settlement.js';
import { executePayment } from './payment.js';
import { createChildLogger } from './utils/logger.js';

const logger = createChildLogger('monitor');

// Track if the monitor is running
let isRunning = false;
let unwatch: (() => void) | null = null;

/**
 * Process a ProductPurchased event
 */
async function processPurchaseEvent(log: Log): Promise<void> {
  try {
    // Decode the event
    const decoded = decodeEventLog({
      abi: DEMO_PURCHASE_ABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName !== 'ProductPurchased') {
      return;
    }

    const args = decoded.args as {
      purchaseId: bigint;
      productId: bigint;
      buyer: `0x${string}`;
      amount: bigint;
      timestamp: bigint;
    };

    const event: PurchaseEvent = {
      purchaseId: args.purchaseId,
      productId: args.productId,
      buyer: args.buyer,
      amount: args.amount,
      timestamp: args.timestamp,
      blockNumber: log.blockNumber!,
      transactionHash: log.transactionHash!,
    };

    logger.info(
      {
        purchaseId: event.purchaseId.toString(),
        productId: event.productId.toString(),
        buyer: event.buyer,
        amount: formatEther(event.amount),
        blockNumber: event.blockNumber.toString(),
        transactionHash: event.transactionHash,
      },
      'Processing ProductPurchased event'
    );

    // Get settlement info (find matching ad and publisher wallet)
    const settlement = await getSettlementInfo(event);

    if (!settlement) {
      logger.warn(
        {
          purchaseId: event.purchaseId.toString(),
        },
        'Skipping settlement - no matching publisher found'
      );
      return;
    }

    // Execute the settlement payment
    const result = await executePayment(settlement);

    if (result.success) {
      logger.info(
        {
          purchaseId: event.purchaseId.toString(),
          settlementTx: result.transactionHash,
          publisherWallet: settlement.publisherWallet,
        },
        'Settlement completed successfully'
      );
    } else {
      logger.error(
        {
          purchaseId: event.purchaseId.toString(),
          error: result.error,
        },
        'Settlement failed'
      );
    }

  } catch (error) {
    logger.error({ error, log }, 'Error processing purchase event');
  }
}

/**
 * Start watching for ProductPurchased events
 */
export async function startMonitor(): Promise<void> {
  if (isRunning) {
    logger.warn('Monitor is already running');
    return;
  }

  const publicClient = getPublicClient();

  // Always start from latest block
  const startBlock = await publicClient.getBlockNumber();
  logger.info({ startBlock: startBlock.toString() }, 'Starting from latest block');

  // Start watching for new events
  logger.info('Starting real-time event monitoring');

  unwatch = publicClient.watchContractEvent({
    address: config.contracts.demoPurchase,
    abi: DEMO_PURCHASE_ABI,
    eventName: 'ProductPurchased',
    onLogs: async (logs: Log[]) => {
      for (const log of logs) {
        await processPurchaseEvent(log);
      }
    },
    onError: (error: Error) => {
      logger.error({ error }, 'Event watcher error');
    },
  });

  isRunning = true;
  logger.info('Monitor started successfully');
}

/**
 * Stop the event monitor
 */
export function stopMonitor(): void {
  if (unwatch) {
    unwatch();
    unwatch = null;
  }
  isRunning = false;
  logger.info('Monitor stopped');
}

/**
 * Check if the monitor is running
 */
export function isMonitorRunning(): boolean {
  return isRunning;
}
