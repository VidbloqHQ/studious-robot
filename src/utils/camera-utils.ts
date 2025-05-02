/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Detects if the current browser is running on iOS
 */
export const isIOSBrowser = (): boolean => {
  return (
    ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'))
  );
};

/**
 * Detects if the current browser is running on a mobile device
 */
export const isMobileDevice = (): boolean => {
  return isIOSBrowser() || 
    /Android|webOS|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Applies necessary fixes for iOS camera and media devices
 * This function runs immediately when the module is imported
 */
(function applyIOSFixes() {
  // Only apply on iOS
  if (!isIOSBrowser()) return;
  
  console.log('[Camera Utils] Applying iOS compatibility fixes...');
  
  // Fix for devicechange event listener issue
  if (navigator.mediaDevices && !navigator.mediaDevices.addEventListener) {
    console.log('[Camera Utils] Adding mediaDevices event listener polyfill');
    
    navigator.mediaDevices.addEventListener = function(
      type: string, 
      _listener: EventListenerOrEventListenerObject, 
      _options?: boolean | AddEventListenerOptions
    ): void {
      console.log(`[Camera Utils] Ignored event listener for: ${type}`);
      return;
    };
    
    navigator.mediaDevices.removeEventListener = function(
      type: string, 
      _listener: EventListenerOrEventListenerObject, 
      _options?: boolean | EventListenerOptions
    ): void {
      console.log(`[Camera Utils] Ignored event removal for: ${type}`);
      return;
    };
    
    navigator.mediaDevices.dispatchEvent = function(event: Event): boolean {
      console.log(`[Camera Utils] Ignored dispatchEvent for: ${event.type}`);
      return true;
    };
  }
  
  // Fix mediaDevices if it doesn't exist
  if (!navigator.mediaDevices) {
    console.log('[Camera Utils] Adding missing mediaDevices object');
    (navigator as any).mediaDevices = {};
  }
  
  // Fix getUserMedia if it doesn't exist
  if (!navigator.mediaDevices.getUserMedia) {
    console.log('[Camera Utils] Adding getUserMedia polyfill');
    
    navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints): Promise<MediaStream> {
      console.log('[Camera Utils] Using getUserMedia polyfill');
      
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
  if (window.location.protocol === 'http:') {
    console.log('[Camera Utils] Applying HTTP-specific camera fixes');
    
    // Store the original implementation
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    
    // Override with iOS-friendly version
    navigator.mediaDevices.getUserMedia = async function(
      constraints: MediaStreamConstraints
    ): Promise<MediaStream> {
      console.log('[Camera Utils] Using enhanced getUserMedia for HTTP');
      
      // Create a more iOS-friendly constraint object
      const newConstraints = {...constraints};
      
      // Fix video constraints
      if (newConstraints.video === true) {
        console.log('[Camera Utils] Expanding basic video constraints');
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
        return await originalGetUserMedia.call(navigator.mediaDevices, newConstraints);
      } catch (err) {
        console.error('[Camera Utils] First attempt failed:', err);
        
        // Special handling for HTTP on iOS - try with minimal constraints
        try {
          console.log('[Camera Utils] Trying fallback with minimal constraints');
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
          console.error('[Camera Utils] Fallback attempt failed:', fallbackErr);
          throw fallbackErr;
        }
      }
    };
    
    console.warn(
      '[Camera Utils] Using camera on HTTP is not recommended on iOS. ' +
      'Consider using HTTPS for better compatibility.'
    );
  }
  
  console.log('[Camera Utils] iOS fixes applied successfully');
})();

/**
 * Initialize camera on user interaction (helpful for iOS)
 * This can be called in response to a button click
 */
export const initializeCamera = async (audioAlso = false): Promise<boolean> => {
  try {
    console.log('[Camera Utils] Initializing camera...');
    
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };
    
    // Optionally request audio permission at the same time
    if (audioAlso) {
      constraints.audio = true;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Stop all tracks immediately to free them up
    stream.getTracks().forEach(track => track.stop());
    
    console.log('[Camera Utils] Camera initialized successfully');
    return true;
  } catch (err) {
    console.error('[Camera Utils] Initialization failed:', err);
    return false;
  }
};

