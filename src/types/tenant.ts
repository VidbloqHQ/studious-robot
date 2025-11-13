import { ApiClient } from "../utils";

export type Tenant = {
  id: string;
  creatorWallet: string;
  createdAt: string;
  updatedAt: string;
  
  // Customization fields
  theme?: string; // 'light' | 'dark'
  primaryColor?: string; // Hex color code
  secondaryColor?: string; // Hex color code
  accentColor?: string; // Hex color code
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  
  // Other tenant data
  logo?: string;
  name?: string;
  templateId?: string;
  rpcEndpoint?: string;
  networkCluster?: string;
  defaultStreamType?: string;
  defaultFundingType?: string;
};

export type TenantContextType = {
  apiKey: string;
  apiSecret: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  websocket: any | null; // WebSocket connection or manager
  isConnected: boolean;
  fetchTenantData: () => Promise<void>;
  isWebSocketInitialized: boolean; // Added to track if WebSocket has been initialized
  connect: () => Promise<void>;
  disconnect: () => void;
  apiClient: ApiClient;
  tenant: Tenant | null;
  isLoading: boolean;
}