/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useRequirePublicKey } from './useRequirePublicKey';
import { useTenantContext } from './useTenantContext';

interface TokenBalance {
  amount: number;
  uiAmount: number;
  decimals: number;
  symbol: string;
  mint?: string;
}

interface BalanceData {
  balances: {
    sol?: TokenBalance;
    usdc?: TokenBalance;
    [key: string]: TokenBalance | undefined;
  };
  wallet: string;
  timestamp: number;
  cached: boolean;
  stale?: boolean;
}

export const useBalance = (refreshInterval?: number, tokens: string = 'usdc,sol') => {
  const { publicKey } = useRequirePublicKey();
  const { apiClient, websocket, isConnected } = useTenantContext();
  const [balances, setBalances] = useState<BalanceData['balances'] | null>(null);
  
  // ✅ FIXED: Start with loading=true so components know data isn't ready yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalances(null);
      setLoading(false); // Not loading if no wallet
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        tokens,
        forceRefresh: 'true'
      });

      const data = await apiClient.get<BalanceData>(
        `/balance/${publicKey.toString()}?${params.toString()}`
      );
      
      setBalances(data.balances);
      setCached(data.cached);
      
      if (data.stale) {
        console.warn('Using stale cached balance data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [publicKey, apiClient, tokens]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
  }, [publicKey, tokens]);

  // Set up refresh interval if provided
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchBalance();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchBalance]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!websocket || !isConnected || !publicKey) {
      console.log('❌ WebSocket not ready:', { 
        websocket: !!websocket, 
        isConnected, 
        publicKey: !!publicKey 
      });
      return;
    }

    // console.log('✅ Setting up listeners for:', publicKey.toString());

    const handleTransactionComplete = (data: any) => {
      console.log('🔔 transactionComplete event received:', data);
      
      const isOurTransaction = 
        data?.senderWallet === publicKey.toString() ||
        data?.recipientWallet === publicKey.toString();
      
      if (isOurTransaction) {
        console.log('✅ Transaction involves our wallet, refreshing balance...');
        setTimeout(() => fetchBalance(), 1000);
      } else {
        console.log('⏭️  Transaction is for different wallet');
      }
    };

    const handleBalanceUpdate = (data: any) => {
      console.log('🔔 balanceUpdate event received:', data);
      
      if (data?.wallet === publicKey.toString()) {
        console.log('✅ Balance update is for our wallet, refreshing...');
        fetchBalance();
      } else {
        console.log('⏭️  Balance update is for different wallet:', data?.wallet);
      }
    };

    websocket.addEventListener('transactionComplete', handleTransactionComplete);
    websocket.addEventListener('balanceUpdate', handleBalanceUpdate);

    return () => {
      // console.log('🧹 Cleaning up listeners for:', publicKey.toString());
      websocket.removeEventListener('transactionComplete', handleTransactionComplete);
      websocket.removeEventListener('balanceUpdate', handleBalanceUpdate);
    };
  }, [websocket, isConnected, publicKey, fetchBalance]);

  const refresh = useCallback(() => {
    return fetchBalance();
  }, [fetchBalance]);

  return {
    balances,
    loading,
    error,
    cached,
    refresh,
    solBalance: balances?.sol?.amount || 0,
    usdcBalance: balances?.usdc?.amount || 0,
  };
};

// Hook for batch balances (useful for displaying multiple users)
export const useBatchBalances = (wallets: string[], tokens: string = 'usdc,sol') => {
  const { apiClient } = useTenantContext();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchBalances = useCallback(async () => {
    if (!wallets || wallets.length === 0) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ tokens });
      
      const data = await apiClient.post<{ balances: any[] }>(
        `/balance/batch?${params.toString()}`,
        { wallets }
      );
      
      setBalances(data.balances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch balances');
    } finally {
      setLoading(false);
    }
  }, [wallets.join(','), apiClient, tokens]);

  useEffect(() => {
    fetchBatchBalances();
  }, [fetchBatchBalances]);

  return {
    balances,
    loading,
    error,
    refresh: fetchBatchBalances
  };
};