import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { registerWalletAdapter } from "../utils/index";
import { useWalletContext } from "../hooks/index";
import { WalletSigner } from "../types/index";

/**
 * This component bridges the Solana wallet adapter system with your custom wallet context.
 * It should be included near the top of your application, after all wallet providers.
 */
const WalletAdapterBridge: React.FC = () => {
  const solanaWallet = useWallet();
  const { connectWallet } = useWalletContext();

  useEffect(() => {
    // When the Solana wallet adapter connection state changes
    if (
      solanaWallet.connected &&
      solanaWallet.publicKey &&
      solanaWallet.signTransaction
    ) {
      console.log("Bridging Solana wallet adapter to custom wallet context");

      // Create a signer that uses the wallet adapter's signTransaction method
      const adapterSigner: WalletSigner = {
        signTransaction: solanaWallet.signTransaction.bind(solanaWallet),
      };

      // Register this wallet type
      const walletName = solanaWallet.wallet?.adapter.name || "solana-adapter";
      registerWalletAdapter(walletName, adapterSigner);

      // Connect this wallet in your custom context
      connectWallet(solanaWallet.publicKey, adapterSigner);
    }
  }, [
    solanaWallet, // Include the entire wallet object to satisfy the linter
    connectWallet,
  ]);

  return null;
};

export default WalletAdapterBridge;
