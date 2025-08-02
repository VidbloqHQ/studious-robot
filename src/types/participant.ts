import { Participant } from "./stream";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SDKParticipant {
  sid: string;
  identity: string;
  metadata?: string;
  isLocal: boolean;
}

export interface SDKTrackPublication {
  isMuted: boolean;
  isSubscribed: boolean;
  isEnabled: boolean;
  trackSid?: string;
  kind?: string;
  source?: string;
  track?: any; // Add the track property
}

export interface SDKTrackReference {
  participant: SDKParticipant;
  publication?: SDKTrackPublication;
  source: string;
  // Add track object reference if needed
  track?: any; // This would be the actual MediaStreamTrack
}

export interface SDKRoom {
  // sid: string;
  name: string;
  metadata?: string;
}

// Enhanced participant interface that includes the LiveKit participant
// This allows us to bridge between our SDK types and LiveKit types
export interface EnhancedSDKParticipant extends SDKParticipant {
  _livekitParticipant?: any; // Store reference to actual LiveKit participant
}

// Enhanced track reference that includes LiveKit track reference
export interface EnhancedSDKTrackReference extends SDKTrackReference {
  _livekitTrackRef?: any; // Store reference to actual LiveKit TrackReference
}


// Track source types - mirror LiveKit's sources
export enum SDKTrackSource {
  Camera = 'camera',
  Microphone = 'microphone',
  ScreenShare = 'screen_share',
  ScreenShareAudio = 'screen_share_audio',
  Unknown = 'unknown'
}

// Track kind types
export enum SDKTrackKind {
  Audio = 'audio',
  Video = 'video',
  Unknown = 'unknown'
}

export enum ParticipantSortStrategy {
  DEFAULT = 'default',                 // Join order
  RECENT_SPEAKERS = 'recent_speakers', // Prioritize recent speakers
  ACTIVE_SPEAKERS = 'active_speakers', // Currently speaking first
  ROLE_BASED = 'role_based',          // Host > Co-host > Guest
  CUSTOM = 'custom'                   // User-provided function
}

export interface SDKChatMessage {
  id?: string;
  message: string;
  parsedContent?: React.ReactNode;
  participant?: Participant;
  timestamp: number;
  from?: {
    identity: string;
    metadata?: string;
  };
}