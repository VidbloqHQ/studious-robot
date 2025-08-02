/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useTenantContext } from './useTenantContext';

interface SubmitPollVoteRequest {
  agendaId: string;
  selectedOption: string;
  wallet: string;
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

/**
 * Hook for submitting a vote for a poll
 * @returns Object containing submitPollVote function, loading state, error state, and response
 */
export const useSubmitPollVote = (): UseSubmitPollVoteReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<PollVoteResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Submit a vote for a poll
   * @param data - Poll vote request data
   * @returns Vote response or null if an error occurred
   */
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
    
    try {
      // Use the API client to make the POST request to the /poll/vote endpoint
      const voteResponse = await apiClient.post<PollVoteResponse>('/poll', data);
      
      setResponse(voteResponse);
      return voteResponse;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
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
}

/**
 * Hook for fetching poll results
 * @returns Object containing getPollResults function, loading state, error state, and poll results
 */
export const useGetPollResults = (): UseGetPollResultsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<PollResultsResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Get results for a poll
   * @param agendaId - ID of the poll agenda
   * @returns Poll results or null if an error occurred
   */
  const getPollResults = async (agendaId: string): Promise<PollResultsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Use the API client to make the GET request to the /poll/:agendaId/results endpoint
      const pollResults = await apiClient.get<PollResultsResponse>(`/poll/${agendaId}`);
      
      setResults(pollResults);
      return pollResults;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPollResults,
    isLoading,
    error,
    results,
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
}

/**
 * Hook for checking if a user has voted in a poll and what they voted for
 * @returns Object containing getUserPollVote function, loading state, error state, and vote data
 */
export const useGetUserPollVote = (): UseGetUserPollVoteReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [vote, setVote] = useState<UserPollVoteResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Check if a user has voted in a poll and what they voted for
   * @param agendaId - ID of the poll agenda
   * @param wallet - Wallet address of the user to check
   * @returns User vote data or null if an error occurred
   */
  const getUserPollVote = async (
    agendaId: string, 
    wallet: string
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
    
    try {
      // Use the API client to make the GET request with query parameter
      const userVote = await apiClient.get<UserPollVoteResponse>(
        `/poll/${agendaId}/user-vote?wallet=${wallet}`,
      );
      
      setVote(userVote);
      return userVote;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getUserPollVote,
    isLoading,
    error,
    vote,
  };
};