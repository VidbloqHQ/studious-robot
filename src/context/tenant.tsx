/* eslint-disable @typescript-eslint/no-explicit-any */
// import { createContext, useState, useEffect, useRef, useCallback } from "react";
// import { baseApi, ApiClient, websocketUrl } from "../utils/index";
// import { TenantContextType, Tenant, TenantResponse } from "../types/index";
// import { useWebSocket } from "../hooks/index";

// export const TenantContext = createContext<TenantContextType | null>(null);

// type TenantProviderProps = {
//   children: React.ReactNode;
//   apiKey: string;
//   apiSecret: string;
//   websocketUrl?: string;
// };

// export const TenantProvider = ({
//   children,
//   apiKey,
//   apiSecret,
//   websocketUrl: customWebsocketUrl,
// }: TenantProviderProps) => {
//   const [isConnected, setIsConnected] = useState(false);
//   const [apiClient] = useState(() => new ApiClient(apiKey, apiSecret, baseApi));
//   const [tenant, setTenant] = useState<Tenant | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // Use custom websocket URL or default
//   const wsUrl = customWebsocketUrl || websocketUrl;

//   // Always call the hook (to follow React's rules)
//   const ws = useWebSocket({
//     url: wsUrl,
//     reconnectInterval: 10000, // 10 seconds between reconnect attempts
//     reconnectAttempts: 5,
//     onOpen: () => {
//       // console.log("WebSocket connected");
//       // Authenticate immediately after connection
//       ws.sendMessage("authenticate", { apiKey, apiSecret });
//     },
//     onClose: () => {
//       // console.log("WebSocket disconnected");
//       setIsConnected(false);
//     },
//     onError: (error) => {
//       console.error("WebSocket error:", error);
//       setIsConnected(false);
//     },
//   });

//   // Store the instance in a ref for connection persistence
//   const wsInstanceRef = useRef(ws);

//   // Update the ref if needed - but keep the same instance
//   useEffect(() => {
//     // Only update ref if the ws object changes (should be rare)
//     if (wsInstanceRef.current !== ws) {
//       // console.log("WebSocket instance updated");
//       wsInstanceRef.current = ws;
//     }
//   }, [ws]);

//   // Set up authentication response handler
//   useEffect(() => {
//     const handleAuthResponse = (response: {
//       success: boolean;
//       error?: string;
//     }) => {
//       if (response.success) {
//         // console.log("WebSocket authenticated successfully");
//         setIsConnected(true);
//       } else {
//         console.error("WebSocket authentication failed:", response.error);
//         setIsConnected(false);
//       }
//     };

//     ws.addEventListener("authResponse", handleAuthResponse);

//     return () => {
//       ws.removeEventListener("authResponse", handleAuthResponse);
//     };
//   }, [ws]);

//   // Function to connect and authenticate with the WebSocket server
//   const connect = useCallback(async (): Promise<void> => {
//     if (!ws.isConnected) {
//       try {
//         ws.connect();
//         // Authentication will happen in the onOpen handler
//       } catch (error) {
//         console.error("Failed to connect to WebSocket:", error);
//         throw error;
//       }
//     } else {
//       // If already connected, just re-authenticate
//       ws.sendMessage("authenticate", { apiKey, apiSecret });
//     }
//   }, [ws, apiKey, apiSecret]);

//   // Function to disconnect from the WebSocket server
//   const disconnect = useCallback((): void => {
//     ws.disconnect();
//     setIsConnected(false);
//   }, [ws]);

//   // Connect WebSocket when the component mounts - with longer delay
//   useEffect(() => {
//     // console.log("TenantProvider mounted");
//     const timer = setTimeout(() => {
//       connect().catch((error) => {
//         console.error("Initial WebSocket connection failed:", error);
//       });
//     }, 2000); // Increased to 2 seconds for more stability

//     return () => {
//       // console.log("TenantProvider unmounting");
//       clearTimeout(timer);
//       // Don't disconnect on unmount during development to prevent rapid cycles
//       // disconnect();
//     };
//   }, [connect, disconnect]);

//   // Fetch tenant data once and store in local storage
//   useEffect(() => {
//     const fetchTenantData = async () => {
//       setIsLoading(true);
//       try {
//         // Make API call to get tenant data
//         const response = await apiClient.get<TenantResponse>("/tenant/me/info");
//         setTenant(response.tenant);

//       } catch (error) {
//         console.error("Failed to fetch tenant data:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     if (apiClient) {
//       fetchTenantData();
//     }
//   }, [apiClient]);

//   const contextValue: TenantContextType = {
//     apiKey,
//     apiSecret,
//     websocket: ws,
//     isConnected,
//     connect,
//     disconnect,
//     apiClient,
//     tenant,
//     isLoading,
//   };

//   return (
//     <TenantContext.Provider value={contextValue}>
//       {children}
//     </TenantContext.Provider>
//   );
// };

// TenantProvider.tsx - Updated to use WebSocket singleton
import { createContext, useState, useEffect, useCallback } from "react";
import { baseApi, ApiClient, websocketUrl } from "../utils/index";
import { TenantContextType, Tenant, TenantResponse } from "../types/index";
import { wsManager } from "../utils/websocket-manager"; // Import the singleton

