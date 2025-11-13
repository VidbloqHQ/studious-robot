/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// Core Types and Interfaces
// ============================================

// Brand types for better type safety
export type ParticipantId = string & { __brand: 'ParticipantId' };
export type ContestId = string & { __brand: 'ContestId' };
export type TeamId = string & { __brand: 'TeamId' };
export type MatchId = string & { __brand: 'MatchId' };

// Contest Types
export type ContestMode = 
  | 'elimination' 
  | 'tournament' 
  | 'bracket'
  | 'showcase' 
  | 'team'
  | 'points'
  | 'performance'
  | 'custom';

export type ContestStatus = 
  | 'idle' 
  | 'starting' 
  | 'active' 
  | 'voting' 
  | 'turn-voting'
  | 'break'
  | 'paused'
  | 'ended';

export type MediaRequirement = 'required' | 'optional' | 'disabled';

// ============================================
// Vote Aggregation System
// ============================================

export interface VoteAggregation {
  // How to aggregate scores across multiple rounds
  rounds: 'sum' | 'average' | 'weighted' | 'latest';
  
  // How to aggregate scores across multiple categories/criteria
  categories: 'sum' | 'average' | 'weighted';
}

// ============================================
// Scoring System
// ============================================

export interface ScoringStrategy {
  type: 'cumulative' | 'average' | 'weighted' | 'judges' | 'audience' | 'custom';
  scoreRange: { min: number; max: number };
  
  // Vote aggregation settings
  aggregation?: VoteAggregation;
  
  // Weightings for different voters (e.g., judges vs audience)
  weightings?: Map<string, number>;
  
  // Weightings for different categories/criteria
  categoryWeights?: Map<string, number>;
  
  // Custom scoring function
  customCalculator?: (votes: Vote[]) => number;
  
  // Minimum votes required for a valid score
  requireMinVotes?: number;
  
  // Statistical adjustments
  dropLowest?: boolean;
  dropHighest?: boolean;
}

export interface Vote {
  voterId: ParticipantId;
  voterWallet: string;
  targetId: ParticipantId;
  score: number;
  timestamp: number;
  round: number;
  category?: string; // For multi-category voting (e.g., "presentation", "content", "delivery")
  weight?: number;   // For weighted votes (e.g., judge votes count more)
}

// ============================================
// Contest Configuration
// ============================================

export interface BaseContestConfig {
  mode: ContestMode;
  contestId?: ContestId;
  name: string;
  description?: string;
  
  features: {
    timer?: boolean;
    voting?: boolean;
    elimination?: boolean;
    leaderboard?: boolean;
    screenShare?: MediaRequirement;
    camera?: MediaRequirement;
    teams?: boolean;
    brackets?: boolean;
    spectators?: boolean;
    appeals?: boolean;
  };
  
  rules?: {
    maxDuration?: number;
    votingDuration?: number;
    breakDuration?: number;
    eliminationThreshold?: number;
    roundsCount?: number;
    autoAdvanceRounds?: boolean;
    minContestants?: number;
    maxContestants?: number;
    teamSize?: number;
    matchupsPerRound?: number;
    allowLateJoin?: boolean;
    allowRejoin?: boolean;
    selfVoting?: boolean;
    votingPermissions?: 'all' | 'judges' | 'contestants';
  };
  
  scoring: ScoringStrategy;
  progression?: ProgressionStrategy;
  elimination?: EliminationStrategy;
}

// ============================================
// Progression Strategies
// ============================================

export interface ProgressionStrategy {
  type: 'linear' | 'bracket' | 'swiss' | 'round-robin' | 'custom';
  autoAdvance: boolean;
  
  // For bracket progression
  bracketType?: 'single-elimination' | 'double-elimination';
  seedingMethod?: 'random' | 'ranked' | 'manual';
  
  // For custom progression
  customProgression?: (state: ContestState) => NextRoundConfig;
}

export interface NextRoundConfig {
  matchups?: Matchup[];
  eliminated?: ParticipantId[];
  advanced?: ParticipantId[];
}

// ============================================
// Elimination Strategies
// ============================================

export interface EliminationStrategy {
  type: 'threshold' | 'bottom-n' | 'score-based' | 'vote-based' | 'none';
  threshold?: number; // Percentage or absolute number
  minScore?: number;
  safeZone?: number; // Top N contestants are safe
  customRule?: (contestants: Contestant[]) => ParticipantId[];
}

// ============================================
// Contest Participants
// ============================================

export interface Contestant {
  participantId: ParticipantId;
  name: string;
  walletAddress: string;
  avatarUrl?: string;
  userType: 'host' | 'co-host' | 'contestant' | 'guest' | 'spectator';
  joinedAt: number;
  
  // Scoring
  score: number;
  scores: Map<string, number>; // Category/round-specific scores
  votes: number; // Number of votes received
  penalties: number;
  bonuses: number;
  
  // Status
  isEliminated: boolean;
  eliminatedRound?: number;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Team info (if applicable)
  teamId?: TeamId;
  
