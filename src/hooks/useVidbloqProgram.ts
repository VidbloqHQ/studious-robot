// import { useContext } from "react";
// import { VidbloqProgramContext, ProgramContextType } from "../context";

// /**
//  * Custom hook to access the Solana Program context
//  * @returns The Solana Program context
//  * @throws Error if used outside of a SolanaProgramProvider
//  */
// export const useVidbloqProgram = (): ProgramContextType => {
//   const context = useContext(VidbloqProgramContext);
  
//   if (context === null) {
//     throw new Error("useSolanaProgram must be used within a SolanaProgramProvider");
//   }
  
//   return context;
// };

// /**
//  * Custom hook for managing stream operations
//  * This hook provides a simplified interface for common stream operations
//  */
// export const useStreamOperations = () => {
//   const {
//     buildInitializeTransaction,
//     buildStartStreamTransaction,
//     buildCompleteStreamTransaction,
//     buildUpdateStreamTransaction,
//     executeTransaction,
//     recordTransaction,
//     getStream,
//     listStreams,
//     isLoading
//   } = useVidbloqProgram();
  
//   // Initialize a new stream
//   const initializeStream = async (
//     streamName: string,
//     streamType: "Live" | "Prepaid" | "Conditional",
//     mintAddress: string,
//     hostPublicKey: string,
//     endTime?: number
//   ) => {
//     // Build the transaction
//     const txResponse = await buildInitializeTransaction(
//       streamName,
//       streamType,
//       mintAddress,
//       hostPublicKey,
//       endTime
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "initialize",
//           hostPublicKey,
//           txResponse.streamId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       streamPDA: txResponse.accounts.streamPDA,
//       streamATA: txResponse.accounts.streamATA
//     };
//   };
  
//   // Start a stream
//   const startStream = async (
//     streamName: string,
//     hostPublicKey: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildStartStreamTransaction(
//       streamName,
//       hostPublicKey
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "start",
//           hostPublicKey,
//           txResponse.streamId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       streamPDA: txResponse.accounts.streamPDA
//     };
//   };
  
//   // Complete a stream
//   const completeStream = async (
//     streamName: string,
//     hostPublicKey: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildCompleteStreamTransaction(
//       streamName,
//       hostPublicKey
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "complete",
//           hostPublicKey,
//           txResponse.streamId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       streamPDA: txResponse.accounts.streamPDA
//     };
//   };
  
//   // Update a stream
//   const updateStream = async (
//     streamName: string,
//     hostPublicKey: string,
//     newEndTime?: number,
//     newStatus?: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildUpdateStreamTransaction(
//       streamName,
//       hostPublicKey,
//       newEndTime,
//       newStatus
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "update",
//           hostPublicKey,
//           txResponse.streamId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       streamPDA: txResponse.accounts.streamPDA
//     };
//   };
  
//   // Fetch a stream's data
//   const fetchStream = async (
//     streamName: string,
//     hostPublicKey: string
//   ) => {
//     return await getStream(streamName, hostPublicKey);
//   };
  
//   // List streams with optional filtering
//   const fetchStreams = async (
//     hostWallet?: string,
//     status?: string,
//     limit?: number,
//     offset?: number
//   ) => {
//     return await listStreams(hostWallet, status, limit, offset);
//   };
  
//   return {
//     initializeStream,
//     startStream,
//     completeStream,
//     updateStream,
//     fetchStream,
//     fetchStreams,
//     isLoading
//   };
// };

// /**
//  * Custom hook for managing donation and distribution operations
//  * This hook provides a simplified interface for donation and distribution operations
//  */
// export const useTokenOperations = () => {
//   const {
//     buildDepositTransaction,
//     buildDistributeTransaction,
//     buildRefundTransaction,
//     executeTransaction,
//     recordTransaction,
//     listDonations,
//     listDistributions,
//     isLoading
//   } = useVidbloqProgram();
  
//   // Make a deposit to a stream
//   const depositToStream = async (
//     streamName: string,
//     hostPublicKey: string,
//     donorPublicKey: string,
//     amount: number,
//     donorATA: string,
//     streamATA: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildDepositTransaction(
//       streamName,
//       hostPublicKey,
//       donorPublicKey,
//       amount,
//       donorATA,
//       streamATA
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "deposit",
//           donorPublicKey,
//           txResponse.streamId,
//           txResponse.donationId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       donationId: txResponse.donationId,
//       streamPDA: txResponse.accounts.streamPDA,
//       donorPDA: txResponse.accounts.donorPDA
//     };
//   };
  
//   // Distribute tokens from a stream
//   const distributeFromStream = async (
//     streamName: string,
//     hostPublicKey: string,
//     recipientPublicKey: string,
//     amount: number,
//     mintAddress: string,
//     streamATA: string,
//     recipientATA: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildDistributeTransaction(
//       streamName,
//       hostPublicKey,
//       recipientPublicKey,
//       amount,
//       mintAddress,
//       streamATA,
//       recipientATA
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "distribute",
//           hostPublicKey,
//           txResponse.streamId,
//           undefined,
//           txResponse.distributionId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       distributionId: txResponse.distributionId,
//       streamPDA: txResponse.accounts.streamPDA
//     };
//   };
  
//   // Refund a donation
//   const refundDonation = async (
//     streamName: string,
//     hostPublicKey: string,
//     donorPublicKey: string,
//     initiatorPublicKey: string,
//     amount: number,
//     donorATA: string,
//     streamATA: string
//   ) => {
//     // Build the transaction
//     const txResponse = await buildRefundTransaction(
//       streamName,
//       hostPublicKey,
//       donorPublicKey,
//       initiatorPublicKey,
//       amount,
//       donorATA,
//       streamATA
//     );
    
//     // Execute the transaction
//     const signature = await executeTransaction(
//       [txResponse.instruction],
//       async (sig) => {
//         // Record the transaction on success
//         await recordTransaction(
//           sig,
//           "refund",
//           initiatorPublicKey,
//           txResponse.streamId,
//           txResponse.donationId
//         );
//       }
//     );
    
//     return {
//       signature,
//       streamId: txResponse.streamId,
//       donationId: txResponse.donationId,
//       streamPDA: txResponse.accounts.streamPDA,
//       donorPDA: txResponse.accounts.donorPDA
//     };
//   };
  
//   // Fetch donations for a stream
//   const fetchDonations = async (
//     streamId: string,
//     donorWallet?: string,
//     limit?: number,
//     offset?: number
//   ) => {
//     return await listDonations(streamId, donorWallet, limit, offset);
//   };
  
//   // Fetch distributions for a stream
//   const fetchDistributions = async (
//     streamId: string,
//     recipientWallet?: string,
//     limit?: number,
//     offset?: number
//   ) => {
//     return await listDistributions(streamId, recipientWallet, limit, offset);
//   };
  
//   return {
//     depositToStream,
//     distributeFromStream,
//     refundDonation,
//     fetchDonations,
//     fetchDistributions,
//     isLoading
//   };
// };