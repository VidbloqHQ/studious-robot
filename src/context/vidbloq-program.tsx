/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useCallback, useState } from "react";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { useTenantContext, useWalletContext, useNotification } from "../hooks";
import { StreamFundingType } from "../types";

// Types for the Solana Program operations
interface StreamPDA {
  pda: string;
  tenantId: string;
}

enum ProgramStreamStatus {
  Initialized,
  Active,
  Completed,
  Cancelled,
}

interface TransactionInstruction {
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  programId: string;
  data: string;
}

interface BuildTransactionResponse {
  instruction: TransactionInstruction;
  accounts: Record<string, string>;
  streamId?: string;
  donationId?: string;
  distributionId?: string;
  tenantId: string;
}

interface StreamData {
  stream: {
    id: string;
    name: string;
    streamType: StreamFundingType;
    streamPDA: string;
    streamATA: string;
    mintAddress: string;
    hostWallet: string;
    status: ProgramStreamStatus;
    totalDeposited: string;
    totalDistributed: string;
    endTime?: Date;
    startedAt?: Date;
    endedAt?: Date;
    donations: any[];
    distributions: any[];
  };
  onChainData?: {
    host: string;
    streamName: string;
    status: any;
    totalDeposited: string;
    totalDistributed: string;
    createdAt: Date;
    startTime?: Date;
    endTime?: Date;
    streamType: any;
  };
  onChainError?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Context type definition
interface VidbloqProgramContextType {
  // Stream management
  getStreamPDA: (
    streamName: string,
    hostPublicKey: string
  ) => Promise<StreamPDA>;
  initializeStream: (params: InitializeStreamParams) => Promise<string>;
  startStream: (streamName: string, hostPublicKey: string) => Promise<string>;
  completeStream: (
    streamName: string,
    hostPublicKey: string
  ) => Promise<string>;
  updateStream: (params: UpdateStreamParams) => Promise<string>;

  // Financial operations
  deposit: (params: DepositParams) => Promise<string>;
  distribute: (params: DistributeParams) => Promise<string>;
  refund: (params: RefundParams) => Promise<string>;

  // Query operations
  getStream: (streamName: string, hostPublicKey: string) => Promise<StreamData>;
  listStreams: (params: ListStreamsParams) => Promise<PaginatedResponse<any>>;
  listDonations: (
    params: ListDonationsParams
  ) => Promise<PaginatedResponse<any>>;
  listDistributions: (
    params: ListDistributionsParams
  ) => Promise<PaginatedResponse<any>>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// Parameter types
interface InitializeStreamParams {
  streamName: string;
  streamType: StreamFundingType;
  mintAddress: string;
  hostPublicKey: string;
  endTime?: number;
}

interface UpdateStreamParams {
  streamName: string;
  hostPublicKey: string;
  newEndTime?: number;
  newStatus?: "active" | "ended" | "cancelled";
}

interface DepositParams {
  streamName: string;
  hostPublicKey: string;
  donorPublicKey: string;
  amount: number;
  donorATA: string;
  streamATA: string;
}

interface DistributeParams {
  streamName: string;
  hostPublicKey: string;
  recipientPublicKey: string;
  amount: number;
  mintAddress: string;
  streamATA: string;
  recipientATA: string;
}

interface RefundParams {
  streamName: string;
  hostPublicKey: string;
  donorPublicKey: string;
  initiatorPublicKey: string;
  amount: number;
  donorATA: string;
  streamATA: string;
}

interface ListStreamsParams {
  hostWallet?: string;
  status?: ProgramStreamStatus;
  limit?: number;
  offset?: number;
}

interface ListDonationsParams {
  streamId: string;
  donorWallet?: string;
  limit?: number;
  offset?: number;
}

interface ListDistributionsParams {
  streamId: string;
  recipientWallet?: string;
  limit?: number;
  offset?: number;
}

// Create context
export const VidbloqProgramContext = createContext<VidbloqProgramContextType | null>(
  null
);

// Provider component
export const VidbloqProgramProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { apiClient } = useTenantContext();
  const { publicKey, signTransaction } = useWalletContext();
  const { addNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to build and send transaction
  const buildAndSendTransaction = useCallback(
    async (
      endpoint: string,
      data: any,
      successMessage: string
    ): Promise<string> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build transaction
        const response = await apiClient.post<BuildTransactionResponse>(
          `/program${endpoint}`,
          data
        );

        // Create transaction from instruction
        // const connection = new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const connection = new Connection(
          process.env.REACT_APP_SOLANA_RPC_URL ||
            `https://devnet.helius-rpc.com/?api-key=10b8f1fb-6b38-43cb-a769-e6965206020e`
        );

        const transaction = new Transaction();

        // Deserialize instruction
        const instruction = {
          keys: response.instruction.keys.map((key) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          })),
          programId: new PublicKey(response.instruction.programId),
          data: Buffer.from(response.instruction.data, "base64"),
        };

