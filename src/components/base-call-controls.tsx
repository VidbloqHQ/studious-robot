import { useState, useEffect, useRef, useCallback } from "react";
import { Track, TrackPublication } from "livekit-client";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
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
  // New raise hand props
  isHandRaised: boolean;
  canRaiseHand: boolean;
  raiseHand: () => void;
  lowerHand: () => void;
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
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);

  const {
    roomName,
    setToken,
    websocket,
    setIdentity,
    setGuestRequests,
    guestRequests,
    userType,
    raisedHands,
    streamMetadata,
    nickname,
  } = useStreamContext();

  const canAccessMediaControls = userType === "host" || userType === "co-host" || isInvited;
  const isGuest = userType === "guest";
  const { publicKey } = useRequirePublicKey();
  const p = useLocalParticipant();
  const { leaveStream } = useHandleStreamDisconnect(publicKey?.toString() ?? "");
  const { addNotification } = useNotification();
  const room = useRoomContext();

  // Refs to track state and prevent duplicates
  const wsSetupCompleteRef = useRef(false);
  const roomJoinedRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const guestRequestsRef = useRef<GuestRequest[]>([]);

  // Set identity once when we have a participant
  useEffect(() => {
    if (p.localParticipant?.identity && p.localParticipant.identity !== identityRef.current) {
      identityRef.current = p.localParticipant.identity;
      setIdentity(p.localParticipant.identity);
      // console.log("Identity set to:", p.localParticipant.identity);
    }
  }, [p.localParticipant?.identity, setIdentity]);

  // Check if current participant has raised hand
  useEffect(() => {
    if (identityRef.current && raisedHands) {
      const hasRaisedHand = raisedHands.some(
        (hand) => hand.participantId === identityRef.current
      );
      setIsHandRaised(hasRaisedHand);
    }
  }, [raisedHands]);

  // Determine if user can raise hand (meetings only, host/co-host)
  const canRaiseHand = streamMetadata.streamSessionType === "meeting" && 
                       (userType === "host" || userType === "co-host");

  // Join room ONCE when we have all requirements
  useEffect(() => {
    if (!websocket?.isConnected || !roomName || !identityRef.current || roomJoinedRef.current) {
      return;
    }

    // console.log(`Joining room ${roomName} with identity ${identityRef.current}`);
    websocket.joinRoom(roomName, identityRef.current);
    roomJoinedRef.current = true;

    // Request guest list if host
    if (userType === "host") {
      setTimeout(() => {
        websocket.sendMessage("getGuestRequests", { roomName });
      }, 1000);
    }
  }, [websocket?.isConnected, roomName, userType]);

  // Send periodic activity signals
  useEffect(() => {
    if (!identityRef.current || !roomName || !websocket?.isConnected) return;

    const sendActivity = () => {
      if (websocket.isConnected && identityRef.current) {
        try {
          websocket.sendMessage("participantActive", {
            participantId: identityRef.current,
            roomName,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error("Failed to send activity signal:", error);
        }
      }
    };

    // Send initial activity after a delay
    const initialTimer = setTimeout(sendActivity, 2000);
    
    // Send activity every 30 seconds
    const intervalId = setInterval(sendActivity, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [websocket?.isConnected, roomName]);

  // Set up WebSocket event handlers ONCE
  useEffect(() => {
    if (!websocket || wsSetupCompleteRef.current || !identityRef.current) return;

    // console.log("Setting up WebSocket event handlers");
    wsSetupCompleteRef.current = true;

    const handleInviteGuest = (data: { participantId: string; roomName: string }) => {
      if (data.participantId === identityRef.current) {
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
      if (data.participantId === identityRef.current) {
        setIsInvited(false);
        setHasPendingRequest(false);
        addNotification({
          type: "success",
          message: "You have been returned to the audience!",
          duration: 3000,
        });
        onReturnToGuest?.();
      }
    };

    const handleGuestRequestsUpdate = (requests: GuestRequest[]) => {
      const requestsCopy = Array.isArray(requests) ? [...requests] : [];
      guestRequestsRef.current = requestsCopy;
      setGuestRequests(requestsCopy);

      const hasRequest = requestsCopy.some(
        (req) => req.participantId === identityRef.current
      );
      setHasPendingRequest(hasRequest);
    };

    const handleNewToken = async (data: { token: string }) => {
      if (!room) {
        console.warn("LiveKit room is not available");
        return;
      }

      try {
        await room.disconnect();
        await room.connect("wss://streamlink-vtdavgse.livekit.cloud", data.token);
        // console.log("Successfully reconnected to LiveKit!");
      } catch (error) {
        console.error("Error reconnecting to LiveKit:", error);
      }
    };

    // Add event listeners
    websocket.addEventListener("inviteGuest", handleInviteGuest);
    websocket.addEventListener("returnToGuest", handleReturnToGuest);
    websocket.addEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
    websocket.addEventListener("newToken", handleNewToken);

    // Cleanup
    return () => {
      // console.log("Cleaning up WebSocket event listeners");
      websocket.removeEventListener("inviteGuest", handleInviteGuest);
      websocket.removeEventListener("returnToGuest", handleReturnToGuest);
      websocket.removeEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
      websocket.removeEventListener("newToken", handleNewToken);
      wsSetupCompleteRef.current = false;
    };
  }, [websocket, addNotification, setGuestRequests, setToken, room, onReturnToGuest]);

  // Handle WebSocket reconnection
  useEffect(() => {
    if (!websocket) return;

    const handleWebSocketConnect = () => {
      // console.log("WebSocket reconnected");
      
      // Reset flags to allow re-setup
      roomJoinedRef.current = false;
      wsSetupCompleteRef.current = false;
      
      // The room join will happen automatically via the main join effect
    };

    window.addEventListener("connect", handleWebSocketConnect);
    return () => {
      window.removeEventListener("connect", handleWebSocketConnect);
    };
  }, [websocket]);

  // Update guest requests from context
  useEffect(() => {
    if (!guestRequests || !identityRef.current) return;
    
    guestRequestsRef.current = [...guestRequests];
    const hasRequest = guestRequests.some(
      (request) => request.participantId === identityRef.current
    );
    setHasPendingRequest(hasRequest);
  }, [guestRequests]);

  // Lower hand function
  const lowerHand = useCallback(() => {
    if (!websocket?.isConnected || !identityRef.current) {
      console.warn("Cannot lower hand - missing requirements");
      return;
    }

    websocket.lowerHand(roomName, identityRef.current);
    setIsHandRaised(false);
    addNotification({
      type: "info",
      message: "Hand lowered",
      duration: 2000,
    });
  }, [websocket, roomName, addNotification]);

  // Monitor track states
  const updateTrackStates = useCallback(() => {
    if (!p.localParticipant) return;

    const micPublication = p.localParticipant.getTrackPublication(Track.Source.Microphone);
    const cameraPublication = p.localParticipant.getTrackPublication(Track.Source.Camera);
    const screenSharePublication = p.localParticipant.getTrackPublication(Track.Source.ScreenShare);

    const newMicState = micPublication ? !micPublication.isMuted : false;
    const newCameraState = cameraPublication ? !cameraPublication.isMuted : false;
    const newScreenShareState = screenSharePublication ? !screenSharePublication.isMuted : false;

    if (newMicState !== isMicEnabled) setIsMicEnabled(newMicState);
    if (newCameraState !== isCameraEnabled) setIsCameraEnabled(newCameraState);
    if (newScreenShareState !== isScreenSharingEnabled) setIsScreenSharingEnabled(newScreenShareState);
  }, [p.localParticipant, isMicEnabled, isCameraEnabled, isScreenSharingEnabled]);

  // Set up track event listeners
  useEffect(() => {
    if (!p.localParticipant) return;

    updateTrackStates();

    const handleTrackUpdate = () => updateTrackStates();

    p.localParticipant.on("trackPublished", handleTrackUpdate);
    p.localParticipant.on("trackUnpublished", handleTrackUpdate);
    p.localParticipant.on("trackMuted", handleTrackUpdate);
    p.localParticipant.on("trackUnmuted", handleTrackUpdate);

    return () => {
      p.localParticipant.off("trackPublished", handleTrackUpdate);
      p.localParticipant.off("trackUnpublished", handleTrackUpdate);
      p.localParticipant.off("trackMuted", handleTrackUpdate);
      p.localParticipant.off("trackUnmuted", handleTrackUpdate);
    };
  }, [p.localParticipant, updateTrackStates]);

  // Auto-lower hand when unmuting in meetings
  useEffect(() => {
    if (!p.localParticipant || streamMetadata.streamSessionType !== "meeting") return;

    const handleTrackUnmuted = (publication: TrackPublication) => {
      // When microphone is unmuted and hand is raised, automatically lower it
      if (publication.source === Track.Source.Microphone && isHandRaised) {
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          lowerHand();
        }, 100);
      }
    };

    // Also handle track publication changes
    const handleTrackPublished = (publication: TrackPublication) => {
      if (publication.source === Track.Source.Microphone && 
          !publication.isMuted && 
          isHandRaised) {
        setTimeout(() => {
          lowerHand();
        }, 100);
      }
    };

    p.localParticipant.on("trackUnmuted", handleTrackUnmuted);
    p.localParticipant.on("trackPublished", handleTrackPublished);

    return () => {
      p.localParticipant.off("trackUnmuted", handleTrackUnmuted);
      p.localParticipant.off("trackPublished", handleTrackPublished);
    };
  }, [p.localParticipant, streamMetadata.streamSessionType, isHandRaised, lowerHand]);

  // Control functions
  const requestToSpeak = useCallback(() => {
    if (!websocket?.isConnected || !identityRef.current || !publicKey) {
      console.warn("Cannot request to speak - missing requirements");
      return;
    }

    // Get the display name from nickname or participant metadata
    let displayName = nickname || identityRef.current;
    
    // Try to get username from participant metadata
    if (p.localParticipant?.metadata) {
      try {
        const metadata = JSON.parse(p.localParticipant.metadata);
        displayName = metadata.userName || displayName;
      } catch (e) {
        console.error("Failed to parse participant metadata:", e);
      }
    }

    websocket.requestToSpeak(
      roomName,
      identityRef.current,
      displayName, // Use display name instead of identity
      publicKey.toString()
    );
    setHasPendingRequest(true);
    onRaiseHand?.();
  }, [websocket, roomName, publicKey, nickname, p.localParticipant?.metadata, onRaiseHand]);

  // Raise hand function for meetings
  const raiseHand = useCallback(() => {
    if (!websocket?.isConnected || !identityRef.current || !publicKey || !canRaiseHand) {
      console.warn("Cannot raise hand - missing requirements or not in meeting");
      return;
    }

    // Get the display name
    let displayName = nickname || identityRef.current;
    
    // Try to get username from participant metadata
    if (p.localParticipant?.metadata) {
      try {
        const metadata = JSON.parse(p.localParticipant.metadata);
        displayName = metadata.userName || displayName;
      } catch (e) {
        console.error("Failed to parse participant metadata:", e);
      }
    }

    websocket.raiseHand(
      roomName,
      identityRef.current,
      displayName,
      publicKey.toString()
    );
    setIsHandRaised(true);
    addNotification({
      type: "info",
      message: "Hand raised",
      duration: 2000,
    });
  }, [websocket, roomName, publicKey, nickname, canRaiseHand, p.localParticipant?.metadata, addNotification]);

  const toggleMic = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.Microphone);
    if (publication) {
      if (publication.isMuted) {
        publication.unmute();
        setIsMicEnabled(true);
      } else {
        publication.mute();
        setIsMicEnabled(false);
      }
    }
  }, [p.localParticipant]);

  const toggleCamera = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.Camera);
    if (publication) {
      if (publication.isMuted) {
        publication.unmute();
        setIsCameraEnabled(true);
      } else {
        publication.mute();
        setIsCameraEnabled(false);
      }
    }
  }, [p.localParticipant]);

  const toggleScreenShare = useCallback(() => {
    const publication = p.localParticipant?.getTrackPublication(Track.Source.ScreenShare);
    if (publication) {
      if (publication.isMuted) {
        publication.unmute();
        setIsScreenSharingEnabled(true);
      } else {
        publication.mute();
        setIsScreenSharingEnabled(false);
      }
    }
  }, [p.localParticipant]);

  const toggleRecording = useCallback(() => {
    const newState = !isRecording;
    setIsRecording(newState);
    onRecordToggle?.();
    
    addNotification({
      type: newState ? "success" : "info",
      message: newState ? "Recording started" : "Recording stopped",
      duration: 3000,
    });
  }, [isRecording, onRecordToggle, addNotification]);

  const handleDisconnectClick = async () => {
    try {
      // console.log("End call button clicked - disconnecting");
      await leaveStream();
      onDisconnect?.();
      setToken(undefined);
    } catch (error) {
      console.error("Error during disconnect:", error);
      setToken(undefined);
    }
  };

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
      isHandRaised,
      canRaiseHand,
      raiseHand,
      lowerHand,
    });
  }

  return null;
};

export default BaseCallControls;