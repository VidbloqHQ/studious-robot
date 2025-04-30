import { useState, useEffect } from "react";
import { useTracks, useRoomContext } from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";
import { UserType, ParticipantMetadata, ParticipantTrack } from "../types";

/**
 * Custom hook that provides livestream functionality
 * Separates logic from UI to allow custom rendering
 */
export function useLivestream() {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const room = useRoomContext();
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  // Set up active speaker detection
  useEffect(() => {
    const handleActiveSpeakerChange = (speakers: Participant[]) => {
      if (speakers.length > 0) {
        setActiveSpeaker(speakers[0].identity);
      } else {
        setActiveSpeaker(null);
      }
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
    };
  }, [room]);

  // Find any active screen share
  const screenShareTrack = rawTracks.find(
    (track) =>
      track.source === Track.Source.ScreenShare &&
      track.publication?.isSubscribed &&
      track.publication?.isEnabled
  );

  // Get screen sharer's identity
  const screenSharerIdentity = screenShareTrack?.participant?.identity;

  // Group participants by user type (for camera tracks only)
  const participantsByType: Record<string, ParticipantTrack[]> = {};
  const processedIdentities = new Set<string>(); // To avoid duplicates

  rawTracks.forEach((track) => {
    if (!track.participant) return;
    if (track.source !== Track.Source.Camera) return;

    const identity = track.participant.identity;

    // Skip if we've already processed this participant
    if (processedIdentities.has(identity)) return;
    processedIdentities.add(identity);

    const metadata: ParticipantMetadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};
    const userType = (metadata.userType || "guest") as UserType;

    if (!participantsByType[userType]) {
      participantsByType[userType] = [];
    }

    participantsByType[userType].push(track as ParticipantTrack);
  });

  // Determine layout based on whether there's a screen share
  let mainContent: ParticipantTrack | null = null;
  let sidebarContent: ParticipantTrack[] = [];

  if (screenShareTrack) {
    // SCREEN SHARING MODE
    mainContent = screenShareTrack as ParticipantTrack;

    // Add only hosts, co-hosts and temp-hosts to sidebar (not guests)
    const hostTracks = participantsByType["host"] || [];
    const coHostTracks = participantsByType["co-host"] || [];
    const tempHostTracks = participantsByType["temp-host"] || [];

    // Combine all host types but exclude the screen sharer
    const allHostTracks = [
      ...hostTracks,
      ...coHostTracks,
      ...tempHostTracks,
    ].filter((track) => track.participant?.identity !== screenSharerIdentity);

    // Fill the sidebar with host tracks
    sidebarContent = allHostTracks;
  } else {
    // REGULAR MODE - host in main view, co-hosts in sidebar
    const hostTracks = participantsByType["host"] || [];
    const coHostTracks = participantsByType["co-host"] || [];
    const tempHostTracks = participantsByType["temp-host"] || [];

    // Host goes in main view
    if (hostTracks.length > 0) {
      mainContent = hostTracks[0];
    }

    // Co-hosts and temp-hosts go in sidebar (up to 3 total)
    sidebarContent = [...coHostTracks, ...tempHostTracks].slice(0, 3);
  }

  // Return all the data and state needed for rendering
  return {
    rawTracks,
    activeSpeaker,
    screenShareTrack,
    screenSharerIdentity,
    participantsByType,
    mainContent,
    sidebarContent,
    room
  };
}

