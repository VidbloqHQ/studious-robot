import {
  NotificationProvider,
  WalletProvider,
  TenantProvider,
} from "../context/index";
import { ThemeProvider } from "./theme-provider";

type VidbloqProviderProps = {
  children: React.ReactNode;
  apiKey: string;
  apiSecret: string;
  websocketUrl?: string;
};

/**
 * Optimized Vidbloq parent component with built-in request management
 * Request configuration is handled internally to protect the SaaS infrastructure
 * 
 * The request manager initializes automatically when first used by any hook,
 * with internal rate limiting and caching configuration to prevent API overload.
 */
const VidbloqProvider = ({
  children,
  apiKey,
  apiSecret,
}: VidbloqProviderProps) => {
  return (
    <TenantProvider apiKey={apiKey} apiSecret={apiSecret}>
      <ThemeProvider>
        <WalletProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </WalletProvider>
      </ThemeProvider>
    </TenantProvider>
  );
};

export default VidbloqProvider;
