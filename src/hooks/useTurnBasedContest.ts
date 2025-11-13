/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { BaseContestConfig } from "../types";
import { useContest } from "./useContest";
import { useStreamContext } from "./useStreamContext";

// ============================================
// Types
// ============================================

export interface TurnBasedContestConfig extends BaseContestConfig {
  turnDuration: number;
  autoAdvance?: boolean;
  votingMode?: "realtime" | "per-turn" | "final-only" | "both";
  turnVotingDuration?: number;
  breakDuration?: number;
  customTurnOrder?: string[];
  notifyBeforeTurn?: number;
}

export interface TurnState {
  currentPerformerId: string | null;
  turnStartTime: number | null;
  timeRemaining: number;
  performanceQueue: string[];
  completedPerformers: string[];
  isMyTurn: boolean;
  queuePosition: number | null;
  isPaused: boolean;
}

export interface VotingState {
  isActive: boolean;
  isTurnVoting: boolean;
  currentVotingTarget: string | null;
  timeRemaining: number;
  hasVoted: (contestantId: string) => boolean;
  canVote: boolean;
  votingPermissions: "all" | "judges" | "contestants";
}

export interface RealtimeVotingState {
  enabled: boolean;
  currentPerformer: string | null;
  hasVotedForCurrent: boolean;
  canVoteNow: boolean;
}

// ============================================
// Main Hook
// ============================================

