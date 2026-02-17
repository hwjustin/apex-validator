import { formatUnits } from 'viem';
import { config } from './config.js';
import { initRegistry } from './registry.js';
import { initPayment, getValidatorAddress, getValidatorUsdcBalance } from './payment.js';
import { startMonitor, stopMonitor } from './monitor.js';
import { logger } from './utils/logger.js';

const USDC_DECIMALS = 6;

/**
 * APEX Validator Service
 *
 * Monitors ProductPurchased events on Base Mainnet and settles
 * USDC payments to publishers who served the ads that led to the purchase.
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

  // Check validator USDC balance
  const usdcBalance = await getValidatorUsdcBalance();

  logger.info({
    validatorAddress,
    usdcBalance: formatUnits(usdcBalance, USDC_DECIMALS) + ' USDC',
    settlementAmount: config.settlement.amountUsdc + ' USDC',
    contracts: {
      demoPurchase: config.contracts.demoPurchase,
      adRegistry: config.contracts.adRegistry,
      identityRegistry: config.contracts.identityRegistry,
      usdc: config.contracts.usdc,
    },
  }, 'Validator configuration');

  // Warn if USDC balance is low
  const estimatedSettlements = usdcBalance / config.settlement.amountRaw;
  if (estimatedSettlements < 10n) {
    logger.warn(
      {
        usdcBalance: formatUnits(usdcBalance, USDC_DECIMALS) + ' USDC',
        estimatedSettlements: estimatedSettlements.toString(),
      },
      'Low validator USDC balance - may run out of funds for settlements'
    );
  }

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
