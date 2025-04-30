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
  GetStreamResponse,
} from "../types";

type StreamContextType = {
  roomName: string;
  userType: UserType | null;
  websocket: ReturnType<typeof useWebSocket> | null;
  streamMetadata: StreamMetadata;
  setStreamMetadata: (metadata: StreamMetadata) => void;
  guestRequests: GuestRequest[];
  setGuestRequests: (requests: GuestRequest[]) => void;
  identity: string | undefined;
  setIdentity: (identity: string) => void;
  showAgendaModal: boolean;
  setShowAgendaModal: (show: boolean) => void;
  showAddonModal: boolean;
  setShowAddonModal: (show: boolean) => void;
  showTransactionModal: boolean;
  setShowTransactionModal: (show: boolean) => void;
  token: string | undefined;
  generateToken: (val: string) => Promise<void>;
  setToken: (token: string | undefined) => void;
  agendas: Agenda[];
  setAgendas: (agendas: Agenda[]) => void;
  currentTime: number;
  setCurrentTime: (val: number) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  videoEnabled: boolean;
  setVideoEnabled: (val: boolean) => void;
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
  const [identity, setIdentity] = useState<string>();
  const [showAgendaModal, setShowAgendaModal] = useState<boolean>(false);
  const [showAddonModal, setShowAddonModal] = useState<boolean>(false);
  const [showTransactionModal, setShowTransactionModal] =
    useState<boolean>(false);
  const [token, setToken] = useState<string>();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Track if event listeners are registered to avoid duplicate listeners
  const [eventListenersRegistered, setEventListenersRegistered] =
    useState<boolean>(false);

  // Refs for tracking component state and preserving values across renders
  const isMounted = useRef<boolean>(true);
  const guestRequestsRef = useRef<GuestRequest[]>([]);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { publicKey } = useRequirePublicKey();
  const { addNotification } = useNotification();

  // Set component as mounted and handle cleanup
  useEffect(() => {
    isMounted.current = true;
    console.log("StreamContext mounted");

    return () => {
      isMounted.current = false;
      console.log("StreamContext unmounted");

      // Clear any pending timers
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, []);

  // Debug logging for context state changes
  useEffect(() => {
    console.log("userType updated:", userType);
  }, [userType]);

  // Set up event listeners for WebSocket events
  useEffect(() => {
    if (!roomName || !userType || !websocket) {
      console.log("Not setting up event listeners - missing prerequisites", {
        roomName,
        userType,
        websocketConnected: !!websocket,
      });
      return;
    }

    if (eventListenersRegistered) {
      console.log("Event listeners already registered, skipping");
      return;
    }

    console.log("Setting up WebSocket event listeners in StreamContext");
    setEventListenersRegistered(true);

    // Listen for guest requests updates
    const handleGuestRequestsUpdate = (data: GuestRequest[]) => {
      console.log("Stream context received guest requests update:", data);

      if (!isMounted.current || !data) return;

      // Create a stable copy of the array and ensure it's not empty
      const requestsCopy = Array.isArray(data) ? [...data] : [];

      // Store in ref for persistence across renders
      guestRequestsRef.current = requestsCopy;

      // Update state
      setGuestRequests(requestsCopy);
    };

    // Listen for time sync
    const handleTimeSync = (serverTime: number) => {
      console.log("Time sync received:", serverTime);
      setCurrentTime(serverTime);
    };

    // Listen for initial sync
    const handleInitialSync = (data: {
      currentTime: number;
      executedActions: string[];
      joinTime: number;
    }) => {
      console.log("Initial sync received:", data);
      setCurrentTime(data.currentTime);

      // Re-request guest requests when we get initial sync
      if (websocket.isConnected && userType === "host") {
        // Clear any existing timer
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        // Set a new timer
        requestTimerRef.current = setTimeout(() => {
          console.log("Requesting guest requests after initial sync");
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getGuestRequests", { roomName });
          }
          requestTimerRef.current = null;
        }, 1000);
      }
    };

    // Add event listeners
    websocket.addEventListener(
      "guestRequestsUpdate",
      handleGuestRequestsUpdate
    );
    websocket.addEventListener("timeSync", handleTimeSync);
    websocket.addEventListener("initialSync", handleInitialSync);

    // Explicitly request guest requests when first connected
    if (websocket.isConnected && userType === "host") {
      // Clear any existing timer
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
      }

      // Set a new timer
      requestTimerRef.current = setTimeout(() => {
        console.log("Initial request for guest requests");
        if (websocket.isConnected && isMounted.current) {
          websocket.sendMessage("getGuestRequests", { roomName });
        }
        requestTimerRef.current = null;
      }, 1000);
    }

    // Clean up event listeners when component unmounts
    return () => {
      console.log("Cleaning up stream context event listeners");
      if (websocket) {
        websocket.removeEventListener(
          "guestRequestsUpdate",
          handleGuestRequestsUpdate
        );
        websocket.removeEventListener("timeSync", handleTimeSync);
        websocket.removeEventListener("initialSync", handleInitialSync);
      }
      setEventListenersRegistered(false);

      // Clear any pending timers
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [roomName, userType, websocket, websocket?.isConnected]);

  // Handle WebSocket reconnections
  useEffect(() => {
    if (!websocket || !roomName || !userType) return;

    const handleWebSocketConnect = () => {
      console.log("WebSocket reconnected - refreshing guest requests");

      // Reset listeners registered flag to allow re-registration
      setEventListenersRegistered(false);

      // Request guest requests again after connection reestablished
      if (userType === "host" && websocket.isConnected && isMounted.current) {
        // Clear any existing timer
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        // Set a new timer
        requestTimerRef.current = setTimeout(() => {
          console.log("Re-requesting guest requests after reconnect");
          if (websocket.isConnected && isMounted.current) {
            websocket.sendMessage("getGuestRequests", { roomName });
          }
          requestTimerRef.current = null;
        }, 1500);
      }
    };

    window.addEventListener("connect", handleWebSocketConnect);

    return () => {
      window.removeEventListener("connect", handleWebSocketConnect);

      // Clear any pending timers
      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [websocket, roomName, userType]);

  // Fetch stream data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const streamData = await apiClient.get<GetStreamResponse>(
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
    async (username: string) => {
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

        console.log("Token generated with user type:", tokenRes.userType);
        setToken(tokenRes.token);
        setUserType(tokenRes.userType); // Make sure this is executed

        // Request existing guest requests right after authentication
        if (
          websocket &&
          websocket.isConnected &&
          tokenRes.userType === "host"
        ) {
          console.log(
            "Host login detected - will request existing guest requests"
          );

          // Clear any existing timer
          if (requestTimerRef.current) {
            clearTimeout(requestTimerRef.current);
          }

          // Set a new timer
          requestTimerRef.current = setTimeout(() => {
            if (websocket.isConnected && isMounted.current) {
              console.log("Requesting guest requests after authentication");
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
        identity,
        setIdentity,
        showAgendaModal,
        setShowAgendaModal,
        showAddonModal,
        setShowAddonModal,
        showTransactionModal,
        setShowTransactionModal,
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
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};
