import { useEffect, useState } from "react";
import { useStreamContext } from "../hooks";
import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";
import Meeting from "./meeting";
import Livestream from "./livestream";
import Prejoin from "./prejoin";
import CallControls from "./previous/call-controls";
import CallControlz from "./previous/call-controlz";
import CallControlsz from "./call-controls";
import TestingHooks from "./TestingHooks";
import RequestCard from "./request-card";
import { GuestRequest } from "../types";

const UserView = () => {
  const p = useLocalParticipant();
  const { streamMetadata, token, guestRequests, userType, websocket, roomName } = useStreamContext();
  // Add local state to ensure we always have the guest requests
  const [localGuestRequests, setLocalGuestRequests] = useState<GuestRequest[]>([]);

  // Update local state whenever the context updates
  useEffect(() => {
    console.log("UserView received guest requests:", guestRequests);
    if (Array.isArray(guestRequests)) {
      setLocalGuestRequests(guestRequests);
    }
  }, [guestRequests]);

  // Fetch guest requests when component mounts
  useEffect(() => {
    if (websocket?.isConnected && userType === 'host' && roomName) {
      console.log("UserView: Requesting guest requests on mount");
      setTimeout(() => {
        websocket.sendMessage("getGuestRequests", { roomName });
      }, 1000);
    }
  }, [websocket?.isConnected, userType, roomName, websocket]);

  if (!token) {
    return <Prejoin />;
  }

  return (
    <>
      <ParticipantContext.Provider value={p.localParticipant}>
        {streamMetadata?.streamSessionType === "meeting" ? (
          <Meeting />
        ) : (
          <Livestream />
        )}
        <CallControls />
        <div className="h-8"></div>
        <CallControlz />
        <div className="h-8"></div>
        <CallControlsz />
        <TestingHooks />
      </ParticipantContext.Provider>
      
      {/* Only show for hosts */}
      {userType === 'host' && (
        <div className="absolute right-10 top-20 bg-red-300 rounded">
          {/* <p className="text-black font-bold mb-2">Guest Requests ({localGuestRequests.length})</p> */}
          {localGuestRequests.length > 0 && (
            localGuestRequests.map((request, i) => (
              <RequestCard request={request} key={request.participantId || i} />
            ))
          )}
        </div>
      )}
    </>
  );
};

export default UserView;