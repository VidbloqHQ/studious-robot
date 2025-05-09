import { useState, useEffect, useRef } from "react";
import { useStreamContext, useTenantContext } from "../hooks";
import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";
import Meeting from "./meeting";
import Livestream from "./livestream";
import Prejoin from "./prejoin";
import CallControls from "./call-controls";
import RequestCard from "./request-card";
import { GuestRequest } from "../types";
import { Icon } from "./icons";


const UserView = () => {
  const p = useLocalParticipant();
  const {
    streamMetadata,
    token,
    guestRequests,
    userType,
    websocket,
    roomName,
  } = useStreamContext();

  const { tenant } = useTenantContext();

  // Maintain local state for guest requests
  const [localGuestRequests, setLocalGuestRequests] = useState<GuestRequest[]>(
    []
  );
  const [isTyping, setIsTyping] = useState<boolean>(false);
  // const [streamTitle, setStreamTitle] = useState<string>()

  // Track processed request IDs to avoid re-adding removed requests
  const processedRequestIds = useRef(new Set<string>());

  // Track if component is mounted
  const isMounted = useRef(true);

  // Set up mount/unmount tracking
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update local state when global state changes
  useEffect(() => {
    console.log("UserView received guest requests:", guestRequests);

    if (Array.isArray(guestRequests)) {
      // Filter out any requests that have been processed locally
      const filteredRequests = guestRequests.filter(
        (req) => !processedRequestIds.current.has(req.participantId)
      );

      if (isMounted.current) {
        setLocalGuestRequests(filteredRequests);
      }
    }
  }, [guestRequests]);

  // Handle manual removal of a request
  const handleRemoveRequest = (participantId: string) => {
    console.log(`Locally removing request for ${participantId}`);

    // Add to processed requests to prevent it from reappearing
    processedRequestIds.current.add(participantId);

    // Update local state
    setLocalGuestRequests((prev) =>
      prev.filter((req) => req.participantId !== participantId)
    );
  };

  // Set up WebSocket listener for guest request updates
  useEffect(() => {
    if (!websocket || !roomName) return;

    // When a guest request update is received, ensure processed requests
    // are still filtered out
    const handleGuestRequestsUpdate = (requests: GuestRequest[]) => {
      console.log("WebSocket guest requests update received:", requests);

      if (!Array.isArray(requests) || !isMounted.current) return;

      // Filter out any requests that have been processed locally
      const filteredRequests = requests.filter(
        (req) => !processedRequestIds.current.has(req.participantId)
      );

      setLocalGuestRequests(filteredRequests);
    };

    // Handle invitation events to ensure we properly track processed requests
    const handleInviteGuest = (data: {
      participantId: string;
      roomName: string;
    }) => {
      console.log("WebSocket invite guest event received:", data);

      if (data.participantId && data.roomName === roomName) {
        // Add to processed requests
        processedRequestIds.current.add(data.participantId);

        // Update local state
        setLocalGuestRequests((prev) =>
          prev.filter((req) => req.participantId !== data.participantId)
        );
      }
    };

    // Add event listeners
    websocket.addEventListener(
      "guestRequestsUpdate",
      handleGuestRequestsUpdate
    );
    websocket.addEventListener("inviteGuest", handleInviteGuest);

    // Clean up
    return () => {
      websocket.removeEventListener(
        "guestRequestsUpdate",
        handleGuestRequestsUpdate
      );
      websocket.removeEventListener("inviteGuest", handleInviteGuest);
    };
  }, [websocket, roomName]);

  if (!token) {
    return <Prejoin />;
  }

  return (
    <>
      <ParticipantContext.Provider value={p.localParticipant}>
        <div className="flex flex-row items-center my-2 justify-between w-[96%] lg:w-[82%] mx-auto">
          <img
            src={
              tenant?.logo ??
              "https://res.cloudinary.com/adaeze/image/upload/v1746647035/a49xigo2kgijd1dugdix.png"
            }
            className="w-[85px] lg:w-[180px]"
          />
          <div className="flex flex-row items-center border bg-[var(--sdk-bg-secondary-color)] rounded-lg gap-x-1 lg:w-[26%] justify-between">
            <div className="flex flex-row items-center gap-x-1.5 w-[80%]">
              <div className="bg-[var(--sdk-bg-primary-color)] rounded-lg p-1.5 lg:p-1">
                <Icon
                  name="signal"
                  className="text-primary-light"
                  size={{
                    mobile: 24,
                    desktop: 34,
                  }}
                />
              </div>

              <input
                className="focus:outline-none bg-transparent w-full"
                placeholder="Enter Stream Title"
                onChange={() => setIsTyping(true)}
              />
            </div>

            <div className="bg-[var(--sdk-bg-primary-color)] rounded-r-lg p-2.5">
              {isTyping ? (
                <button className="text-sm text-primary font-semibold">
                  Save
                </button>
              ) : (
                <Icon
                  name="edit"
                  className="text-primary"
                  size={{
                    mobile: 16,
                    desktop: 18,
                  }}
                />
              )}
            </div>
          </div>
          {/* <div className="flex flex-row items-center border">
            <span>200k Tipped</span>
            <div className="border">
              <Icon name="moneyTransfer" />
            </div>
          </div> */}
        </div>
        {streamMetadata?.streamSessionType === "meeting" ? (
          <Meeting />
        ) : (
          <Livestream />
        )}
        {/* <ReactionComponent /> */}
        {/* Call controls */}
        <div className="w-[90%] lg:w-[80%] mx-auto">
          <CallControls />
        </div>
      </ParticipantContext.Provider>

      {/* Only show for hosts */}
      {userType === "host" && (
        <div className="absolute right-10 top-20 bg-red-300 rounded">
          {localGuestRequests.length > 0 &&
            localGuestRequests.map((request, i) => (
              <RequestCard
                request={request}
                key={request.participantId || i}
                onRemove={handleRemoveRequest}
              />
            ))}
        </div>
      )}
    </>
  );
};

export default UserView;
