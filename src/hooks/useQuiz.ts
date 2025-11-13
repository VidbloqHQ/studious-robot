/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useTenantContext } from './useTenantContext';
import { useStreamContext } from './useStreamContext';
import { getRequestManager } from '../utils/index';
import { useLiveData } from './useLiveData';

interface QuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  pointsEarned?: number;
}

interface SubmitQuizAnswersRequest {
  wallet: string;
  answers: QuizAnswer[];
  totalScore: number;
  streamId?: string;
}

interface SubmitQuizAnswersResponse {
  message: string;
  totalScore: number;
  answersSubmitted: number;
}

interface UseSubmitQuizAnswersReturn {
  submitQuizAnswers: (agendaId: string, data: SubmitQuizAnswersRequest) => Promise<SubmitQuizAnswersResponse | null>;
  isLoading: boolean;
  error: Error | null;
  response: SubmitQuizAnswersResponse | null;
}

export const useSubmitQuizAnswers = (): UseSubmitQuizAnswersReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<SubmitQuizAnswersResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const { streamMetadata: { streamId } } = useStreamContext();
  const requestManager = getRequestManager();

  const submitQuizAnswers = async (
    agendaId: string, 
    data: SubmitQuizAnswersRequest
  ): Promise<SubmitQuizAnswersResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }
    
    if (!data.wallet) {
      setError(new Error('Wallet address is required'));
      return null;
    }
    
    if (!data.answers || !Array.isArray(data.answers) || data.answers.length === 0) {
      setError(new Error('Quiz answers are required'));
      return null;
    }
    
    if (typeof data.totalScore !== 'number' || data.totalScore < 0) {
      setError(new Error('Valid total score is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const payload = {
      ...data, streamId
    }
    try {
      const submitResponse = await requestManager.execute<SubmitQuizAnswersResponse>(
        `quiz:submit:${agendaId}:${Date.now()}`,
        async () => apiClient.post<SubmitQuizAnswersResponse>(`/quiz/${agendaId}`, payload),
        {
          skipCache: true,
          rateLimitType: 'default'
        }
      );
      
      // Invalidate related quiz caches
      requestManager.invalidate(`quiz:${agendaId}`);
      requestManager.invalidate(`quiz:results:${agendaId}`);
      requestManager.invalidate(`quiz:answers:${agendaId}:${data.wallet}`);
      
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
    submitQuizAnswers,
    isLoading,
    error,
    response,
  };
};

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  isMultiChoice: boolean;
  points: number;
  correctAnswer: string;
}

interface QuizQuestionsResponse {
  id: string;
  title: string | null;
  description: string | null;
  duration: string | null;
  questions: QuizQuestion[];
}

interface UseGetQuizQuestionsReturn {
  getQuizQuestions: (agendaId: string) => Promise<QuizQuestionsResponse | null>;
  isLoading: boolean;
  error: Error | null;
  quiz: QuizQuestionsResponse | null;
  refresh: (agendaId: string) => Promise<QuizQuestionsResponse | null>;
}

export const useGetQuizQuestions = (): UseGetQuizQuestionsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestionsResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchQuizQuestions = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<QuizQuestionsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `quiz:${agendaId}`;
    
    try {
      const quizData = await requestManager.execute<QuizQuestionsResponse>(
        cacheKey,
        async () => apiClient.get<QuizQuestionsResponse>(`/quiz/${agendaId}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setQuiz(quizData);
      return quizData;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && quiz) {
        console.warn('Rate limit hit for quiz questions, using cached data');
        return quiz;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, quiz]);

  const getQuizQuestions = useCallback((agendaId: string) => {
    return fetchQuizQuestions(agendaId, false);
  }, [fetchQuizQuestions]);

  const refresh = useCallback((agendaId: string) => {
    return fetchQuizQuestions(agendaId, true);
  }, [fetchQuizQuestions]);

  return {
    getQuizQuestions,
    isLoading,
    error,
    quiz,
    refresh,
  };
};

interface QuestionStat {
  id: string;
  questionText: string;
  totalResponses: number;
  correctResponses: number;
  correctPercentage: number;
}

interface LeaderboardEntry {
  participantId: string;
  userName: string;
  walletAddress: string;
  pointsEarned: number;
  totalPoints: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;
}

interface QuizResultsResponse {
  id: string;
  title: string | null;
  totalParticipants: number;
  participantsAnswered: number;
  questionStats: QuestionStat[];
  leaderboard: LeaderboardEntry[];
}

interface UseGetQuizResultsReturn {
  getQuizResults: (agendaId: string) => Promise<QuizResultsResponse | null>;
  isLoading: boolean;
  error: Error | null;
  results: QuizResultsResponse | null;
  refresh: (agendaId: string) => Promise<QuizResultsResponse | null>;
}

export const useGetQuizResults = (): UseGetQuizResultsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchQuizResults = useCallback(async (
    agendaId: string,
    forceRefresh = false
  ): Promise<QuizResultsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    const cacheKey = `quiz:results:${agendaId}`;
    
    try {
      const quizResults = await requestManager.execute<QuizResultsResponse>(
        cacheKey,
        async () => apiClient.get<QuizResultsResponse>(`/quiz/results/${agendaId}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setResults(quizResults);
      return quizResults;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && results) {
        console.warn('Rate limit hit for quiz results, using cached data');
        return results;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, results]);

  const getQuizResults = useCallback((agendaId: string) => {
    return fetchQuizResults(agendaId, false);
  }, [fetchQuizResults]);

  const refresh = useCallback((agendaId: string) => {
    return fetchQuizResults(agendaId, true);
  }, [fetchQuizResults]);

  return {
    getQuizResults,
    isLoading,
    error,
    results,
    refresh,
  };
};

