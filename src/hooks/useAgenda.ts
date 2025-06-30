/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTenantContext } from "./useTenantContext";
import {
  Agenda,
  AgendaItem,
  AgendaUpdate,
} from "../types/index";

interface CreateAgendaRequest {
  streamId: string;
  wallet: string;
  agendas: AgendaItem[];
}

interface UseCreateAgendaReturn {
  createAgenda: (data: CreateAgendaRequest) => Promise<Agenda[] | null>;
  isLoading: boolean;
  error: Error | null;
  agendas: Agenda[] | null;
}

/**
 * Hook for creating agenda items for a stream
 * @returns Object containing createAgenda function, loading state, error state, and created agendas
 */
export const useCreateAgenda = (): UseCreateAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agendas, setAgendas] = useState<Agenda[] | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Create new agenda items for a stream
   * @param data - Agenda creation request data
   * @returns Created agendas or null if an error occurred
   */
  const createAgenda = async (
    data: CreateAgendaRequest
  ): Promise<Agenda[] | null> => {
    if (!data.streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    if (!data.wallet) {
      setError(new Error("Wallet address is required"));
      return null;
    }

    if (
      !data.agendas ||
      !Array.isArray(data.agendas) ||
      data.agendas.length === 0
    ) {
      setError(new Error("At least one agenda item is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the POST request to the /stream/:streamId/agenda endpoint
      const createdAgendas = await apiClient.post<Agenda[]>(
        `/agenda/${data.streamId}`,
        {
          agendas: data.agendas,
          wallet: data.wallet,
        }
      );

      setAgendas(createdAgendas);
      return createdAgendas;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "An unknown error occurred";
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
  getStreamAgenda: (streamId: string) => Promise<Agenda[] | null>;
  isLoading: boolean;
  error: Error | null;
  agendas: Agenda[] | null;
}

/**
 * Hook for fetching all agenda items for a stream
 * @returns Object containing getStreamAgenda function, loading state, error state, and fetched agendas
 */
export const useGetStreamAgenda = (): UseGetStreamAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agendas, setAgendas] = useState<Agenda[] | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Fetch all agenda items for a stream
   * @param streamId - ID of the stream
   * @returns Fetched agendas or null if an error occurred
   */
  const getStreamAgenda = async (
    streamId: string
  ): Promise<Agenda[] | null> => {
    if (!streamId) {
      setError(new Error("Stream ID is required"));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the GET request to the /stream/:streamId/agenda endpoint
      const fetchedAgendas = await apiClient.get<Agenda[]>(
        `/agenda/${streamId}`
      );

      setAgendas(fetchedAgendas);
      return fetchedAgendas;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "An unknown error occurred";
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getStreamAgenda,
    isLoading,
    error,
    agendas,
  };
};


interface DeleteAgendaResponse {
  message: string;
  deletedId: string;
  livestreamId: string;
}

interface UseDeleteAgendaReturn {
  deleteAgenda: (
    agendaId: string,
    wallet: string
  ) => Promise<DeleteAgendaResponse | null>;
  isLoading: boolean;
  error: Error | null;
  response: DeleteAgendaResponse | null;
}

/**
 * Hook for deleting an agenda item
 * @returns Object containing deleteAgenda function, loading state, error state, and delete response
 */
export const useDeleteAgenda = (): UseDeleteAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<DeleteAgendaResponse | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Delete an agenda item
   * @param agendaId - ID of the agenda to delete
   * @param wallet - Wallet address of the user making the request
   * @returns Delete response or null if an error occurred
   */
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
      const deleteResponse = await apiClient.delete<DeleteAgendaResponse>(
        `/agenda/${agendaId}/${wallet}`
      );

      setResponse(deleteResponse);
      return deleteResponse;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "An unknown error occurred";
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
  updateStreamAgenda: (agendaId: string, data: AgendaUpdate) => Promise<Agenda | null>;
  isLoading: boolean;
  error: Error | null;
  agenda: Agenda | null;
}

/**
 * Hook for updating a stream agenda item
 * @returns Object containing updateStreamAgenda function, loading state, error state, and updated agenda
 */
export const useUpdateStreamAgenda = (): UseUpdateStreamAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Update a stream agenda item
   * @param agendaId - ID of the agenda to update
   * @param data - Agenda update data
   * @returns Updated agenda or null if an error occurred
   */
  const updateStreamAgenda = async (agendaId: string, data: AgendaUpdate): Promise<Agenda | null> => {
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
      // Use the API client to make the PUT request to the /agenda/:agendaId endpoint
      const updatedAgenda = await apiClient.put<Agenda>(`/agenda/${agendaId}`, data);
      
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