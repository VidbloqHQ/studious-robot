import { useState } from "react";
import { useTenantContext } from "./useTenantContext";
import { AgendaItem, Agenda } from "../types/index";

interface CreateAgendaRequest {
  wallet: string;
  agendas: AgendaItem[];
}

interface UseCreateAgendaReturn {
  createAgenda: (
    streamId: string,
    data: CreateAgendaRequest
  ) => Promise<Agenda[] | null>;
  isLoading: boolean;
  error: Error | null;
  agendas: Agenda[] | null;
}

/**
 * Hook for creating agendas for a stream
 * @returns Object containing createAgenda function, loading state, error state, and created agendas
 */
export const useCreateAgenda = (): UseCreateAgendaReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [agendas, setAgendas] = useState<Agenda[] | null>(null);

  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Create agendas for a stream
   * @param streamId - ID of the stream to create agendas for
   * @param data - Agenda creation request data
   * @returns Created agendas or null if an error occurred
   */
  const createAgenda = async (
    streamId: string,
    data: CreateAgendaRequest
  ): Promise<Agenda[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to make the POST request to the /:streamId endpoint
      const agendasData = await apiClient.post<Agenda[]>(
        `/stream/${streamId}`,
        data
      );

      setAgendas(agendasData);
      return agendasData;
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
    createAgenda,
    isLoading,
    error,
    agendas,
  };
};
