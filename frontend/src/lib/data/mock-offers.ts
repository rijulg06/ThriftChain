// Mock data for offers and transactions
// TODO: Replace with real blockchain queries when contracts are deployed

export interface MockOffer {
  offerId: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  message: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'cancelled';
  counterAmount?: number;
  counterMessage?: string;
  createdAt: number;
  expiresAt: number;
  isCounter: boolean;
}

export interface MockTransaction {
  transactionId: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  status: 'awaiting_shipping' | 'shipped' | 'delivered' | 'disputed' | 'completed';
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingAddress?: string;
  buyerShippingInfo?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: number;
  completedAt?: number;
}

export interface MyListedItem {
  itemId: string;
  itemTitle: string;
  itemImage: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  offersCount: number;
  listedAt: number;
}

// Generate mock wallet addresses
const mockWallets = [
  '0x1a2b3c4d5e6f7g8h9i0j',
  '0x9z8y7x6w5v4u3t2s1r0q',
  '0xabcdef1234567890abcd',
  '0x5555666677778888999',
];

// Mock items for offers - using consistent IDs that match mock-listings.ts
// These are actual items from the CSV with their hashed IDs
const mockItems = [
  {
    id: 'mock_obj_0_1688145676', // "White and Green Gingham Crop"
    title: 'White and Green Gingham Crop',
    image: 'https://media-photos.depop.com/b1/28005168/2728995660_5e169b7713dc4be5996f35a42fde088e/P8.jpg',
  },
  {
    id: 'mock_obj_1_1081421546', // "Custom Black Cream Heavily"
    title: 'Custom Black Cream Heavily',
    image: 'https://media-photos.depop.com/b1/16755577/2823765184_65485b099e374b6fb0c2aab8bd1a4bc7/P8.jpg',
  },
  {
    id: 'mock_obj_2_6678302914', // "Blue and White Subway Button Up"
    title: 'Blue and White Subway Button Up',
    image: 'https://media-photos.depop.com/b1/47294250/2783757753_afb132953fdf4df2883d5d51f92ea384/P8.jpg',
  },
  {
    id: 'mock_obj_3_8509339855', // "Coastal White Tube Top"
    title: 'Coastal White Tube Top',
    image: 'https://media-photos.depop.com/b1/23559344/2799601735_79b0721c2c7a4dbf93918150fa9f151e/P8.jpg',
  },
];

// Get current connected wallet (mock)
export function getCurrentWallet(): string {
  // TODO: Replace with actual wallet from @suiet/wallet-kit
  return mockWallets[0];
}

// Generate mock offers where user is the BUYER (offers made on others' items)
export function getMyOffersMade(): MockOffer[] {
  const currentWallet = getCurrentWallet();
  const now = Date.now();
  
  return [
    {
      offerId: 'offer_1',
      itemId: mockItems[1].id,
      itemTitle: mockItems[1].title,
      itemImage: mockItems[1].image,
      buyerAddress: currentWallet,
      sellerAddress: mockWallets[1],
      amount: 45,
      message: 'Would love to buy this! Can you do $45?',
      status: 'pending',
      createdAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
      expiresAt: now + 22 * 60 * 60 * 1000, // expires in 22 hours
      isCounter: false,
    },
    {
      offerId: 'offer_2',
      itemId: mockItems[2].id,
      itemTitle: mockItems[2].title,
      itemImage: mockItems[2].image,
      buyerAddress: currentWallet,
      sellerAddress: mockWallets[2],
      amount: 30,
      message: 'Interested! Is this still available?',
      status: 'countered',
      counterAmount: 35,
      counterMessage: 'I can do $35, it\'s in great condition!',
      createdAt: now - 5 * 60 * 60 * 1000, // 5 hours ago
      expiresAt: now + 19 * 60 * 60 * 1000,
      isCounter: true,
    },
    {
      offerId: 'offer_3',
      itemId: mockItems[3].id,
      itemTitle: mockItems[3].title,
      itemImage: mockItems[3].image,
      buyerAddress: currentWallet,
      sellerAddress: mockWallets[3],
      amount: 28,
      message: 'Love this! Would you accept $28?',
      status: 'accepted',
      createdAt: now - 1 * 60 * 60 * 1000, // 1 hour ago
      expiresAt: now + 23 * 60 * 60 * 1000,
      isCounter: false,
    },
  ];
}

