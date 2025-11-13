/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useReducer,
} from "react";
import { useTenantContext } from "./useTenantContext";
import { useStreamContext } from "./useStreamContext";
import {
  BaseContestConfig,
  ContestState,
  Contestant,
  ContestAction,
  ContestPlugin,
  ContestContext,
  ContestEventEmitter,
  ContestEventMap,
  Vote,
  ParticipantId,
  TeamId,
  LeaderboardEntry,
  RoundResult,
  ContestResults,
  VotingResults,
  ScoringStrategy,
} from "../types";

// ============================================
// Event Emitter Implementation
// ============================================

class EventEmitter implements ContestEventEmitter {
  #events: Map<string, Set<Function>> = new Map();

  on<K extends keyof ContestEventMap>(
    event: K,
    handler: (data: ContestEventMap[K]) => void
  ): void {
    if (!this.#events.has(event)) {
      this.#events.set(event, new Set());
    }
    this.#events.get(event)!.add(handler);
  }

  off<K extends keyof ContestEventMap>(
    event: K,
    handler: (data: ContestEventMap[K]) => void
  ): void {
    const handlers = this.#events.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit<K extends keyof ContestEventMap>(
    event: K,
    data: ContestEventMap[K]
  ): void {
    const handlers = this.#events.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  once<K extends keyof ContestEventMap>(
    event: K,
    handler: (data: ContestEventMap[K]) => void
  ): void {
    const onceHandler = (data: ContestEventMap[K]) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  clear(): void {
    this.#events.clear();
  }
}

// ============================================
// Extended Contest Action Type
// ============================================

type ExtendedContestAction =
  | ContestAction
  | { type: "START_VOTING" }
  | { type: "START_TURN_VOTING" };

// ============================================
// Contest Reducer
// ============================================

function contestReducer(
  state: ContestState,
  action: ExtendedContestAction
): ContestState {
  switch (action.type) {
    case "START_CONTEST":
      return {
        ...state,
        status: "starting",
        startedAt: Date.now(),
      };

    case "END_CONTEST":
      return {
        ...state,
        status: "ended",
        endedAt: Date.now(),
        timerEndTime: undefined,
      };

    case "START_VOTING":
      return {
        ...state,
        status: "voting",
        timerEndTime: undefined,
      };

    // Add this new case:
    case "START_TURN_VOTING":
      return {
        ...state,
        status: "turn-voting",
        timerEndTime: undefined,
      };

    case "PAUSE_CONTEST":
      return {
        ...state,
        status: "paused",
        pausedAt: Date.now(),
      };

    case "RESUME_CONTEST":
      return {
        ...state,
        status: "active",
        pausedAt: undefined,
      };

    case "START_ROUND":
      return {
        ...state,
        currentRound: action.round,
        status: "active",
      };

    case "END_ROUND":
      return {
        ...state,
        rounds: [...state.rounds, action.result],
      };

    case "ADD_CONTESTANT": {
      if (!action.contestant.participantId || !action.contestant.name) {
        console.warn(
          "Attempted to add contestant with missing data:",
          action.contestant
        );
        return state;
      }
      const updatedMap = new Map(state.contestants);
      updatedMap.set(action.contestant.participantId, action.contestant);
      return {
        ...state,
        contestants: updatedMap,
      };
    }

    case "REMOVE_CONTESTANT": {
      const newContestants = new Map(state.contestants);
      newContestants.delete(action.participantId);
      return {
        ...state,
        contestants: newContestants,
      };
    }

    case "UPDATE_SCORE": {
      const updatedContestants = new Map(state.contestants);
      const contestant = updatedContestants.get(action.participantId);
      if (contestant) {
        contestant.score = action.score;
        if (action.category) {
          contestant.scores.set(action.category, action.score);
        }
      }
      return {
        ...state,
        contestants: updatedContestants,
      };
    }

    case "SUBMIT_VOTE": {
      const votes = new Map(state.votes);
      const targetVotes = votes.get(action.vote.targetId) || [];
      votes.set(action.vote.targetId, [...targetVotes, action.vote]);
      return {
        ...state,
        votes,
      };
    }

    case "ELIMINATE_CONTESTANTS": {
      const eliminatedSet = new Set(state.eliminated);
      action.participantIds.forEach((id) => eliminatedSet.add(id));

      const contestantsAfterElimination = new Map(state.contestants);
      action.participantIds.forEach((id) => {
        const c = contestantsAfterElimination.get(id);
        if (c) {
          c.isEliminated = true;
          c.eliminatedRound = state.currentRound;
        }
      });

      return {
        ...state,
        eliminated: eliminatedSet,
        contestants: contestantsAfterElimination,
      };
    }

    case "ADVANCE_CONTESTANTS": {
      const advancedSet = new Set(state.advanced);
      action.participantIds.forEach((id) => advancedSet.add(id));
      return {
        ...state,
        advanced: advancedSet,
      };
    }

    case "UPDATE_MATCHUP": {
      const matchups = state.currentMatchups ? [...state.currentMatchups] : [];
      const matchIndex = matchups.findIndex(
        (m) => m.matchId === action.matchup.matchId
      );
      if (matchIndex >= 0) {
        matchups[matchIndex] = action.matchup;
      } else {
        matchups.push(action.matchup);
      }
      return {
        ...state,
        currentMatchups: matchups,
      };
    }

    case "SET_TIMER":
      return {
        ...state,
        timerEndTime: action.endTime,
      };

    case "UPDATE_LEADERBOARD":
      return {
        ...state,
        leaderboard: action.leaderboard,
      };

    case "SYNC_STATE": {
      const newState = { ...state };

      if (action.state.contestants !== undefined) {
        if (action.state.contestants instanceof Map) {
          newState.contestants = action.state.contestants;
        } else if (Array.isArray(action.state.contestants)) {
          const contestantsMap = new Map<ParticipantId, Contestant>();
          (action.state.contestants as any[]).forEach((c: any) => {
            if (c && c.participantId) {
              contestantsMap.set(c.participantId, c);
            }
          });
          newState.contestants = contestantsMap;
        }
      }

      const stateKeys = Object.keys(
        action.state
      ) as (keyof typeof action.state)[];
      stateKeys.forEach((key) => {
        if (key !== "contestants" && action.state[key] !== undefined) {
          (newState as any)[key] = action.state[key];
        }
      });

      if (!(newState.contestants instanceof Map)) {
        newState.contestants = new Map();
      }
      if (!(newState.judges instanceof Set)) {
        newState.judges = new Set();
      }
      if (!(newState.eliminated instanceof Set)) {
        newState.eliminated = new Set();
      }
      if (!(newState.advanced instanceof Set)) {
        newState.advanced = new Set();
      }
      if (!(newState.votes instanceof Map)) {
        newState.votes = new Map();
      }

      return newState;
    }

    default:
      return state;
  }
}

// ============================================
// Timer Hook
// ============================================

function useContestTimer(events: EventEmitter) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(
    (duration: number) => {
      setTimeRemaining(duration);
      setIsRunning(true);
      events.emit("timer:start", { duration });
    },
    [events]
  );

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    events.emit("timer:pause", {});
  }, [events]);

  const resumeTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
      events.emit("timer:resume", {});
    }
  }, [timeRemaining, events]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            events.emit("timer:end", {});
            return 0;
          }
          events.emit("timer:tick", { remaining: prev - 1 });
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
  }, [isRunning, timeRemaining, events]);

  return {
    timeRemaining,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}

