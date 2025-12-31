import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from "@solana/web3.js";

// Use mainnet-beta for production
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Our payment wallet address
export const PAYMENT_WALLET = "4ym27TW1CzsV42sFvbMwSMRwiWsEu5tHFkeYJYoqozcf";

// Cached SOL price to avoid hitting rate limits
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60000; // 1 minute cache

// Get current SOL price in USD (simplified - in production, use a price oracle)
export async function getSolPrice(): Promise<number> {
  // Return cached price if still valid
  if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_DURATION_MS) {
    return cachedSolPrice.price;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await response.json();

    if (data?.solana?.usd) {
      cachedSolPrice = { price: data.solana.usd, timestamp: Date.now() };
      return data.solana.usd;
    }

    // API returned unexpected format
    console.warn("Unexpected SOL price API response, using fallback");
    return cachedSolPrice?.price || 190; // Use cached or fallback
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    // Fallback price if API fails
    return cachedSolPrice?.price || 190;
  }
}

// Calculate SOL amount for a given USD amount
export async function usdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolPrice();
  return usdAmount / solPrice;
}

// Check for incoming payments to our wallet
export async function checkForPayment(
  expectedAmountSol: number,
  workItemId: number,
  sinceSignature?: string
): Promise<{ found: boolean; signature?: string; amount?: number }> {
  try {
    const pubkey = new PublicKey(PAYMENT_WALLET);

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 20,
      until: sinceSignature,
    });

    for (const sigInfo of signatures) {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

      // Check if this is an incoming SOL transfer
      const preBalance = tx.meta.preBalances[0];
      const postBalance = tx.meta.postBalances[0];

      // Find transfers to our wallet
      for (let i = 0; i < tx.transaction.message.accountKeys.length; i++) {
        const account = tx.transaction.message.accountKeys[i];
        if (account.pubkey.toBase58() === PAYMENT_WALLET) {
          const preB = tx.meta.preBalances[i] || 0;
          const postB = tx.meta.postBalances[i] || 0;
          const receivedLamports = postB - preB;
          const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

          // Check if amount matches (with 5% tolerance for price fluctuations)
          if (receivedSol >= expectedAmountSol * 0.95) {
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
