/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { Recipient } from "../types/index";
import { useWalletContext } from "./useWalletContext";
import { useTenantContext } from "./useTenantContext";
import { useStreamContext } from "./useStreamContext";
import { useRequirePublicKey } from "./useRequirePublicKey";
import { useBalance } from "./useBalance";

interface UseTransactionProps {
  recipients: Recipient[];
  tokenName?: string;
  narration?: string;
  streamId?: string;
  skipBalanceCheck?: boolean;

  // NEW: Delivery options (user-facing, generic names)
  deliveryOptions?: {
    priority?: "standard" | "express"; // express = faster delivery (+25% fee)
  };
}

interface TransactionMetadata {
  totalAmount: string;
  tokenName: string;
  narration?: string;
  recipientsCount: number;
  recipients: Array<{
    address: string;
    amount: string;
  }>;
}

interface UseTransactionReturn {
  fetchTransaction: () => Promise<void>;
  signAndSubmitTransaction: () => Promise<void>;
  transactionBase64: string | null;
  transactionSignature: string | null;
  transactionId: number | null;
  transactionStatus: "pending" | "confirmed" | "failed" | null;
  transactionMetadata: TransactionMetadata | null;
  error: string | null;
  loading: boolean;
}

export const useTransaction = ({
  recipients,
  tokenName = "usdc",
  narration,
  streamId,
  skipBalanceCheck = false,
  deliveryOptions,
}: UseTransactionProps): UseTransactionReturn => {
  const { publicKey, signTransaction, connected } = useWalletContext();
  const { apiClient, websocket } = useTenantContext();
  const [transactionBase64, setTransactionBase64] = useState<string | null>(
    null
  );
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<
    "pending" | "confirmed" | "failed" | null
  >(null);
  const [transactionMetadata, setTransactionMetadata] =
    useState<TransactionMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { balances } = useBalance();

  /**
   * Check if user has sufficient balance before creating transaction
   */
  const checkBalance = async (): Promise<boolean> => {
    if (!publicKey || skipBalanceCheck) return true;

    try {
      const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);

      const balance =
        tokenName.toLowerCase() === "usdc"
          ? balances?.usdc?.amount || 0
          : balances?.sol?.amount || 0;

      if (balance < totalAmount) {
        const errorMsg = `Insufficient ${tokenName.toUpperCase()} balance. Required: ${totalAmount}, Available: ${balance}`;
        setError(errorMsg);
        return false;
      }

      return true;
    } catch (err) {
      console.warn("Balance check failed, proceeding anyway:", err);
      return true;
    }
  };

  const fetchTransaction = async () => {
    if (!publicKey) {
      setError("Wallet not connected.");
      return;
    }

    const hasBalance = await checkBalance();
    if (!hasBalance) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recipientsData = recipients.map((recipient) => ({
        recipientPublicKey: recipient.publicKey.toString(),
        amount: recipient.amount,
      }));

      const deliveryMethod =
        deliveryOptions?.priority === "express" ? "priority" : "standard";

      const data = await apiClient.post<{
        transaction: string;
        metadata?: TransactionMetadata;
      }>("/transaction/create?forceRefresh=true", {
        senderPublicKey: publicKey.toString(),
        recipients: recipientsData,
        tokenName,
        narration,
        streamId,
        deliveryMethod,
      });

      if (!data.transaction) {
        throw new Error("No transaction data received.");
      }

      setTransactionBase64(data.transaction);
      if (data.metadata) {
        setTransactionMetadata(data.metadata);
      }
    } catch (err) {
      console.error("Error fetching transaction:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch transaction."
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Poll transaction status until confirmed or failed
   */
  const pollTransactionStatus = async (
    signature: string,
    maxAttempts = 30
  ): Promise<"confirmed" | "failed"> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const data = await apiClient.get<{
          signature: string;
          status: "pending" | "confirmed" | "failed";
        }>(`/transaction/status/${signature}`);

        setTransactionStatus(data.status);

        if (data.status === "confirmed") {
          if (websocket && websocket.isConnected) {
            console.log("🚀 Sending transaction confirmation...");

            websocket.sendMessage("transactionConfirmed", {
              signature,
              senderWallet: publicKey?.toString(),
              recipientWallet: recipients[0]?.publicKey?.toString(),
              amount: recipients.reduce((sum, r) => sum + r.amount, 0),
            });

            console.log("✅ Transaction confirmation sent");
          }
          return "confirmed";
        } else if (data.status === "failed") {
          throw new Error("Transaction failed on blockchain");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error("Error polling transaction status:", err);
        if (i === maxAttempts - 1) {
          throw new Error("Transaction status check timed out");
        }
      }
    }
    throw new Error("Transaction confirmation timeout");
  };

  const signAndSubmitTransaction = async () => {
    if (!transactionBase64) {
      throw new Error("No transaction to sign.");
    }

    if (!publicKey) {
      throw new Error("Wallet not connected.");
    }

    if (!signTransaction) {
      throw new Error(
        "Wallet doesn't support signing. Please connect a wallet with signing capabilities."
      );
    }

    if (!connected) {
      throw new Error(
        "Wallet is not fully connected. Please reconnect your wallet."
      );
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = Transaction.from(
        Buffer.from(transactionBase64, "base64")
      );

      const signedTransaction = await signTransaction(transaction);
      const serializedTransaction = signedTransaction
        .serialize()
        .toString("base64");

      // Determine delivery method based on user preference
      const deliveryMethod =
        deliveryOptions?.priority === "express" ? "priority" : "standard";

      const data = await apiClient.post<{
        signature: string;
        transactionId: number;
        status: "pending" | "confirmed" | "failed";
        points?: number;
        cached?: boolean;
        deliveryMethod?: "standard" | "priority";
      }>("/transaction/submit", {
        signedTransaction: serializedTransaction,
        wallet: publicKey.toString(),
        amount: transactionMetadata?.totalAmount,
        tokenName: transactionMetadata?.tokenName || tokenName,
        narration,
        streamId,
        recipients:
          transactionMetadata?.recipients ||
          recipients.map((r) => ({
            address: r.publicKey.toString(),
            amount: r.amount.toString(),
          })),
        // NEW: Pass delivery method preference
        deliveryMethod,
      });

      if (!data.signature) {
        throw new Error("No signature received after submission.");
      }

      setTransactionSignature(data.signature);
      setTransactionId(data.transactionId);
      setTransactionStatus(data.status || "pending");

      if (data.cached && data.status === "confirmed") {
        setTransactionStatus("confirmed");

        if (websocket && websocket.isConnected) {
          console.log("🚀 Sending transaction confirmation...");

          websocket.sendMessage("transactionConfirmed", {
            signature: data.signature,
            senderWallet: publicKey?.toString(),
            recipientWallet: recipients[0]?.publicKey?.toString(),
            amount: recipients.reduce((sum, r) => sum + r.amount, 0),
          });

          console.log("✅ Transaction confirmation sent");
        }
      } else {
        await pollTransactionStatus(data.signature);
      }
    } catch (err) {
      console.error("Error signing/submitting transaction:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign and submit the transaction."
      );
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
    transactionId,
    transactionStatus,
    transactionMetadata,
    error,
    loading,
  };
};