export function useTurnBasedContest(config: TurnBasedContestConfig) {
  const { identity, websocket, roomName } = useStreamContext();

  // ============================================
  // State Management
  // ============================================

  const [currentPerformerId, setCurrentPerformerId] = useState<string | null>(
    null
  );
  const [turnStartTime, setTurnStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [performanceQueue, setPerformanceQueue] = useState<string[]>([]);
  const [completedPerformers, setCompletedPerformers] = useState<string[]>([]);
  const [queueInitialized, setQueueInitialized] = useState(false);

  const [votingPhase, setVotingPhase] = useState(false);
  const [votingTimeRemaining, setVotingTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mySubmittedVotes, setMySubmittedVotes] = useState<Set<string>>(
    new Set()
  );

  const [isTurnVoting, setIsTurnVoting] = useState(false);
  const [turnVotingTarget, setTurnVotingTarget] = useState<string | null>(null);
  const [turnVotingTimeRemaining, setTurnVotingTimeRemaining] = useState(0);

  const realtimeVotingEnabled = useMemo(
    () => config.votingMode === "realtime" || config.votingMode === "both",
    [config.votingMode]
  );
  const [realtimeVotesSubmitted, setRealtimeVotesSubmitted] = useState<
    Set<string>
  >(new Set());

  const [contestStarted, setContestStarted] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const nextQueueRef = useRef<string[]>([]);
  const originalQueueRef = useRef<string[]>([]);
  const contestStateRef = useRef({
    votingPhase: false,
    isTurnVoting: false,
    contestStarted: false,
    currentPerformerId: null as string | null,
  });

  // ============================================
  // Contest Configuration
  // ============================================

  const contestConfig = useMemo(
    () => ({
      ...config,
      features: {
        voting: true,
        elimination: false,
        leaderboard: true,
        timer: false,
        ...config.features,
      },
      rules: {
        minContestants: 2,
        selfVoting: false,
        votingDuration: config.rules?.votingDuration || 60,
        ...config.rules,
      },
      // CRITICAL FIX: Set scoring to aggregate ALL votes across all rounds and categories
      scoring: {
        type: "average" as const,
        scoreRange: { min: 1, max: 10 },
        aggregation: {
          rounds: "sum" as const, // CHANGED from "latest" to "sum" to include ALL votes
          categories: "average" as const,
        },
      },
    }),
    [config]
  );

  // ============================================
  // Base Contest Hook
  // ============================================

  const contest = useContest(contestConfig);

  // ============================================
  // Utility Functions
  // ============================================

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setEventLog((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 30));
  }, []);

  // ============================================
  // Permission Checks
  // ============================================

  const canUserVote = useCallback(() => {
    if (!identity) return false;

    const votingPermissions = config.rules?.votingPermissions || "all";

    switch (votingPermissions) {
      case "judges":
        return contest.judges.includes(identity as any);
      case "contestants": {
        const contestant = contest.getContestant(identity);
        return contestant ? !contestant.isEliminated : false;
      }
      case "all":
        return true;
      default:
        return false;
    }
  }, [identity, config.rules?.votingPermissions, contest]);

  // ============================================
  // State Sync
  // ============================================

  useEffect(() => {
    contestStateRef.current = {
      votingPhase,
      isTurnVoting,
      contestStarted,
      currentPerformerId,
    };
  }, [votingPhase, isTurnVoting, contestStarted, currentPerformerId]);

  // ============================================
  // Turn Control Methods
  // ============================================

  const startTurn = useCallback(
    (performerId: string, remainingQueue: string[]) => {
      if (!contest.isHost || !websocket || !roomName) return;

      addLog(`Starting turn for ${performerId}`);

      websocket.sendMessage("turnStart", {
        roomName: roomName,
        participantId: performerId,
        duration: config.turnDuration,
        queue: remainingQueue,
        currentPerformer: performerId,
      });

      nextQueueRef.current = remainingQueue;

      if (config.votingMode === "realtime" || config.votingMode === "both") {
        setRealtimeVotesSubmitted(new Set());
      }
    },
    [
      contest.isHost,
      websocket,
      roomName,
      config.turnDuration,
      config.votingMode,
      addLog,
    ]
  );

  const startVotingPhase = useCallback(() => {
    if (!contest.isHost || !websocket || !roomName) return;

    const duration = contestConfig.rules?.votingDuration || 60;
    addLog(`Starting final voting phase (${duration}s)`);

    websocket.sendMessage("startVoting", {
      roomName: roomName,
      duration: duration,
    });
  }, [
    contest.isHost,
    websocket,
    roomName,
    contestConfig.rules?.votingDuration,
    addLog,
  ]);

  const startTurnVoting = useCallback(
    (performerId: string, duration?: number) => {
      if (!contest.isHost || !websocket || !roomName) return;

      const votingDuration = duration || config.turnVotingDuration || 30;
      addLog(`Starting turn voting for ${performerId} (${votingDuration}s)`);

      websocket.sendMessage("startTurnVoting", {
        roomName: roomName,
        performerId: performerId,
        duration: votingDuration,
      });
    },
    [contest.isHost, websocket, roomName, config.turnVotingDuration, addLog]
  );

  const startFirstTurn = useCallback(() => {
    if (!contest.isHost || performanceQueue.length === 0) {
      addLog("Cannot start first turn");
      return;
    }

    startTurn(performanceQueue[0], performanceQueue.slice(1));
  }, [contest.isHost, performanceQueue, startTurn, addLog]);

  const endCurrentTurn = useCallback(
    (triggerVoting?: boolean) => {
      if (!contest.isHost || !currentPerformerId || !websocket || !roomName) {
        addLog("Cannot end turn");
        return;
      }

      addLog("Ending current turn");

      const shouldTriggerVoting =
        triggerVoting ?? config.votingMode === "per-turn";

      websocket.sendMessage("turnEnd", {
        roomName: roomName,
        participantId: currentPerformerId,
        triggerVoting: shouldTriggerVoting,
      });
    },
    [
      contest.isHost,
      currentPerformerId,
      websocket,
      roomName,
      config.votingMode,
      addLog,
    ]
  );

  const startNextTurn = useCallback(() => {
    if (!contest.isHost || performanceQueue.length === 0) {
      addLog("No more performers in queue");
      return;
    }

    startTurn(performanceQueue[0], performanceQueue.slice(1));
  }, [contest.isHost, performanceQueue, startTurn, addLog]);

  const skipCurrentTurn = useCallback(() => {
    if (!contest.isHost || !currentPerformerId) return;

    addLog(`Skipping turn for ${currentPerformerId}`);
    endCurrentTurn(false);
  }, [contest.isHost, currentPerformerId, endCurrentTurn, addLog]);

  const closeFinalVoting = useCallback(() => {
    if (!contest.isHost) return;

    addLog("Closing final voting");
    setVotingPhase(false);
    setVotingTimeRemaining(0);
    setShowFinalResults(true);
  }, [contest.isHost, addLog]);

  // ============================================
  // Voting Methods
  // ============================================

  const submitVote = useCallback(
    async (contestantId: string, score: number, category?: string) => {
      if (!canUserVote()) {
        addLog("You don't have permission to vote");
        return;
      }

      try {
        await contest.submitVote(contestantId, score, category);
        setMySubmittedVotes((prev) => new Set([...prev, contestantId]));

        const categoryText = category ? ` (${category})` : "";
        const voteType = isTurnVoting ? "turn vote" : "vote";
        addLog(
          `Submitted ${voteType} ${score} for ${
            contest.getContestant(contestantId)?.name
          }${categoryText}`
        );
      } catch (error) {
        addLog(`Failed to submit vote: ${error}`);
      }
    },
    [contest, isTurnVoting, canUserVote, addLog]
  );

  const submitRealtimeVote = useCallback(
    async (targetId: string, score: number, category?: string) => {
      if (!websocket || !roomName || !identity || !realtimeVotingEnabled) {
        addLog("Real-time voting not available");
        return;
      }

      if (!currentPerformerId) {
        addLog("No active performance");
        return;
      }

      if (!canUserVote()) {
        addLog("You don't have permission to vote");
        return;
      }

      try {
        const success = websocket.sendMessage("submitRealtimeVote", {
          roomName: roomName,
          voterId: identity,
          targetId: targetId,
          score: score,
          round: contest.currentRound,
          category: category,
        });

        if (success) {
          setRealtimeVotesSubmitted((prev) => new Set([...prev, targetId]));
          setMySubmittedVotes((prev) => new Set([...prev, targetId]));

          const categoryText = category ? ` (${category})` : "";
          addLog(
            `Real-time vote ${score} submitted for ${
              contest.getContestant(targetId)?.name
            }${categoryText}`
          );
        }
      } catch (error) {
        addLog(`Failed to submit real-time vote: ${error}`);
      }
    },
    [
      websocket,
      roomName,
      identity,
      realtimeVotingEnabled,
      currentPerformerId,
      contest,
      canUserVote,
      addLog,
    ]
  );

  const hasVotedFor = useCallback(
    (contestantId: string) => {
      if (votingPhase && !isTurnVoting && config.votingMode === "both") {
        return mySubmittedVotes.has(contestantId);
      }
      return (
        mySubmittedVotes.has(contestantId) ||
        realtimeVotesSubmitted.has(contestantId)
      );
    },
    [
      mySubmittedVotes,
      realtimeVotesSubmitted,
      votingPhase,
      isTurnVoting,
      config.votingMode,
    ]
  );

  const hasRealtimeVotedFor = useCallback(
    (contestantId: string) => {
      return realtimeVotesSubmitted.has(contestantId);
    },
    [realtimeVotesSubmitted]
  );

  const getContestantsNeedingVotes = useCallback(() => {
    if (isTurnVoting && turnVotingTarget) {
      const contestant = contest.getContestant(turnVotingTarget);
      return contestant && !hasVotedFor(turnVotingTarget) ? [contestant] : [];
    }

    return contest.contestants.filter(
      (c: any) => c.participantId !== identity && !hasVotedFor(c.participantId)
    );
  }, [contest, identity, hasVotedFor, isTurnVoting, turnVotingTarget]);

  const pauseTurn = useCallback(() => {
    if (!contest.isHost || !currentPerformerId || !websocket || !roomName) {
      addLog("Cannot pause turn");
      return;
    }

    addLog("Pausing turn");

    websocket.sendMessage("pauseTurn", {
      roomName: roomName,
    });
  }, [contest.isHost, currentPerformerId, websocket, roomName, addLog]);

  const resumeTurn = useCallback(() => {
    if (!contest.isHost || !currentPerformerId || !websocket || !roomName) {
      addLog("Cannot resume turn");
      return;
    }

    addLog("Resuming turn");

    websocket.sendMessage("resumeTurn", {
      roomName: roomName,
    });
  }, [contest.isHost, currentPerformerId, websocket, roomName, addLog]);

  const restartTurn = useCallback(() => {
    if (!contest.isHost || !currentPerformerId || !websocket || !roomName) {
      addLog("Cannot restart turn");
      return;
    }

    addLog(`Restarting turn for ${currentPerformerId}`);

    websocket.sendMessage("restartTurn", {
      roomName: roomName,
      performerId: currentPerformerId,
      duration: config.turnDuration,
    });
  }, [
    contest.isHost,
    currentPerformerId,
    websocket,
    roomName,
    config.turnDuration,
    addLog,
  ]);

  // ============================================
  // Queue Initialization
  // ============================================

  useEffect(() => {
    if (
      contest.state.status === "active" &&
      contest.isHost &&
      !queueInitialized &&
      performanceQueue.length === 0
    ) {
      const contestants = Array.from(contest.state.contestants.values())
        .filter((c: any) => !c.isEliminated)
        .map((c: any) => c.participantId);

      if (contestants.length > 0) {
        const ordered = config.customTurnOrder
          ? config.customTurnOrder.filter((id) => contestants.includes(id))
          : [...contestants].sort(() => Math.random() - 0.5);

        setPerformanceQueue(ordered);
        nextQueueRef.current = ordered;
        originalQueueRef.current = ordered;
        // console.log("ORIGINAL QUEUE SET:", originalQueueRef.current);
        setQueueInitialized(true);
        addLog(`Queue initialized with ${ordered.length} contestants`);

        if (websocket && roomName) {
          websocket.sendMessage("turnBasedReady", {
            roomName: roomName,
            queueLength: ordered.length,
            queue: ordered,
          });

          if (config.autoAdvance) {
            addLog("Auto-starting first turn in 3 seconds...");
            setTimeout(() => {
              startTurn(ordered[0], ordered.slice(1));
            }, 3000);
          }
        }
      }
    }

    if (contest.state.status === "idle" || contest.state.status === "ended") {
      setQueueInitialized(false);
      nextQueueRef.current = [];
      originalQueueRef.current = [];
    }
  }, [
    contest.state.status,
    contest.state.contestants,
    contest.isHost,
    queueInitialized,
    performanceQueue.length,
    websocket,
    roomName,
    config.customTurnOrder,
    config.autoAdvance,
    addLog,
    startTurn,
  ]);

  // ============================================
  // WebSocket Event Handlers
  // ============================================

  useEffect(() => {
    if (!websocket) return;

    const handleTurnStart = (data: any) => {
      addLog(`Turn started: ${data.participantId}`);
      setCurrentPerformerId(data.participantId);
      setTurnStartTime(Date.now());
      setTimeRemaining(data.duration || config.turnDuration);

      if (data.queue) {
        setPerformanceQueue(data.queue);
        nextQueueRef.current = data.queue;
      }

      setRealtimeVotesSubmitted(new Set());
    };

    const handleTurnEnd = (data: any) => {
      addLog(`Turn ended: ${data.participantId || "unknown"}`);

      if (data.participantId) {
        setCompletedPerformers((prev) => [...prev, data.participantId]);
      }

      setCurrentPerformerId(null);
      setTurnStartTime(null);
      setTimeRemaining(0);

      if (contest.isHost && config.autoAdvance && !isTurnVoting) {
        const currentQueue = nextQueueRef.current;

        // console.log("Turn ended, remaining queue:", currentQueue);
        // console.log("Completed performers:", completedPerformers.length + 1);

        if (currentQueue.length > 0) {
          setTimeout(() => {
            const currentState = contestStateRef.current;

            if (
              !currentState.votingPhase &&
              !currentState.isTurnVoting &&
              !currentState.currentPerformerId &&
              currentState.contestStarted
            ) {
              addLog(`Starting next turn for ${currentQueue[0]}`);
              startTurn(currentQueue[0], currentQueue.slice(1));
            }
          }, config.breakDuration || 2000);
        } else {
          addLog(`All turns complete. Voting mode: ${config.votingMode}`);

          if (
            config.votingMode === "final-only" ||
            config.votingMode === "both"
          ) {
            addLog("Starting final voting phase...");
            setTimeout(() => {
              const currentState = contestStateRef.current;
              if (
                !currentState.votingPhase &&
                !currentState.isTurnVoting &&
                currentState.contestStarted
              ) {
                startVotingPhase();
              }
            }, config.breakDuration || 2000);
          } else if (config.votingMode === "realtime") {
            addLog("All performances complete. Showing results.");
            setShowFinalResults(true);
          } else if (config.votingMode === "per-turn") {
            addLog("Unexpected: per-turn mode in handleTurnEnd");
            setShowFinalResults(true);
          }
        }
      }
    };

    const handleTurnVotingStart = (data: any) => {
      addLog(
        `Turn voting started for ${data.performerName || data.performerId} (${
          data.duration
        }s)`
      );
      setIsTurnVoting(true);
      setTurnVotingTarget(data.performerId);
      setTurnVotingTimeRemaining(data.duration);

      if (config.votingMode === "per-turn") {
        setMySubmittedVotes(new Set());
      }
    };

    const handleTurnVotingEnd = (data: any) => {
      addLog(
        `Turn voting ended for ${data.performerId} - Score: ${
          data.score?.toFixed(2) || 0
        }, Votes: ${data.voteCount || 0}`
      );

      setIsTurnVoting(false);
      setTurnVotingTarget(null);
      setTurnVotingTimeRemaining(0);

      if (contest.isHost && config.autoAdvance) {
        const newCompleted = completedPerformers.includes(data.performerId)
          ? completedPerformers
          : [...completedPerformers, data.performerId];

        setCompletedPerformers(newCompleted);

        const allPerformers = originalQueueRef.current;
        const remaining = allPerformers.filter(
          (id) => !newCompleted.includes(id)
        );

        if (remaining.length > 0) {
          nextQueueRef.current = remaining;

          setTimeout(() => {
            const currentState = contestStateRef.current;

            if (
              !currentState.votingPhase &&
              !currentState.isTurnVoting &&
              !currentState.currentPerformerId &&
              currentState.contestStarted
            ) {
              addLog(`Starting next turn for ${remaining[0]}`);
              startTurn(remaining[0], remaining.slice(1));
            }
          }, config.breakDuration || 2000);
        } else {
          addLog(
            `All ${newCompleted.length} performers have completed. Showing results.`
          );
          setShowFinalResults(true);
        }
      } else {
        setCompletedPerformers((prev) => {
          if (prev.includes(data.performerId)) {
            return prev;
          }
          return [...prev, data.performerId];
        });
      }
    };

    const handleRealtimeVoteSubmitted = (data: any) => {
      if (data.vote.voterId === identity) {
        setRealtimeVotesSubmitted(
          (prev) => new Set([...prev, data.vote.targetId])
        );
        setMySubmittedVotes((prev) => new Set([...prev, data.vote.targetId]));
        addLog(
          `Real-time vote recorded - Score: ${
            data.updatedScore?.toFixed(2) || 0
          }`
        );
      }
    };

    const handleContestStart = () => {
      addLog("Contest started");
      setContestStarted(true);
      setShowFinalResults(false);
      setMySubmittedVotes(new Set());
      setRealtimeVotesSubmitted(new Set());
      setPerformanceQueue([]);
      setCompletedPerformers([]);
      setIsTurnVoting(false);
      setTurnVotingTarget(null);
    };

    const handleContestEnd = () => {
      addLog("Contest ended");
      setContestStarted(false);
      setCurrentPerformerId(null);
      setVotingPhase(false);
      setIsTurnVoting(false);
      setTurnVotingTarget(null);
      setShowFinalResults(false);
      setMySubmittedVotes(new Set());
      setRealtimeVotesSubmitted(new Set());
      setPerformanceQueue([]);
      setCompletedPerformers([]);
      setQueueInitialized(false);
      nextQueueRef.current = [];
      originalQueueRef.current = [];
    };

    const handleTurnBasedReady = (data: any) => {
      addLog(`Turn-based ready: ${data.queueLength} in queue`);
      if (data.queue && !contest.isHost) {
        setPerformanceQueue(data.queue);
        nextQueueRef.current = data.queue;
        originalQueueRef.current = data.queue;
      }
    };

    const handleVotingStart = (data: any) => {
      addLog(`Final voting started: ${data.duration}s`);
      setCurrentPerformerId(null);
      setTurnStartTime(null);
      setTimeRemaining(0);
      setVotingPhase(true);
      setIsTurnVoting(false);
      setVotingTimeRemaining(
        data.duration || contestConfig.rules?.votingDuration || 60
      );

      if (config.votingMode === "both" || config.votingMode === "final-only") {
        setMySubmittedVotes(new Set());
      }
    };

    const handleVotingEnd = () => {
      addLog("Final voting ended");
      setVotingPhase(false);
      setVotingTimeRemaining(0);
      setShowFinalResults(true);
    };

    const handleVoteSubmitted = (data: any) => {
      if (data.voterId === identity) {
        setMySubmittedVotes((prev) => new Set([...prev, data.targetId]));
      }
    };

    const handleTurnPaused = (data: {
      remainingTime: number;
      remainingSeconds?: number;
    }) => {

      // Calculate what it SHOULD be
      if (turnStartTime) {
        const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
        const shouldBe = config.turnDuration - elapsed;
        // console.log("Elapsed seconds:", elapsed);
        console.log("Should be remaining:", shouldBe);
      }

      const seconds =
      data.remainingSeconds || Math.floor(data.remainingTime / 1000);

      addLog(`Turn paused with ${seconds}s remaining`);

      setIsPaused(true);
      setTimeRemaining(seconds);
      setTurnStartTime(null);
    };

    const handleTurnResumed = (data: { timerEndTime: number }) => {
      addLog("Turn resumed");
      setIsPaused(false);
      setTurnStartTime(
        Date.now() -
          (config.turnDuration * 1000 - (data.timerEndTime - Date.now()))
      );
    };

    const handleTurnRestarted = (data: {
      performerId: string;
      duration: number;
      timerEndTime: number;
    }) => {
      addLog(`Turn restarted: ${data.duration}s`);
      setIsPaused(false);
      setCurrentPerformerId(data.performerId);
      setTurnStartTime(Date.now());
      setTimeRemaining(data.duration);
    };

    websocket.addEventListener("turnStart", handleTurnStart);
    websocket.addEventListener("turnEnd", handleTurnEnd);
    websocket.addEventListener("turnTimeout", handleTurnEnd);
    websocket.addEventListener("turnVotingStart", handleTurnVotingStart);
    websocket.addEventListener("turnVotingEnd", handleTurnVotingEnd);
    websocket.addEventListener(
      "realtimeVoteSubmitted",
      handleRealtimeVoteSubmitted
    );
    websocket.addEventListener("contestStart", handleContestStart);
    websocket.addEventListener("contestEnd", handleContestEnd);
    websocket.addEventListener("turnBasedReady", handleTurnBasedReady);
    websocket.addEventListener("votingStart", handleVotingStart);
    websocket.addEventListener("votingEnd", handleVotingEnd);
    websocket.addEventListener("voteSubmitted", handleVoteSubmitted);
    websocket.addEventListener("turnPaused", handleTurnPaused);
    websocket.addEventListener("turnResumed", handleTurnResumed);
    websocket.addEventListener("turnRestarted", handleTurnRestarted);

    return () => {
      websocket.removeEventListener("turnStart", handleTurnStart);
      websocket.removeEventListener("turnEnd", handleTurnEnd);
      websocket.removeEventListener("turnTimeout", handleTurnEnd);
      websocket.removeEventListener("turnVotingStart", handleTurnVotingStart);
      websocket.removeEventListener("turnVotingEnd", handleTurnVotingEnd);
      websocket.removeEventListener(
        "realtimeVoteSubmitted",
        handleRealtimeVoteSubmitted
      );
      websocket.removeEventListener("contestStart", handleContestStart);
      websocket.removeEventListener("contestEnd", handleContestEnd);
      websocket.removeEventListener("turnBasedReady", handleTurnBasedReady);
      websocket.removeEventListener("votingStart", handleVotingStart);
      websocket.removeEventListener("votingEnd", handleVotingEnd);
      websocket.removeEventListener("voteSubmitted", handleVoteSubmitted);
      websocket.removeEventListener("turnPaused", handleTurnPaused);
      websocket.removeEventListener("turnResumed", handleTurnResumed);
      websocket.removeEventListener("turnRestarted", handleTurnRestarted);
    };
  }, [
    websocket,
    config.turnDuration,
    config.autoAdvance,
    config.breakDuration,
    config.votingMode,
    contest.isHost,
    roomName,
    contestConfig.rules?.votingDuration,
    identity,
    isTurnVoting,
    completedPerformers,
    addLog,
    startVotingPhase,
    startTurn,
  ]);

  // ============================================
  // Timers
  // ============================================

  useEffect(() => {
    if (!turnStartTime || votingPhase || isTurnVoting || isPaused) return; // Added isPaused check

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
      const remaining = Math.max(0, config.turnDuration - elapsed);
      setTimeRemaining(remaining);

      if (
        remaining === 0 &&
        currentPerformerId &&
        contest.isHost &&
        config.autoAdvance
      ) {
        endCurrentTurn();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    turnStartTime,
    config.turnDuration,
    votingPhase,
    isTurnVoting,
    isPaused, // Added to dependencies
    currentPerformerId,
    contest.isHost,
    config.autoAdvance,
    endCurrentTurn,
  ]);

  useEffect(() => {
    if (votingTimeRemaining <= 0 || isTurnVoting) return;

    const interval = setInterval(() => {
      setVotingTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [votingTimeRemaining, isTurnVoting]);

  useEffect(() => {
    if (turnVotingTimeRemaining <= 0 || !isTurnVoting) return;

    const interval = setInterval(() => {
      setTurnVotingTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [turnVotingTimeRemaining, isTurnVoting]);

  // ============================================
  // Computed State
  // ============================================

  const turnState: TurnState = useMemo(
    () => ({
      currentPerformerId,
      turnStartTime,
      timeRemaining,
      performanceQueue,
      completedPerformers,
      isMyTurn:
        currentPerformerId === identity && !votingPhase && !isTurnVoting,
      queuePosition: identity ? performanceQueue.indexOf(identity) : null,
      isPaused,
    }),
    [
      currentPerformerId,
      turnStartTime,
      timeRemaining,
      performanceQueue,
      completedPerformers,
      identity,
      votingPhase,
      isTurnVoting,
      isPaused,
    ]
  );

  const votingState: VotingState = useMemo(
    () => ({
      isActive: votingPhase || isTurnVoting,
      isTurnVoting: isTurnVoting,
      currentVotingTarget: turnVotingTarget,
      timeRemaining: isTurnVoting
        ? turnVotingTimeRemaining
        : votingTimeRemaining,
      hasVoted: hasVotedFor,
      canVote: canUserVote() && (votingPhase || isTurnVoting),
      votingPermissions: contestConfig.rules?.votingPermissions || "all",
    }),
    [
      votingPhase,
      isTurnVoting,
      turnVotingTarget,
      turnVotingTimeRemaining,
      votingTimeRemaining,
      hasVotedFor,
      canUserVote,
      contestConfig.rules?.votingPermissions,
    ]
  );

  const realtimeVotingState: RealtimeVotingState = useMemo(
    () => ({
      enabled: realtimeVotingEnabled,
      currentPerformer: currentPerformerId,
      hasVotedForCurrent: currentPerformerId
        ? hasRealtimeVotedFor(currentPerformerId)
        : false,
      canVoteNow:
        realtimeVotingEnabled &&
        !!currentPerformerId &&
        currentPerformerId !== identity &&
        !isTurnVoting &&
        !votingPhase &&
        canUserVote(),
    }),
    [
      realtimeVotingEnabled,
      currentPerformerId,
      identity,
      isTurnVoting,
      votingPhase,
      hasRealtimeVotedFor,
      canUserVote,
    ]
  );

  const canStartFirstTurn = useMemo(
    () =>
      contest.isHost &&
      contestStarted &&
      !currentPerformerId &&
      performanceQueue.length > 0 &&
      !votingPhase &&
      !isTurnVoting &&
      !config.autoAdvance,
    [
      contest.isHost,
      contestStarted,
      currentPerformerId,
      performanceQueue.length,
      votingPhase,
      isTurnVoting,
      config.autoAdvance,
    ]
  );

  const canEndTurn = useMemo(
    () => contest.isHost && currentPerformerId !== null && !isTurnVoting,
    [contest.isHost, currentPerformerId, isTurnVoting]
  );

  const canStartVoting = useMemo(
    () =>
      contest.isHost &&
      contestStarted &&
      !currentPerformerId &&
      !votingPhase &&
      !isTurnVoting &&
      performanceQueue.length === 0 &&
      !config.autoAdvance &&
      (config.votingMode === "final-only" || config.votingMode === "both"),
    [
      contest.isHost,
      contestStarted,
      currentPerformerId,
      votingPhase,
      isTurnVoting,
      performanceQueue.length,
      config.autoAdvance,
      config.votingMode,
    ]
  );

  const canStartTurnVoting = useMemo(
    () =>
      contest.isHost &&
      contestStarted &&
      !currentPerformerId &&
      !votingPhase &&
      !isTurnVoting &&
      completedPerformers.length > 0 &&
      config.votingMode === "per-turn" &&
      !config.autoAdvance,
    [
      contest.isHost,
      contestStarted,
      currentPerformerId,
      votingPhase,
      isTurnVoting,
      completedPerformers.length,
      config.votingMode,
      config.autoAdvance,
    ]
  );

  // ============================================
  // Return Hook API
  // ============================================

  return {
    contest,
    turnState,
    votingState,
    realtimeVotingState,
    contestStarted,
    showFinalResults,
    eventLog,

    startFirstTurn,
    endCurrentTurn,
    startNextTurn,
    skipCurrentTurn,
    startVotingPhase,
    startTurnVoting,
    closeFinalVoting,
    pauseTurn, // Add this
    resumeTurn, // Add this
    restartTurn, // Add this

    submitVote,
    submitRealtimeVote,
    hasVotedFor,
    hasRealtimeVotedFor,
    getContestantsNeedingVotes,

    canStartFirstTurn,
    canEndTurn,
    canStartVoting,
    canStartTurnVoting,

    addLog,
    scoringStrategy: contestConfig.scoring,
    votingMode: config.votingMode || "final-only",
    canUserVote,
  };
}
