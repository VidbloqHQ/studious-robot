import { StreamRoom, StreamView, VidbloqProvider } from "./components";
// import TestingHooks from "./components/TestingHooks";
// import CallControlz from "./components/call-controlz";
// import WebSocketTest from "./components/websockettest";

function App() {
  return (
    <>
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
    </>
  );
}

export default App;
