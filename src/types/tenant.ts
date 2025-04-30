import { useWebSocket } from "../hooks";
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
  websocket: ReturnType<typeof useWebSocket>;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  apiClient: ApiClient;
  tenant: Tenant | null;
  isLoading: boolean;
}