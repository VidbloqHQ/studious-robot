/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/ios-direct-fix.ts - Fix for iOS camera access issues

/**
 * This script fixes camera access issues on iOS browsers, particularly
 * the "getUserMedia is not implemented in this browser" error on HTTP
 */

// Apply fixes immediately when imported
(function fixIOSCamera() {
  // Only apply on iOS
  const isIOS = 
    ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
  
  if (!isIOS) return;
  
  console.log('[iOS Camera Fix] Initializing for iOS...');
  
  // Check if we're on HTTP (which causes problems on iOS)
  const isHTTP = window.location.protocol === 'http:';
  
  // Fix mediaDevices if it doesn't exist
  if (!navigator.mediaDevices) {
    console.log('[iOS Camera Fix] Adding missing mediaDevices object');
    (navigator as any).mediaDevices = {};
  }
  
  // Fix getUserMedia if it doesn't exist
  if (!navigator.mediaDevices.getUserMedia) {
    console.log('[iOS Camera Fix] Adding getUserMedia polyfill');
    
    navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints): Promise<MediaStream> {
      console.log('[iOS Camera Fix] Using getUserMedia polyfill');
      
      // Try to use the legacy API if available
      const getUserMedia = 
        (navigator as any).webkitGetUserMedia || 
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;
      
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }
      
      // Wrap the legacy API in a Promise
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  
  // If we're on HTTP, patch getUserMedia for better iOS compatibility
  if (isHTTP) {
    console.log('[iOS Camera Fix] Applying HTTP-specific camera fixes');
    
    // Store the original implementation
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    
    // Override with iOS-friendly version
    navigator.mediaDevices.getUserMedia = async function(
      constraints: MediaStreamConstraints
    ): Promise<MediaStream> {
      console.log('[iOS Camera Fix] Using enhanced getUserMedia for HTTP');
      
      // Create a more iOS-friendly constraint object
      const newConstraints = {...constraints};
      
      // Fix video constraints
      if (newConstraints.video === true) {
        console.log('[iOS Camera Fix] Expanding basic video constraints');
        newConstraints.video = {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        };
      } else if (typeof newConstraints.video === 'object') {
        // Keep existing constraints but add facingMode if missing
        const videoConstraints = newConstraints.video as MediaTrackConstraints;
        if (!(videoConstraints as any).facingMode) {
          (videoConstraints as any).facingMode = 'user';
        }
      }
      
      try {
        // Try with our enhanced constraints
        console.log('[iOS Camera Fix] Attempting with enhanced constraints:', newConstraints);
        return await originalGetUserMedia.call(navigator.mediaDevices, newConstraints);
      } catch (err) {
        console.error('[iOS Camera Fix] First attempt failed:', err);
        
        // Special handling for HTTP on iOS - try with minimal constraints
        try {
          console.log('[iOS Camera Fix] Trying fallback with minimal constraints');
          const minimalConstraints: MediaStreamConstraints = {
            video: {
              facingMode: 'user',
              width: { ideal: 320 },
              height: { ideal: 240 }
            }
          };
          
          if ('audio' in constraints && constraints.audio) {
            minimalConstraints.audio = constraints.audio;
          }
          
          return await originalGetUserMedia.call(navigator.mediaDevices, minimalConstraints);
        } catch (fallbackErr) {
          console.error('[iOS Camera Fix] Fallback attempt failed:', fallbackErr);
          throw fallbackErr;
        }
      }
    };
  }
  
  console.log('[iOS Camera Fix] Initialization complete');
  
  // Warn about HTTP usage
  if (isHTTP) {
    console.warn(
      '%c⚠️ Warning: Using camera on HTTP is not recommended on iOS. ' +
      'Consider using HTTPS for better compatibility.',
      'color: orange; font-weight: bold;'
    );
  }
})();

// Export a function that can be called to initialize camera on user interaction
export const initializeIOSCamera = async (): Promise<boolean> => {
  try {
    console.log('[iOS Camera Fix] Explicitly initializing camera...');
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false 
    });
    
    // Stop all tracks immediately to free them up
    stream.getTracks().forEach(track => track.stop());
    
    console.log('[iOS Camera Fix] Camera initialized successfully');
    return true;
  } catch (err) {
    console.error('[iOS Camera Fix] Initialization failed:', err);
    return false;
  }
};

// Export a function to check if the current browser is iOS
export const isIOSBrowser = (): boolean => {
  return (
    ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'))
  );
};

export default {
  initializeIOSCamera,
  isIOSBrowser
};