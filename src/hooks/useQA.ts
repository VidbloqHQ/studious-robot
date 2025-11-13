/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useTenantContext } from './useTenantContext';
import { getRequestManager } from '../utils/request-manager';
import { useLiveData } from './useLiveData';

interface QAContentResponse {
  id: string;
  title: string | null;
  description: string | null;
  duration: number | null;
  isCompleted: boolean;
  qaContent: {
    id: string;
    topic: string | null;
  };
  responseCount: number;
}

interface UseGetQAContentReturn {
  getQAContent: (agendaId: string) => Promise<QAContentResponse | null>;
  isLoading: boolean;
  error: Error | null;
  qaContent: QAContentResponse | null;
  refresh: (agendaId: string) => Promise<QAContentResponse | null>;
}

export const useGetQAContent = (): UseGetQAContentReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [qaContent, setQAContent] = useState<QAContentResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchQAContent = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<QAContentResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `qa:content:${agendaId}`;
    
    try {
      const content = await requestManager.execute<QAContentResponse>(
        cacheKey,
        async () => apiClient.get<QAContentResponse>(`/qa/${agendaId}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setQAContent(content);
      return content;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && qaContent) {
        console.warn('Rate limit hit for Q&A content, using cached data');
        return qaContent;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, qaContent]);

  const getQAContent = useCallback((agendaId: string) => {
    return fetchQAContent(agendaId, false);
  }, [fetchQAContent]);

  const refresh = useCallback((agendaId: string) => {
    return fetchQAContent(agendaId, true);
  }, [fetchQAContent]);

  return {
    getQAContent,
    isLoading,
    error,
    qaContent,
    refresh,
  };
};

interface SubmitQAResponseRequest {
  wallet: string;
  question: string;
  responseType?: 'question' | 'answer';
}

interface SubmitQAResponseResponse {
  message: string;
  agendaId: string;
  title: string | null;
}

interface UseSubmitQAResponseReturn {
  submitQAResponse: (agendaId: string, data: SubmitQAResponseRequest) => Promise<SubmitQAResponseResponse | null>;
  isLoading: boolean;
  error: Error | null;
  response: SubmitQAResponseResponse | null;
}

export const useSubmitQAResponse = (): UseSubmitQAResponseReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<SubmitQAResponseResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const submitQAResponse = async (
    agendaId: string,
    data: SubmitQAResponseRequest
  ): Promise<SubmitQAResponseResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }
    
    if (!data.wallet) {
      setError(new Error('Wallet address is required'));
      return null;
    }
    
    if (!data.question) {
      setError(new Error('Question is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const submitResponse = await requestManager.execute<SubmitQAResponseResponse>(
        `qa:submit:${agendaId}:${Date.now()}`,
        async () => apiClient.post<SubmitQAResponseResponse>(`/qa/${agendaId}`, data),
        {
          skipCache: true,
          rateLimitType: 'default'
        }
      );
      
      // Invalidate related Q&A caches
      requestManager.invalidate(`qa:content:${agendaId}`);
      
      setResponse(submitResponse);
      return submitResponse;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitQAResponse,
    isLoading,
    error,
    response,
  };
};

interface UseLiveQAContentReturn {
  qaContent: QAContentResponse | null;
  error: Error | null;
  isLoading: boolean;
  pause: () => void;
  resume: () => void;
  refetch: () => Promise<QAContentResponse | null>;
}

export const useLiveQAContent = (
  agendaId: string,
  options: {
    enabled?: boolean;
    interval?: number;
    onUpdate?: (data: QAContentResponse) => void;
  } = {}
): UseLiveQAContentReturn => {
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetcher = useCallback(async () => {
    if (!agendaId) {
      throw new Error('Agenda ID is required');
    }

    const cacheKey = `qa:content:${agendaId}`;
    
    return requestManager.execute<QAContentResponse>(
      cacheKey,
      async () => apiClient.get<QAContentResponse>(`/qa/${agendaId}`),
      {
        cacheType: 'default',
        rateLimitType: 'default',
      }
    );
  }, [agendaId, apiClient, requestManager]);

  const liveData = useLiveData<QAContentResponse>({
    fetcher,
    interval: options.interval || 10000, // Poll every 10 seconds by default
    enabled: options.enabled !== false && !!agendaId,
    onData: options.onUpdate
  });

  return {
    qaContent: liveData.data,
    error: liveData.error,
    isLoading: liveData.isLoading,
    pause: liveData.pause,
    resume: liveData.resume,
    refetch: liveData.refetch
  };
};