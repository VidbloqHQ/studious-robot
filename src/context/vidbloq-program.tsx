// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { createContext, useState, useCallback, ReactNode } from "react";
// import { PublicKey, Transaction } from "@solana/web3.js";
// import { useTenantContext } from "../hooks/useTenantContext";
// import { useWalletContext } from "../hooks/useWalletContext";
// import { useNotification } from "../hooks/useNotification";

// // Define types for the Solana Program operations
// export type ProgramStreamType = "Live" | "Prepaid" | "Conditional";

// export interface StreamPDAResponse {
//   pda: string;
//   tenantId: string;
// }

// export interface InitializeTransactionResponse {
//   instruction: any;
//   accounts: {
//     streamPDA: string;
//     streamATA: string;
//   };
//   streamId: string;
//   tenantId: string;
// }

// export interface StreamOperationResponse {
//   instruction: any;
//   accounts: {
//     streamPDA: string;
//     donorPDA?: string;
//   };
//   streamId?: string;
//   donationId?: string;
//   distributionId?: string;
//   tenantId: string;
// }

// export interface TransactionRecordResponse {
//   success: boolean;
//   message: string;
//   signature: string;
//   data: any;
// }

// export interface StreamData {
//   stream: any;
//   onChainData: any | null;
//   onChainError?: string;
// }

// export interface ProgramContextType {
//   // Stream PDA operations
//   getStreamPDA: (streamName: string, hostPublicKey: string) => Promise<StreamPDAResponse>;
  
//   // Transaction building operations
//   buildInitializeTransaction: (
//     streamName: string, 
//     streamType: ProgramStreamType, 
//     mintAddress: string, 
//     hostPublicKey: string, 
//     endTime?: number
//   ) => Promise<InitializeTransactionResponse>;
  
//   buildStartStreamTransaction: (
//     streamName: string, 
//     hostPublicKey: string
//   ) => Promise<StreamOperationResponse>;
  
//   buildCompleteStreamTransaction: (
//     streamName: string,
//     hostPublicKey: string
//   ) => Promise<StreamOperationResponse>;
  
//   buildDepositTransaction: (
//     streamName: string,
//     hostPublicKey: string,
//     donorPublicKey: string,
//     amount: number,
//     donorATA: string,
//     streamATA: string
//   ) => Promise<StreamOperationResponse>;
  
//   buildDistributeTransaction: (
//     streamName: string,
//     hostPublicKey: string,
//     recipientPublicKey: string,
//     amount: number,
//     mintAddress: string,
//     streamATA: string,
//     recipientATA: string
//   ) => Promise<StreamOperationResponse>;
  
//   buildRefundTransaction: (
//     streamName: string,
//     hostPublicKey: string,
//     donorPublicKey: string,
//     initiatorPublicKey: string,
//     amount: number,
//     donorATA: string,
//     streamATA: string
//   ) => Promise<StreamOperationResponse>;
  
//   buildUpdateStreamTransaction: (
//     streamName: string,
//     hostPublicKey: string,
//     newEndTime?: number,
//     newStatus?: string
//   ) => Promise<StreamOperationResponse>;
  
//   // Transaction execution
//   executeTransaction: (
//     transactionInstructions: any[],
//     onSuccess?: (signature: string) => void,
//     onError?: (error: Error) => void
//   ) => Promise<string | undefined>;
  
//   recordTransaction: (
//     signature: string,
//     transactionType: string,
//     wallet: string,
//     streamId?: string,
//     donationId?: string,
//     distributionId?: string
//   ) => Promise<TransactionRecordResponse>;
  
//   // Query operations
//   getStream: (
//     streamName: string,
//     hostPublicKey: string
//   ) => Promise<StreamData>;
  
//   listStreams: (
//     hostWallet?: string,
//     status?: string,
//     limit?: number,
//     offset?: number
//   ) => Promise<any>;
  
//   listDonations: (
//     streamId: string,
//     donorWallet?: string,
//     limit?: number,
//     offset?: number
//   ) => Promise<any>;
  
//   listDistributions: (
//     streamId: string,
//     recipientWallet?: string,
//     limit?: number,
//     offset?: number
//   ) => Promise<any>;
  
//   isLoading: boolean;
//   error: Error | null;
//   clearError: () => void;
// }

// export const VidbloqProgramContext = createContext<ProgramContextType | null>(null);

