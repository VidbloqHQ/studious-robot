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


export default function LivestreamView({
  hasAgenda = false,
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

    // Determine classes based on size bg-green-900 border-red-500 border-4
    const containerClasses =
      size === "large"
        ? "relative rounded-lg overflow-hidden h-full w-full bg-purple-900"
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

  const isWindowShare =
    screenShareTrack?.source === Track.Source.ScreenShare &&
    !screenShareTrack?.publication?.dimensions?.width;

  return (
    <div className={`w-full h-full ${className}`} style={style}>
      {screenShareTrack ? (
        // SCREEN SHARING LAYOUT
        <div className="h-full flex">
          {/* Main content - screen share */}
          <div
            className="h-full relative"
            style={{
              width:
                !hasAgenda && (!sidebarContent.length || !isWindowShare)
                  ? "100%"
                  : "calc(100% - 320px)",
            }}
          >
            <div className="w-full h-full">
              {mainContent && renderParticipant(mainContent, "large")}

              {/* Camera view of screen sharer */}
              {rawTracks.find(
                (track) =>
                  track.source === Track.Source.Camera &&
                  track.participant?.identity === screenSharerIdentity
              ) && (
                <div className="absolute left-4 bottom-4 w-64 h-36 z-10">
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

          {/* Sidebar - Only show if needed */}
          {(hasAgenda || (sidebarContent.length > 0 && !isWindowShare)) && (
            <div className="w-80 ml-3 h-full flex flex-col">
              {sidebarContent.length > 0 && (
                <div className={hasAgenda ? "mb-3" : "h-full"}>
                  {hasAgenda ? (
                    // Horizontal layout with agenda
                    <div className="flex gap-3 overflow-x-auto">
                      {sidebarContent.map((track, index) => (
                        <div
                          key={`sidebar-${index}`}
                          className="w-64 h-36 flex-shrink-0"
                        >
                          {renderParticipant(track, "small")}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Vertical layout without agenda
                    <div className="flex flex-col gap-3">
                      {sidebarContent.map((track, index) => (
                        <div key={`sidebar-${index}`} className="h-32">
                          {renderParticipant(track, "small")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {hasAgenda && <div className="flex-1">{renderAgenda()}</div>}
            </div>
          )}
        </div>
      ) : (
        // REGULAR LAYOUT - NO SCREEN SHARING
        <div className="h-full flex">
          {/* Main content area */}
          <div className={`h-full relative ${hasAgenda ? "flex-1" : "w-full"}`}>
            {mainContent ? (
              <div className="h-full w-full">
                {renderParticipant(mainContent, "large")}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-purple-900 rounded-lg">
                <p className="text-white text-lg">No host present</p>
              </div>
            )}

            {/* Co-hosts overlay */}
            {sidebarContent.length > 0 && (
              <div className="absolute left-4 top-4 w-80 space-y-3 z-10">
                {sidebarContent.map((track, index) => (
                  <div key={`sidebar-${index}`} className="h-36">
                    {renderParticipant(track, "small")}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda sidebar */}
          {hasAgenda && (
            <div className="w-80 h-full ml-3">{renderAgenda()}</div>
          )}
        </div>
      )}
    </div>
  );
}