export interface TransactionRecord {
  id: number;
  userId: string;
  signature: string;
  createdAt: string;
  tenantId: string;
  amount?: string;
  tokenName?: string;
  narration?: string;
  senderAddress?: string;
  recipientAddress?: string;
  recipients?: any;
  status?: string;
  transactionType?: string;
  stream?: {
    id: string;
    name: string;
    title?: string;
  };
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UseMyStreamTransactionsReturn {
  transactions: TransactionRecord[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMyStreamTransactions = (): UseMyStreamTransactionsReturn => {
  const { apiClient } = useTenantContext();
  const { publicKey: userWallet } = useRequirePublicKey();
  const {
    streamMetadata: { streamId },
  } = useStreamContext();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);

  const fetchHistory = useCallback(
    async (fetchOffset: number = 0) => {
      if (!userWallet || !streamId) {
        console.log("Missing wallet or streamId:", {
          userWallet: userWallet?.toString(),
          streamId,
        });
        setTransactions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: "50",
          offset: fetchOffset.toString(),
          streamId: streamId, // Ensure streamId is included
        });

        console.log("Fetching with params:", params.toString()); // Debug log

        const data = await apiClient.get<{
          transactions: TransactionRecord[];
          pagination: PaginationInfo;
        }>(`/transaction/user/${userWallet.toString()}?${params.toString()}`);

        console.log(
          `Received ${data.transactions.length} transactions for stream ${streamId}`
        );

        if (fetchOffset === 0) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }

        setPagination(data.pagination);
        setCurrentOffset(fetchOffset);
      } catch (err) {
        console.error("Error fetching user stream transaction history:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch transaction history."
        );
      } finally {
        setLoading(false);
      }
    },
    [userWallet, streamId, apiClient]
  );

  const fetchMore = useCallback(async () => {
    if (pagination?.hasMore && !loading) {
      await fetchHistory(currentOffset + 50);
    }
  }, [pagination, loading, currentOffset, fetchHistory]);

  const refresh = useCallback(async () => {
    setCurrentOffset(0);
    await fetchHistory(0);
  }, [fetchHistory]);

  useEffect(() => {
    if (userWallet && streamId) {
      fetchHistory(0);
    }
  }, [userWallet, streamId]);

  return {
    transactions,
    pagination,
    loading,
    error,
    fetchHistory: () => fetchHistory(currentOffset),
    fetchMore,
    refresh,
  };
};

