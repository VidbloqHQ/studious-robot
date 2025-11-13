/* eslint-disable @typescript-eslint/no-explicit-any */
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
  duration?: number;
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

// type PollContent = {
//   id: string;
//   options: string[];
//   totalVotes: number;
// }

// type QuizContent = {
//   id: string;
//   questions: {
//     id: string;
//     questionText: string;
//     options: string[];
//     correctAnswer: string;
//     isMultiChoice: boolean;
//     points: number;
//   }[];
// }

// type AssetTransferContent = {
//   id: string;
//   assetType: string;
//   transferType: string;
// }

// type QAContent ={
//   id: string;
//   topic: string | null;
// }

// type CustomContent = {
//   id: string;
//   customData: Record<string, unknown> | null;
// }

// Response type
// export type Agenda  = {
//   id: string;
//   streamId: string;
//   isCompleted: boolean;
//   timeStamp: number;
//   action: AgendaAction;
//   title: string | null;
//   description: string | null;
//   duration: string | null;
//   tenantId: string;
//   pollContent?: PollContent;
//   quizContent?: QuizContent;
//   assetTransferContent?: AssetTransferContent;
//   qaContent?: QAContent;
//   customContent?: CustomContent;
// }

export interface AgendaUpdate {
  wallet: string;
  isCompleted: boolean;
  title?: string;
  description?: string;
  duration?: number;
  timeStamp?: number;
  options?: string[];                 // For Poll agenda
  questions?: Array<{                 // For Quiz agenda
    questionText: string;
    options: string[];
    correctAnswer: string;
    isMultiChoice?: boolean;
    points?: number;
  }>;
  assetType?: string;                 // For Transaction/Giveaway agenda
  topic?: string;                     // For Q&A agenda
  customData?: Record<string, unknown>;   // For Custom agenda
}

export type Participant = {
  id: string;
  userName: string;
  walletAddress: string;
  leftAt?: string;
  joinedAt?: string;
  liveStreamId?: string;
  userType: UserType;
  avatarUrl?: string;
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
  streamId: string;
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

// Add to your existing types/index.ts

export interface RaisedHand {
  participantId: string;
  name: string;
  walletAddress: string;
  timestamp: number;
  userType: "host" | "co-host";
}

// WebSocket message types for raise hand feature
export interface RaiseHandMessage {
  event: "raiseHand";
  data: {
    roomName: string;
    participantId: string;
    name: string;
    walletAddress: string;
  };
}

export interface LowerHandMessage {
  event: "lowerHand";
  data: {
    roomName: string;
    participantId: string;
  };
}

export interface RaisedHandsUpdateMessage {
  event: "raisedHandsUpdate";
  data: RaisedHand[];
}

export type CustomAction = {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  check?: (state: CallControlsRenderProps) => boolean;
  disabled?: (state: CallControlsRenderProps) => boolean;
  handler: (state: CallControlsRenderProps) => void | Promise<void>;
  group?: 'primary' | 'secondary' | 'danger';
  position?: 'start' | 'end' | number;
};

export type BaseCallControlsProps = {
  // Feature flags
  features?: {
    media?: boolean;
    recording?: boolean;
    handRaise?: boolean;
    guestRequests?: boolean;
    screenShare?: boolean;
    disconnect?: boolean;
  };
  
  // Custom actions that can be injected
  customActions?: CustomAction[];
  
  // Event callbacks
  onStateChange?: (state: CallControlsState) => void;
  onRaiseHand?: () => void;
  onReturnToGuest?: () => void;
  onDisconnect?: () => void;
  onRecordToggle?: (isRecording: boolean) => void;
  onMicToggle?: (enabled: boolean) => void;
  onCameraToggle?: (enabled: boolean) => void;
  onScreenShareToggle?: (enabled: boolean) => void;
  onHandRaised?: () => void;
  onHandLowered?: () => void;
  beforeDisconnect?: () => Promise<boolean>;
  
  // Initial states
  initialStates?: {
    isMicEnabled?: boolean;
    isCameraEnabled?: boolean;
    isScreenSharingEnabled?: boolean;
    isRecording?: boolean;
  };
  
  // Plugin system
  plugins?: CallControlPlugin[];
  
  // Render function
  render: (props: CallControlsRenderProps) => React.ReactNode;
};

export interface CallControlPlugin {
  name: string;
  initialize?: (context: CallControlContext) => void;
  getState?: () => any;
  getHandlers?: () => Record<string, () => void>;
  cleanup?: () => void;
}

export type CallControlContext = {
  websocket: any | null;
  roomName: string;
  identity: string;
  userType: UserType;
  addNotification: (notification: any) => void;
};

export type CallControlsState = {
  isInvited: boolean;
  hasPendingRequest: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharingEnabled: boolean;
};

export type CallControlsRenderProps = {
  // States
  isInvited: boolean;
  hasPendingRequest: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  
  // Connection states
  isConnecting: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor';
  
  // Permissions
  canAccessMediaControls: boolean;
  canRaiseHand: boolean;
  canRecord: boolean;
  canScreenShare: boolean;
  canInviteGuests: boolean;
  permissions: {
    canToggleMic: boolean;
    canToggleCamera: boolean;
    canScreenShare: boolean;
    canRecord: boolean;
  };
  
  // User info
  userType: UserType;
  isGuest: boolean;
  identity: string;
  displayName: string;
  
  // Track states
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharingEnabled: boolean;
  
  // Actions - only provided if feature is enabled
  toggleMic?: () => void;
  toggleCamera?: () => void;
  toggleScreenShare?: () => void;
  toggleRecording?: () => void;
  requestToSpeak?: () => void;
  raiseHand?: () => void;
  lowerHand?: () => void;
  handleDisconnectClick?: () => Promise<void>;
  
  // Custom actions
  customActions?: CustomAction[];
  
  // Room info
  roomName: string;
  streamSessionType?: string;
  participantCount?: number;
  
  // Utility functions
  utils: {
    formatDuration: (seconds: number) => string;
    getParticipantDisplayName: () => string;
    sortCustomActions: (actions: CustomAction[]) => CustomAction[];
  };
  
  // Plugin states
  pluginStates?: Record<string, any>;
  pluginHandlers?: Record<string, Record<string, () => void>>;
};

// Add these new types to your types/index.ts file

// export type PaginationInfo = {
//   page: number;
//   limit: number;
//   total: number;
//   totalPages: number;
// };

// export type StreamAgendaResponse = {
//   agendas: Agenda[];
//   pagination: PaginationInfo;
// };

// Update your existing Agenda type
export type Agenda = {
  id: string;
  timeStamp: number;
  action: AgendaAction;
  title: string | null;
  description: string | null;
  duration: string | null;
  isCompleted: boolean;
  hasContent?: boolean; // Added based on controller mapping
  // Content references - now only returning IDs from the optimized query
  pollContent?: { id: string };
  quizContent?: { id: string };
  qaContent?: { id: string };
  customContent?: { id: string };
  // Note: removed streamId and tenantId as they're not returned by the controller
};