// ============================================
// Scoring Calculator with Proper Vote Differentiation
// ============================================

interface ScoreCalculationOptions {
  round?: number; // Calculate for specific round only
  currentRound?: number; // The current round (for aggregation decisions)
}

function calculateScore(
  votes: Vote[],
  strategy: ScoringStrategy,
  plugins: ContestPlugin[],
  options?: ScoreCalculationOptions
): number {
  // Let plugins override if they want
  for (const plugin of plugins) {
    if (plugin.calculateScore) {
      const customScore = plugin.calculateScore(votes, null as any);
      if (customScore !== undefined) return customScore;
    }
  }

  if (votes.length === 0) return 0;

  // FIXED: Don't filter by specific round unless explicitly requested
  // This ensures all votes are counted for turn-based contests
  const relevantVotes = options?.round
    ? votes.filter((v) => v.round === options.round)
    : votes;

  if (relevantVotes.length === 0) return 0;

  // Get aggregation settings
  const aggregation = strategy.aggregation || {
    rounds: "latest", // Keep default as "latest" for backward compatibility
    categories: "average",
  };

  // Group votes by round
  const votesByRound = new Map<number, Vote[]>();
  relevantVotes.forEach((vote) => {
    const roundVotes = votesByRound.get(vote.round) || [];
    roundVotes.push(vote);
    votesByRound.set(vote.round, roundVotes);
  });

  // Calculate score for each round
  const roundScores = new Map<number, number>();

  votesByRound.forEach((roundVotes, round) => {
    // Group by category within the round
    const votesByCategory = new Map<string, Vote[]>();
    const votersByCategory = new Map<string, Set<ParticipantId>>();

    roundVotes.forEach((vote) => {
      const category = vote.category || "general";
      const categoryVotes = votesByCategory.get(category) || [];
      categoryVotes.push(vote);
      votesByCategory.set(category, categoryVotes);

      // Track unique voters per category
      const voters = votersByCategory.get(category) || new Set();
      voters.add(vote.voterId);
      votersByCategory.set(category, voters);
    });

    // Calculate score for each category
    const categoryScores: number[] = [];

    votesByCategory.forEach((categoryVotes, category) => {
      let scores = categoryVotes.map((v) => v.score);

      // Apply drop rules
      if (strategy.dropLowest && scores.length > 1) {
        scores.sort((a, b) => a - b);
        scores = scores.slice(1);
      }
      if (strategy.dropHighest && scores.length > 1) {
        scores.sort((a, b) => b - a);
        scores = scores.slice(1);
      }

      // Calculate category score based on strategy type
      let categoryScore = 0;
      switch (strategy.type) {
        case "cumulative":
          categoryScore = scores.reduce((sum, s) => sum + s, 0);
          break;

        case "average":
          categoryScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          break;

        case "weighted":
          if (strategy.weightings) {
            categoryScore =
              categoryVotes.reduce((sum, vote) => {
                const weight = strategy.weightings!.get(vote.voterId) || 1;
                return sum + vote.score * weight;
              }, 0) / categoryVotes.length;
          } else {
            categoryScore =
              scores.reduce((sum, s) => sum + s, 0) / scores.length;
          }
          break;

        default:
          categoryScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      // Apply category weight if specified
      if (strategy.categoryWeights && strategy.categoryWeights.has(category)) {
        categoryScore *= strategy.categoryWeights.get(category)!;
      }

      categoryScores.push(categoryScore);
    });

    // Aggregate category scores for this round
    let roundScore = 0;
    switch (aggregation.categories) {
      case "sum":
        roundScore = categoryScores.reduce((sum, s) => sum + s, 0);
        break;

      case "weighted":
        // Already handled in category calculation if weights are provided
        roundScore = categoryScores.reduce((sum, s) => sum + s, 0);
        break;

      case "average":
      default:
        roundScore =
          categoryScores.length > 0
            ? categoryScores.reduce((sum, s) => sum + s, 0) /
              categoryScores.length
            : 0;
        break;
    }

    roundScores.set(round, roundScore);
  });

  // Aggregate across rounds
  const scores = Array.from(roundScores.values());
  const rounds = Array.from(roundScores.keys()).sort((a, b) => a - b);

  if (scores.length === 0) return 0;

  switch (aggregation.rounds) {
    case "sum":
      return scores.reduce((sum, s) => sum + s, 0);

    case "average":
      return scores.reduce((sum, s) => sum + s, 0) / scores.length;

    case "weighted": {
      // Give more weight to later rounds
      let weightedSum = 0;
      let weightSum = 0;
      rounds.forEach((round, index) => {
        const weight = index + 1; // Later rounds have higher weight
        weightedSum += roundScores.get(round)! * weight;
        weightSum += weight;
      });
      return weightSum > 0 ? weightedSum / weightSum : 0;
    }
    case "latest":
    default: {
      // Return the score from the most recent round
      const latestRound = Math.max(...rounds);
      return roundScores.get(latestRound) || 0;
    }
  }
}

function calculateVoteStatistics(
  votes: Vote[],
  options?: {
    round?: number;
    category?: string;
    uniqueVoters?: boolean;
  }
): {
  count: number;
  uniqueVoters: number;
  averageScore: number;
  votesByRound: Map<number, number>;
  votesByCategory: Map<string, number>;
} {
  let filteredVotes = votes;

  if (options?.round !== undefined) {
    filteredVotes = filteredVotes.filter((v) => v.round === options.round);
  }

  if (options?.category) {
    filteredVotes = filteredVotes.filter(
      (v) => v.category === options.category
    );
  }

  const uniqueVoters = new Set(filteredVotes.map((v) => v.voterId));
  const votesByRound = new Map<number, number>();
  const votesByCategory = new Map<string, number>();

  filteredVotes.forEach((vote) => {
    votesByRound.set(vote.round, (votesByRound.get(vote.round) || 0) + 1);
    const category = vote.category || "general";
    votesByCategory.set(category, (votesByCategory.get(category) || 0) + 1);
  });

  const averageScore =
    filteredVotes.length > 0
      ? filteredVotes.reduce((sum, v) => sum + v.score, 0) /
        filteredVotes.length
      : 0;

  return {
    count: options?.uniqueVoters ? uniqueVoters.size : filteredVotes.length,
    uniqueVoters: uniqueVoters.size,
    averageScore,
    votesByRound,
    votesByCategory,
  };
}

// ============================================
// Plugin Manager
// ============================================

type PluginHookFunction = (...args: any[]) => any | Promise<any>;

class PluginManager {
  private plugins: ContestPlugin[] = [];
  private context: ContestContext | null = null;

  setContext(context: ContestContext) {
    this.context = context;
  }

  async register(plugin: ContestPlugin) {
    this.plugins.push(plugin);
    if (plugin.onInitialize && this.context) {
      await plugin.onInitialize(this.context);
    }
  }

  async unregister(pluginName: string) {
    const index = this.plugins.findIndex((p) => p.name === pluginName);
    if (index >= 0) {
      const plugin = this.plugins[index];
      if (plugin.onDestroy) {
        await plugin.onDestroy();
      }
      this.plugins.splice(index, 1);
    }
  }

  async executeHook(
    hookName: keyof ContestPlugin,
    ...args: any[]
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin[hookName] as PluginHookFunction | undefined;
      if (typeof hook === "function") {
        try {
          await hook.apply(plugin, args);
        } catch (error) {
          console.error(
            `Error in plugin ${plugin.name} hook ${String(hookName)}:`,
            error
          );
        }
      }
    }
  }

  async executeHookWithResult<R>(
    hookName: keyof ContestPlugin,
    defaultResult: R,
    ...args: any[]
  ): Promise<R> {
    let result = defaultResult;

    for (const plugin of this.plugins) {
      const hook = plugin[hookName] as PluginHookFunction | undefined;
      if (typeof hook === "function") {
        try {
          const pluginResult = await hook.apply(plugin, args);
          if (pluginResult !== undefined && pluginResult !== null) {
            result = pluginResult;
          }
        } catch (error) {
          console.error(
            `Error in plugin ${plugin.name} hook ${String(hookName)}:`,
            error
          );
        }
      }
    }

    return result;
  }

  getPlugins(): ContestPlugin[] {
    return [...this.plugins];
  }
}

