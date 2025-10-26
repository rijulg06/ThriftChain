'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { suiToMist } from '@/lib/types/sui-objects';
import { suiClient } from '@/lib/sui/client';

const THRIFTCHAIN_PACKAGE_ID = process.env.NEXT_PUBLIC_THRIFTCHAIN_PACKAGE_ID || '';
const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_ID || '';
const CLOCK_ID = '0x6'; // Sui Clock object (standard on all Sui networks)

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  itemPrice: string; // Price in MIST
  sellerAddress: string;
  onSuccess?: () => void;
}

export function MakeOfferModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  itemPrice,
  sellerAddress,
  onSuccess,
}: MakeOfferModalProps) {
  const wallet = useWallet();
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [expiration, setExpiration] = useState('168'); // Default 7 days (168 hours)
  const [submitting, setSubmitting] = useState(false);

  // Calculate item price in SUI for display
  const itemPriceSui = (parseFloat(itemPrice) / 1_000_000_000).toFixed(2);

  const handleSubmit = async () => {
    if (!wallet.account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    // Validate user isn't offering on their own item
    if (wallet.account.address === sellerAddress) {
      toast.error('You cannot make an offer on your own item');
      return;
    }

    setSubmitting(true);

    try {
      // Convert SUI to MIST
      const amountMist = suiToMist(parseFloat(offerAmount));
      const expirationHours = parseInt(expiration);

      // Check wallet balance
      const balance = await suiClient.getBalance({
        owner: wallet.account.address,
      });

      const balanceBigInt = BigInt(balance.totalBalance);
      const requiredAmount = amountMist + BigInt(100_000_000); // Add ~0.1 SUI for gas

      if (balanceBigInt < requiredAmount) {
        toast.error(`Insufficient balance. You need ${(Number(requiredAmount) / 1_000_000_000).toFixed(4)} SUI (including gas)`);
        setSubmitting(false);
        return;
      }

      // Build transaction
      const tx = new Transaction();

      // Split coins to get exact payment amount
      const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);

      // Call create_offer_by_id with payment
      tx.moveCall({
        target: `${THRIFTCHAIN_PACKAGE_ID}::thriftchain::create_offer_by_id`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.id(itemId),
          tx.pure.u64(amountMist),
          tx.pure.string(message),
          tx.pure.u64(expirationHours),
          paymentCoin,
          tx.object(CLOCK_ID),
        ],
      });

      tx.setGasBudget(100_000_000); // 0.1 SUI gas budget

      // Sign and execute transaction
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      console.log('Offer creation result:', result);

      if (result.effects?.status?.status === 'success') {
        toast.success('Offer created successfully! Payment locked in escrow.');

        // Reset form
        setOfferAmount('');
        setMessage('');
        setExpiration('168');

        // Close modal
        onClose();

        // Callback for parent to refresh data
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="retro-card retro-shadow p-8 max-w-md w-full">
        <h2 className="text-2xl font-black mb-6">💰 Make an Offer</h2>

        {/* Item Info */}
        <div className="mb-6 p-4 bg-black/20 border-2 border-white/20">
          <p className="text-sm opacity-60 mb-1">Making offer on:</p>
          <p className="font-bold">{itemTitle}</p>
          <p className="text-sm mt-1">
            Listed Price: <span className="font-bold">{itemPriceSui} SUI</span>
          </p>
        </div>

        {/* Offer Amount */}
        <div className="mb-6">
          <label className="block text-sm opacity-80 mb-2 font-bold">
            Your Offer (SUI) *
          </label>
          <input
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-200 border-4 border-white font-mono text-lg focus:outline-none focus:border-black"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={submitting}
          />
          <p className="text-xs opacity-60 mt-1">
            ⚠️ Payment will be locked in escrow immediately
          </p>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm opacity-80 mb-2 font-bold">
            Message to Seller (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-200 border-4 border-white resize-none focus:outline-none focus:border-black"
            rows={3}
            placeholder="Hi! I'm interested in this item..."
            disabled={submitting}
          />
        </div>

        {/* Expiration */}
        <div className="mb-8">
          <label className="block text-sm opacity-80 mb-2 font-bold">
            Offer Expires In
          </label>
          <select
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-200 border-4 border-white focus:outline-none focus:border-black"
            disabled={submitting}
          >
            <option value="24">24 hours (1 day)</option>
            <option value="48">48 hours (2 days)</option>
            <option value="72">72 hours (3 days)</option>
            <option value="168">168 hours (7 days)</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="retro-btn flex-1 bg-black hover:bg-neutral-900 px-6 py-3 text-white"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="retro-btn flex-1 bg-green-600 hover:bg-green-700 px-6 py-3"
            disabled={submitting || !offerAmount || parseFloat(offerAmount) <= 0}
          >
            {submitting ? 'Submitting...' : 'Submit Offer'}
          </button>
        </div>

        {submitting && (
          <div className="mt-4 p-3 bg-blue-500/20 border-2 border-blue-500 text-center">
            <p className="text-sm">
              🔄 Creating offer and locking payment in escrow...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
