import { useState, useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { isMobileDevice } from "../utils/index";
import { useCameraSwitch } from "../hooks/index";
import { Icon } from "./icons";

// Base props shared by all media control components
type MediaControlProps = {
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
  labelText?: string;
  onChange?: (enabled: boolean) => void;
  icon?: {
    enabled?: React.ReactNode;
    disabled?: React.ReactNode;
  };
};

/**
 * MicrophoneControl component for toggling audio
 * Modern UI style (formerly variant='modern')
 */
export const MicrophoneControl: React.FC<MediaControlProps> = ({
  className = "",
  style,
  showLabel = true,
  labelText = "Mic",
  onChange,
  icon,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  
  const handleChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (onChange) {
      onChange(enabled);
    }
  };
  
  return (
    <div className={`bg-[var(--sdk-bg-primary-color)] flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 ${className}`} style={style}>
      <Icon name="circle" className="text-[#F5F5F5] hidden lg:block" size={12} />
      <TrackToggle
        source={Track.Source.Microphone}
        showIcon={false}
        onChange={handleChange}
        className="!p-0"
      >
        {isEnabled ? (
          <div className="bg-primary p-2 rounded-xl">
            {icon?.enabled || <Icon name="audio" className="text-white" />}
          </div>
        ) : (
          <div className="bg-gray-500 bg-opacity-60 p-2 rounded-xl">
            {icon?.disabled || <Icon name="audioOff" className="text-white" />}
          </div>
        )}
      </TrackToggle>
      {showLabel && <span className="text-xs ml-1">{labelText}</span>}
    </div>
  );
};

/**
 * CameraControl component with enhanced camera switching capabilities
 */
export interface CameraControlProps extends MediaControlProps {
  customIcons?: {
    cameraOn?: React.ReactNode;
    cameraOff?: React.ReactNode;
    switchCamera?: React.ReactNode;
    loading?: React.ReactNode;
  };
  onError?: (error: string) => void;
}

export const CameraControl: React.FC<CameraControlProps> = ({
  className = '',
  style,
  showLabel = true,
  labelText = "Camera",
  onChange,
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
    switchCamera: <Icon name="cameraSwitch" className="text-primary" size={16} />,
    loading: <Icon name="loading" className="text-primary animate-spin" size={16} />
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
        onChange={(enabled) => {
          if (onChange) onChange(enabled);
        }}
        className="!p-0"
      >
        <div className="bg-[var(--sdk-bg-primary-color)] flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
          <Icon name="circle" className="text-[#F5F5F5] hidden lg:block" size={12} />
          <div className={isCameraEnabled ? "bg-primary p-2 rounded-xl" : "bg-gray-500 bg-opacity-60 p-2 rounded-xl"}>
            {isLoading ? icons.loading : (isCameraEnabled ? icons.cameraOn : icons.cameraOff)}
          </div>
        </div>
      </TrackToggle>
      
      {/* Camera switch button - only show on mobile with camera enabled */}
      {isMobileDevice() && hasMultipleCameras.current && isCameraEnabled && (
        <button
          onClick={handleCameraSwitch}
          disabled={isLoading}
          className="bg-[var(--sdk-bg-primary-color)] p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px] ml-2"
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
      
      {showLabel && <span className="text-xs ml-1">{labelText}</span>}
    </div>
  );
};

/**
 * ScreenShareControl component for toggling screen sharing
 * Modern UI style (formerly variant='modern')
 */
export const ScreenShareControl: React.FC<MediaControlProps> = (
) => {
  return (
    <TrackToggle source={Track.Source.ScreenShare} showIcon={false}>
    <div className="bg-[var(--sdk-bg-primary-color)] p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
      <div className="bg-gradient-to-t from-[#DCCCF6] to-bg-primary rounded-2xl h-full flex flex-col items-center justify-center">
        <Icon name="screen" className="text-primary" size={22}/>
      </div>
    </div>
  </TrackToggle>
  );
};

/**
 * MediaControls component that combines audio, video, and screen controls
 */
export const MediaControls: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  showLabels?: boolean;
  onChange?: {
    mic?: (enabled: boolean) => void;
    camera?: (enabled: boolean) => void;
    screenShare?: (enabled: boolean) => void;
  };
}> = ({
  className = "",
  style,
  showLabels = true,
  onChange,
}) => {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} style={style}>
      <MicrophoneControl 
        showLabel={showLabels} 
        onChange={onChange?.mic}
      />
      <CameraControl 
        showLabel={showLabels} 
        onChange={onChange?.camera}
      />
      <ScreenShareControl 
        showLabel={showLabels} 
        onChange={onChange?.screenShare}
      />
    </div>
  );
};