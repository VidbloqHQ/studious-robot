import { useState, useCallback, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack, createLocalVideoTrack, VideoCaptureOptions } from 'livekit-client';

// Valid facingMode values for TypeScript
type FacingMode = 'user' | 'environment' | 'left' | 'right';

/**
 * Enhanced hook for reliable camera switching on both iOS and Android devices
 */
export const useCameraSwitch = () => {
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  
  // Get the actual local participant object
  const participantInfo = useLocalParticipant();
  const localParticipant = participantInfo?.localParticipant;
  
  // Function to refresh available camera devices
  const refreshCameraList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices() not supported in this browser');
        return;
      }
      
      // Requesting camera permission might be needed to get accurate device list
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Could not get camera access to enumerate devices', err);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      console.log(`Found ${videoDevices.length} camera(s):`, 
        videoDevices.map(d => `${d.label || 'Unknown camera'} (${d.deviceId.slice(0, 8)}...)`));
      
    } catch (err) {
      console.error('Error getting camera devices:', err);
    }
  }, []);
  
  // Initialize camera list on mount
  useEffect(() => {
    refreshCameraList();
    
    // Add device change listener
    const handleDeviceChange = () => {
      console.log('Media devices changed, refreshing camera list');
      refreshCameraList();
    };
    
    if (navigator.mediaDevices?.addEventListener) {
      try {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      } catch (err) {
        console.warn('Could not add devicechange listener:', err);
      }
    }
    
    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        try {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        } catch (err) {
          console.warn('Could not remove devicechange listener:', err);
        }
      }
    };
  }, [refreshCameraList]);
  
  // Get current camera track
  const getCameraTrack = useCallback((): LocalVideoTrack | undefined => {
    if (!localParticipant) return undefined;
    
    const publications = localParticipant.getTrackPublications();
    const cameraPub = publications.find(
      pub => pub.kind === 'video' && pub.source === 'camera'
    );
    
    return cameraPub?.track as LocalVideoTrack | undefined;
  }, [localParticipant]);
  
  // Get device ID safely (handling Promise if needed)
  const getDeviceId = useCallback(async (track: LocalVideoTrack): Promise<string | undefined> => {
    try {
      const deviceId = track.getDeviceId();
      
      // If deviceId is a Promise, await it
      if (deviceId instanceof Promise) {
        return await deviceId;
      }
      
      // Otherwise return as is
      return deviceId;
    } catch (err) {
      console.warn('Error getting device ID:', err);
      return undefined;
    }
  }, []);
  
  // Enhanced camera switching with retry logic and better constraints
  const switchCamera = useCallback(async () => {
    if (!localParticipant || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if we have enough cameras
      if (availableCameras.length < 2 && isInitialized) {
        await refreshCameraList();
        if (availableCameras.length < 2) {
          throw new Error('Multiple cameras not available on this device');
        }
      }
      
      const currentTrack = getCameraTrack();
      // Explicitly type nextFacingMode as FacingMode
      const nextFacingMode: FacingMode = isFrontCamera ? 'environment' : 'user';
      
      // If no current track, try to enable camera first
      if (!currentTrack) {
        console.log('No current camera track, enabling camera first');
        
        // Create track with appropriate constraints for LiveKit
        const newTrack = await createLocalVideoTrack({
          facingMode: nextFacingMode
        });
        
        await localParticipant.publishTrack(newTrack);
        setIsFrontCamera(!isFrontCamera);
        setIsInitialized(true);
        setConsecutiveFailures(0);
        
        return;
      }
      
      // If we have an existing track, get its info
      const currentDeviceId = await getDeviceId(currentTrack);
      
      // Log current camera info
      console.log(`Current camera: ${currentTrack.mediaStreamTrack.label || 'Unknown'} (${
        currentDeviceId ? currentDeviceId.slice(0, 8) : 'unknown'
      })`);
      
      // Better camera selection logic
      let newDeviceId: string | undefined;
      
      if (availableCameras.length >= 2) {
        // If we have at least 2 cameras, find one that's not the current one
        if (currentDeviceId) {
          const otherCameras = availableCameras.filter(
            device => device.deviceId !== currentDeviceId
          );
          
          if (otherCameras.length > 0) {
            // If switching from front to back, try to find a camera with "back" in the name
            if (isFrontCamera) {
              const backCamera = otherCameras.find(
                device => device.label.toLowerCase().includes('back')
              );
              newDeviceId = backCamera?.deviceId || otherCameras[0].deviceId;
            } 
            // If switching from back to front, try to find a camera with "front" in the name
            else {
              const frontCamera = otherCameras.find(
                device => device.label.toLowerCase().includes('front')
              );
              newDeviceId = frontCamera?.deviceId || otherCameras[0].deviceId;
            }
          } else {
            // Fallback if filtering failed
            const otherCamera = availableCameras.find(device => device.deviceId !== currentDeviceId);
            newDeviceId = otherCamera?.deviceId;
          }
        }
        // If we don't have current ID, just pick any camera
        else {
          newDeviceId = availableCameras[0].deviceId;
        }
      }
      
      // Create properly typed constraints object
      const trackConstraints: VideoCaptureOptions = {};
      
      // If we have a device ID, use it
      if (newDeviceId) {
        trackConstraints.deviceId = { exact: newDeviceId };
      }
      // Otherwise use facingMode
      else {
        trackConstraints.facingMode = nextFacingMode;
      }
      
      console.log('Switching to new camera with constraints:', 
        newDeviceId ? `deviceId: ${newDeviceId.slice(0, 8)}...` : `facingMode: ${nextFacingMode}`);
      
      // Stop the current track
      currentTrack.stop();
      
      // Create new track with correct constraints format for LiveKit
      const newTrack = await createLocalVideoTrack(trackConstraints);
      
      // Unpublish old track and publish new one
      await localParticipant.unpublishTrack(currentTrack);
      await localParticipant.publishTrack(newTrack);
      
      console.log(`Successfully switched to ${newTrack.mediaStreamTrack.label || 'Unknown camera'}`);
      
      // Toggle camera state
      setIsFrontCamera(!isFrontCamera);
      setConsecutiveFailures(0);
      
    } catch (err) {
      console.error('Camera switch error:', err);
      setConsecutiveFailures(prev => prev + 1);
      
      // After 3 failures, try to refresh the camera list
      if (consecutiveFailures >= 2) {
        await refreshCameraList();
      }
      
      setError(err instanceof Error ? err.message : 'Failed to switch camera');
    } finally {
      setIsLoading(false);
    }
  }, [
    localParticipant, 
    isLoading, 
    getCameraTrack, 
    isFrontCamera, 
    availableCameras, 
    isInitialized,
    consecutiveFailures,
    refreshCameraList,
    getDeviceId
  ]);
  
  return {
    isFrontCamera,
    isLoading,
    error,
    switchCamera,
    availableCameras
  };
};

export default useCameraSwitch;