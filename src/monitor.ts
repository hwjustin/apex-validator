import { type Log, formatEther, parseAbiItem, decodeEventLog } from 'viem';
import { config } from './config.js';
import { DEMO_PURCHASE_ABI } from './abis/DemoPurchase.js';
import { getPublicClient } from './registry.js';
import { getSettlementInfo, type PurchaseEvent } from './settlement.js';
import { executePayment } from './payment.js';
import { loadCheckpoint, saveCheckpoint } from './utils/checkpoint.js';
import { createChildLogger } from './utils/logger.js';

const logger = createChildLogger('monitor');

// Track if the monitor is running
let isRunning = false;
let unwatch: (() => void) | null = null;

// ProductPurchased event signature
const PRODUCT_PURCHASED_EVENT = parseAbiItem(
  'event ProductPurchased(uint256 indexed purchaseId, uint256 indexed productId, address indexed buyer, uint256 amount, uint256 timestamp)'
);

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

    // Save checkpoint after processing each event
    saveCheckpoint(event.blockNumber);
  } catch (error) {
    logger.error({ error, log }, 'Error processing purchase event');
  }
}

/**
 * Backfill events from a starting block to the current block
 */
async function backfillEvents(fromBlock: bigint, toBlock: bigint): Promise<void> {
  logger.info(
    {
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
    },
    'Starting backfill of missed events'
  );

  const publicClient = getPublicClient();

  // Get past events in chunks to avoid RPC limits
  const CHUNK_SIZE = 1000n;
  let currentFrom = fromBlock;

  while (currentFrom <= toBlock) {
    const currentTo = currentFrom + CHUNK_SIZE - 1n > toBlock ? toBlock : currentFrom + CHUNK_SIZE - 1n;

    logger.debug(
      {
        fromBlock: currentFrom.toString(),
        toBlock: currentTo.toString(),
      },
      'Fetching event chunk'
    );

    try {
      const logs = await publicClient.getLogs({
        address: config.contracts.demoPurchase,
        event: PRODUCT_PURCHASED_EVENT,
        fromBlock: currentFrom,
        toBlock: currentTo,
      });

      logger.debug(
        {
          fromBlock: currentFrom.toString(),
          toBlock: currentTo.toString(),
          eventCount: logs.length,
        },
        'Fetched events'
      );

      // Process each event
      for (const log of logs) {
        await processPurchaseEvent(log);
      }
    } catch (error) {
      logger.error(
        {
          error,
          fromBlock: currentFrom.toString(),
          toBlock: currentTo.toString(),
        },
        'Error fetching events chunk'
      );
    }

    currentFrom = currentTo + 1n;
  }

  logger.info('Backfill completed');
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

  // Get the starting block
  let startBlock: bigint;
  const checkpoint = loadCheckpoint();

  if (config.startBlock) {
    startBlock = config.startBlock;
    logger.info({ startBlock: startBlock.toString() }, 'Using configured start block');
  } else if (checkpoint) {
    startBlock = checkpoint + 1n; // Start from the next block after checkpoint
    logger.info({ startBlock: startBlock.toString() }, 'Resuming from checkpoint');
  } else {
    startBlock = await publicClient.getBlockNumber();
    logger.info({ startBlock: startBlock.toString() }, 'Starting from latest block');
  }

  // Get current block for backfill
  const currentBlock = await publicClient.getBlockNumber();

  // Backfill any missed events
  if (startBlock < currentBlock) {
    await backfillEvents(startBlock, currentBlock);
  }

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