  // Performance tracking
  performances: Performance[];
  rank: number;
  previousRank?: number;
}

export interface Team {
  teamId: TeamId;
  name: string;
  members: ParticipantId[];
  captain: ParticipantId;
  score: number;
  isEliminated: boolean;
}

export interface Performance {
  round: number;
  score: number;
  votes: number;
  categoryScores?: Map<string, number>; // Scores by category for this performance
  feedback?: string[];
  duration?: number;
  timestamp: number;
}

// ============================================
// Matchups and Brackets
// ============================================

export interface Matchup {
  matchId: MatchId;
  round: number;
  participants: ParticipantId[];
  winner?: ParticipantId;
  scores: Map<ParticipantId, number>;
  startTime?: number;
  endTime?: number;
  status: 'pending' | 'active' | 'completed';
  type: 'single' | 'group' | 'team';
}

export interface Bracket {
  rounds: BracketRound[];
  currentRound: number;
  type: 'single-elimination' | 'double-elimination';
  winnersBracket: Matchup[];
  losersBracket?: Matchup[];
}

export interface BracketRound {
  roundNumber: number;
  matchups: Matchup[];
  completedAt?: number;
}

// ============================================
// Contest State
// ============================================

export interface ContestState {
  contestId: ContestId;
  status: ContestStatus;
  currentRound: number;
  startedAt?: number;
  endedAt?: number;
  pausedAt?: number;
  
  // Participants
  contestants: Map<ParticipantId, Contestant>;
  teams?: Map<TeamId, Team>;
  spectators: Set<ParticipantId>;
  judges: Set<ParticipantId>;
  
  // Progress tracking
  eliminated: Set<ParticipantId>;
  advanced: Set<ParticipantId>;
  
  // Voting
  votes: Map<ParticipantId, Vote[]>;
  votingDeadline?: number;
  
  // Rounds and matchups
  rounds: RoundResult[];
  currentMatchups?: Matchup[];
  bracket?: Bracket;
  
  // Timing
  timerEndTime?: number;
  breakEndTime?: number;
  
  // Results
  leaderboard: LeaderboardEntry[];
  finalResults?: ContestResults;
}

// ============================================
// Results and Leaderboard
// ============================================

export interface LeaderboardEntry {
  participantId: ParticipantId;
  name: string;
  score: number;
  votes: number; // Now represents unique voters by default
  rank: number;
  change: number; // Position change from last round
  isEliminated: boolean;
  teamId?: TeamId;
  performances?: Performance[];
  
  // Additional statistics
  scoreByRound?: Map<number, number>;
  scoreByCategory?: Map<string, number>;
  votesByRound?: Map<number, number>;
}

export interface RoundResult {
  round: number;
  startedAt: number;
  endedAt: number;
  eliminated: ParticipantId[];
  advanced: ParticipantId[];
  leaderboard: LeaderboardEntry[];
  matchups?: Matchup[];
  votingSummary?: VotingResults;
}

export interface VotingResults {
  round: number;
  votes: Vote[];
  summary: Map<ParticipantId, {
    total: number;
    average: number;
    count: number;
    uniqueVoters: number;
    byCategory?: Map<string, {
      score: number;
      count: number;
      average: number;
    }>;
    byRound?: Map<number, {
      score: number;
      count: number;
      average: number;
    }>;
  }>;
}

export interface ContestResults {
  contestId: ContestId;
  winner: ParticipantId | TeamId | null;
  runners: (ParticipantId | TeamId)[];
  finalLeaderboard: LeaderboardEntry[];
  rounds: RoundResult[];
  totalVotes: number;
  uniqueVoters: number;
  duration: number;
  statistics: ContestStatistics;
}

export interface ContestStatistics {
  totalParticipants: number;
  totalVotes: number;
  uniqueVoters: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  mostVotedFor: ParticipantId;
  mostConsistentScorer: ParticipantId;
  biggestImprovement: ParticipantId;
  
  // New statistics for better insights
  scoresByRound: Map<number, {
    average: number;
    highest: number;
    lowest: number;
    participation: number; // % of eligible voters who voted
  }>;
  scoresByCategory: Map<string, {
    average: number;
    weight: number;
    voteCount: number;
  }>;
}

// ============================================
// Plugin System
// ============================================

export interface ContestPlugin {
  name: string;
  version: string;
  
  // Lifecycle hooks
  onInitialize?: (context: ContestContext) => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  
  // Contest flow hooks
  beforeContestStart?: (config: BaseContestConfig) => BaseContestConfig | Promise<BaseContestConfig>;
  afterContestStart?: (state: ContestState) => void | Promise<void>;
  beforeContestEnd?: (state: ContestState) => void | Promise<void>;
  afterContestEnd?: (results: ContestResults) => void | Promise<void>;
  
  // Round hooks
  beforeRoundStart?: (round: number, state: ContestState) => void | Promise<void>;
  afterRoundStart?: (round: number, state: ContestState) => void | Promise<void>;
  beforeRoundEnd?: (round: number, state: ContestState) => void | Promise<void>;
  afterRoundEnd?: (round: number, result: RoundResult) => void | Promise<void>;
  
