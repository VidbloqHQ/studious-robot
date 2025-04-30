import { useState, useEffect } from "react";
import {
  useTracks,
  VideoTrack,
  AudioTrack,
  useRoomContext,
  TrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";
import ParticipantView from "./participant";

export default function MeetingView({ hasAgenda = false }) {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const room = useRoomContext();
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

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
  const MAX_VISIBLE_COHOSTS = 1;
  const displayedCoHosts = coHostTracks.slice(0, MAX_VISIBLE_COHOSTS);
  const overflowCount = coHostTracks.length - displayedCoHosts.length;

  // Render a single participant
  const renderParticipant = (track: TrackReference, isMainHost = false) => {
    if (!track || !track.participant) return null;

    const metadata = track.participant.metadata
      ? JSON.parse(track.participant.metadata)
      : {};
    console.log({ metadata });
    const isCameraOn = track.publication && !track.publication.isMuted;

    const isScreenShare =
      track.source === Track.Source.ScreenShare &&
      track.publication?.isSubscribed &&
      track.publication?.isEnabled;

    const isActive = track.participant.identity === activeSpeaker;
    const uniqueKey = `${track.participant.sid}-${track.source}`;

    const displayName = metadata.userName || track.participant.identity;

    return (
      <div key={uniqueKey} className="h-full w-full">
        <div
          className={`relative rounded-lg overflow-hidden bg-gray-900 h-full ${
            isActive ? "ring-2 ring-purple-500" : ""
          }`}
        >
          {isScreenShare ? (
            <div className="h-full w-full">
              <VideoTrack
                trackRef={track}
                className="h-full w-full object-cover"
              />
            </div>
          ) : isCameraOn ? (
            <div className="h-full w-full">
              <VideoTrack
                trackRef={track}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            // Show Avatar if no video track or camera is off
            // <div className="flex flex-col items-center justify-center h-full w-full">
            //   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-2">
            //     <img
            //       src={avatarUrl}
            //       alt={displayName}
            //       className="w-full h-full object-cover"
            //     />
            //   </div>
            //   <span className="text-white text-sm">{displayName}</span>
            // </div>
            <ParticipantView participant={track.participant} />
          )}

          {track.publication?.track && <AudioTrack trackRef={track} />}
          {/* <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
            {displayName}
            {metadata.userType === "host" && !isMainHost && (
              <span className="ml-1 text-xs">(Host)</span>
            )}
          </div> */}
        </div>
      </div>
    );
  };

  // Render the overflow indicator showing remaining participants
  const renderOverflow = (count: number) => {
    if (count <= 0) return null;

    return (
      <div className="flex flex-col items-center justify-center bg-white bg-opacity-10 rounded-lg p-4 h-full w-full">
        <div className="flex mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-400 -mr-1 flex items-center justify-center text-xs text-white">
            J
          </div>
          <div className="w-8 h-8 rounded-full bg-red-400 -mr-1 flex items-center justify-center text-xs text-white">
            K
          </div>
          <div className="w-8 h-8 rounded-full bg-green-400 -mr-1 flex items-center justify-center text-xs text-white">
            L
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-xs text-white">
            M
          </div>
        </div>
        <p className="text-gray-400 text-sm">People on the call</p>
        <div className="mt-2 px-4 py-1 bg-white bg-opacity-10 rounded-full">
          <span className="text-gray-200">+{count}</span>
        </div>
      </div>
    );
  };

  const getBottomRowParticipants = () => {
    const participants: TrackReference[] = [];

    // If there's a screen share
    if (screenShareTrack) {
      const screenSharerIdentity = screenShareTrack.participant.identity;

      // Find the camera track of the person sharing the screen
      const screenSharerCameraTrack = cameraTracks.find(
        (track) =>
          track.participant &&
          track.participant.identity === screenSharerIdentity
      );

      // Add the screen sharer's camera view if available
      if (screenSharerCameraTrack) {
        participants.push(screenSharerCameraTrack);
      }

      // Add all co-hosts
      displayedCoHosts.forEach((track) => {
        // Avoid duplicating the screen sharer if they're also a co-host
        if (
          !participants.some(
            (p) => p.participant.identity === track.participant.identity
          )
        ) {
          participants.push(track);
        }
      });

      // If host is not the screen sharer, add the host to the bottom row
      if (
        hostTrack &&
        hostTrack.participant.identity !== screenSharerIdentity
      ) {
        // Only add host if they're not already in the list
        if (
          !participants.some(
            (p) => p.participant.identity === hostTrack.participant.identity
          )
        ) {
          participants.push(hostTrack);
        }
      }
    } else {
      // No screen share - only show co-hosts
      participants.push(...displayedCoHosts);
    }

    return participants;
  };

  return (
    <div className="h-full bg-black">
      {cameraTracks.length > 2 && hasAgenda ? (
        // Special layout for 3+ participants with agenda
        <div className="h-full">
          {/* Top row with host and agenda */}
          <div className="flex h-[70%] mb-2">
            {/* Host */}
            <div className="w-9/12 pr-2">
              {screenShareTrack
                ? // If there's a screen share, put it in the host area
                  renderParticipant(screenShareTrack)
                : // Otherwise, show the host
                  hostTrack && renderParticipant(hostTrack, true)}
            </div>

            {/* Agenda */}
            <div className="w-3/12">
              <div className="bg-white rounded-lg h-full p-5 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-bold text-base">Agenda</h2>
                  <span className="text-gray-400 text-sm">1/4</span>
                </div>

                <div className="relative">
                  {/* Timeline connector - vertical dashed line */}
                  <div className="absolute top-0 bottom-0 left-1.5 border-l border-dashed border-gray-200 z-0"></div>

                  {/* Agenda items */}
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

                <button className="w-full mt-4 bg-purple-600 text-white py-2 rounded-md text-sm">
                  Add Agenda
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row - full width for co-hosts */}
          <div className="h-[30%]">
            <div className="flex gap-2 h-full">
              {getBottomRowParticipants().map((track) =>
                renderParticipant(track)
              )}
              {overflowCount > 0 && renderOverflow(overflowCount)}
            </div>
          </div>
        </div>
      ) : (
        // Standard layout from version 9
        <div className="flex h-full">
          {/* Main content area */}
          <div className={`${hasAgenda ? "w-9/12" : "w-full"} h-full p-2`}>
            {/* Screen sharing scenario */}
            {screenShareTrack ? (
              hasAgenda ? (
                // Screen share with agenda
                <div className="flex flex-col h-full gap-2">
                  {/* Screen share at the top */}
                  <div className="h-[70%]">
                    {renderParticipant(screenShareTrack)}
                  </div>

                  {/* Participants below in a single row */}
                  <div className="flex gap-2 h-[30%]">
                    {getBottomRowParticipants().map((track) =>
                      renderParticipant(track)
                    )}
                    {overflowCount > 0 && renderOverflow(overflowCount)}
                  </div>
                </div>
              ) : (
                // Screen share without agenda - side by side layout
                <div className="flex h-full gap-2">
                  {/* Screen share takes most of the width */}
                  <div className="w-8/12 h-full">
                    {renderParticipant(screenShareTrack)}
                  </div>

                  {/* Participants on the right */}
                  <div className="w-4/12 h-full">
                    <div className="flex flex-col gap-2 h-full">
                      {cameraTracks.map((track) =>
                        renderParticipant(
                          track,
                          hostTrack &&
                            track.participant?.identity ===
                              hostTrack.participant?.identity
                        )
                      )}
                      {overflowCount > 0 && renderOverflow(overflowCount)}
                    </div>
                  </div>
                </div>
              )
            ) : /* No screen sharing */
            cameraTracks.length === 1 ? (
              /* One person: Occupies whole screen */
              <div className="h-full w-full">
                {renderParticipant(cameraTracks[0], true)}
              </div>
            ) : cameraTracks.length === 2 ? (
              /* Two people: side by side if no agenda, stacked if agenda */
              <div
                className={`${
                  hasAgenda ? "flex flex-col" : "flex"
                } gap-2 h-full`}
              >
                {cameraTracks.map((track) =>
                  renderParticipant(
                    track,
                    hostTrack &&
                      track.participant?.identity ===
                        hostTrack.participant?.identity
                  )
                )}
              </div>
            ) : (
              /* Three or more people: Host on top, others in a single row below */
              <div className="flex flex-col h-full gap-2">
                {/* Host always on top, full width */}
                {hostTrack && (
                  <div className="h-[70%]">
                    {renderParticipant(hostTrack, true)}
                  </div>
                )}

                {/* Co-hosts below in a single row that fills the width */}
                <div className="flex gap-2 h-[30%]">
                  {displayedCoHosts.map((track) => renderParticipant(track))}
                  {overflowCount > 0 && renderOverflow(overflowCount)}
                </div>
              </div>
            )}
          </div>

          {/* Agenda sidebar - only visible when hasAgenda is true and not 3+ participants */}
          {hasAgenda && cameraTracks.length <= 2 && (
            <div className="w-3/12 pl-2 h-full">
              <div className="bg-white rounded-lg h-full p-5 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-bold text-base">Agenda</h2>
                  <span className="text-gray-400 text-sm">1/4</span>
                </div>

                <div className="relative">
                  {/* Timeline connector - vertical dashed line */}
                  <div className="absolute top-0 bottom-0 left-1.5 border-l border-dashed border-gray-200 z-0"></div>

                  {/* Agenda items */}
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

                <button className="w-full mt-4 bg-purple-600 text-white py-2 rounded-md text-sm">
                  Add Agenda
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
