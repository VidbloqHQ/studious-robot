// import { useState, useEffect, useCallback, createContext, useRef } from "react";
// import {
//   useNotification,
//   useRequirePublicKey,
//   useWebSocket,
//   useTenantContext,
// } from "../hooks";
// import {
//   UserType,
//   StreamMetadata,
//   GuestRequest,
//   TokenResponse,
//   StreamResponse,
//   Participant,
//   RaisedHand,
// } from "../types";
// import { getRequestManager } from "../utils/request-manager";

// // Optimized debounce with proper typing
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function debounce<T extends (...args: any[]) => any>(
//   func: T,
//   wait: number
// ): (...args: Parameters<T>) => void {
//   let timeout: ReturnType<typeof setTimeout> | null = null;
  
//   return function(...args: Parameters<T>): void {
//     const later = () => {
//       timeout = null;
//       func(...args);
//     };
    
//     if (timeout !== null) {
//       clearTimeout(timeout);
//     }
//     timeout = setTimeout(later, wait);
//   };
// }

// type StreamContextType = {
//   roomName: string;
//   userType: UserType | null;
//   setUserType: (type: UserType | null) => void;
//   websocket: ReturnType<typeof useWebSocket> | null;
//   streamMetadata: StreamMetadata;
//   setStreamMetadata: (metadata: StreamMetadata) => void;
//   guestRequests: GuestRequest[];
//   setGuestRequests: (requests: GuestRequest[]) => void;
//   raisedHands: RaisedHand[];
//   setRaisedHands: (hands: RaisedHand[]) => void;
//   identity: string | undefined;
//   setIdentity: (identity: string) => void;
//   token: string | undefined;
//   nickname: string;
//   setNickname: React.Dispatch<React.SetStateAction<string>>;
//   generateToken: (val: string, avatarUrl?: string) => Promise<void>;
//   setToken: (token: string | undefined) => void;
//   currentTime: number;
//   setCurrentTime: (val: number) => void;
//   audioEnabled: boolean;
//   setAudioEnabled: (val: boolean) => void;
//   videoEnabled: boolean;
//   setVideoEnabled: (val: boolean) => void;
//   participants: Participant[];
//   participantCount: number;
//   isLoadingParticipants: boolean;
//   isLoadingStreamMetadata: boolean;
//   refreshParticipants: () => Promise<void>;
// };

// export const StreamContext = createContext<StreamContextType | null>(null);

// export const StreamProvider = ({
//   children,
//   roomName,
// }: {
//   children: React.ReactNode;
//   roomName: string;
// }) => {
//   const { websocket, apiClient } = useTenantContext();
//   const requestManager = getRequestManager();

//   // State variables
//   const [streamMetadata, setStreamMetadata] = useState<StreamMetadata>({
//     title: "",
//     callType: "",
//     creatorWallet: "",
//     streamSessionType: "",
//   });
//   const [userType, setUserType] = useState<UserType | null>(null);
//   const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
//   const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
//   const [identity, setIdentity] = useState<string>();
//   const [token, setToken] = useState<string>();
//   const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
//   const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
//   const [currentTime, setCurrentTime] = useState<number>(0);
//   const [nickname, setNickname] = useState<string>("");

//   // Participant management state
//   const [participants, setParticipants] = useState<Participant[]>([]);
//   const [isLoadingParticipants, setIsLoadingParticipants] = useState<boolean>(true);
//   const [isLoadingStreamMetadata, setIsLoadingStreamMetadata] = useState<boolean>(true);
//   const lastParticipantUpdateRef = useRef(Date.now());
//   const fetchingParticipantsRef = useRef(false);
//   const participantsMapRef = useRef<Map<string, Participant>>(new Map());

//   // Track if event listeners are registered to avoid duplicate listeners
//   const [eventListenersRegistered, setEventListenersRegistered] = useState<boolean>(false);

//   // Refs for tracking component state and preserving values across renders
//   const isMounted = useRef<boolean>(true);
//   const guestRequestsRef = useRef<GuestRequest[]>([]);
//   const raisedHandsRef = useRef<RaisedHand[]>([]);
//   const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

//   const { publicKey } = useRequirePublicKey();
//   const { addNotification } = useNotification();

//   // Set component as mounted and handle cleanup
//   useEffect(() => {
//     isMounted.current = true;

//     return () => {
//       isMounted.current = false;
      
//       // Clear any pending timers
//       if (requestTimerRef.current) {
//         clearTimeout(requestTimerRef.current);
//         requestTimerRef.current = null;
//       }
//     };
//   }, []);

//   // Optimized fetch participants with request manager
//   const fetchParticipants = useCallback(async (forceRefresh = false) => {
//     if (fetchingParticipantsRef.current && !forceRefresh) return;
//     fetchingParticipantsRef.current = true;
    
//     const cacheKey = `participants:${roomName}`;
    
//     try {
//       setIsLoadingParticipants(true);
      
//       const data = await requestManager.execute<{ participants: Participant[] }>(
//         cacheKey,
//         async () => apiClient.get<{ participants: Participant[] }>(`/participant/${roomName}`),
//         {
//           cacheType: 'participants',
//           forceRefresh,
//           rateLimitType: 'participants',
//         }
//       );
  
//       const activeParticipants = data.participants.filter(
//         (participant) => participant.leftAt === null
//       );
  
//       participantsMapRef.current.clear();
//       activeParticipants.forEach(p => {
//         participantsMapRef.current.set(p.id, p);
//       });
      
//       setParticipants(activeParticipants);
//       lastParticipantUpdateRef.current = Date.now();
//     } catch (err) {
//       // If rate limit error and we have cached data, just log warning
//       if (err instanceof Error && err.message?.includes('Rate limit exceeded')) {
//         console.warn('Rate limit hit for participants fetch, using cached data');
//       } else {
//         console.error("Error fetching participants:", err);
//       }
//     } finally {
//       setIsLoadingParticipants(false);
//       fetchingParticipantsRef.current = false;
//     }
//   }, [roomName, apiClient, requestManager]);

//   // Debounced fetch with proper initialization
//   const debouncedFetchRef = useRef<(() => void)>(() => {});
  
//   useEffect(() => {
//     debouncedFetchRef.current = debounce(() => {
//       if (Date.now() - lastParticipantUpdateRef.current > 10000) {
//         fetchParticipants();
//       }
//     }, 2000);
//   }, [fetchParticipants]);

//   const debouncedFetch = useCallback(() => {
//     debouncedFetchRef.current();
//   }, []);

//   // Set up event listeners for WebSocket events
//   useEffect(() => {
//     if (!roomName || !userType || !websocket || eventListenersRegistered) {
//       return;
//     }

//     setEventListenersRegistered(true);

//     // Handle participant events
//     const handleParticipantJoined = (data: { participantId: string }) => {
//       if (!participantsMapRef.current.has(data.participantId)) {
//         debouncedFetch();
//       }
//     };

//     const handleParticipantLeft = (data: { participantId: string }) => {
//       setParticipants((prev) => {
//         const updated = prev.filter((p) => p.id !== data.participantId);
//         participantsMapRef.current.delete(data.participantId);
//         // Invalidate cache when participant leaves
//         requestManager.invalidate(`participants:${roomName}`);
//         return updated;
//       });
//       lastParticipantUpdateRef.current = Date.now();
//     };

//     // Listen for guest requests updates
//     const handleGuestRequestsUpdate = (data: GuestRequest[]) => {
//       if (!isMounted.current || !data) return;
//       const requestsCopy = Array.isArray(data) ? [...data] : [];
//       guestRequestsRef.current = requestsCopy;
//       setGuestRequests(requestsCopy);
//     };

//     // Handle raised hands updates
//     const handleRaisedHandsUpdate = (data: RaisedHand[]) => {
//       if (!isMounted.current || !data) return;
      
//       const handsCopy = Array.isArray(data) ? [...data] : [];
//       raisedHandsRef.current = handsCopy;
//       setRaisedHands(handsCopy);
//     };

//     // Handle hand acknowledged (for participants who raised their hand)
//     const handleHandAcknowledged = (data: { roomName: string }) => {
//       if (data.roomName === roomName) {
//         addNotification({
//           type: "success",
//           message: "Your raised hand has been acknowledged!",
//           duration: 3000,
//         });
//       }
//     };

//     // Listen for time sync
//     const handleTimeSync = (serverTime: number) => {
//       setCurrentTime(serverTime);
//     };

//     // Listen for initial sync
//     const handleInitialSync = (data: {
//       currentTime: number;
//       executedActions: string[];
//       joinTime: number;
//     }) => {
//       setCurrentTime(data.currentTime);

//       if (websocket.isConnected && userType === "host") {
//         if (requestTimerRef.current) {
//           clearTimeout(requestTimerRef.current);
//         }

//         requestTimerRef.current = setTimeout(() => {
//           if (websocket.isConnected && isMounted.current) {
//             websocket.sendMessage("getGuestRequests", { roomName });
//           }
//           requestTimerRef.current = null;
//         }, 1000);
//       }

//       // Request raised hands for meetings
//       if (streamMetadata.streamSessionType === "meeting") {
//         setTimeout(() => {
//           if (websocket.isConnected && isMounted.current) {
//             websocket.sendMessage("getRaisedHands", { roomName });
//           }
//         }, 1100);
//       }
//     };

//     // Add event listeners
//     websocket.addEventListener("participantJoined", handleParticipantJoined);
//     websocket.addEventListener("participantLeft", handleParticipantLeft);
//     websocket.addEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
//     websocket.addEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
//     websocket.addEventListener("handAcknowledged", handleHandAcknowledged);
//     websocket.addEventListener("timeSync", handleTimeSync);
//     websocket.addEventListener("initialSync", handleInitialSync);

//     // Initial fetch
//     fetchParticipants();

//     // Cleanup
//     return () => {
//       if (websocket) {
//         websocket.removeEventListener("participantJoined", handleParticipantJoined);
//         websocket.removeEventListener("participantLeft", handleParticipantLeft);
//         websocket.removeEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
//         websocket.removeEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
//         websocket.removeEventListener("handAcknowledged", handleHandAcknowledged);
//         websocket.removeEventListener("timeSync", handleTimeSync);
//         websocket.removeEventListener("initialSync", handleInitialSync);
//       }
//       setEventListenersRegistered(false);

//       if (requestTimerRef.current) {
//         clearTimeout(requestTimerRef.current);
//         requestTimerRef.current = null;
//       }
//     };
//   }, [roomName, userType, websocket, websocket?.isConnected, debouncedFetch, fetchParticipants, 
//       streamMetadata.streamSessionType, addNotification, requestManager]);

//   // Periodic refresh with smart intervals
//   useEffect(() => {
//     const interval = setInterval(() => {
//       // Only refresh if data is stale (2 minutes old)
//       if (Date.now() - lastParticipantUpdateRef.current > 120000) {
//         fetchParticipants(true);
//       }
//     }, 120000); // Check every 2 minutes
    
//     return () => clearInterval(interval);
//   }, [fetchParticipants]);

//   // Handle WebSocket reconnections
//   useEffect(() => {
//     if (!websocket || !roomName || !userType) return;

//     const handleWebSocketConnect = () => {
//       setEventListenersRegistered(false);

//       if (userType === "host" && websocket.isConnected && isMounted.current) {
//         if (requestTimerRef.current) {
//           clearTimeout(requestTimerRef.current);
//         }

//         requestTimerRef.current = setTimeout(() => {
//           if (websocket.isConnected && isMounted.current) {
//             websocket.sendMessage("getGuestRequests", { roomName });
//           }
//           requestTimerRef.current = null;
//         }, 1500);
//       }

//       // Request raised hands for meetings after reconnect
//       if (streamMetadata.streamSessionType === "meeting") {
//         setTimeout(() => {
//           if (websocket.isConnected && isMounted.current) {
//             websocket.sendMessage("getRaisedHands", { roomName });
//           }
//         }, 1600);
//       }

//       // Refresh participants after reconnect
//       setTimeout(() => {
//         fetchParticipants(true);
//       }, 2000);
//     };

//     window.addEventListener("connect", handleWebSocketConnect);

//     return () => {
//       window.removeEventListener("connect", handleWebSocketConnect);

//       if (requestTimerRef.current) {
//         clearTimeout(requestTimerRef.current);
//         requestTimerRef.current = null;
//       }
//     };
//   }, [websocket, roomName, userType, fetchParticipants, streamMetadata.streamSessionType]);

//   // Optimized fetch stream data
//   useEffect(() => {
//     const fetchData = async () => {
//       const cacheKey = `stream:${roomName}`;
      
//       try {
//         const streamData = await requestManager.execute<StreamResponse>(
//           cacheKey,
//           async () => apiClient.get<StreamResponse>(`/stream/${roomName}`),
//           {
//             cacheType: 'stream',
//             rateLimitType: 'stream',
//           }
//         );
        
//         if (streamData.title || streamData.callType) {
//           setStreamMetadata((prev) => ({
//             ...prev,
//             title: streamData.title || prev.title,
//             callType: streamData.callType || prev.callType,
//             streamSessionType:
//               streamData.streamSessionType.toLowerCase() || prev.streamSessionType,
//             creatorWallet: streamData.creatorWallet || prev.creatorWallet,
//           }));
//         }
//       } catch (error) {
//         if (error instanceof Error && error.message?.includes('Rate limit exceeded')) {
//           console.warn('Rate limit hit for stream fetch, using cached data');
//         } else {
//           console.error("Failed to fetch stream data:", error);
//         }
//       }
//     };

//     fetchData();
//   }, [roomName, apiClient, requestManager]);

//   // Token generation function with rate limiting
//   const generateToken = useCallback(
//     async (username: string, avatarUrl?: string) => {
//       if (!publicKey) {
//         addNotification({
//           type: "error",
//           message: "Please, connect your wallet",
//           duration: 3000,
//         });
//         return;
//       }

//       const walletAddress = publicKey.toBase58();
//       const data = {
//         roomName,
//         userName: username,
//         wallet: walletAddress,
//         avatarUrl
//       };

//       try {
//         // Use request manager for token generation with rate limiting
//         const cacheKey = `token:${roomName}:${walletAddress}`;
        
//         const tokenRes = await requestManager.execute<TokenResponse>(
//           cacheKey,
//           async () => apiClient.post<TokenResponse>("/stream/token", data),
//           {
//             cacheType: 'default',
//             rateLimitType: 'token',
//             skipCache: true, // Don't cache tokens
//           }
//         );

//         if (!tokenRes) {
//           addNotification({
//             type: "error",
//             message: "Something went wrong, please try again",
//             duration: 3000,
//           });
//           return;
//         }

//         setToken(tokenRes.token);
//         setUserType(tokenRes.userType);

//         if (websocket && websocket.isConnected && tokenRes.userType === "host") {
//           if (requestTimerRef.current) {
//             clearTimeout(requestTimerRef.current);
//           }

//           requestTimerRef.current = setTimeout(() => {
//             if (websocket.isConnected && isMounted.current) {
//               websocket.sendMessage("getGuestRequests", { roomName });
//             }
//             requestTimerRef.current = null;
//           }, 1000);
//         }
//       } catch (error) {
//         if (error instanceof Error && error.message?.includes('Rate limit exceeded')) {
//           addNotification({
//             type: "error",
//             message: "Too many token requests. Please wait a moment and try again.",
//             duration: 5000,
//           });
//         } else {
//           console.error("Token generation failed:", error);
//           addNotification({
//             type: "error",
//             message: "Failed to generate token",
//             duration: 3000,
//           });
//         }
//       }
//     },
//     [publicKey, roomName, addNotification, apiClient, websocket, requestManager]
//   );

//   return (
//     <StreamContext.Provider
//       value={{
//         roomName,
//         userType,
//         setUserType,
//         websocket,
//         streamMetadata,
//         setStreamMetadata,
//         guestRequests,
//         setGuestRequests,
//         raisedHands,
//         setRaisedHands,
//         identity,
//         setIdentity,
//         token,
//         generateToken,
//         setToken,
//         currentTime,
//         setCurrentTime,
//         setVideoEnabled,
//         setAudioEnabled,
//         audioEnabled,
//         videoEnabled,
//         nickname, 
//         setNickname,
//         participants,
//         participantCount: participants.length,
//         isLoadingParticipants,
//         refreshParticipants: () => fetchParticipants(true),
//       }}
//     >
//       {children}
//     </StreamContext.Provider>
//   );
// };

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
  TokenResponse,
  StreamResponse,
  Participant,
  RaisedHand,
} from "../types";
import { getRequestManager } from "../utils/request-manager";

