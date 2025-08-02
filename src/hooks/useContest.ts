/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useStreamContext } from './useStreamContext';
import { UserType } from '../types';


// Types
export type ContestMode = 'elimination' | 'tournament' | 'showcase' | 'custom';
export type ContestState = 'idle' | 'starting' | 'active' | 'voting' | 'ended';
export type MediaRequirement = 'required' | 'optional' | 'disabled';

export interface ContestConfig {
  mode: ContestMode;
  features: {
    timer?: boolean;
    voting?: boolean;
    elimination?: boolean;
    leaderboard?: boolean;
    screenShare?: MediaRequirement;
    camera?: MediaRequirement;
  };
  rules?: {
    maxDuration?: number; // seconds
    votingDuration?: number; // seconds
    eliminationThreshold?: number; // percentage (0-1) or count
    roundsCount?: number;
    judgeOnly?: boolean; // only hosts/co-hosts can vote
    autoAdvanceRounds?: boolean;
    minContestants?: number;
  };
  scoring?: {
    voteWeight?: number;
    timerWeight?: number;
    customMetrics?: Record<string, number>;
  };
  onContestStart?: () => void;
  onContestEnd?: (results: ContestResults) => void;
  onRoundComplete?: (round: number, eliminated: string[]) => void;
  onVoteReceived?: (vote: Vote) => void;
}

export interface Contestant {
  participantId: string;
  name: string;
  walletAddress: string;
  avatarUrl?: string;
  userType: UserType;
  joinedAt: number;
  score: number;
  votes: number;
  isEliminated: boolean;
  eliminatedRound?: number;
  metadata?: Record<string, any>;
}

export interface Vote {
  voterId: string;
  voterWallet: string;
  targetId: string;
  score: number;
  timestamp: number;
  round: number;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  walletAddress: string;
  score: number;
  votes: number;
  rank: number;
  change: number; // position change from last round
  isEliminated: boolean;
}

export interface RoundResult {
  round: number;
  startedAt: number;
  endedAt: number;
  eliminated: string[];
  leaderboard: LeaderboardEntry[];
}

export interface ContestResults {
  contestId: string;
  winner: Contestant | null;
  finalLeaderboard: LeaderboardEntry[];
  rounds: RoundResult[];
  totalVotes: number;
  duration: number;
}

export interface VotingResults {
  round: number;
  votes: Vote[];
  summary: Map<string, { total: number; average: number; count: number }>;
}

