/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useTenantContext } from './useTenantContext';
import { useStreamContext } from './useStreamContext';
import { getRequestManager } from '../utils/request-manager';
import { useLiveData } from './useLiveData';

interface SubmitPollVoteRequest {
  agendaId: string;
  selectedOption: string;
  wallet: string;
  streamId?: string;
}

interface PollVoteResponse {
  message: string;
  selectedOption: string;
  agendaId: string;
  pollTitle: string | null;
}

interface UseSubmitPollVoteReturn {
  submitPollVote: (data: SubmitPollVoteRequest) => Promise<PollVoteResponse | null>;
  isLoading: boolean;
  error: Error | null;
  response: PollVoteResponse | null;
}

export const useSubmitPollVote = (): UseSubmitPollVoteReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<PollVoteResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const { streamMetadata: { streamId } } = useStreamContext();
  const requestManager = getRequestManager();

  const submitPollVote = async (data: SubmitPollVoteRequest): Promise<PollVoteResponse | null> => {
    if (!data.agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }
    
    if (!data.selectedOption) {
      setError(new Error('Selected option is required'));
      return null;
    }
    
    if (!data.wallet) {
      setError(new Error('Wallet address is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
     const payload = {
      ...data, streamId
    };
    try {
      const voteResponse = await requestManager.execute<PollVoteResponse>(
        `poll:vote:${data.agendaId}:${Date.now()}`,
        async () => apiClient.post<PollVoteResponse>('/poll', payload),
        {
          skipCache: true,
          rateLimitType: 'default'
        }
      );
      
      // Invalidate related poll caches
      requestManager.invalidate(`poll:${data.agendaId}`);
      requestManager.invalidate(`poll:results:${data.agendaId}`);
      requestManager.invalidate(`poll:user-vote:${data.agendaId}:${data.wallet}`);
      
      setResponse(voteResponse);
      return voteResponse;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitPollVote,
    isLoading,
    error,
    response,
  };
};

interface PollResultsResponse {
  id: string;
  title: string | null;
  totalVotes: number;
  options: string[];
  voteCounts: Record<string, number>;
}

interface UseGetPollResultsReturn {
  getPollResults: (agendaId: string) => Promise<PollResultsResponse | null>;
  isLoading: boolean;
  error: Error | null;
  results: PollResultsResponse | null;
  refresh: (agendaId: string) => Promise<PollResultsResponse | null>;
}

export const useGetPollResults = (): UseGetPollResultsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<PollResultsResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchPollResults = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<PollResultsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `poll:results:${agendaId}`;
    
    try {
      const pollResults = await requestManager.execute<PollResultsResponse>(
        cacheKey,
        async () => apiClient.get<PollResultsResponse>(`/poll/${agendaId}/results`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setResults(pollResults);
      return pollResults;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && results) {
        console.warn('Rate limit hit for poll results, using cached data');
        return results;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, results]);

  const getPollResults = useCallback((agendaId: string) => {
    return fetchPollResults(agendaId, false);
  }, [fetchPollResults]);

  const refresh = useCallback((agendaId: string) => {
    return fetchPollResults(agendaId, true);
  }, [fetchPollResults]);

  return {
    getPollResults,
    isLoading,
    error,
    results,
    refresh,
  };
};

interface UseLivePollResultsReturn {
  results: PollResultsResponse | null;
  error: Error | null;
  isLoading: boolean;
  pause: () => void;
  resume: () => void;
  refetch: () => Promise<PollResultsResponse | null>;
}

export const useLivePollResults = (
  agendaId: string,
  options: {
    enabled?: boolean;
    interval?: number;
    onUpdate?: (data: PollResultsResponse) => void;
  } = {}
): UseLivePollResultsReturn => {
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetcher = useCallback(async () => {
    if (!agendaId) {
      throw new Error('Agenda ID is required');
    }

    const cacheKey = `poll:results:${agendaId}`;
    
    return requestManager.execute<PollResultsResponse>(
      cacheKey,
      async () => apiClient.get<PollResultsResponse>(`/poll/${agendaId}`),
      {
        cacheType: 'default',
        rateLimitType: 'default',
      }
    );
  }, [agendaId, apiClient, requestManager]);

  const liveData = useLiveData<PollResultsResponse>({
    fetcher,
    interval: options.interval || 5000, // Poll every 5 seconds by default
    enabled: options.enabled !== false && !!agendaId,
    onData: options.onUpdate
  });

  return {
    results: liveData.data,
    error: liveData.error,
    isLoading: liveData.isLoading,
    pause: liveData.pause,
    resume: liveData.resume,
    refetch: liveData.refetch
  };
};

interface UserPollVoteResponse {
  hasVoted: boolean;
  vote: string | null;
  title: string | null;
  options: string[];
}

interface UseGetUserPollVoteReturn {
  getUserPollVote: (agendaId: string, wallet: string) => Promise<UserPollVoteResponse | null>;
  isLoading: boolean;
  error: Error | null;
  vote: UserPollVoteResponse | null;
  refresh: (agendaId: string, wallet: string) => Promise<UserPollVoteResponse | null>;
}

export const useGetUserPollVote = (): UseGetUserPollVoteReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [vote, setVote] = useState<UserPollVoteResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchUserVote = useCallback(async (
    agendaId: string,
    wallet: string,
    forceRefresh = false
  ): Promise<UserPollVoteResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }
    
    if (!wallet) {
      setError(new Error('Wallet address is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `poll:user-vote:${agendaId}:${wallet}`;
    
    try {
      const userVote = await requestManager.execute<UserPollVoteResponse>(
        cacheKey,
        async () => apiClient.get<UserPollVoteResponse>(`/poll/${agendaId}/user-vote?wallet=${wallet}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setVote(userVote);
      return userVote;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && vote) {
        console.warn('Rate limit hit for user poll vote, using cached data');
        return vote;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, vote]);

  const getUserPollVote = useCallback((agendaId: string, wallet: string) => {
    return fetchUserVote(agendaId, wallet, false);
  }, [fetchUserVote]);

  const refresh = useCallback((agendaId: string, wallet: string) => {
    return fetchUserVote(agendaId, wallet, true);
  }, [fetchUserVote]);

  return {
    getUserPollVote,
    isLoading,
    error,
    vote,
    refresh,
  };
};

interface PollContentResponse {
  id: string;
  title: string | null;
  description: string | null;
  duration: number | null;
  isCompleted: boolean;
  pollContent: {
    id: string;
    options: string[];
    totalVotes: number;
  };
  responseCount: number;
}

interface UseGetPollContentReturn {
  getPollContent: (agendaId: string) => Promise<PollContentResponse | null>;
  isLoading: boolean;
  error: Error | null;
  pollContent: PollContentResponse | null;
  refresh: (agendaId: string) => Promise<PollContentResponse | null>;
}

export const useGetPollContent = (): UseGetPollContentReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollContent, setPollContent] = useState<PollContentResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchPollContent = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<PollContentResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `poll:content:${agendaId}`;
    
    try {
      const content = await requestManager.execute<PollContentResponse>(
        cacheKey,
        async () => apiClient.get<PollContentResponse>(`/poll/${agendaId}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setPollContent(content);
      return content;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && pollContent) {
        console.warn('Rate limit hit for poll content, using cached data');
        return pollContent;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, pollContent]);

  const getPollContent = useCallback((agendaId: string) => {
    return fetchPollContent(agendaId, false);
  }, [fetchPollContent]);

  const refresh = useCallback((agendaId: string) => {
    return fetchPollContent(agendaId, true);
  }, [fetchPollContent]);

  return {
    getPollContent,
    isLoading,
    error,
    pollContent,
    refresh,
  };
};

// Update the existing useGetPollResults to use the new endpoint path
// In your existing useGetPollResults hook, change the API path:
// FROM: `/poll/${agendaId}`
// TO: `/poll/${agendaId}/results`