/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { useTenantContext } from "./useTenantContext";
import {
  CallType,
  StreamSessionType,
  StreamFundingType,
  StreamResponse,
} from "../types/index";
import { getRequestManager } from "../utils/request-manager";

// Enhanced StreamResponse type based on server response
interface EnhancedStreamResponse extends StreamResponse {
  totalAgendas?: number;
  totalParticipants?: number;
  activeParticipants?: number;
}

interface UseGetStreamReturn {
  getStream: (streamName: string) => Promise<EnhancedStreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: EnhancedStreamResponse | null;
  refresh: (streamName: string) => Promise<EnhancedStreamResponse | null>;
}

export const useGetStream = (): UseGetStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<EnhancedStreamResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchStream = useCallback(async (
    streamName: string,
    forceRefresh = false
  ): Promise<EnhancedStreamResponse | null> => {
    if (!streamName) {
      setError(new Error("Stream name is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Use streamName as the identifier (matching server's use of 'name' field)
    const cacheKey = `stream:${streamName}`;

    try {
      const streamData = await requestManager.execute<EnhancedStreamResponse>(
        cacheKey,
        async () => apiClient.get<EnhancedStreamResponse>(`/stream/${streamName}`),
        {
          cacheType: 'stream',
          forceRefresh,
          rateLimitType: 'stream'
        }
      );

      setStream(streamData);
      return streamData;
    } catch (err: any) {
      // Handle timeout errors specifically
      if (err.code === 'TIMEOUT' || err.message?.includes('timeout')) {
        setError(new Error('Request timed out. Please try again.'));
        return stream; // Return cached data if available
      }
      
      // Return cached data on rate limit
      if (err.message?.includes('Rate limit exceeded') && stream) {
        console.warn('Rate limit hit for stream fetch, using cached data');
        return stream;
      }
      
      // Handle 404 specifically
      if (err.response?.status === 404) {
        setError(new Error('Stream not found'));
        return null;
      }
      
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, stream]);

  const getStream = useCallback((streamName: string) => {
    return fetchStream(streamName, false);
  }, [fetchStream]);

  const refresh = useCallback((streamName: string) => {
    return fetchStream(streamName, true);
  }, [fetchStream]);

  return {
    getStream,
    isLoading,
    error,
    stream,
    refresh,
  };
};

interface UpdateStreamRequest {
  wallet: string;
  title?: string;
  callType?: CallType;
  scheduledFor?: string | Date | null;
  streamSessionType?: StreamSessionType;
  fundingType?: StreamFundingType;
  isPublic?: boolean;
}

interface UseUpdateStreamReturn {
  updateStream: (streamName: string, data: UpdateStreamRequest) => Promise<EnhancedStreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: EnhancedStreamResponse | null;
}

export const useUpdateStream = (): UseUpdateStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<EnhancedStreamResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const updateStream = async (
    streamName: string,
    data: UpdateStreamRequest
  ): Promise<EnhancedStreamResponse | null> => {
    if (!streamName) {
      setError(new Error("Stream name is required"));
      return null;
    }

    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    // Client-side validation matching server
    if (data.title !== undefined && (!data.title || data.title.trim().length === 0)) {
      setError(new Error("Invalid title format"));
      return null;
    }

    if (data.callType && !['video', 'audio'].includes(data.callType)) {
      setError(new Error("Invalid callType value. Must be 'video' or 'audio'"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Don't cache PUT requests, but use rate limiting
      const streamData = await requestManager.execute<EnhancedStreamResponse>(
        `stream:update:${streamName}:${Date.now()}`,
        async () => apiClient.put<EnhancedStreamResponse>(`/stream/${streamName}`, {
          ...data,
          // Ensure title is trimmed if provided
          ...(data.title && { title: data.title.trim() })
        }),
        {
          skipCache: true,
          rateLimitType: 'stream'
        }
      );

      // Invalidate related caches (using streamName)
      requestManager.invalidate(`stream:${streamName}`);
      requestManager.invalidate(`agenda:stream:${streamName}`);
      requestManager.invalidate(`participants:${streamName}`);
      
      setStream(streamData);
      return streamData;
    } catch (err: any) {
      // Handle specific error cases
      if (err.response?.status === 403) {
        const errorMessage = err.response?.data?.error || "Only hosts and co-hosts can update streams";
        setError(new Error(errorMessage));
      } else if (err.response?.status === 404) {
        setError(new Error(`Stream "${streamName}" not found`));
      } else if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.error || "Invalid update data";
        setError(new Error(errorMessage));
      } else if (err.code === 'TIMEOUT' || err.message?.includes('timeout')) {
        setError(new Error('Update request timed out. Please try again.'));
      } else {
        setError(err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateStream,
    isLoading,
    error,
    stream,
  };
};

interface CreateStreamRequest {
  wallet: string;
  callType?: CallType;
  scheduledFor?: string | Date | null;
  title?: string;
  streamSessionType?: StreamSessionType;
  fundingType?: StreamFundingType;
  isPublic?: boolean;
}

interface StreamCreatedResponse extends EnhancedStreamResponse {
  name: string; // The generated unique stream name
}

interface UseCreateStreamReturn {
  createStream: (data: CreateStreamRequest) => Promise<StreamCreatedResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: StreamCreatedResponse | null;
}

export const useCreateStream = (): UseCreateStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<StreamCreatedResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const createStream = async (
    data: CreateStreamRequest
  ): Promise<StreamCreatedResponse | null> => {
    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    // Validate wallet address format (basic check)
    if (!/^[A-Za-z0-9]{32,44}$/.test(data.wallet)) {
      setError(new Error("Invalid wallet address format"));
      return null;
    }

    // Validate callType if provided
    if (data.callType && !['video', 'audio'].includes(data.callType)) {
      setError(new Error("Invalid callType. Must be 'video' or 'audio'"));
      return null;
    }

    // Validate scheduledFor if provided
    if (data.scheduledFor) {
      const scheduledDate = new Date(data.scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        setError(new Error("Invalid scheduled date"));
        return null;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const streamData = await requestManager.execute<StreamCreatedResponse>(
        `stream:create:${Date.now()}`,
        async () => apiClient.post<StreamCreatedResponse>("/stream", {
          ...data,
          // Normalize callType to match server expectations
          callType: data.callType || 'video',
          // Ensure isPublic has a default
          isPublic: data.isPublic !== undefined ? data.isPublic : true
        }),
        {
          skipCache: true,
          rateLimitType: 'stream'
        }
      );

      // Invalidate any stream list caches
      requestManager.invalidate('streams:');
      
      setStream(streamData);
      return streamData;
    } catch (err: any) {
      // Handle specific rate limit for stream creation
      if (err.message?.includes('Rate limit exceeded')) {
        setError(new Error("Too many streams created. Please wait before creating another."));
        return null;
      }
      
      // Handle timeout
      if (err.code === 'TIMEOUT' || err.message?.includes('timeout')) {
        setError(new Error("Stream creation timed out. Please try again."));
        return null;
      }
      
      // Handle validation errors
      if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.error || "Invalid stream data";
        setError(new Error(errorMessage));
        return null;
      }
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError(new Error("Authentication required"));
        return null;
      }
      
      setError(err);
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
