/**
 * AdRegistry Contract ABI
 * Contract Address: 0x82dc7de34418314de0853c787d3fb634342b3c58 (Base Mainnet)
 */

export const AD_REGISTRY_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_identityRegistry', type: 'address', internalType: 'address' },
      { name: '_campaignRegistry', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAd',
    inputs: [{ name: 'adId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'ad',
        type: 'tuple',
        internalType: 'struct IAdRegistry.Ad',
        components: [
          { name: 'adId', type: 'uint256', internalType: 'uint256' },
          { name: 'campaignId', type: 'uint256', internalType: 'uint256' },
          { name: 'advertiserId', type: 'uint256', internalType: 'uint256' },
          { name: 'publisherId', type: 'uint256', internalType: 'uint256' },
          { name: 'startTime', type: 'uint256', internalType: 'uint256' },
          { name: 'metadata', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdCount',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdsByAdvertiser',
    inputs: [{ name: 'advertiserId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'adIds', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdsByPublisher',
    inputs: [{ name: 'publisherId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'adIds', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAdsByCampaign',
    inputs: [{ name: 'campaignId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'adIds', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'adExists',
    inputs: [{ name: 'adId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: 'exists', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'AdCreated',
    inputs: [
      { name: 'adId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'campaignId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'advertiserId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'publisherId', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'startTime', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AdUpdated',
    inputs: [
      { name: 'adId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'metadata', type: 'bytes', indexed: false, internalType: 'bytes' },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'AdNotFound', inputs: [] },
  { type: 'error', name: 'AdvertiserNotFound', inputs: [] },
  { type: 'error', name: 'CampaignNotActive', inputs: [] },
  { type: 'error', name: 'CampaignNotFound', inputs: [] },
  { type: 'error', name: 'InvalidStartTime', inputs: [] },
  { type: 'error', name: 'PublisherNotFound', inputs: [] },
  { type: 'error', name: 'UnauthorizedCaller', inputs: [] },
] as const;

export interface Ad {
  adId: bigint;
  campaignId: bigint;
  advertiserId: bigint;
  publisherId: bigint;
  startTime: bigint;
  metadata: `0x${string}`;
}
