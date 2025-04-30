import { Transaction, PublicKey } from "@solana/web3.js";

// Interface for wallet signers
export interface WalletSigner {
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  // Optionally add other methods like signAllTransactions, signMessage, etc.
}

export interface WalletContextType {
  publicKey: PublicKey | null;
  connectWallet: (key: PublicKey, signer?: WalletSigner) => void;
  clearWallet: () => void;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  connected: boolean;
}