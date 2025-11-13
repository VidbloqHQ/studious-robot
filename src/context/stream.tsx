/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useRef,
  useMemo,
} from "react";
import {
  useNotification,
  useRequirePublicKey,
  useTenantContext,
} from "../hooks";
import {
  UserType,
  StreamMetadata,
  GuestRequest,
  TokenResponse,
  StreamResponse,
  Participant,
  RaisedHand,
} from "../types";
import { getRequestManager } from "../utils/request-manager";

// Optimized debounce with proper typing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

type StreamContextType = {
  roomName: string;
  userType: UserType | null;
  setUserType: (type: UserType | null) => void;
  websocket: any | null;
  streamMetadata: StreamMetadata;
  setStreamMetadata: (metadata: StreamMetadata) => void;
  guestRequests: GuestRequest[];
  setGuestRequests: (requests: GuestRequest[]) => void;
  raisedHands: RaisedHand[];
  setRaisedHands: (hands: RaisedHand[]) => void;
  identity: string | undefined;
  setIdentity: (identity: string) => void;
  token: string | undefined;
  nickname: string;
  setNickname: React.Dispatch<React.SetStateAction<string>>;
  generateToken: (val: string, avatarUrl?: string) => Promise<void>;
  setToken: (token: string | undefined) => void;
  currentTime: number;
  setCurrentTime: (val: number) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (val: boolean) => void;
  participants: Participant[];
  participantCount: number;
  isLoadingParticipants: boolean;
  isLoadingStreamMetadata: boolean;
  refreshParticipants: () => Promise<void>;
  refreshStreamMetadata: () => Promise<void>;
};

export const StreamContext = createContext<StreamContextType | null>(null);

