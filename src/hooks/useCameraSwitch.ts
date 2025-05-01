// import { useState, useCallback } from 'react';
// import { useLocalParticipant } from '@livekit/components-react';
// import { 
//   Track, 
//   createLocalVideoTrack, 
//   LocalVideoTrack,
//   LocalParticipant
// } from 'livekit-client';

// /**
//  * A hook for switching between front and back cameras in a LiveKit livestream
//  */
// export const useCameraSwitch = () => {
//   const [isFrontCamera, setIsFrontCamera] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
  
//   // Get the actual local participant object from the hook
//   const participantInfo = useLocalParticipant();
//   const localParticipant = participantInfo.localParticipant as LocalParticipant | undefined;
  
//   // Get current camera track
//   const getCameraTrack = useCallback((): LocalVideoTrack | undefined => {
//     if (!localParticipant) return undefined;
    
//     // Get camera track publication
//     const cameraPub = localParticipant.getTrackPublications().find(
//       (publication) => 
//         publication.kind === Track.Kind.Video && 
//         publication.source === Track.Source.Camera
//     );
    
//     if (!cameraPub || !cameraPub.track) return undefined;
//     return cameraPub.track as LocalVideoTrack;
//   }, [localParticipant]);
  
//   // Switch camera function
//   const switchCamera = useCallback(async () => {
//     if (!localParticipant || isLoading) return;
    
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const currentTrack = getCameraTrack();
      
//       // If we don't have a current video track, we can't switch
//       if (!currentTrack) {
//         throw new Error('No camera track found');
//       }
      
//       // Get device info to determine which camera to select
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
//       // If we have fewer than 2 cameras, we can't switch
//       if (videoInputs.length < 2) {
//         throw new Error('Multiple cameras not available on this device');
//       }
      
//       // Get current device ID (if available)
//       const currentDeviceId = await currentTrack.getDeviceId();
      
//       // Find a different camera to use
//       let newDeviceId: string | undefined;
      
//       if (currentDeviceId) {
//         // Find the next device that's not the current one
//         const newDevice = videoInputs.find(device => device.deviceId !== currentDeviceId);
//         newDeviceId = newDevice?.deviceId;
//       } else {
//         // If we can't determine the current device, just pick a different one
//         newDeviceId = videoInputs[0].deviceId;
//       }
      
//       if (!newDeviceId) {
//         throw new Error('Could not find another camera');
//       }
      
//       // Create new track with the selected camera
//       const newCameraTrack = await createLocalVideoTrack({
//         deviceId: newDeviceId,
//         // The facingMode is just a hint but deviceId takes precedence
//         facingMode: isFrontCamera ? 'environment' : 'user',
//       });
      
//       // Stop the existing track
//       currentTrack.stop();
      
//       // Get the track publication for the current camera track
//       const cameraPub = localParticipant.getTrackPublications().find(
//         (publication) => 
//           publication.kind === Track.Kind.Video && 
//           publication.source === Track.Source.Camera
//       );
      
//       if (cameraPub) {
//         // Unpublish the existing track
//         await localParticipant.unpublishTrack(currentTrack);
//       }
      
//       // Publish the new track
//       await localParticipant.publishTrack(newCameraTrack);
      
//       // Toggle camera state
//       setIsFrontCamera(!isFrontCamera);
//     } catch (err) {
//       console.error('Error switching camera:', err);
      
//       // Create a more user-friendly error message
//       let errorMessage = 'Failed to switch camera';
      
//       if (err instanceof Error) {
//         errorMessage = err.message;
//       }
      
//       setError(errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [localParticipant, isFrontCamera, isLoading, getCameraTrack]);
  
//   return {
//     isFrontCamera,
//     isLoading,
//     error,
//     switchCamera,
//   };
// };

