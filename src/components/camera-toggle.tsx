// components/LiveKitCameraToggle.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { TrackToggle, useLocalParticipant } from '@livekit/components-react';
import { isMobileDevice } from '../utils/camera-utils';
import { useCameraSwitch } from '../hooks/useCameraSwitch';
import { Icon } from './icons';

interface CameraToggleProps {
  className?: string;
  style?: React.CSSProperties;
  customIcons?: {
    cameraOn?: React.ReactNode;
    cameraOff?: React.ReactNode;
    switchCamera?: React.ReactNode;
    loading?: React.ReactNode;
  };
  onError?: (error: string) => void;
}

/**
 * Enhanced Camera Toggle component that works with LiveKit's TrackToggle
 * Provides reliable camera switching while maintaining LiveKit's track management
 */
const CameraToggle: React.FC<CameraToggleProps> = ({
  className = '',
  style,
  customIcons,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const hasMultipleCameras = useRef(false);
  const isFrontCamera = useRef(true);
  
  // Get local participant to check if camera is enabled
  const { localParticipant } = useLocalParticipant();
  
  // Check if camera is enabled
  const isCameraEnabled = !!localParticipant?.getTrackPublications().find(
    pub => pub.kind === 'video' && pub.source === 'camera' && !pub.isMuted
  );
  
  // Initialize camera utils hook but only use what we need
  const { switchCamera: switchCameraUtil, availableCameras } = useCameraSwitch();
  
  // Update multiple cameras check when the list changes
  useEffect(() => {
    hasMultipleCameras.current = availableCameras.length >= 2;
  }, [availableCameras]);
  
  // Handle error display
  useEffect(() => {
    if (error) {
      setShowErrorMessage(true);
      // Notify parent if callback provided
      if (onError) onError(error);
      
      // Hide error after 3 seconds
      const timer = setTimeout(() => {
        setShowErrorMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, onError]);
  
  // Debounce function for camera actions to prevent rapid clicking
  const debouncedAction = (action: () => Promise<void>) => {
    const now = Date.now();
    if (now - lastActionTime < 1000 || isLoading) {
      return;
    }
    
    setLastActionTime(now);
    setIsLoading(true);
    
    action().finally(() => {
      // Re-enable after a delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    });
  };
  
  // Handle camera switching (front/back)
  const handleCameraSwitch = () => {
    debouncedAction(async () => {
      try {
        await switchCameraUtil();
        // Toggle front camera reference
        isFrontCamera.current = !isFrontCamera.current;
      } catch (err) {
        console.error('Camera switch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to switch camera');
      }
    });
  };
  
  // Default icons (can be overridden with customIcons prop)
  const defaultIcons = {
    cameraOn: <Icon name="video" className="text-white" />,
    cameraOff: <Icon name="videoOff" className="text-white" />,
    switchCamera: <Icon name="Poll" className="text-primary" size={16} />,
    loading: <Icon name="usdt" className="text-primary animate-spin" size={16} />
  };
  
  // Use custom icons if provided, otherwise use defaults
  const icons = {
    cameraOn: customIcons?.cameraOn || defaultIcons.cameraOn,
    cameraOff: customIcons?.cameraOff || defaultIcons.cameraOff,
    switchCamera: customIcons?.switchCamera || defaultIcons.switchCamera,
    loading: customIcons?.loading || defaultIcons.loading
  };
  
  // Use LiveKit's TrackToggle for camera on/off
  return (
    <div className={`relative inline-flex items-center ${className}`} style={style}>
      {/* Use LiveKit's TrackToggle for enabling/disabling camera */}
      <TrackToggle
        source={Track.Source.Camera}
        showIcon={false}
      >
        <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
          <Icon name="circle" className="text-[#F5F5F5]" size={12} />
          <div className={isCameraEnabled ? "bg-primary p-2 rounded-xl" : "bg-[#F5F5F5] p-2 rounded-xl"}>
            {isLoading ? icons.loading : (isCameraEnabled ? icons.cameraOn : icons.cameraOff)}
          </div>
        </div>
      </TrackToggle>
      
      {/* Camera switch button - only show on mobile with camera enabled */}
      {isMobileDevice() && hasMultipleCameras.current && isCameraEnabled && (
        <button
          onClick={handleCameraSwitch}
          disabled={isLoading}
          className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px] ml-2"
        >
          <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
            {isLoading ? icons.loading : icons.switchCamera}
          </div>
        </button>
      )}
      
      {/* Error tooltip */}
      {showErrorMessage && error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-red-500 text-white text-xs rounded whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default CameraToggle;