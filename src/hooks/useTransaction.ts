// import { useState } from "react";
// import { Transaction } from "@solana/web3.js";
// import { Buffer } from "buffer";
// import { Recipient } from "../types/index";
// import { useWalletContext } from "./useWalletContext";
// import { useTenantContext } from "./useTenantContext";

// interface UseTransactionProps {
//   recipients: Recipient[];
//   tokenName?: string;
// }

// interface UseTransactionReturn {
//   fetchTransaction: () => Promise<void>;
//   signAndSubmitTransaction: () => Promise<void>;
//   transactionBase64: string | null;
//   transactionSignature: string | null;
//   error: string | null;
//   loading: boolean;
// }

// export const useTransaction = ({
//   recipients,
//   tokenName = "usdc",
// }: UseTransactionProps): UseTransactionReturn => {
//   const { publicKey, signTransaction, connected } = useWalletContext();
//   const { apiClient } = useTenantContext();
//   const [transactionBase64, setTransactionBase64] = useState<string | null>(null);
//   const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);

//   const fetchTransaction = async () => {
//     if (!publicKey) {
//       setError("Wallet not connected.");
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const recipientsData = recipients.map((recipient) => ({
//         recipientPublicKey: recipient.publicKey.toString(),
//         amount: recipient.amount,
//       }));

//       const data = await apiClient.post<{ transaction: string }>("/pay", {
//         senderPublicKey: publicKey.toString(),
//         recipients: recipientsData,
//         tokenName,
//       });

//       if (!data.transaction) {
//         throw new Error("No transaction data received.");
//       }

//       setTransactionBase64(data.transaction);
//     } catch (err) {
//       console.error("Error fetching transaction:", err);
//       setError(err instanceof Error ? err.message : "Failed to fetch transaction.");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const signAndSubmitTransaction = async () => {
//     if (!transactionBase64) {
//       throw new Error("No transaction to sign.");
//     }

//     if (!publicKey) {
//       throw new Error("Wallet not connected.");
//     }

//     if (!signTransaction) {
//       throw new Error("Wallet doesn't support signing. Please connect a wallet with signing capabilities.");
//     }

//     if (!connected) {
//       throw new Error("Wallet is not fully connected. Please reconnect your wallet.");
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const transaction = Transaction.from(
//         Buffer.from(transactionBase64, "base64")
//       );

//       const signedTransaction = await signTransaction(transaction);
//       const serializedTransaction = signedTransaction
//         .serialize()
//         .toString("base64");

//       const data = await apiClient.post<{ signature: string }>("/pay/submit", {
//         signedTransaction: serializedTransaction,
//         wallet: publicKey.toString(),
//       });

//       if (!data.signature) {
//         throw new Error("No signature received after submission.");
//       }

//       setTransactionSignature(data.signature);
//     } catch (err) {
//       console.error("Error signing/submitting transaction:", err);
//       setError(err instanceof Error ? err.message : "Failed to sign and submit the transaction.");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     fetchTransaction,
//     signAndSubmitTransaction,
//     transactionBase64,
//     transactionSignature,
//     error,
//     loading
//   };
// };

import { useState } from "react";
import { Transaction } from "@solana/web3.js";
// Fix the buffer import - it doesn't have a default export
import { Buffer } from "buffer";
import { Recipient } from "../types/index";
import { useWalletContext } from "./useWalletContext";
import { useTenantContext } from "./useTenantContext";

interface UseTransactionProps {
  recipients: Recipient[];
  tokenName?: string;
}

interface UseTransactionReturn {
  fetchTransaction: () => Promise<void>;
  signAndSubmitTransaction: () => Promise<void>;
  transactionBase64: string | null;
  transactionSignature: string | null;
  error: string | null;
  loading: boolean;
}

export const useTransaction = ({
  recipients,
  tokenName = "usdc",
}: UseTransactionProps): UseTransactionReturn => {
  const { publicKey, signTransaction, connected } = useWalletContext();
  const { apiClient } = useTenantContext();
  const [transactionBase64, setTransactionBase64] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTransaction = async () => {
    if (!publicKey) {
      setError("Wallet not connected.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recipientsData = recipients.map((recipient) => ({
        recipientPublicKey: recipient.publicKey.toString(),
        amount: recipient.amount,
      }));

      const data = await apiClient.post<{ transaction: string }>("/pay", {
        senderPublicKey: publicKey.toString(),
        recipients: recipientsData,
        tokenName,
      });

      if (!data.transaction) {
        throw new Error("No transaction data received.");
      }

      setTransactionBase64(data.transaction);
    } catch (err) {
      console.error("Error fetching transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch transaction.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signAndSubmitTransaction = async () => {
    if (!transactionBase64) {
      throw new Error("No transaction to sign.");
    }

    if (!publicKey) {
      throw new Error("Wallet not connected.");
    }

    if (!signTransaction) {
      throw new Error("Wallet doesn't support signing. Please connect a wallet with signing capabilities.");
    }

    if (!connected) {
      throw new Error("Wallet is not fully connected. Please reconnect your wallet.");
    }

    setLoading(true);
    setError(null);

    try {
      // Use Buffer directly since we're importing it correctly
      const transaction = Transaction.from(
        Buffer.from(transactionBase64, "base64")
      );

      const signedTransaction = await signTransaction(transaction);
      const serializedTransaction = signedTransaction
        .serialize()
        .toString("base64");

      const data = await apiClient.post<{ signature: string }>("/pay/submit", {
        signedTransaction: serializedTransaction,
        wallet: publicKey.toString(),
      });

      if (!data.signature) {
        throw new Error("No signature received after submission.");
      }

      setTransactionSignature(data.signature);
    } catch (err) {
      console.error("Error signing/submitting transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to sign and submit the transaction.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchTransaction,
    signAndSubmitTransaction,
    transactionBase64,
    transactionSignature,
    error,
    loading
  };
};