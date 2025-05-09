import { useState } from "react";
import { useTenantContext } from "./useTenantContext";
import {
  CallType,
  StreamSessionType,
  StreamFundingType,
  StreamResponse,
} from "../types/index";

interface UseGetStreamReturn {
  getStream: (streamId: string) => Promise<StreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: StreamResponse | null;
}

/**
 * Hook for fetching a stream by ID
 * @returns Object containing getStream function, loading state, error state, and fetched stream
 */
export const useGetStream = (): UseGetStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<StreamResponse | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Fetch a stream by ID
   * @param streamId - ID of the stream to fetch
   * @returns Fetched stream or null if an error occurred
   */
  const getStream = async (
    streamId: string
  ): Promise<StreamResponse | null> => {
    if (!streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the GET request to the /stream/:streamId endpoint
      const streamData = await apiClient.get<StreamResponse>(
        `/stream/${streamId}`
      );

      setStream(streamData);
      return streamData;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("An unknown error occurred");
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getStream,
    isLoading,
    error,
    stream,
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
  updateStream: (
    streamId: string,
    data: UpdateStreamRequest
  ) => Promise<StreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: StreamResponse | null;
}

/**
 * Hook for updating an existing stream
 * @returns Object containing updateStream function, loading state, error state, and updated stream
 */
export const useUpdateStream = (): UseUpdateStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<StreamResponse | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Update an existing stream
   * @param streamId - ID of the stream to update
   * @param data - Stream update request data
   * @returns Updated stream or null if an error occurred
   */
  const updateStream = async (
    streamId: string,
    data: UpdateStreamRequest
  ): Promise<StreamResponse | null> => {
    if (!streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the PUT request to the /stream/:streamId endpoint
      const streamData = await apiClient.put<StreamResponse>(
        `/stream/${streamId}`,
        data
      );

      setStream(streamData);
      return streamData;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("An unknown error occurred");
      setError(error);
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

interface UseCreateStreamReturn {
  createStream: (data: CreateStreamRequest) => Promise<StreamResponse | null>;
  isLoading: boolean;
  error: Error | null;
  stream: StreamResponse | null;
}

/**
 * Hook for creating a new stream
 * @returns Object containing createStream function, loading state, error state, and created stream
 */
export const useCreateStream = (): UseCreateStreamReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<StreamResponse | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Create a new stream
   * @param data - Stream creation request data
   * @returns Created stream or null if an error occurred
   */
  const createStream = async (
    data: CreateStreamRequest
  ): Promise<StreamResponse | null> => {
    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the POST request to the /stream endpoint
      const streamData = await apiClient.post<StreamResponse>("/stream", data);

      setStream(streamData);
      return streamData;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("An unknown error occurred");
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
