/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useTenantContext } from './useTenantContext';

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

/**
 * Hook for submitting answers to a quiz
 * @returns Object containing submitQuizAnswers function, loading state, error state, and response data
 */
export const useSubmitQuizAnswers = (): UseSubmitQuizAnswersReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<SubmitQuizAnswersResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Submit answers to a quiz
   * @param agendaId - ID of the quiz agenda
   * @param data - Quiz answers data including wallet, answers array, and total score
   * @returns Response data or null if an error occurred
   */
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
    
    try {
      // Use the API client to make the POST request to the /quiz/:agendaId endpoint
      const submitResponse = await apiClient.post<SubmitQuizAnswersResponse>(
        `/quiz/${agendaId}`, 
        data
      );
      
      setResponse(submitResponse);
      return submitResponse;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
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
  questions: QuizQuestion[];
}

interface UseGetQuizQuestionsReturn {
  getQuizQuestions: (agendaId: string) => Promise<QuizQuestionsResponse | null>;
  isLoading: boolean;
  error: Error | null;
  quiz: QuizQuestionsResponse | null;
}

/**
 * Hook for fetching quiz questions
 * @returns Object containing getQuizQuestions function, loading state, error state, and quiz data
 */
export const useGetQuizQuestions = (): UseGetQuizQuestionsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestionsResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Get questions for a quiz
   * @param agendaId - ID of the quiz agenda
   * @returns Quiz questions or null if an error occurred
   */
  const getQuizQuestions = async (agendaId: string): Promise<QuizQuestionsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Use the API client to make the GET request to the /quiz/:agendaId endpoint
      const quizData = await apiClient.get<QuizQuestionsResponse>(`/quiz/${agendaId}`);
      
      setQuiz(quizData);
      return quizData;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getQuizQuestions,
    isLoading,
    error,
    quiz,
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
}

/**
 * Hook for fetching quiz results
 * @returns Object containing getQuizResults function, loading state, error state, and results data
 */
export const useGetQuizResults = (): UseGetQuizResultsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Get results for a quiz
   * @param agendaId - ID of the quiz agenda
   * @returns Quiz results or null if an error occurred
   */
  const getQuizResults = async (agendaId: string): Promise<QuizResultsResponse | null> => {
    if (!agendaId) {
      setError(new Error('Agenda ID is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Use the API client to make the GET request to the /quiz/results/:agendaId endpoint
      const quizResults = await apiClient.get<QuizResultsResponse>(`/quiz/results/${agendaId}`);
      
      setResults(quizResults);
      return quizResults;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getQuizResults,
    isLoading,
    error,
    results,
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
}

/**
 * Hook for fetching a user's answers to a quiz
 * @returns Object containing getUserQuizAnswers function, loading state, error state, and user answers data
 */
export const useGetUserQuizAnswers = (): UseGetUserQuizAnswersReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [answers, setAnswers] = useState<UserQuizAnswersResponse | null>(null);
  
  // Get the API client from context
  const { apiClient } = useTenantContext();

  /**
   * Get a user's answers to a quiz
   * @param agendaId - ID of the quiz agenda
   * @param wallet - Wallet address of the user
   * @returns User's quiz answers or null if an error occurred
   */
  const getUserQuizAnswers = async (
    agendaId: string, 
    wallet: string
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
    
    try {
      // Use the API client to make the GET request to the /quiz/answers/:agendaId endpoint with wallet as query param
      const userAnswers = await apiClient.get<UserQuizAnswersResponse>(
        `/quiz/answers/${agendaId}?wallet=${wallet}`,
      );
      
      setAnswers(userAnswers);
      return userAnswers;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An unknown error occurred';
      setError(new Error(errorMessage));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getUserQuizAnswers,
    isLoading,
    error,
    answers,
  };
};