interface UseLiveQuizResultsReturn {
  results: QuizResultsResponse | null;
  error: Error | null;
  isLoading: boolean;
  pause: () => void;
  resume: () => void;
  refetch: () => Promise<QuizResultsResponse | null>;
}

export const useLiveQuizResults = (
  agendaId: string,
  options: {
    enabled?: boolean;
    interval?: number;
    onUpdate?: (data: QuizResultsResponse) => void;
  } = {}
): UseLiveQuizResultsReturn => {
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetcher = useCallback(async () => {
    if (!agendaId) {
      throw new Error('Agenda ID is required');
    }

    const cacheKey = `quiz:results:${agendaId}`;
    
    return requestManager.execute<QuizResultsResponse>(
      cacheKey,
      async () => apiClient.get<QuizResultsResponse>(`/quiz/results/${agendaId}`),
      {
        cacheType: 'default',
        rateLimitType: 'default',
      }
    );
  }, [agendaId, apiClient, requestManager]);

  const liveData = useLiveData<QuizResultsResponse>({
    fetcher,
    interval: options.interval || 10000, // Poll every 10 seconds by default
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

interface QuestionResponse {
  questionId: string;
  questionText: string;
  answered: boolean;
  answer: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer: string;
}

interface UserQuizAnswersResponse {
  participantId: string;
  userName: string;
  walletAddress: string;
  totalPoints: number;
  answeredQuestions: number;
  correctAnswers: number;
  totalQuestions: number;
  responses: QuestionResponse[];
}

interface UseGetUserQuizAnswersReturn {
  getUserQuizAnswers: (agendaId: string, wallet: string) => Promise<UserQuizAnswersResponse | null>;
  isLoading: boolean;
  error: Error | null;
  answers: UserQuizAnswersResponse | null;
  refresh: (agendaId: string, wallet: string) => Promise<UserQuizAnswersResponse | null>;
}

export const useGetUserQuizAnswers = (): UseGetUserQuizAnswersReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [answers, setAnswers] = useState<UserQuizAnswersResponse | null>(null);
  
  const { apiClient } = useTenantContext();
  const requestManager = getRequestManager();

  const fetchUserAnswers = useCallback(async (
    agendaId: string,
    wallet: string,
    forceRefresh = false
  ): Promise<UserQuizAnswersResponse | null> => {
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
    
    const cacheKey = `quiz:answers:${agendaId}:${wallet}`;
    
    try {
      const userAnswers = await requestManager.execute<UserQuizAnswersResponse>(
        cacheKey,
        async () => apiClient.get<UserQuizAnswersResponse>(`/quiz/answers/${agendaId}?wallet=${wallet}`),
        {
          cacheType: 'default',
          forceRefresh,
          rateLimitType: 'default',
        }
      );
      
      setAnswers(userAnswers);
      return userAnswers;
    } catch (err: any) {
      if (err.message?.includes('Rate limit exceeded') && answers) {
        console.warn('Rate limit hit for user quiz answers, using cached data');
        return answers;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, requestManager, answers]);

  const getUserQuizAnswers = useCallback((agendaId: string, wallet: string) => {
    return fetchUserAnswers(agendaId, wallet, false);
  }, [fetchUserAnswers]);

  const refresh = useCallback((agendaId: string, wallet: string) => {
    return fetchUserAnswers(agendaId, wallet, true);
  }, [fetchUserAnswers]);

  return {
    getUserQuizAnswers,
    isLoading,
    error,
    answers,
    refresh,
  };
};