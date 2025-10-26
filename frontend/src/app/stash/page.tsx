'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@suiet/wallet-kit';
import { toast } from 'sonner';
import { LoginModal } from '@/components/LoginModal';
import { getWalrusBlobUrl } from '@/lib/walrus/upload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getItemsBySeller,
  getOffersByBuyer,
  getOffersBySeller,
  getEscrowsByBuyer,
  getItemsByIds,
} from '@/lib/sui/queries';
import { suiClient } from '@/lib/sui/client';
import type { ThriftItemObject, OfferObject, EscrowObject } from '@/lib/types/sui-objects';
import { mistToSui, OfferStatus, ItemStatus, EscrowStatus } from '@/lib/types/sui-objects';
import { buildAcceptOfferTransaction, buildRejectOfferTransaction, buildCancelOfferTransaction } from '@/lib/sui/transactions';

// UI-friendly data structures (adapted from blockchain objects)
interface OfferWithItem extends OfferObject {
  itemTitle: string;
  itemImage: string;
  itemPrice: string;
}

interface EscrowWithItem extends EscrowObject {
  itemTitle: string;
  itemImage: string;
}

interface ItemWithOffers extends ThriftItemObject {
  offersCount: number;
}

type Tab = 'my-items' | 'my-offers' | 'transactions';

