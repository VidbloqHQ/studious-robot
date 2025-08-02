import { StreamRoom, StreamView, VidbloqProvider } from "./components";
import ErrorBoundary from "./ErrorBoundary";
import SolanaWalletSetter from "./components/SolanaWalletSetter";
import UserView from "./components/ui-remove/user-view";
// import TestingHooks from "./components/TestingHooks"; ded-ihx-vkh
// import CallControlz from "./components/call-controlz"; ki5-kcd-n8v     "build": "tsc && vite build",
// import WebSocketTest from "./components/websockettest"; xu0-7sx-hoz     // "build": "tsup", rnk-vho-hpv

function App() {

  return (
    <ErrorBoundary>
      <SolanaWalletSetter />
      <VidbloqProvider
        // apiKey="sk_5fa927d2ad021016ae36b2656fbf8085"
        // apiSecret="iO24O0xXjuXSsIhfLorPKRS2NvcWjbRswYLcnYAvxk4="
        apiKey="sk_c061e1d6fa8b1438226b1cc8b8764136"
        apiSecret="ZHJEEBSlufheOxXnrMdrBp5QepVf+UAVOaLAUKHa+14="
      >
        <StreamRoom roomName={"ejw-6ti-it5"}>
          <StreamView> 
            <UserView />
          </StreamView>
        </StreamRoom>
      </VidbloqProvider>
    </ErrorBoundary>
  );
}

export default App;

// new - i6p-b8z-7w9 w00-10d-9yk lld-bmn-0n1 https://thestreamlink.com/984-7ju-u9e

// dm1-vus-bql 4ky-7b7-k13 https://thestreamlink.com/9m1-y8c-9d0