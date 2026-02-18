import { createPublicClient, http, webSocket } from 'viem';
import { base } from 'viem/chains';
import { config } from './config.js';
import { AD_REGISTRY_ABI, type Ad } from './abis/AdRegistry.js';
import { CAMPAIGN_REGISTRY_ABI, type Campaign } from './abis/CampaignRegistry.js';
import { IDENTITY_REGISTRY_ABI } from './abis/IdentityRegistry.js';
import { DEMO_PURCHASE_ABI, type Product } from './abis/DemoPurchase.js';
import { createChildLogger } from './utils/logger.js';

const logger = createChildLogger('registry');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let publicClient: any;

/**
 * Initialize the public client for reading from contracts
 */
export function initRegistry(): any {
  const isWebSocket = config.rpcUrl.startsWith('wss://') || config.rpcUrl.startsWith('ws://');
  const transport = isWebSocket ? webSocket(config.rpcUrl) : http(config.rpcUrl);

  publicClient = createPublicClient({
    chain: base,
    transport,
  });
  logger.info({ transport: isWebSocket ? 'WebSocket' : 'HTTP' }, 'Registry client initialized');
  return publicClient;
}

/**
 * Get product details from DemoPurchase contract
 */
export async function getProduct(productId: bigint): Promise<Product> {
  const product = await publicClient.readContract({
    address: config.contracts.demoPurchase,
    abi: DEMO_PURCHASE_ABI,
    functionName: 'getProduct',
    args: [productId],
  });

  return product as Product;
}

/**
 * Get ad details from AdRegistry contract
 */
export async function getAd(adId: bigint): Promise<Ad> {
  const ad = await publicClient.readContract({
    address: config.contracts.adRegistry,
    abi: AD_REGISTRY_ABI,
    functionName: 'getAd',
    args: [adId],
  });

  return ad as Ad;
}

/**
 * Get all ad IDs for a specific advertiser
 */
export async function getAdsByAdvertiser(advertiserId: bigint): Promise<readonly bigint[]> {
  const adIds = await publicClient.readContract({
    address: config.contracts.adRegistry,
    abi: AD_REGISTRY_ABI,
    functionName: 'getAdsByAdvertiser',
    args: [advertiserId],
  });

  return adIds;
}

/**
 * Get total number of ads in the registry
 */
export async function getAdCount(): Promise<bigint> {
  const count = await publicClient.readContract({
    address: config.contracts.adRegistry,
    abi: AD_REGISTRY_ABI,
    functionName: 'getAdCount',
  });

  return count;
}

/**
 * Get the wallet address (owner) for an agent by token ID.
 * The new IdentityRegistry is ERC-721 based, so ownerOf returns the agent's wallet.
 */
export async function getAgentWallet(agentId: bigint): Promise<`0x${string}`> {
  const owner = await publicClient.readContract({
    address: config.contracts.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [agentId],
  });

  return owner as `0x${string}`;
}

/**
 * Get campaign details from CampaignRegistry
 */
export async function getCampaign(campaignId: bigint): Promise<Campaign> {
  const campaign = await publicClient.readContract({
    address: config.contracts.campaignRegistry,
    abi: CAMPAIGN_REGISTRY_ABI,
    functionName: 'getCampaign',
    args: [campaignId],
  });

  return campaign as Campaign;
}

/**
 * Check if an action hash has already been processed
 */
export async function isActionProcessed(actionHash: `0x${string}`): Promise<boolean> {
  const processed = await publicClient.readContract({
    address: config.contracts.campaignRegistry,
    abi: CAMPAIGN_REGISTRY_ABI,
    functionName: 'isActionProcessed',
    args: [actionHash],
  });

  return processed as boolean;
}

/**
 * Get the public client instance
 */
export function getPublicClient(): any {
  if (!publicClient) {
    throw new Error('Registry not initialized. Call initRegistry() first.');
  }
  return publicClient;
}