// export const VidbloqProgramProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [error, setError] = useState<Error | null>(null);
  
//   const { apiClient } = useTenantContext();
//   const { publicKey, signTransaction } = useWalletContext();
//   const { addNotification } = useNotification();

//   const clearError = useCallback(() => {
//     setError(null);
//   }, []);

//   // Get Stream PDA
//   const getStreamPDA = useCallback(
//     async (streamName: string, hostPublicKey: string): Promise<StreamPDAResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.get<StreamPDAResponse>('/program/stream-pda', {
//           streamName,
//           hostPublicKey,
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to get stream PDA');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Initialize Transaction
//   const buildInitializeTransaction = useCallback(
//     async (
//       streamName: string, 
//       streamType: ProgramStreamType, 
//       mintAddress: string, 
//       hostPublicKey: string, 
//       endTime?: number
//     ): Promise<InitializeTransactionResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<InitializeTransactionResponse>('/program/initialize', {
//           streamName,
//           streamType,
//           mintAddress,
//           hostPublicKey,
//           endTime
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build initialize transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Start Stream Transaction
//   const buildStartStreamTransaction = useCallback(
//     async (
//       streamName: string, 
//       hostPublicKey: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/start-stream', {
//           streamName,
//           hostPublicKey
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build start stream transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Complete Stream Transaction
//   const buildCompleteStreamTransaction = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/complete-stream', {
//           streamName,
//           hostPublicKey
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build complete stream transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Deposit Transaction
//   const buildDepositTransaction = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string,
//       donorPublicKey: string,
//       amount: number,
//       donorATA: string,
//       streamATA: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/deposit', {
//           streamName,
//           hostPublicKey,
//           donorPublicKey,
//           amount,
//           donorATA,
//           streamATA
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build deposit transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Distribute Transaction
//   const buildDistributeTransaction = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string,
//       recipientPublicKey: string,
//       amount: number,
//       mintAddress: string,
//       streamATA: string,
//       recipientATA: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/distribute', {
//           streamName,
//           hostPublicKey,
//           recipientPublicKey,
//           amount,
//           mintAddress,
//           streamATA,
//           recipientATA
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build distribute transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Refund Transaction
//   const buildRefundTransaction = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string,
//       donorPublicKey: string,
//       initiatorPublicKey: string,
//       amount: number,
//       donorATA: string,
//       streamATA: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/refund', {
//           streamName,
//           hostPublicKey,
//           donorPublicKey,
//           initiatorPublicKey,
//           amount,
//           donorATA,
//           streamATA
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build refund transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Build Update Stream Transaction
//   const buildUpdateStreamTransaction = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string,
//       newEndTime?: number,
//       newStatus?: string
//     ): Promise<StreamOperationResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<StreamOperationResponse>('/program/update-stream', {
//           streamName,
//           hostPublicKey,
//           newEndTime,
//           newStatus
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to build update stream transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Execute Transaction
//   const executeTransaction = useCallback(
//     async (
//       transactionInstructions: any[],
//       onSuccess?: (signature: string) => void,
//       onError?: (error: Error) => void
//     ): Promise<string | undefined> => {
//       if (!publicKey) {
//         const error = new Error('Wallet not connected');
//         setError(error);
//         onError?.(error);
//         addNotification({
//           type: 'error',
//           message: 'Please connect your wallet first',
//           duration: 5000
//         });
//         return undefined;
//       }

//       if (!signTransaction) {
//         const error = new Error('Wallet cannot sign transactions');
//         setError(error);
//         onError?.(error);
//         addNotification({
//           type: 'error',
//           message: 'Your wallet does not support transaction signing',
//           duration: 5000
//         });
//         return undefined;
//       }

//       setIsLoading(true);
//       try {
//         // Create a new transaction
//         const transaction = new Transaction();
        
//         // Add all instructions
//         for (const instruction of transactionInstructions) {
//           // Convert the serialized instruction back to a real instruction
//           const ixData = Buffer.from(instruction.data, 'base64');
//           const keys = instruction.keys.map((key: any) => ({
//             pubkey: new PublicKey(key.pubkey),
//             isSigner: key.isSigner,
//             isWritable: key.isWritable
//           }));
          
//           const ix = {
//             programId: new PublicKey(instruction.programId),
//             keys,
//             data: ixData
//           };
          
//           transaction.add(ix);
//         }
        
