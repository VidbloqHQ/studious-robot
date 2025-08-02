/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { Track, TrackPublication } from "livekit-client";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import {
  useStreamContext,
  useHandleStreamDisconnect,
  useRequirePublicKey,
  useNotification,
} from "../hooks";
import {
  BaseCallControlsProps,
  CallControlContext,
  CallControlsRenderProps,
  CallControlsState,
  CustomAction,
  GuestRequest,
  UserType,
} from "../types";

const BaseCallControls = ({
  features = {
    media: true,
    recording: true,
    handRaise: true,
    guestRequests: true,
    screenShare: true,
    disconnect: true,
  },
  customActions,
  onStateChange,
  onRaiseHand,
  onReturnToGuest,
  onDisconnect,
  onRecordToggle,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
  onHandRaised,
  onHandLowered,
  beforeDisconnect,
  initialStates = {},
  plugins = [],
  render,
}: BaseCallControlsProps) => {
  const [isInvited, setIsInvited] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(
    initialStates.isMicEnabled ?? false
  );
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(
    initialStates.isCameraEnabled ?? false
  );
  const [isScreenSharingEnabled, setIsScreenSharingEnabled] = useState<boolean>(
    initialStates.isScreenSharingEnabled ?? false
  );
  const [isRecording, setIsRecording] = useState<boolean>(
    initialStates.isRecording ?? false
  );
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "poor"
  >("good");
  const [pluginStates, setPluginStates] = useState<Record<string, any>>({});
  const [pluginHandlers, setPluginHandlers] = useState<
    Record<string, Record<string, () => void>>
  >({});

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
    setUserType,
  } = useStreamContext();

  const canAccessMediaControls =
    userType === "host" || userType === "co-host" || isInvited;
  const isGuest = userType === "guest";
  const { publicKey } = useRequirePublicKey();
  const p = useLocalParticipant();
  const { leaveStream } = useHandleStreamDisconnect(
    publicKey?.toString() ?? ""
  );
  const { addNotification } = useNotification();
  const room = useRoomContext();

  // Refs to track state and prevent duplicates
  const wsSetupCompleteRef = useRef(false);
  const roomJoinedRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const guestRequestsRef = useRef<GuestRequest[]>([]);
  const prevStateRef = useRef<CallControlsState>(undefined);

  // Initialize plugins
  useEffect(() => {
    if (!identityRef.current || !websocket) return;

    const context: CallControlContext = {
      websocket,
      roomName,
      identity: identityRef.current,
      userType: userType || "guest",
      addNotification,
    };

    // Initialize each plugin
    plugins.forEach((plugin) => {
      plugin.initialize?.(context);

      // Get plugin state
      const state = plugin.getState?.();
      if (state) {
        setPluginStates((prev) => ({ ...prev, [plugin.name]: state }));
      }

      // Get plugin handlers
      const handlers = plugin.getHandlers?.();
      if (handlers) {
        setPluginHandlers((prev) => ({ ...prev, [plugin.name]: handlers }));
      }
    });

    // Cleanup on unmount
    return () => {
      plugins.forEach((plugin) => plugin.cleanup?.());
    };
  }, [plugins, websocket, roomName, userType, addNotification]);

  // Emit state changes
  useEffect(() => {
    const currentState: CallControlsState = {
      isInvited,
      hasPendingRequest,
      isRecording,
      isHandRaised,
      isMicEnabled,
      isCameraEnabled,
      isScreenSharingEnabled,
    };

    // Check if state has changed
    if (
      prevStateRef.current &&
      JSON.stringify(prevStateRef.current) !== JSON.stringify(currentState)
    ) {
      onStateChange?.(currentState);
    }
    prevStateRef.current = currentState;
  }, [
    isInvited,
    hasPendingRequest,
    isRecording,
    isHandRaised,
    isMicEnabled,
    isCameraEnabled,
    isScreenSharingEnabled,
    onStateChange,
  ]);

  // Set identity once when we have a participant
  useEffect(() => {
    if (
      p.localParticipant?.identity &&
      p.localParticipant.identity !== identityRef.current
    ) {
      identityRef.current = p.localParticipant.identity;
      setIdentity(p.localParticipant.identity);
    }
  }, [p.localParticipant?.identity, setIdentity]);

  // Monitor connection quality
  useEffect(() => {
    if (!room) return;

    const updateConnectionQuality = () => {
      const stats = room.localParticipant?.connectionQuality;
      if (stats === "excellent") setConnectionQuality("excellent");
      else if (stats === "good") setConnectionQuality("good");
      else setConnectionQuality("poor");
    };

    room.on("connectionQualityChanged", updateConnectionQuality);
    return () => {
      room.off("connectionQualityChanged", updateConnectionQuality);
    };
  }, [room]);

  // Check if current participant has raised hand
  useEffect(() => {
    if (identityRef.current && raisedHands) {
      const hasRaisedHand = raisedHands.some(
        (hand) => hand.participantId === identityRef.current
      );
      setIsHandRaised(hasRaisedHand);
    }
  }, [raisedHands]);

  // Determine permissions based on user type and stream type
  const permissions = {
    canRaiseHand:
      streamMetadata?.streamSessionType === "meeting" &&
      (userType === "host" || userType === "co-host"),
    canRecord: userType === "host",
    canScreenShare: canAccessMediaControls,
    canInviteGuests:
      userType === "host" && streamMetadata?.streamSessionType === "livestream",
    canToggleMic: canAccessMediaControls,
    canToggleCamera: canAccessMediaControls,
  };

  // Get display name
  const getDisplayName = useCallback(() => {
    let displayName = nickname || identityRef.current || "";

    if (p.localParticipant?.metadata) {
      try {
        const metadata = JSON.parse(p.localParticipant.metadata);
        displayName = metadata.userName || displayName;
      } catch (e) {
        console.error("Failed to parse participant metadata:", e);
      }
    }

    return displayName;
  }, [nickname, p.localParticipant?.metadata]);

  // Join room ONCE when we have all requirements
  useEffect(() => {
    if (
      !websocket?.isConnected ||
      !roomName ||
      !identityRef.current ||
      roomJoinedRef.current
    ) {
      return;
    }

    setIsConnecting(true);
    websocket.joinRoom(roomName, identityRef.current);
    roomJoinedRef.current = true;
    setIsConnecting(false);

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
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Failed to send activity signal:", error);
        }
      }
    };

    const initialTimer = setTimeout(sendActivity, 2000);
    const intervalId = setInterval(sendActivity, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [websocket?.isConnected, roomName]);

  // Set up WebSocket event handlers ONCE
  useEffect(() => {
    if (!websocket || wsSetupCompleteRef.current || !identityRef.current)
      return;

    wsSetupCompleteRef.current = true;

    const handleInviteGuest = (data: {
      participantId: string;
      roomName: string;
    }) => {
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

    const handleReturnToGuest = (data: {
      participantId: string;
      roomName: string;
    }) => {
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

    const handleNewToken = async (data: {
      token: string;
      newUserType: UserType;
    }) => {
      if (!room) {
        console.warn("LiveKit room is not available");
        return;
      }

      try {
        setIsConnecting(true);
        await room.disconnect();
        await room.connect(
          "wss://streamlink-vtdavgse.livekit.cloud",
          data.token
        );
        setUserType(data.newUserType);
        setIsConnecting(false);
      } catch (error) {
        console.error("Error reconnecting to LiveKit:", error);
        setIsConnecting(false);
      }
    };

    websocket.addEventListener("inviteGuest", handleInviteGuest);
    websocket.addEventListener("returnToGuest", handleReturnToGuest);
    websocket.addEventListener(
      "guestRequestsUpdate",
      handleGuestRequestsUpdate
    );
    websocket.addEventListener("newToken", handleNewToken);

    return () => {
      websocket.removeEventListener("inviteGuest", handleInviteGuest);
      websocket.removeEventListener("returnToGuest", handleReturnToGuest);
      websocket.removeEventListener(
        "guestRequestsUpdate",
        handleGuestRequestsUpdate
      );
      websocket.removeEventListener("newToken", handleNewToken);
      wsSetupCompleteRef.current = false;
    };
  }, [
    websocket,
    addNotification,
    setGuestRequests,
    setToken,
    room,
    onReturnToGuest,
    setUserType,
  ]);

  // Handle WebSocket reconnection
  useEffect(() => {
    if (!websocket) return;

    const handleWebSocketConnect = () => {
      roomJoinedRef.current = false;
      wsSetupCompleteRef.current = false;
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
    if (
      !features.handRaise ||
      !websocket?.isConnected ||
      !identityRef.current
    ) {
      console.warn(
        "Cannot lower hand - missing requirements or feature disabled"
      );
      return;
    }

    websocket.lowerHand(roomName, identityRef.current);
    setIsHandRaised(false);
    onHandLowered?.();
    addNotification({
      type: "info",
      message: "Hand lowered",
      duration: 2000,
    });
  }, [websocket, roomName, addNotification, features.handRaise, onHandLowered]);

  // Monitor track states
  const updateTrackStates = useCallback(() => {
    if (!p.localParticipant) return;

    const micPublication = p.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    const cameraPublication = p.localParticipant.getTrackPublication(
      Track.Source.Camera
    );
    const screenSharePublication = p.localParticipant.getTrackPublication(
      Track.Source.ScreenShare
    );

    const newMicState = micPublication ? !micPublication.isMuted : false;
    const newCameraState = cameraPublication
      ? !cameraPublication.isMuted
      : false;
    const newScreenShareState = screenSharePublication
      ? !screenSharePublication.isMuted
      : false;

    if (newMicState !== isMicEnabled) setIsMicEnabled(newMicState);
    if (newCameraState !== isCameraEnabled) setIsCameraEnabled(newCameraState);
    if (newScreenShareState !== isScreenSharingEnabled)
      setIsScreenSharingEnabled(newScreenShareState);
  }, [
    p.localParticipant,
    isMicEnabled,
    isCameraEnabled,
    isScreenSharingEnabled,
  ]);

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
    if (
      !p.localParticipant ||
      streamMetadata?.streamSessionType !== "meeting" ||
      !features.handRaise
    )
      return;

    const handleTrackUnmuted = (publication: TrackPublication) => {
      if (publication.source === Track.Source.Microphone && isHandRaised) {
        setTimeout(() => {
          lowerHand();
        }, 100);
      }
    };

    const handleTrackPublished = (publication: TrackPublication) => {
      if (
        publication.source === Track.Source.Microphone &&
        !publication.isMuted &&
        isHandRaised
      ) {
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
  }, [
    p.localParticipant,
    streamMetadata?.streamSessionType,
    isHandRaised,
    lowerHand,
    features.handRaise,
  ]);

  // Control functions
  const requestToSpeak = useCallback(() => {
    if (
      !features.guestRequests ||
      !websocket?.isConnected ||
      !identityRef.current ||
      !publicKey
    ) {
      console.warn(
        "Cannot request to speak - missing requirements or feature disabled"
      );
      return;
    }

    const displayName = getDisplayName();

    websocket.requestToSpeak(
      roomName,
      identityRef.current,
      displayName,
      publicKey.toString()
    );
    setHasPendingRequest(true);
    onRaiseHand?.();
  }, [
    websocket,
    roomName,
    publicKey,
    getDisplayName,
    onRaiseHand,
    features.guestRequests,
  ]);

  // Raise hand function for meetings
  const raiseHand = useCallback(() => {
    if (
      !features.handRaise ||
      !websocket?.isConnected ||
      !identityRef.current ||
      !publicKey ||
      !permissions.canRaiseHand
    ) {
      console.warn(
        "Cannot raise hand - missing requirements, not in meeting, or feature disabled"
      );
      return;
    }

    const displayName = getDisplayName();

    websocket.raiseHand(
      roomName,
      identityRef.current,
      displayName,
      publicKey.toString()
    );
    setIsHandRaised(true);
    onHandRaised?.();
    addNotification({
      type: "info",
      message: "Hand raised",
      duration: 2000,
    });
  }, [
    websocket,
    roomName,
    publicKey,
    getDisplayName,
    permissions.canRaiseHand,
    addNotification,
    features.handRaise,
    onHandRaised,
  ]);

  const toggleMic = useCallback(() => {
    if (!features.media || !permissions.canToggleMic) return;

    const publication = p.localParticipant?.getTrackPublication(
      Track.Source.Microphone
    );
    if (publication) {
      const newState = publication.isMuted;
      if (publication.isMuted) {
        publication.unmute();
        setIsMicEnabled(true);
      } else {
        publication.mute();
        setIsMicEnabled(false);
      }
      onMicToggle?.(newState);
    }
  }, [
    p.localParticipant,
    features.media,
    permissions.canToggleMic,
    onMicToggle,
  ]);

  const toggleCamera = useCallback(() => {
    if (!features.media || !permissions.canToggleCamera) return;

    const publication = p.localParticipant?.getTrackPublication(
      Track.Source.Camera
    );
    if (publication) {
      const newState = publication.isMuted;
      if (publication.isMuted) {
        publication.unmute();
        setIsCameraEnabled(true);
      } else {
        publication.mute();
        setIsCameraEnabled(false);
      }
      onCameraToggle?.(newState);
    }
  }, [
    p.localParticipant,
    features.media,
    permissions.canToggleCamera,
    onCameraToggle,
  ]);

  const toggleScreenShare = useCallback(() => {
    if (!features.screenShare || !permissions.canScreenShare) return;

    const publication = p.localParticipant?.getTrackPublication(
      Track.Source.ScreenShare
    );
    if (publication) {
      const newState = publication.isMuted;
      if (publication.isMuted) {
        publication.unmute();
        setIsScreenSharingEnabled(true);
      } else {
        publication.mute();
        setIsScreenSharingEnabled(false);
      }
      onScreenShareToggle?.(newState);
    }
  }, [
    p.localParticipant,
    features.screenShare,
    permissions.canScreenShare,
    onScreenShareToggle,
  ]);

  const toggleRecording = useCallback(() => {
    if (!features.recording || !permissions.canRecord) return;

    const newState = !isRecording;
    setIsRecording(newState);
    onRecordToggle?.(newState);

    addNotification({
      type: newState ? "success" : "info",
      message: newState ? "Recording started" : "Recording stopped",
      duration: 3000,
    });
  }, [
    isRecording,
    onRecordToggle,
    addNotification,
    features.recording,
    permissions.canRecord,
  ]);

  const handleDisconnectClick = async () => {
    if (!features.disconnect) return;

    // Allow cancellation via beforeDisconnect
    if (beforeDisconnect) {
      const shouldDisconnect = await beforeDisconnect();
      if (!shouldDisconnect) return;
    }

    try {
      await leaveStream();
      onDisconnect?.();
      setToken(undefined);
    } catch (error) {
      console.error("Error during disconnect:", error);
      setToken(undefined);
    }
  };

  // Utility functions
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const sortCustomActions = (actions: CustomAction[]): CustomAction[] => {
    return [...actions].sort((a, b) => {
      // Sort by position if specified
      if (a.position === "start" && b.position !== "start") return -1;
      if (a.position !== "start" && b.position === "start") return 1;
      if (a.position === "end" && b.position !== "end") return 1;
      if (a.position !== "end" && b.position === "end") return -1;

      // Sort by numeric position
      if (typeof a.position === "number" && typeof b.position === "number") {
        return a.position - b.position;
      }

      // Sort by group
      const groupOrder = { primary: 0, secondary: 1, danger: 2 };
      const aGroup = a.group || "secondary";
      const bGroup = b.group || "secondary";
      return groupOrder[aGroup] - groupOrder[bGroup];
    });
  };

  // Get participant count
  const participantCount = room?.remoteParticipants?.size
    ? room.remoteParticipants.size + 1
    : 1;

  // Build render props
  const renderProps: CallControlsRenderProps = {
    // States
    isInvited,
    hasPendingRequest,
    isRecording,
    isHandRaised,

    // Connection states
    isConnecting,
    connectionQuality,

    // Permissions
    canAccessMediaControls,
    canRaiseHand: permissions.canRaiseHand,
    canRecord: permissions.canRecord,
    canScreenShare: permissions.canScreenShare,
    canInviteGuests: permissions.canInviteGuests,
    permissions,

    // User info
    userType: userType || "guest",
    isGuest,
    identity: identityRef.current || "",
    displayName: getDisplayName(),

    // Track states
    isMicEnabled,
    isCameraEnabled,
    isScreenSharingEnabled,

    // Actions - only included if feature is enabled
    ...(features.media && { toggleMic, toggleCamera }),
    ...(features.screenShare && { toggleScreenShare }),
    ...(features.recording && { toggleRecording }),
    ...(features.guestRequests && { requestToSpeak }),
    ...(features.handRaise && { raiseHand, lowerHand }),
    ...(features.disconnect && { handleDisconnectClick }),

    // Custom actions
    customActions,

    // Room info
    roomName,
    streamSessionType: streamMetadata?.streamSessionType,
    participantCount,

    // Utility functions
    utils: {
      formatDuration,
      getParticipantDisplayName: getDisplayName,
      sortCustomActions,
    },

    // Plugin states and handlers
    pluginStates,
    pluginHandlers,
  };

  return render(renderProps);
};

export default BaseCallControls;
