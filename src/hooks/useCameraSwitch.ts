// import { useEffect, useState, useCallback } from 'react';
// import { useLocalParticipant } from '@livekit/components-react';
// import { LocalVideoTrack, createLocalVideoTrack, VideoCaptureOptions } from 'livekit-client';

// // Type definitions
// type FacingMode = 'user' | 'environment' | 'left' | 'right';

// interface CameraDevice {
//   deviceId: string;
//   label: string;
//   isFront: boolean;
// }

// interface CameraSwitchHookResult {
//   isFrontCamera: boolean;
//   isLoading: boolean;
//   error: string | null;
//   availableCameras: CameraDevice[];
//   switchCamera: () => Promise<void>;
//   enableCamera: () => Promise<boolean>;
//   turnOffCamera: () => Promise<void>;
// }

// export const useCameraSwitch = (): CameraSwitchHookResult => {
//   const [isFrontCamera, setIsFrontCamera] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
//   const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  
//   // Get the participant from LiveKit
//   const participantInfo = useLocalParticipant();
//   const localParticipant = participantInfo?.localParticipant;
  
//   // Function to refresh available camera devices
//   const refreshCameraList = useCallback(async () => {
//     try {
//       if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
//         console.warn('[Camera Utils] enumerateDevices() not supported');
//         return;
//       }
      
//       // Request camera permission to get accurate device list
//       try {
//         const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
//         tempStream.getTracks().forEach(track => track.stop());
//       } catch (err) {
//         console.warn('[Camera Utils] Could not get permission to list devices', err);
//       }
      
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
//       // Map to our more useful format with front/back detection
//       const cameraDevices: CameraDevice[] = videoDevices.map(device => {
//         const label = device.label || `Camera ${device.deviceId.slice(0, 4)}`;
//         // Detect if front or back based on label
//         const isFront = !label.toLowerCase().includes('back') && 
//                       (label.toLowerCase().includes('front') || 
//                        label.toLowerCase().includes('user') ||
//                        label.toLowerCase().includes('facetime'));
        
//         return {
//           deviceId: device.deviceId,
//           label,
//           isFront
//         };
//       });
      
//       setAvailableCameras(cameraDevices);
//       console.log(`[Camera Utils] Found ${cameraDevices.length} camera(s)`);
      
//     } catch (err) {
//       console.error('[Camera Utils] Error enumerating devices:', err);
//     }
//   }, []);
  
//   // Initialize camera list on mount
//   useEffect(() => {
//     refreshCameraList();
    
//     // Add device change listener
//     const handleDeviceChange = () => {
//       console.log('[Camera Utils] Media devices changed, refreshing list');
//       refreshCameraList();
//     };
    
//     if (navigator.mediaDevices?.addEventListener) {
//       try {
//         navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
//       } catch (err) {
//         console.warn('[Camera Utils] Could not add devicechange listener:', err);
//       }
//     }
    
//     return () => {
//       if (navigator.mediaDevices?.removeEventListener) {
//         try {
//           navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
//         } catch (err) {
//           console.warn('[Camera Utils] Could not remove devicechange listener:', err);
//         }
//       }
//     };
//   }, [refreshCameraList]);
  
//   // Get current camera track helper
//   const getCameraTrack = useCallback((): LocalVideoTrack | undefined => {
//     if (!localParticipant) return undefined;
    
//     const publications = localParticipant.getTrackPublications();
//     const cameraPub = publications.find(
//       pub => pub.kind === 'video' && pub.source === 'camera'
//     );
    
//     return cameraPub?.track as LocalVideoTrack | undefined;
//   }, [localParticipant]);
  
//   // Get device ID safely (handling Promise if needed)
//   const getDeviceId = useCallback(async (track: LocalVideoTrack): Promise<string | undefined> => {
//     try {
//       const deviceId = track.getDeviceId();
      
//       // If deviceId is a Promise, await it
//       if (deviceId instanceof Promise) {
//         return await deviceId;
//       }
      
//       return deviceId;
//     } catch (err) {
//       console.warn('[Camera Utils] Error getting device ID:', err);
//       return undefined;
//     }
//   }, []);
  