//         // Set the fee payer
//         transaction.feePayer = publicKey;
        
//         // Get the latest blockhash
//         // This would typically be done using the Solana connection object
//         // For now, we'll use a placeholder and assume the backend handles this
//         transaction.recentBlockhash = 'placeholder'; // This should be set correctly
        
//         // Sign the transaction
//         const signedTransaction = await signTransaction(transaction);

//         console.log({signedTransaction})
        
//         // Here we would typically send the transaction to the Solana network
//         // For simplicity, we'll just return the transaction signature
//         const signature = 'simulated_signature'; // Placeholder
        
//         if (onSuccess) {
//           onSuccess(signature);
//         }
        
//         addNotification({
//           type: 'success',
//           message: 'Transaction executed successfully',
//           duration: 5000
//         });
        
//         return signature;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to execute transaction');
//         setError(error);
//         onError?.(error);
        
//         addNotification({
//           type: 'error',
//           message: `Transaction failed: ${error.message}`,
//           duration: 5000
//         });
        
//         return undefined;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [publicKey, signTransaction, addNotification]
//   );

//   // Record Transaction
//   const recordTransaction = useCallback(
//     async (
//       signature: string,
//       transactionType: string,
//       wallet: string,
//       streamId?: string,
//       donationId?: string,
//       distributionId?: string
//     ): Promise<TransactionRecordResponse> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.post<TransactionRecordResponse>('/program/record-transaction', {
//           signature,
//           transactionType,
//           wallet,
//           streamId,
//           donationId,
//           distributionId
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to record transaction');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Get Stream
//   const getStream = useCallback(
//     async (
//       streamName: string,
//       hostPublicKey: string
//     ): Promise<StreamData> => {
//       setIsLoading(true);
//       try {
//         const response = await apiClient.get<StreamData>('/program/stream', {
//           streamName,
//           hostPublicKey
//         });
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to get stream');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // List Streams
//   const listStreams = useCallback(
//     async (
//       hostWallet?: string,
//       status?: string,
//       limit?: number,
//       offset?: number
//     ): Promise<any> => {
//       setIsLoading(true);
//       try {
//         const params: Record<string, string> = {};
        
//         if (hostWallet) params.hostWallet = hostWallet;
//         if (status) params.status = status;
//         if (limit) params.limit = limit.toString();
//         if (offset) params.offset = offset.toString();
        
//         const response = await apiClient.get('/program/streams', params);
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to list streams');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // List Donations
//   const listDonations = useCallback(
//     async (
//       streamId: string,
//       donorWallet?: string,
//       limit?: number,
//       offset?: number
//     ): Promise<any> => {
//       setIsLoading(true);
//       try {
//         const params: Record<string, string> = { streamId };
        
//         if (donorWallet) params.donorWallet = donorWallet;
//         if (limit) params.limit = limit.toString();
//         if (offset) params.offset = offset.toString();
        
//         const response = await apiClient.get('/program/donations', params);
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to list donations');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // List Distributions
//   const listDistributions = useCallback(
//     async (
//       streamId: string,
//       recipientWallet?: string,
//       limit?: number,
//       offset?: number
//     ): Promise<any> => {
//       setIsLoading(true);
//       try {
//         const params: Record<string, string> = { streamId };
        
//         if (recipientWallet) params.recipientWallet = recipientWallet;
//         if (limit) params.limit = limit.toString();
//         if (offset) params.offset = offset.toString();
        
//         const response = await apiClient.get('/program/distributions', params);
//         return response;
//       } catch (err) {
//         const error = err instanceof Error ? err : new Error('Failed to list distributions');
//         setError(error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [apiClient]
//   );

//   // Create context value
//   const contextValue: ProgramContextType = {
//     getStreamPDA,
//     buildInitializeTransaction,
//     buildStartStreamTransaction,
//     buildCompleteStreamTransaction,
//     buildDepositTransaction,
//     buildDistributeTransaction,
//     buildRefundTransaction,
//     buildUpdateStreamTransaction,
//     executeTransaction,
//     recordTransaction,
//     getStream,
//     listStreams,
//     listDonations,
//     listDistributions,
//     isLoading,
//     error,
//     clearError
//   };

//   return (
//     <VidbloqProgramContext.Provider value={contextValue}>
//       {children}
//     </VidbloqProgramContext.Provider>
//   );
// };