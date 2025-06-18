import { ReactElement } from "react";
import {
  VideoTrack,
  AudioTrack,
  TrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import ParticipantView from "./participant";
import { useMeeting } from "../hooks/index";
import {
  checkParticipantMicEnabled,
  checkIfLocalParticipant,
} from "../utils/index";
import ParticipantControls from "./participant-controls";

interface MeetingViewProps {
  hasAgenda?: boolean;
}

export default function MeetingView({
  hasAgenda = false,
}: MeetingViewProps) {
  const {
    activeSpeaker,
    screenShareTrack,
    mainDisplayTrack,
    overflowCount,
    getBottomRowParticipants,
    calculateLayoutType,
    cameraTracks,
    overflowTracks,
    room,
    screenSize,
    coHostTracks,
    getMaxVisibleCoHosts,
  } = useMeeting(
    {
    maxVisibleCoHosts: {
      xs: 12,
      sm: 12,
    },
  }
);

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

  // Updated renderParticipant function with consistent sizing
  const renderParticipant = (
    track: TrackReference,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isMainHost = false
  ): ReactElement | null => {
    if (!track || !track.participant) return null;

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
          className={`relative rounded-lg overflow-hidden bg-red-900 h-full w-full ${
            isActive ? "ring-2 ring-primary" : ""
          }`}
        >
          {isScreenShare ? (
            // Screen share view with proper constraints
            <div className="h-full w-full flex items-center justify-center">
              <VideoTrack
                trackRef={track}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {isCameraOn ? (
                // Camera on - maintain consistent sizing with absolute positioning
                <div className="relative w-full h-full">
                  <div className="absolute inset-0">
                    <VideoTrack
                      trackRef={track}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Add ParticipantControls on video view */}
                  <div className="absolute inset-0">
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
                </div>
              ) : (
                // Camera off - ParticipantView
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
    // Get all camera tracks including ones beyond the display limit
    const allCameraTracks = [mainDisplayTrack, ...coHostTracks].filter(Boolean);
    const maxVisible = getMaxVisibleCoHosts();
    
    // Calculate what should be displayed vs overflow
    const displayedTracks = allCameraTracks.slice(0, maxVisible);
    const overflowTracksCount = allCameraTracks.length - maxVisible;
    const hasOverflow = overflowTracksCount > 0;
    
    if (displayedTracks.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          No participants
        </div>
      );
    }

    const participantCount = displayedTracks.length;
    const totalWithOverflow = participantCount + (hasOverflow ? 1 : 0);

    // MOBILE LAYOUT LOGIC
    if (isMobileView) {
      if (participantCount === 1 && !hasOverflow) {
        // Single participant - take up full space
        return (
          <div className="h-full w-full">
            {renderParticipantElement(
              displayedTracks[0],
              displayedTracks[0] === mainDisplayTrack
            )}
          </div>
        );
      } else if (participantCount === 2 && !hasOverflow) {
        // Two participants - evenly divide space (original layout)
        return (
          <div className="grid grid-rows-2 gap-2 h-full">
            {displayedTracks.map((track, index) => (
              <div key={index} className="h-full w-full">
                {renderParticipantElement(track, track === mainDisplayTrack)}
              </div>
            ))}
          </div>
        );
      } else if (participantCount === 3 && !hasOverflow) {
        // Exactly 3 participants - 3 rows (original layout)
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {displayedTracks.map((track, index) => (
              <div key={index} className="h-full w-full">
                {renderParticipantElement(track, track === mainDisplayTrack)}
              </div>
            ))}
          </div>
        );
      } else if (totalWithOverflow === 4) {
        // 4 items total: 1 top (full width), 1 middle (full width), 2 bottom
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {/* Top row - 1 participant full width */}
            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedTracks[0], displayedTracks[0] === mainDisplayTrack)}
            </div>
            
            {/* Middle row - 1 participant full width */}
            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedTracks[1], displayedTracks[1] === mainDisplayTrack)}
            </div>
            
            {/* Bottom row - 2 items */}
            <div className="grid grid-cols-2 gap-2">
              {displayedTracks.slice(2).map((track, index) => (
                <div key={index} className="relative overflow-hidden">
                  {renderParticipantElement(track, track === mainDisplayTrack)}
                </div>
              ))}
              {hasOverflow && (
                <div className="relative overflow-hidden">
                  {renderOverflow(overflowTracksCount)}
                </div>
              )}
            </div>
          </div>
        );
      } else if (totalWithOverflow === 5) {
        // 5 items total: 1 top (full width), 2 middle, 2 bottom
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {/* Top row - 1 participant full width */}
            <div className="relative overflow-hidden">
              {renderParticipantElement(displayedTracks[0], displayedTracks[0] === mainDisplayTrack)}
            </div>
            
            {/* Middle row - 2 participants */}
            <div className="grid grid-cols-2 gap-2">
              {displayedTracks.slice(1, 3).map((track, index) => (
                <div key={index} className="relative overflow-hidden">
                  {renderParticipantElement(track, track === mainDisplayTrack)}
                </div>
              ))}
            </div>
            
            {/* Bottom row - 2 items */}
            <div className="grid grid-cols-2 gap-2">
              {displayedTracks.slice(3).map((track, index) => (
                <div key={index} className="relative overflow-hidden">
                  {renderParticipantElement(track, track === mainDisplayTrack)}
                </div>
              ))}
              {hasOverflow && (
                <div className="relative overflow-hidden">
                  {renderOverflow(overflowTracksCount)}
                </div>
              )}
            </div>
          </div>
        );
      } else if (totalWithOverflow === 6) {
        // 6 items total: 2 per row across 3 rows
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-2 gap-2">
                {displayedTracks.slice(rowIndex * 2, rowIndex * 2 + 2).map((track, index) => (
                  <div key={index} className="relative overflow-hidden">
                    {renderParticipantElement(track, track === mainDisplayTrack)}
                  </div>
                ))}
                {rowIndex === 2 && hasOverflow && displayedTracks.length <= 5 && (
                  <div className="relative overflow-hidden">
                    {renderOverflow(overflowTracksCount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      } else {
        // More than 6 items - use max 3x3 grid with overflow
        const maxVisibleItems = 8; // 3x3 grid minus 1 for overflow
        const visibleParticipants = displayedTracks.slice(0, maxVisibleItems);
        
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-3 gap-2">
                {visibleParticipants.slice(rowIndex * 3, rowIndex * 3 + 3).map((track, index) => (
                  <div key={index} className="relative overflow-hidden">
                    {renderParticipantElement(track, track === mainDisplayTrack)}
                  </div>
                ))}
                {rowIndex === 2 && hasOverflow && visibleParticipants.length <= rowIndex * 3 + 2 && (
                  <div className="relative overflow-hidden">
                    {renderOverflow(overflowTracksCount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
    }

    // DESKTOP LAYOUT LOGIC
    if (participantCount === 1 && !hasOverflow) {
      // Single participant - take up full space with fixed container
      return (
        <div className="h-full w-full relative overflow-hidden">
          {displayedTracks[0] &&
            renderParticipantElement(displayedTracks[0], true)}
        </div>
      );
    } else if (participantCount === 2 && !hasOverflow) {
      // 2 participants
      return (
        <div className={`${hasAgenda ? "flex flex-col" : "flex"} gap-2 h-full`}>
          {displayedTracks.map((track, index) => (
            <div key={index} className="flex-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    } else if (participantCount === 3 && !hasOverflow) {
      return (
        <div className="grid grid-cols-3 gap-2 h-full">
          {displayedTracks.map((track, index) => (
            <div key={index} className="col-span-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    } else if (participantCount === 4 && !hasOverflow) {
      return (
        <div className="grid grid-cols-4 gap-2 h-full">
          {displayedTracks.map((track, index) => (
            <div key={index} className="col-span-1 h-full">
              {renderParticipantElement(track, track === mainDisplayTrack)}
            </div>
          ))}
        </div>
      );
    } else {
      // For more than 4 participants or when overflow exists
      const totalItems = participantCount + (hasOverflow ? 1 : 0);
      const itemsPerRow = Math.ceil(totalItems / 2);
      const firstRowCount = Math.min(itemsPerRow, displayedTracks.length);
      const firstRowParticipants = displayedTracks.slice(0, firstRowCount);
      const secondRowParticipants = displayedTracks.slice(firstRowCount);

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
            {hasOverflow && (
              <div className="flex-1 h-full">
                {renderOverflow(overflowTracksCount)}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full bg-[var(--sdk-bg-primary-color)]">
      {layoutType === "multi-participant-with-agenda" ? (
        <div className="h-full">
          <div className="flex h-[70%] mb-2">
            <div className="w-9/12 pr-2">
              <div className="h-full">
                {renderParticipantGrid()}
              </div>
            </div>
            <div className="w-3/12">{renderAgenda()}</div>
          </div>
          <div className="h-[30%]">
            <div className="flex gap-2 h-full">
              {/* Empty bottom row for this layout type */}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full">
          <div className={`${hasAgenda ? "w-9/12" : "w-full"} h-full p-2`}>
            {screenShareTrack ? (
              // Screen sharing layout
              isMobileView ? (
                // Mobile screen sharing layout - reverted to original
                <div className="flex flex-col gap-2 h-full">
                  {/* Screen share - taller row for visual priority */}
                  <div className="h-1/2">
                    {renderParticipantElement(screenShareTrack)}
                  </div>

                  {/* Remaining participants in lower half */}
                  <div className="h-1/2">
                    <div className="flex gap-2 h-full">
                      {getBottomRowParticipants().slice(0, 2).map((track, index) => (
                        <div key={index} className="flex-1 h-full">
                          {renderParticipantElement(track)}
                        </div>
                      ))}
                      {(getBottomRowParticipants().length > 2 || overflowCount > 0) && (
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
              ) : hasAgenda ? (
                // Desktop with agenda and screen sharing
                <div className="flex flex-col h-full gap-2">
                  <div className="h-[70%] overflow-hidden">
                    {renderParticipantElement(screenShareTrack)}
                  </div>
                  <div className="h-[30%]">
                    <div className="flex gap-2 h-full">
                      {getBottomRowParticipants().map((track, index) => (
                        <div key={index} className="flex-1 h-full overflow-hidden">
                          {renderParticipantElement(track)}
                        </div>
                      ))}
                      {overflowCount > 0 && (
                        <div className="flex-1 h-full overflow-hidden">
                          {renderOverflow(overflowCount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Desktop without agenda, with screen sharing
                <div className="flex h-full gap-2">
                  <div className="w-8/12 h-full overflow-hidden">
                    {renderParticipantElement(screenShareTrack)}
                  </div>
                  <div className="w-4/12 h-full">
                    {getBottomRowParticipants().length > 4 ? (
                      // More than 4 participants - use 2 column grid
                      <div className="grid grid-cols-2 gap-2 h-full">
                        {getBottomRowParticipants().map((track, index) => (
                          <div key={index} className="relative overflow-hidden">
                            {renderParticipantElement(track)}
                          </div>
                        ))}
                        {overflowCount > 0 && (
                          <div className="relative overflow-hidden">
                            {renderOverflow(overflowCount)}
                          </div>
                        )}
                      </div>
                    ) : (
                      // 4 or fewer participants - use single column
                      <div className="flex flex-col gap-2 h-full">
                        {getBottomRowParticipants().map((track, index) => (
                          <div key={index} className="flex-1 overflow-hidden">
                            {renderParticipantElement(track)}
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
              // No screen share - use the grid layout helper
              renderParticipantGrid()
            )}
          </div>
          {hasAgenda && !isMobileView && cameraTracks.length <= 2 && (
            <div className="w-3/12 pl-2 h-full">{renderAgenda()}</div>
          )}
        </div>
      )}
    </div>
  );
}