  // Voting hooks
  beforeVote?: (vote: Vote, state: ContestState) => Vote | null | Promise<Vote | null>;
  afterVote?: (vote: Vote, state: ContestState) => void | Promise<void>;
  
  // Scoring hooks
  calculateScore?: (votes: Vote[], contestant: Contestant) => number;
  modifyScore?: (score: number, contestant: Contestant) => number;
  
  // Elimination hooks
  determineEliminations?: (contestants: Contestant[], round: number) => ParticipantId[];
  beforeElimination?: (participantId: ParticipantId) => boolean | Promise<boolean>;
  afterElimination?: (participantId: ParticipantId) => void | Promise<void>;
  
  // Matchup hooks (for tournament/bracket modes)
  generateMatchups?: (contestants: Contestant[], round: number) => Matchup[];
  beforeMatchup?: (matchup: Matchup) => void | Promise<void>;
  afterMatchup?: (matchup: Matchup, winner: ParticipantId) => void | Promise<void>;
  
  // Custom actions
  customActions?: Map<string, (data: any, state: ContestState) => void | Promise<void>>;
}

export interface ContestContext {
  state: ContestState;
  config: BaseContestConfig;
  
  // Actions
  actions: {
    updateScore: (participantId: ParticipantId, score: number) => void;
    eliminate: (participantId: ParticipantId) => void;
    advance: (participantId: ParticipantId) => void;
    pauseContest: () => void;
    resumeContest: () => void;
    broadcast: (event: string, data: any) => void;
  };
  
  // Utilities
  utils: {
    getContestant: (id: ParticipantId) => Contestant | undefined;
    getTeam: (id: TeamId) => Team | undefined;
    calculateLeaderboard: () => LeaderboardEntry[];
    validateVote: (vote: Vote) => boolean;
  };
  
  // Event emitter
  events: ContestEventEmitter;
}

// ============================================
// Event System
// ============================================

export type ContestEventMap = {
  // State changes
  'state:change': { from: ContestStatus; to: ContestStatus };
  'round:start': { round: number };
  'round:end': { round: number; result: RoundResult };
  
  // Participant events
  'participant:join': { participant: Contestant };
  'participant:leave': { participantId: ParticipantId };
  'participant:eliminated': { participantId: ParticipantId; round: number };
  'participant:advanced': { participantId: ParticipantId; round: number };
  
  // Scoring events
  'score:update': { participantId: ParticipantId; oldScore: number; newScore: number };
  'vote:received': { vote: Vote };
  'voting:start': { deadline: number };
  'voting:end': { results: VotingResults };
  
  // Match events
  'match:start': { matchup: Matchup };
  'match:end': { matchup: Matchup; winner: ParticipantId };
  
  // Timer events
  'timer:start': { duration: number };
  'timer:pause': Record<string, never>;
  'timer:resume': Record<string, never>;
  'timer:end': Record<string, never>;
  'timer:tick': { remaining: number };
  
  // Warning events
  'warning:elimination': { participantIds: ParticipantId[] };
  'warning:lowScore': { participantIds: ParticipantId[] };
  
  // Error events
  'error': { message: string; code: string };
};

export interface ContestEventEmitter {
  on<K extends keyof ContestEventMap>(event: K, handler: (data: ContestEventMap[K]) => void): void;
  off<K extends keyof ContestEventMap>(event: K, handler: (data: ContestEventMap[K]) => void): void;
  emit<K extends keyof ContestEventMap>(event: K, data: ContestEventMap[K]): void;
  once<K extends keyof ContestEventMap>(event: K, handler: (data: ContestEventMap[K]) => void): void;
}

// ============================================
// Action Types for Reducer
// ============================================

export type ContestAction =
  | { type: 'INIT_CONTEST'; config: BaseContestConfig }
  | { type: 'START_CONTEST' }
  | { type: 'END_CONTEST' }
  | { type: 'PAUSE_CONTEST' }
  | { type: 'RESUME_CONTEST' }
  | { type: 'START_ROUND'; round: number }
  | { type: 'END_ROUND'; result: RoundResult }
  | { type: 'ADD_CONTESTANT'; contestant: Contestant }
  | { type: 'REMOVE_CONTESTANT'; participantId: ParticipantId }
  | { type: 'UPDATE_SCORE'; participantId: ParticipantId; score: number; category?: string }
  | { type: 'SUBMIT_VOTE'; vote: Vote }
  | { type: 'ELIMINATE_CONTESTANTS'; participantIds: ParticipantId[] }
  | { type: 'ADVANCE_CONTESTANTS'; participantIds: ParticipantId[] }
  | { type: 'UPDATE_MATCHUP'; matchup: Matchup }
  | { type: 'SET_TIMER'; endTime: number }
  | { type: 'UPDATE_LEADERBOARD'; leaderboard: LeaderboardEntry[] }
  | { type: 'SYNC_STATE'; state: Partial<ContestState> };