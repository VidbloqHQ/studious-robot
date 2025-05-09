import { StreamRoom, StreamView, VidbloqProvider } from "./components";
import  ErrorBoundary  from "./ErrorBoundary";
import SolanaWalletSetter from "./components/SolanaWalletSetter";
// import TestingHooks from "./components/TestingHooks";
// import CallControlz from "./components/call-controlz"; ki5-kcd-n8v     "build": "tsc && vite build",
// import WebSocketTest from "./components/websockettest"; xu0-7sx-hoz     // "build": "tsup", rnk-vho-hpv

function App() {
  // const showDebug = isIOSBrowser();
  return (
    <ErrorBoundary>
        <SolanaWalletSetter />
        <VidbloqProvider
          apiKey="sk_5fa927d2ad021016ae36b2656fbf8085"
          apiSecret="iO24O0xXjuXSsIhfLorPKRS2NvcWjbRswYLcnYAvxk4="
        >
          <StreamRoom roomName={"ki5-kcd-n8v"}> 
            <StreamView />
          </StreamRoom>
          {/* <TestingHooks /> */}
          {/* <WebSocketTest /> */}
          {/* <CallControlz /> */}
        </VidbloqProvider>
    </ErrorBoundary>
  );
}

export default App;