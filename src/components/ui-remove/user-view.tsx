import { useState, useEffect, useRef } from "react";
import { useStreamContext } from "../../hooks";
import { GuestRequest } from "../../types";
import CallControls from "./call-controls";
// import { Icon } from "./icons";
import Livestream from "./livestream-classic";
// import Meeting from "./meeting-classic";
import Meeting from "./meeting";
import RaisedHandCard from "./raised-hand";
import RequestCard from "./request-card";
import Prejoin from "./prejoin";
// import ContestModeTest from "./contest-test";
// import AddonTestSuite from "./addon-testing";
import { WebSocketDebugger } from "../WebSocketDebugger";

const UserView = () => {
  const {
    streamMetadata,
    token,
    guestRequests,
    userType,
    websocket,
    roomName,
    raisedHands,
  } = useStreamContext();
  // const { tenant } = useTenantContext();

  // const [isTyping, setIsTyping] = useState<boolean>(false);
  const [localGuestRequests, setLocalGuestRequests] = useState<GuestRequest[]>(
    []
  );
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
  useEffect(() => {
    // console.log("UserView received guest requests:", guestRequests);

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
  useEffect(() => {
    if (!websocket || !roomName) return;

    // When a guest request update is received, ensure processed requests
    // are still filtered out
    const handleGuestRequestsUpdate = (requests: GuestRequest[]) => {
      // console.log("WebSocket guest requests update received:", requests);

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
      // console.log("WebSocket invite guest event received:", data);

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

  const handleRemoveRequest = (participantId: string) => {
    // console.log(`Locally removing request for ${participantId}`);

    // Add to processed requests to prevent it from reappearing
    processedRequestIds.current.add(participantId);

    // Update local state
    setLocalGuestRequests((prev) =>
      prev.filter((req) => req.participantId !== participantId)
    );
  };
  if (!token) {
    return <Prejoin />;
  }
  return (
    <>
      {streamMetadata?.streamSessionType === "meeting" ? (
        <Meeting setShowParticipantList={() => {alert("Show participant list");}} />
      ) : (
        <Livestream />
      )}
      {/* <ContestModeTest /> */}
      <div className="w-[90%] lg:w-[80%] mx-auto">
        <CallControls />
      </div>
      <WebSocketDebugger />
      {userType === "host" && (
        <div className="absolute right-10 top-20 rounded">
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
      {streamMetadata.streamSessionType === "meeting" &&
        raisedHands.length > 0 && (
          <div className="absolute right-10 top-20">
            <div className="mb-2 text-sm text-gray-600 font-medium">
              Raised Hands ({raisedHands.length})
            </div>
            {raisedHands.map((raisedHand, i) => (
              <RaisedHandCard
                raisedHand={raisedHand}
                key={raisedHand.participantId || i}
              />
            ))}
          </div>
        )}
      {/* <AddonTestSuite /> */}
    </>
  );
};

export default UserView;