        transaction.add(instruction);

        // Get recent blockhash with higher commitment
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Sign transaction
        const signedTx = await signTransaction(transaction);

        // Send transaction with options for better reliability
        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          }
        );

        console.log("Transaction sent, signature:", signature);

        // Custom confirmation with retry logic
        let confirmed = false;
        let retries = 0;
        const maxRetries = 5;

        while (!confirmed && retries < maxRetries) {
          try {
            // Use confirmTransactionStrategy for more reliable confirmation
            const result = await connection.confirmTransaction(
              {
                signature,
                blockhash,
                lastValidBlockHeight,
              },
              "confirmed"
            );

            if (result.value.err) {
              throw new Error(
                `Transaction failed: ${JSON.stringify(result.value.err)}`
              );
            }

            confirmed = true;
            console.log("Transaction confirmed after", retries + 1, "attempts");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            retries++;
            console.log(`Confirmation attempt ${retries} failed, retrying...`);

            if (retries >= maxRetries) {
              // Check transaction status one more time
              const status = await connection.getSignatureStatus(signature);

              if (
                status.value?.confirmationStatus === "confirmed" ||
                status.value?.confirmationStatus === "finalized"
              ) {
                confirmed = true;
                console.log("Transaction confirmed via status check");
              } else if (status.value?.err) {
                throw new Error(
                  `Transaction failed: ${JSON.stringify(status.value.err)}`
                );
              } else {
                // Transaction might still be processing
                console.warn(
                  "Transaction confirmation timeout, but transaction may still succeed"
                );
                // Continue with recording the transaction
                confirmed = true;
              }
            } else {
              // Wait before retrying
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }

        // Record transaction in backend
        try {
          // Map endpoint to correct transaction type
          let transactionTypeForBackend = endpoint.substring(1); // Remove leading slash

          // Handle special cases
          if (transactionTypeForBackend === "start-stream") {
            transactionTypeForBackend = "start";
          } else if (transactionTypeForBackend === "complete-stream") {
            transactionTypeForBackend = "complete";
          } else if (transactionTypeForBackend === "update-stream") {
            transactionTypeForBackend = "update";
          }

          await apiClient.post("/program/record-transaction", {
            signature,
            transactionType: transactionTypeForBackend,
            streamId: response.streamId,
            donationId: response.donationId,
            distributionId: response.distributionId,
            wallet: publicKey.toBase58(),
          });
        } catch (recordError) {
          console.error(
            "Failed to record transaction in backend:",
            recordError
          );
          // Don't throw here - transaction was successful on chain
        }

        addNotification({
          type: "success",
          message: successMessage,
          duration: 5000,
        });

        return signature;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Transaction failed";
        setError(errorMessage);
        addNotification({
          type: "error",
          message: errorMessage,
          duration: 5000,
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, signTransaction, apiClient, addNotification]
  );

  // Context methods
  const getStreamPDA = useCallback(
    async (streamName: string, hostPublicKey: string): Promise<StreamPDA> => {
      const response = await apiClient.get<StreamPDA>("/program/stream-pda", {
        streamName,
        hostPublicKey,
      });
      return response;
    },
    [apiClient]
  );

  const initializeStream = useCallback(
    async (params: InitializeStreamParams): Promise<string> => {
      return buildAndSendTransaction(
        "/initialize",
        params,
        "Stream initialized successfully"
      );
    },
    [buildAndSendTransaction]
  );

  const startStream = useCallback(
    async (streamName: string, hostPublicKey: string): Promise<string> => {
      return buildAndSendTransaction(
        "/start-stream",
        { streamName, hostPublicKey },
        "Stream started successfully"
      );
    },
    [buildAndSendTransaction]
  );

  const completeStream = useCallback(
    async (streamName: string, hostPublicKey: string): Promise<string> => {
      return buildAndSendTransaction(
        "/complete-stream",
        { streamName, hostPublicKey },
        "Stream completed successfully"
      );
    },
    [buildAndSendTransaction]
  );

  const updateStream = useCallback(
    async (params: UpdateStreamParams): Promise<string> => {
      return buildAndSendTransaction(
        "/update-stream",
        params,
        "Stream updated successfully"
      );
    },
    [buildAndSendTransaction]
  );

  const deposit = useCallback(
    async (params: DepositParams): Promise<string> => {
      return buildAndSendTransaction("/deposit", params, "Deposit successful");
    },
    [buildAndSendTransaction]
  );

  const distribute = useCallback(
    async (params: DistributeParams): Promise<string> => {
      return buildAndSendTransaction(
        "/distribute",
        params,
        "Distribution successful"
      );
    },
    [buildAndSendTransaction]
  );

  const refund = useCallback(
    async (params: RefundParams): Promise<string> => {
      return buildAndSendTransaction(
        "/refund",
        params,
        "Refund processed successfully"
      );
    },
    [buildAndSendTransaction]
  );

  const getStream = useCallback(
    async (streamName: string, hostPublicKey: string): Promise<StreamData> => {
      const response = await apiClient.get<StreamData>("/program/stream", {
        streamName,
        hostPublicKey,
      });
      return response;
    },
    [apiClient]
  );

  const listStreams = useCallback(
    async (params: ListStreamsParams): Promise<PaginatedResponse<any>> => {
      const response = await apiClient.get<any>(
        "/program/streams",
        params as any
      );
      return {
        data: response.streams,
        pagination: response.pagination,
      };
    },
    [apiClient]
  );

  const listDonations = useCallback(
    async (params: ListDonationsParams): Promise<PaginatedResponse<any>> => {
      const response = await apiClient.get<any>(
        "/program/donations",
        params as any
      );
      return {
        data: response.donations,
        pagination: response.pagination,
      };
    },
    [apiClient]
  );

  const listDistributions = useCallback(
    async (
      params: ListDistributionsParams
    ): Promise<PaginatedResponse<any>> => {
      const response = await apiClient.get<any>(
        "/program/distributions",
        params as any
      );
      return {
        data: response.distributions,
        pagination: response.pagination,
      };
    },
    [apiClient]
  );

  const value: VidbloqProgramContextType = {
    getStreamPDA,
    initializeStream,
    startStream,
    completeStream,
    updateStream,
    deposit,
    distribute,
    refund,
    getStream,
    listStreams,
    listDonations,
    listDistributions,
    isLoading,
    error,
  };

  return (
    <VidbloqProgramContext.Provider value={value}>
      {children}
    </VidbloqProgramContext.Provider>
  );
};

// Export types for external use
export type {
  VidbloqProgramContextType,
  InitializeStreamParams,
  UpdateStreamParams,
  DepositParams,
  DistributeParams,
  RefundParams,
  ListStreamsParams,
  ListDonationsParams,
  ListDistributionsParams,
  StreamData,
  StreamPDA,
};
