// import React, { ReactElement } from "react";
// import { VideoTrack, AudioTrack } from "@livekit/components-react";
// import { Track } from "livekit-client";
// import { TrackReference } from "@livekit/components-react";
// import ParticipantView from "./participant";
// import { useMeeting } from "../hooks/index";
// import { 
//   checkParticipantMicEnabled, 
//   checkIfLocalParticipant 
// } from "../utils/index";
// import ParticipantControls from "./participant-controls";

// interface MeetingViewProps {
//   hasAgenda?: boolean;
//   className?: string;
//   style?: React.CSSProperties;
//   components?: {
//     AgendaComponent?: React.FC;
//     ParticipantComponent?: React.FC<{
//       track: TrackReference;
//       isMainHost?: boolean;
//       isActive: boolean;
//     }>;
//     OverflowComponent?: React.FC<{
//       count: number;
//       overflowTracks: TrackReference[];
//     }>;
//   };
// }

// export default function MeetingView({
//   hasAgenda = true,
//   className = "",
//   style,
//   components,
// }: MeetingViewProps) {
//   const {
//     activeSpeaker,
//     screenShareTrack,
//     mainDisplayTrack, // Use the new mainDisplayTrack (active speaker or host)
//     displayedCoHosts,
//     overflowCount,
//     getBottomRowParticipants,
//     calculateLayoutType,
//     cameraTracks,
//     overflowTracks,
//     room,
//   } = useMeeting();

//   // Current layout type based on participants and agenda
//   const layoutType = calculateLayoutType(hasAgenda);

//   const getParticipantMetadata = (track: TrackReference) => {
//     if (!track.participant) return { userName: "Unknown", avatarUrl: "" };

//     const metadata = track.participant.metadata
//       ? JSON.parse(track.participant.metadata)
//       : {};

//     return {
//       userName: metadata.userName || track.participant.identity,
//       avatarUrl: metadata.avatarUrl || "",
//       initials: (metadata.userName || track.participant.identity || "")
//         .split(" ")
//         .map((name: string) => name[0])
//         .join("")
//         .slice(0, 2)
//         .toUpperCase(),
//     };
//   };

//   // Render the overflow indicator
//   const renderOverflow = (count: number): ReactElement | null => {
//     if (count <= 0) return null;

//     // Use custom component if provided
//     if (components?.OverflowComponent) {
//       return React.createElement(components.OverflowComponent, { count, overflowTracks });
//     }

//     const displayedAvatars = overflowTracks.slice(0, 4);
//     return (
//       <div className="flex flex-col items-center justify-center bg-white bg-opacity-10 rounded-lg p-4 h-full w-full">
//         <div className="flex mb-2">
//           {displayedAvatars.map((track, index) => {
//             const { avatarUrl, initials } = getParticipantMetadata(track);
//             const colors = [
//               "bg-blue-400",
//               "bg-red-400",
//               "bg-green-400",
//               "bg-primary",
//             ];

//             return (
//               <div
//                 key={track.participant?.identity || `overflow-${index}`}
//                 className={`w-8 h-8 rounded-full ${
//                   colors[index % colors.length]
//                 } ${
//                   index > 0 ? "-ml-1" : ""
//                 } flex items-center justify-center text-xs text-white overflow-hidden`}
//                 style={{ zIndex: 10 - index }}
//               >
//                 {avatarUrl ? (
//                   <img
//                     src={avatarUrl}
//                     alt={initials}
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   initials
//                 )}
//               </div>
//             );
//           })}
//         </div>
//         <p className="text-gray-400 text-sm">People on the call</p>
//         <div className="mt-2 px-4 py-1 bg-white bg-opacity-10 rounded-full">
//           <span className="text-gray-200">+{count}</span>
//         </div>
//       </div>
//     );
//   };

//   // Render agenda section
//   const renderAgenda = (): ReactElement => {
//     // Use custom agenda component if provided
//     if (components?.AgendaComponent) {
//       return React.createElement(components.AgendaComponent);
//     }

