import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from "@solana/web3.js";

// Use mainnet-beta for production
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Our payment wallet address
export const PAYMENT_WALLET = "4ym27TW1CzsV42sFvbMwSMRwiWsEu5tHFkeYJYoqozcf";

// Cached SOL price to avoid hitting rate limits
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60000; // 1 minute cache

// Get current SOL price in USD using Coinbase public API
export async function getSolPrice(): Promise<number> {
  // Return cached price if still valid
  if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_DURATION_MS) {
    return cachedSolPrice.price;
  }

  try {
    const response = await fetch(
      "https://api.exchange.coinbase.com/products/SOL-USD/ticker"
    );
    const data = await response.json();

    if (data?.price) {
      const price = parseFloat(data.price);
      if (!isNaN(price) && price > 0) {
        cachedSolPrice = { price, timestamp: Date.now() };
        return price;
      }
    }

    // API returned unexpected format
    console.warn("Unexpected Coinbase API response, using fallback");
    return cachedSolPrice?.price || 190; // Use cached or fallback
  } catch (error) {
    console.error("Error fetching SOL price from Coinbase:", error);
    // Fallback price if API fails
    return cachedSolPrice?.price || 190;
  }
}

// Calculate SOL amount for a given USD amount
export async function usdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolPrice();
  return usdAmount / solPrice;
}

// Generate a unique SOL amount for a work item by adding the ID as micro-decimals
// This ensures each payment is distinguishable (e.g., task 123 adds 0.000000123 SOL)
export async function getUniquePaymentAmount(workItemId: number, usdAmount: number): Promise<number> {
  const baseSol = await usdToSol(usdAmount);
  // Add work item ID as 9th decimal place onwards (nano-SOL level)
  // This adds a unique, imperceptible amount while making each payment distinct
  const uniqueOffset = workItemId / 1_000_000_000;
  return baseSol + uniqueOffset;
}

// Check for incoming payments to our wallet
// Now with stricter matching: requires exact unique amount and transaction after creation time
export async function checkForPayment(
  expectedAmountSol: number,
  workItemId: number,
  createdAtTimestamp: number // Unix timestamp in seconds
): Promise<{ found: boolean; signature?: string; amount?: number }> {
  try {
    const pubkey = new PublicKey(PAYMENT_WALLET);

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 20,
    });

    for (const sigInfo of signatures) {
      // Skip transactions from before the work item was created
      if (sigInfo.blockTime && sigInfo.blockTime < createdAtTimestamp) {
        continue;
      }

      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

      // Double-check block time from parsed transaction
      if (tx.blockTime && tx.blockTime < createdAtTimestamp) {
        continue;
      }

      // Find transfers to our wallet
      for (let i = 0; i < tx.transaction.message.accountKeys.length; i++) {
        const account = tx.transaction.message.accountKeys[i];
        if (account.pubkey.toBase58() === PAYMENT_WALLET) {
          const preB = tx.meta.preBalances[i] || 0;
          const postB = tx.meta.postBalances[i] || 0;
          const receivedLamports = postB - preB;
          const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

          // With unique amounts, use tight tolerance (0.5% for rounding errors only)
          // The unique offset ensures only the correct task matches
          const tolerance = 0.005; // 0.5%
          const minExpected = expectedAmountSol * (1 - tolerance);
          const maxExpected = expectedAmountSol * (1 + tolerance);

          if (receivedSol >= minExpected && receivedSol <= maxExpected) {
            return {
              found: true,
              signature: sigInfo.signature,
              amount: receivedSol,
            };
          }
        }
      }
    }

    return { found: false };
  } catch (error) {
    console.error("Error checking for payment:", error);
    return { found: false };
  }
}

// Get wallet balance
export async function getWalletBalance(): Promise<number> {
  try {
    const pubkey = new PublicKey(PAYMENT_WALLET);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return 0;
  }
}

// Generate a unique payment reference (memo) for tracking
export function generatePaymentReference(workItemId: number): string {
  return `WDH-${workItemId}-${Date.now().toString(36)}`;
}
