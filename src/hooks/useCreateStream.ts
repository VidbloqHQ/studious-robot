import { useState } from 'react';
import { useTenantContext } from './useTenantContext';
import { CallType, StreamSessionType, StreamFundingType, CreateStreamResponse } from '../types/index';

interface CreateStreamRequest {
  wallet: string;
  callType?: CallType;
  scheduledFor?: string | Date;
  title?: string;
  streamSessionType?: StreamSessionType;
  fundingType?: StreamFundingType;
  isPublic?: boolean;
}

interface UseCreateStreamReturn {
  createStream: (data: CreateStreamRequest) => Promise<CreateStreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: CreateStreamResponse | null;
}

/**
 * Hook for creating a new stream
 * @returns Object containing createStream function, loading state, error state, and created stream
 */
export const useCreateStream = (): UseCreateStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<CreateStreamResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Create a new stream
   * @param data - Stream creation request data
   * @returns Created stream or null if an error occurred
   */
  const createStream = async (data: CreateStreamRequest): Promise<CreateStreamResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the API client to make the POST request to the /streams endpoint
      const streamData = await apiClient.post<CreateStreamResponse>('/stream', data);
      
      setStream(streamData);
      return streamData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createStream,
    isLoading,
    error,
    stream,
  };
};