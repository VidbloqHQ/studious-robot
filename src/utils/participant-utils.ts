/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Participant, Room, Track } from "livekit-client";

// /**
//  * Utility functions for participant-related operations
//  * These functions are designed to be reusable across components
//  * and handle error cases gracefully
//  */

// /**
//  * Safely checks if a participant has their microphone enabled
//  * @param participant The participant to check
//  * @returns boolean indicating if microphone is enabled
//  */
// export function checkParticipantMicEnabled(participant: Participant): boolean {
//   try {
//     return participant.getTrackPublications()
//       .filter(pub => pub.kind === Track.Kind.Audio)
//       .some(pub => !pub.isMuted);
//   } catch (error) {
//     console.warn('Error checking mic status:', error);
//     return false;
//   }
// }

// /**
//  * Safely checks if a participant has their camera enabled
//  * @param participant The participant to check
//  * @returns boolean indicating if camera is enabled
//  */
// export function checkParticipantCameraEnabled(participant: Participant): boolean {
//   try {
//     return participant.getTrackPublications()
//       .filter(pub => pub.kind === Track.Kind.Video)
//       .filter(pub => pub.source === Track.Source.Camera)
//       .some(pub => !pub.isMuted);
//   } catch (error) {
//     console.warn('Error checking camera status:', error);
//     return false;
//   }
// }

// /**
//  * Safely determines if a participant is the local participant
//  * @param participant The participant to check
//  * @param room The room object containing the local participant
//  * @returns boolean indicating if this is the local participant
//  */
// export function checkIfLocalParticipant(participant: Participant, room?: Room | null): boolean {
//   try {
//     if (!room || !room.localParticipant) return false;
//     return participant.identity === room.localParticipant.identity;
//   } catch (error) {
//     console.warn('Error checking if local participant:', error);
//     return false;
//   }
// }

// /**
//  * Gets user type from participant metadata
//  * @param participant The participant to check
//  * @returns User type string (defaults to "guest")
//  */
// export function getUserType(participant: Participant): string {
//   try {
//     const metadata = participant.metadata
//       ? JSON.parse(participant.metadata)
//       : {};
//     return metadata.userType || "guest";
//   } catch (error) {
//     console.warn('Error parsing participant metadata:', error);
//     return "guest";
//   }
// }

// /**
//  * Gets user display name from participant metadata
//  * @param participant The participant to check
//  * @returns User display name (defaults to participant identity)
//  */
// export function getUserName(participant: Participant): string {
//   try {
//     const metadata = participant.metadata
//       ? JSON.parse(participant.metadata)
//       : {};
//     return metadata.userName || participant.identity;
//   } catch (error) {
//     console.warn('Error parsing participant metadata:', error);
//     return participant.identity;
//   }
// }

// /**
//  * Gets user avatar URL from participant metadata
//  * @param participant The participant to check
//  * @returns Avatar URL (defaults to empty string)
//  */
// export function getAvatarUrl(participant: Participant): string {
//   try {
//     const metadata = participant.metadata
//       ? JSON.parse(participant.metadata)
//       : {};
//     return metadata.avatarUrl || "";
//   } catch (error) {
//     console.warn('Error parsing participant metadata:', error);
//     return "";
//   }
// }

// /**
//  * Gets all user metadata in one call
//  * @param participant The participant to get metadata for
//  * @returns Object containing user metadata with defaults
//  */
// export function getParticipantMetadata(participant: Participant): {
//   userName: string;
//   userType: string;
//   avatarUrl: string;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   [key: string]: any;  // Allow other custom metadata properties
// } {
//   try {
//     const metadata = participant.metadata
//       ? JSON.parse(participant.metadata)
//       : {};
      
//     return {
//       userName: metadata.userName || participant.identity,
//       userType: metadata.userType || "guest",
//       avatarUrl: metadata.avatarUrl || "",
//       ...metadata // Include any other metadata that might be present
//     };
//   } catch (error) {
//     console.warn('Error parsing participant metadata:', error);
//     return {
//       userName: participant.identity,
//       userType: "guest",
//       avatarUrl: ""
//     };
//   }
// }

import { Participant, Room, Track } from "livekit-client";
import { SDKParticipant, EnhancedSDKParticipant, ParticipantMetadata } from "../types";

/**
 * Utility functions for participant-related operations
 * These functions are designed to be reusable across components
 * and handle error cases gracefully
 */

/**
 * Gets the LiveKit participant from an enhanced SDK participant
 * @param participant The enhanced SDK participant
 * @returns The LiveKit participant or null if not found
 */
export function getLivekitParticipant(participant: EnhancedSDKParticipant): Participant | null {
  return participant._livekitParticipant || null;
}

/**
 * Safely checks if a participant has their microphone enabled
 * Works with both LiveKit participants and SDK participants
 * @param participant The participant to check
 * @returns boolean indicating if microphone is enabled
 */