import { useState, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';

/**
 * Hook to enable camera switching on iOS devices
 * Works around Safari/iOS limitations with camera access
 */
export const useMobileCameraAccess = () => {
  const [iOSPermissionGranted, setIOSPermissionGranted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const participantInfo = useLocalParticipant();
  const localParticipant = participantInfo.localParticipant;
  
  // Check if we're on iOS
  const isIOS = () => {
    return (
      ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
  };
  
  // Initialize camera access on iOS
  const initIOSCameraAccess = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access not supported in this browser');
      return false;
    }
    
    setIsInitializing(true);
    setError(null);
    
    try {
      // Request camera access explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      // Clean up the temporary stream
      stream.getTracks().forEach(track => track.stop());
      
      setIOSPermissionGranted(true);
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.error('Error requesting camera access:', err);
      setError('Camera permission denied or not available');
      setIsInitializing(false);
      return false;
    }
  };
  
  // Initialize on component mount for iOS devices
  useEffect(() => {
    if (isIOS() && !iOSPermissionGranted) {
      // We'll initialize permissions when the user tries to turn on camera
      console.log('iOS device detected, camera permissions will be requested when needed');
    }
  }, [iOSPermissionGranted]);
  
  // Function to safely enable camera
  const enableCamera = async () => {
    if (isIOS() && !iOSPermissionGranted) {
      const permissionGranted = await initIOSCameraAccess();
      if (!permissionGranted) return false;
    }
    
    try {
      if (!localParticipant) {
        setError('No local participant found');
        return false;
      }
      
      // Create and publish camera track
      const cameraTrack = await createLocalVideoTrack({
        facingMode: 'user',
      });
      
      await localParticipant.publishTrack(cameraTrack);
      return true;
    } catch (err) {
      console.error('Error enabling camera:', err);
      setError('Failed to enable camera');
      return false;
    }
  };
  
  return {
    isIOS: isIOS(),
    isInitializing,
    error,
    enableCamera,
    initIOSCameraAccess
  };
};

/**
 * Enhanced version of useCameraSwitch that handles iOS-specific issues
 */
export const useCameraSwitch = () => {
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isIOS, enableCamera, initIOSCameraAccess } = useMobileCameraAccess();
  const participantInfo = useLocalParticipant();
  const localParticipant = participantInfo.localParticipant;
  
  // Get current camera track
  const getCameraTrack = (): LocalVideoTrack | undefined => {
    if (!localParticipant) return undefined;
    
    // Get camera track publication
    const cameraPub = localParticipant.getTrackPublications().find(
      (publication) => 
        publication.kind === 'video' && 
        publication.source === 'camera'
    );
    
    if (!cameraPub || !cameraPub.track) return undefined;
    return cameraPub.track as LocalVideoTrack;
  };
  
  // Switch camera function
  const switchCamera = async () => {
    if (!localParticipant || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const currentTrack = getCameraTrack();
      
      // Handle iOS-specific initialization if needed
      if (isIOS && !currentTrack) {
        await initIOSCameraAccess();
      }
      
      // If no current track, try to enable camera first
      if (!currentTrack) {
        const enabled = await enableCamera();
        if (!enabled) {
          throw new Error('Failed to enable camera');
        }
        setIsLoading(false);
        return; // First call just enables the camera
      }
      
      // Get device info to determine which camera to select
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      // If we have fewer than 2 cameras, we can't switch
      if (videoInputs.length < 2) {
        throw new Error('Multiple cameras not available on this device');
      }
      
      // Get current device ID (if available)
      const currentDeviceId = await currentTrack.getDeviceId();
      
      // Find a different camera to use
      let newDeviceId: string | undefined;
      
      if (currentDeviceId) {
        // Find the next device that's not the current one
        const newDevice = videoInputs.find(device => device.deviceId !== currentDeviceId);
        newDeviceId = newDevice?.deviceId;
      } else {
        // If we can't determine the current device, just pick a different one
        newDeviceId = videoInputs[0].deviceId;
      }
      
      if (!newDeviceId) {
        throw new Error('Could not find another camera');
      }
      
      // Create new track with the selected camera
      const newCameraTrack = await createLocalVideoTrack({
        deviceId: newDeviceId,
        // The facingMode is just a hint but deviceId takes precedence
        facingMode: isFrontCamera ? 'environment' : 'user',
      });
      
      // Stop the existing track
      currentTrack.stop();
      
      // Unpublish the existing track
      await localParticipant.unpublishTrack(currentTrack);
      
      // Publish the new track
      await localParticipant.publishTrack(newCameraTrack);
      
      // Toggle camera state
      setIsFrontCamera(!isFrontCamera);
    } catch (err) {
      console.error('Error switching camera:', err);
      
      let errorMessage = 'Failed to switch camera';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isFrontCamera,
    isLoading,
    error,
    switchCamera,
    enableCamera // Expose this for direct camera enabling
  };
};