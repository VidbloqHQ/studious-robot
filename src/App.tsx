import { StreamRoom, StreamView, VidbloqProvider } from "./components";
import IOSCameraDebug from "./components/IOSCameraDebug";
import LiveKitWrapper from "./components/LiveKitWrapper";
import  ErrorBoundary  from "./ErrorBoundary";
import { isIOSBrowser } from "./utils/ios-direct-fix";
import SolanaWalletSetter from "./components/SolanaWalletSetter";
// import TestingHooks from "./components/TestingHooks";
// import CallControlz from "./components/call-controlz"; ki5-kcd-n8v
// import WebSocketTest from "./components/websockettest"; xu0-7sx-hoz     // "build": "tsup",

function App() {
  const showDebug = isIOSBrowser();
  return (
    <ErrorBoundary>
      <LiveKitWrapper>
        <SolanaWalletSetter />
        {showDebug && <IOSCameraDebug />}
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
      </LiveKitWrapper>
    </ErrorBoundary>
  );
}

export default App;
