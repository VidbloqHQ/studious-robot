import { StreamRoom, StreamView, VidbloqProvider } from "./components";
// import IOSCameraDebug from "./components/IOSCameraDebug";
// import LiveKitWrapper from "./components/LiveKitWrapper";
import  ErrorBoundary  from "./ErrorBoundary";
// import { isIOSBrowser } from "./utils/ios-direct-fix";
import SolanaWalletSetter from "./components/SolanaWalletSetter";
// import TestingHooks from "./components/TestingHooks";
// import CallControlz from "./components/call-controlz"; ki5-kcd-n8v     "build": "tsc && vite build",
// import WebSocketTest from "./components/websockettest"; xu0-7sx-hoz     // "build": "tsup",

function App() {
  // const showDebug = isIOSBrowser();
  return (
    <ErrorBoundary>
      {/* <LiveKitWrapper> */}
        <SolanaWalletSetter />
        {/* {showDebug && <IOSCameraDebug />} */}
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
      {/* </LiveKitWrapper> */}
    </ErrorBoundary>
  );
}

export default App;

// import React, { useState, useEffect } from "react";
// import { StreamRoom, StreamView, VidbloqProvider } from "./components";
// import IOSCameraDebug from "./components/IOSCameraDebug";
// import LiveKitWrapper from "./components/LiveKitWrapper";
// import ErrorBoundary from "./ErrorBoundary";
// import { isIOSBrowser } from "./utils/ios-direct-fix";
// import SolanaWalletSetter from "./components/SolanaWalletSetter";
// // import TestingHooks from "./components/TestingHooks";
// // import CallControlz from "./components/call-controlz"; ki5-kcd-n8v
// // import WebSocketTest from "./components/websockettest"; xu0-7sx-hoz     // "build": "tsup",

// function App() {
//   const isIOS = isIOSBrowser();
//   const [cameraInitialized, setCameraInitialized] = useState(false);
//   const [showDebugOnly, setShowDebugOnly] = useState(isIOS);
//   const [roomName] = useState("ki5-kcd-n8v");
  
//   // Handle camera initialization success
//   const handleCameraInitialized = () => {
//     console.log("Camera initialized successfully");
//     setCameraInitialized(true);
//   };

//   // Automatically proceed to main app after camera initialization (optional)
//   useEffect(() => {
//     if (cameraInitialized && isIOS) {
//       // Optional: Auto-hide debug after a delay
//       const timer = setTimeout(() => {
//         setShowDebugOnly(false);
//       }, 3000);
      
//       return () => clearTimeout(timer);
//     }
//   }, [cameraInitialized, isIOS]);

//   // If iOS and camera not yet initialized, show debug screen first
//   if (isIOS && showDebugOnly) {
//     return (
//       <ErrorBoundary>
//         <div style={{ 
//           maxWidth: '800px', 
//           margin: '0 auto', 
//           padding: '20px',
//           fontFamily: 'system-ui, -apple-system, sans-serif'
//         }}>
//           <h1>Camera Access Test</h1>
          
//           <IOSCameraDebug onCameraInitialized={handleCameraInitialized} />
          
//           {cameraInitialized && (
//             <div style={{ 
//               marginTop: '20px', 
//               padding: '15px', 
//               backgroundColor: '#e6f7ff', 
//               borderRadius: '8px',
//               border: '1px solid red'
//             }}>
//               <p style={{ fontWeight: 'bold' }}>Camera successfully initialized! ✅</p>
//               <p>You can now proceed to the app:</p>
//               <button
//                 onClick={() => setShowDebugOnly(false)}
//                 style={{
//                   backgroundColor: '#1890ff',
//                   color: 'white',
//                   border: 'none',
//                   padding: '10px 15px',
//                   borderRadius: '4px',
//                   cursor: 'pointer',
//                   marginTop: '10px'
//                 }}
//               >
//                 Continue to App
//               </button>
//             </div>
//           )}
//         </div>
//       </ErrorBoundary>
//     );
//   }

//   // Main app
//   return (
//     <ErrorBoundary>
//       <LiveKitWrapper>
//         <SolanaWalletSetter />
//         {/* Only show debug in main app if explicitly needed */}
//         {isIOS && !cameraInitialized && <IOSCameraDebug onCameraInitialized={handleCameraInitialized} />}
//         <VidbloqProvider
//           apiKey="sk_5fa927d2ad021016ae36b2656fbf8085"
//           apiSecret="iO24O0xXjuXSsIhfLorPKRS2NvcWjbRswYLcnYAvxk4="
//         >
//           <StreamRoom roomName={roomName}>
//             <StreamView />
//           </StreamRoom>
//           {/* <TestingHooks /> */}
//           {/* <WebSocketTest /> */}
//           {/* <CallControlz /> */}
//         </VidbloqProvider>
//       </LiveKitWrapper>
//     </ErrorBoundary>
//   );
// }

// export default App;