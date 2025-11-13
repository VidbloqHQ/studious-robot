import { CallType, StreamFundingType, StreamSessionType, UserType, Agenda, AgendaAction } from "./stream";
import { Tenant } from "./tenant";

export interface TenantResponse {
  tenant: Tenant;
}

export interface TokenResponse {
  token: string;
  userType: UserType;
}

export interface StreamResponse {
  id: string;
  name: string;
  userId: string;
  title: string | null;
  callType: CallType;
  streamSessionType: StreamSessionType;
  scheduledFor: string | null;
  creatorWallet: string;
  hasHost: boolean;
  recording: boolean;
  recordId: string | null;
  recordLink: string | null;
  tenantId: string;
  isLive: boolean;
  startedAt: null;
  endedAt: null;
  isPublic: boolean;
  fundingType: StreamFundingType;
  agenda: Agenda[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  participants: any[];
}

export interface CreateStreamResponse {
  id: string;
  name: string;
  title?: string;
  callType: CallType;
  creatorWallet: string;
  streamSessionType: StreamSessionType;
  fundingType: StreamFundingType;
  isPublic: boolean;
  scheduledFor: string | null;
  tenantId: string;
  userId: string;
  hasHost?: boolean;
  recording?: boolean;
  recordId?: string;
  recordLink?: string;
  isLive?: boolean;
  startedAt?: string;
  endedAt?: string;
}

export interface RecordingStartResponse {
  message: string;
  recordingId: string;
  streamId: string;
}

export interface RecordingStopResponse {
  message: string;
  streamId: string;
  recordId: string;
  recordLink?: string;
}

export type StreamAgenda = {
  id: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
  duration: string | null;
  isCompleted: boolean;
  hasContent?: boolean;
  pollContent?: { id: string };
  quizContent?: { id: string };
  qaContent?: { id: string };
  customContent?: { id: string };
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StreamAgendaResponse = {
  agendas: StreamAgenda[];
  pagination: PaginationInfo;
};

// Response from createAgenda (simplified)
export type CreatedAgenda = {
  id: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
};

// Response from getAgendaById (simplified)
export type SimpleAgenda = {
  id: string;
  streamId: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
  duration: string | null;
  isCompleted: boolean;
};

// Response from updateStreamAgenda (full content)
export type UpdatedAgenda = {
  id: string;
  streamId: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
  duration: string | null;
  isCompleted: boolean;
  tenantId: string;
  pollContent?: {
    id: string;
    options: string[];
    totalVotes: number;
  };
  quizContent?: {
    id: string;
    questions: Array<{
      id: string;
      questionText: string;
      options: string[];
      correctAnswer: string;
      isMultiChoice: boolean;
      points: number;
    }>;
  };
  qaContent?: {
    id: string;
    topic: string | null;
  };
  customContent?: {
    id: string;
    customData: Record<string, unknown> | null;
  };
};

// Response from deleteAgenda
export type DeleteAgendaResponse = {
  message: string;
  deletedId: string;
  livestreamId: string;
};
