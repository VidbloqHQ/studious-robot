import { Participant, Room, Track } from "livekit-client";

/**
 * Utility functions for participant-related operations
 * These functions are designed to be reusable across components
 * and handle error cases gracefully
 */

/**
 * Safely checks if a participant has their microphone enabled
 * @param participant The participant to check
 * @returns boolean indicating if microphone is enabled
 */
export function checkParticipantMicEnabled(participant: Participant): boolean {
  try {
    return participant.getTrackPublications()
      .filter(pub => pub.kind === Track.Kind.Audio)
      .some(pub => !pub.isMuted);
  } catch (error) {
    console.warn('Error checking mic status:', error);
    return false;
  }
}

/**
 * Safely checks if a participant has their camera enabled
 * @param participant The participant to check
 * @returns boolean indicating if camera is enabled
 */
export function checkParticipantCameraEnabled(participant: Participant): boolean {
  try {
    return participant.getTrackPublications()
      .filter(pub => pub.kind === Track.Kind.Video)
      .filter(pub => pub.source === Track.Source.Camera)
      .some(pub => !pub.isMuted);
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
export function checkIfLocalParticipant(participant: Participant, room?: Room | null): boolean {
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
export function getUserType(participant: Participant): string {
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
export function getUserName(participant: Participant): string {
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
export function getAvatarUrl(participant: Participant): string {
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
export function getParticipantMetadata(participant: Participant): {
  userName: string;
  userType: string;
  avatarUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;  // Allow other custom metadata properties
} {
  try {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};
      
    return {
      userName: metadata.userName || participant.identity,
      userType: metadata.userType || "guest",
      avatarUrl: metadata.avatarUrl || "",
      ...metadata // Include any other metadata that might be present
    };
  } catch (error) {
    console.warn('Error parsing participant metadata:', error);
    return {
      userName: participant.identity,
      userType: "guest",
      avatarUrl: ""
    };
  }
}