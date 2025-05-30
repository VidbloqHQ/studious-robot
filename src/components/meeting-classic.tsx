import React, { ReactElement } from "react";
import { VideoTrack, AudioTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { TrackReference } from "@livekit/components-react";
import ParticipantView from "./participant";
import { useMeeting } from "../hooks/index";
import { 
  checkParticipantMicEnabled, 
  checkIfLocalParticipant 
} from "../utils/index";
import ParticipantControls from "./participant-controls";

interface MeetingViewProps {
  hasAgenda?: boolean;
  className?: string;
  style?: React.CSSProperties;
  components?: {
    AgendaComponent?: React.FC;
    ParticipantComponent?: React.FC<{
      track: TrackReference;
      isMainHost?: boolean;
      isActive: boolean;
    }>;
    OverflowComponent?: React.FC<{
      count: number;
      overflowTracks: TrackReference[];
    }>;
  };
}

export default function MeetingView({
  hasAgenda = false,
  className = "",
  style,
  components,
}: MeetingViewProps) {
  const {
    activeSpeaker,
    screenShareTrack,
    mainDisplayTrack,
    displayedCoHosts,
    overflowCount,
    getBottomRowParticipants,
    calculateLayoutType,
    cameraTracks,
    overflowTracks,
    room,
    screenSize,
  } = useMeeting();
  
  // Determine mobile view at the component level
  const isMobileView = screenSize === "xs" || screenSize === "sm";

  // Current layout type based on participants and agenda
  const layoutType = calculateLayoutType(hasAgenda);

  const getParticipantMetadata = (track: TrackReference) => {
    if (!track.participant) return { userName: "Unknown", avatarUrl: "" };

    const metadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};

    return {
      userName: metadata.userName || track.participant.identity,
      avatarUrl: metadata.avatarUrl || "",
      initials: (metadata.userName || track.participant.identity || "")
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  };

  // Render the overflow indicator
  const renderOverflow = (count: number): ReactElement | null => {
    if (count <= 0) return null;

    // Use custom component if provided
    if (components?.OverflowComponent) {
      return React.createElement(components.OverflowComponent, { count, overflowTracks });
    }

    const displayedAvatars = overflowTracks.slice(0, 4);
    return (
      <div className="flex flex-col items-center justify-center bg-white bg-opacity-10 rounded-lg p-4 h-full w-full">
        <div className="flex mb-2">
          {displayedAvatars.map((track, index) => {
            const { avatarUrl, initials } = getParticipantMetadata(track);
            const colors = [
              "bg-blue-400",
              "bg-red-400",
              "bg-green-400",
              "bg-primary",
            ];

            return (
              <div
                key={track.participant?.identity || `overflow-${index}`}
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

  // Render agenda section
  const renderAgenda = (): ReactElement => {
    // Use custom agenda component if provided
    if (components?.AgendaComponent) {
      return React.createElement(components.AgendaComponent);
    }

    return (
      <div className="bg-white rounded-lg h-full p-5 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-base">Agenda</h2>
          <span className="text-gray-400 text-sm">1/4</span>
        </div>

        <div className="relative">
          <div className="absolute top-0 bottom-0 left-1.5 border-l border-dashed border-gray-200 z-0"></div>

          <div className="space-y-8 relative z-10">
            <div className="flex">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
              <div className="ml-5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-800 uppercase">
                    POLL
                  </h3>
                  <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                    12m
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Members are expected to participate in a poll
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
              <div className="ml-5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-800 uppercase">
                    Q&A
                  </h3>
                  <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                    15m
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Questions and answers
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
              <div className="ml-5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-800 uppercase">
                    GIVEAWAY
                  </h3>
                  <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                    10m
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Opportunity to be gifted
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-300 flex-shrink-0 mt-1.5"></div>
              <div className="ml-5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-800 uppercase">
                    NEXT STEPS
                  </h3>
                  <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                    20m
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Opportunity to be gifted
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-500 text-center">
          Hover on an "agenda" to remove or edit it.
        </div>

        <button className="w-full mt-4 bg-primary-light text-text-primary py-2 rounded-md text-sm">
          Add Agenda
        </button>
      </div>
    );
  };

// Updated renderParticipant function with height constraint for camera on state
const renderParticipant = (
  track: TrackReference,
  isMainHost = false
): ReactElement | null => {
  if (!track || !track.participant) return null;

  if (components?.ParticipantComponent) {
    return React.createElement(components.ParticipantComponent, {
      track,
      isMainHost,
      isActive: track.participant.identity === activeSpeaker,
    });
  }

  // Check camera status
  const isCameraOn = track.publication && !track.publication.isMuted;
  
  // Use the utility function for microphone status
  const isMicrophoneOn = checkParticipantMicEnabled(track.participant);

  const isScreenShare =
    track.source === Track.Source.ScreenShare &&
    track.publication?.isSubscribed &&
    track.publication?.isEnabled;

  const isActive = track.participant.identity === activeSpeaker;
  const uniqueKey = `${track.participant.sid}-${track.source}`;
  
  // Use the utility function for local participant check
  const isLocalParticipant = checkIfLocalParticipant(track.participant, room);

  return (
    <div key={uniqueKey} className="h-full w-full">
      <div
        className={`relative rounded-lg overflow-hidden bg-red-900 h-full ${
          isActive ? "ring-2 ring-primary" : ""
        }`}
      >
        {isScreenShare ? (
          // Screen share view remains full height but with max-height constraint
          <div className="h-full w-full max-h-[calc(100vh-160px)]">
            <VideoTrack
              trackRef={track}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            {isCameraOn ? (
              // KEY FIX: Explicitly limit the video height with max-height
              <div className="relative w-full h-full" style={{ maxHeight: "calc(100vh - 160px)" }}>
                <VideoTrack
                  trackRef={track}
                  className="w-full h-full object-cover"
                />
                
                {/* Add ParticipantControls on video view */}
                <ParticipantControls
                  participant={track.participant}
                  isLocal={isLocalParticipant}
                  isMicrophoneEnabled={isMicrophoneOn}
                  isCameraEnabled={isCameraOn}
                  onGiftClick={(participant) => {
                    console.log("Gift clicked for", participant.identity);
                  }}
                />
              </div>
            ) : (
              // Camera off - ParticipantView (already has correct sizing)
              <ParticipantView 
                participant={track.participant}
                isLocal={isLocalParticipant}
                isMicrophoneEnabled={isMicrophoneOn}
                isCameraEnabled={isCameraOn}
                onGiftClick={(participant) => {
                  console.log("Gift clicked for", participant.identity);
                }}
              />
            )}
          </div>
        )}

        {track.publication?.track && <AudioTrack trackRef={track} />}
      </div>
    </div>
  );
};

  // Render participant with key wrapper
  const renderParticipantElement = (
    track: TrackReference,
    isMainHost = false
  ) => {
    if (!track) {
      return (
        <div className="h-full w-full bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">No video</span>
        </div>
      );
    }
    
    const key =
      track.participant?.identity ||
      track.participant?.sid ||
      Math.random().toString();
    return (
      <div key={key} className="h-full w-full">
        {renderParticipant(track, isMainHost)}
      </div>
    );
  };

  // MOBILE LAYOUT LOGIC
  const renderParticipantGrid = () => {
    const allParticipants = [mainDisplayTrack, ...displayedCoHosts].filter(Boolean);
    if (allParticipants.length === 0) {
      return <div className="h-full w-full flex items-center justify-center text-gray-400">No participants</div>;
    }
    
    const participantCount = allParticipants.length;
    // Use screenSize from the top-level hook call rather than calling it again
    const isMobileView = screenSize === "xs" || screenSize === "sm";
    
    // MOBILE LAYOUT LOGIC
    if (isMobileView) {
      // Adjust grid rows based on participant count
      if (participantCount === 1) {
        // Single participant - take up full space
        return (
          <div className="h-full w-full">
            {renderParticipantElement(allParticipants[0], allParticipants[0] === mainDisplayTrack)}
          </div>
        );
      } else if (participantCount === 2) {
        // Two participants - evenly divide space
        return (
          <div className="grid grid-rows-2 gap-2 h-full">
            {allParticipants.map((track, index) => (
              <div key={index} className="h-full w-full">
                {renderParticipantElement(track, track === mainDisplayTrack)}
              </div>
            ))}
          </div>
        );
      } else if (participantCount === 3) {
        // Exactly 3 participants - 3 rows with last participant taking full width
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {/* First two participants */}
            {allParticipants.slice(0, 2).map((track, index) => (
              <div key={index} className="h-full w-full">
                {renderParticipantElement(track, track === mainDisplayTrack)}
              </div>
            ))}
            
            {/* Third participant - full width */}
            <div className="h-full w-full">
              {renderParticipantElement(allParticipants[2], allParticipants[2] === mainDisplayTrack)}
            </div>
          </div>
        );
      } else {
        // More than 3 participants - use 3 rows with last row for remaining + overflow
        const firstParticipant = allParticipants[0];
        const secondParticipant = allParticipants[1];
        const remainingParticipants = allParticipants.slice(2);
        
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {/* First row - first participant */}
            <div className="h-full w-full">
              {renderParticipantElement(firstParticipant, firstParticipant === mainDisplayTrack)}
            </div>
            
            {/* Second row - second participant */}
            <div className="h-full w-full">
              {renderParticipantElement(secondParticipant, secondParticipant === mainDisplayTrack)}
            </div>
            
            {/* Third row - all remaining participants + overflow */}
            <div className="grid grid-cols-2 gap-2 h-full">
              {remainingParticipants.map((track, index) => (
                <div key={index} className="h-full w-full">
                  {renderParticipantElement(track, track === mainDisplayTrack)}
                </div>
              ))}
              
              {/* Include overflow in the third row */}
              {overflowCount > 0 && (
                <div className="h-full w-full">
                  {renderOverflow(overflowCount)}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    
    // DESKTOP LAYOUT LOGIC - For 3 participants, use a single row with evenly distributed columns
    if (participantCount === 3) {
      return (
        <div className="grid grid-cols-3 gap-2 h-full">
          {allParticipants.map((track, index) => (
            <div key={index} className="col-span-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    }
    
    // For 4 participants, use a single row with 4 equal columns
    if (participantCount === 4) {
      return (
        <div className="grid grid-cols-4 gap-2 h-full">
          {allParticipants.map((track, index) => (
            <div key={index} className="col-span-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    }
    
    // For more than 4 participants, use a 2-row grid layout
    if (participantCount > 4) {
      const firstRowCount = Math.ceil(participantCount / 2);
      const firstRowParticipants = allParticipants.slice(0, firstRowCount);
      const secondRowParticipants = allParticipants.slice(firstRowCount);
      
      return (
        <div className="flex flex-col h-full gap-2">
          <div className="flex gap-2 h-1/2">
            {firstRowParticipants.map((track, index) => (
              <div key={index} className="flex-1 h-full">
                {renderParticipantElement(track, track === mainDisplayTrack)}
              </div>
            ))}
          </div>
          <div className="flex gap-2 h-1/2">
            {secondRowParticipants.map((track, index) => (
              <div key={index} className="flex-1 h-full">
                {renderParticipantElement(track, false)}
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
    
    // For 1-2 participants, keep existing layout
    if (participantCount === 1) {
      return (
        <div className="h-full w-full">
          {allParticipants[0] && renderParticipantElement(allParticipants[0], true)}
        </div>
      );
    } else { // 2 participants
      return (
        <div className={`${hasAgenda ? "flex flex-col" : "flex"} gap-2 h-full`}>
          {allParticipants.map((track, index) => (
            <div key={index} className="flex-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className={`h-full bg-[var(--sdk-bg-primary-color)] ${className}`} style={style}>
      {layoutType === "multi-participant-with-agenda" ? (
        <div className="h-full">
          <div className="flex h-[70%] mb-2">
            <div className="w-9/12 pr-2">
              {screenShareTrack
                ? renderParticipantElement(screenShareTrack)
                : mainDisplayTrack && renderParticipantElement(mainDisplayTrack, true)}
            </div>
            <div className="w-3/12">{renderAgenda()}</div>
          </div>
          <div className="h-[30%]">
            <div className="flex gap-2 h-full">
              {getBottomRowParticipants().map((track) =>
                renderParticipantElement(track)
              )}
              {overflowCount > 0 && renderOverflow(overflowCount)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full">
          <div className={`${hasAgenda ? "w-9/12" : "w-full"} h-full p-2`}>
            {screenShareTrack ? (
              // UPDATED: Handle screen sharing differently on mobile
              isMobileView ? (
                // Mobile screen sharing layout - update to NEVER exceed 3 rows
                <div className="flex flex-col gap-2 h-full">
                  {/* Screen share - taller row for visual priority */}
                  <div className="h-1/2">
                    {screenShareTrack && renderParticipantElement(screenShareTrack)}
                  </div>
                  
                  {/* Remaining participants in lower half */}
                  <div className="h-1/2">
                    {(() => {
                      // Get participants that are visible when screen sharing
                      const visibleBottomRowParticipants = getBottomRowParticipants();
                      const remainingParticipants = visibleBottomRowParticipants.slice(0, 2);
                      // Calculate remaining participants that should go to overflow
                      const remainingOverflowCount = visibleBottomRowParticipants.length > 2 ? 
                        visibleBottomRowParticipants.length - 2 + overflowCount : overflowCount;
                      
                      if (visibleBottomRowParticipants.length === 0) {
                        return <div></div>;
                      } else if (visibleBottomRowParticipants.length === 1) {
                        return (
                          <div className="h-full">
                            {renderParticipantElement(visibleBottomRowParticipants[0])}
                          </div>
                        );
                      } else {
                        // Two or more participants - use 2 rows
                        return (
                          <div className="grid grid-rows-2 gap-2 h-full">
                            {/* First row */}
                            <div className="h-full w-full">
                              {renderParticipantElement(remainingParticipants[0])}
                            </div>
                            
                            {/* Second row - either second participant + overflow or just second participant */}
                            <div className={remainingOverflowCount > 0 ? "grid grid-cols-2 gap-2 h-full" : "h-full"}>
                              {remainingParticipants.length > 1 && (
                                <div className="h-full w-full">
                                  {renderParticipantElement(remainingParticipants[1])}
                                </div>
                              )}
                              
                              {/* Include overflow when needed */}
                              {remainingOverflowCount > 0 && (
                                <div className="h-full w-full">
                                  {renderOverflow(remainingOverflowCount)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              ) : hasAgenda ? (
                // Desktop with agenda and screen sharing
                <div className="flex flex-col h-full gap-2">
                  <div className="h-[70%]">
                    {renderParticipantElement(screenShareTrack)}
                  </div>
                  {/* Apply same 2-column grid logic for agenda layout */}
                  {getBottomRowParticipants().length + overflowCount > 4 ? (
                    <div className="grid grid-cols-2 gap-2 h-[30%]">
                      {getBottomRowParticipants().map((track) =>
                        renderParticipantElement(track)
                      )}
                      {overflowCount > 0 && (
                        <div className="col-span-1">
                          {renderOverflow(overflowCount)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 h-[30%]">
                      {getBottomRowParticipants().map((track) =>
                        renderParticipantElement(track)
                      )}
                      {overflowCount > 0 && renderOverflow(overflowCount)}
                    </div>
                  )}
                </div>
              ) : (
                // Desktop without agenda, with screen sharing
                <div className="flex h-full gap-2">
                  <div className="w-8/12 h-full">
                    {renderParticipantElement(screenShareTrack)}
                  </div>
                  <div className="w-4/12 h-full">
                    {/* More than 4 participants - use a 2-column grid layout */}
                    {getBottomRowParticipants().length + overflowCount > 4 ? (
                      <div className="grid grid-cols-2 gap-2 h-full">
                        {getBottomRowParticipants().map((track, index) => (
                          <div key={track.participant?.identity || index} 
                               className="h-full w-full">
                            {renderParticipantElement(track)}
                          </div>
                        ))}
                        {overflowCount > 0 && (
                          <div className="h-full w-full">
                            {renderOverflow(overflowCount)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 h-full">
                        {getBottomRowParticipants().map((track, index) => (
                          <div key={track.participant?.identity || index} 
                               className="flex-1">
                            {renderParticipantElement(track)}
                          </div>
                        ))}
                        {overflowCount > 0 && (
                          <div className="flex-1">
                            {renderOverflow(overflowCount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              // No screen share - use the grid layout helper
              renderParticipantGrid()
            )}
          </div>
          {hasAgenda && (!isMobileView && cameraTracks.length <= 2) && (
            <div className="w-3/12 pl-2 h-full">{renderAgenda()}</div>
          )}
        </div>
      )}
    </div>
  );
}

