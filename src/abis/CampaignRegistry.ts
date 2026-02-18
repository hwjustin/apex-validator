/**
 * CampaignRegistry Contract ABI
 * Contract Address: 0x8c2b543fa5d8740e40306e372dd4bcf6af3f5266 (Base Mainnet)
 */

export const CAMPAIGN_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'processAction',
    inputs: [
      { name: 'campaignId', type: 'uint256', internalType: 'uint256' },
      { name: 'publisherId', type: 'uint256', internalType: 'uint256' },
      { name: 'validatorId', type: 'uint256', internalType: 'uint256' },
      { name: 'actionHash', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getCampaign',
    inputs: [{ name: 'campaignId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'campaign',
        type: 'tuple',
        internalType: 'struct ICampaignRegistry.Campaign',
        components: [
          { name: 'campaignId', type: 'uint256', internalType: 'uint256' },
          { name: 'advertiserId', type: 'uint256', internalType: 'uint256' },
          { name: 'validatorId', type: 'uint256', internalType: 'uint256' },
          {
            name: 'budget',
            type: 'tuple',
            internalType: 'struct ICampaignRegistry.Budget',
            components: [
              { name: 'totalBudget', type: 'uint256', internalType: 'uint256' },
              { name: 'cpaAmount', type: 'uint256', internalType: 'uint256' },
              { name: 'spent', type: 'uint256', internalType: 'uint256' },
            ],
          },
          { name: 'startTime', type: 'uint256', internalType: 'uint256' },
          { name: 'endTime', type: 'uint256', internalType: 'uint256' },
          { name: 'active', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isCampaignActive',
    inputs: [{ name: 'campaignId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isActionProcessed',
    inputs: [{ name: 'actionHash', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ActionProcessed',
    inputs: [
      { name: 'campaignId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'publisherId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'validatorId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'actionHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const;

export interface Budget {
  totalBudget: bigint;
  cpaAmount: bigint;
  spent: bigint;
}

export interface Campaign {
  campaignId: bigint;
  advertiserId: bigint;
  validatorId: bigint;
  budget: Budget;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
}