export function checkParticipantMicEnabled(participant: SDKParticipant | EnhancedSDKParticipant): boolean {
  try {
    // If it's an enhanced participant, use the LiveKit participant
    if ('_livekitParticipant' in participant && participant._livekitParticipant) {
      const livekitParticipant = participant._livekitParticipant as Participant;
      return livekitParticipant.getTrackPublications()
        .filter(pub => pub.kind === Track.Kind.Audio)
        .some(pub => !pub.isMuted);
    }
    
    // For regular SDK participants, return false silently
    // The component should provide this state via props instead
    return false;
  } catch (error) {
    console.warn('Error checking mic status:', error);
    return false;
  }
}

/**
 * Safely checks if a participant has their camera enabled
 * Works with both LiveKit participants and SDK participants
 * @param participant The participant to check
 * @returns boolean indicating if camera is enabled
 */
export function checkParticipantCameraEnabled(participant: SDKParticipant | EnhancedSDKParticipant): boolean {
  try {
    // If it's an enhanced participant, use the LiveKit participant
    if ('_livekitParticipant' in participant && participant._livekitParticipant) {
      const livekitParticipant = participant._livekitParticipant as Participant;
      return livekitParticipant.getTrackPublications()
        .filter(pub => pub.kind === Track.Kind.Video)
        .filter(pub => pub.source === Track.Source.Camera)
        .some(pub => !pub.isMuted);
    }
    
    // For regular SDK participants, return false silently
    // The component should provide this state via props instead
    return false;
  } catch (error) {
    console.warn('Error checking camera status:', error);
    return false;
  }
}

/**
 * Safely determines if a participant is the local participant
 * @param participant The participant to check
 * @param room The room object containing the local participant
 * @returns boolean indicating if this is the local participant
 */
export function checkIfLocalParticipant(participant: SDKParticipant, room?: Room | null): boolean {
  try {
    if (!room || !room.localParticipant) return false;
    return participant.identity === room.localParticipant.identity;
  } catch (error) {
    console.warn('Error checking if local participant:', error);
    return false;
  }
}

/**
 * Gets user type from participant metadata
 * @param participant The participant to check
 * @returns User type string (defaults to "guest")
 */
export function getUserType(participant: SDKParticipant): string {
  try {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};
    return metadata.userType || "guest";
  } catch (error) {
    console.warn('Error parsing participant metadata:', error);
    return "guest";
  }
}

/**
 * Gets user display name from participant metadata
 * @param participant The participant to check
 * @returns User display name (defaults to participant identity)
 */
export function getUserName(participant: SDKParticipant): string {
  try {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};
    return metadata.userName || participant.identity;
  } catch (error) {
    console.warn('Error parsing participant metadata:', error);
    return participant.identity;
  }
}

/**
 * Gets user avatar URL from participant metadata
 * @param participant The participant to check
 * @returns Avatar URL (defaults to empty string)
 */
export function getAvatarUrl(participant: SDKParticipant): string {
  try {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};
    return metadata.avatarUrl || "";
  } catch (error) {
    console.warn('Error parsing participant metadata:', error);
    return "";
  }
}

/**
 * Gets all user metadata in one call
 * @param participant The participant to get metadata for
 * @returns Object containing user metadata with defaults
 */
export function getParticipantMetadata(participant: SDKParticipant): ParticipantMetadata {
  try {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};
      
    return {
      userName: metadata.userName || participant.identity,
      userType: metadata.userType || "guest",
      avatarUrl: metadata.avatarUrl || "",
      walletAddress: metadata.walletAddress || "",
      ...metadata // Include any other metadata that might be present
    };
  } catch (error) {
    console.warn('Error parsing participant metadata:', error);
    return {
      userName: participant.identity,
      userType: "guest",
      avatarUrl: "",
      walletAddress: ""
    };
  }
}

/**
 * Creates an enhanced SDK participant that includes LiveKit participant reference
 * @param livekitParticipant The LiveKit participant
 * @returns Enhanced SDK participant
 */
export function createEnhancedSDKParticipant(livekitParticipant: Participant): EnhancedSDKParticipant {
  return {
    sid: livekitParticipant.sid,
    identity: livekitParticipant.identity,
    metadata: livekitParticipant.metadata,
    isLocal: livekitParticipant.isLocal,
    _livekitParticipant: livekitParticipant
  };
}

/**
 * Safely checks mic status with enhanced participant - for internal SDK use
 * @param participant Enhanced SDK participant with LiveKit reference
 * @returns boolean indicating if microphone is enabled
 */
