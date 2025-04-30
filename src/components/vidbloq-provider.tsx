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
 * This is Vidbloq parent component, every other component should be wrapped in this component.
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
