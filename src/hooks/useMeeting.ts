import { useState, useEffect } from "react";
import { useTracks, useRoomContext, TrackReference } from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";

/**
 * Custom hook for meetings functionality
 * Extracts core meeting logic without UI
 */
export function useMeeting() {
  // Screen size detection
  const [screenSize, setScreenSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("xl");
  
  // Set up screen size detection on mount
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize("xs");
      else if (width < 768) setScreenSize("sm");
      else if (width < 1024) setScreenSize("md");
      else if (width < 1280) setScreenSize("lg");
      else setScreenSize("xl");
    };
    
    // Set initial size
    handleResize();
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine max visible cohosts based on screen size
  const getMaxVisibleCoHosts = () => {
    if (screenSize === "xs") return 2;
    if (screenSize === "sm") return 3;
    if (screenSize === "md") return 4;
    if (screenSize === "lg") return 6;
    return 7; // xl
  };

  // Rest of your existing useMeeting code
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
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

  // Find active screen share if any
  const screenShareTrack = rawTracks.find(
    (track) =>
      track.source === Track.Source.ScreenShare &&
      track.publication?.isSubscribed &&
      track.publication?.isEnabled
  );

  // Get only camera tracks (excluding screen share)
  const cameraTracks = rawTracks.filter((track) => {
    if (!track.participant) return false;
    if (track.source === Track.Source.ScreenShare) return false;

    const metadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};
    const isHost =
      metadata.userType === "host" || metadata.userType === "co-host";

    return track.source === Track.Source.Camera && isHost;
  });

  // Separate host from co-hosts
  const hostTrack = cameraTracks.find((track) => {
    if (!track.participant) return false;
    const metadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};
    return metadata.userType === "host";
  });

  // Find active speaker track
  const activeSpeakerTrack = activeSpeaker 
    ? cameraTracks.find(track => 
        track.participant && track.participant.identity === activeSpeaker)
    : null;

  // Get the main display track (active speaker or host as fallback)
  const mainDisplayTrack = activeSpeakerTrack || hostTrack;

  const coHostTracks = cameraTracks.filter((track) => {
    if (!track.participant) return false;
    
    // Exclude the main display track from co-hosts
    if (mainDisplayTrack && track.participant.identity === mainDisplayTrack.participant.identity) {
      return false;
    }
    
    return true;
  });

  // Handle overflow for participants - use dynamic MAX_VISIBLE_COHOSTS
  const MAX_VISIBLE_COHOSTS = getMaxVisibleCoHosts();
  const displayedCoHosts = coHostTracks.slice(0, MAX_VISIBLE_COHOSTS);
  const overflowCount = coHostTracks.length - displayedCoHosts.length;
  const overflowTracks = coHostTracks.slice(MAX_VISIBLE_COHOSTS);

  // Rest of your existing useMeeting implementation...
  
  // Calculate layout data
  const getBottomRowParticipants = (): TrackReference[] => {
    const participants: TrackReference[] = [];
    const addedParticipants = new Set<string>(); // Track added participants

    // Helper to check if participant is already added
    const isParticipantAdded = (track: TrackReference) => {
      return addedParticipants.has(track.participant?.identity || '');
    };

    // Helper to add participant safely
    const addParticipant = (track: TrackReference) => {
      if (!track.participant) return;
      
      const identity = track.participant.identity;
      if (!isParticipantAdded(track)) {
        participants.push(track);
        addedParticipants.add(identity);
      }
    };

    if (screenShareTrack) {
      // First, add the main display person if they're not the screen sharer
      if (mainDisplayTrack && mainDisplayTrack.participant.identity !== screenShareTrack.participant.identity) {
        addParticipant(mainDisplayTrack);
      }

      // Then add co-hosts who aren't the screen sharer
      displayedCoHosts.forEach(track => {
        if (track.participant.identity !== screenShareTrack.participant.identity) {
          addParticipant(track);
        }
      });

      // Finally, add the screen sharer's camera view if they're not already added
      const screenSharerCamera = cameraTracks.find(
        track => track.participant && track.participant.identity === screenShareTrack.participant.identity
      );
      
      if (screenSharerCamera) {
        addParticipant(screenSharerCamera);
      }
    } else {
      // No screen share - show co-hosts normally
      displayedCoHosts.forEach(track => addParticipant(track));
    }

    return participants;
  };

  // Determine layout type based on participant count and agenda
  const calculateLayoutType = (hasAgenda: boolean) => {
    if (cameraTracks.length > 2 && hasAgenda) {
      return "multi-participant-with-agenda";
    }

    if (screenShareTrack) {
      return hasAgenda ? "screenshare-with-agenda" : "screenshare";
    }

    if (cameraTracks.length === 1) {
      return "single-participant";
    }

    if (cameraTracks.length === 2) {
      return hasAgenda ? "two-participants-with-agenda" : "two-participants";
    }

    return "multi-participant";
  };

  return {
    room,
    activeSpeaker,
    rawTracks,
    cameraTracks,
    screenShareTrack,
    hostTrack,
    mainDisplayTrack,
    coHostTracks,
    displayedCoHosts,
    overflowCount,
    getBottomRowParticipants,
    calculateLayoutType,
    overflowTracks,
    screenSize  // Export screen size for use in other components if needed
  };
}