// Timer Hook
export function useContestTimer() {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endCallbackRef = useRef<(() => void) | null>(null);

  const startTimer = useCallback((duration: number) => {
    setTimeRemaining(duration);
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const onTimerEnd = useCallback((callback: () => void) => {
    endCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (endCallbackRef.current) {
              endCallbackRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  return {
    timeRemaining,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    onTimerEnd,
  };
}

// Main Contest Hook
export function useContest(config: ContestConfig) {
  // Get stream context data
  const {
    websocket,
    roomName,
    identity,
    streamMetadata,
    participants,
    userType: currentUserType,
  } = useStreamContext();

  // Connection state
  const isConnectedRef = useRef(false);
  const eventListenerRegistered = useRef(false);

  // Contest state
  const [contestState, setContestState] = useState<ContestState>('idle');
  const [currentRound, setCurrentRound] = useState(0);
  const [contestants, setContestants] = useState<Map<string, Contestant>>(new Map());
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [votingResults, setVotingResults] = useState<VotingResults | null>(null);

  // Track connection state
  useEffect(() => {
    isConnectedRef.current = websocket?.isConnected || false;
  }, [websocket?.isConnected]);

  // Check if current user is host or co-host
  const isHost = useMemo(() => {
    const currentUserWallet = identity ? 
      participants.find(p => p.id === identity)?.walletAddress : null;
    
    return currentUserWallet === streamMetadata.creatorWallet || 
           currentUserType === 'host' || 
           currentUserType === 'co-host';
  }, [identity, participants, streamMetadata.creatorWallet, currentUserType]);

  // Can the current user vote?
  const canVote = useMemo(() => {
    if (config.rules?.judgeOnly) {
      return isHost;
    }
    
    const contestant = contestants.get(identity || '');
    return contestant ? !contestant.isEliminated : false;
  }, [config.rules?.judgeOnly, contestants, identity, isHost]);

  // Feature hooks
  const timer = useContestTimer();
  const [votes, setVotes] = useState<Map<string, Vote[]>>(new Map());
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [votingTimeRemaining, setVotingTimeRemaining] = useState(0);

  // Initialize contestants from participants
  useEffect(() => {
    if (contestState === 'idle' || participants.length === 0) return;

    const newContestants = new Map<string, Contestant>();
    
    participants.forEach((participant) => {
      const existing = contestants.get(participant.id);
      
      // Only create new contestant if doesn't exist
      // This preserves server-provided scores
      if (!existing) {
        newContestants.set(participant.id, {
          participantId: participant.id,
          name: participant.userName,
          walletAddress: participant.walletAddress,
          avatarUrl: participant.avatarUrl,
          userType: participant.userType,
          joinedAt: participant.joinedAt ? new Date(participant.joinedAt).getTime() : Date.now(),
          score: 0,
          votes: 0,
          isEliminated: eliminated.includes(participant.id),
        });
      } else {
        // Keep existing contestant with server scores
        newContestants.set(participant.id, existing);
      }
    });

    setContestants(newContestants);
  }, [participants, contestState, eliminated]);

  // DON'T recalculate leaderboard locally - wait for server updates

  // WebSocket event handlers
  useEffect(() => {
    if (!websocket || !roomName || eventListenerRegistered.current) return;

    eventListenerRegistered.current = true;

    const handleContestStart = () => {
      setContestState('starting');
      setTimeout(() => setContestState('active'), 1000);
      setCurrentRound(1);
      config.onContestStart?.();
    };

    const handleContestEnd = (data: { results: ContestResults }) => {
      setContestState('ended');
      config.onContestEnd?.(data.results);
    };

    const handleRoundStart = (data: { round: number; duration: number }) => {
      setCurrentRound(data.round);
      if (config.features.timer) {
        timer.startTimer(data.duration);
      }
    };

    const handleRoundEnd = (data: { round: number; eliminated: string[] }) => {
      setEliminated((prev) => [...prev, ...data.eliminated]);
      
      // Update contestant elimination status
      setContestants((prev) => {
        const updated = new Map(prev);
        data.eliminated.forEach(id => {
          const contestant = updated.get(id);
          if (contestant) {
            contestant.isEliminated = true;
            contestant.eliminatedRound = data.round;
          }
        });
        return updated;
      });
      
      // Store the round result
      const roundResult: RoundResult = {
        round: data.round,
        startedAt: Date.now() - (config.rules?.maxDuration || 300) * 1000,
        endedAt: Date.now(),
        eliminated: data.eliminated,
        leaderboard: [...leaderboard] // Current leaderboard snapshot
      };
      
      setRoundResults(prev => [...prev, roundResult]);
      
      config.onRoundComplete?.(data.round, data.eliminated);
    };

    const handleVoteSubmitted = (data: Vote) => {
      // Only update the votes collection, NOT the scores
      setVotes((prev) => {
        const updated = new Map(prev);
        const targetVotes = updated.get(data.targetId) || [];
        updated.set(data.targetId, [...targetVotes, data]);
        return updated;
      });
      
      // Don't update contestant scores here - wait for server update
      
      config.onVoteReceived?.(data);
    };

    // NEW: Handle contestant score updates from server
    const handleContestantUpdate = (data: { participantId: string; score: number; votes: number }) => {
      setContestants((prev) => {
        const updated = new Map(prev);
        const contestant = updated.get(data.participantId);
        if (contestant) {
          contestant.score = data.score;
          contestant.votes = data.votes;
        }
        return updated;
      });
    };

    // NEW: Handle leaderboard updates from server
    const handleLeaderboardUpdate = (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    };

    const handleVotingStart = (data: { duration: number }) => {
      setContestState('voting');
      setVotingTimeRemaining(data.duration);
      
      // Start voting countdown
      const interval = setInterval(() => {
        setVotingTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleVotingEnd = (data: { results: VotingResults }) => {
      setVotingResults(data.results);
      setContestState('active');
      setVotingTimeRemaining(0);
    };

    const handleContestStateUpdate = (data: { state: any }) => {
      if (!data.state) return;
      
      // Sync state after reconnection
      setContestState(data.state.status);
      setCurrentRound(data.state.currentRound);
      setEliminated(data.state.eliminated || []);
      
      // Sync contestants with server scores
      if (data.state.contestants) {
        const newContestants = new Map<string, Contestant>();
        data.state.contestants.forEach((c: any) => {
          // Find participant data to get full info
          const participant = participants.find(p => p.id === c.participantId);
          
          newContestants.set(c.participantId, {
            participantId: c.participantId,
            name: c.name || participant?.userName || c.participantId,
            walletAddress: participant?.walletAddress || '',
            avatarUrl: participant?.avatarUrl,
            userType: participant?.userType || 'guest',
            joinedAt: c.joinedAt || Date.now(),
            score: c.score, // Use server score
            votes: c.votes, // Use server votes
            isEliminated: c.isEliminated,
            eliminatedRound: c.eliminatedRound,
          });
        });
        setContestants(newContestants);
      }
      
      // Sync leaderboard from server
      if (data.state.leaderboard) {
        setLeaderboard(data.state.leaderboard);
      }
      
      if (data.state.timeRemaining > 0 && config.features.timer) {
        timer.startTimer(data.state.timeRemaining);
      }
      
      if (data.state.votingTimeRemaining > 0) {
        setVotingTimeRemaining(data.state.votingTimeRemaining);
      }
    };

    // Add event listeners
    websocket.addEventListener('contestStart', handleContestStart);
    websocket.addEventListener('contestEnd', handleContestEnd);
    websocket.addEventListener('roundStart', handleRoundStart);
    websocket.addEventListener('roundEnd', handleRoundEnd);
    websocket.addEventListener('voteSubmitted', handleVoteSubmitted);
    websocket.addEventListener('contestantUpdate', handleContestantUpdate);
    websocket.addEventListener('leaderboardUpdate', handleLeaderboardUpdate);
    websocket.addEventListener('votingStart', handleVotingStart);
    websocket.addEventListener('votingEnd', handleVotingEnd);
    websocket.addEventListener('contestStateUpdate', handleContestStateUpdate);

    // Request current contest state on join
    if (websocket.isConnected && identity) {
      websocket.sendMessage('getContestState', { roomName });
    }

    return () => {
      websocket.removeEventListener('contestStart', handleContestStart);
      websocket.removeEventListener('contestEnd', handleContestEnd);
      websocket.removeEventListener('roundStart', handleRoundStart);
      websocket.removeEventListener('roundEnd', handleRoundEnd);
      websocket.removeEventListener('voteSubmitted', handleVoteSubmitted);
      websocket.removeEventListener('contestantUpdate', handleContestantUpdate);
      websocket.removeEventListener('leaderboardUpdate', handleLeaderboardUpdate);
      websocket.removeEventListener('votingStart', handleVotingStart);
      websocket.removeEventListener('votingEnd', handleVotingEnd);
      websocket.removeEventListener('contestStateUpdate', handleContestStateUpdate);
      eventListenerRegistered.current = false;
    };
  }, [websocket, roomName, identity, config, timer, leaderboard, participants]);

  // Actions
  const startContest = useCallback(async () => {
    if (!isHost) {
      throw new Error('Only hosts can start contests');
    }

    if (!websocket || !roomName) {
      throw new Error('WebSocket not connected');
    }

    // Validate minimum contestants
    if (config.rules?.minContestants && contestants.size < config.rules.minContestants) {
      throw new Error(`Minimum ${config.rules.minContestants} contestants required`);
    }

    const success = websocket.sendMessage('startContest', { roomName, config });
    if (!success) {
      throw new Error('Failed to start contest');
    }
  }, [isHost, websocket, roomName, config, contestants.size]);

  const endContest = useCallback(async () => {
    if (!isHost) {
      throw new Error('Only hosts can end contests');
    }

    if (!websocket || !roomName) {
      throw new Error('WebSocket not connected');
    }

    const success = websocket.sendMessage('endContest', { roomName });
    if (!success) {
      throw new Error('Failed to end contest');
    }
  }, [isHost, websocket, roomName]);

  const submitVote = useCallback(async (targetId: string, score: number) => {
    if (!canVote) {
      throw new Error('You cannot vote');
    }

    if (!websocket || !roomName || !identity) {
      throw new Error('WebSocket not connected');
    }

    const voter = participants.find(p => p.id === identity);
    if (!voter) {
      throw new Error('Voter not found');
    }

    const vote: Vote = {
      voterId: identity,
      voterWallet: voter.walletAddress,
      targetId,
      score,
      timestamp: Date.now(),
      round: currentRound,
    };

    // Optimistically update local state for UI feedback
    setMyVotes((prev) => [...prev, vote]);

    const success = websocket.sendMessage('submitVote', {
      roomName,
      voterId: identity,
      targetId,
      score,
      round: currentRound,
    });

    if (!success) {
      // Revert optimistic update
      setMyVotes((prev) => prev.filter(v => v !== vote));
      throw new Error('Failed to submit vote');
    }
  }, [canVote, websocket, roomName, identity, currentRound, participants]);

  const eliminateContestant = useCallback(async (participantId: string) => {
    if (!isHost) {
      throw new Error('Only hosts can eliminate contestants');
    }

    if (!websocket || !roomName) {
      throw new Error('WebSocket not connected');
    }

    const success = websocket.sendMessage('eliminateContestant', { roomName, participantId });
    if (!success) {
      throw new Error('Failed to eliminate contestant');
    }
  }, [isHost, websocket, roomName]);

  const nextRound = useCallback(async () => {
    if (!isHost) {
      throw new Error('Only hosts can advance rounds');
    }

    if (!websocket || !roomName) {
      throw new Error('WebSocket not connected');
    }

    const success = websocket.sendMessage('nextRound', { roomName });
    if (!success) {
      throw new Error('Failed to advance to next round');
    }
  }, [isHost, websocket, roomName]);

  // Voting utilities
  const getVoteCount = useCallback((participantId: string) => {
    return votes.get(participantId)?.length || 0;
  }, [votes]);

  const getAverageScore = useCallback((participantId: string) => {
    const participantVotes = votes.get(participantId);
    if (!participantVotes || participantVotes.length === 0) return 0;

    const sum = participantVotes.reduce((acc, vote) => acc + vote.score, 0);
    return sum / participantVotes.length;
  }, [votes]);

  return {
    // State
    contestState,
    currentRound,
    timeRemaining: timer.timeRemaining,
    contestants: Array.from(contestants.values()),
    eliminated,
    leaderboard,
    votes,
    votingResults,
    votingTimeRemaining,
    myVotes,
    roundResults,

    // Actions
    startContest,
    endContest,
    submitVote,
    eliminateContestant,
    nextRound,

    // Timer controls
    timer,

    // Voting utilities
    getVoteCount,
    getAverageScore,

    // Status checks
    isHost,
    canStartContest: isHost && contestState === 'idle',
    canVote,
    isConnected: isConnectedRef.current,
  };
}