export default function StashPage() {
  const router = useRouter();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('my-items');
  const [myItems, setMyItems] = useState<ItemWithOffers[]>([]);
  const [offersMade, setOffersMade] = useState<OfferWithItem[]>([]);
  const [offersReceived, setOffersReceived] = useState<OfferWithItem[]>([]);
  const [transactions, setTransactions] = useState<EscrowWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Alert dialog states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    description: string;
    action: () => void;
    actionLabel: string;
  } | null>(null);
  
  // Modal states for counter offer
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  
  // Modal states for shipping
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingTxId, setShippingTxId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('USPS');
  
  // Modal states for buyer shipping address
  const [buyerShippingModalOpen, setBuyerShippingModalOpen] = useState(false);
  const [buyerShippingTxId, setBuyerShippingTxId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
  });

  // Login modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!wallet.account?.address) {
      console.warn('No wallet address available');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const address = wallet.account.address;

      // Fetch all data in parallel for better performance
      const [items, madeOffers, receivedOffers, escrows] = await Promise.all([
        getItemsBySeller(address),
        getOffersByBuyer(address),
        getOffersBySeller(address),
        getEscrowsByBuyer(address),
      ]);

      // Get unique item IDs from offers and escrows to fetch item details
      const offerItemIds = [...madeOffers, ...receivedOffers].map(o => o.fields.item_id);
      const escrowItemIds = escrows.map(e => e.fields.item_id);
      const allItemIds = [...new Set([...offerItemIds, ...escrowItemIds])];

      // Fetch item details for offers and escrows
      const itemDetails = allItemIds.length > 0
        ? await getItemsByIds(allItemIds)
        : [];

      // Create lookup map for item details
      const itemMap = new Map(itemDetails.map(item => [item.objectId, item]));

      // Helper to get Walrus image URL
      const getImageUrl = (item: ThriftItemObject | undefined) => {
        if (!item || !item.fields.walrus_image_ids || item.fields.walrus_image_ids.length === 0) {
          return '/placeholder-image.png'; // Fallback image
        }
        const blobId = item.fields.walrus_image_ids[0];
        return getWalrusBlobUrl(blobId);
      };

      // Map items with offer counts
      const receivedOffersByItem = new Map<string, number>();
      receivedOffers.forEach(offer => {
        const itemId = offer.fields.item_id;
        receivedOffersByItem.set(itemId, (receivedOffersByItem.get(itemId) || 0) + 1);
      });

      const itemsWithOffers: ItemWithOffers[] = items.map(item => ({
        ...item,
        offersCount: receivedOffersByItem.get(item.objectId) || 0,
      }));

      // Map offers made with item details
      const offersMadeWithItems: OfferWithItem[] = madeOffers.map(offer => {
        const item = itemMap.get(offer.fields.item_id);
        return {
          ...offer,
          itemTitle: item?.fields.title || 'Unknown Item',
          itemImage: getImageUrl(item),
          itemPrice: item?.fields.price || '0',
        };
      });

      // Map offers received with item details
      const offersReceivedWithItems: OfferWithItem[] = receivedOffers.map(offer => {
        const item = itemMap.get(offer.fields.item_id);
        return {
          ...offer,
          itemTitle: item?.fields.title || 'Unknown Item',
          itemImage: getImageUrl(item),
          itemPrice: item?.fields.price || '0',
        };
      });

      // Map escrows with item details
      const escrowsWithItems: EscrowWithItem[] = escrows.map(escrow => {
        const item = itemMap.get(escrow.fields.item_id);
        return {
          ...escrow,
          itemTitle: item?.fields.title || 'Unknown Item',
          itemImage: getImageUrl(item),
        };
      });

      setMyItems(itemsWithOffers);
      setOffersMade(offersMadeWithItems);
      setOffersReceived(offersReceivedWithItems);
      setTransactions(escrowsWithItems);
    } catch (error) {
      console.error('Error loading blockchain data:', error);
      toast.error('Failed to load data from blockchain');
    } finally {
      setLoading(false);
    }
  }, [wallet.account?.address]);

  useEffect(() => {
    if (wallet.connected && wallet.account?.address) {
      loadData();
    }
  }, [wallet.connected, wallet.account?.address, loadData]);

  const handleAcceptOffer = async (offerId: string, itemId: string) => {
    if (!wallet.account?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    setAlertConfig({
      title: 'Accept Offer',
      description: "Accept this offer? The buyer's payment is already in escrow. They will need to confirm delivery to release funds to you.",
      actionLabel: 'Accept Offer',
      action: async () => {
        try {
          const tx = buildAcceptOfferTransaction({
            offerId,
            itemId,
          });

          const result = await wallet.signAndExecuteTransaction({
            transaction: tx,
          });

          console.log('Accept offer result:', result);

          // Wait for transaction to get full effects
          const txResult = await suiClient.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
            },
          });

          if (txResult.effects?.status?.status === 'success') {
            toast.success('Offer accepted! Waiting for buyer to confirm delivery.');
            await loadData();
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error accepting offer:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to accept offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleRejectOffer = async (offerId: string) => {
    if (!wallet.account?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    setAlertConfig({
      title: 'Reject Offer',
      description: 'Are you sure you want to reject this offer? This action cannot be undone.',
      actionLabel: 'Reject Offer',
      action: async () => {
        try {
          // Build transaction
          const tx = buildRejectOfferTransaction(offerId);

          // Sign and execute transaction
          const result = await wallet.signAndExecuteTransaction({
            transaction: tx,
          });

          console.log('Reject offer result:', result);

          // Wait for transaction to get full effects
          const txResult = await suiClient.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
            },
          });

          if (txResult.effects?.status?.status === 'success') {
            toast.success('Offer rejected');
            await loadData(); // Refresh data
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error rejecting offer:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to reject offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleOpenCounterModal = (offerId: string, currentAmount: number) => {
    setCounterOfferId(offerId);
    setCounterAmount(currentAmount.toString());
    setCounterMessage('');
    setCounterModalOpen(true);
  };

  const handleSubmitCounter = async () => {
    if (!counterOfferId || !counterAmount) return;

    try {
      // TODO: Implement with buildCounterOfferTransaction()
      toast.info('Counter offer functionality coming soon!');
      console.log('Counter offer:', counterOfferId, counterAmount, counterMessage);
      setCounterModalOpen(false);
      setCounterOfferId(null);
      setCounterAmount('');
      setCounterMessage('');
      // await buildCounterOfferTransaction(...)
      // loadData();
    } catch (error) {
      console.error('Error sending counter offer:', error);
      toast.error('Failed to send counter offer');
    }
  };

  const handleAcceptCounter = async (offerId: string) => {
    setAlertConfig({
      title: 'Accept Counter Offer',
      description: 'Accept this counter offer? This will create an escrow.',
      actionLabel: 'Accept',
      action: async () => {
        try {
          // TODO: Implement with buildAcceptCounterOfferTransaction()
          toast.info('Accept counter offer functionality coming soon!');
          console.log('Accept counter offer:', offerId);
          // await buildAcceptCounterOfferTransaction(...)
          // loadData();
        } catch (error) {
          console.error('Error accepting counter:', error);
          toast.error('Failed to accept counter offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!wallet.account?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    setAlertConfig({
      title: 'Cancel Offer',
      description: 'Are you sure you want to cancel this offer? Your locked payment will be refunded.',
      actionLabel: 'Cancel Offer',
      action: async () => {
        try {
          // Build transaction
          const tx = buildCancelOfferTransaction(offerId);

          // Sign and execute transaction
          const result = await wallet.signAndExecuteTransaction({
            transaction: tx,
          });

          console.log('Cancel offer result:', result);

          // Wait for transaction to get full effects
          const txResult = await suiClient.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
            },
          });

          if (txResult.effects?.status?.status === 'success') {
            toast.success('Offer cancelled and payment refunded');
            await loadData(); // Refresh data
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error cancelling offer:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to cancel offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleSubmitShipping = async () => {
    if (!shippingTxId || !trackingNumber) return;

    try {
      // TODO: Store shipping info on-chain or in Supabase
      toast.info('Shipping info submission coming soon!');
      console.log('Submit shipping:', shippingTxId, trackingNumber, carrier);
      setShippingModalOpen(false);
      setShippingTxId(null);
      setTrackingNumber('');
      // loadData();
    } catch (error) {
      console.error('Error submitting shipping:', error);
      toast.error('Failed to submit shipping info');
    }
  };

  const handleOpenBuyerShippingModal = (txId: string) => {
    setBuyerShippingTxId(txId);
    setShippingAddress({
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
    });
    setBuyerShippingModalOpen(true);
  };

  const handleSubmitBuyerShipping = async () => {
    if (!buyerShippingTxId || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      toast.error('Please fill in all shipping fields');
      return;
    }

    try {
      // TODO: Store buyer shipping address on-chain or in Supabase
      toast.info('Shipping address submission coming soon!');
      console.log('Submit buyer shipping:', buyerShippingTxId, shippingAddress);
      setBuyerShippingModalOpen(false);
      setBuyerShippingTxId(null);
      // loadData();
    } catch (error) {
      console.error('Error submitting shipping address:', error);
      toast.error('Failed to submit shipping address');
    }
  };

  const handleConfirmDelivery = async (escrowId: string, itemId: string) => {
    if (!wallet.account?.address) {
      toast.error('Please connect your wallet');
      return;
    }

    setAlertConfig({
      title: 'Confirm Delivery',
      description: 'Confirm you received this item? This will release funds to the seller and cannot be reversed!',
      actionLabel: 'Confirm Delivery',
      action: async () => {
        try {
          // Build transaction manually to call confirm_delivery_by_id
          const { Transaction } = await import('@mysten/sui/transactions');
          const tx = new Transaction();

          const PACKAGE_ID = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID!;
          const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID!;
          const CLOCK_ID = '0x6';

          tx.moveCall({
            target: `${PACKAGE_ID}::thriftchain::confirm_delivery_by_id`,
            arguments: [
              tx.object(MARKETPLACE_ID),
              tx.pure.id(escrowId),
              tx.pure.id(itemId),
              tx.object(CLOCK_ID),
            ],
          });

          tx.setGasBudget(100_000_000);

          // Sign and execute transaction
          const result = await wallet.signAndExecuteTransaction({
            transaction: tx,
          });

          console.log('Confirm delivery result:', result);

          // Wait for transaction to get full effects
          const txResult = await suiClient.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
            },
          });

          if (txResult.effects?.status?.status === 'success') {
            toast.success('Delivery confirmed! Funds released to seller.');
            await loadData(); // Refresh data
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error confirming delivery:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to confirm delivery');
        }
      },
    });
    setAlertOpen(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!wallet.connected) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          <div className="retro-card retro-shadow p-6 text-center">
            <h2 className="text-xl mb-3">Wallet Not Connected</h2>
            <p className="opacity-80 mb-4">Please connect your wallet to view your stash</p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="retro-btn px-6 py-3"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">📦</div>
          <p>Loading your stash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header Card - Similar to listings page */}
        <div className="retro-card retro-shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-4xl font-black mb-2">My Stash</h1>
              <p className="text-lg opacity-80">
                Manage your offers and transactions
              </p>
            </div>
            <button
              onClick={() => router.push('/list-item')}
              className="retro-btn px-6 py-3 bg-black text-white whitespace-nowrap cursor-pointer"
            >
              📝 List Item
            </button>
          </div>
          
          {/* Stats */}
          {!loading && (
            <div className="mt-4 pt-4 border-t-2 border-black border-dashed">
              <div className="flex gap-6 text-sm flex-wrap">
                <div>
                  <span className="font-bold">{myItems.length}</span>
                  <span className="opacity-60 ml-1">items listed</span>
                </div>
                <div>
                  <span className="font-bold">{offersMade.length}</span>
                  <span className="opacity-60 ml-1">offers made</span>
                </div>
                <div>
                  <span className="font-bold">{transactions.length}</span>
                  <span className="opacity-60 ml-1">active transactions</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto h-20">
          <button
            onClick={() => setActiveTab('my-items')}
            className={`retro-btn px-6 py-3 whitespace-nowrap h-16 ${
              activeTab === 'my-items' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            My Items ({myItems.length})
          </button>
          <button
            onClick={() => setActiveTab('my-offers')}
            className={`retro-btn px-6 py-3 whitespace-nowrap h-16 ${
              activeTab === 'my-offers' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            My Offers ({offersMade.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`retro-btn px-6 py-3 whitespace-nowrap h-16 ${
              activeTab === 'transactions' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            Transactions ({transactions.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'my-items' && (
          <div className="space-y-4">
            {myItems.length === 0 ? (
              <div className="retro-card p-8 text-center">
                <p className="mb-4 text-xl">No items listed yet</p>
                <button
                  onClick={() => router.push('/list-item')}
                  className="retro-btn p-4"
                >
                  List Your First Item
                </button>
              </div>
            ) : (
              myItems.map((item) => {
                const itemOffers = offersReceived.filter(o => o.fields.item_id === item.objectId);
                const itemImageUrl = item.fields.walrus_image_ids && item.fields.walrus_image_ids.length > 0
                  ? getWalrusBlobUrl(item.fields.walrus_image_ids[0])
                  : '/placeholder-image.png';

                return (
                  <div key={item.objectId} className="retro-card p-6">
                    <div className="flex gap-4 flex-col md:flex-row">
                      {/* Item Image */}
                      <div
                        className="relative w-full md:w-32 h-32 border-2 border-white cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/items/${item.objectId}`)}
                      >
                        <Image
                          src={itemImageUrl}
                          alt={item.fields.title}
                          fill
                          sizes="(min-width: 768px) 128px, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/items/${item.objectId}`)}
                        >
                          {item.fields.title}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm opacity-60">Listed Price</p>
                            <p className="text-2xl font-bold">{mistToSui(item.fields.price).toFixed(2)} SUI</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Status</p>
                            <p className="font-bold">
                              {item.fields.status === ItemStatus.Active && '✅ Active'}
                              {item.fields.status === ItemStatus.Sold && '💰 Sold'}
                              {item.fields.status === ItemStatus.Cancelled && '🚫 Cancelled'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Offers</p>
                            <p className="font-bold">{item.offersCount} offers</p>
                          </div>
                        </div>

                        <p className="text-sm opacity-60 mb-4">
                          Listed: {formatDate(parseInt(item.fields.created_at))}
                        </p>

                        {/* Show offers on this item */}
                        {itemOffers.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-bold text-sm opacity-80">Offers on this item:</h4>
                            {itemOffers.map((offer) => {
                              const offerAmount = mistToSui(offer.fields.amount).toFixed(2);
                              const isCountered = offer.fields.status === OfferStatus.Countered;

                              return (
                                <div key={offer.objectId} className="p-4 bg-black/20 border-2 border-white/20">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-bold">
                                        {offerAmount} SUI
                                      </p>
                                      <p className="text-sm opacity-60">From: {shortenAddress(offer.fields.buyer)}</p>
                                    </div>
                                    <span className="text-sm font-bold">
                                      {offer.fields.status === OfferStatus.Pending && '⏳ Pending'}
                                      {offer.fields.status === OfferStatus.Countered && '💬 Countered'}
                                      {offer.fields.status === OfferStatus.Accepted && '✅ Accepted'}
                                      {offer.fields.status === OfferStatus.Rejected && '❌ Rejected'}
                                    </span>
                                  </div>

                                  {offer.fields.message && (
                                    <p className="text-sm mb-3">&quot;{offer.fields.message}&quot;</p>
                                  )}

                                  {offer.fields.status === OfferStatus.Pending && (
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={() => handleAcceptOffer(offer.objectId, offer.fields.item_id)}
                                        className="retro-btn bg-green-600 hover:bg-green-700 px-4 py-2 text-sm"
                                      >
                                        ✅ Accept
                                      </button>
                                      <button
                                        onClick={() => handleOpenCounterModal(offer.objectId, parseFloat(offerAmount))}
                                        className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-4 py-2 text-sm"
                                      >
                                        💬 Counter
                                      </button>
                                      <button
                                        onClick={() => handleRejectOffer(offer.objectId)}
                                        className="retro-btn bg-red-600 hover:bg-red-700 px-4 py-2 text-sm"
                                      >
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}

                                  {isCountered && (
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={() => handleAcceptCounter(offer.objectId)}
                                        className="retro-btn bg-green-600 hover:bg-green-700 px-4 py-2 text-sm"
                                      >
                                        ✅ Accept Their Counter
                                      </button>
                                      <button
                                        onClick={() => handleOpenCounterModal(offer.objectId, parseFloat(offerAmount))}
                                        className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-4 py-2 text-sm"
                                      >
                                        💬 Counter Again
                                      </button>
                                      <button
                                        onClick={() => handleRejectOffer(offer.objectId)}
                                        className="retro-btn bg-red-600 hover:bg-red-700 px-4 py-2 text-sm"
                                      >
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'my-offers' && (
          <div className="space-y-4">
            {offersMade.length === 0 ? (
              <div className="retro-card p-8 text-center">
                <p className="mb-4 text-xl">No offers made yet</p>
                <button
                  onClick={() => router.push('/listings')}
                  className="retro-btn p-4"
                >
                  Browse Items
                </button>
              </div>
            ) : (
              offersMade.map((offer) => {
                const offerAmount = mistToSui(offer.fields.amount).toFixed(2);
                const isCountered = offer.fields.status === OfferStatus.Countered;
                const isPending = offer.fields.status === OfferStatus.Pending;
                const isAccepted = offer.fields.status === OfferStatus.Accepted;

                return (
                  <div key={offer.objectId} className="retro-card p-6">
                    <div className="flex gap-4 flex-col md:flex-row">
                      {/* Item Image */}
                      <div
                        className="relative w-full md:w-32 h-32 border-2 border-white cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/items/${offer.fields.item_id}`)}
                      >
                        <Image
                          src={offer.itemImage}
                          alt={offer.itemTitle}
                          fill
                          sizes="(min-width: 768px) 128px, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      {/* Offer Details */}
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/items/${offer.fields.item_id}`)}
                        >
                          {offer.itemTitle}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm opacity-60">Your Offer</p>
                            <p className="text-2xl font-bold">{offerAmount} SUI</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Status</p>
                            <p className="font-bold">
                              {offer.fields.status === OfferStatus.Pending && '⏳ Pending'}
                              {offer.fields.status === OfferStatus.Countered && '💬 Countered'}
                              {offer.fields.status === OfferStatus.Accepted && '✅ Accepted'}
                              {offer.fields.status === OfferStatus.Rejected && '❌ Rejected'}
                              {offer.fields.status === OfferStatus.Cancelled && '🚫 Cancelled'}
                            </p>
                          </div>
                        </div>

                        {offer.fields.message && (
                          <div className="mb-4 p-4 bg-black/20 border-2 border-white/20">
                            <p className="text-sm opacity-60 mb-1">Your Message:</p>
                            <p>{offer.fields.message}</p>
                          </div>
                        )}

                        {/* Counter Offer Display */}
                        {isCountered && (
                          <div className="mb-4 p-4 bg-yellow-500/20 border-4 border-yellow-500">
                            <p className="font-bold mb-2">💬 Seller countered this offer</p>
                            <p className="mb-3 opacity-90">The seller has sent a counter offer. Updated amount: {offerAmount} SUI</p>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleAcceptCounter(offer.objectId)}
                                className="retro-btn bg-green-600 hover:bg-green-700 px-6 py-3"
                              >
                                Accept Counter
                              </button>
                              <button
                                onClick={() => handleOpenCounterModal(offer.objectId, parseFloat(offerAmount))}
                                className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                              >
                                Counter Again
                              </button>
                              <button
                                onClick={() => handleCancelOffer(offer.objectId)}
                                className="retro-btn bg-red-600 hover:bg-red-700 px-6 py-3"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Accepted Offer - Need Shipping Address */}
                        {isAccepted && (
                          <div className="mb-4 p-4 bg-green-500/20 border-4 border-green-500">
                            <p className="font-bold mb-2">✅ Offer Accepted! Next Step: Provide Shipping Address</p>
                            <p className="mb-3 opacity-90">The seller has accepted your offer. Please enter your shipping address to continue.</p>
                            <button
                              onClick={() => handleOpenBuyerShippingModal(offer.objectId)}
                              className="retro-btn bg-blue-600 hover:bg-blue-700 px-6 py-3"
                            >
                              📍 Enter Shipping Address
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2 items-center text-sm opacity-60">
                          <span>To: {shortenAddress(offer.fields.seller)}</span>
                          <span>•</span>
                          <span>{formatDate(parseInt(offer.fields.created_at))}</span>
                          {isPending && (
                            <>
                              <span>•</span>
                              <span>Expires: {formatDate(parseInt(offer.fields.expires_at))}</span>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        {isPending && (
                          <div className="mt-4">
                            <button
                              onClick={() => handleCancelOffer(offer.objectId)}
                              className="retro-btn bg-red-600 hover:bg-red-700 px-6 py-3"
                            >
                              Cancel Offer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="retro-card p-8 text-center">
                <p className="mb-4 text-xl">No active transactions</p>
                <p className="opacity-60">Transactions appear here after accepting an offer</p>
              </div>
            ) : (
              transactions.map((tx) => {
                const isBuyer = tx.fields.buyer === wallet.address;
                const escrowAmount = mistToSui(tx.fields.amount).toFixed(2);
                const isActive = tx.fields.status === EscrowStatus.Active;
                const isCompleted = tx.fields.status === EscrowStatus.Completed;
                const isDisputed = tx.fields.status === EscrowStatus.Disputed;

                return (
                  <div key={tx.objectId} className="retro-card p-6">
                    <div className="flex gap-4 flex-col md:flex-row">
                      {/* Item Image */}
                      <div
                        className="relative w-full md:w-32 h-32 border-2 border-white cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/items/${tx.fields.item_id}`)}
                      >
                        <Image
                          src={tx.itemImage}
                          alt={tx.itemTitle}
                          fill
                          sizes="(min-width: 768px) 128px, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/items/${tx.fields.item_id}`)}
                        >
                          {tx.itemTitle}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm opacity-60">Amount</p>
                            <p className="text-2xl font-bold">{escrowAmount} SUI</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Role</p>
                            <p className="font-bold">{isBuyer ? '🛒 Buyer' : '📦 Seller'}</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Status</p>
                            <p className="font-bold">
                              {isActive && '⏳ Active (In Escrow)'}
                              {isCompleted && '✅ Completed'}
                              {isDisputed && '⚠️ Disputed'}
                              {tx.fields.status === EscrowStatus.Refunded && '💰 Refunded'}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm opacity-60 mb-4">
                          <span>Started: {formatDate(parseInt(tx.fields.created_at))}</span>
                          {parseInt(tx.fields.completed_at) > 0 && (
                            <>
                              <span> • </span>
                              <span>Completed: {formatDate(parseInt(tx.fields.completed_at))}</span>
                            </>
                          )}
                        </div>

                        {/* Information message for active escrows */}
                        {isActive && (
                          <div className="mb-4 p-4 bg-blue-500/20 border-4 border-blue-500">
                            <p className="font-bold mb-2">💰 Funds in Escrow</p>
                            <p className="text-sm opacity-90">
                              {isBuyer
                                ? 'Your payment is held securely in escrow. Confirm delivery when you receive the item.'
                                : 'Buyer\'s payment is held in escrow. Ship the item and buyer will confirm delivery.'}
                            </p>
                          </div>
                        )}

                        {/* Actions Based on Status */}
                        {isBuyer && isActive && (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleConfirmDelivery(tx.objectId, tx.fields.item_id)}
                              className="retro-btn bg-green-600 hover:bg-green-700 px-6 py-3"
                            >
                              ✅ Confirm Delivery
                            </button>
                            <button
                              onClick={() => toast.info('Dispute functionality coming soon!')}
                              className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                            >
                              ⚠️ Dispute
                            </button>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="p-4 bg-green-500/20 border-4 border-green-500">
                            <p className="font-bold">✅ Transaction Complete!</p>
                            <p className="text-sm opacity-90 mt-1">
                              {isBuyer
                                ? 'You confirmed delivery. Funds released to seller.'
                                : 'Buyer confirmed delivery. You received payment.'}
                            </p>
                          </div>
                        )}

                        {isDisputed && (
                          <div className="p-4 bg-yellow-500/20 border-4 border-yellow-500">
                            <p className="font-bold">⚠️ Transaction Disputed</p>
                            <p className="text-sm opacity-90 mt-1">
                              This transaction is under dispute. Please contact support.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Alert Dialog for Confirmations */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="px-6 py-3">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="px-6 py-3"
              onClick={() => {
                alertConfig?.action();
                setAlertOpen(false);
              }}
            >
              {alertConfig?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Counter Offer Modal */}
      {counterModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="retro-card p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">💬 Counter Offer</h2>
            
            <div className="mb-6">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Counter Amount (SUI) *
              </label>
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white font-mono text-lg focus:outline-none"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Message (Optional)
              </label>
              <textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white resize-none focus:outline-none"
                rows={3}
                placeholder="Explain your counter offer..."
              />
            </div>

            <div className="flex gap-3">
                              <button
                onClick={() => {
                  setCounterModalOpen(false);
                  setCounterOfferId(null);
                  setCounterAmount('');
                  setCounterMessage('');
                }}
                className="retro-btn flex-1 bg-black hover:bg-neutral-900 px-6 py-3 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCounter}
                className="retro-btn flex-1 bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                disabled={!counterAmount}
              >
                Send Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Info Modal */}
      {shippingModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="retro-card p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">📦 Add Shipping Info</h2>
            
            <div className="mb-6">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Tracking Number *
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white font-mono focus:outline-none"
                placeholder="1Z999AA10123456784"
                required
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Shipping Carrier *
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
              >
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="DHL">DHL</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
                              <button
                onClick={() => {
                  setShippingModalOpen(false);
                  setShippingTxId(null);
                  setTrackingNumber('');
                }}
                className="retro-btn flex-1 bg-black hover:bg-neutral-900 px-6 py-3 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitShipping}
                className="retro-btn flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3"
                disabled={!trackingNumber}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buyer Shipping Address Modal */}
      {buyerShippingModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="retro-card p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">📍 Enter Shipping Address</h2>
            
            <div className="mb-4">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Street Address *
              </label>
              <input
                type="text"
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                City *
              </label>
              <input
                type="text"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
                placeholder="San Francisco"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm opacity-80 mb-2 font-bold">
                  State *
                </label>
                <input
                  type="text"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
                  placeholder="CA"
                  required
                />
              </div>
              <div>
                <label className="block text-sm opacity-80 mb-2 font-bold">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
                  placeholder="94102"
                  required
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm opacity-80 mb-2 font-bold">
                Country *
              </label>
              <input
                type="text"
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none"
                placeholder="United States"
                required
              />
            </div>

            <div className="flex gap-3">
                              <button
                onClick={() => {
                  setBuyerShippingModalOpen(false);
                  setBuyerShippingTxId(null);
                  setShippingAddress({
                    address: '',
                    city: '',
                    state: '',
                    zip: '',
                    country: ''
                  });
                }}
                className="retro-btn flex-1 bg-black hover:bg-neutral-900 px-6 py-3 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBuyerShipping}
                className="retro-btn flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3"
                disabled={!shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country}
              >
                Submit Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