export const StreamProvider = ({
  children,
  roomName,
}: {
  children: React.ReactNode;
  roomName: string;
}) => {
  const {
    websocket,
    apiClient,
    isConnected,
    connect: connectWebSocket,
    isWebSocketInitialized,
    fetchTenantData,
  } = useTenantContext();
  const requestManager = getRequestManager();

  // State variables
  const [streamMetadata, setStreamMetadata] = useState<StreamMetadata>({
    title: "",
    callType: "",
    creatorWallet: "",
    streamSessionType: "",
    streamId: "",
  });
  const [userType, setUserType] = useState<UserType | null>(null);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [identity, setIdentity] = useState<string>();
  const [token, setToken] = useState<string>();
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [nickname, setNickname] = useState<string>("");

  // Participant management state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] =
    useState<boolean>(true);
  const [isLoadingStreamMetadata, setIsLoadingStreamMetadata] =
    useState<boolean>(true);
  const lastParticipantUpdateRef = useRef(Date.now());
  const fetchingParticipantsRef = useRef(false);
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const lastTimeSyncRef = useRef<number>(0);

  // Refs for tracking component state and preserving values across renders
  const isMounted = useRef<boolean>(true);
  const guestRequestsRef = useRef<GuestRequest[]>([]);
  const raisedHandsRef = useRef<RaisedHand[]>([]);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsListenersSetupRef = useRef<boolean>(false);

  const { publicKey } = useRequirePublicKey();
  const { addNotification } = useNotification();

  // Set component as mounted and handle cleanup
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Clear any pending timers
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, []);

  // Optimized fetch participants with request manager
  const fetchParticipants = useCallback(
    async (forceRefresh = false) => {
      if (fetchingParticipantsRef.current && !forceRefresh) return;
      fetchingParticipantsRef.current = true;

      const cacheKey = `participants:${roomName}`;

      try {
        setIsLoadingParticipants(true);

        const data = await requestManager.execute<{
          participants: Participant[];
        }>(
          cacheKey,
          async () =>
            apiClient.get<{ participants: Participant[] }>(
              `/participant/${roomName}`
            ),
          {
            cacheType: "participants",
            forceRefresh,
            rateLimitType: "participants",
          }
        );

        const activeParticipants = data.participants.filter(
          (participant) => participant.leftAt === null
        );

        participantsMapRef.current.clear();
        activeParticipants.forEach((p) => {
          participantsMapRef.current.set(p.id, p);
        });

        setParticipants(activeParticipants);
        lastParticipantUpdateRef.current = Date.now();
      } catch (err) {
        if (
          err instanceof Error &&
          err.message?.includes("Rate limit exceeded")
        ) {
          console.warn(
            "Rate limit hit for participants fetch, using cached data"
          );
        } else {
          console.error("Error fetching participants:", err);
        }
      } finally {
        setIsLoadingParticipants(false);
        fetchingParticipantsRef.current = false;
      }
    },
    [roomName, apiClient, requestManager]
  );

  // Optimized fetch stream metadata with loading state
  const fetchStreamMetadata = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = `stream:${roomName}`;

      try {
        setIsLoadingStreamMetadata(true);

        const streamData = await requestManager.execute<StreamResponse>(
          cacheKey,
          async () => apiClient.get<StreamResponse>(`/stream/${roomName}`),
          {
            cacheType: "stream",
            forceRefresh,
            rateLimitType: "stream",
          }
        );

        if (streamData.title || streamData.callType) {
          setStreamMetadata((prev) => ({
            ...prev,
            title: streamData.title || prev.title,
            callType: streamData.callType || prev.callType,
            streamSessionType:
              streamData.streamSessionType.toLowerCase() ||
              prev.streamSessionType,
            creatorWallet: streamData.creatorWallet || prev.creatorWallet,
            streamId: streamData.id || prev.streamId,
          }));
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message?.includes("Rate limit exceeded")
        ) {
          console.warn("Rate limit hit for stream fetch, using cached data");
        } else {
          console.error("Failed to fetch stream data:", error);
        }
      } finally {
        setIsLoadingStreamMetadata(false);
      }
    },
    [roomName, apiClient, requestManager]
  );

  // Debounced fetch with proper initialization
  const debouncedFetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    debouncedFetchRef.current = debounce(() => {
      if (Date.now() - lastParticipantUpdateRef.current > 10000) {
        fetchParticipants();
      }
    }, 2000);
  }, [fetchParticipants]);

  const debouncedFetch = useCallback(() => {
    debouncedFetchRef.current();
  }, []);

  // Memoized debounced time sync handler to prevent recreation
  const handleTimeSync = useMemo(
    () =>
      debounce((serverTime: number) => {
        const now = Date.now();
        // Only update if enough time has passed since last update (100ms)
        if (now - lastTimeSyncRef.current > 100) {
          lastTimeSyncRef.current = now;
          setCurrentTime((prevTime) => {
            // Only update if the time actually changed significantly (> 1 second difference)
            if (Math.abs(prevTime - serverTime) > 1000) {
              return serverTime;
            }
            return prevTime;
          });
        }
      }, 100),
    []
  );

  // Set up event listeners for WebSocket events - ONLY IF WEBSOCKET IS INITIALIZED
  useEffect(() => {
    // Don't setup listeners if WebSocket isn't initialized yet
    if (!roomName || !userType || !websocket || !isWebSocketInitialized) {
      return;
    }

    // Prevent duplicate listener setup
    if (wsListenersSetupRef.current) {
      return;
    }
    wsListenersSetupRef.current = true;

    // Handle participant events
    const handleParticipantJoined = (data: { participantId: string }) => {
      if (!participantsMapRef.current.has(data.participantId)) {
        debouncedFetch();
      }
    };

    const handleParticipantLeft = (data: { participantId: string }) => {
      setParticipants((prev) => {
        const updated = prev.filter((p) => p.id !== data.participantId);
        participantsMapRef.current.delete(data.participantId);
        requestManager.invalidate(`participants:${roomName}`);
        return updated;
      });
      lastParticipantUpdateRef.current = Date.now();
    };

    // Listen for guest requests updates
    const handleGuestRequestsUpdate = (data: GuestRequest[]) => {
      if (!isMounted.current || !data) return;
      const requestsCopy = Array.isArray(data) ? [...data] : [];
      guestRequestsRef.current = requestsCopy;
      setGuestRequests(requestsCopy);
    };

    // Handle raised hands updates
    const handleRaisedHandsUpdate = (data: RaisedHand[]) => {
      if (!isMounted.current || !data) return;

      const handsCopy = Array.isArray(data) ? [...data] : [];
      raisedHandsRef.current = handsCopy;
      setRaisedHands(handsCopy);
    };

    // Handle hand acknowledged
    const handleHandAcknowledged = (data: { roomName: string }) => {
      if (data.roomName === roomName) {
        addNotification({
          type: "success",
          message: "Your raised hand has been acknowledged!",
          duration: 3000,
        });
      }
    };

    // Listen for initial sync
    const handleInitialSync = (data: {
      currentTime: number;
      executedActions: string[];
      joinTime: number;
    }) => {
      setCurrentTime(data.currentTime);

      if (isConnected && userType === "host") {
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        requestTimerRef.current = setTimeout(() => {
          if (isConnected && isMounted.current) {
            websocket.sendMessage("getGuestRequests", { roomName });
          }
          requestTimerRef.current = null;
        }, 1000);
      }

      // Request raised hands for meetings
      if (streamMetadata.streamSessionType === "meeting") {
        setTimeout(() => {
          if (isConnected && isMounted.current) {
            websocket.sendMessage("getRaisedHands", { roomName });
          }
        }, 1100);
      }
    };

    // Handle stream metadata updates
    const handleStreamMetadataUpdate = (data: Partial<StreamMetadata>) => {
      if (!isMounted.current || !data) return;

      setStreamMetadata((prev) => {
        // Only update if data actually changed
        const hasChanges = Object.keys(data).some((key) => {
          const k = key as keyof StreamMetadata;
          return prev[k] !== data[k];
        });

        if (!hasChanges) return prev;

        requestManager.invalidate(`stream:${roomName}`);
        return { ...prev, ...data };
      });
    };

    // Handle connection status changes
    const handleConnectionChange = () => {
      // Re-request data when reconnected
      if (isConnected) {
        if (userType === "host") {
          setTimeout(() => {
            if (isConnected && isMounted.current) {
              websocket.sendMessage("getGuestRequests", { roomName });
            }
          }, 1500);
        }

        if (streamMetadata.streamSessionType === "meeting") {
          setTimeout(() => {
            if (isConnected && isMounted.current) {
              websocket.sendMessage("getRaisedHands", { roomName });
            }
          }, 1600);
        }

        // Refresh data after reconnect
        setTimeout(() => {
          fetchParticipants(true);
          fetchStreamMetadata(true);
        }, 2000);
      }
    };

    // Add event listeners
    websocket.addEventListener("participantJoined", handleParticipantJoined);
    websocket.addEventListener("participantLeft", handleParticipantLeft);
    websocket.addEventListener(
      "guestRequestsUpdate",
      handleGuestRequestsUpdate
    );
    websocket.addEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
    websocket.addEventListener("handAcknowledged", handleHandAcknowledged);
    websocket.addEventListener("timeSync", handleTimeSync);
    websocket.addEventListener("initialSync", handleInitialSync);
    websocket.addEventListener(
      "streamMetadataUpdate",
      handleStreamMetadataUpdate
    );
    websocket.addEventListener("connected", handleConnectionChange);
    websocket.addEventListener("disconnected", handleConnectionChange);

    // Initial fetch
    // fetchParticipants();
    if (token && websocket && isWebSocketInitialized) {
      // Now safe to fetch participants
      fetchParticipants();
    }

    // Cleanup
    return () => {
      wsListenersSetupRef.current = false;
      if (websocket) {
        websocket.removeEventListener(
          "participantJoined",
          handleParticipantJoined
        );
        websocket.removeEventListener("participantLeft", handleParticipantLeft);
        websocket.removeEventListener(
          "guestRequestsUpdate",
          handleGuestRequestsUpdate
        );
        websocket.removeEventListener(
          "raisedHandsUpdate",
          handleRaisedHandsUpdate
        );
        websocket.removeEventListener(
          "handAcknowledged",
          handleHandAcknowledged
        );
        websocket.removeEventListener("timeSync", handleTimeSync);
        websocket.removeEventListener("initialSync", handleInitialSync);
        websocket.removeEventListener(
          "streamMetadataUpdate",
          handleStreamMetadataUpdate
        );
        websocket.removeEventListener("connected", handleConnectionChange);
        websocket.removeEventListener("disconnected", handleConnectionChange);
      }

      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [
    roomName,
    userType,
    websocket,
    isConnected,
    isWebSocketInitialized,
    debouncedFetch,
    fetchParticipants,
    streamMetadata.streamSessionType,
    addNotification,
    requestManager,
    fetchStreamMetadata,
    handleTimeSync,
    token,
  ]);

  // Periodic refresh with smart intervals
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if data is stale (2 minutes old)
      if (Date.now() - lastParticipantUpdateRef.current > 120000) {
        fetchParticipants(true);
      }
    }, 120000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, [fetchParticipants]);

  // Initial fetch stream metadata - THIS IS SAFE WITHOUT WEBSOCKET
  useEffect(() => {
    // fetchStreamMetadata();
    if (token) {
      fetchStreamMetadata();
    }
  }, [fetchStreamMetadata, token]);

  // Token generation function with rate limiting
  const generateToken = useCallback(
    async (username: string, avatarUrl?: string) => {
      if (!publicKey) {
        addNotification({
          type: "error",
          message: "Please, connect your wallet",
          duration: 3000,
        });
        return;
      }

      // Ensure WebSocket is connected before generating token
      if (!isWebSocketInitialized || !isConnected) {
        try {
          // console.log("Token generation: Ensuring WebSocket connection...");
          await connectWebSocket();
        } catch (error) {
          console.error(
            "Token generation: Failed to connect WebSocket:",
            error
          );
          addNotification({
            type: "error",
            message: "Failed to connect to server. Please try again.",
            duration: 4000,
          });
          return;
        }
      }

      const walletAddress = publicKey.toBase58();
      const data = {
        roomName,
        userName: username,
        wallet: walletAddress,
        avatarUrl,
      };

      try {
        const cacheKey = `token:${roomName}:${walletAddress}`;

        const tokenRes = await requestManager.execute<TokenResponse>(
          cacheKey,
          async () => apiClient.post<TokenResponse>("/stream/token", data),
          {
            cacheType: "default",
            rateLimitType: "token",
            skipCache: true, // Don't cache tokens
          }
        );

        if (!tokenRes) {
          addNotification({
            type: "error",
            message: "Something went wrong, please try again",
            duration: 3000,
          });
          return;
        }

        setToken(tokenRes.token);
        setUserType(tokenRes.userType);
        // Fetch tenant data after successful token
        if (fetchTenantData) {
          await fetchTenantData();
        }
        if (websocket && isConnected && tokenRes.userType === "host") {
          if (requestTimerRef.current) {
            clearTimeout(requestTimerRef.current);
          }

          requestTimerRef.current = setTimeout(() => {
            if (isConnected && isMounted.current) {
              websocket.sendMessage("getGuestRequests", { roomName });
            }
            requestTimerRef.current = null;
          }, 1000);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message?.includes("Rate limit exceeded")
        ) {
          addNotification({
            type: "error",
            message:
              "Too many token requests. Please wait a moment and try again.",
            duration: 5000,
          });
        } else {
          console.error("Token generation failed:", error);
          addNotification({
            type: "error",
            message: "Failed to generate token",
            duration: 3000,
          });
        }
      }
    },
    [
      publicKey,
      roomName,
      addNotification,
      apiClient,
      websocket,
      isConnected,
      isWebSocketInitialized,
      connectWebSocket,
      requestManager,
    ]
  );

  return (
    <StreamContext.Provider
      value={{
        roomName,
        userType,
        setUserType,
        websocket,
        streamMetadata,
        setStreamMetadata,
        guestRequests,
        setGuestRequests,
        raisedHands,
        setRaisedHands,
        identity,
        setIdentity,
        token,
        generateToken,
        setToken,
        currentTime,
        setCurrentTime,
        setVideoEnabled,
        setAudioEnabled,
        audioEnabled,
        videoEnabled,
        nickname,
        setNickname,
        participants,
        participantCount: participants.length,
        isLoadingParticipants,
        isLoadingStreamMetadata,
        refreshParticipants: () => fetchParticipants(true),
        refreshStreamMetadata: () => fetchStreamMetadata(true),
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};