//     return (
//       <div className="bg-white rounded-lg h-full p-5 overflow-y-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="font-bold text-base">Agenda</h2>
//           <span className="text-gray-400 text-sm">1/4</span>
//         </div>

//         <div className="relative">
//           <div className="absolute top-0 bottom-0 left-1.5 border-l border-dashed border-gray-200 z-0"></div>

//           <div className="space-y-8 relative z-10">
//             <div className="flex">
//               <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
//               <div className="ml-5 flex-1">
//                 <div className="flex items-center justify-between">
//                   <h3 className="font-semibold text-sm text-gray-800 uppercase">
//                     POLL
//                   </h3>
//                   <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
//                     12m
//                   </div>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Members are expected to participate in a poll
//                 </p>
//               </div>
//             </div>

//             <div className="flex">
//               <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
//               <div className="ml-5 flex-1">
//                 <div className="flex items-center justify-between">
//                   <h3 className="font-semibold text-sm text-gray-800 uppercase">
//                     Q&A
//                   </h3>
//                   <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
//                     15m
//                   </div>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Questions and answers
//                 </p>
//               </div>
//             </div>

//             <div className="flex">
//               <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
//               <div className="ml-5 flex-1">
//                 <div className="flex items-center justify-between">
//                   <h3 className="font-semibold text-sm text-gray-800 uppercase">
//                     GIVEAWAY
//                   </h3>
//                   <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
//                     10m
//                   </div>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Opportunity to be gifted
//                 </p>
//               </div>
//             </div>

//             <div className="flex">
//               <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
//               <div className="ml-5 flex-1">
//                 <div className="flex items-center justify-between">
//                   <h3 className="font-semibold text-sm text-gray-800 uppercase">
//                     NEXT STEPS
//                   </h3>
//                   <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
//                     20m
//                   </div>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-1">
//                   Opportunity to be gifted
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="mt-8 text-xs text-gray-500 text-center">
//           Hover on an "agenda" to remove or edit it.
//         </div>

//         <button className="w-full mt-4 bg-primary-light text-text-primary py-2 rounded-md text-sm">
//           Add Agenda
//         </button>
//       </div>
//     );
//   };

// // Updated renderParticipant function with height constraint for camera on state
// const renderParticipant = (
//   track: TrackReference,
//   isMainHost = false
// ): ReactElement | null => {
//   if (!track || !track.participant) return null;

//   if (components?.ParticipantComponent) {
//     return React.createElement(components.ParticipantComponent, {
//       track,
//       isMainHost,
//       isActive: track.participant.identity === activeSpeaker,
//     });
//   }

//   // Check camera status
//   const isCameraOn = track.publication && !track.publication.isMuted;
  
//   // Use the utility function for microphone status
//   const isMicrophoneOn = checkParticipantMicEnabled(track.participant);

//   const isScreenShare =
//     track.source === Track.Source.ScreenShare &&
//     track.publication?.isSubscribed &&
//     track.publication?.isEnabled;

//   const isActive = track.participant.identity === activeSpeaker;
//   const uniqueKey = `${track.participant.sid}-${track.source}`;
  
//   // Use the utility function for local participant check
//   const isLocalParticipant = checkIfLocalParticipant(track.participant, room);

//   return (
//     <div key={uniqueKey} className="h-full w-full">
//       <div
//         className={`relative rounded-lg overflow-hidden bg-red-900 h-full ${
//           isActive ? "ring-2 ring-primary" : ""
//         }`}
//       >
//         {isScreenShare ? (
//           // Screen share view remains full height but with max-height constraint
//           <div className="h-full w-full max-h-[calc(100vh-160px)]">
//             <VideoTrack
//               trackRef={track}
//               className="h-full w-full object-cover"
//             />
//           </div>
//         ) : (
//           <div className="h-full w-full flex items-center justify-center">
//             {isCameraOn ? (
//               // KEY FIX: Explicitly limit the video height with max-height
//               <div className="relative w-full h-full" style={{ maxHeight: "calc(100vh - 160px)" }}>
//                 <VideoTrack
//                   trackRef={track}
//                   className="w-full h-full object-cover"
//                 />
                
