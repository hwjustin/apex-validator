import { config } from './config.js';
import { initRegistry } from './registry.js';
import { initPayment, getValidatorAddress } from './payment.js';
import { startMonitor, stopMonitor } from './monitor.js';
import { logger } from './utils/logger.js';

/**
 * APEX Validator Service
 *
 * Monitors ProductPurchased events on Base Mainnet and settles
 * payments to publishers via CampaignRegistry.processAction().
 * The validator's wallet needs ETH for gas to submit settlement transactions.
 */
async function main(): Promise<void> {
  logger.info('Starting APEX Validator Service (Base Mainnet)');

  // Initialize clients
  logger.info('Initializing registry client...');
  initRegistry();

  logger.info('Initializing payment client...');
  initPayment();

  // Log configuration
  const validatorAddress = getValidatorAddress();

  logger.info({
    validatorAddress,
    validatorId: config.validatorId.toString(),
    contracts: {
      demoPurchase: config.contracts.demoPurchase,
      adRegistry: config.contracts.adRegistry,
      campaignRegistry: config.contracts.campaignRegistry,
      identityRegistry: config.contracts.identityRegistry,
    },
  }, 'Validator configuration');

  // Start the event monitor
  await startMonitor();

  logger.info('APEX Validator Service is running');

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    stopMonitor();

    logger.info('APEX Validator Service stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the process running
  await new Promise(() => {});
}

// Run the service
main().catch((error) => {
  logger.error({ error }, 'Fatal error');
  process.exit(1);
});
