import { createContext, useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  AccountInfo,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWalletContext } from "../hooks";
import {
  StreamStatus,
  StreamType,
  StreamData,
  DonorAccountData,
} from "../types";
import { baseApi } from "../utils";


// Network configuration
const NETWORK = "https://api.devnet.solana.com"; // Change to mainnet when ready

// Define the context type
type VidbloqProgramContextType = {
  connection: Connection | null;
  loading: boolean;
  error: string | null;
  getStreamPDA: (streamName: string, hostPublicKey: PublicKey) => Promise<PublicKey>;
  getDonorPDA: (streamPDA: PublicKey, donorPublicKey: PublicKey) => Promise<PublicKey>;
  initializeStream: (
    streamName: string,
    streamType: StreamType,
    mintAddress: PublicKey,
    endTime?: number
  ) => Promise<string>;
  startStream: (streamName: string) => Promise<string>;
  completeStream: (streamName: string) => Promise<string>;
  deposit: (
    streamName: string,
    hostPublicKey: PublicKey,
    amount: number,
    donorATA: PublicKey,
    streamATA: PublicKey
  ) => Promise<string>;
  distribute: (
    streamName: string,
    recipientPublicKey: PublicKey,
    amount: number,
    mintAddress: PublicKey,
    streamATA: PublicKey,
    recipientATA: PublicKey
  ) => Promise<string>;
  refund: (
    streamName: string,
    hostPublicKey: PublicKey,
    donorPublicKey: PublicKey,
    amount: number,
    donorATA: PublicKey,
    streamATA: PublicKey
  ) => Promise<string>;
  updateStream: (
    streamName: string,
    newEndTime?: number,
    newStatus?: StreamStatus
  ) => Promise<string>;
  fetchStream: (streamPDA: PublicKey) => Promise<StreamData | null>;
  fetchDonorAccount: (donorPDA: PublicKey) => Promise<DonorAccountData | null>;
  fetchUserStreams: (
    userPublicKey: PublicKey
  ) => Promise<{ account: StreamData; publicKey: PublicKey }[]>;
  subscribeToStream: (
    streamPDA: PublicKey,
    callback: (accountInfo: AccountInfo<Buffer> | null) => void
  ) => { unsubscribe: () => void };
};

// Create context with default values
export const VidbloqProgramContext =
  createContext<VidbloqProgramContextType | null>(null);

