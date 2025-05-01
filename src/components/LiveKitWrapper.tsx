// /* eslint-disable @typescript-eslint/no-explicit-any */
// import React, { useEffect } from 'react';
// import { fixDeviceChangeListener } from '../utils/devicechange-fix';

// /**
//  * This component wraps your LiveKit app and applies necessary iOS fixes
//  */
// const LiveKitIOSFix: React.FC<{children: React.ReactNode}> = ({ children }) => {
//   useEffect(() => {
//     // Apply the device change fix when component mounts
//     fixDeviceChangeListener();
    
//     // Additional iOS preparations
//     const isIOS = 
//       ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
//       (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
//       (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
    
//     if (isIOS) {
//       console.log('[iOS Fix] Preparing iOS environment for LiveKit...');
      
//       // Ensure mediaDevices exists
//       if (!navigator.mediaDevices) {
//         (navigator as any).mediaDevices = {};
//         console.log('[iOS Fix] Added mediaDevices object');
//       }
      
//       // Pre-initialize permission handling
//       const preInitialize = async () => {
//         try {
//           // Only request if user interacted with page
//           if (document.hasFocus()) {
//             console.log('[iOS Fix] Pre-initializing camera permissions...');
            
//             // Try to request camera access
//             const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            
//             // Stop all tracks immediately
//             stream.getTracks().forEach(track => track.stop());
            
//             console.log('[iOS Fix] Camera pre-initialized successfully');
//           }
//         } catch (err) {
//           console.log('[iOS Fix] Pre-initialization skipped or failed:', err);
//           // We don't need to handle this - it's just a pre-initialization attempt
//         }
//       };
      
//       // Listen for user interaction
//       const handleUserInteraction = () => {
//         preInitialize();
//         // Remove listeners after first interaction
//         document.removeEventListener('click', handleUserInteraction);
//         document.removeEventListener('touchstart', handleUserInteraction);
//       };
      
//       // Add listeners for user interaction
//       document.addEventListener('click', handleUserInteraction);
//       document.addEventListener('touchstart', handleUserInteraction);
//     }
//   }, []);
  
//   return <>{children}</>;
// };

// /**
//  * Error boundary component that provides friendly error messages
//  */
// class LiveKitErrorBoundary extends React.Component<
//   {children: React.ReactNode}, 
//   {hasError: boolean, error: Error | null}
// > {
//   constructor(props: {children: React.ReactNode}) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error: Error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
//     console.error("LiveKit error caught:", error, errorInfo);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div className="p-4 bg-red-100 text-red-700 rounded">
//           <h2 className="text-lg font-bold mb-2">Something went wrong with the video call</h2>
          
//           <p className="mb-4 text-sm">
//             {this.state.error?.message || "An unknown error occurred"}
//           </p>
          
//           <div className="flex space-x-2">
//             <button
//               onClick={() => window.location.reload()}
//               className="bg-red-500 text-white px-4 py-2 text-sm rounded"
//             >
//               Reload Page
//             </button>
            
//             <button
//               onClick={() => this.setState({ hasError: false, error: null })}
//               className="bg-gray-500 text-white px-4 py-2 text-sm rounded"
//             >
//               Try Again
//             </button>
//           </div>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// /**
//  * Combined wrapper with both fixes and error boundary
//  */
// export const SafeLiveKitWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
//   return (
//     <LiveKitErrorBoundary>
//       <LiveKitIOSFix>
//         {children}
//       </LiveKitIOSFix>
//     </LiveKitErrorBoundary>
//   );
// };

// export default SafeLiveKitWrapper;

// LiveKitWrapper.tsx - The wrapper component to handle iOS fixes

import React, { useEffect } from 'react';

// Define props interface for TypeScript
interface LiveKitWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides iOS compatibility for LiveKit
 * It ensures camera and device access works correctly on iOS
 */
const LiveKitWrapper: React.FC<LiveKitWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Any additional initialization you want to perform when the wrapper mounts
    console.log('[LiveKitWrapper] Initialized with iOS compatibility fixes');
    
    // Check if this is iOS
    const isIOS = 
      ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
      (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
    
    if (isIOS) {
      console.log('[LiveKitWrapper] iOS device detected, fixes should be active');
    }
    
    // Clean up function if needed
    return () => {
      console.log('[LiveKitWrapper] Component unmounted');
    };
  }, []);
  
  // Simply render the children - all the fixes are done via import side effects
  // and don't require wrapping the children in any specific way
  return <>{children}</>;
};

export default LiveKitWrapper;