export const TenantContext = createContext<TenantContextType | null>(null);

type TenantProviderProps = {
  children: React.ReactNode;
  apiKey: string;
  apiSecret: string;
  websocketUrl?: string;
};

export const TenantProvider = ({
  children,
  apiKey,
  apiSecret,
  websocketUrl: customWebsocketUrl,
}: TenantProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [apiClient] = useState(() => new ApiClient(apiKey, apiSecret, baseApi));
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use custom websocket URL or default
  const wsUrl = customWebsocketUrl || websocketUrl;

  // Initialize WebSocket singleton
  useEffect(() => {
    // Only initialize once
    wsManager.initialize(wsUrl, {
      onOpen: () => {
        console.log("WebSocket opened, authenticating...");
        wsManager.send("authenticate", { apiKey, apiSecret });
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      },
    }).catch(error => {
      console.error("Failed to initialize WebSocket:", error);
    });

    // Listen for authentication response
    const handleAuthResponse = (response: { success: boolean; error?: string }) => {
      if (response.success) {
        console.log("WebSocket authenticated successfully");
        setIsConnected(true);
      } else {
        console.error("WebSocket authentication failed:", response.error);
        setIsConnected(false);
      }
    };

    // Listen for connection status changes
    const handleConnectionChange = (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    };

    wsManager.addEventListener("authResponse", handleAuthResponse);
    wsManager.addEventListener("connected", handleConnectionChange);
    wsManager.addEventListener("disconnected", handleConnectionChange);

    // Check initial connection state
    setIsConnected(wsManager.isConnected);

    // Cleanup listeners on unmount
    return () => {
      wsManager.removeEventListener("authResponse", handleAuthResponse);
      wsManager.removeEventListener("connected", handleConnectionChange);
      wsManager.removeEventListener("disconnected", handleConnectionChange);
      // Don't disconnect on component unmount - let the singleton manage it
    };
  }, [wsUrl, apiKey, apiSecret]);

  // Fetch tenant data
  useEffect(() => {
    const fetchTenantData = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<TenantResponse>("/tenant/me/info");
        setTenant(response.tenant);
      } catch (error) {
        console.error("Failed to fetch tenant data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (apiClient) {
      fetchTenantData();
    }
  }, [apiClient]);

  // Create a wrapper for the WebSocket that matches your existing interface
  const websocketWrapper = {
    isConnected: wsManager.isConnected,
    sendMessage: (event: string, data: any) => wsManager.send(event, data),
    addEventListener: (event: string, listener: (data: any) => void) => 
      wsManager.addEventListener(event, listener),
    removeEventListener: (event: string, listener: (data: any) => void) => 
      wsManager.removeEventListener(event, listener),
    connect: () => wsManager.initialize(wsUrl, {
      onOpen: () => {
        wsManager.send("authenticate", { apiKey, apiSecret });
      }
    }),
    disconnect: () => wsManager.disconnect(),
    
    // Add your room management methods
    joinRoom: (roomName: string, participantId: string) => 
      wsManager.send('joinRoom', { roomName, participantId }),
    requestToSpeak: (roomName: string, participantId: string, name: string, walletAddress: string) =>
      wsManager.send('requestToSpeak', { roomName, participantId, name, walletAddress }),
    raiseHand: (roomName: string, participantId: string, name: string, walletAddress: string) =>
      wsManager.send('raiseHand', { roomName, participantId, name, walletAddress }),
    lowerHand: (roomName: string, participantId: string) =>
      wsManager.send('lowerHand', { roomName, participantId }),
    acknowledgeHand: (roomName: string, participantId: string) =>
      wsManager.send('acknowledgeHand', { roomName, participantId }),
    inviteGuest: (roomName: string, participantId: string) =>
      wsManager.send('inviteGuest', { roomName, participantId }),
    returnToGuest: (roomName: string, participantId: string) =>
      wsManager.send('returnToGuest', { roomName, participantId }),
    actionExecuted: (roomName: string, actionId: string) =>
      wsManager.send('actionExecuted', { roomName, actionId }),
    sendReaction: (roomName: string, reaction: string, sender: any) =>
      wsManager.send('sendReaction', { roomName, reaction, sender }),
    startAddon: (type: "Custom" | "Q&A" | "Poll" | "Quiz", data?: any) =>
      wsManager.send('startAddon', { type, data }),
    stopAddon: (type: "Custom" | "Q&A" | "Poll" | "Quiz") =>
      wsManager.send('stopAddon', type),
    
    // These might not be needed with singleton but included for compatibility
    lastMessage: null,
    messageHistory: []
  };

  const contextValue: TenantContextType = {
    apiKey,
    apiSecret,
    websocket: websocketWrapper as any, // Type assertion for compatibility
    isConnected,
    connect: useCallback(async () => {
      return wsManager.initialize(wsUrl, {
        onOpen: () => {
          wsManager.send("authenticate", { apiKey, apiSecret });
        }
      });
    }, [wsUrl, apiKey, apiSecret]),
    disconnect: useCallback(() => websocketWrapper.disconnect(), []),
    apiClient,
    tenant,
    isLoading,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};