//   // Function to enable camera
//   const enableCamera = useCallback(async (): Promise<boolean> => {
//     if (!localParticipant || isLoading) return false;
    
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       // Create camera track with front-facing camera by default
//       const cameraTrack = await createLocalVideoTrack({
//         facingMode: 'user'
//       });
      
//       await localParticipant.publishTrack(cameraTrack);
//       setIsFrontCamera(true);
//       return true;
//     } catch (err) {
//       console.error('[Camera Utils] Error enabling camera:', err);
//       setError(err instanceof Error ? err.message : 'Failed to enable camera');
//       return false;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [localParticipant, isLoading]);
  
//   // Function to turn off camera
//   const turnOffCamera = useCallback(async (): Promise<void> => {
//     if (!localParticipant || isLoading) return;
    
//     const currentTrack = getCameraTrack();
//     if (!currentTrack) return;
    
//     setIsLoading(true);
    
//     try {
//       currentTrack.stop();
//       await localParticipant.unpublishTrack(currentTrack);
//     } catch (err) {
//       console.error('[Camera Utils] Error turning off camera:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [localParticipant, isLoading, getCameraTrack]);
  
//   // Enhanced camera switching with retry logic
//   const switchCamera = useCallback(async (): Promise<void> => {
//     if (!localParticipant || isLoading) return;
    
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       // First update device list if needed
//       if (availableCameras.length < 2) {
//         await refreshCameraList();
//         if (availableCameras.length < 2) {
//           throw new Error('Multiple cameras are not available on this device');
//         }
//       }
      
//       const currentTrack = getCameraTrack();
//       const nextFacingMode: FacingMode = isFrontCamera ? 'environment' : 'user';
      
//       // If no current track, enable camera first
//       if (!currentTrack) {
//         console.log('[Camera Utils] No camera track, enabling camera first');
//         await enableCamera();
//         return;
//       }
      
//       // Get current device ID
//       const currentDeviceId = await getDeviceId(currentTrack);
      
//       // Find the next camera to use
//       let newDeviceId: string | undefined;
      
//       if (availableCameras.length >= 2) {
//         // Find camera with opposite facing direction
//         const targetCameras = availableCameras.filter(
//           camera => camera.isFront !== isFrontCamera
//         );
        
//         if (targetCameras.length > 0) {
//           newDeviceId = targetCameras[0].deviceId;
//         } else {
//           // If we can't determine front/back, just use a different camera
//           const otherCamera = availableCameras.find(
//             camera => camera.deviceId !== currentDeviceId
//           );
//           newDeviceId = otherCamera?.deviceId;
//         }
//       }
      
//       // Set up constraints for the new track
//       const trackConstraints: VideoCaptureOptions = {};
      
//       if (newDeviceId) {
//         trackConstraints.deviceId = { exact: newDeviceId };
//       } else {
//         trackConstraints.facingMode = nextFacingMode;
//       }
      
//       console.log(`[Camera Utils] Switching to ${isFrontCamera ? 'back' : 'front'} camera`);
      
//       // Stop current track
//       currentTrack.stop();
      
//       // Create and publish new track
//       const newTrack = await createLocalVideoTrack(trackConstraints);
//       await localParticipant.unpublishTrack(currentTrack);
//       await localParticipant.publishTrack(newTrack);
      
//       // Toggle camera state
//       setIsFrontCamera(!isFrontCamera);
//       setConsecutiveFailures(0);
      
//     } catch (err) {
//       console.error('[Camera Utils] Camera switch error:', err);
//       setConsecutiveFailures(prev => prev + 1);
      
//       // After multiple failures, try refreshing device list
//       if (consecutiveFailures >= 2) {
//         await refreshCameraList();
//       }
      
//       setError(err instanceof Error ? err.message : 'Failed to switch camera');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [
//     localParticipant,
//     isLoading,
//     getCameraTrack,
//     isFrontCamera,
//     availableCameras,
//     consecutiveFailures,
//     refreshCameraList,
//     getDeviceId,
//     enableCamera
//   ]);
  
//   return {
//     isFrontCamera,
//     isLoading,
//     error,
//     availableCameras,
//     switchCamera,
//     enableCamera,
//     turnOffCamera
//   };
// };

// utils/enhanced-camera-hook.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalParticipant, TrackPublication } from 'livekit-client';
import { isIOSBrowser, isMobileDevice } from '../utils/camera-utils';