//                 {/* Add ParticipantControls on video view */}
//                 <ParticipantControls
//                   participant={track.participant}
//                   isLocal={isLocalParticipant}
//                   isMicrophoneEnabled={isMicrophoneOn}
//                   isCameraEnabled={isCameraOn}
//                   onGiftClick={(participant) => {
//                     console.log("Gift clicked for", participant.identity);
//                   }}
//                 />
//               </div>
//             ) : (
//               // Camera off - ParticipantView (already has correct sizing)
//               <ParticipantView 
//                 participant={track.participant}
//                 isLocal={isLocalParticipant}
//                 isMicrophoneEnabled={isMicrophoneOn}
//                 isCameraEnabled={isCameraOn}
//                 onGiftClick={(participant) => {
//                   console.log("Gift clicked for", participant.identity);
//                 }}
//               />
//             )}
//           </div>
//         )}

//         {track.publication?.track && <AudioTrack trackRef={track} />}
//       </div>
//     </div>
//   );
// };

//   // Render participant with key wrapper
//   const renderParticipantElement = (
//     track: TrackReference,
//     isMainHost = false
//   ) => {
//     const key =
//       track.participant?.identity ||
//       track.participant?.sid ||
//       Math.random().toString();
//     return (
//       <div key={key} className="h-full w-full">
//         {renderParticipant(track, isMainHost)}
//       </div>
//     );
//   };

//   return (
//     <div className={`h-full bg-[var(--sdk-bg-primary-color)] ${className}`} style={style}>
//       {layoutType === "multi-participant-with-agenda" ? (
//         <div className="h-full">
//           <div className="flex h-[70%] mb-2">
//             <div className="w-9/12 pr-2">
//               {screenShareTrack
//                 ? renderParticipantElement(screenShareTrack)
//                 : mainDisplayTrack && renderParticipantElement(mainDisplayTrack, true)}
//             </div>
//             <div className="w-3/12">{renderAgenda()}</div>
//           </div>
//           <div className="h-[30%]">
//             <div className="flex gap-2 h-full">
//               {getBottomRowParticipants().map((track) =>
//                 renderParticipantElement(track)
//               )}
//               {overflowCount > 0 && renderOverflow(overflowCount)}
//             </div>
//           </div>
//         </div>
//       ) : (
//         <div className="flex h-full">
//           <div className={`${hasAgenda ? "w-9/12" : "w-full"} h-full p-2`}>
//             {screenShareTrack ? (
//               hasAgenda ? (
//                 <div className="flex flex-col h-full gap-2">
//                   <div className="h-[70%]">
//                     {renderParticipantElement(screenShareTrack)}
//                   </div>
//                   {/* Apply same 2-column grid logic for agenda layout */}
//                   {getBottomRowParticipants().length + overflowCount > 4 ? (
//                     <div className="grid grid-cols-2 gap-2 h-[30%]">
//                       {getBottomRowParticipants().map((track) =>
//                         renderParticipantElement(track)
//                       )}
//                       {overflowCount > 0 && (
//                         <div className="col-span-1">
//                           {renderOverflow(overflowCount)}
//                         </div>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="flex gap-2 h-[30%]">
//                       {getBottomRowParticipants().map((track) =>
//                         renderParticipantElement(track)
//                       )}
//                       {overflowCount > 0 && renderOverflow(overflowCount)}
//                     </div>
//                   )}
//                 </div>
//               )               : (
//                 <div className="flex h-full gap-2">
//                   <div className="w-8/12 h-full">
//                     {renderParticipantElement(screenShareTrack)}
//                   </div>
//                   <div className="w-4/12 h-full">
//                     {/* More than 4 participants - use a 2-column grid layout */}
//                     {getBottomRowParticipants().length + overflowCount > 4 ? (
//                       <div className="grid grid-cols-2 gap-2 h-full">
//                         {getBottomRowParticipants().map((track, index) => (
//                           <div key={track.participant?.identity || index} 
//                                className="h-full w-full">
//                             {renderParticipantElement(track)}
//                           </div>
//                         ))}
//                         {overflowCount > 0 && (
//                           <div className="h-full w-full">
//                             {renderOverflow(overflowCount)}
//                           </div>
//                         )}
//                       </div>
//                     ) : (
//                       <div className="flex flex-col gap-2 h-full">
//                         {getBottomRowParticipants().map((track, index) => (
//                           <div key={track.participant?.identity || index} 
//                                className="flex-1">
//                             {renderParticipantElement(track)}
//                           </div>
//                         ))}
//                         {overflowCount > 0 && (
//                           <div className="flex-1">
//                             {renderOverflow(overflowCount)}
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )
//             ) : cameraTracks.length === 1 ? (
//               <div className="h-full w-full">
//                 {renderParticipantElement(cameraTracks[0], true)}
//               </div>
//             ) : cameraTracks.length === 2 ? (
//               <div
//                 className={`${
//                   hasAgenda ? "flex flex-col" : "flex"
//                 } gap-2 h-full`}
//               >
//                 {cameraTracks.map((track) => {
//                   // Check if this track is the mainDisplayTrack (active speaker or host)
//                   const isMainDisplay = 
//                     mainDisplayTrack && 
//                     track.participant?.identity === mainDisplayTrack.participant?.identity;
//                   return renderParticipantElement(track, isMainDisplay);
//                 })}
//               </div>
//             ) : (
//               <div className="flex flex-col h-full gap-2">
//                 {mainDisplayTrack && (
//                   <div className="h-[70%]">
//                     {renderParticipantElement(mainDisplayTrack, true)}
//                   </div>
//                 )}
//                 <div className="flex gap-2 h-[30%]">
//                   {displayedCoHosts.map((track) =>
//                     renderParticipantElement(track)
//                   )}
//                   {overflowCount > 0 && renderOverflow(overflowCount)}
//                 </div>
//               </div>
//             )}
//           </div>
//           {hasAgenda && cameraTracks.length <= 2 && (
//             <div className="w-3/12 pl-2 h-full">{renderAgenda()}</div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { type ReactElement, useMemo, useEffect, useState } from "react";
import {
  VideoTrack,
  AudioTrack,
  type SDKTrackReference,
  SDKTrackSource,
  type SDKParticipant,
  useStreamRoom,
  ParticipantSortStrategy,
} from "../../../src/index";
import ParticipantTileContent from "./participant-tile";

