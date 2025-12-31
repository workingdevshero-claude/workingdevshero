import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as fs from "fs";

// Generate a new keypair
const keypair = Keypair.generate();

// Get the public key (wallet address)
const publicKey = keypair.publicKey.toBase58();

// Get the secret key (private key) as base58
const secretKeyBase58 = bs58.encode(keypair.secretKey);

// Get the secret key as JSON array (compatible with Solana CLI)
const secretKeyArray = Array.from(keypair.secretKey);

// Create wallet info object
const walletInfo = {
  publicKey,
  secretKeyBase58,
  secretKeyArray,
  createdAt: new Date().toISOString(),
  note: "WorkingDevsHero.com Payment Wallet - Keep this secure!"
};

// Save to file
const outputPath = "/home/claude/Desktop/solana-wallet.txt";
const content = `WorkingDevsHero.com Solana Payment Wallet
==========================================

Public Key (Payment Address):
${publicKey}

Secret Key (Base58):
${secretKeyBase58}

Secret Key (JSON Array - Compatible with Solana CLI):
${JSON.stringify(secretKeyArray)}

Created: ${walletInfo.createdAt}

IMPORTANT: Keep this file secure! Anyone with the secret key can access the funds.
`;

fs.writeFileSync(outputPath, content);
console.log("Wallet generated successfully!");
console.log("\nPayment Address:", publicKey);
console.log("\nWallet info saved to:", outputPath);
