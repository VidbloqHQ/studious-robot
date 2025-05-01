// import { useState, useEffect } from "react";
// import { useTracks, useRoomContext, TrackReference } from "@livekit/components-react";
// import { Track, RoomEvent, Participant } from "livekit-client";

// /**
//  * Custom hook for meetings functionality
//  * Extracts core meeting logic without UI
//  */
// export function useMeeting() {
//   const rawTracks = useTracks(
//     [
//       { source: Track.Source.Camera, withPlaceholder: true },
//       { source: Track.Source.ScreenShare, withPlaceholder: false },
//     ],
//     { onlySubscribed: false }
//   );

//   const room = useRoomContext();
//   const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

//   // Set up active speaker detection
//   useEffect(() => {
//     const handleActiveSpeakerChange = (speakers: Participant[]) => {
//       if (speakers.length > 0) {
//         setActiveSpeaker(speakers[0].identity);
//       } else {
//         setActiveSpeaker(null);
//       }
//     };

//     room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);

//     return () => {
//       room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
//     };
//   }, [room]);

//   // Find active screen share if any
//   const screenShareTrack = rawTracks.find(
//     (track) =>
//       track.source === Track.Source.ScreenShare &&
//       track.publication?.isSubscribed &&
//       track.publication?.isEnabled
//   );

//   // Get only camera tracks (excluding screen share)
//   const cameraTracks = rawTracks.filter((track) => {
//     if (!track.participant) return false;
//     if (track.source === Track.Source.ScreenShare) return false;

//     const metadata = track.participant.metadata
//       ? JSON.parse(track.participant.metadata)
//       : {};
//     const isHost =
//       metadata.userType === "host" || metadata.userType === "co-host";

//     return track.source === Track.Source.Camera && isHost;
//   });

//   // Separate host from co-hosts
//   const hostTrack = cameraTracks.find((track) => {
//     if (!track.participant) return false;
//     const metadata = track.participant.metadata
//       ? JSON.parse(track.participant.metadata)
//       : {};
//     return metadata.userType === "host";
//   });

//   const coHostTracks = cameraTracks.filter((track) => {
//     if (!track.participant) return false;
//     if (!hostTrack) return true;
//     return track.participant.identity !== hostTrack.participant.identity;
//   });

//   // Handle overflow for participants
//   const MAX_VISIBLE_COHOSTS = 1;
//   const displayedCoHosts = coHostTracks.slice(0, MAX_VISIBLE_COHOSTS);
//   const overflowCount = coHostTracks.length - displayedCoHosts.length;
//   const overflowTracks = coHostTracks.slice(MAX_VISIBLE_COHOSTS);


//   // Calculate layout data
//   const getBottomRowParticipants = (): TrackReference[] => {
//     const participants: TrackReference[] = [];

//     // If there's a screen share
//     if (screenShareTrack) {
//       const screenSharerIdentity = screenShareTrack.participant.identity;

//       // Find the camera track of the person sharing the screen
//       const screenSharerCameraTrack = cameraTracks.find(
//         (track) =>
//           track.participant &&
//           track.participant.identity === screenSharerIdentity
//       );

//       // Add the screen sharer's camera view if available
//       if (screenSharerCameraTrack) {
//         participants.push(screenSharerCameraTrack);
//       }

//       // Add all co-hosts
//       displayedCoHosts.forEach((track) => {
//         // Avoid duplicating the screen sharer if they're also a co-host
//         if (
//           !participants.some(
//             (p) => p.participant.identity === track.participant.identity
//           )
//         ) {
//           participants.push(track);
//         }
//       });

//       // If host is not the screen sharer, add the host to the bottom row
//       if (
//         hostTrack &&
//         hostTrack.participant.identity !== screenSharerIdentity
//       ) {
//         // Only add host if they're not already in the list
//         if (
//           !participants.some(
//             (p) => p.participant.identity === hostTrack.participant.identity
//           )
//         ) {
//           participants.push(hostTrack);
//         }
//       }
//     } else {
//       // No screen share - only show co-hosts
//       participants.push(...displayedCoHosts);
//     }

//     return participants;
//   };

//   // Determine layout type based on participant count and agenda
//   const calculateLayoutType = (hasAgenda: boolean) => {
//     if (cameraTracks.length > 2 && hasAgenda) {
//       return "multi-participant-with-agenda";
//     }

//     if (screenShareTrack) {
//       return hasAgenda ? "screenshare-with-agenda" : "screenshare";
//     }

//     if (cameraTracks.length === 1) {
//       return "single-participant";
//     }

//     if (cameraTracks.length === 2) {
//       return hasAgenda ? "two-participants-with-agenda" : "two-participants";
//     }

//     return "multi-participant";
//   };

//   return {
//     room,
//     activeSpeaker,
//     rawTracks,
//     cameraTracks,
//     screenShareTrack,
//     hostTrack,
//     coHostTracks,
//     displayedCoHosts,
//     overflowCount,
//     getBottomRowParticipants,
//     calculateLayoutType,
//     overflowTracks
//   };
// }

import { useState, useEffect } from "react";
import { useTracks, useRoomContext, TrackReference } from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";

/**
 * Custom hook for meetings functionality
 * Extracts core meeting logic without UI
 */
export function useMeeting() {
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

  const coHostTracks = cameraTracks.filter((track) => {
    if (!track.participant) return false;
    if (!hostTrack) return true;
    return track.participant.identity !== hostTrack.participant.identity;
  });

  // Handle overflow for participants
  const MAX_VISIBLE_COHOSTS = 7;
  const displayedCoHosts = coHostTracks.slice(0, MAX_VISIBLE_COHOSTS);
  const overflowCount = coHostTracks.length - displayedCoHosts.length;
  const overflowTracks = coHostTracks.slice(MAX_VISIBLE_COHOSTS);

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
      // First, add the host if they're not the screen sharer
      if (hostTrack && hostTrack.participant.identity !== screenShareTrack.participant.identity) {
        addParticipant(hostTrack);
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
    coHostTracks,
    displayedCoHosts,
    overflowCount,
    getBottomRowParticipants,
    calculateLayoutType,
    overflowTracks
  };
}