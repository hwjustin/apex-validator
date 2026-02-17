import { createChildLogger } from './utils/logger.js';
import { getProduct, getAdsByAdvertiser, getAd, getAgentWallet } from './registry.js';
import type { Ad } from './abis/AdRegistry.js';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

const logger = createChildLogger('settlement');

export interface PurchaseEvent {
  purchaseId: bigint;
  productId: bigint;
  buyer: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

export interface SettlementInfo {
  publisherWallet: `0x${string}`;
  publisherId: bigint;
  adId: bigint;
  purchaseEvent: PurchaseEvent;
}

/**
 * Ad metadata structure stored in the metadata bytes field
 * The metadata contains the user's wallet address that was shown the ad
 */
interface AdMetadata {
  userWallet?: string;
  [key: string]: unknown;
}

/**
 * Parse ad metadata from bytes to JSON
 */
function parseAdMetadata(metadataBytes: `0x${string}`): AdMetadata | null {
  try {
    if (metadataBytes === '0x' || metadataBytes.length === 2) {
      return null;
    }

    // First, decode the ABI-encoded string parameter
    const [decodedString] = decodeAbiParameters(
      parseAbiParameters('string'),
      metadataBytes
    );

    // Then parse the JSON string
    return JSON.parse(decodedString);
  } catch (error) {
    logger.debug({ error, metadataBytes }, 'Failed to parse ad metadata');
    return null;
  }
}

/**
 * Find the matching ad for a purchase
 *
 * Attribution logic:
 * 1. Get the product's advertiser ID
 * 2. Get all ads from that advertiser
 * 3. Find an ad where the metadata contains the buyer's wallet address
 *
 * Returns the ad that served the purchase, or null if no match found
 */
export async function findMatchingAd(event: PurchaseEvent): Promise<Ad | null> {
  logger.debug(
    {
      purchaseId: event.purchaseId.toString(),
      productId: event.productId.toString(),
      buyer: event.buyer,
    },
    'Finding matching ad for purchase'
  );

  try {
    // Step 1: Get product to find advertiser ID
    const product = await getProduct(event.productId);
    const advertiserId = product.advertiserId;

    logger.debug(
      {
        productId: event.productId.toString(),
        advertiserId: advertiserId.toString(),
      },
      'Found product advertiser'
    );

    // Step 2: Get all ads from this advertiser
    const adIds = await getAdsByAdvertiser(advertiserId);

    if (adIds.length === 0) {
      logger.warn({ advertiserId: advertiserId.toString() }, 'No ads found for advertiser');
      return null;
    }

    logger.debug(
      {
        advertiserId: advertiserId.toString(),
        adCount: adIds.length,
      },
      'Found ads for advertiser'
    );

    // Step 3: Find ad with buyer's wallet in metadata
    const buyerAddressLower = event.buyer.toLowerCase();

    for (const adId of adIds) {
      const ad = await getAd(adId);
      const metadata = parseAdMetadata(ad.metadata);

      // Debug: Log what we actually decoded
      logger.debug(
        {
          adId: adId.toString(),
          rawMetadata: ad.metadata,
          decodedMetadata: metadata,
          hasUserWallet: !!metadata?.userWallet,
          userWalletValue: metadata?.userWallet,
        },
        'Checking ad metadata'
      );

      if (metadata?.userWallet) {
        const adUserWalletLower = metadata.userWallet.toLowerCase();
        if (adUserWalletLower === buyerAddressLower) {
          logger.info(
            {
              adId: adId.toString(),
              publisherId: ad.publisherId.toString(),
              buyer: event.buyer,
            },
            'Found matching ad for purchase'
          );
          return ad;
        }
      }
    }

    logger.warn(
      {
        purchaseId: event.purchaseId.toString(),
        buyer: event.buyer,
        advertiserId: advertiserId.toString(),
        adsChecked: adIds.length,
      },
      'No matching ad found for purchase - buyer wallet not in any ad metadata'
    );

    return null;
  } catch (error) {
    logger.error(
      {
        error,
        purchaseId: event.purchaseId.toString(),
      },
      'Error finding matching ad'
    );
    return null;
  }
}

/**
 * Get publisher wallet address for settlement
 *
 * Uses the ERC-721 IdentityRegistry's ownerOf to resolve the publisher's wallet.
 * Returns the full settlement info including publisher wallet and IDs.
 */
export async function getSettlementInfo(event: PurchaseEvent): Promise<SettlementInfo | null> {
  // Find the ad that served this purchase
  const ad = await findMatchingAd(event);

  if (!ad) {
    logger.warn(
      {
        purchaseId: event.purchaseId.toString(),
      },
      'No settlement info - no matching ad found'
    );
    return null;
  }

  try {
    // Get publisher wallet from IdentityRegistry (ERC-721 ownerOf)
    const publisherWallet = await getAgentWallet(ad.publisherId);

    if (!publisherWallet || publisherWallet === '0x0000000000000000000000000000000000000000') {
      logger.error(
        {
          publisherId: ad.publisherId.toString(),
        },
        'Publisher has no valid wallet address'
      );
      return null;
    }

    logger.info(
      {
        publisherId: ad.publisherId.toString(),
        publisherWallet,
        adId: ad.adId.toString(),
      },
      'Resolved publisher wallet for settlement'
    );

    return {
      publisherWallet,
      publisherId: ad.publisherId,
      adId: ad.adId,
      purchaseEvent: event,
    };
  } catch (error) {
    logger.error(
      {
        error,
        publisherId: ad.publisherId.toString(),
      },
      'Failed to get publisher wallet'
    );
    return null;
  }
}
