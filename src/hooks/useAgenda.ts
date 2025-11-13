/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from "react";
import { useTenantContext } from "./useTenantContext";
import { Agenda, AgendaItem, AgendaUpdate, CreatedAgenda, PaginationInfo, SimpleAgenda, StreamAgendaResponse, UpdatedAgenda } from "../types/index";
import { getRequestManager } from "../utils/index";

interface CreateAgendaRequest {
  streamId: string;
  wallet: string;
  agendas: AgendaItem[];
}

interface UseCreateAgendaReturn {
  createAgenda: (data: CreateAgendaRequest) => Promise<CreatedAgenda[] | null>;
  isLoading: boolean;
  error: Error | null;
  agendas: CreatedAgenda[] | null;
}

export const useCreateAgenda = (): UseCreateAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agendas, setAgendas] = useState<CreatedAgenda[] | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const createAgenda = async (
    data: CreateAgendaRequest
  ): Promise<CreatedAgenda[] | null> => {
    if (!data.streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    if (!data.agendas || !Array.isArray(data.agendas) || data.agendas.length === 0) {
      setError(new Error("At least one agenda item is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createdAgendas = await requestManager.execute<CreatedAgenda[]>(
        `agenda:create:${data.streamId}:${Date.now()}`,
        async () => apiClient.post<CreatedAgenda[]>(
          `/agenda/${data.streamId}`,
          {
            agendas: data.agendas,
            wallet: data.wallet,
          }
        ),
        {
          skipCache: true,
          rateLimitType: 'agenda'
        }
      );

      // Invalidate cache for this stream's agendas
      requestManager.invalidate(`agenda:stream:${data.streamId}`);
      
      setAgendas(createdAgendas);
      return createdAgendas;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred";
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createAgenda,
    isLoading,
    error,
    agendas,
  };
};




interface UseGetStreamAgendaReturn {
  getStreamAgenda: (streamId: string, page?: number, limit?: number) => Promise<StreamAgendaResponse | null>;
  isLoading: boolean;
  error: Error | null;
  agendas: Agenda[] | null;
  pagination: PaginationInfo | null;
  refresh: (streamId: string, page?: number, limit?: number) => Promise<StreamAgendaResponse | null>;
}

export const useGetStreamAgenda = (): UseGetStreamAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agendas, setAgendas] = useState<Agenda[] | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();
  const lastStreamIdRef = useRef<string | null>(null);

  const fetchAgendas = useCallback(async (
    streamId: string,
    page = 1,
    limit = 20,
    forceRefresh = false
  ): Promise<StreamAgendaResponse | null> => {
    if (!streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);
    lastStreamIdRef.current = streamId;

    const cacheKey = `agenda:stream:${streamId}:${page}:${limit}`;

    try {
      const response = await requestManager.execute<StreamAgendaResponse>(
        cacheKey,
        async () => {
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('limit', limit.toString());
          
          return apiClient.get<StreamAgendaResponse>(
            `/agenda/stream/${streamId}?${params.toString()}`
          );
        },
        {
          cacheType: 'agenda',
          forceRefresh,
          rateLimitType: 'agenda',
        }
      );

      setAgendas(response.agendas);
      setPagination(response.pagination);
      return response;
    } catch (err: any) {
      // Return cached data on rate limit
      if (err.message?.includes('Rate limit exceeded') && agendas && pagination) {
        console.warn('Rate limit hit for agenda fetch, using cached data');
        return { agendas, pagination };
      }
      
      const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred";
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, agendas, pagination]);

  const getStreamAgenda = useCallback((
    streamId: string, 
    page?: number, 
    limit?: number
  ) => {
    return fetchAgendas(streamId, page, limit, false);
  }, [fetchAgendas]);

  const refresh = useCallback((
    streamId: string, 
    page?: number, 
    limit?: number
  ) => {
    return fetchAgendas(streamId, page, limit, true);
  }, [fetchAgendas]);

  return {
    getStreamAgenda,
    isLoading,
    error,
    agendas,
    pagination,
    refresh,
  };
};

interface DeleteAgendaResponse {
  message: string;
  deletedId: string;
  livestreamId: string;
}

interface UseDeleteAgendaReturn {
  deleteAgenda: (agendaId: string, wallet: string) => Promise<DeleteAgendaResponse | null>;
  isLoading: boolean;
  error: Error | null;
  response: DeleteAgendaResponse | null;
}

export const useDeleteAgenda = (): UseDeleteAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<DeleteAgendaResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const deleteAgenda = async (
    agendaId: string,
    wallet: string
  ): Promise<DeleteAgendaResponse | null> => {
    if (!agendaId) {
      setError(new Error("Agenda ID is required"));
      return null;
    }

    if (!wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deleteResponse = await requestManager.execute<DeleteAgendaResponse>(
        `agenda:delete:${agendaId}:${Date.now()}`,
        async () => apiClient.delete<DeleteAgendaResponse>(
          `/agenda/${agendaId}/${wallet}`
        ),
        {
          skipCache: true,
          rateLimitType: 'agenda'
        }
      );

      // Invalidate related caches
      requestManager.invalidate(`agenda:`);
      
      setResponse(deleteResponse);
      return deleteResponse;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred";
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deleteAgenda,
    isLoading,
    error,
    response,
  };
};


interface UseUpdateStreamAgendaReturn {
  updateStreamAgenda: (agendaId: string, data: AgendaUpdate) => Promise<UpdatedAgenda | null>;
  isLoading: boolean;
  error: Error | null;
  agenda: UpdatedAgenda | null;
}

export const useUpdateStreamAgenda = (): UseUpdateStreamAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agenda, setAgenda] = useState<UpdatedAgenda | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const updateStreamAgenda = async (
    agendaId: string, 
    data: AgendaUpdate
  ): Promise<UpdatedAgenda | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }
    
    if (!data.wallet) {
      setError(new Error('Wallet address is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const updatedAgenda = await requestManager.execute<UpdatedAgenda>(
        `agenda:update:${agendaId}:${Date.now()}`,
        async () => apiClient.put<UpdatedAgenda>(`/agenda/${agendaId}`, data),
        {
          skipCache: true,
          rateLimitType: 'agenda'
        }
      );
      
      // Invalidate related caches
      requestManager.invalidate(`agenda:`);
      
      setAgenda(updatedAgenda);
      return updatedAgenda;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateStreamAgenda,
    isLoading,
    error,
    agenda,
  };
};

