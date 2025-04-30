import { useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWalletContext } from "./useWalletContext";
import { useNotification } from "./useNotification";

export const useRequirePublicKey = (requireSigning = false): {
  publicKey: PublicKey | null;
  hasSigningCapability: boolean;
} => {
  const { publicKey, connectWallet, signTransaction, connected } = useWalletContext();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (!publicKey) {
      const savedKey = localStorage.getItem("walletPublicKey");
      if (savedKey) {
        try {
          const key = new PublicKey(savedKey);
          if (PublicKey.isOnCurve(key.toBytes())) {
            connectWallet(key);
            
            // We connected with just a public key, but there's no guarantee
            // of signing capability until the wallet reconnects properly
            if (requireSigning && !signTransaction) {
              addNotification({
                type: "warning",
                message: "Wallet reconnected, but signing capability is needed. Please reconnect your wallet.",
                duration: 5000,
              });
            }
          } else {
            console.error("Invalid public key: not on curve");
            localStorage.removeItem("walletPublicKey");
            addNotification({
              type: "error",
              message: "Invalid wallet key",
              duration: 3000,
            });
          }
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          addNotification({
            type: "error",
            message: "Invalid wallet key",
            duration: 3000,
          });
        }
      } else {
        addNotification({
          type: "info",
          message: "Please connect your wallet",
          duration: 3000,
        });
      }
    } else if (requireSigning && !signTransaction) {
      // We have a public key but no signing capability
      addNotification({
        type: "warning",
        message: "Your wallet doesn't support transaction signing. Please connect a compatible wallet.",
        duration: 5000,
      });
    }
  }, [publicKey, connectWallet, addNotification, signTransaction, requireSigning]);

  return { 
    publicKey, 
    hasSigningCapability: !!signTransaction && connected 
  };
};