import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Get the Associated Token Account for a given wallet and mint
 * If the ATA doesn't exist, returns instructions to create it
 */
export const getOrCreateAssociatedTokenAccount = async (
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
) => {
  try {
    // Get the associated token account address
    const ata = await getAssociatedTokenAddress(
      mint,
      owner,
      allowOwnerOffCurve,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(ata);
    
    if (!accountInfo) {
      // If not, return instructions to create it
      return {
        address: ata,
        instructions: [
          createAssociatedTokenAccountInstruction(
            payer,
            ata,
            owner,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        ],
        exists: false,
      };
    }

    // The account exists, no need for instructions
    return {
      address: ata,
      instructions: [],
      exists: true,
    };
  } catch (error) {
    console.error('Error getting or creating associated token account:', error);
    throw error;
  }
};

/**
 * Get SPL token balance for a given token account
 */
export const getTokenBalance = async (
  connection: Connection,
  tokenAccount: PublicKey,
) => {
  try {
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    return accountInfo.value.uiAmount || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
};

/**
 * Get all token accounts owned by a wallet for a specific mint
 */
export const getTokenAccountsByOwner = async (
  connection: Connection,
  ownerAddress: PublicKey,
  mintAddress?: PublicKey,
) => {
  try {
    // Create query options - if mintAddress is provided, we'll filter by mint
    const queryOptions = mintAddress 
      ? { mint: mintAddress }
      : { programId: TOKEN_PROGRAM_ID };

    const accounts = await connection.getParsedTokenAccountsByOwner(
      ownerAddress,
      queryOptions
    );

    return accounts.value.map((account) => ({
      pubkey: account.pubkey,
      account: account.account,
      info: account.account.data.parsed.info,
    }));
  } catch (error) {
    console.error('Error getting token accounts by owner:', error);
    throw error;
  }
};

/**
 * Convert a token amount from the smallest unit to a human-readable format
 * based on the number of decimals in the mint
 */
export const formatTokenAmount = (amount: number | string, decimals: number) => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return amountNum / Math.pow(10, decimals);
};

/**
 * Convert a human-readable token amount to the smallest unit
 * based on the number of decimals in the mint
 */
export const toTokenAmount = (amount: number | string, decimals: number) => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(amountNum * Math.pow(10, decimals));
};