export function checkMicStatusEnhanced(participant: EnhancedSDKParticipant): boolean {
  try {
    const livekitParticipant = getLivekitParticipant(participant);
    if (livekitParticipant) {
      const audioPublications = livekitParticipant.getTrackPublications()
        .filter(pub => pub.kind === Track.Kind.Audio);
      
      // Debug logging to help identify the issue
      console.log('Audio publications for participant', participant.identity, ':', audioPublications);
      audioPublications.forEach((pub, index) => {
        console.log(`Audio pub ${index}:`, {
          kind: pub.kind,
          source: pub.source,
          isMuted: pub.isMuted,
          isEnabled: pub.isEnabled,
          isSubscribed: pub.isSubscribed
        });
      });
      
      // Check if any audio track is not muted
      const hasUnmutedAudio = audioPublications.some(pub => !pub.isMuted);
      console.log('Has unmuted audio:', hasUnmutedAudio);
      
      return hasUnmutedAudio;
    }
    return false;
  } catch (error) {
    console.warn('Error checking mic status:', error);
    return false;
  }
}

/**
 * Safely checks camera status with enhanced participant - for internal SDK use
 * @param participant Enhanced SDK participant with LiveKit reference
 * @returns boolean indicating if camera is enabled
 */
export function checkCameraStatusEnhanced(participant: EnhancedSDKParticipant): boolean {
  try {
    const livekitParticipant = getLivekitParticipant(participant);
    if (livekitParticipant) {
      const videoPublications = livekitParticipant.getTrackPublications()
        .filter(pub => pub.kind === Track.Kind.Video)
        .filter(pub => pub.source === Track.Source.Camera);
      
      // Debug logging to compare with audio
      console.log('Video publications for participant', participant.identity, ':', videoPublications);
      videoPublications.forEach((pub, index) => {
        console.log(`Video pub ${index}:`, {
          kind: pub.kind,
          source: pub.source,
          isMuted: pub.isMuted,
          isEnabled: pub.isEnabled,
          isSubscribed: pub.isSubscribed
        });
      });
      
      const hasUnmutedVideo = videoPublications.some(pub => !pub.isMuted);
      console.log('Has unmuted video:', hasUnmutedVideo);
      
      return hasUnmutedVideo;
    }
    return false;
  } catch (error) {
    console.warn('Error checking camera status:', error);
    return false;
  }
}

/**
 * Gets participant track states - use this instead of the individual check functions
 * @param participant SDK participant (enhanced or basic)
 * @returns Object with mic and camera states
 */
export function getParticipantTrackStates(participant: SDKParticipant | EnhancedSDKParticipant): {
  micEnabled: boolean;
  cameraEnabled: boolean;
  hasLivekitReference: boolean;
} {
  if ('_livekitParticipant' in participant && participant._livekitParticipant) {
    return {
      micEnabled: checkMicStatusEnhanced(participant as EnhancedSDKParticipant),
      cameraEnabled: checkCameraStatusEnhanced(participant as EnhancedSDKParticipant),
      hasLivekitReference: true
    };
  }
  
  return {
    micEnabled: false,
    cameraEnabled: false,
    hasLivekitReference: false
  };
}

/**
 * Event handler helper for track muted events
 * @param participant Enhanced SDK participant
 * @param handler Event handler function
 * @returns Cleanup function
 */
export function addTrackMutedListener(
  participant: EnhancedSDKParticipant,
  handler: (...args: any[]) => void
): () => void {
  const livekitParticipant = getLivekitParticipant(participant);
  if (livekitParticipant) {
    (livekitParticipant as any).on('trackMuted', handler);
    return () => (livekitParticipant as any).off('trackMuted', handler);
  }
  return () => {};
}

/**
 * Event handler helper for track unmuted events
 * @param participant Enhanced SDK participant
 * @param handler Event handler function
 * @returns Cleanup function
 */
export function addTrackUnmutedListener(
  participant: EnhancedSDKParticipant,
  handler: (...args: any[]) => void
): () => void {
  const livekitParticipant = getLivekitParticipant(participant);
  if (livekitParticipant) {
    (livekitParticipant as any).on('trackUnmuted', handler);
    return () => (livekitParticipant as any).off('trackUnmuted', handler);
  }
  return () => {};
}

/**
 * Generic event handler helper for participant events (use with caution)
 * @param participant Enhanced SDK participant
 * @param eventName Event name to listen for
 * @param handler Event handler function
 * @returns Cleanup function
 */
export function addParticipantEventListener(
  participant: EnhancedSDKParticipant,
  eventName: string,
  handler: (...args: any[]) => void
): () => void {
  const livekitParticipant = getLivekitParticipant(participant);
  if (livekitParticipant) {
    // Type assertion to handle the event system properly
    (livekitParticipant as any).on(eventName, handler);
    return () => (livekitParticipant as any).off(eventName, handler);
  }
  
  // Return no-op cleanup function if no LiveKit participant
  return () => {};
}