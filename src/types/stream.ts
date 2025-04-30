import { TrackReference } from "@livekit/components-react";

import { LocalParticipant, RemoteParticipant } from "livekit-client";

// Most of these types will change based on the new schema type. e.g there is no AgendaDetails model anymore
export type StreamScheduleType = "instant" | "scheduled";

export type UserType = "host" | "guest" | "temp-host" | "co-host";

export type CallType = "video" | "audio";

export enum StreamSessionType {
  Livestream = "Livestream",
  Meeting = "Meeting",
  Podcast = "Podcast",
}

export enum StreamFundingType {
  Live = "Live",
  Prepaid = "Prepaid",
  Conditional = "Conditional",
}

export enum AgendaAction {
  Poll = "Poll",
  Transaction = "Transaction",
  Giveaway = "Giveaway",
  Q_A = "Q_A", // DB value
  Custom = "Custom",
  Quiz = "Quiz",
}

// User-friendly display names for AgendaAction
export const AgendaActionDisplay = {
  [AgendaAction.Poll]: "Poll",
  [AgendaAction.Transaction]: "Transaction",
  [AgendaAction.Giveaway]: "Giveaway",
  [AgendaAction.Q_A]: "Q&A", // User-friendly display
  [AgendaAction.Custom]: "Custom",
  [AgendaAction.Quiz]: "Quiz",
};

// Type definitions for different agenda item types
export interface BaseAgendaItem {
  timeStamp: number;
  action: AgendaAction;
  title?: string;
  description?: string;
}

export interface PollAgendaItem extends BaseAgendaItem {
  action: AgendaAction.Poll;
  title: string;
  options: string[];
}

export type QuizQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  isMultiChoice?: boolean;
  points?: number;
}

export interface QuizAgendaItem extends BaseAgendaItem {
  action: AgendaAction.Quiz;
  title: string;
  questions: QuizQuestion[];
}

export interface AssetTransferAgendaItem extends BaseAgendaItem {
  action: AgendaAction.Transaction | AgendaAction.Giveaway;
  assetType: string;
}

export interface QAAgendaItem extends BaseAgendaItem {
  action: AgendaAction.Q_A;
  title: string;
  topic?: string;
}

export interface CustomAgendaItem extends BaseAgendaItem {
  action: AgendaAction.Custom;
  title: string;
  customData?: Record<string, unknown>;
}

// Union type for all agenda item types
export type AgendaItem =
  | PollAgendaItem
  | QuizAgendaItem
  | AssetTransferAgendaItem
  | QAAgendaItem
  | CustomAgendaItem;

type PollContent = {
  id: string;
  options: string[];
  totalVotes: number;
}

type QuizContent = {
  id: string;
  questions: {
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    isMultiChoice: boolean;
    points: number;
  }[];
}

type AssetTransferContent = {
  id: string;
  assetType: string;
  transferType: string;
}

type QAContent ={
  id: string;
  topic: string | null;
}

type CustomContent = {
  id: string;
  customData: Record<string, unknown> | null;
}

// Response type
export type Agenda  = {
  id: string;
  streamId: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
  tenantId: string;
  pollContent?: PollContent;
  quizContent?: QuizContent;
  assetTransferContent?: AssetTransferContent;
  qaContent?: QAContent;
  customContent?: CustomContent;
}

export type Participant = {
  id: string;
  userName: string;
  walletAddress: string;
  leftAt?: string;
  joinedAt?: string;
  liveStreamId?: string;
  userType: UserType;
};

export type Recipient = {
  publicKey: string;
  amount: number;
};

export type GuestRequest = {
  participantId: string;
  name: string;
  walletAddress: string;
};

export type StreamMetadata = {
  title: string;
  callType: string;
  streamSessionType: string;
  creatorWallet: string;
  hasHost?: boolean;
  name?: string;
};

// Define participant metadata type
export type ParticipantMetadata = {
  userType?: UserType;
  userName?: string;
  avatarUrl?: string;
  [key: string]: unknown;
};

// Track type with participant info
export type ParticipantTrack = TrackReference & {
  participant?: LocalParticipant | RemoteParticipant;
};
