import { useEffect, useState, useCallback } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalVideoTrack, createLocalVideoTrack, VideoCaptureOptions } from 'livekit-client';

// Type definitions
type FacingMode = 'user' | 'environment' | 'left' | 'right';

interface CameraDevice {
  deviceId: string;
  label: string;
  isFront: boolean;
}

interface CameraSwitchHookResult {
  isFrontCamera: boolean;
  isLoading: boolean;
  error: string | null;
  availableCameras: CameraDevice[];
  switchCamera: () => Promise<void>;
  enableCamera: () => Promise<boolean>;
  turnOffCamera: () => Promise<void>;
}

export const useCameraSwitch = (): CameraSwitchHookResult => {
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  
  // Get the participant from LiveKit
  const participantInfo = useLocalParticipant();
  const localParticipant = participantInfo?.localParticipant;
  
  // Function to refresh available camera devices
  const refreshCameraList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('[Camera Utils] enumerateDevices() not supported');
        return;
      }
      
      // Request camera permission to get accurate device list
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('[Camera Utils] Could not get permission to list devices', err);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Map to our more useful format with front/back detection
      const cameraDevices: CameraDevice[] = videoDevices.map(device => {
        const label = device.label || `Camera ${device.deviceId.slice(0, 4)}`;
        // Detect if front or back based on label
        const isFront = !label.toLowerCase().includes('back') && 
                      (label.toLowerCase().includes('front') || 
                       label.toLowerCase().includes('user') ||
                       label.toLowerCase().includes('facetime'));
        
        return {
          deviceId: device.deviceId,
          label,
          isFront
        };
      });
      
      setAvailableCameras(cameraDevices);
      console.log(`[Camera Utils] Found ${cameraDevices.length} camera(s)`);
      
    } catch (err) {
      console.error('[Camera Utils] Error enumerating devices:', err);
    }
  }, []);
  
  // Initialize camera list on mount
  useEffect(() => {
    refreshCameraList();
    
    // Add device change listener
    const handleDeviceChange = () => {
      console.log('[Camera Utils] Media devices changed, refreshing list');
      refreshCameraList();
    };
    
    if (navigator.mediaDevices?.addEventListener) {
      try {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      } catch (err) {
        console.warn('[Camera Utils] Could not add devicechange listener:', err);
      }
    }
    
    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        try {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        } catch (err) {
          console.warn('[Camera Utils] Could not remove devicechange listener:', err);
        }
      }
    };
  }, [refreshCameraList]);
  
  // Get current camera track helper
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
      
      return deviceId;
    } catch (err) {
      console.warn('[Camera Utils] Error getting device ID:', err);
      return undefined;
    }
  }, []);
  
  // Function to enable camera
  const enableCamera = useCallback(async (): Promise<boolean> => {
    if (!localParticipant || isLoading) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create camera track with front-facing camera by default
      const cameraTrack = await createLocalVideoTrack({
        facingMode: 'user'
      });
      
      await localParticipant.publishTrack(cameraTrack);
      setIsFrontCamera(true);
      return true;
    } catch (err) {
      console.error('[Camera Utils] Error enabling camera:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable camera');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [localParticipant, isLoading]);
  
  // Function to turn off camera
  const turnOffCamera = useCallback(async (): Promise<void> => {
    if (!localParticipant || isLoading) return;
    
    const currentTrack = getCameraTrack();
    if (!currentTrack) return;
    
    setIsLoading(true);
    
    try {
      currentTrack.stop();
      await localParticipant.unpublishTrack(currentTrack);
    } catch (err) {
      console.error('[Camera Utils] Error turning off camera:', err);
    } finally {
      setIsLoading(false);
    }
  }, [localParticipant, isLoading, getCameraTrack]);
  
  // Enhanced camera switching with retry logic
  const switchCamera = useCallback(async (): Promise<void> => {
    if (!localParticipant || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First update device list if needed
      if (availableCameras.length < 2) {
        await refreshCameraList();
        if (availableCameras.length < 2) {
          throw new Error('Multiple cameras are not available on this device');
        }
      }
      
      const currentTrack = getCameraTrack();
      const nextFacingMode: FacingMode = isFrontCamera ? 'environment' : 'user';
      
      // If no current track, enable camera first
      if (!currentTrack) {
        console.log('[Camera Utils] No camera track, enabling camera first');
        await enableCamera();
        return;
      }
      
      // Get current device ID
      const currentDeviceId = await getDeviceId(currentTrack);
      
      // Find the next camera to use
      let newDeviceId: string | undefined;
      
      if (availableCameras.length >= 2) {
        // Find camera with opposite facing direction
        const targetCameras = availableCameras.filter(
          camera => camera.isFront !== isFrontCamera
        );
        
        if (targetCameras.length > 0) {
          newDeviceId = targetCameras[0].deviceId;
        } else {
          // If we can't determine front/back, just use a different camera
          const otherCamera = availableCameras.find(
            camera => camera.deviceId !== currentDeviceId
          );
          newDeviceId = otherCamera?.deviceId;
        }
      }
      
      // Set up constraints for the new track
      const trackConstraints: VideoCaptureOptions = {};
      
      if (newDeviceId) {
        trackConstraints.deviceId = { exact: newDeviceId };
      } else {
        trackConstraints.facingMode = nextFacingMode;
      }
      
      console.log(`[Camera Utils] Switching to ${isFrontCamera ? 'back' : 'front'} camera`);
      
      // Stop current track
      currentTrack.stop();
      
      // Create and publish new track
      const newTrack = await createLocalVideoTrack(trackConstraints);
      await localParticipant.unpublishTrack(currentTrack);
      await localParticipant.publishTrack(newTrack);
      
      // Toggle camera state
      setIsFrontCamera(!isFrontCamera);
      setConsecutiveFailures(0);
      
    } catch (err) {
      console.error('[Camera Utils] Camera switch error:', err);
      setConsecutiveFailures(prev => prev + 1);
      
      // After multiple failures, try refreshing device list
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
    consecutiveFailures,
    refreshCameraList,
    getDeviceId,
    enableCamera
  ]);
  
  return {
    isFrontCamera,
    isLoading,
    error,
    availableCameras,
    switchCamera,
    enableCamera,
    turnOffCamera
  };
};