interface CameraSwitchResult {
  isFrontCamera: boolean;
  isLoading: boolean;
  error: string | null;
  hasMultipleCameras: boolean;
  switchCamera: () => Promise<void>;
  getStatus: () => {
    hasCamera: boolean;
    isCameraEnabled: boolean;
    cameraFacing: 'front' | 'back' | 'unknown';
  };
}

/**
 * Enhanced hook for reliable camera switching that works with LiveKit
 */
export function useCameraSwitch(): CameraSwitchResult {
  const { localParticipant } = useLocalParticipant();
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  // References to track state through component updates
  const cameraCheckDone = useRef(false);
  const lastSwitchTime = useRef(0);
  const consecutiveErrors = useRef(0);
  
  // Check for available cameras
  useEffect(() => {
    if (cameraCheckDone.current) return;
    
    const checkCameras = async () => {
      try {
        console.log('[Camera Hook] Checking for available cameras...');
        
        // Only request camera permission if we're on a mobile device
        if (isMobileDevice()) {
          try {
            // This helps get accurate device info by requesting permissions first
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (err) {
            console.warn('[Camera Hook] Could not get camera permission:', err);
          }
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        setHasMultipleCameras(videoDevices.length >= 2);
        console.log(`[Camera Hook] Found ${videoDevices.length} camera(s)`);
        
        // Mark check as done to avoid unnecessary rechecks
        cameraCheckDone.current = true;
      } catch (err) {
        console.error('[Camera Hook] Error checking cameras:', err);
      }
    };
    
    checkCameras();
    
    // Listen for device changes to update camera list
    const handleDeviceChange = () => {
      console.log('[Camera Hook] Media devices changed, rechecking cameras');
      cameraCheckDone.current = false; // Reset flag to force recheck
      checkCameras();
    };
    
    if (navigator.mediaDevices?.addEventListener) {
      try {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      } catch (err) {
        console.warn('[Camera Hook] Could not add devicechange listener:', err);
      }
    }
    
    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        try {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        } catch (err) {
          console.warn('[Camera Hook] Could not remove devicechange listener:', err);
        }
      }
    };
  }, []);
  
  // Helper function to get camera track
  const getCameraTrack = useCallback((participant: LocalParticipant | undefined): TrackPublication | undefined => {
    if (!participant) return undefined;
    
    const publications = participant.getTrackPublications();
    return publications.find(pub => pub.kind === 'video' && pub.source === 'camera');
  }, []);
  
  // Return current camera status
  const getStatus = useCallback(() => {
    const cameraPub = getCameraTrack(localParticipant);
    
    return {
      hasCamera: !!cameraPub,
      isCameraEnabled: !!cameraPub && !cameraPub.isMuted,
      cameraFacing: isFrontCamera ? 'front' : 'back' as 'front' | 'back' | 'unknown'
    };
  }, [localParticipant, isFrontCamera, getCameraTrack]);
  
  // iOS-specific camera switch handling
  const handleIOSCameraSwitch = useCallback(async (participant: LocalParticipant): Promise<void> => {
    // iOS works best with a complete stop and restart approach
    await participant.setCameraEnabled(false);
    
    // iOS needs a delay between disable and enable
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Enable with the new facing mode
    await participant.setCameraEnabled(true, {
      facingMode: isFrontCamera ? 'environment' : 'user',
    });
  }, [isFrontCamera]);
  
  // Android-specific camera switch handling
  const handleAndroidCameraSwitch = useCallback(async (participant: LocalParticipant): Promise<void> => {
    // Android sometimes needs device IDs for reliable switching
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length < 2) {
      throw new Error('Multiple cameras not available on this device');
    }
    
    // Get current camera track and stop it
    await participant.setCameraEnabled(false);
    
    // Small delay to ensure camera is fully stopped
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Try to find a better device ID based on camera naming patterns
    let preferredDevice = videoDevices[0].deviceId;
    
    if (isFrontCamera) {
      // Looking for back camera terms
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        preferredDevice = backCamera.deviceId;
      }
    } else {
      // Looking for front camera terms
      const frontCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('front') || 
        device.label.toLowerCase().includes('user') ||
        device.label.toLowerCase().includes('face')
      );
      
      if (frontCamera) {
        preferredDevice = frontCamera.deviceId;
      }
    }
    
    // Enable with device ID if possible, fallback to facing mode
    let enableOptions = {};
    
    if (preferredDevice) {
      enableOptions = { deviceId: preferredDevice };
    } else {
      enableOptions = { facingMode: isFrontCamera ? 'environment' : 'user' };
    }
    
    await participant.setCameraEnabled(true, enableOptions);
  }, [isFrontCamera]);
  
  // Standard approach for other browsers
  const handleStandardCameraSwitch = useCallback(async (participant: LocalParticipant): Promise<void> => {
    await participant.setCameraEnabled(false);
    
    // Short delay to ensure track is unpublished
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await participant.setCameraEnabled(true, {
      facingMode: isFrontCamera ? 'environment' : 'user'
    });
  }, [isFrontCamera]);
  
  // Last resort recovery when other approaches fail
  const forceRecreateCamera = useCallback(async (participant: LocalParticipant): Promise<void> => {
    console.log('[Camera Hook] Force recreating camera tracks');
    
    // Completely disable all camera tracks - the safe way
    // This avoids TypeScript errors with track types
    try {
      await participant.setCameraEnabled(false);
      
      // Disable all camera tracks manually if the above didn't work
      const cameraPublications = participant.getTrackPublications().filter(
        pub => pub.kind === 'video' && pub.source === 'camera'
      );
      
      // Stop all track's MediaStreamTracks
      for (const pub of cameraPublications) {
        if (pub.track && pub.track.mediaStreamTrack) {
          pub.track.mediaStreamTrack.stop();
        }
      }
    } catch (err) {
      console.error('[Camera Hook] Error while disabling camera:', err);
    }
    
    // Extra delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Try to create a new track with the opposite facing mode
    try {
      await participant.setCameraEnabled(true, {
        facingMode: isFrontCamera ? 'environment' : 'user'
      });
    } catch (err) {
      console.error('[Camera Hook] Error enabling camera in recovery:', err);
      throw err; // Re-throw for the caller to handle
    }
  }, [isFrontCamera]);
  
  // Switch camera implementation
  const switchCamera = useCallback(async (): Promise<void> => {
    if (!localParticipant || isLoading) {
      return;
    }
    
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastSwitchTime.current < 2000) {
      console.log('[Camera Hook] Ignoring rapid camera switch request');
      return;
    }
    
    lastSwitchTime.current = now;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[Camera Hook] Starting camera switch...');
      
      // First check if camera is published
      const cameraPub = getCameraTrack(localParticipant);
      
      if (!cameraPub || cameraPub.isMuted) {
        throw new Error('Camera is not enabled');
      }
      
      // Device specific approach
      if (isIOSBrowser()) {
        console.log('[Camera Hook] Using iOS-specific camera switch approach');
        await handleIOSCameraSwitch(localParticipant);
      } else if (/Android/i.test(navigator.userAgent)) {
        console.log('[Camera Hook] Using Android-specific camera switch approach');
        await handleAndroidCameraSwitch(localParticipant);
      } else {
        console.log('[Camera Hook] Using standard camera switch approach');
        await handleStandardCameraSwitch(localParticipant);
      }
      
      // Toggle front camera state
      setIsFrontCamera(prev => !prev);
      consecutiveErrors.current = 0;
      
      console.log('[Camera Hook] Camera switch completed successfully');
      
    } catch (err) {
      console.error('[Camera Hook] Camera switch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch camera');
      
      // Track consecutive errors for recovery attempts
      consecutiveErrors.current++;
      
      // After multiple failures, try a more aggressive approach
      if (consecutiveErrors.current >= 2) {
        try {
          console.log('[Camera Hook] Trying recovery approach after multiple failures');
          await forceRecreateCamera(localParticipant);
        } catch (recoveryErr) {
          console.error('[Camera Hook] Recovery attempt failed:', recoveryErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    localParticipant, 
    isLoading, 
    getCameraTrack, 
    handleIOSCameraSwitch, 
    handleAndroidCameraSwitch, 
    handleStandardCameraSwitch, 
    forceRecreateCamera
  ]);
  
  return {
    isFrontCamera,
    isLoading,
    error,
    hasMultipleCameras,
    switchCamera,
    getStatus
  };
}

// export default useCameraSwitch;