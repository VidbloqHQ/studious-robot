import { PublicKey, Transaction } from "@solana/web3.js";
import { WalletSigner } from "../types/index";

// Interface for wallet adapters (like from @solana/wallet-adapter)
interface WalletAdapterLike {
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  publicKey?: PublicKey | null;
  connected?: boolean;
  [key: string]: unknown; // Allow other properties
}

/**
 * Converts a wallet adapter to a WalletSigner interface
 * @param wallet - A wallet adapter with signTransaction method
 * @returns WalletSigner interface or undefined if the wallet doesn't support signing
 *
 * Usage example:
 * ```
 * // Using with @solana/wallet-adapter
 * const walletAdapter = useWallet();
 * const signer = adaptWalletToSigner(walletAdapter);
 *
 * // Using with a custom wallet implementation
 * const customWallet = window.myCustomWallet;
 * const signer = adaptWalletToSigner(customWallet);
 * ```
 */
export const adaptWalletToSigner = (
  wallet: WalletAdapterLike
): WalletSigner | undefined => {
  if (!wallet || typeof wallet.signTransaction !== "function") {
    return undefined;
  }

  return {
    signTransaction: wallet.signTransaction.bind(wallet),
    // Add other methods as needed
  };
};

// Global registry of wallet signers
const walletSigners: Record<string, WalletSigner> = {};

/**
 * Registers a wallet adapter for future use
 *
 * @param type - A unique identifier for this wallet type (e.g., "phantom", "solflare")
 * @param signer - An object implementing the WalletSigner interface
 */
export function registerWalletAdapter(
  type: string,
  signer: WalletSigner
): void {
  walletSigners[type] = signer;
  console.log(`Registered wallet adapter: ${type}`);
}

/**
 * Retrieves a registered wallet adapter
 *
 * @param type - The identifier of the wallet adapter to retrieve
 * @returns The registered WalletSigner or undefined if not found
 */
export function getWalletAdapter(type: string): WalletSigner | undefined {
  return walletSigners[type];
}

/**
 * Lists all registered wallet adapter types
 *
 * @returns Array of wallet type identifiers
 */
export function getRegisteredWalletTypes(): string[] {
  return Object.keys(walletSigners);
}

/**
 * Checks if a particular wallet type is registered
 *
 * @param type - The wallet type to check
 * @returns true if registered, false otherwise
 */
export function isWalletRegistered(type: string): boolean {
  return type in walletSigners;
}

/**
 * Unregisters a wallet adapter
 *
 * @param type - The wallet type to unregister
 */
export function unregisterWalletAdapter(type: string): void {
  if (type in walletSigners) {
    delete walletSigners[type];
    console.log(`Unregistered wallet adapter: ${type}`);
  }
}
