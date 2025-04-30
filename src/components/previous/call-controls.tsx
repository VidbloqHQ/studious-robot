import { useState, useEffect, useRef } from "react";
import { Track } from "livekit-client";
import {
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  useStreamContext,
  useHandleStreamDisconnect,
  useRequirePublicKey,
  useNotification,
} from "../../hooks";
import { GuestRequest } from "../../types";
import { Icon } from "../icons";

const CallControls = () => {
  const [isInvited, setIsInvited] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const {
    roomName,
    setToken,
    websocket,
    setIdentity,
    setGuestRequests,
    guestRequests,
    userType,
  } = useStreamContext();

  const canAccessMediaControls =
    userType === "host" || userType === "co-host" || isInvited;

  const isGuest = userType === "guest";
  const { publicKey } = useRequirePublicKey();
  const p = useLocalParticipant();
  const { leaveStream } = useHandleStreamDisconnect(
    publicKey?.toString() ?? "",
  );

  const { addNotification } = useNotification();
  const room = useRoomContext();
  
  // Using refs to prevent multiple event registrations and track component state
  const listenersRegistered = useRef(false);
  const isMounted = useRef(true);
  const lastJoinedRoom = useRef<string | null>(null);
  const guestRequestsRef = useRef<GuestRequest[]>([]);

  // Set component as mounted initially and track mounting state
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Debug logging for guest requests updates
  useEffect(() => {
    console.log("GuestRequests updated:", guestRequests);
    
    // Store in ref for persistence across renders
    guestRequestsRef.current = [...guestRequests];
    
    if (p.localParticipant?.identity) {
      const hasRequest = guestRequests.some(
        (request) => request.participantId === p.localParticipant?.identity
      );
      console.log(`Has pending request for ${p.localParticipant.identity}: ${hasRequest}`);
      setHasPendingRequest(hasRequest);
    }
  }, [guestRequests, p.localParticipant?.identity]);

  // Main WebSocket event setup effect
  useEffect(() => {
    // Only run this effect if we have all required pieces and haven't registered listeners yet
    if (!websocket || !p.localParticipant?.identity || !roomName || !websocket.isConnected || listenersRegistered.current) 
      return;
      
    const identity = p.localParticipant.identity;
    console.log(`Setting up WebSocket handlers for ${identity} in room ${roomName}`);

    // Set identity once
    setIdentity(identity);

    // Prevent re-running this effect
    listenersRegistered.current = true;
    
    // Join the room if not already joined or if room changed
    if (websocket.isConnected && (!lastJoinedRoom.current || lastJoinedRoom.current !== roomName)) {
      console.log(`Joining room ${roomName} with identity ${identity}`);
      websocket.joinRoom(roomName, identity);
      lastJoinedRoom.current = roomName;
    }

    // Define event handlers
    const handleInviteGuest = (data: { participantId: string; roomName: string }) => {
      console.log("Invite guest event received:", data);
      if (data.participantId === identity) {
        setIsInvited(true);
        setHasPendingRequest(false);
        addNotification({
          type: "success",
          message: "You have been invited!",
          duration: 3000,
        });
      }
    };

    const handleReturnToGuest = (data: { participantId: string; roomName: string }) => {
      console.log("Return to guest event received:", data);
      if (data.participantId === identity) {
        setIsInvited(false);
        setHasPendingRequest(false);
        addNotification({
          type: "success",
          message: "You have been returned to the audience!",
          duration: 3000,
        });
      }
    };

    const handleGuestRequestsUpdate = (requests: GuestRequest[]) => {
      console.log("Guest requests update received:", requests);
      
      if (!isMounted.current) return;
      
      // Create a stable copy of the array and ensure it's not null/undefined
      const requestsCopy = Array.isArray(requests) ? [...requests] : [];
      guestRequestsRef.current = requestsCopy;
      
      // Update the global context
      setGuestRequests(requestsCopy);

      const hasRequest = requestsCopy.some(
        (req) => req.participantId === identity
      );
      
      console.log(`Setting hasPendingRequest to ${hasRequest} for ${identity}`);
      setHasPendingRequest(hasRequest);
    };

    const handleNewToken = async (data: { token: string }) => {
      console.log("New token received");
      if (!room) {
        console.warn("LiveKit room is not available");
        return;
      }

      try {
        console.log("Disconnecting LiveKit...");
        await room.disconnect();

        console.log("Reconnecting with new token...");
        await room.connect("wss://streamlink-vtdavgse.livekit.cloud", data.token);

        console.log("Successfully reconnected to LiveKit!");
      } catch (error) {
        console.error("Error reconnecting to LiveKit:", error);
      }
    };

    // Add event listeners
    console.log("Adding WebSocket event listeners");
    websocket.addEventListener("inviteGuest", handleInviteGuest);
    websocket.addEventListener("returnToGuest", handleReturnToGuest);
    websocket.addEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
    websocket.addEventListener("newToken", handleNewToken);

    // Clean up event listeners when component unmounts
    return () => {
      console.log("Cleaning up WebSocket event listeners");
      if (websocket) {
        websocket.removeEventListener("inviteGuest", handleInviteGuest);
        websocket.removeEventListener("returnToGuest", handleReturnToGuest);
        websocket.removeEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
        websocket.removeEventListener("newToken", handleNewToken);
      }
      listenersRegistered.current = false;
    };
  }, [
    websocket,
    roomName,
    websocket?.isConnected,
    setGuestRequests,
    addNotification,
    setIdentity,
    setToken,
    room,
    p.localParticipant?.identity
  ]);

  // Handle WebSocket reconnection
  useEffect(() => {
    if (!websocket) return;
    
    const handleWebSocketConnect = () => {
      console.log("WebSocket connected event handler");
      
      // Reset listeners registered flag to allow re-registration after reconnect
      listenersRegistered.current = false;
      
      // Re-join room when connection is established
      if (p.localParticipant?.identity && roomName) {
        console.log(`Re-joining room ${roomName} after reconnect`);
        websocket.joinRoom(roomName, p.localParticipant.identity);
        lastJoinedRoom.current = roomName;
        
        // If we're a host, refresh guest requests after reconnecting
        if (userType === 'host') {
          setTimeout(() => {
            console.log("Requesting guest requests after reconnect");
            websocket.sendMessage("getGuestRequests", { roomName });
          }, 1000);
        }
        
        // If we previously had a request, re-send it
        if (isGuest && hasPendingRequest && publicKey?.toString()) {
          setTimeout(() => {
            console.log("Re-sending request to speak after reconnect");
            websocket.requestToSpeak(
              roomName,
              p.localParticipant.identity,
              p.localParticipant.identity,
              publicKey.toString() || ''
            );
          }, 1500);
        }
      }
    };
    
    // Listen for the custom connect event
    window.addEventListener("connect", handleWebSocketConnect);
    
    return () => {
      window.removeEventListener("connect", handleWebSocketConnect);
    };
  }, [websocket, roomName, p.localParticipant?.identity, userType, isGuest, hasPendingRequest, publicKey]);

  // Request to speak function
  const request = () => {
    if (!websocket || !websocket.isConnected) {
      console.warn("WebSocket not connected");
      return;
    }
    
    if (!p.localParticipant?.identity) {
      console.warn("No participant identity available");
      return;
    }
    
    const identity = p.localParticipant.identity;
    console.log("Requesting to speak:", {
      roomName,
      participantId: identity,
      name: identity,
      walletAddress: publicKey?.toString() || ''
    });
    
    websocket.requestToSpeak(
      roomName,
      identity,
      identity,
      publicKey?.toString() || ''
    );
    
    // Set pending request immediately to improve UI responsiveness
    setHasPendingRequest(true);
  };

  // Handle disconnect
  const handleDisconnectClick = async () => {
    setToken(undefined);
    await leaveStream();
  };

  return (
    <div className="bg-[var(--sdk-secondary-btn-color)] rounded-full w-[80%] mx-auto">
      <div className="flex flex-row items-center justify-between w-[80%] lg:w-[60%] mx-auto px-2.5 py-1 lg:p-3">
        {userType === "host" && (
          <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)]">
            <Icon name="menu" size={{ mobile: 12, desktop: 20 }} />
            <p className="mt-1">Agenda</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)] bg-slate">
          <Icon name="chat" size={{ mobile: 10, desktop: 22 }} />
          <p className="mt-1">Chat</p>
        </div>
        {canAccessMediaControls && (
          <>
            <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)] bg-slate">
              <div className="rounded-full w-[25px] h-[25px] p-1.5 lg:w-[30px] lg:h-[30px] lg:p-1.5 bg-gradient-to-br from-primary to-second-gradient">
                <TrackToggle source={Track.Source.Microphone} />
              </div>

              <p className="">Mic</p>
            </div>
            <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)] bg-red">
              <div className="text-sm rounded-full w-[25px] h-[25px] p-1.5 lg:w-[30px] lg:h-[30px] lg:p-1.5 bg-gradient-to-br from-primary to-second-gradient">
              <TrackToggle source={Track.Source.Camera} />
              </div>
              <p className="">Camera</p>
            </div>
            <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)]">
              <TrackToggle source={Track.Source.ScreenShare} />
              <p className="mt-1">Screen</p>
            </div>
          </>
        )}

        {isGuest && !isInvited && !hasPendingRequest && (
          <div
            className="flex flex-col items-center justify-between text-[var(--sdk-text-color)]"
            onClick={request}
          >
            <Icon name="hand" size={{ mobile: 10, desktop: 22 }} />

            <p className="mt-1">Raise</p>
          </div>
        )}

        {isGuest && hasPendingRequest && (
          <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)]">
            <Icon name="hand" size={{ mobile: 10, desktop: 22 }} color="green" />
            <p className="mt-1 text-green-500">Requested</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-between text-[var(--sdk-text-color)]">
          <Icon name="smiley" size={{ mobile: 10, desktop: 20 }} />

          <p className="mt-1">Reactions</p>
        </div>
        <div
          className="flex flex-col items-center justify-between text-[var(--sdk-text-color)] cursor-pointer"
          onClick={handleDisconnectClick}
        >
          <Icon name="phone" size={{ mobile: 12, desktop: 22 }} color="red"/>
          <p className="mt-1">End</p>
        </div>
      </div>
    </div>
  );
};

export default CallControls;