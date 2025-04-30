import { useContext } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { WalletContext } from "../context/index";
import { WalletContextType } from "../types/index";

/**
 * Hook to access the unified wallet context
 * This provides a consistent interface regardless of whether using
 * the custom wallet context or Solana wallet adapter
 */
export const useWalletContext = (): WalletContextType => {
  const walletContext = useContext(WalletContext);
  const walletAdapter = useWallet();

  // If a custom wallet is provided via WalletContext, use it
  if (walletContext) {
    return walletContext;
  }

  // Create an adapter-based signer if the wallet is connected
  const adapterSignTransaction = walletAdapter.connected && typeof walletAdapter.signTransaction === 'function'
    ? async (transaction: Transaction): Promise<Transaction> => {
        // TypeScript needs this extra check even though we already checked above
        if (!walletAdapter.signTransaction) {
          throw new Error("Wallet signTransaction is not available");
        }
        return walletAdapter.signTransaction(transaction);
      }
    : undefined;

  // Otherwise, fall back to the wallet adapter and map its methods
  return {
    publicKey: walletAdapter.publicKey,
    connected: walletAdapter.connected,
    signTransaction: adapterSignTransaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connectWallet: async (_key: PublicKey) => {
      if (walletAdapter.connect) {
        await walletAdapter.connect();
      }
    },
    clearWallet: async () => {
      if (walletAdapter.disconnect) {
        await walletAdapter.disconnect();
      }
    }
  };
};