import { Participant, Room } from "livekit-client";
import { TrackReference } from "@livekit/components-react";
import { 
  SDKParticipant, 
  SDKTrackReference, 
  SDKRoom, 
  EnhancedSDKParticipant, 
  EnhancedSDKTrackReference,
  SDKTrackSource,
} from "../types";

/**
 * Maps a LiveKit participant to a basic SDK participant
 * Use this when you only need basic participant info
 */
export const mapParticipant = (participant: Participant): SDKParticipant => ({
  sid: participant.sid,
  identity: participant.identity,
  metadata: participant.metadata,
  isLocal: participant.isLocal,
});

/**
 * Maps a LiveKit participant to an enhanced SDK participant
 * Use this when you need access to LiveKit functionality
 */
export const mapToEnhancedParticipant = (participant: Participant): EnhancedSDKParticipant => ({
  sid: participant.sid,
  identity: participant.identity,
  metadata: participant.metadata,
  isLocal: participant.isLocal,
  _livekitParticipant: participant,
});

/**
 * Maps LiveKit track source to SDK track source
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTrackSource = (source: any): string => {
  switch (source) {
    case 'camera':
      return SDKTrackSource.Camera;
    case 'microphone':
      return SDKTrackSource.Microphone;
    case 'screen_share':
      return SDKTrackSource.ScreenShare;
    case 'screen_share_audio':
      return SDKTrackSource.ScreenShareAudio;
    default:
      return SDKTrackSource.Unknown;
  }
};

/**
 * Maps a track reference to SDK format
 */
export const mapTrackReference = (track: TrackReference): SDKTrackReference => ({
  participant: mapParticipant(track.participant),
  publication: track.publication
    ? {
        isMuted: track.publication.isMuted,
        isSubscribed: track.publication.isSubscribed,
        isEnabled: track.publication.isEnabled,
        trackSid: track.publication.trackSid,
        kind: track.publication.kind,
        source: track.publication.source,
      }
    : undefined,
  source: mapTrackSource(track.source),
  track: track.publication?.track,
});

/**
 * Maps a track reference to SDK format with enhanced participant
 */
export const mapTrackReferenceEnhanced = (track: TrackReference): EnhancedSDKTrackReference => ({
  participant: mapToEnhancedParticipant(track.participant),
  publication: track.publication
    ? {
        isMuted: track.publication.isMuted,
        isSubscribed: track.publication.isSubscribed,
        isEnabled: track.publication.isEnabled,
        trackSid: track.publication.trackSid,
        kind: track.publication.kind,
        source: track.publication.source,
      }
    : undefined,
  source: mapTrackSource(track.source),
  track: track.publication?.track,
  _livekitTrackRef: track,
});

/**
 * Maps a LiveKit room to SDK format
 */
export const mapRoom = (room: Room): SDKRoom => ({
  // sid: room.sid,
  name: room.name,
  metadata: room.metadata,
});

/**
 * Type guard to check if a participant is enhanced
 */
export const isEnhancedParticipant = (
  participant: SDKParticipant | EnhancedSDKParticipant
): participant is EnhancedSDKParticipant => {
  return '_livekitParticipant' in participant;
};

/**
 * Type guard to check if a track reference is enhanced
 */
export const isEnhancedTrackReference = (
  trackRef: SDKTrackReference | EnhancedSDKTrackReference
): trackRef is EnhancedSDKTrackReference => {
  return '_livekitTrackRef' in trackRef;
};

/**
 * Safely gets the LiveKit participant from any SDK participant
 */
export const getLivekitParticipantFromSDK = (participant: SDKParticipant | EnhancedSDKParticipant): Participant | null => {
  if (isEnhancedParticipant(participant)) {
    return participant._livekitParticipant || null;
  }
  return null;
};

/**
 * Safely gets the LiveKit track reference from any SDK track reference
 */
export const getLivekitTrackReference = (trackRef: SDKTrackReference | EnhancedSDKTrackReference): TrackReference | null => {
  if (isEnhancedTrackReference(trackRef)) {
    return trackRef._livekitTrackRef || null;
  }
  return null;
};