// Generate mock offers where user is the SELLER (offers received on their items)
export function getMyOffersReceived(): MockOffer[] {
  const currentWallet = getCurrentWallet();
  const now = Date.now();
  
  return [
    {
      offerId: 'offer_4',
      itemId: mockItems[0].id,
      itemTitle: mockItems[0].title,
      itemImage: mockItems[0].image,
      buyerAddress: mockWallets[1],
      sellerAddress: currentWallet,
      amount: 12,
      message: 'This is exactly what I\'ve been looking for!',
      status: 'pending',
      createdAt: now - 1 * 60 * 60 * 1000, // 1 hour ago
      expiresAt: now + 23 * 60 * 60 * 1000,
      isCounter: false,
    },
    {
      offerId: 'offer_5',
      itemId: mockItems[0].id,
      itemTitle: mockItems[0].title,
      itemImage: mockItems[0].image,
      buyerAddress: mockWallets[2],
      sellerAddress: currentWallet,
      amount: 9,
      message: 'Would you accept $9?',
      status: 'pending',
      createdAt: now - 3 * 60 * 60 * 1000, // 3 hours ago
      expiresAt: now + 21 * 60 * 60 * 1000,
      isCounter: false,
    },
  ];
}

// Get items that the current user has listed
export function getMyListedItems(): MyListedItem[] {
  const now = Date.now();
  
  return [
    {
      itemId: mockItems[0].id,
      itemTitle: mockItems[0].title,
      itemImage: mockItems[0].image,
      price: 10.15,
      status: 'active',
      offersCount: 2,
      listedAt: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    },
  ];
}

// Generate mock active transactions (escrows)
export function getMyTransactions(): MockTransaction[] {
  const currentWallet = getCurrentWallet();
  const now = Date.now();
  
  return [
    {
      transactionId: 'tx_1',
      itemId: mockItems[1].id,
      itemTitle: mockItems[1].title,
      itemImage: mockItems[1].image,
      buyerAddress: currentWallet,
      sellerAddress: mockWallets[1],
      amount: 30,
      status: 'awaiting_shipping',
      buyerShippingInfo: {
        address: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'USA',
      },
      createdAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
    },
    {
      transactionId: 'tx_2',
      itemId: mockItems[2].id,
      itemTitle: mockItems[2].title,
      itemImage: mockItems[2].image,
      buyerAddress: mockWallets[3],
      sellerAddress: currentWallet,
      amount: 32,
      status: 'awaiting_shipping',
      buyerShippingInfo: {
        address: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
      },
      createdAt: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    },
  ];
}

// Mock action functions (will be replaced with real blockchain transactions)
export async function mockAcceptOffer(offerId: string): Promise<void> {
  console.log('Mock: Accepting offer', offerId);
  // TODO: Replace with buildAcceptOfferTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockRejectOffer(offerId: string): Promise<void> {
  console.log('Mock: Rejecting offer', offerId);
  // TODO: Replace with buildRejectOfferTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockCounterOffer(offerId: string, amount: number, message: string): Promise<void> {
  console.log('Mock: Countering offer', offerId, amount, message);
  // TODO: Replace with buildCounterOfferTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockAcceptCounterOffer(offerId: string): Promise<void> {
  console.log('Mock: Accepting counter offer', offerId);
  // TODO: Replace with buildAcceptCounterOfferTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockCancelOffer(offerId: string): Promise<void> {
  console.log('Mock: Cancelling offer', offerId);
  // TODO: Replace with buildCancelOfferTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockSubmitShipping(transactionId: string, trackingNumber: string, carrier: string): Promise<void> {
  console.log('Mock: Submitting shipping info', transactionId, trackingNumber, carrier);
  // TODO: Replace with real blockchain transaction
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockSubmitBuyerShipping(transactionId: string, shippingInfo: {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}): Promise<void> {
  console.log('Mock: Submitting buyer shipping info', transactionId, shippingInfo);
  // TODO: Replace with real blockchain transaction
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function mockConfirmDelivery(transactionId: string): Promise<void> {
  console.log('Mock: Confirming delivery', transactionId);
  // TODO: Replace with buildConfirmDeliveryTransaction()
  await new Promise(resolve => setTimeout(resolve, 1000));
}
