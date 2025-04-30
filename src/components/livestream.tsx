import React, { ReactElement } from "react";
import {
  // useTracks,
  VideoTrack,
  AudioTrack,
  // useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ParticipantMetadata, ParticipantTrack } from "../types";
import ParticipantView from "./participant";
import { useLivestream } from "../hooks/useLivestream";

interface LivestreamViewProps {
  hasAgenda?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Create proper index signature for participant types
// type ParticipantsByType = {
//   [key: string]: ParticipantTrack[];
// };

export default function LivestreamView({
  hasAgenda = true,
  className = "",
  style,
}: LivestreamViewProps) {
  const {
    rawTracks,
    activeSpeaker,
    screenShareTrack,
    screenSharerIdentity,
    mainContent,
    sidebarContent,
    // participantsByType,
    // room
  } = useLivestream();

  // Function to render a participant video/avatar - explicitly typing for TypeScript
  const renderParticipant = (
    track: ParticipantTrack,
    size: "large" | "small" = "large"
  ): ReactElement | null => {
    if (!track.participant) return null;

    const metadata: ParticipantMetadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};
    const isCameraOn = track.publication && !track.publication.isMuted;
    const isScreenShare = track.source === Track.Source.ScreenShare;
    const isActive = track.participant.identity === activeSpeaker;
    const uniqueKey = `${track.participant.sid}-${track.source}-${size}`;
    const userName = metadata.userName || track.participant.identity;
    const userType = metadata.userType || "guest";

    // Determine classes based on size
    const containerClasses =
      size === "large"
        ? "border-red-500 border-4 relative rounded-lg overflow-hidden bg-green-900 h-full w-full"
        : "relative rounded-lg overflow-hidden bg-purple-900 h-full w-full";

    return (
      <div
        key={uniqueKey}
        className={`${containerClasses} ${
          isActive ? "border border-blue-500" : ""
        }`}
      >
        {isScreenShare ? (
          track.publication && !track.publication.isMuted ? (
            <VideoTrack
              trackRef={track}
              className="h-full w-full object-contain"
            />
          ) : null
        ) : isCameraOn ? (
          <div className="aspect-video h-full w-full">
            <VideoTrack
              trackRef={track}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <ParticipantView participant={track.participant} />
        )}

        {track.publication?.track && <AudioTrack trackRef={track} />}

        {/* User type badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs text-white ${
            userType === "host"
              ? "bg-purple-700"
              : userType === "co-host"
              ? "bg-purple-700"
              : userType === "temp-host"
              ? "bg-purple-700"
              : "bg-purple-700"
          }`}
        >
          {userType === "host"
            ? "Host"
            : userType === "co-host"
            ? "Co-Host"
            : userType === "temp-host"
            ? "Temp-Host"
            : "Guest"}
        </div>

        {/* Name at bottom */}
        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
          {userName}
        </div>
      </div>
    );
  };

  // Render agenda section - explicitly typing for TypeScript
  const renderAgenda = (): ReactElement => {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 p-2 flex justify-between items-center">
          <h3 className="font-medium text-gray-700">Agenda</h3>
          <span className="text-sm text-gray-500">1/4</span>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">POLL</h4>
                <p className="text-sm text-gray-600">
                  Members are expected to participate in a poll
                </p>
              </div>
              <div className="text-sm text-purple-600 font-medium">12m</div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Q&A</h4>
                <p className="text-sm text-gray-600">Questions and answers</p>
              </div>
              <div className="text-sm text-purple-600 font-medium">19m</div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Giveaway</h4>
                <p className="text-sm text-gray-600">
                  Opportunity to be gifted
                </p>
              </div>
              <div className="text-sm text-purple-600 font-medium">10m</div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Next steps</h4>
                <p className="text-sm text-gray-600">
                  Opportunity to be gifted
                </p>
              </div>
              <div className="text-sm text-purple-600 font-medium">20m</div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">
            Hover on an "agenda" to remove or edit it.
          </p>
          <button className="w-full py-2 bg-purple-600 text-white rounded-md">
            Add Agenda
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      {screenShareTrack ? (
        // SCREEN SHARING LAYOUT WITH POSSIBLE AGENDA
        <div className="flex h-full">
          {/* Main content - screen share (full width if no sidebar content and no agenda) */}
          <div
            className={`flex-col ${
              !sidebarContent.length && !hasAgenda ? "w-full" : "flex-grow"
            } h-full`}
          >
            <div className="relative h-full">
              {mainContent && renderParticipant(mainContent, "large")}

              {/* Camera view of the screen sharer on top of the main grid */}
              {rawTracks.find(
                (track) =>
                  track.source === Track.Source.Camera &&
                  track.participant?.identity === screenSharerIdentity
              ) && (
                <div className="absolute left-4 bottom-4 w-64 h-36">
                  {renderParticipant(
                    rawTracks.find(
                      (track) =>
                        track.source === Track.Source.Camera &&
                        track.participant?.identity === screenSharerIdentity
                    ) as ParticipantTrack,
                    "small"
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Only show sidebar if there's content or agenda */}
          {(sidebarContent.length > 0 || hasAgenda) && (
            <div className="w-80 h-full flex flex-col">
              {/* If there's an agenda and screen is shared, co-hosts are displayed horizontally at the top */}
              {hasAgenda && sidebarContent.length > 0 && (
                <div className="mb-3">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {sidebarContent.map((track, index) => (
                      <div
                        key={`sidebar-${index}`}
                        className="w-64 h-36 flex-shrink-0"
                      >
                        {renderParticipant(track, "small")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If no agenda with screen share, display co-hosts vertically */}
              {!hasAgenda && sidebarContent.length > 0 && (
                <div className="flex flex-col gap-3 flex-grow">
                  {sidebarContent.map((track, index) => (
                    <div key={`sidebar-${index}`} className="h-32">
                      {renderParticipant(track, "small")}
                    </div>
                  ))}
                </div>
              )}

              {/* Agenda section - takes remaining space when screen is shared */}
              {hasAgenda && <div className="flex-grow">{renderAgenda()}</div>}
            </div>
          )}
        </div>
      ) : (
        // REGULAR LAYOUT - NO SCREEN SHARING
        <div className="h-full flex">
          {/* If agenda exists with no screen share, it takes the whole right side */}
          {hasAgenda ? (
            <div className="flex h-full w-full">
              {/* Main content - left side with host */}
              <div className="flex-grow h-full relative">
                {mainContent ? (
                  renderParticipant(mainContent, "large")
                ) : (
                  <div className="flex items-center justify-center h-full bg-purple-900 rounded-lg">
                    <p className="text-white text-lg">No host present</p>
                  </div>
                )}

                {/* Co-hosts - positioned absolutely on the LEFT side when no screen sharing */}
                {sidebarContent.length > 0 && (
                  <div className="absolute left-4 top-4 w-80 space-y-3">
                    {sidebarContent.map((track, index) => (
                      <div key={`sidebar-${index}`} className="h-36">
                        {renderParticipant(track, "small")}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agenda - right side */}
              <div className="w-80 h-full ml-3">{renderAgenda()}</div>
            </div>
          ) : (
            // No agenda, just host and co-hosts
            <div className="h-full relative w-full">
              {mainContent ? (
                renderParticipant(mainContent, "large")
              ) : (
                <div className="flex items-center justify-center h-full bg-red-900 rounded-lg">
                  <p className="text-white text-lg">No host present</p>
                </div>
              )}

              {/* Co-hosts - positioned absolutely on the LEFT side when no screen sharing */}
              {sidebarContent.length > 0 && (
                <div className="absolute left-4 top-4 w-80 space-y-3">
                  {sidebarContent.map((track, index) => (
                    <div key={`sidebar-${index}`} className="h-36">
                      {renderParticipant(track, "small")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


