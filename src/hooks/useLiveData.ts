import { useState, useEffect, useRef, useCallback } from 'react';
import { useTenantContext } from './useTenantContext';
import { getRequestManager } from '../utils/request-manager';

interface UseLiveDataOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
  onData?: (data: T) => void;
  onError?: (error: Error) => void;
  maxBackoff?: number;
}

interface UseLiveDataReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<T | null>;
  pause: () => void;
  resume: () => void;
}

export const useLiveData = <T>(
  options: UseLiveDataOptions<T>
): UseLiveDataReturn<T> => {
  const {
    fetcher,
    interval = 10000,
    enabled = true,
    onData,
    onError,
    maxBackoff = 8
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(1);
  const isMountedRef = useRef<boolean>(true);
  const isPollingRef = useRef<boolean>(false);

  const poll = useCallback(async (): Promise<T | null> => {
    if (!isMountedRef.current || isPaused || isPollingRef.current) {
      return null;
    }

    isPollingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        backoffRef.current = 1; // Reset backoff on success
        onData?.(result);
        return result;
      }
      return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (!isMountedRef.current) {
        return null;
      }

      setError(err);
      onError?.(err);
      
      // Handle rate limiting with exponential backoff
      if (err.message?.includes('Rate limit')) {
        backoffRef.current = Math.min(backoffRef.current * 2, maxBackoff);
        
        // Clear existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Set new interval with backoff
        const newInterval = interval * backoffRef.current;
        console.warn(`Rate limited, backing off to ${newInterval}ms interval`);
        
        if (enabled && !isPaused && isMountedRef.current) {
          intervalRef.current = setInterval(() => {
            poll();
          }, newInterval);
        }
      }
      
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        isPollingRef.current = false;
      }
    }
  }, [fetcher, interval, enabled, isPaused, onData, onError, maxBackoff]);

  const refetch = useCallback(async (): Promise<T | null> => {
    // Reset backoff when manually refetching
    backoffRef.current = 1;
    return poll();
  }, [poll]);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    if (enabled) {
      poll(); // Fetch immediately
      // Set up interval
      const currentInterval = interval * backoffRef.current;
      intervalRef.current = setInterval(poll, currentInterval);
    }
  }, [enabled, interval, poll]);

  // Set up polling
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    poll();

    // Set up interval
    const currentInterval = interval * backoffRef.current;
    intervalRef.current = setInterval(poll, currentInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, isPaused, poll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    refetch,
    pause,
    resume
  };
};

// Specialized hook for poll/quiz results that need real-time updates
export const useLiveResults = <T>(
  endpoint: string,
  options: {
    interval?: number;
    enabled?: boolean;
    onUpdate?: (data: T) => void;
  } = {}
) => {
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();
  
  const fetcher = useCallback(async () => {
    return requestManager.execute<T>(
      endpoint,
      async () => apiClient.get<T>(endpoint),
      {
        cacheType: 'default',
        rateLimitType: 'default'
      }
    );
  }, [endpoint, apiClient, requestManager]);

  return useLiveData<T>({
    fetcher,
    interval: options.interval || 5000, // Poll every 5 seconds for live data
    enabled: options.enabled,
    onData: options.onUpdate
  });
};