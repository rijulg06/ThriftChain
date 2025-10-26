'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';
import { toast } from 'sonner';
import { LoginModal } from '@/components/LoginModal';
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
  getMyOffersMade,
  getMyOffersReceived,
  getMyTransactions,
  getMyListedItems,
  mockAcceptOffer,
  mockRejectOffer,
  mockCounterOffer,
  mockAcceptCounterOffer,
  mockCancelOffer,
  mockSubmitShipping,
  mockSubmitBuyerShipping,
  mockConfirmDelivery,
  type MockOffer,
  type MockTransaction,
  type MyListedItem,
} from '@/lib/data/mock-offers';

type Tab = 'my-items' | 'my-offers' | 'transactions';

export default function StashPage() {
  const router = useRouter();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('my-items');
  const [myItems, setMyItems] = useState<MyListedItem[]>([]);
  const [offersMade, setOffersMade] = useState<MockOffer[]>([]);
  const [offersReceived, setOffersReceived] = useState<MockOffer[]>([]);
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real blockchain queries
      const items = getMyListedItems();
      const made = getMyOffersMade();
      const received = getMyOffersReceived();
      const txs = getMyTransactions();
      
      setMyItems(items);
      setOffersMade(made);
      setOffersReceived(received);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setAlertConfig({
      title: 'Accept Offer',
      description: 'Accept this offer? This will create an escrow and lock the item.',
      actionLabel: 'Accept',
      action: async () => {
        try {
          await mockAcceptOffer(offerId);
          toast.success('Offer accepted! Escrow created.');
          loadData();
        } catch (error) {
          console.error('Error accepting offer:', error);
          toast.error('Failed to accept offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleRejectOffer = async (offerId: string) => {
    setAlertConfig({
      title: 'Reject Offer',
      description: 'Are you sure you want to reject this offer?',
      actionLabel: 'Reject',
      action: async () => {
        try {
          await mockRejectOffer(offerId);
          toast.success('Offer rejected');
          loadData();
        } catch (error) {
          console.error('Error rejecting offer:', error);
          toast.error('Failed to reject offer');
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
      await mockCounterOffer(counterOfferId, parseFloat(counterAmount), counterMessage);
      toast.success('Counter offer sent!');
      setCounterModalOpen(false);
      setCounterOfferId(null);
      setCounterAmount('');
      setCounterMessage('');
      loadData();
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
          await mockAcceptCounterOffer(offerId);
          toast.success('Counter offer accepted! Escrow created.');
          loadData();
        } catch (error) {
          console.error('Error accepting counter:', error);
          toast.error('Failed to accept counter offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleCancelOffer = async (offerId: string) => {
    setAlertConfig({
      title: 'Cancel Offer',
      description: 'Are you sure you want to cancel this offer?',
      actionLabel: 'Cancel Offer',
      action: async () => {
        try {
          await mockCancelOffer(offerId);
          toast.success('Offer cancelled');
          loadData();
        } catch (error) {
          console.error('Error cancelling offer:', error);
          toast.error('Failed to cancel offer');
        }
      },
    });
    setAlertOpen(true);
  };

  const handleOpenShippingModal = (txId: string) => {
    setShippingTxId(txId);
    setTrackingNumber('');
    setCarrier('USPS');
    setShippingModalOpen(true);
  };

  const handleSubmitShipping = async () => {
    if (!shippingTxId || !trackingNumber) return;
    
    try {
      await mockSubmitShipping(shippingTxId, trackingNumber, carrier);
      toast.success('Shipping info submitted!');
      setShippingModalOpen(false);
      setShippingTxId(null);
      setTrackingNumber('');
      loadData();
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
      await mockSubmitBuyerShipping(buyerShippingTxId, shippingAddress);
      toast.success('Shipping address submitted!');
      setBuyerShippingModalOpen(false);
      setBuyerShippingTxId(null);
      loadData();
    } catch (error) {
      console.error('Error submitting shipping address:', error);
      toast.error('Failed to submit shipping address');
    }
  };

  const handleConfirmDelivery = async (txId: string) => {
    setAlertConfig({
      title: 'Confirm Delivery',
      description: 'Confirm you received this item? This will release funds to the seller.',
      actionLabel: 'Confirm',
      action: async () => {
        try {
          await mockConfirmDelivery(txId);
          toast.success('Delivery confirmed! Transaction complete.');
          loadData();
        } catch (error) {
          console.error('Error confirming delivery:', error);
          toast.error('Failed to confirm delivery');
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
                  className="retro-btn"
                >
                  List Your First Item
                </button>
              </div>
            ) : (
              myItems.map((item) => {
                const itemOffers = offersReceived.filter(o => o.itemId === item.itemId);
                
                return (
                  <div key={item.itemId} className="retro-card p-6">
                    <div className="flex gap-4 flex-col md:flex-row">
                      {/* Item Image */}
                      <img
                        src={item.itemImage}
                        alt={item.itemTitle}
                        className="w-full md:w-32 h-32 object-cover border-2 border-white cursor-pointer"
                        onClick={() => router.push(`/items/${item.itemId}`)}
                      />
                      
                      {/* Item Details */}
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/items/${item.itemId}`)}
                        >
                          {item.itemTitle}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm opacity-60">Listed Price</p>
                            <p className="text-2xl font-bold">${item.price} SUI</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Status</p>
                            <p className="font-bold">
                              {item.status === 'active' && '✅ Active'}
                              {item.status === 'sold' && '💰 Sold'}
                              {item.status === 'cancelled' && '🚫 Cancelled'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Offers</p>
                            <p className="font-bold">{item.offersCount} offers</p>
                          </div>
                        </div>

                        <p className="text-sm opacity-60 mb-4">
                          Listed: {formatDate(item.listedAt)}
                        </p>

                        {/* Show offers on this item */}
                        {itemOffers.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-bold text-sm opacity-80">Offers on this item:</h4>
                            {itemOffers.map((offer) => (
                              <div key={offer.offerId} className="p-4 bg-black/20 border-2 border-white/20">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-bold">
                                      ${offer.counterAmount && offer.status === 'countered' ? offer.counterAmount : offer.amount} SUI
                                      {offer.counterAmount && offer.status === 'countered' && (
                                        <span className="text-sm opacity-60 ml-2">(was ${offer.amount})</span>
                                      )}
                                    </p>
                                    <p className="text-sm opacity-60">From: {shortenAddress(offer.buyerAddress)}</p>
                                  </div>
                                  <span className="text-sm font-bold">
                                    {offer.status === 'pending' && '⏳ Pending'}
                                    {offer.status === 'countered' && '💬 Countered'}
                                    {offer.status === 'accepted' && '✅ Accepted'}
                                    {offer.status === 'rejected' && '❌ Rejected'}
                                  </span>
                                </div>
                                
                                {offer.message && (
                                  <p className="text-sm mb-3">&quot;{offer.message}&quot;</p>
                                )}

                                {offer.counterMessage && offer.status === 'countered' && (
                                  <div className="mb-3 p-2 bg-yellow-500/20 border-2 border-yellow-500">
                                    <p className="text-xs opacity-60 mb-1">Your Counter Message:</p>
                                    <p className="text-sm">&quot;{offer.counterMessage}&quot;</p>
                                  </div>
                                )}

                                {offer.status === 'pending' && (
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => handleAcceptOffer(offer.offerId)}
                                      className="retro-btn bg-green-600 hover:bg-green-700 px-4 py-2 text-sm"
                                    >
                                      ✅ Accept
                                    </button>
                                    <button
                                      onClick={() => handleOpenCounterModal(offer.offerId, offer.amount)}
                                      className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-4 py-2 text-sm"
                                    >
                                      💬 Counter
                                    </button>
                                    <button
                                      onClick={() => handleRejectOffer(offer.offerId)}
                                      className="retro-btn bg-red-600 hover:bg-red-700 px-4 py-2 text-sm"
                                    >
                                      ❌ Reject
                                    </button>
                                  </div>
                                )}

                                {offer.status === 'countered' && (
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => handleAcceptCounter(offer.offerId)}
                                      className="retro-btn bg-green-600 hover:bg-green-700 px-4 py-2 text-sm"
                                    >
                                      ✅ Accept Their Counter
                                    </button>
                                    <button
                                      onClick={() => handleOpenCounterModal(offer.offerId, offer.counterAmount || offer.amount)}
                                      className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-4 py-2 text-sm"
                                    >
                                      💬 Counter Again
                                    </button>
                                    <button
                                      onClick={() => handleRejectOffer(offer.offerId)}
                                      className="retro-btn bg-red-600 hover:bg-red-700 px-4 py-2 text-sm"
                                    >
                                      ❌ Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
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
                  className="retro-btn"
                >
                  Browse Items
                </button>
              </div>
            ) : (
              offersMade.map((offer) => (
                <div key={offer.offerId} className="retro-card p-6">
                  <div className="flex gap-4 flex-col md:flex-row">
                    {/* Item Image */}
                    <img
                      src={offer.itemImage}
                      alt={offer.itemTitle}
                      className="w-full md:w-32 h-32 object-cover border-2 border-white cursor-pointer"
                      onClick={() => router.push(`/items/${offer.itemId}`)}
                    />
                    
                    {/* Offer Details */}
                    <div className="flex-1">
                      <h3
                        className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                        onClick={() => router.push(`/items/${offer.itemId}`)}
                      >
                        {offer.itemTitle}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm opacity-60">Your Offer</p>
                          <p className="text-2xl font-bold">${offer.amount} SUI</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-60">Status</p>
                          <p className="font-bold">
                            {offer.status === 'pending' && '⏳ Pending'}
                            {offer.status === 'countered' && '💬 Countered'}
                            {offer.status === 'accepted' && '✅ Accepted'}
                            {offer.status === 'rejected' && '❌ Rejected'}
                            {offer.status === 'cancelled' && '🚫 Cancelled'}
                          </p>
                        </div>
                      </div>

                      {offer.message && (
                        <div className="mb-4 p-4 bg-black/20 border-2 border-white/20">
                          <p className="text-sm opacity-60 mb-1">Your Message:</p>
                          <p>{offer.message}</p>
                        </div>
                      )}

                      {/* Counter Offer Display */}
                      {offer.status === 'countered' && offer.counterAmount && (
                        <div className="mb-4 p-4 bg-yellow-500/20 border-4 border-yellow-500">
                          <p className="font-bold mb-2">💬 Seller Countered with ${offer.counterAmount} SUI</p>
                          {offer.counterMessage && (
                            <p className="mb-3 opacity-90">&quot;{offer.counterMessage}&quot;</p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleAcceptCounter(offer.offerId)}
                              className="retro-btn bg-green-600 hover:bg-green-700 px-6 py-3"
                            >
                              Accept Counter
                            </button>
                            <button
                              onClick={() => handleOpenCounterModal(offer.offerId, offer.counterAmount || offer.amount)}
                              className="retro-btn bg-yellow-600 hover:bg-yellow-700 px-6 py-3"
                            >
                              Counter Again
                            </button>
                            <button
                              onClick={() => handleCancelOffer(offer.offerId)}
                              className="retro-btn bg-red-600 hover:bg-red-700 px-6 py-3"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Accepted Offer - Need Shipping Address */}
                      {offer.status === 'accepted' && (
                        <div className="mb-4 p-4 bg-green-500/20 border-4 border-green-500">
                          <p className="font-bold mb-2">✅ Offer Accepted! Next Step: Provide Shipping Address</p>
                          <p className="mb-3 opacity-90">The seller has accepted your offer. Please enter your shipping address to continue.</p>
                          <button
                            onClick={() => handleOpenBuyerShippingModal(offer.offerId)}
                            className="retro-btn bg-blue-600 hover:bg-blue-700 px-6 py-3"
                          >
                            📍 Enter Shipping Address
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2 items-center text-sm opacity-60">
                        <span>To: {shortenAddress(offer.sellerAddress)}</span>
                        <span>•</span>
                        <span>{formatDate(offer.createdAt)}</span>
                        {offer.status === 'pending' && (
                          <>
                            <span>•</span>
                            <span>Expires: {formatDate(offer.expiresAt)}</span>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {offer.status === 'pending' && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleCancelOffer(offer.offerId)}
                            className="retro-btn bg-red-600 hover:bg-red-700 px-6 py-3"
                          >
                            Cancel Offer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
                const isBuyer = tx.buyerAddress === wallet.address;
                const isSeller = tx.sellerAddress === wallet.address;
                
                return (
                  <div key={tx.transactionId} className="retro-card p-6">
                    <div className="flex gap-4 flex-col md:flex-row">
                      {/* Item Image */}
                      <img
                        src={tx.itemImage}
                        alt={tx.itemTitle}
                        className="w-full md:w-32 h-32 object-cover border-2 border-white cursor-pointer"
                        onClick={() => router.push(`/items/${tx.itemId}`)}
                      />
                      
                      {/* Transaction Details */}
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/items/${tx.itemId}`)}
                        >
                          {tx.itemTitle}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm opacity-60">Amount</p>
                            <p className="text-2xl font-bold">${tx.amount} SUI</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Role</p>
                            <p className="font-bold">{isBuyer ? '🛒 Buyer' : '📦 Seller'}</p>
                          </div>
                          <div>
                            <p className="text-sm opacity-60">Status</p>
                            <p className="font-bold">
                              {tx.status === 'awaiting_shipping' && '⏳ Awaiting Shipping'}
                              {tx.status === 'shipped' && '📦 Shipped'}
                              {tx.status === 'delivered' && '✅ Delivered'}
                              {tx.status === 'disputed' && '⚠️ Disputed'}
                              {tx.status === 'completed' && '✅ Completed'}
                            </p>
                          </div>
                        </div>

                        {/* Buyer Shipping Address for Sellers */}
                        {isSeller && tx.buyerShippingInfo && (
                          <div className="mb-4 p-4 bg-blue-500/20 border-4 border-blue-500">
                            <p className="font-bold mb-2">📍 Ship to:</p>
                            <p>{tx.buyerShippingInfo.address}</p>
                            <p>
                              {tx.buyerShippingInfo.city}, {tx.buyerShippingInfo.state} {tx.buyerShippingInfo.zip}
                            </p>
                            <p>{tx.buyerShippingInfo.country}</p>
                          </div>
                        )}

                        {/* Tracking Info */}
                        {tx.trackingNumber && (
                          <div className="mb-4 p-4 bg-green-500/20 border-4 border-green-500">
                            <p className="text-sm opacity-60 mb-1">Tracking Information</p>
                            <p className="font-mono">{tx.trackingNumber}</p>
                            <p className="text-sm mt-1">Carrier: {tx.shippingCarrier}</p>
                          </div>
                        )}

                        <div className="text-sm opacity-60 mb-4">
                          <span>Started: {formatDate(tx.createdAt)}</span>
                          {tx.completedAt && (
                            <>
                              <span> • </span>
                              <span>Completed: {formatDate(tx.completedAt)}</span>
                            </>
                          )}
                        </div>

                        {/* Actions Based on Status */}
                        {isSeller && tx.status === 'awaiting_shipping' && (
                          <button
                            onClick={() => handleOpenShippingModal(tx.transactionId)}
                            className="retro-btn bg-blue-600 hover:bg-blue-700 px-6 py-3"
                          >
                            📦 Add Shipping Info
                          </button>
                        )}

                        {isBuyer && tx.status === 'shipped' && (
                          <button
                            onClick={() => handleConfirmDelivery(tx.transactionId)}
                            className="retro-btn bg-green-600 hover:bg-green-700 px-6 py-3"
                          >
                            ✅ Confirm Delivery
                          </button>
                        )}

                        {tx.status === 'completed' && (
                          <div className="p-4 bg-green-500/20 border-4 border-green-500">
                            <p className="font-bold">✅ Transaction Complete!</p>
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
