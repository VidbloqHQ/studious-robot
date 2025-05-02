import { useEffect, useState } from "react";
import { useStreamContext } from "../hooks";
import { useCameraSwitch } from "../hooks/useCameraSwitch";
import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";
import Meeting from "./meeting";
import Livestream from "./livestream";
import Prejoin from "./prejoin";
// import CallControls from "./previous/call-controls";
// import CallControlz from "./previous/call-controlz";
import CallControlsz from "./call-controls";
// import TestingHooks from "./TestingHooks";
import RequestCard from "./request-card";
import { GuestRequest } from "../types";
import logo from "../assets/StreamLink.png";
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
  // Add local state to ensure we always have the guest requests
  const [localGuestRequests, setLocalGuestRequests] = useState<GuestRequest[]>(
    []
  );
  const { switchCamera } = useCameraSwitch();

  // Update local state whenever the context updates
  useEffect(() => {
    console.log("UserView received guest requests:", guestRequests);
    if (Array.isArray(guestRequests)) {
      setLocalGuestRequests(guestRequests);
    }
  }, [guestRequests]);

  // Fetch guest requests when component mounts
  useEffect(() => {
    if (websocket?.isConnected && userType === "host" && roomName) {
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
        <div className="flex flex-row items-center mb-2 justify-between w-[82%] mx-auto">
          <img src={logo} />
          <div className="flex flex-row items-center border">
            <div className="">
              <Icon name="signal" />
            </div>

            <input className="border " />
            <div className="">
              <Icon name="edit" className="text-primary"/>
            </div>
          </div>
          <div className="flex flex-row items-center border">
            <span>200k Tipped</span>
            <div className="border">

            <Icon name="moneyTransfer" />
            </div>

          </div>
        </div>
        {streamMetadata?.streamSessionType === "meeting" ? (
          <Meeting />
        ) : (
          <Livestream />
        )}
        {/* <CallControls />
        <div className="h-8"></div>
        <CallControlz />
        <div className="h-8"></div> */}
        {/* <div className="flex flex-row">
          <button className="bg-primary-light p-2">one</button>
          <button className="bg-primary-dark p-2">two</button>
          <button className="bg-primary p-2">three</button>
          <button className="bg-secondary p-2">one</button>
          <button className="p-2 bg-secondary-light">one</button>
          <button className="p-2 bg-secondary-dark">one</button>
        </div> */}
  <button onClick={switchCamera} className="border p-1">switch camera</button>
        <div className="w-[80%] mx-auto">
          <CallControlsz />
        </div>
        {/* <CallControlz /> */}

        {/* <TestingHooks /> */}
      </ParticipantContext.Provider>

      {/* Only show for hosts */}
      {userType === "host" && (
        <div className="absolute right-10 top-20 bg-red-300 rounded">
          {/* <p className="text-black font-bold mb-2">Guest Requests ({localGuestRequests.length})</p> */}
          {localGuestRequests.length > 0 &&
            localGuestRequests.map((request, i) => (
              <RequestCard request={request} key={request.participantId || i} />
            ))}
        </div>
      )}
    </>
  );
};

export default UserView;
