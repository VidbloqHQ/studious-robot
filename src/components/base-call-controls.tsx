import { useState, useEffect, useRef, useCallback } from "react";
import { Track } from "livekit-client";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  useStreamContext,
  useHandleStreamDisconnect,
  useRequirePublicKey,
  useNotification,
} from "../hooks";
import { GuestRequest, UserType } from "../types";

export type BaseCallControlsProps = {
  onRaiseHand?: () => void;
  onReturnToGuest?: () => void;
  onDisconnect?: () => void;
  onAgendaToggle?: () => void;
  onChatToggle?: () => void;
  onReactionsToggle?: () => void;
  onRecordToggle?: () => void;
  customHandlers?: Record<string, () => void>;
  render?: (props: CallControlsRenderProps) => React.ReactNode;
};

export type CallControlsRenderProps = {
  isInvited: boolean;
  hasPendingRequest: boolean;
  canAccessMediaControls: boolean;
  isGuest: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharingEnabled: boolean;
  isRecording: boolean;
  handleDisconnectClick: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  toggleRecording: () => void;
  requestToSpeak: () => void;
  userType: UserType;
};

const BaseCallControls = ({
  onRaiseHand,
  onReturnToGuest,
  onDisconnect,
  onRecordToggle,
  render,
}: BaseCallControlsProps) => {
  const [isInvited, setIsInvited] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(false);
  const [isScreenSharingEnabled, setIsScreenSharingEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
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
        
        if (onReturnToGuest) {
          onReturnToGuest();
        }
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
    p.localParticipant?.identity,
    onReturnToGuest
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
        if (isGuest && hasPendingRequest && publicKey) {
          setTimeout(() => {
            console.log("Re-sending request to speak after reconnect");
            websocket.requestToSpeak(
              roomName,
              p.localParticipant.identity,
              p.localParticipant.identity,
              publicKey.toString()
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

  // Monitor track states
  useEffect(() => {
    const micPublication = p.localParticipant?.getTrackPublication(Track.Source.Microphone);
    const cameraPublication = p.localParticipant?.getTrackPublication(Track.Source.Camera);
    const screenSharePublication = p.localParticipant?.getTrackPublication(Track.Source.ScreenShare);

    setIsMicEnabled(micPublication?.isEnabled || false);
    setIsCameraEnabled(cameraPublication?.isEnabled || false);
    setIsScreenSharingEnabled(screenSharePublication?.isEnabled || false);

    // Set up track status change listeners
    const handleMicStatusChange = () => setIsMicEnabled(micPublication?.isEnabled || false);
    const handleCameraStatusChange = () => setIsCameraEnabled(cameraPublication?.isEnabled || false);
    const handleScreenShareStatusChange = () => setIsScreenSharingEnabled(screenSharePublication?.isEnabled || false);

    micPublication?.on('muted', handleMicStatusChange);
    micPublication?.on('unmuted', handleMicStatusChange);
    cameraPublication?.on('muted', handleCameraStatusChange);
    cameraPublication?.on('unmuted', handleCameraStatusChange);
    screenSharePublication?.on('muted', handleScreenShareStatusChange);
    screenSharePublication?.on('unmuted', handleScreenShareStatusChange);

    return () => {
      micPublication?.off('muted', handleMicStatusChange);
      micPublication?.off('unmuted', handleMicStatusChange);
      cameraPublication?.off('muted', handleCameraStatusChange);
      cameraPublication?.off('unmuted', handleCameraStatusChange);
      screenSharePublication?.off('muted', handleScreenShareStatusChange);
      screenSharePublication?.off('unmuted', handleScreenShareStatusChange);
    };
  }, [p.localParticipant]);

  // Request to speak function
  const requestToSpeak = useCallback(() => {
    if (!websocket || !websocket.isConnected) {
      console.warn("WebSocket not connected");
      return;
    }
    
    if (!p.localParticipant?.identity) {
      console.warn("No participant identity available");
      return;
    }
    
    if (!publicKey) {
      console.warn("Public key is not available");
      return;
    }
    
    const identity = p.localParticipant.identity;
    console.log("Requesting to speak:", {
      roomName,
      participantId: identity,
      name: identity,
      walletAddress: publicKey.toString()
    });
    
    websocket.requestToSpeak(
      roomName,
      identity,
      identity,
      publicKey.toString()
    );
    
    // Set pending request immediately to improve UI responsiveness
    setHasPendingRequest(true);
    
    if (onRaiseHand) {
      onRaiseHand();
    }
  }, [websocket, p.localParticipant?.identity, roomName, publicKey, onRaiseHand]);

  // Toggle functions
  const toggleMic = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.Microphone);
    if (publication) {
      if (publication.isEnabled) {
        publication.mute();
      } else {
        publication.unmute();
      }
    }
  }, [p.localParticipant]);

  const toggleCamera = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.Camera);
    if (publication) {
      if (publication.isEnabled) {
        publication.mute();
      } else {
        publication.unmute();
      }
    }
  }, [p.localParticipant]);

  const toggleScreenShare = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.ScreenShare);
    if (publication) {
      if (publication.isEnabled) {
        publication.mute();
      } else {
        publication.unmute();
      }
    }
  }, [p.localParticipant]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    // Implement your recording logic here
    const newState = !isRecording;
    setIsRecording(newState);
    
    // Call the onRecordToggle callback if provided
    if (onRecordToggle) {
      onRecordToggle();
    }
    
    // Add notification for recording status
    if (newState) {
      addNotification({
        type: "success",
        message: "Recording started",
        duration: 3000,
      });
    } else {
      addNotification({
        type: "info",
        message: "Recording stopped",
        duration: 3000,
      });
    }
  }, [isRecording, onRecordToggle, addNotification]);

  // Handle disconnect
  const handleDisconnectClick = async () => {
    if (onDisconnect) {
      onDisconnect();
    }
    
    setToken(undefined);
    await leaveStream();
  };

  // If render prop is provided, use it for custom rendering
  if (render) {
    return render({
      isInvited,
      hasPendingRequest,
      canAccessMediaControls,
      isGuest,
      isMicEnabled,
      isCameraEnabled,
      isScreenSharingEnabled,
      isRecording,
      handleDisconnectClick,
      toggleMic,
      toggleCamera,
      toggleScreenShare,
      toggleRecording,
      requestToSpeak,
      userType: userType || "guest",
    });
  }

  // Return null as this is a headless component
  return null;
};

export default BaseCallControls;