// Optimized debounce with proper typing
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
  setUserType: (type: UserType | null) => void;
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
  const { websocket, apiClient } = useTenantContext();
  const requestManager = getRequestManager();

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
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [nickname, setNickname] = useState<string>("");

  // Participant management state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState<boolean>(true);
  const [isLoadingStreamMetadata, setIsLoadingStreamMetadata] = useState<boolean>(true);
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
  const fetchParticipants = useCallback(async (forceRefresh = false) => {
    if (fetchingParticipantsRef.current && !forceRefresh) return;
    fetchingParticipantsRef.current = true;
    
    const cacheKey = `participants:${roomName}`;
    
    try {
      setIsLoadingParticipants(true);
      
      const data = await requestManager.execute<{ participants: Participant[] }>(
        cacheKey,
        async () => apiClient.get<{ participants: Participant[] }>(`/participant/${roomName}`),
        {
          cacheType: 'participants',
          forceRefresh,
          rateLimitType: 'participants',
        }
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
      // If rate limit error and we have cached data, just log warning
      if (err instanceof Error && err.message?.includes('Rate limit exceeded')) {
        console.warn('Rate limit hit for participants fetch, using cached data');
      } else {
        console.error("Error fetching participants:", err);
      }
    } finally {
      setIsLoadingParticipants(false);
      fetchingParticipantsRef.current = false;
    }
  }, [roomName, apiClient, requestManager]);

  // Optimized fetch stream metadata with loading state
  const fetchStreamMetadata = useCallback(async (forceRefresh = false) => {
    const cacheKey = `stream:${roomName}`;
    
    try {
      setIsLoadingStreamMetadata(true);
      
      const streamData = await requestManager.execute<StreamResponse>(
        cacheKey,
        async () => apiClient.get<StreamResponse>(`/stream/${roomName}`),
        {
          cacheType: 'stream',
          forceRefresh,
          rateLimitType: 'stream',
        }
      );
      
      if (streamData.title || streamData.callType) {
        setStreamMetadata((prev) => ({
          ...prev,
          title: streamData.title || prev.title,
          callType: streamData.callType || prev.callType,
          streamSessionType:
            streamData.streamSessionType.toLowerCase() || prev.streamSessionType,
          creatorWallet: streamData.creatorWallet || prev.creatorWallet,
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.message?.includes('Rate limit exceeded')) {
        console.warn('Rate limit hit for stream fetch, using cached data');
      } else {
        console.error("Failed to fetch stream data:", error);
      }
    } finally {
      setIsLoadingStreamMetadata(false);
    }
  }, [roomName, apiClient, requestManager]);

  // Debounced fetch with proper initialization
  const debouncedFetchRef = useRef<(() => void)>(() => {});
  
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

  // Set up event listeners for WebSocket events
  useEffect(() => {
    if (!roomName || !userType || !websocket || eventListenersRegistered) {
      return;
    }

    setEventListenersRegistered(true);

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
        // Invalidate cache when participant leaves
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
      setCurrentTime(serverTime);
    };

    // Listen for initial sync
    const handleInitialSync = (data: {
      currentTime: number;
      executedActions: string[];
      joinTime: number;
    }) => {
      setCurrentTime(data.currentTime);

      if (websocket.isConnected && userType === "host") {
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        requestTimerRef.current = setTimeout(() => {
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

    // Handle stream metadata updates from WebSocket
    const handleStreamMetadataUpdate = (data: Partial<StreamMetadata>) => {
      if (!isMounted.current || !data) return;
      
      setStreamMetadata((prev) => ({
        ...prev,
        ...data,
      }));
      
      // Invalidate cache when stream metadata is updated
      requestManager.invalidate(`stream:${roomName}`);
    };

    // Add event listeners
    websocket.addEventListener("participantJoined", handleParticipantJoined);
    websocket.addEventListener("participantLeft", handleParticipantLeft);
    websocket.addEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
    websocket.addEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
    websocket.addEventListener("handAcknowledged", handleHandAcknowledged);
    websocket.addEventListener("timeSync", handleTimeSync);
    websocket.addEventListener("initialSync", handleInitialSync);
    websocket.addEventListener("streamMetadataUpdate", handleStreamMetadataUpdate);

    // Initial fetch
    fetchParticipants();

    // Cleanup
    return () => {
      if (websocket) {
        websocket.removeEventListener("participantJoined", handleParticipantJoined);
        websocket.removeEventListener("participantLeft", handleParticipantLeft);
        websocket.removeEventListener("guestRequestsUpdate", handleGuestRequestsUpdate);
        websocket.removeEventListener("raisedHandsUpdate", handleRaisedHandsUpdate);
        websocket.removeEventListener("handAcknowledged", handleHandAcknowledged);
        websocket.removeEventListener("timeSync", handleTimeSync);
        websocket.removeEventListener("initialSync", handleInitialSync);
        websocket.removeEventListener("streamMetadataUpdate", handleStreamMetadataUpdate);
      }
      setEventListenersRegistered(false);

      if (requestTimerRef.current) {
        clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [roomName, userType, websocket, websocket?.isConnected, debouncedFetch, fetchParticipants, 
      streamMetadata.streamSessionType, addNotification, requestManager]);

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

  // Handle WebSocket reconnections
  useEffect(() => {
    if (!websocket || !roomName || !userType) return;

    const handleWebSocketConnect = () => {
      setEventListenersRegistered(false);

      if (userType === "host" && websocket.isConnected && isMounted.current) {
        if (requestTimerRef.current) {
          clearTimeout(requestTimerRef.current);
        }

        requestTimerRef.current = setTimeout(() => {
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

      // Refresh participants and stream metadata after reconnect
      setTimeout(() => {
        fetchParticipants(true);
        fetchStreamMetadata(true);
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
  }, [websocket, roomName, userType, fetchParticipants, fetchStreamMetadata, streamMetadata.streamSessionType]);

  // Initial fetch stream metadata
  useEffect(() => {
    fetchStreamMetadata();
  }, [fetchStreamMetadata]);

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

      const walletAddress = publicKey.toBase58();
      const data = {
        roomName,
        userName: username,
        wallet: walletAddress,
        avatarUrl
      };

      try {
        // Use request manager for token generation with rate limiting
        const cacheKey = `token:${roomName}:${walletAddress}`;
        
        const tokenRes = await requestManager.execute<TokenResponse>(
          cacheKey,
          async () => apiClient.post<TokenResponse>("/stream/token", data),
          {
            cacheType: 'default',
            rateLimitType: 'token',
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

        if (websocket && websocket.isConnected && tokenRes.userType === "host") {
          if (requestTimerRef.current) {
            clearTimeout(requestTimerRef.current);
          }

          requestTimerRef.current = setTimeout(() => {
            if (websocket.isConnected && isMounted.current) {
              websocket.sendMessage("getGuestRequests", { roomName });
            }
            requestTimerRef.current = null;
          }, 1000);
        }
      } catch (error) {
        if (error instanceof Error && error.message?.includes('Rate limit exceeded')) {
          addNotification({
            type: "error",
            message: "Too many token requests. Please wait a moment and try again.",
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
    [publicKey, roomName, addNotification, apiClient, websocket, requestManager]
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