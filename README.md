# APEX Validator Service

A standalone Node.js/TypeScript service that monitors on-chain purchase events and processes USDC ad settlement payments to publishers on Base Mainnet.

## Overview

The APEX Validator Service:
- Monitors `ProductPurchased` events from the DemoPurchase contract
- Correlates purchases with ads by matching buyer wallet addresses in ad metadata
- Sends USDC settlement payments to publishers who served the ads
- Handles missed events through backfill on startup
- Persists processing state via checkpoint files

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     APEX Validator Service                       │
├─────────────────────────────────────────────────────────────────┤
│  EventMonitor     →   Watches ProductPurchased events            │
│  RegistryLookup   →   Reads AdRegistry + IdentityRegistry        │
│  SettlementLogic  →   Finds publisher, resolves wallet            │
│  PaymentExecutor  →   Transfers USDC to publisher wallet          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Base Mainnet Contracts                         │
│  DemoPurchase  │  AdRegistry  │  IdentityRegistry  │    USDC    │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js >= 20.0.0
- A Base Mainnet wallet funded with USDC (for settlements) and ETH (for gas)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your validator private key:
   ```
   VALIDATOR_PRIVATE_KEY=0x...
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Running

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

### Docker:
```bash
cd docker
docker-compose up -d
```

### PM2:
```bash
npm run build
pm2 start ecosystem.config.js --env production
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Base Mainnet RPC endpoint | Required |
| `DEMO_PURCHASE_ADDRESS` | DemoPurchase contract address | `0x7f34ec8b18e05af38d771cb50382fa15fc30a1d1` |
| `AD_REGISTRY_ADDRESS` | AdRegistry contract address | `0x15dacc499e88c626ed715b5f77c7e5e201c8c805` |
| `IDENTITY_REGISTRY_ADDRESS` | IdentityRegistry contract address | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| `USDC_ADDRESS` | USDC token contract address | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `VALIDATOR_PRIVATE_KEY` | Private key for validator wallet | Required |
| `SETTLEMENT_AMOUNT_USDC` | USDC amount to pay publishers per purchase | `0.1` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `START_BLOCK` | Block to start monitoring from | Latest block |

## Settlement Flow

1. **Event Detection**: Monitor `ProductPurchased` events from DemoPurchase contract
2. **Ad Attribution**:
   - Get product's advertiser ID
   - Query AdRegistry for ads from that advertiser
   - Find ad where metadata contains buyer's wallet address
3. **Publisher Resolution**: Get publisher's wallet from IdentityRegistry (ERC-721 ownerOf)
4. **Payment Execution**: Transfer USDC to publisher wallet

## State Management

The service maintains minimal state through a checkpoint file (`data/checkpoint.json`):
- Tracks the last processed block number
- Enables resuming from where it left off after restarts
- Prevents duplicate processing of events

## Monitoring

Check the logs for:
- `Processing ProductPurchased event` - New purchase detected
- `Found matching ad for purchase` - Ad attribution successful
- `USDC settlement payment sent successfully` - Payment completed
- `Skipping settlement - no matching publisher found` - No ad matched the purchase

## Verification

1. Fund the validator wallet with USDC and ETH (for gas) on Base Mainnet
2. Start the validator service
3. Make a test purchase via the client-demo
4. Check logs for event detection and settlement
5. Verify the transaction on [BaseScan](https://basescan.org/)

## License

Apache-2.0
