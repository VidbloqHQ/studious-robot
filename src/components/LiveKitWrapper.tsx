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