type MeetingViewProps = {
  setShowParticipantList: () => void;
}

export default function MeetingView({ setShowParticipantList }: MeetingViewProps) {
  // Initialize the meeting room with active speaker promotion enabled
  const meeting = useStreamRoom({
    defaultSortStrategy: ParticipantSortStrategy.ROLE_BASED,
    enableSpeakerEvents: true,
    autoPromoteActiveSpeakers: true, // Enable automatic speaker promotion
  });

  // State to track if we should force refresh the view
  const [, setRefreshTrigger] = useState(0);

  // Listen for speaking events to force UI updates
  useEffect(() => {
    const handleSpeakingStarted = () => {
      // Force a re-render when someone starts speaking
      // This ensures the sorted participants list is recalculated
      setRefreshTrigger(prev => prev + 1);
    };

    const handleSpeakingStopped = () => {
      // Force a re-render when someone stops speaking
      setRefreshTrigger(prev => prev + 1);
    };

    meeting.on("speakingStarted", handleSpeakingStarted);
    meeting.on("speakingStopped", handleSpeakingStopped);

    return () => {
      meeting.off("speakingStarted", handleSpeakingStarted);
      meeting.off("speakingStopped", handleSpeakingStopped);
    };
  }, [meeting]);

  // Determine mobile view
  const isMobileView = meeting.screenSize === "xs" || meeting.screenSize === "sm";

  // Get max visible participants based on screen size
  const getMaxVisibleParticipants = () => {
    if (meeting.screenSize === "xs" || meeting.screenSize === "sm") return 2;
    if (meeting.screenSize === "md") return 2;
    if (meeting.screenSize === "lg") return 2;
    return 2; // xl
  };

  // Get sorted participants with active speaker priority
  const allParticipants = useMemo(() => {
    // When getting sorted participants, active speakers will be automatically prioritized
    return meeting.getSortedParticipants({
      strategy: ParticipantSortStrategy.ROLE_BASED,
      prioritizeActiveSpeakers: true, // Ensure active speakers are prioritized
    });
  }, [meeting, meeting.participants.speaking, meeting.participants.currentActiveSpeaker]);

  // Get current active speaker for highlighting
  const activeSpeaker = meeting.participants.currentActiveSpeaker;

  // Separate host
  const hostParticipant = meeting.participants.host;

  // Get camera tracks for display
  const getCameraTrackForParticipant = (
    participant: SDKParticipant
  ): SDKTrackReference | null => {
    const tracks = meeting.getParticipantTracks(participant.identity);
    return (
      tracks.find(
        (t) => t.source === SDKTrackSource.Camera || t.source === "camera"
      ) || null
    );
  };

  // Calculate visible participants and overflow
  const maxVisible = getMaxVisibleParticipants();
  
  // Important: Make sure active speakers are included in visible participants
  const visibleParticipants = useMemo(() => {
    const sorted = allParticipants;
    
    // If there's an active speaker in overflow, swap them with a non-speaking participant
    if (activeSpeaker) {
      const activeSpeakerIndex = sorted.findIndex(p => p.identity === activeSpeaker);
      
      // If active speaker is beyond visible range, move them up
      if (activeSpeakerIndex >= maxVisible) {
        // Find the last non-speaking participant in visible range
        for (let i = maxVisible - 1; i >= 0; i--) {
          if (!meeting.isParticipantSpeaking(sorted[i].identity)) {
            // Swap positions
            const temp = sorted[i];
            sorted[i] = sorted[activeSpeakerIndex];
            sorted[activeSpeakerIndex] = temp;
            break;
          }
        }
      }
    }
    
    return sorted.slice(0, maxVisible);
  }, [allParticipants, maxVisible, activeSpeaker, meeting]);
  
  const overflowParticipants = allParticipants.slice(maxVisible);
  const overflowCount = overflowParticipants.length;

  // Get participant metadata helper
  const getParticipantMetadata = (participant: SDKParticipant) => {
    const metadata = participant.metadata
      ? JSON.parse(participant.metadata)
      : {};

    return {
      userName: metadata.userName || participant.identity,
      avatarUrl: metadata.avatarUrl || "",
      initials: (metadata.userName || participant.identity || "")
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  };

  // Get bottom row participants for screen share layout
  const getBottomRowParticipants = (): SDKParticipant[] => {
    if (!meeting.tracks.screenShare) return [];

    const screenSharerIdentity = meeting.tracks.screenShare.participant?.identity;
    const participants: SDKParticipant[] = [];

    // Prioritize active speakers first
    if (activeSpeaker && activeSpeaker !== screenSharerIdentity) {
      const activeSpeakerParticipant = allParticipants.find(p => p.identity === activeSpeaker);
      if (activeSpeakerParticipant) {
        participants.push(activeSpeakerParticipant);
      }
    }

    // Add host if they're not screen sharing and not already added
    if (hostParticipant && 
        hostParticipant.identity !== screenSharerIdentity &&
        hostParticipant.identity !== activeSpeaker) {
      participants.push(hostParticipant);
    }

    // Add other participants
    visibleParticipants.forEach((p) => {
      if (
        p.identity !== screenSharerIdentity &&
        !participants.find((existing) => existing.identity === p.identity)
      ) {
        participants.push(p);
      }
    });

    // Add screen sharer if not already included
    if (
      screenSharerIdentity &&
      !participants.find((p) => p.identity === screenSharerIdentity)
    ) {
      const screenSharer = allParticipants.find(
        (p) => p.identity === screenSharerIdentity
      );
      if (screenSharer) participants.push(screenSharer);
    }

    return participants;
  };

  // Render overflow indicator
  const renderOverflow = (count: number): ReactElement | null => {
    if (count <= 0) return null;

    const displayedAvatars = overflowParticipants.slice(0, 4);

    return (
      <div
        className="flex flex-col items-center justify-center bg-white bg-opacity-10 rounded-lg p-4 h-full w-full cursor-pointer"
        onClick={setShowParticipantList}
      >
        <div className="flex mb-2">
          {displayedAvatars.map((participant, index) => {
            const { avatarUrl, initials } = getParticipantMetadata(participant);
            const colors = [
              "bg-blue-400",
              "bg-red-400",
              "bg-green-400",
              "bg-primary",
            ];

            return (
              <div
                key={participant.identity || `overflow-${index}`}
                className={`w-8 h-8 rounded-full ${
                  colors[index % colors.length]
                } ${
                  index > 0 ? "-ml-1" : ""
                } flex items-center justify-center text-xs text-white overflow-hidden`}
                style={{ zIndex: 10 - index }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={initials}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
            );
          })}
        </div>
        <p className="text-gray-400 text-sm">People on the call</p>
        <div className="mt-2 px-4 py-1 bg-white bg-opacity-10 rounded-full">
          <span className="text-gray-200">+{count}</span>
        </div>
      </div>
    );
  };

  // Render participant with active speaker highlighting
  const renderParticipant = (
    participant: SDKParticipant,
    track: SDKTrackReference | null
  ): ReactElement | null => {
    if (!participant) return null;

    const isActive = participant.identity === activeSpeaker;
    const isSpeaking = meeting.isParticipantSpeaking(participant.identity);
    const isLocalParticipant = participant.identity === meeting.participants.local?.identity;

    // Get track states
    let isCameraOn = false;
    let isMicrophoneOn = false;

    if (track) {
      isCameraOn = track.publication ? !track.publication.isMuted : false;

      // Check for microphone track
      const micTrack = meeting
        .getParticipantTracks(participant.identity)
        .find(
          (t) =>
            t.source === SDKTrackSource.Microphone || t.source === "microphone"
        );

      isMicrophoneOn = micTrack?.publication
        ? !micTrack.publication.isMuted
        : false;
    }

    // Check if this is screen share
    const isScreenShare =
      track &&
      (track.source === SDKTrackSource.ScreenShare ||
        track.source === "screen_share");

    const uniqueKey = `${participant.sid}-${track?.source || "no-track"}`;

    return (
      <div key={uniqueKey} className="h-full w-full">
        <div
          className={`relative rounded-lg overflow-hidden bg-red-900 h-full w-full transition-all duration-300 ${
            isActive 
              ? "ring-4 ring-primary shadow-lg scale-[1.02]" 
              : isSpeaking 
                ? "ring-2 ring-primary/50" 
                : ""
          }`}
        >
          {/* Speaking indicator */}
          {(isActive || isSpeaking) && !isScreenShare && (
            <div className="absolute top-2 right-2 z-20">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-100" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-200" />
              </div>
            </div>
          )}

          {isScreenShare ? (
            // Screen share view
            <div className="h-full w-full flex items-center justify-center">
              <VideoTrack
                trackRef={track}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {isCameraOn && track ? (
                // Camera on
                <div className="relative w-full h-full">
                  <div className="absolute inset-0">
                    <VideoTrack
                      trackRef={track}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute inset-0">
                    <ParticipantTileContent
                      participant={participant}
                      isLocal={isLocalParticipant}
                      isCameraOn={isCameraOn}
                      isMicrophoneOn={isMicrophoneOn}
                    />
                  </div>
                </div>
              ) : (
                // Camera off
                <ParticipantTileContent
                  participant={participant}
                  isLocal={isLocalParticipant}
                  isCameraOn={isCameraOn}
                  isMicrophoneOn={isMicrophoneOn}
                />
              )}
            </div>
          )}

          {track && (track.publication?.track || track.track) && (
            <AudioTrack trackRef={track} />
          )}
        </div>
      </div>
    );
  };

  // Render participant element wrapper
  const renderParticipantElement = (
    participant: SDKParticipant | null,
    track?: SDKTrackReference | null
  ) => {
    if (!participant) {
      return (
        <div className="h-full w-full bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">No video</span>
        </div>
      );
    }

    const cameraTrack = track || getCameraTrackForParticipant(participant);
    const key = participant.identity || participant.sid || Math.random().toString();

    return (
      <div key={key} className="h-full w-full">
        {renderParticipant(participant, cameraTrack)}
      </div>
    );
  };

  // Render participant grid
  const renderParticipantGrid = () => {
    const displayedParticipants = visibleParticipants;

    if (displayedParticipants.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          No participants
        </div>
      );
    }

    const participantCount = displayedParticipants.length;
    const totalWithOverflow = participantCount + (overflowCount > 0 ? 1 : 0);

    // MOBILE LAYOUT LOGIC
    if (isMobileView) {
      if (participantCount === 1 && overflowCount === 0) {
        return (
          <div className="h-full w-full">
            {renderParticipantElement(displayedParticipants[0])}
          </div>
        );
      } else if (participantCount === 2 && overflowCount === 0) {
        return (
          <div className="grid grid-rows-2 gap-2 h-full">
            {displayedParticipants.map((participant) => (
              <div key={participant.identity} className="h-full w-full">
                {renderParticipantElement(participant)}
              </div>
            ))}
          </div>
        );
      } else if (participantCount === 3 && overflowCount === 0) {
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {displayedParticipants.map((participant) => (
              <div key={participant.identity} className="h-full w-full">
                {renderParticipantElement(participant)}
              </div>
            ))}
          </div>
        );
      } else if (totalWithOverflow === 4) {
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedParticipants[0])}
            </div>

            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedParticipants[1])}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {displayedParticipants.slice(2).map((participant) => (
                <div
                  key={participant.identity}
                  className="relative overflow-hidden"
                >
                  {renderParticipantElement(participant)}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="relative overflow-hidden">
                  {renderOverflow(overflowCount)}
                </div>
              )}
            </div>
          </div>
        );
      } else if (totalWithOverflow === 5) {
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedParticipants[0])}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {displayedParticipants.slice(1, 3).map((participant) => (
                <div
                  key={participant.identity}
                  className="relative overflow-hidden"
                >
                  {renderParticipantElement(participant)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {displayedParticipants.slice(3).map((participant) => (
                <div
                  key={participant.identity}
                  className="relative overflow-hidden"
                >
                  {renderParticipantElement(participant)}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="relative overflow-hidden">
                  {renderOverflow(overflowCount)}
                </div>
              )}
            </div>
          </div>
        );
      } else if (totalWithOverflow === 6) {
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-2 gap-2">
                {displayedParticipants
                  .slice(rowIndex * 2, rowIndex * 2 + 2)
                  .map((participant) => (
                    <div
                      key={participant.identity}
                      className="relative overflow-hidden"
                    >
                      {renderParticipantElement(participant)}
                    </div>
                  ))}
                {rowIndex === 2 &&
                  overflowCount > 0 &&
                  displayedParticipants.length <= 5 && (
                    <div className="relative overflow-hidden">
                      {renderOverflow(overflowCount)}
                    </div>
                  )}
              </div>
            ))}
          </div>
        );
      } else {
        const maxVisibleItems = 8;
        const visibleParticipants = displayedParticipants.slice(
          0,
          maxVisibleItems
        );

        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-3 gap-2">
                {visibleParticipants
                  .slice(rowIndex * 3, rowIndex * 3 + 3)
                  .map((participant) => (
                    <div
                      key={participant.identity}
                      className="relative overflow-hidden"
                    >
                      {renderParticipantElement(participant)}
                    </div>
                  ))}
                {rowIndex === 2 &&
                  overflowCount > 0 &&
                  visibleParticipants.length <= rowIndex * 3 + 2 && (
                    <div className="relative overflow-hidden">
                      {renderOverflow(overflowCount)}
                    </div>
                  )}
              </div>
            ))}
          </div>
        );
      }
    }

    // DESKTOP LAYOUT LOGIC
    if (participantCount === 1 && overflowCount === 0) {
      return (
        <div className="h-full w-full relative overflow-hidden">
          {renderParticipantElement(displayedParticipants[0])}
        </div>
      );
    } else if (participantCount === 2 && overflowCount === 0) {
      return (
        <div className="flex gap-2 h-full">
          {displayedParticipants.map((participant) => (
            <div key={participant.identity} className="flex-1 h-full">
              {renderParticipantElement(participant)}
            </div>
          ))}
        </div>
      );
    } else if (participantCount === 3 && overflowCount === 0) {
      return (
        <div className="grid grid-cols-3 gap-2 h-full">
          {displayedParticipants.map((participant) => (
            <div key={participant.identity} className="col-span-1 h-full">
              {renderParticipantElement(participant)}
            </div>
          ))}
        </div>
      );
    } else if (participantCount === 4 && overflowCount === 0) {
      return (
        <div className="grid grid-cols-4 gap-2 h-full">
          {displayedParticipants.map((participant) => (
            <div key={participant.identity} className="col-span-1 h-full">
              {renderParticipantElement(participant)}
            </div>
          ))}
        </div>
      );
    } else {
      const totalItems = participantCount + (overflowCount > 0 ? 1 : 0);
      const itemsPerRow = Math.ceil(totalItems / 2);
      const firstRowCount = Math.min(itemsPerRow, displayedParticipants.length);
      const firstRowParticipants = displayedParticipants.slice(
        0,
        firstRowCount
      );
      const secondRowParticipants = displayedParticipants.slice(firstRowCount);

      return (
        <div className="flex flex-col h-full gap-2">
          <div className="flex gap-2 h-1/2">
            {firstRowParticipants.map((participant) => (
              <div key={participant.identity} className="flex-1 h-full">
                {renderParticipantElement(participant)}
              </div>
            ))}
          </div>
          <div className="flex gap-2 h-1/2">
            {secondRowParticipants.map((participant) => (
              <div key={participant.identity} className="flex-1 h-full">
                {renderParticipantElement(participant)}
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="flex-1 h-full">
                {renderOverflow(overflowCount)}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full bg-[var(--sdk-bg-primary-color)] p-2">
      {meeting.tracks.screenShare ? (
        // Screen sharing layout
        isMobileView ? (
          // Mobile screen sharing layout
          <div className="flex flex-col gap-2 h-full">
            <div className="h-1/2">
              {renderParticipantElement(
                meeting.tracks.screenShare.participant,
                meeting.tracks.screenShare
              )}
            </div>

            <div className="h-1/2">
              <div className="flex gap-2 h-full">
                {getBottomRowParticipants()
                  .slice(0, 2)
                  .map((participant) => (
                    <div key={participant.identity} className="flex-1 h-full">
                      {renderParticipantElement(participant)}
                    </div>
                  ))}
                {(getBottomRowParticipants().length > 2 ||
                  overflowCount > 0) && (
                  <div className="flex-1 h-full">
                    {renderOverflow(
                      getBottomRowParticipants().length > 2
                        ? getBottomRowParticipants().length - 2 + overflowCount
                        : overflowCount
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Desktop screen sharing layout
          <div className="flex h-full gap-2">
            <div className="w-8/12 h-full overflow-hidden">
              {renderParticipantElement(
                meeting.tracks.screenShare.participant,
                meeting.tracks.screenShare
              )}
            </div>
            <div className="w-4/12 h-full">
              {getBottomRowParticipants().length > 4 ? (
                <div className="grid grid-cols-2 gap-2 h-full">
                  {getBottomRowParticipants().map((participant) => (
                    <div
                      key={participant.identity}
                      className="relative overflow-hidden"
                    >
                      {renderParticipantElement(participant)}
                    </div>
                  ))}
                  {overflowCount > 0 && (
                    <div className="relative overflow-hidden">
                      {renderOverflow(overflowCount)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 h-full">
                  {getBottomRowParticipants().map((participant) => (
                    <div
                      key={participant.identity}
                      className="flex-1 overflow-hidden"
                    >
                      {renderParticipantElement(participant)}
                    </div>
                  ))}
                  {overflowCount > 0 && (
                    <div className="flex-1 overflow-hidden">
                      {renderOverflow(overflowCount)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // No screen share - use the grid layout
        renderParticipantGrid()
      )}
    </div>
  );
}