import { createContext, useState, useEffect, useRef, useCallback } from "react";
import { baseApi, ApiClient, websocketUrl } from "../utils/index";
import { TenantContextType, Tenant, TenantResponse } from "../types/index";
import { useWebSocket } from "../hooks/index";

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

  // Always call the hook (to follow React's rules)
  const ws = useWebSocket({
    url: wsUrl,
    reconnectInterval: 10000, // 10 seconds between reconnect attempts
    reconnectAttempts: 3,
    onOpen: () => {
      // console.log("WebSocket connected");
      // Authenticate immediately after connection
      ws.sendMessage("authenticate", { apiKey, apiSecret });
    },
    onClose: () => {
      // console.log("WebSocket disconnected");
      setIsConnected(false);
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    },
  });

  // Store the instance in a ref for connection persistence
  const wsInstanceRef = useRef(ws);

  // Update the ref if needed - but keep the same instance
  useEffect(() => {
    // Only update ref if the ws object changes (should be rare)
    if (wsInstanceRef.current !== ws) {
      // console.log("WebSocket instance updated");
      wsInstanceRef.current = ws;
    }
  }, [ws]);

  // Set up authentication response handler
  useEffect(() => {
    const handleAuthResponse = (response: {
      success: boolean;
      error?: string;
    }) => {
      if (response.success) {
        // console.log("WebSocket authenticated successfully");
        setIsConnected(true);
      } else {
        console.error("WebSocket authentication failed:", response.error);
        setIsConnected(false);
      }
    };

    ws.addEventListener("authResponse", handleAuthResponse);

    return () => {
      ws.removeEventListener("authResponse", handleAuthResponse);
    };
  }, [ws]);

  // Function to connect and authenticate with the WebSocket server
  const connect = useCallback(async (): Promise<void> => {
    if (!ws.isConnected) {
      try {
        ws.connect();
        // Authentication will happen in the onOpen handler
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
        throw error;
      }
    } else {
      // If already connected, just re-authenticate
      ws.sendMessage("authenticate", { apiKey, apiSecret });
    }
  }, [ws, apiKey, apiSecret]);

  // Function to disconnect from the WebSocket server
  const disconnect = useCallback((): void => {
    ws.disconnect();
    setIsConnected(false);
  }, [ws]);

  // Connect WebSocket when the component mounts - with longer delay
  useEffect(() => {
    // console.log("TenantProvider mounted");
    const timer = setTimeout(() => {
      connect().catch((error) => {
        console.error("Initial WebSocket connection failed:", error);
      });
    }, 2000); // Increased to 2 seconds for more stability

    return () => {
      // console.log("TenantProvider unmounting");
      clearTimeout(timer);
      // Don't disconnect on unmount during development to prevent rapid cycles
      // disconnect();
    };
  }, [connect, disconnect]);

  // Fetch tenant data
  useEffect(() => {
    const fetchTenantData = async () => {
      setIsLoading(true);
      try {
        // Make API call to get tenant data
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

  const contextValue: TenantContextType = {
    apiKey,
    apiSecret,
    websocket: ws,
    isConnected,
    connect,
    disconnect,
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
