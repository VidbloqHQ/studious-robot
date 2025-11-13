/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { baseApi, ApiClient, websocketUrl } from "../utils/index";
import { TenantContextType, Tenant, TenantResponse } from "../types/index";
import { wsManager } from "../utils/websocket-manager";

export const TenantContext = createContext<TenantContextType | null>(null);

type TenantProviderProps = {
  children: React.ReactNode;
  apiKey: string;
  apiSecret: string;
  websocketUrl?: string;
  autoConnect?: boolean; // Add this prop to control auto-connection
};

export const TenantProvider = ({
  children,
  apiKey,
  apiSecret,
  websocketUrl: customWebsocketUrl,
  autoConnect = false, // Default to false - no auto-connect
}: TenantProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [apiClient] = useState(() => new ApiClient(apiKey, apiSecret, baseApi));
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);
  const listenersSetupRef = useRef(false);

  // Use custom websocket URL or default
  const wsUrl = customWebsocketUrl || websocketUrl;

  // Setup WebSocket event listeners (separate from connection)
  const setupWebSocketListeners = useCallback(() => {
    if (listenersSetupRef.current) return;
    listenersSetupRef.current = true;

    const handleAuthResponse = (response: { success: boolean; error?: string }) => {
      if (response.success) {
        console.log("WebSocket authenticated successfully");
        setIsConnected(true);
      } else {
        console.error("WebSocket authentication failed:", response.error);
        setIsConnected(false);
      }
    };

    const handleConnectionChange = (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    };

    wsManager.addEventListener("authResponse", handleAuthResponse);
    wsManager.addEventListener("connected", handleConnectionChange);
    wsManager.addEventListener("disconnected", handleConnectionChange);

    return () => {
      wsManager.removeEventListener("authResponse", handleAuthResponse);
      wsManager.removeEventListener("connected", handleConnectionChange);
      wsManager.removeEventListener("disconnected", handleConnectionChange);
      listenersSetupRef.current = false;
    };
  }, []);

  // Manual connect function that can be called on-demand
  const connectWebSocket = useCallback(async () => {
    if (initializingRef.current || isInitialized) {
      console.log("WebSocket already initialized or initializing");
      return;
    }

    initializingRef.current = true;

    try {
      // Setup listeners before connecting
      setupWebSocketListeners();

      await wsManager.initialize(wsUrl, {
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
      });

      setIsInitialized(true);
      console.log("WebSocket initialization complete");
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
      setIsConnected(false);
    } finally {
      initializingRef.current = false;
    }
  }, [wsUrl, apiKey, apiSecret, setupWebSocketListeners]);

  // Disconnect function
  const disconnectWebSocket = useCallback(() => {
    wsManager.disconnect();
    setIsConnected(false);
    setIsInitialized(false);
  }, []);

  // Only auto-connect if explicitly enabled
  useEffect(() => {
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      // Cleanup listeners on unmount
      if (listenersSetupRef.current) {
        setupWebSocketListeners();
      }
    };
  }, [autoConnect, connectWebSocket, setupWebSocketListeners]);

  // Check initial connection state
  useEffect(() => {
    if (isInitialized) {
      setIsConnected(wsManager.isConnected);
    }
  }, [isInitialized]);


  const fetchTenantData = useCallback(async () => {
    if (!isInitialized) {
      console.log('Cannot fetch tenant - WebSocket not initialized');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiClient.get<TenantResponse>("/tenant/me/info");
      setTenant(response.tenant);
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, isInitialized]);

  // Create a wrapper for the WebSocket that matches your existing interface
  const websocketWrapper = {
    isConnected: wsManager.isConnected,
    sendMessage: (event: string, data: any) => {
      if (!isInitialized) {
        console.warn(`WebSocket not initialized. Call connect() first.`);
        return false;
      }
      return wsManager.send(event, data);
    },
    addEventListener: (event: string, listener: (data: any) => void) => 
      wsManager.addEventListener(event, listener),
    removeEventListener: (event: string, listener: (data: any) => void) => 
      wsManager.removeEventListener(event, listener),
    connect: connectWebSocket, // Use the lazy connect function
    disconnect: disconnectWebSocket,
    
    // Room management methods
    joinRoom: (roomName: string, participantId: string, walletAddress?: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('joinRoom', { roomName, participantId, ...(walletAddress && { walletAddress }) });
    },
    requestToSpeak: (roomName: string, participantId: string, name: string, walletAddress: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('requestToSpeak', { roomName, participantId, name, walletAddress });
    },
    raiseHand: (roomName: string, participantId: string, name: string, walletAddress: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('raiseHand', { roomName, participantId, name, walletAddress });
    },
    lowerHand: (roomName: string, participantId: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('lowerHand', { roomName, participantId });
    },
    acknowledgeHand: (roomName: string, participantId: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('acknowledgeHand', { roomName, participantId });
    },
    inviteGuest: (roomName: string, participantId: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('inviteGuest', { roomName, participantId });
    },
    returnToGuest: (roomName: string, participantId: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('returnToGuest', { roomName, participantId });
    },
    actionExecuted: (roomName: string, actionId: string) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('actionExecuted', { roomName, actionId });
    },
    sendReaction: (roomName: string, reaction: string, sender: any) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('sendReaction', { roomName, reaction, sender });
    },
    startAddon: (type: "Custom" | "Q&A" | "Poll" | "Quiz", data?: any) => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('startAddon', { type, data });
    },
    stopAddon: (type: "Custom" | "Q&A" | "Poll" | "Quiz") => {
      if (!isInitialized) {
        console.warn("WebSocket not initialized. Call connect() first.");
        return;
      }
      wsManager.send('stopAddon', type);
    },
    
    // These might not be needed with singleton but included for compatibility
    lastMessage: null,
    messageHistory: []
  };

  const contextValue: TenantContextType = {
    apiKey,
    apiSecret,
    websocket: websocketWrapper as any,
    isConnected,
    connect: connectWebSocket, // Expose the manual connect function
    disconnect: disconnectWebSocket,
    apiClient,
    tenant,
    isLoading,
    isWebSocketInitialized: isInitialized,
    fetchTenantData, // Expose the fetch function
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};