interface UseGetAgendaDetailsReturn {
  getAgenda: (agendaId: string) => Promise<SimpleAgenda | null>;
  isLoading: boolean;
  error: Error | null;
  agenda: SimpleAgenda | null;
  refresh: (agendaId: string) => Promise<SimpleAgenda | null>;
}

export const useGetAgendaDetails = (): UseGetAgendaDetailsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agenda, setAgenda] = useState<SimpleAgenda | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchAgenda = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<SimpleAgenda | null> => {
    if (!agendaId) {
      setError(new Error("Agenda ID is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    const cacheKey = `agenda:${agendaId}`;

    try {
      const fetchedAgenda = await requestManager.execute<SimpleAgenda>(
        cacheKey,
        async () => apiClient.get<SimpleAgenda>(`/agenda/${agendaId}`),
        {
          cacheType: 'agenda',
          forceRefresh,
          rateLimitType: 'agenda',
        }
      );

      setAgenda(fetchedAgenda);
      return fetchedAgenda;
    } catch (err: any) {
      // Return cached data on rate limit
      if (err.message?.includes('Rate limit exceeded') && agenda) {
        console.warn('Rate limit hit for agenda fetch, using cached data');
        return agenda;
      }
      
      const errorMessage = err.response?.data?.error || err.message || "An unknown error occurred";
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, agenda]);

  const getAgenda = useCallback((agendaId: string) => {
    return fetchAgenda(agendaId, false);
  }, [fetchAgenda]);

  const refresh = useCallback((agendaId: string) => {
    return fetchAgenda(agendaId, true);
  }, [fetchAgenda]);

  return {
    getAgenda,
    isLoading,
    error,
    agenda,
    refresh,
  };
};