import { PublicKey } from '@solana/web3.js';

// Stream status types matching the enum from IDL
export type StreamStatus = 'active' | 'ended' | 'cancelled';

// Stream types matching the enum from IDL
export type StreamType = 'live' | 'prepaid' | 'conditional';


export interface StreamData {
  host: PublicKey;
  streamName: string;
  bump: number;
  mint: PublicKey;
  status: {
    active?: object;
    ended?: object;
    cancelled?: object;
  };
  totalDeposited: string; // BN values come back as strings
  totalDistributed: string; // BN values come back as strings
  createdAt: string; // BN values come back as strings
  startTime: string | null; // BN values come back as strings
  endTime: string | null; // BN values come back as strings
  streamType: {
    live?: object;
    prepaid?: {
      minDuration: string; // BN values come back as strings
    };
    conditional?: {
      minAmount: string | null; // BN values come back as strings
      unlockTime: string | null; // BN values come back as strings
    };
  };
}

// Donor account data structure returned from fetchDonorAccount
export interface DonorAccountData {
  stream: PublicKey;
  donor: PublicKey;
  amount: string; // BN values come back as strings
  refunded: boolean;
  bump: number;
}

// Events
export interface DepositMadeEvent {
  stream: PublicKey;
  donor: PublicKey;
  amount: string; // BN values come back as strings
  timestamp: string; // BN values come back as strings
}

export interface FundsDistributedEvent {
  stream: PublicKey;
  recipient: PublicKey;
  amount: string; // BN values come back as strings
  timestamp: string; // BN values come back as strings
}

export interface RefundProcessedEvent {
  stream: PublicKey;
  donor: PublicKey;
  amount: string; // BN values come back as strings
  remainingBalance: string; // BN values come back as strings
  timestamp: string; // BN values come back as strings
}

export interface StreamInitializedEvent {
  stream: PublicKey;
  host: PublicKey;
  streamType: {
    live?: object;
    prepaid?: {
      minDuration: string; // BN values come back as strings
    };
    conditional?: {
      minAmount: string | null; // BN values come back as strings
      unlockTime: string | null; // BN values come back as strings
    };
  };
  timestamp: string; // BN values come back as strings
}