interface StreamTransactionRecord {
  id: number;
  userId: string;
  signature: string;
  createdAt: string;
  tenantId: string;
  amount?: string;
  tokenName?: string;
  narration?: string;
  senderAddress?: string;
  recipientAddress?: string;
  recipients?: any;
  status?: string;
  transactionType?: string;
  user?: {
    id: string;
    walletAddress: string;
    name?: string;
  };
}

interface StreamStatistics {
  totalTransactions: number;
  totalVolume: string;
}

interface UseAllStreamTransactionsParams {
  limit?: number;
  offset?: number;
  autoFetch?: boolean;
}

interface UseAllStreamTransactionsReturn {
  transactions: StreamTransactionRecord[];
  statistics: StreamStatistics | null;
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAllStreamTransactions = ({
  limit = 50,
  offset = 0,
  autoFetch = true,
}: UseAllStreamTransactionsParams): UseAllStreamTransactionsReturn => {
  const { apiClient } = useTenantContext();
  const {
    streamMetadata: { streamId },
  } = useStreamContext();
  const [transactions, setTransactions] = useState<StreamTransactionRecord[]>(
    []
  );
  const [statistics, setStatistics] = useState<StreamStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(offset);

  const fetchHistory = useCallback(
    async (fetchOffset: number = offset) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: fetchOffset.toString(),
        });

        const data = await apiClient.get<{
          transactions: StreamTransactionRecord[];
          statistics: StreamStatistics;
          pagination: PaginationInfo;
        }>(`/transaction/stream/${streamId}?${params.toString()}`);

        if (fetchOffset === 0) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }

        setStatistics(data.statistics);
        setPagination(data.pagination);
        setCurrentOffset(fetchOffset);
      } catch (err) {
        console.error("Error fetching stream transaction history:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch stream transaction history."
        );
      } finally {
        setLoading(false);
      }
    },
    [streamId, limit, apiClient]
  );

  const fetchMore = useCallback(async () => {
    if (pagination?.hasMore && !loading) {
      await fetchHistory(currentOffset + limit);
    }
  }, [pagination, loading, currentOffset, limit, fetchHistory]);

  const refresh = useCallback(async () => {
    setCurrentOffset(0);
    await fetchHistory(0);
  }, [fetchHistory]);

  useEffect(() => {
    if (autoFetch && streamId) {
      fetchHistory(offset);
    }
  }, [streamId, autoFetch]);

  return {
    transactions,
    statistics,
    pagination,
    loading,
    error,
    fetchHistory: () => fetchHistory(currentOffset),
    fetchMore,
    refresh,
  };
};

