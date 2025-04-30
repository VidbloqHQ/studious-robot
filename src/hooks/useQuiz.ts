import { useState, useEffect, useCallback } from "react";
import { useStreamContext } from "./useStreamContext";
import { useStreamAddons } from "./useStreamAddons";

// Define interfaces for quiz-related data
interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  isMultiChoice: boolean;
  points: number;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number; // Time limit per question in seconds
}

interface QuizResults {
  quizId: string;
  leaderboard: {
    participantId: string;
    userName: string;
    totalPoints: number;
    correctAnswers: number;
    totalAnswers: number;
  }[];
  questions: QuizQuestion[];
  totalParticipants: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface QuizAnswer {
  questionId: string;
  participantId: string;
  answer: string;
  isCorrect: boolean;
  timeToAnswer?: number;
}

type QuizStatus = 'idle' | 'starting' | 'active' | 'ended';

export const useQuiz = () => {
  const { websocket, roomName, identity } = useStreamContext();
  const { activeAddons, startQuiz: startAddonQuiz, endQuiz: endAddonQuiz, submitQuizAnswer } = useStreamAddons();
  
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isHost, setIsHost] = useState(false);
  
  // Check if quiz addon is active
  const isQuizActive = activeAddons.Quiz.isActive;
  
  // Initialize quiz with a set of questions
  const initializeQuiz = useCallback((quiz: QuizData) => {
    setCurrentQuiz(quiz);
    setQuizStatus('idle');
    setQuestionIndex(0);
    setUserAnswers({});
    setQuizResults(null);
    
    // Set first question as current
    if (quiz.questions.length > 0) {
      setCurrentQuestion(quiz.questions[0]);
      if (quiz.timeLimit) {
        setTimeRemaining(quiz.timeLimit);
      }
    }
  }, []);
  
  // Start the quiz (host only)
  const startQuiz = useCallback(() => {
    if (!currentQuiz || !isHost) return;
    
    setQuizStatus('starting');
    startAddonQuiz(roomName, currentQuiz);
    
    // Delay to allow clients to prepare
    setTimeout(() => {
      setQuizStatus('active');
      // Start timer if there's a time limit
      if (currentQuiz.timeLimit && currentQuiz.timeLimit > 0) {
        setTimeRemaining(currentQuiz.timeLimit);
      }
    }, 3000);
  }, [currentQuiz, isHost, roomName, startAddonQuiz]);
  
  // End the quiz (host only)
  const endQuiz = useCallback((results?: QuizResults) => {
    if (!isHost) return;
    
    const finalResults = results || {
      quizId: currentQuiz?.id || '',
      leaderboard: [],
      questions: currentQuiz?.questions || [],
      totalParticipants: 0
    };
    
    setQuizStatus('ended');
    setQuizResults(finalResults);
    endAddonQuiz(roomName, finalResults);
  }, [currentQuiz, isHost, roomName, endAddonQuiz]);
  
  // Submit an answer to a question
  const submitAnswer = useCallback((questionId: string, answer: string) => {
    if (!identity || !currentQuiz || quizStatus !== 'active') return;
    
    // Store answer locally
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Submit to server
    submitQuizAnswer(roomName, questionId, identity, answer);
  }, [identity, currentQuiz, quizStatus, roomName, submitQuizAnswer]);
  
  // Advance to the next question (host only)
  const nextQuestion = useCallback(() => {
    if (!isHost || !currentQuiz || questionIndex >= currentQuiz.questions.length - 1) return;
    
    const newIndex = questionIndex + 1;
    setQuestionIndex(newIndex);
    setCurrentQuestion(currentQuiz.questions[newIndex]);
    
    // Reset timer if there's a time limit
    if (currentQuiz.timeLimit && currentQuiz.timeLimit > 0) {
      setTimeRemaining(currentQuiz.timeLimit);
    }
    
    // Broadcast question change
    websocket?.sendMessage('changeQuizQuestion', {
      roomName,
      questionIndex: newIndex,
      question: currentQuiz.questions[newIndex]
    });
  }, [isHost, currentQuiz, questionIndex, roomName, websocket]);
  
  // Get previous question (host only)
  const previousQuestion = useCallback(() => {
    if (!isHost || !currentQuiz || questionIndex <= 0) return;
    
    const newIndex = questionIndex - 1;
    setQuestionIndex(newIndex);
    setCurrentQuestion(currentQuiz.questions[newIndex]);
    
    // Reset timer if there's a time limit
    if (currentQuiz.timeLimit && currentQuiz.timeLimit > 0) {
      setTimeRemaining(currentQuiz.timeLimit);
    }
    
    // Broadcast question change
    websocket?.sendMessage('changeQuizQuestion', {
      roomName,
      questionIndex: newIndex,
      question: currentQuiz.questions[newIndex]
    });
  }, [isHost, currentQuiz, questionIndex, roomName, websocket]);
  
  // Set up WebSocket event listeners
  useEffect(() => {
    if (!websocket || !websocket.isConnected) return;
    
    // Handle quiz started event
    const handleQuizStarted = (quiz: QuizData) => {
      initializeQuiz(quiz);
      setQuizStatus('active');
    };
    
    // Handle quiz ended event
    const handleQuizEnded = (results: QuizResults) => {
      setQuizStatus('ended');
      setQuizResults(results);
    };
    
    // Handle question change
    const handleQuestionChange = (data: {
      questionIndex: number;
      question: QuizQuestion;
    }) => {
      setQuestionIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      
      // Reset timer if applicable
      if (currentQuiz?.timeLimit) {
        setTimeRemaining(currentQuiz.timeLimit);
      }
    };
    
    // Add event listeners
    websocket.addEventListener('quizStarted', handleQuizStarted);
    websocket.addEventListener('quizEnded', handleQuizEnded);
    websocket.addEventListener('changeQuizQuestion', handleQuestionChange);
    
    // Clean up event listeners
    return () => {
      websocket.removeEventListener('quizStarted', handleQuizStarted);
      websocket.removeEventListener('quizEnded', handleQuizEnded);
      websocket.removeEventListener('changeQuizQuestion', handleQuestionChange);
    };
  }, [websocket, currentQuiz, initializeQuiz]);
  
  // Timer effect for quiz questions
  useEffect(() => {
    if (quizStatus !== 'active' || !currentQuiz?.timeLimit || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          
          // If host, automatically move to next question when time expires
          if (isHost && questionIndex < (currentQuiz?.questions.length || 0) - 1) {
            setTimeout(() => nextQuestion(), 1000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizStatus, timeRemaining, isHost, nextQuestion, questionIndex, currentQuiz]);
  
  // Check if quiz addon becomes active/inactive
  useEffect(() => {
    if (!isQuizActive && quizStatus === 'active') {
      // Quiz was stopped externally
      setQuizStatus('ended');
    }
  }, [isQuizActive, quizStatus]);
  
  return {
    quizStatus,
    currentQuiz,
    currentQuestion,
    questionIndex,
    timeRemaining,
    quizResults,
    userAnswers,
    isQuizActive,
    
    // Functions
    initializeQuiz,
    startQuiz,
    endQuiz,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    
    // Set host status
    setIsHost
  };
};