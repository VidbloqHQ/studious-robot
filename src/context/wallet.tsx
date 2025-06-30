import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getWalletAdapter, isWalletRegistered } from "../utils/index";
import { WalletSigner, WalletContextType } from "../types/index";

export const WalletContext = createContext<WalletContextType | undefined>(
  undefined
);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [currentSigner, setCurrentSigner] = useState<WalletSigner | undefined>(
    undefined
  );

  useEffect(() => {
    const savedKey = localStorage.getItem("walletPublicKey");
    const savedWalletType = localStorage.getItem("walletType");

    if (savedKey) {
      try {
        const key = new PublicKey(savedKey);
        if (PublicKey.isOnCurve(key.toBytes())) {
          setPublicKey(key);

          // If there's a registered signer for this wallet type, use it
          if (savedWalletType && isWalletRegistered(savedWalletType)) {
            const signer = getWalletAdapter(savedWalletType);
            if (signer) {
              setCurrentSigner(signer);
              setConnected(true);
            }
          } else {
            // We have a public key but no signer - partial connection
            setConnected(false);
            console.warn(
              "Public key loaded but no signer available for wallet type:",
              savedWalletType
            );
          }
        } else {
          console.error("Invalid public key: not on curve");
          localStorage.removeItem("walletPublicKey");
          localStorage.removeItem("walletType");
        }
      } catch (error) {
        console.error("Invalid public key in local storage:", error);
        localStorage.removeItem("walletPublicKey");
        localStorage.removeItem("walletType");
      }
    } else {
      console.log("No public key found in local storage.");
    }
  }, []);

  const connectWallet = useCallback((key: PublicKey, signer?: WalletSigner) => {
    setPublicKey(key);
    localStorage.setItem("walletPublicKey", key.toBase58());

    if (signer) {
      setCurrentSigner(signer);
      setConnected(true);

      // Use a consistent wallet type name
      // Note: In a real implementation, you would need to pass this in
      const walletType = "custom"; // This should ideally come from parameters
      localStorage.setItem("walletType", walletType);

      // No need to register here - that should be done separately
      // using the registerWalletAdapter function
    } else {
      // If no signer is provided, we're in a limited state
      setConnected(false);
      console.warn(
        "Wallet connected with public key only, no signing capability"
      );
    }
  }, []);

  const clearWallet = useCallback(() => {
    setPublicKey(null);
    setCurrentSigner(undefined);
    setConnected(false);
    localStorage.removeItem("walletPublicKey");
    localStorage.removeItem("walletType");
  }, []);

  // Function to sign transactions using the current signer
  const signTransaction = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (!currentSigner) {
        throw new Error("No wallet signer available");
      }
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }
      return currentSigner.signTransaction(transaction);
    },
    [currentSigner, publicKey]
  );

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        connectWallet,
        clearWallet,
        signTransaction: currentSigner ? signTransaction : undefined,
        connected,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