export interface TransactionHistoryRecord {
  id: number;
  signature: string;
  createdAt: string;
  updatedAt?: string;
  amount?: string;
  tokenName?: string;
  narration?: string;
  streamId?: string;
  senderAddress?: string;
  recipientAddress?: string;
  recipients?: any;
  status: "pending" | "confirmed" | "failed";
  transactionType?: string;
  stream?: {
    id: string;
    name: string;
    title?: string;
  };
}

interface TransactionFilters {
  status?: "pending" | "confirmed" | "failed";
  tokenName?: string;
  streamId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UseTransactionHistoryParams {
  filters?: TransactionFilters;
  limit?: number;
  autoFetch?: boolean;
}

interface UseTransactionHistoryReturn {
  transactions: TransactionHistoryRecord[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export const useTransactionHistory = ({
  filters = {},
  limit = 20,
  autoFetch = true,
}: UseTransactionHistoryParams): UseTransactionHistoryReturn => {
  const { apiClient } = useTenantContext();
  const { publicKey: userWallet } = useRequirePublicKey();
  const [transactions, setTransactions] = useState<TransactionHistoryRecord[]>(
    []
  );
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchTransactions = useCallback(
    async (resetOffset: boolean = false) => {
      if (!userWallet) return;

      setLoading(true);
      setError(null);

      try {
        const currentOffset = resetOffset ? 0 : offset;

        // Build query params
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        });

        // Add filters
        if (filters.status) params.append("status", filters.status);
        if (filters.tokenName) params.append("tokenName", filters.tokenName);
        if (filters.streamId) params.append("streamId", filters.streamId);
        if (filters.startDate)
          params.append("startDate", filters.startDate.toISOString());
        if (filters.endDate)
          params.append("endDate", filters.endDate.toISOString());

        const data = await apiClient.get<{
          transactions: TransactionHistoryRecord[];
          pagination: PaginationInfo;
        }>(`/transaction/user/${userWallet.toString()}?${params.toString()}`);

        if (resetOffset) {
          setTransactions(data.transactions);
          setOffset(0);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }

        setPagination(data.pagination);
        setOffset(currentOffset + data.transactions.length);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch transaction history"
        );
      } finally {
        setLoading(false);
      }
    },
    [userWallet, filters, limit, offset, apiClient]
  );

  const refresh = useCallback(async () => {
    await fetchTransactions(true);
  }, [fetchTransactions]);

  const loadMore = useCallback(async () => {
    if (pagination?.hasMore && !loading) {
      await fetchTransactions(false);
    }
  }, [pagination, loading, fetchTransactions]);

  useEffect(() => {
    if (autoFetch) {
      fetchTransactions(true);
    }
  }, [userWallet, autoFetch, JSON.stringify(filters)]);

  return {
    transactions,
    pagination,
    loading,
    error,
    refresh,
    loadMore,
    hasMore: pagination?.hasMore || false,
  };
};

// Export a simpler version for "my transactions"
export const useMyTransactions = () => {
  return useTransactionHistory({
    limit: 50,
    autoFetch: true,
  });
};

// Export filtered versions
export const usePendingTransactions = () => {
  return useTransactionHistory({
    filters: { status: "pending" },
    limit: 20,
    autoFetch: true,
  });
};

export const useConfirmedTransactions = () => {
  return useTransactionHistory({
    filters: { status: "confirmed" },
    limit: 50,
    autoFetch: true,
  });
};