// ============================================
// Main Contest Hook
// ============================================

export interface UseContestOptions {
  plugins?: ContestPlugin[];
  persistence?: {
    save: (state: ContestState) => void;
    load: () => ContestState | null;
  };
}

export function useContest(
  config: BaseContestConfig,
  options: UseContestOptions = {}
) {
  const { websocket, isConnected } = useTenantContext();
  const {
    roomName,
    identity,
    streamMetadata,
    participants,
    userType: currentUserType,
  } = useStreamContext();

  const selectedContestantsRef = useRef<any[]>([]);
  const hasRequestedStateRef = useRef(false);
  const lastSyncedStateRef = useRef<any>(null);
  const hasReceivedContestantsFromServer = useRef(false);

  const initialState: ContestState = {
    contestId: (config.contestId || `contest-${Date.now()}`) as any,
    status: "idle",
    currentRound: 0,
    contestants: new Map(),
    spectators: new Set(),
    judges: new Set(),
    eliminated: new Set(),
    advanced: new Set(),
    votes: new Map(),
    rounds: [],
    leaderboard: [],
  };

  const [state, dispatch] = useReducer(contestReducer, initialState);
  const [votingTimeRemaining, setVotingTimeRemaining] = useState(0);
  const events = useRef(new EventEmitter());
  const pluginManager = useRef(new PluginManager());
  const timer = useContestTimer(events.current);

  const isHost = useMemo(() => {
    const currentUserWallet = identity
      ? participants.find((p) => p.id === identity)?.walletAddress
      : null;

    return (
      currentUserWallet === streamMetadata.creatorWallet ||
      currentUserType === "host"
      // || currentUserType === "co-host"
    );
  }, [identity, participants, streamMetadata.creatorWallet, currentUserType]);

  const isEliminated = useMemo(() => {
    if (!identity) return false;
    const contestant = state.contestants.get(identity as ParticipantId);
    return contestant?.isEliminated || false;
  }, [state.contestants, identity]);

  const canVote = useMemo(() => {
    if (state.status !== "voting" && state.status !== "turn-voting")
      return false;

    const votingPermissions = config.rules?.votingPermissions || "all";

    switch (votingPermissions) {
      case "judges":
        return state.judges.has(identity as ParticipantId);

      case "contestants": {
        const contestant = state.contestants.get(identity as ParticipantId);
        return contestant ? !contestant.isEliminated : false;
      }

      case "all":
        return !!identity;

      default:
        return false;
    }
  }, [
    config.rules?.votingPermissions,
    state.contestants,
    state.judges,
    identity,
    state.status,
  ]);

  const context: ContestContext = useMemo(
    () => ({
      state,
      config,
      actions: {
        updateScore: (participantId: ParticipantId, score: number) => {
          dispatch({ type: "UPDATE_SCORE", participantId, score });
        },
        eliminate: (participantId: ParticipantId) => {
          dispatch({
            type: "ELIMINATE_CONTESTANTS",
            participantIds: [participantId],
          });
        },
        advance: (participantId: ParticipantId) => {
          dispatch({
            type: "ADVANCE_CONTESTANTS",
            participantIds: [participantId],
          });
        },
        pauseContest: () => {
          dispatch({ type: "PAUSE_CONTEST" });
        },
        resumeContest: () => {
          dispatch({ type: "RESUME_CONTEST" });
        },
        broadcast: (event: string, data: any) => {
          if (websocket && roomName) {
            websocket.sendMessage(event, { roomName, ...data });
          }
        },
      },
      utils: {
        getContestant: (id: ParticipantId) => state.contestants.get(id),
        getTeam: (id: TeamId) => state.teams?.get(id),
        calculateLeaderboard: () =>
          calculateLeaderboard(
            state,
            config.scoring,
            pluginManager.current.getPlugins()
          ),
        validateVote: (vote: Vote) => validateVote(vote, state, config),
      },
      events: events.current,
    }),
    [state, config, websocket, roomName]
  );

  useEffect(() => {
    pluginManager.current.setContext(context);
  }, [context]);

  useEffect(() => {
    const initPlugins = async () => {
      if (options.plugins) {
        for (const plugin of options.plugins) {
          await pluginManager.current.register(plugin);
        }
      }
    };
    initPlugins();

    return () => {
      pluginManager.current.getPlugins().forEach((plugin) => {
        if (plugin.onDestroy) {
          plugin.onDestroy();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!websocket || !roomName || !isConnected) return;

    const handleContestStart = async (data: {
      config: any;
      contestants?: any[];
    }) => {

      await pluginManager.current.executeHook("beforeContestStart", config);

      // Sync contestants from server broadcast
      if (
        data.contestants &&
        Array.isArray(data.contestants) &&
        data.contestants.length > 0
      ) {
        const contestantsMap = new Map<ParticipantId, Contestant>();
        data.contestants.forEach((c: any) => {
          if (c && c.participantId && c.name) {
            const fullParticipant = participants.find(
              (p) => p.id === c.participantId
            );

            const contestant: Contestant = {
              participantId: c.participantId as ParticipantId,
              name: c.name,
              walletAddress:
                c.walletAddress || fullParticipant?.walletAddress || "",
              avatarUrl: fullParticipant?.avatarUrl || "",
              userType: (fullParticipant?.userType || "contestant") as any,
              joinedAt: fullParticipant?.joinedAt
                ? new Date(fullParticipant.joinedAt).getTime()
                : Date.now(),
              score: c.score || 0,
              scores: new Map(),
              votes: c.votes || 0,
              penalties: 0,
              bonuses: 0,
              isEliminated: c.isEliminated || false,
              eliminatedRound: c.eliminatedRound,
              isActive: true,
              connectionStatus: "connected",
              performances: [],
              rank: 0,
            };
            contestantsMap.set(c.participantId as ParticipantId, contestant);
          }
        });

        hasReceivedContestantsFromServer.current = true;

        // Sync the contestants from server
        dispatch({
          type: "SYNC_STATE",
          state: { contestants: contestantsMap },
        });
      }

      dispatch({ type: "START_CONTEST" });

      events.current.emit("state:change", {
        from: "idle",
        to: "starting",
      });

      setTimeout(async () => {
        dispatch({ type: "START_ROUND", round: 1 });
        await pluginManager.current.executeHook("afterContestStart", state);
        events.current.emit("state:change", {
          from: "starting",
          to: "active",
        });
      }, 1000);
    };

    const handleContestEnd = async (data: { results: ContestResults }) => {
      await pluginManager.current.executeHook("beforeContestEnd", state);
      timer.resetTimer();
      dispatch({ type: "END_CONTEST" });
      setVotingTimeRemaining(0);

      hasReceivedContestantsFromServer.current = false;

      await pluginManager.current.executeHook("afterContestEnd", data.results);
      events.current.emit("state:change", { from: state.status, to: "ended" });
    };

    const handleRoundStart = async (data: {
      round: number;
      duration: number;
    }) => {
      await pluginManager.current.executeHook(
        "beforeRoundStart",
        data.round,
        state
      );
      dispatch({ type: "START_ROUND", round: data.round });

      if (config.features.timer) {
        timer.startTimer(data.duration);
        dispatch({
          type: "SET_TIMER",
          endTime: Date.now() + data.duration * 1000,
        });
      }

      await pluginManager.current.executeHook(
        "afterRoundStart",
        data.round,
        state
      );
      events.current.emit("round:start", { round: data.round });
    };

    const handleRoundEnd = async (data: {
      round: number;
      eliminated: string[];
    }) => {
      await pluginManager.current.executeHook(
        "beforeRoundEnd",
        data.round,
        state
      );

      dispatch({
        type: "ELIMINATE_CONTESTANTS",
        participantIds: data.eliminated as ParticipantId[],
      });

      const roundResult: RoundResult = {
        round: data.round,
        startedAt: Date.now() - (config.rules?.maxDuration || 300) * 1000,
        endedAt: Date.now(),
        eliminated: data.eliminated as ParticipantId[],
        advanced: [],
        leaderboard: calculateLeaderboard(
          state,
          config.scoring,
          pluginManager.current.getPlugins()
        ),
      };

      dispatch({ type: "END_ROUND", result: roundResult });
      await pluginManager.current.executeHook(
        "afterRoundEnd",
        data.round,
        roundResult
      );
      events.current.emit("round:end", {
        round: data.round,
        result: roundResult,
      });
    };

    const handleVoteSubmitted = async (data: Vote) => {
      const processedVote = await pluginManager.current.executeHookWithResult(
        "beforeVote",
        data,
        data,
        state
      );

      if (processedVote) {
        dispatch({ type: "SUBMIT_VOTE", vote: processedVote });
        await pluginManager.current.executeHook(
          "afterVote",
          processedVote,
          state
        );
        events.current.emit("vote:received", { vote: processedVote });
      }
    };

    const handleContestantUpdate = (data: {
      participantId: string;
      score: number;
      votes: number;
    }) => {
      const contestant = state.contestants.get(
        data.participantId as ParticipantId
      );
      if (contestant) {
        contestant.votes = data.votes;

        dispatch({
          type: "UPDATE_SCORE",
          participantId: data.participantId as ParticipantId,
          score: data.score,
        });
      }

      events.current.emit("score:update", {
        participantId: data.participantId as ParticipantId,
        oldScore: contestant?.score || 0,
        newScore: data.score,
      });
    };

    const handleLeaderboardUpdate = (data: LeaderboardEntry[]) => {
      // console.log("Received leaderboard update:", data);
      dispatch({ type: "UPDATE_LEADERBOARD", leaderboard: data });
    };

    const handleVotingStart = (data: {
      duration: number;
      contestants?: any[];
    }) => {
      console.log(
        "Voting start - received contestants:",
        data.contestants?.length
      );

      // CRITICAL FIX: DO NOT sync contestants here either
      // Contestants are already in state, we're just changing voting status

      dispatch({ type: "START_VOTING" });
      timer.resetTimer();
      setVotingTimeRemaining(data.duration);

      events.current.emit("voting:start", {
        deadline: Date.now() + data.duration * 1000,
      });
      events.current.emit("state:change", { from: state.status, to: "voting" });
    };

    const handleVotingEnd = (data: { results: VotingResults }) => {
      setVotingTimeRemaining(0);
      events.current.emit("voting:end", { results: data.results });
    };

    const handleContestStateUpdate = (data: { state: any }) => {
      if (!data.state) return;

      const stateJson = JSON.stringify(data.state);
      if (lastSyncedStateRef.current === stateJson) {
        return;
      }
      lastSyncedStateRef.current = stateJson;

      const stateUpdate = { ...data.state };

      if (data.state.contestants && Array.isArray(data.state.contestants)) {
        const contestantsMap = new Map();
        data.state.contestants.forEach((contestant: any) => {
          if (contestant && contestant.participantId && contestant.name) {
            contestantsMap.set(contestant.participantId, contestant);
          }
        });

        if (contestantsMap.size > 0 || state.contestants.size === 0) {
          stateUpdate.contestants = contestantsMap;
        } else {
          delete stateUpdate.contestants;
        }
      }

      // CRITICAL: Never overwrite votes from state updates
      // Votes should only come from votesUpdate events
      delete stateUpdate.votes;

      dispatch({ type: "SYNC_STATE", state: stateUpdate });
    };

    const handleContestPaused = (data: { remainingTime: number }) => {
      dispatch({ type: "PAUSE_CONTEST" });
      timer.pauseTimer();
      // Store the remaining time when paused
      if (data.remainingTime > 0) {
        // You could store this for display while paused
        console.log(`Contest paused with ${data.remainingTime}ms remaining`);
      }
      setVotingTimeRemaining(0); // Stop voting timer if active
    };

    const handleContestResumed = (data: { timerEndTime: number }) => {
      dispatch({ type: "RESUME_CONTEST" });

      // Calculate remaining time and resume timer
      const remaining = Math.max(
        0,
        Math.floor((data.timerEndTime - Date.now()) / 1000)
      );
      timer.startTimer(remaining);

      dispatch({
        type: "SET_TIMER",
        endTime: data.timerEndTime,
      });
    };

    const handleJudgesUpdate = (data: { judges: string[] }) => {
      console.log("Received judges update:", data.judges);

      // Convert array to Set and update state
      const judgesSet = new Set(data.judges.map((id) => id as ParticipantId));
      dispatch({
        type: "SYNC_STATE",
        state: { judges: judgesSet },
      });
    };

    const handleTurnVotingStart = (data: {
      performerId: string;
      performerName?: string;
      duration: number;
      contestants?: any[];
    }) => {
      // console.log("Turn voting started in useContest:", data);

      // Update state to turn-voting
      dispatch({ type: "START_TURN_VOTING" });

      timer.resetTimer();
      setVotingTimeRemaining(data.duration);

      events.current.emit("voting:start", {
        deadline: Date.now() + data.duration * 1000,
      });
    };
    const handleTurnVotingEnd = (data: any) => {
      console.log("Turn voting ended in useContest:", data);

      // Return to active status
      dispatch({ type: "START_ROUND", round: state.currentRound });
      setVotingTimeRemaining(0);

      events.current.emit("voting:end", { results: {} as VotingResults });
    };

    const handleVotesUpdate = (data: {
      votes: Array<{ targetId: string; votes: Vote[] }>;
    }) => {
      // Convert the votes array back to a Map and dispatch to state
      const votesMap = new Map<ParticipantId, Vote[]>();
      data.votes.forEach(({ targetId, votes }) => {
        votesMap.set(targetId as ParticipantId, votes);
      });

      // Use SYNC_STATE to update votes
      dispatch({
        type: "SYNC_STATE",
        state: { votes: votesMap },
      });
    };

    websocket.addEventListener("contestStart", handleContestStart);
    websocket.addEventListener("contestEnd", handleContestEnd);
    websocket.addEventListener("roundStart", handleRoundStart);
    websocket.addEventListener("roundEnd", handleRoundEnd);
    websocket.addEventListener("voteSubmitted", handleVoteSubmitted);
    websocket.addEventListener("contestantUpdate", handleContestantUpdate);
    websocket.addEventListener("leaderboardUpdate", handleLeaderboardUpdate);
    websocket.addEventListener("votingStart", handleVotingStart);
    websocket.addEventListener("votingEnd", handleVotingEnd);
    websocket.addEventListener("contestStateUpdate", handleContestStateUpdate);
    websocket.addEventListener("contestPaused", handleContestPaused);
    websocket.addEventListener("contestResumed", handleContestResumed);
    websocket.addEventListener("judgesUpdate", handleJudgesUpdate);
    websocket.addEventListener("turnVotingStart", handleTurnVotingStart);
    websocket.addEventListener("turnVotingEnd", handleTurnVotingEnd);
    websocket.addEventListener("votesUpdate", handleVotesUpdate);

    if (isConnected && identity && !hasRequestedStateRef.current) {
      hasRequestedStateRef.current = true;
      websocket.sendMessage("getContestState", { roomName });
    }

    return () => {
      websocket.removeEventListener("contestStart", handleContestStart);
      websocket.removeEventListener("contestEnd", handleContestEnd);
      websocket.removeEventListener("roundStart", handleRoundStart);
      websocket.removeEventListener("roundEnd", handleRoundEnd);
      websocket.removeEventListener("voteSubmitted", handleVoteSubmitted);
      websocket.removeEventListener("contestantUpdate", handleContestantUpdate);
      websocket.removeEventListener(
        "leaderboardUpdate",
        handleLeaderboardUpdate
      );
      websocket.removeEventListener("votingStart", handleVotingStart);
      websocket.removeEventListener("votingEnd", handleVotingEnd);
      websocket.removeEventListener(
        "contestStateUpdate",
        handleContestStateUpdate
      );
      websocket.removeEventListener("contestPaused", handleContestPaused);
      websocket.removeEventListener("contestResumed", handleContestResumed);
      websocket.removeEventListener("judgesUpdate", handleJudgesUpdate);
      websocket.removeEventListener("turnVotingStart", handleTurnVotingStart);
      websocket.removeEventListener("turnVotingEnd", handleTurnVotingEnd);
      websocket.addEventListener("votesUpdate", handleVotesUpdate);
    };
  }, [websocket, roomName, identity, config, isConnected, timer, participants]);

  // Voting countdown timer
  useEffect(() => {
    if (votingTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setVotingTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0) {
          events.current.emit("voting:end", { results: {} as VotingResults });
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [votingTimeRemaining]);

  const startContest = useCallback(
    async (selectedParticipants?: any[]) => {
      if (!isHost) {
        throw new Error("Only hosts can start contests");
      }

      if (!websocket || !roomName || !isConnected) {
        throw new Error("WebSocket not connected");
      }

      let contestantsToSend = [];

      if (selectedParticipants && selectedParticipants.length > 0) {
        selectedContestantsRef.current = selectedParticipants;

        const contestantsMap = new Map();
        contestantsToSend = selectedParticipants.map((participant) => {
          const contestant: Contestant = {
            participantId: participant.id as ParticipantId,
            name: participant.userName || participant.name || participant.id,
            walletAddress: participant.walletAddress || "",
            avatarUrl: participant.avatarUrl,
            userType: participant.userType || ("contestant" as any),
            joinedAt: Date.now(),
            score: 0,
            scores: new Map(),
            votes: 0,
            penalties: 0,
            bonuses: 0,
            isEliminated: false,
            isActive: true,
            connectionStatus: "connected",
            performances: [],
            rank: 0,
          };
          contestantsMap.set(participant.id as ParticipantId, contestant);
          return contestant;
        });

        dispatch({
          type: "SYNC_STATE",
          state: { contestants: contestantsMap },
        });
      } else {
        contestantsToSend = Array.from(state.contestants.values());
      }

      const contestantCount = contestantsToSend.length;

      if (
        config.rules?.minContestants &&
        contestantCount < config.rules.minContestants
      ) {
        throw new Error(
          `Minimum ${config.rules.minContestants} contestants required`
        );
      }

      const success = websocket.sendMessage("startContest", {
        roomName,
        config,
        contestants: contestantsToSend,
      });

      if (!success) {
        throw new Error("Failed to start contest");
      }
    },
    [isHost, websocket, roomName, config, state.contestants, isConnected]
  );
  const endContest = useCallback(
    async (force: boolean = false) => {
      if (!isHost) {
        throw new Error("Only hosts can end contests");
      }

      if (!websocket || !roomName || !isConnected) {
        throw new Error("WebSocket not connected");
      }

      const hasContestants =
        state.contestants.size > 0 || selectedContestantsRef.current.length > 0;
      if (
        !force &&
        config.features.voting &&
        state.status === "active" &&
        hasContestants
      ) {
        const success = websocket.sendMessage("startVoting", {
          roomName,
          duration: config.rules?.votingDuration || 60,
        });
        if (!success) {
          throw new Error("Failed to start voting phase");
        }
        return;
      }

      // Actually end the contest
      await pluginManager.current.executeHook("beforeContestEnd", state);
      timer.resetTimer();
      dispatch({ type: "END_CONTEST" });

      const success = websocket.sendMessage("endContest", { roomName });
      if (!success) {
        throw new Error("Failed to end contest");
      }

      events.current.emit("state:change", { from: state.status, to: "ended" });
    },
    [isHost, websocket, roomName, state, config, isConnected, timer]
  );
  const submitVote = useCallback(
    async (targetId: string, score: number, category?: string) => {
      console.log("Submitting vote for", targetId, "with score", score);
      if (!canVote) {
        throw new Error("You cannot vote");
      }

      if (!websocket || !roomName || !identity || !isConnected) {
        throw new Error("WebSocket not connected");
      }

      const voter = participants.find((p) => p.id === identity);
      if (!voter) {
        throw new Error("Voter not found");
      }

      const vote: Vote = {
        voterId: identity as ParticipantId,
        voterWallet: voter.walletAddress,
        targetId: targetId as ParticipantId,
        score,
        timestamp: Date.now(),
        round: state.currentRound,
        category,
      };

      const processedVote = await pluginManager.current.executeHookWithResult(
        "beforeVote",
        vote,
        vote,
        state
      );

      if (!processedVote) {
        throw new Error("Vote rejected by plugin");
      }

      const success = websocket.sendMessage("submitVote", {
        roomName,
        ...processedVote,
      });

      if (!success) {
        throw new Error("Failed to submit vote");
      }
    },
    [canVote, websocket, roomName, identity, state, participants, isConnected]
  );

  const eliminateContestant = useCallback(
    async (participantId: string) => {
      if (!isHost) {
        throw new Error("Only hosts can eliminate contestants");
      }

      if (!websocket || !roomName || !isConnected) {
        throw new Error("WebSocket not connected");
      }

      const canEliminate = await pluginManager.current.executeHookWithResult(
        "beforeElimination",
        true,
        participantId as ParticipantId
      );

      if (!canEliminate) {
        throw new Error("Elimination blocked by plugin");
      }

      const success = websocket.sendMessage("eliminateContestant", {
        roomName,
        participantId,
      });
      if (!success) {
        throw new Error("Failed to eliminate contestant");
      }

      await pluginManager.current.executeHook(
        "afterElimination",
        participantId as ParticipantId
      );
    },
    [isHost, websocket, roomName, isConnected]
  );

  const nextRound = useCallback(async () => {
    if (!isHost) {
      throw new Error("Only hosts can advance rounds");
    }

    if (!websocket || !roomName || !isConnected) {
      throw new Error("WebSocket not connected");
    }

    const success = websocket.sendMessage("nextRound", { roomName });
    if (!success) {
      throw new Error("Failed to advance to next round");
    }
  }, [isHost, websocket, roomName, isConnected]);

  const pauseContest = useCallback(() => {
    if (!isHost) {
      throw new Error("Only hosts can pause contests");
    }

    dispatch({ type: "PAUSE_CONTEST" });
    timer.pauseTimer();

    if (websocket && roomName) {
      websocket.sendMessage("pauseContest", { roomName });
    }
  }, [isHost, websocket, roomName, timer]);

  const resumeContest = useCallback(() => {
    if (!isHost) {
      throw new Error("Only hosts can resume contests");
    }

    dispatch({ type: "RESUME_CONTEST" });
    timer.resumeTimer();

    if (websocket && roomName) {
      websocket.sendMessage("resumeContest", { roomName });
    }
  }, [isHost, websocket, roomName, timer]);

  const getVoteCount = useCallback(
    (
      participantId: string,
      options?: {
        round?: number;
        category?: string;
        uniqueVoters?: boolean;
      }
    ) => {
      const votes = state.votes.get(participantId as ParticipantId) || [];
      const stats = calculateVoteStatistics(votes, options);
      return stats.count;
    },
    [state.votes]
  );

  const getVoteStatistics = useCallback(
    (
      participantId: string,
      options?: {
        round?: number;
        category?: string;
      }
    ) => {
      const votes = state.votes.get(participantId as ParticipantId) || [];
      return calculateVoteStatistics(votes, options);
    },
    [state.votes]
  );

  const currentLeaderboard = useMemo(() => {

    if (state.contestants.size === 0) {
      console.log("No contestants, returning empty leaderboard");
      return [];
    }

    const leaderboard = calculateLeaderboard(
      state,
      config.scoring,
      pluginManager.current.getPlugins()
    );

    return leaderboard;
  }, [state.contestants, state.votes, config.scoring, state.currentRound]);

  const getAverageScore = useCallback(
    (participantId: string, options?: { round?: number }) => {
      const participantVotes = state.votes.get(participantId as ParticipantId);
      if (!participantVotes || participantVotes.length === 0) return 0;

      return calculateScore(
        participantVotes,
        config.scoring,
        pluginManager.current.getPlugins(),
        {
          round: options?.round,
          currentRound: state.currentRound,
        }
      );
    },
    [state.votes, config.scoring, state.currentRound]
  );

  const getContestant = useCallback(
    (participantId: string) => {
      return state.contestants.get(participantId as ParticipantId);
    },
    [state.contestants]
  );

  const getTeam = useCallback(
    (teamId: string) => {
      return state.teams?.get(teamId as TeamId);
    },
    [state.teams]
  );

  const setJudges = useCallback(
    (judgeIds: string[]) => {
      if (!isHost) {
        throw new Error("Only hosts can set judges");
      }

      const judgesSet = new Set(judgeIds.map((id) => id as ParticipantId));
      dispatch({
        type: "SYNC_STATE",
        state: { judges: judgesSet },
      });

      if (websocket && roomName) {
        websocket.sendMessage("setJudges", { roomName, judges: judgeIds });
      }
    },
    [isHost, websocket, roomName]
  );

  const addJudge = useCallback(
    (participantId: string) => {
      if (!isHost) {
        throw new Error("Only hosts can add judges");
      }

      const newJudges = new Set(state.judges);
      newJudges.add(participantId as ParticipantId);

      dispatch({
        type: "SYNC_STATE",
        state: { judges: newJudges },
      });

      if (websocket && roomName) {
        websocket.sendMessage("setJudges", {
          roomName,
          judges: Array.from(newJudges),
        });
      }
    },
    [isHost, websocket, roomName, state.judges]
  );

  const removeJudge = useCallback(
    (participantId: string) => {
      if (!isHost) {
        throw new Error("Only hosts can remove judges");
      }

      const newJudges = new Set(state.judges);
      newJudges.delete(participantId as ParticipantId);

      dispatch({
        type: "SYNC_STATE",
        state: { judges: newJudges },
      });

      if (websocket && roomName) {
        websocket.sendMessage("setJudges", {
          roomName,
          judges: Array.from(newJudges),
        });
      }
    },
    [isHost, websocket, roomName, state.judges]
  );

  useEffect(() => {
    if (options.persistence?.save) {
      options.persistence.save(state);
    }
  }, [state, options.persistence]);

  return {
    state,
    contestState: state.status,
    currentRound: state.currentRound,
    timeRemaining: timer.timeRemaining,
    contestants:
      state.contestants instanceof Map
        ? Array.from(state.contestants.values())
        : [],
    teams: state.teams instanceof Map ? Array.from(state.teams.values()) : [],
    eliminated:
      state.eliminated instanceof Set ? Array.from(state.eliminated) : [],
    advanced: state.advanced instanceof Set ? Array.from(state.advanced) : [],
    leaderboard: currentLeaderboard,
    votes: state.votes,
    votingTimeRemaining,
    roundResults: state.rounds,
    currentMatchups: state.currentMatchups,
    bracket: state.bracket,
    judges: Array.from(state.judges),

    startContest,
    endContest,
    submitVote,
    eliminateContestant,
    nextRound,
    pauseContest,
    resumeContest,
    setJudges,
    addJudge,
    removeJudge,

    timer,

    getVoteCount,
    getVoteStatistics,
    getAverageScore,
    getContestant,
    getTeam,

    registerPlugin: (plugin: ContestPlugin) =>
      pluginManager.current.register(plugin),
    unregisterPlugin: (pluginName: string) =>
      pluginManager.current.unregister(pluginName),

    events: events.current,
    context,

    isHost,
    canStartContest: isHost && state.status === "idle",
    canVote,
    isEliminated,
    isConnected,
  };
}

// ============================================
// Helper Functions
// ============================================

function calculateLeaderboard(
  state: ContestState,
  scoring: ScoringStrategy,
  plugins: ContestPlugin[]
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  // FIXED: Include ALL contestants, not just non-eliminated ones
  // This allows turn-based contests to show everyone even before they perform
  const contestants = Array.from(state.contestants.values())
    .map((contestant) => {
      // Get all votes for this contestant
      const votes = state.votes.get(contestant.participantId) || [];

      // Calculate score from ALL votes (realtime, per-turn, final, etc.)
      const score = calculateScore(votes, scoring, plugins, {
        currentRound: state.currentRound,
      });

      let finalScore = score;
      for (const plugin of plugins) {
        if (plugin.modifyScore) {
          finalScore = plugin.modifyScore(finalScore, contestant);
        }
      }

      // Get unique voters across ALL votes
      const uniqueVoters = new Set(votes.map((v) => v.voterId));

      return {
        ...contestant,
        score: finalScore,
        votes: uniqueVoters.size, // Use unique voter count
      };
    })
    .sort((a, b) => {
      // Sort by score first
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then by vote count
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  // FIXED: Show ALL contestants, even those with 0 scores
  // Mark eliminated ones but still include them in leaderboard
  contestants.forEach((contestant, index) => {
    entries.push({
      participantId: contestant.participantId,
      name: contestant.name,
      score: contestant.score,
      votes: contestant.votes,
      rank: index + 1,
      change: contestant.previousRank
        ? contestant.previousRank - (index + 1)
        : 0,
      isEliminated: contestant.isEliminated || false,
      performances: contestant.performances,
    });
  });

  return entries;
}

function validateVote(
  vote: Vote,
  state: ContestState,
  config: BaseContestConfig
): boolean {
  if (!config.features.voting) return false;

  if (state.status !== "voting" && state.status !== "active") return false;

  const votingPermissions = config.rules?.votingPermissions || "all";

  switch (votingPermissions) {
    case "judges":
      if (!state.judges.has(vote.voterId)) return false;
      break;

    case "contestants": {
      const voter = state.contestants.get(vote.voterId);
      if (!voter || voter.isEliminated) return false;
      break;
    }

    case "all":
      break;
  }

  if (!config.rules?.selfVoting && vote.voterId === vote.targetId) {
    return false;
  }

  const target = state.contestants.get(vote.targetId);
  if (!target || target.isEliminated) return false;

  const { min, max } = config.scoring.scoreRange;
  if (vote.score < min || vote.score > max) return false;

  return true;
}