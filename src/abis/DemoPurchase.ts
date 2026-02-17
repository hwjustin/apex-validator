/**
 * DemoPurchase Contract ABI
 * Contract Address: 0x7f34ec8b18e05af38d771cb50382fa15fc30a1d1 (Base Mainnet)
 */

export const DEMO_PURCHASE_ABI = [
  {
    type: 'function',
    name: 'getProduct',
    inputs: [{ name: 'productId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'product',
        type: 'tuple',
        internalType: 'struct IDemoPurchase.Product',
        components: [
          { name: 'productId', type: 'uint256', internalType: 'uint256' },
          { name: 'advertiserId', type: 'uint256', internalType: 'uint256' },
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'description', type: 'string', internalType: 'string' },
          { name: 'priceAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'isActive', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPurchase',
    inputs: [{ name: 'purchaseId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'purchase',
        type: 'tuple',
        internalType: 'struct IDemoPurchase.Purchase',
        components: [
          { name: 'purchaseId', type: 'uint256', internalType: 'uint256' },
          { name: 'productId', type: 'uint256', internalType: 'uint256' },
          { name: 'buyer', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          { name: 'timestamp', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProductCount',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPurchaseCount',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ProductPurchased',
    inputs: [
      { name: 'purchaseId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'productId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'buyer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'timestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProductCreated',
    inputs: [
      { name: 'productId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'advertiserId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      { name: 'priceAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'ProductNotFound', inputs: [] },
  { type: 'error', name: 'ProductNotActive', inputs: [] },
  { type: 'error', name: 'InvalidPaymentAmount', inputs: [] },
  { type: 'error', name: 'PaymentFailed', inputs: [] },
] as const;

export interface Product {
  productId: bigint;
  advertiserId: bigint;
  name: string;
  description: string;
  priceAmount: bigint;
  isActive: boolean;
}

export interface Purchase {
  purchaseId: bigint;
  productId: bigint;
  buyer: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}