export const VidbloqProgramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // For debugging
  const DEBUG = true;

  // Get wallet context
  const { publicKey, signTransaction, connected } = useWalletContext();

  // Helper function to create and send transactions
  const createAndSendTransaction = async (instruction: TransactionInstruction): Promise<string> => {
    if (!connection || !publicKey || !signTransaction) {
      throw new Error("Connection not initialized or wallet not connected");
    }

    try {
      // Create transaction and add instruction
      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash for transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Sign transaction
      const signedTx = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  };

  // Helper function to deserialize instruction from API response
  const deserializeInstruction = (
    serializedIx: {
      keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[],
      programId: string,
      data: string
    }
  ): TransactionInstruction => {
    return new TransactionInstruction({
      keys: serializedIx.keys.map(key => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable
      })),
      programId: new PublicKey(serializedIx.programId),
      data: Buffer.from(serializedIx.data, 'base64')
    });
  };

  // Initialize connection
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const conn = new Connection(NETWORK, "confirmed");
        setConnection(conn);

        if (DEBUG) {
          console.log("Wallet connected:", connected);
          console.log("Public key available:", !!publicKey);
          console.log("Sign transaction available:", !!signTransaction);
          
          if (publicKey) {
            console.log("Public key:", publicKey.toString());
          }
        }
      } catch (err) {
        console.error("Failed to initialize connection:", err);
        setError(
          `Failed to initialize connection: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [connected, publicKey, signTransaction]);

  // Get PDA for a stream - uses backend API
  const getStreamPDA = async (streamName: string, hostPublicKey: PublicKey): Promise<PublicKey> => {
    try {
      const response = await fetch(
        `${baseApi}/solana/stream-pda?streamName=${streamName}&hostPublicKey=${hostPublicKey.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get stream PDA from backend');
      }
      
      const data = await response.json();
      return new PublicKey(data.pda);
    } catch (error) {
      console.error('Error fetching stream PDA:', error);
      
      // Fallback to local calculation if backend fails
      const [pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("stream"),
          Buffer.from(streamName),
          hostPublicKey.toBuffer(),
        ],
        new PublicKey('14SYsuFUHifkTHbgcvrZ4xKMsqeFGCD3rV7qNoZLdoND') // Your program ID
      );
      return pda;
    }
  };

  // Get PDA for a donor account - uses backend API
  const getDonorPDA = async (streamPDA: PublicKey, donorPublicKey: PublicKey): Promise<PublicKey> => {
    try {
      const response = await fetch(
        `${baseApi}/solana/donor-pda?streamPDA=${streamPDA.toString()}&donorPublicKey=${donorPublicKey.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get donor PDA from backend');
      }
      
      const data = await response.json();
      return new PublicKey(data.pda);
    } catch (error) {
      console.error('Error fetching donor PDA:', error);
      
      // Fallback to local calculation if backend fails
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("donor"), streamPDA.toBuffer(), donorPublicKey.toBuffer()],
        new PublicKey('14SYsuFUHifkTHbgcvrZ4xKMsqeFGCD3rV7qNoZLdoND') // Your program ID
      );
      return pda;
    }
  };

  // Initialize a stream using backend API
  const initializeStream = async (
    streamName: string,
    streamType: StreamType,
    mintAddress: PublicKey,
    endTime?: number
  ): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      console.log("Starting initializeStream with parameters:", {
        streamName,
        streamType,
        mintAddress: mintAddress.toString(),
        endTime
      });

      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-initialize-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          streamType,
          mintAddress: mintAddress.toString(),
          hostPublicKey: publicKey.toString(),
          endTime
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs created
      console.log("Stream PDA:", data.accounts.streamPDA);
      console.log("Stream ATA:", data.accounts.streamATA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to initialize stream:", err);
      if (err instanceof Error) {
        console.error("Error details:", {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      throw err;
    }
  };

  // Start a stream using backend API
  const startStream = async (streamName: string): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-start-stream-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: publicKey.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to start stream:", err);
      throw err;
    }
  };

  // Complete a stream using backend API
  const completeStream = async (streamName: string): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-complete-stream-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: publicKey.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to complete stream:", err);
      throw err;
    }
  };

  // Make a deposit to a stream using backend API
  const deposit = async (
    streamName: string,
    hostPublicKey: PublicKey,
    amount: number,
    donorATA: PublicKey,
    streamATA: PublicKey
  ): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-deposit-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: hostPublicKey.toString(),
          donorPublicKey: publicKey.toString(),
          amount,
          donorATA: donorATA.toString(),
          streamATA: streamATA.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      console.log("Donor PDA:", data.accounts.donorPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to deposit to stream:", err);
      throw err;
    }
  };

  // Distribute funds from a stream using backend API
  const distribute = async (
    streamName: string,
    recipientPublicKey: PublicKey,
    amount: number,
    mintAddress: PublicKey,
    streamATA: PublicKey,
    recipientATA: PublicKey
  ): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-distribute-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: publicKey.toString(),
          recipientPublicKey: recipientPublicKey.toString(),
          amount,
          mintAddress: mintAddress.toString(),
          streamATA: streamATA.toString(),
          recipientATA: recipientATA.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to distribute funds:", err);
      throw err;
    }
  };

  // Process a refund using backend API
  const refund = async (
    streamName: string,
    hostPublicKey: PublicKey,
    donorPublicKey: PublicKey,
    amount: number,
    donorATA: PublicKey,
    streamATA: PublicKey
  ): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-refund-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: hostPublicKey.toString(),
          donorPublicKey: donorPublicKey.toString(),
          initiatorPublicKey: publicKey.toString(),
          amount,
          donorATA: donorATA.toString(),
          streamATA: streamATA.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      console.log("Donor PDA:", data.accounts.donorPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to process refund:", err);
      throw err;
    }
  };

  // Update a stream using backend API
  const updateStream = async (
    streamName: string,
    newEndTime?: number,
    newStatus?: StreamStatus
  ): Promise<string> => {
    if (!publicKey || !connection || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    try {
      // Call backend to build the instruction
      const response = await fetch(`${baseApi}/solana/build-update-stream-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamName,
          hostPublicKey: publicKey.toString(),
          newEndTime,
          newStatus
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Log the PDAs
      console.log("Stream PDA:", data.accounts.streamPDA);
      
      // Deserialize the instruction
      const ix = deserializeInstruction(data.instruction);
      
      // Send the transaction
      return await createAndSendTransaction(ix);
    } catch (err) {
      console.error("Failed to update stream:", err);
      throw err;
    }
  };

  // Fetch a stream by PDA using backend API
  const fetchStream = async (streamPDA: PublicKey): Promise<StreamData | null> => {
    if (!connection) {
      throw new Error("Connection not initialized");
    }
  
    try {
      // Call backend to fetch the stream data
      const response = await fetch(
        `${baseApi}/solana/fetch-stream?streamPDA=${streamPDA.toString()}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Transform the data to the expected format
      return {
        host: new PublicKey(data.account.host),
        streamName: data.account.streamName,
        mint: new PublicKey(data.account.mint),
        status: data.account.status,
        totalDeposited: new BN(data.account.totalDeposited),
        totalDistributed: new BN(data.account.totalDistributed),
        createdAt: new BN(data.account.createdAt),
        startTime: data.account.startTime ? new BN(data.account.startTime) : null,
        endTime: data.account.endTime ? new BN(data.account.endTime) : null,
        streamType: data.account.streamType,
        bump: data.account.bump
      } as StreamData;
    } catch (err) {
      console.error("Failed to fetch stream:", err);
      return null;
    }
  };

  // Fetch a donor account by PDA using backend API
  const fetchDonorAccount = async (donorPDA: PublicKey): Promise<DonorAccountData | null> => {
    if (!connection) {
      throw new Error("Connection not initialized");
    }
  
    try {
      // Call backend to fetch the donor account data
      const response = await fetch(
        `${baseApi}/solana/fetch-donor-account?donorPDA=${donorPDA.toString()}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Transform the data to the expected format
      return {
        stream: new PublicKey(data.account.stream),
        donor: new PublicKey(data.account.donor),
        amount: new BN(data.account.amount),
        refunded: data.account.refunded,
        bump: data.account.bump
      } as DonorAccountData;
    } catch (err) {
      console.error("Failed to fetch donor account:", err);
      return null;
    }
  };

  // Fetch all streams for a user using backend API
  const fetchUserStreams = async (
    userPublicKey: PublicKey
  ): Promise<{ account: StreamData; publicKey: PublicKey }[]> => {
    if (!connection) {
      throw new Error("Connection not initialized");
    }
  
    try {
      // Call backend to fetch user streams
      const response = await fetch(
        `${baseApi}/solana/fetch-user-streams?userPublicKey=${userPublicKey.toString()}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.error}`);
      }
      
      const data = await response.json();
      
      // Transform the data to the expected format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.streams.map((item: any) => ({
        publicKey: new PublicKey(item.publicKey),
        account: {
          host: new PublicKey(item.account.host),
          streamName: item.account.streamName,
          mint: new PublicKey(item.account.mint),
          status: item.account.status,
          totalDeposited: new BN(item.account.totalDeposited),
          totalDistributed: new BN(item.account.totalDistributed),
          createdAt: new BN(item.account.createdAt),
          startTime: item.account.startTime ? new BN(item.account.startTime) : null,
          endTime: item.account.endTime ? new BN(item.account.endTime) : null,
          streamType: item.account.streamType,
          bump: item.account.bump
        } as StreamData
      }));
    } catch (err) {
      console.error("Failed to fetch user streams:", err);
      return [];
    }
  };

  // Subscribe to stream changes
  const subscribeToStream = (
    streamPDA: PublicKey,
    callback: (accountInfo: AccountInfo<Buffer> | null) => void
  ) => {
    if (!connection) {
      throw new Error("Connection not initialized");
    }

    const subscriptionId = connection.onAccountChange(
      streamPDA,
      callback,
      "confirmed"
    );

    return {
      unsubscribe: () => {
        connection.removeAccountChangeListener(subscriptionId);
      },
    };
  };

  return (
    <VidbloqProgramContext.Provider
      value={{
        connection,
        loading,
        error,
        getStreamPDA,
        getDonorPDA,
        initializeStream,
        startStream,
        completeStream,
        deposit,
        distribute,
        refund,
        updateStream,
        fetchStream,
        fetchDonorAccount,
        fetchUserStreams,
        subscribeToStream,
      }}
    >
      {children}
    </VidbloqProgramContext.Provider>
  );
};
