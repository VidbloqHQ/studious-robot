import { useState, useEffect, useCallback, createContext, useRef } from "react";
import {
  useNotification,
  useRequirePublicKey,
  useWebSocket,
  useTenantContext,
} from "../hooks";
import {
  UserType,
  StreamMetadata,
  GuestRequest,
  Agenda,
  TokenResponse,
  StreamResponse,
  Participant,
  RaisedHand,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
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
  websocket: ReturnType<typeof useWebSocket> | null;
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
  agendas: Agenda[];
  setAgendas: (agendas: Agenda[]) => void;
  currentTime: number;
  setCurrentTime: (val: number) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (val: boolean) => void;
  // New participant management
  participants: Participant[];
  participantCount: number;
  isLoadingParticipants: boolean;
  refreshParticipants: () => Promise<void>;
};

export const StreamContext = createContext<StreamContextType | null>(null);

export const StreamProvider = ({
  children,
  roomName,
}: {
  children: React.ReactNode;
  roomName: string;
}) => {
  const { websocket, apiClient } = useTenantContext();

  // State variables
  const [streamMetadata, setStreamMetadata] = useState<StreamMetadata>({
    title: "",
    callType: "",
    creatorWallet: "",
    streamSessionType: "",
  });
  const [userType, setUserType] = useState<UserType | null>(null);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [identity, setIdentity] = useState<string>();
  const [token, setToken] = useState<string>();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [nickname, setNickname] = useState<string>("");

  // Participant management state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState<boolean>(true);
  const lastParticipantUpdateRef = useRef(Date.now());
  const fetchingParticipantsRef = useRef(false);
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());

  // Track if event listeners are registered to avoid duplicate listeners
  const [eventListenersRegistered, setEventListenersRegistered] = useState<boolean>(false);

  // Refs for tracking component state and preserving values across renders
  const isMounted = useRef<boolean>(true);
  const guestRequestsRef = useRef<GuestRequest[]>([]);
  const raisedHandsRef = useRef<RaisedHand[]>([]);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { publicKey } = useRequirePublicKey();
  const { addNotification } = useNotification();

  // Set component as mounted and handle cleanup
  useEffect(() => {
    isMounted.current = true;
    // console.log("StreamContext mounted");

    return () => {
      isMounted.current = false;
      // console.log("StreamContext unmounted");

      // Clear any pending timers
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, []);

  // Fetch participants from the API
  const fetchParticipants = useCallback(async () => {
    if (fetchingParticipantsRef.current) return;
    fetchingParticipantsRef.current = true;
    
    try {
      setIsLoadingParticipants(true);
      const data = await apiClient.get<{ participants: Participant[] }>(
        `/participant/${roomName}`
      );
  
      const activeParticipants = data.participants.filter(
        (participant) => participant.leftAt === null
      );
  
      participantsMapRef.current.clear();
      activeParticipants.forEach(p => {
        participantsMapRef.current.set(p.id, p);
      });
      
      setParticipants(activeParticipants);
      lastParticipantUpdateRef.current = Date.now();
    } catch (err) {
      console.error("Error fetching participants:", err);
    } finally {
      setIsLoadingParticipants(false);
      fetchingParticipantsRef.current = false;
    }
  }, [roomName, apiClient]);

  // Debounced fetch
  const debouncedFetchRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    debouncedFetchRef.current = debounce(() => {
      if (Date.now() - lastParticipantUpdateRef.current > 10000) {
        fetchParticipants();
      }
    }, 2000);
  }, [fetchParticipants]);

  const debouncedFetch = useCallback(() => {
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current();
    }
  }, []);

  // Set up event listeners for WebSocket events
  useEffect(() => {
    if (!roomName || !userType || !websocket || eventListenersRegistered) {
      return;
    }

    // console.log("Setting up WebSocket event listeners in StreamContext");
    setEventListenersRegistered(true);

    // Handle participant events
    const handleParticipantJoined = (data: { participantId: string }) => {
      // console.log("Participant joined:", data.participantId);
      if (!participantsMapRef.current.has(data.participantId)) {
        debouncedFetch();
      }
    };

    const handleParticipantLeft = (data: { participantId: string }) => {
      // console.log("Participant left:", data.participantId);
      setParticipants((prev) => {
        const updated = prev.filter((p) => p.id !== data.participantId);
        participantsMapRef.current.delete(data.participantId);
        return updated;
      });
      lastParticipantUpdateRef.current = Date.now();
    };

    // Listen for guest requests updates
    const handleGuestRequestsUpdate = (data: GuestRequest[]) => {
      // console.log("Stream context received guest requests update:", data);
      if (!isMounted.current || !data) return;
      const requestsCopy = Array.isArray(data) ? [...data] : [];
      guestRequestsRef.current = requestsCopy;
      setGuestRequests(requestsCopy);
    };

    // Handle raised hands updates
    const handleRaisedHandsUpdate = (data: RaisedHand[]) => {
      // console.log("Stream context received raised hands update:", data);
      if (!isMounted.current || !data) return;
      
      const handsCopy = Array.isArray(data) ? [...data] : [];
      raisedHandsRef.current = handsCopy;
      setRaisedHands(handsCopy);
    };

    // Handle hand acknowledged (for participants who raised their hand)
    const handleHandAcknowledged = (data: { roomName: string }) => {
      if (data.roomName === roomName) {
        addNotification({
          type: "success",
          message: "Your raised hand has been acknowledged!",
          duration: 3000,
        });
      }
    };

    // Listen for time sync
    const handleTimeSync = (serverTime: number) => {
      // console.log("Time sync received:", serverTime);
      setCurrentTime(serverTime);
    };

    // Listen for initial sync
    const handleInitialSync = (data: {
      currentTime: number;
      executedActions: string[];
      joinTime: number;
    }) => {
      // console.log("Initial sync received:", data);
      setCurrentTime(data.currentTime);

      if (websocket.isConnected && userType === "host") {
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        requestTimerRef.current = setTimeout(() => {
          // console.log("Requesting guest requests after initial sync");
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getGuestRequests", { roomName });
          }
          requestTimerRef.current = null;
        }, 1000);
      }

      // Request raised hands for meetings
      if (streamMetadata.streamSessionType === "meeting") {
        setTimeout(() => {
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getRaisedHands", { roomName });
          }
        }, 1100);
      }
    };

    // Add event listeners
    websocket.addEventListener("participantJoined", handleParticipantJoined);
    websocket.addEventListener("participantLeft", handleParticipantLeft);
    websocket.addEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
    websocket.addEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
    websocket.addEventListener("handAcknowledged", handleHandAcknowledged);
    websocket.addEventListener("timeSync", handleTimeSync);
    websocket.addEventListener("initialSync", handleInitialSync);

    // Initial fetch
    fetchParticipants();

    // Cleanup
    return () => {
      // console.log("Cleaning up stream context event listeners");
      if (websocket) {
        websocket.removeEventListener("participantJoined", handleParticipantJoined);
        websocket.removeEventListener("participantLeft", handleParticipantLeft);
        websocket.removeEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
        websocket.removeEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
        websocket.removeEventListener("handAcknowledged", handleHandAcknowledged);
        websocket.removeEventListener("timeSync", handleTimeSync);
        websocket.removeEventListener("initialSync", handleInitialSync);
      }
      setEventListenersRegistered(false);

      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [roomName, userType, websocket, websocket?.isConnected, debouncedFetch, fetchParticipants, streamMetadata.streamSessionType, addNotification]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastParticipantUpdateRef.current > 120000) {
        fetchParticipants();
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  // Handle WebSocket reconnections
  useEffect(() => {
    if (!websocket || !roomName || !userType) return;

    const handleWebSocketConnect = () => {
      // console.log("WebSocket reconnected - refreshing data");
      setEventListenersRegistered(false);

      if (userType === "host" && websocket.isConnected && isMounted.current) {
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        requestTimerRef.current = setTimeout(() => {
          // console.log("Re-requesting guest requests after reconnect");
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getGuestRequests", { roomName });
          }
          requestTimerRef.current = null;
        }, 1500);
      }

      // Request raised hands for meetings after reconnect
      if (streamMetadata.streamSessionType === "meeting") {
        setTimeout(() => {
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getRaisedHands", { roomName });
          }
        }, 1600);
      }

      // Refresh participants after reconnect
      setTimeout(() => {
        fetchParticipants();
      }, 2000);
    };

    window.addEventListener("connect", handleWebSocketConnect);

    return () => {
      window.removeEventListener("connect", handleWebSocketConnect);

      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [websocket, roomName, userType, fetchParticipants, streamMetadata.streamSessionType]);

  // Fetch stream data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const streamData = await apiClient.get<StreamResponse>(
          `/stream/${roomName}`
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
          }));
        }
      } catch (error) {
        console.error("Failed to fetch stream data:", error);
      }
    };

    fetchData();
  }, [roomName, apiClient]);

  // Token generation function
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

      const walletAddress = publicKey.toBase58();
      const data = {
        roomName,
        userName: username,
        wallet: walletAddress,
        avatarUrl
      };

      try {
        const tokenRes = await apiClient.post<TokenResponse>(
          "/stream/token",
          data
        );

        if (!tokenRes) {
          addNotification({
            type: "error",
            message: "Something went wrong, please try again",
            duration: 3000,
          });
          return;
        }

        // console.log("Token generated with user type:", tokenRes.userType);
        setToken(tokenRes.token);
        setUserType(tokenRes.userType);

        if (
          websocket &&
          websocket.isConnected &&
          tokenRes.userType === "host"
        ) {
          // console.log(
          //   "Host login detected - will request existing guest requests"
          // );

          if (requestTimerRef.current) {
            clearTimeout(requestTimerRef.current);
          }

          requestTimerRef.current = setTimeout(() => {
            if (websocket.isConnected && isMounted.current) {
              // console.log("Requesting guest requests after authentication");
              websocket.sendMessage("getGuestRequests", { roomName });
            }
            requestTimerRef.current = null;
          }, 1000);
        }
      } catch (error) {
        console.error("Token generation failed:", error);
        addNotification({
          type: "error",
          message: "Failed to generate token",
          duration: 3000,
        });
      }
    },
    [publicKey, roomName, addNotification, apiClient, websocket]
  );

  return (
    <StreamContext.Provider
      value={{
        roomName,
        userType,
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
        agendas,
        setAgendas,
        currentTime,
        setCurrentTime,
        setVideoEnabled,
        setAudioEnabled,
        audioEnabled,
        videoEnabled,
        nickname, 
        setNickname,
        // Participant management
        participants,
        participantCount: participants.length,
        isLoadingParticipants,
        refreshParticipants: fetchParticipants,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};