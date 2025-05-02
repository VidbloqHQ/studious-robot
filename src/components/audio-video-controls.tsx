// import { useState } from "react";
// import { Track } from "livekit-client";
// import { TrackToggle } from "@livekit/components-react";
// import { Icon } from "./icons";

// // Base props shared by all media control components
// type MediaControlProps = {
//   className?: string;
//   style?: React.CSSProperties;
//   showLabel?: boolean;
//   labelText?: string;
//   onChange?: (enabled: boolean) => void;
//   icon?: {
//     enabled?: React.ReactNode;
//     disabled?: React.ReactNode;
//   };
// };

// /**
//  * MicrophoneControl component for toggling audio
//  * Modern UI style (formerly variant='modern')
//  */
// export const MicrophoneControl: React.FC<MediaControlProps> = ({
//   className = "",
//   style,
//   showLabel = true,
//   labelText = "Mic",
//   onChange,
//   icon,
// }) => {
//   const [isEnabled, setIsEnabled] = useState(false);
  
//   const handleChange = (enabled: boolean) => {
//     setIsEnabled(enabled);
//     if (onChange) {
//       onChange(enabled);
//     }
//   };
  
//   return (
//     <div className={`bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 ${className}`} style={style}>
//       <Icon name="circle" className="text-[#F5F5F5]" size={12} />
//       <TrackToggle
//         source={Track.Source.Microphone}
//         showIcon={false}
//         onChange={handleChange}
//       >
//         {isEnabled ? (
//           <div className="bg-primary p-2 rounded-xl">
//             {icon?.enabled || <Icon name="audio" className="text-white" />}
//           </div>
//         ) : (
//           <div className="bg-[#F5F5F5] p-2 rounded-xl">
//             {icon?.disabled || <Icon name="audioOff" className="text-white" />}
//           </div>
//         )}
//       </TrackToggle>
//       {showLabel && <span className="text-xs ml-1">{labelText}</span>}
//     </div>
//   );
// };

// /**
//  * CameraControl component for toggling video
//  * Modern UI style (formerly variant='modern')
//  */
// export const CameraControl: React.FC<MediaControlProps> = ({
//   className = "",
//   style,
//   showLabel = true,
//   labelText = "Camera",
//   onChange,
//   icon,
// }) => {
//   const [isEnabled, setIsEnabled] = useState(false);
  
//   const handleChange = (enabled: boolean) => {
//     setIsEnabled(enabled);
//     if (onChange) {
//       onChange(enabled);
//     }
//   };
  
//   return (
//     <div className={`bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 ${className}`} style={style}>
//       <Icon name="circle" className="text-[#F5F5F5]" size={12} />
//       <TrackToggle
//         source={Track.Source.Camera}
//         showIcon={false}
//         onChange={handleChange}
//       >
//         {isEnabled ? (
//           <div className="bg-primary p-2 rounded-xl">
//             {icon?.enabled || <Icon name="video" className="text-white" />}
//           </div>
//         ) : (
//           <div className="bg-[#F5F5F5] p-2 rounded-xl">
//             {icon?.disabled || <Icon name="videoOff" className="text-white" />}
//           </div>
//         )}
//       </TrackToggle>
//       {showLabel && <span className="text-xs ml-1">{labelText}</span>}
//     </div>
//   );
// };

// /**
//  * ScreenShareControl component for toggling screen sharing
//  * Modern UI style (formerly variant='modern')
//  */
// export const ScreenShareControl: React.FC<MediaControlProps> = ({
//   className = "",
//   style,
//   showLabel = true,
//   labelText = "Screen",
//   onChange,
//   icon,
// }) => {
//   const [isEnabled, setIsEnabled] = useState(false);
  
//   const handleChange = (enabled: boolean) => {
//     setIsEnabled(enabled);
//     if (onChange) {
//       onChange(enabled);
//     }
//   };
  
//   return (
//     <div className={`bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px] ${className}`} style={style}>
//       <TrackToggle
//         source={Track.Source.ScreenShare}
//         showIcon={false}
//         onChange={handleChange}
//       >
//         <div className={`${isEnabled ? 'bg-gradient-to-t from-[#DCCCF6] to-primary' : 'bg-[#DCCCF63D]'} rounded-2xl h-full flex flex-col items-center justify-center`}>
//           {isEnabled ? 
//             (icon?.enabled || <Icon name="screen" className="text-white" />) : 
//             (icon?.disabled || <Icon name="screen" className="text-primary" />)
//           }
//         </div>
//       </TrackToggle>
//       {showLabel && <span className="text-xs text-center mt-1 block">{labelText}</span>}
//     </div>
//   );
// };

// /**
//  * RecordControl component for toggling recording
//  */
// export const RecordControl: React.FC<MediaControlProps & { isRecording: boolean; toggleRecording: () => void }> = ({
//   className = "",
//   style,
//   showLabel = true,
//   labelText = "Record",
//   isRecording,
//   toggleRecording,
// }) => {
//   return (
//     <div 
//       className={`rounded-2xl p-0.5 bg-primary flex flex-row text-white items-center gap-x-2 cursor-pointer ${className}`}
//       style={style}
//       onClick={toggleRecording}
//     >
//       <span className="ml-2">{isRecording ? "Stop" : labelText}</span>
//       <div className={`rounded-2xl ${isRecording ? "bg-[#FF5555]" : "bg-[#8B55E2]"} p-2`}>
//         <Icon name="record" className="text-white" />
//       </div>
//       {showLabel && <span className="text-xs text-center mt-1 block">{labelText}</span>}
//     </div>
//   );
// };

// /**
//  * MediaControls component that combines audio, video, and screen controls
//  */
// export const MediaControls: React.FC<{
//   className?: string;
//   style?: React.CSSProperties;
//   showLabels?: boolean;
//   onChange?: {
//     mic?: (enabled: boolean) => void;
//     camera?: (enabled: boolean) => void;
//     screenShare?: (enabled: boolean) => void;
//   };
// }> = ({
//   className = "",
//   style,
//   showLabels = true,
//   onChange,
// }) => {
//   return (
//     <div className={`flex items-center justify-center gap-4 ${className}`} style={style}>
//       <MicrophoneControl 
//         showLabel={showLabels} 
//         onChange={onChange?.mic}
//       />
//       <CameraControl 
//         showLabel={showLabels} 
//         onChange={onChange?.camera}
//       />
//       <ScreenShareControl 
//         showLabel={showLabels} 
//         onChange={onChange?.screenShare}
//       />
//     </div>
//   );
// };

import { useState, useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { Icon } from "./icons";
import { isMobileDevice } from "../utils/camera-utils";

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
    <div className={`bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 ${className}`} style={style}>
      <Icon name="circle" className="text-[#F5F5F5]" size={12} />
      <TrackToggle
        source={Track.Source.Microphone}
        showIcon={false}
        onChange={handleChange}
      >
        {isEnabled ? (
          <div className="bg-primary p-2 rounded-xl">
            {icon?.enabled || <Icon name="audio" className="text-white" />}
          </div>
        ) : (
          <div className="bg-[#F5F5F5] p-2 rounded-xl">
            {icon?.disabled || <Icon name="audioOff" className="text-white" />}
          </div>
        )}
      </TrackToggle>
      {showLabel && <span className="text-xs ml-1">{labelText}</span>}
    </div>
  );
};

/**
 * Enhanced CameraControl component for toggling video with camera switching
 * Modern UI style with reliable camera switching for mobile devices
 */
export const CameraControl: React.FC<MediaControlProps & {
  switchIcons?: {
    switchCamera?: React.ReactNode;
    loading?: React.ReactNode;
  };
  onSwitchError?: (error: string) => void;
}> = ({
  className = "",
  style,
  showLabel = true,
  labelText = "Camera",
  onChange,
  icon,
  switchIcons,
  onSwitchError,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const hasMultipleCameras = useRef(false);
  const isFrontCamera = useRef(true);
  
  // Get local participant to access camera tracks
  const { localParticipant } = useLocalParticipant();
  
  // Detect if on mobile device
  const isMobile = isMobileDevice();
  
  // Check for available cameras
  useEffect(() => {
    const checkCameras = async () => {
      try {
        // Request camera permission to get accurate device list
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        // Get device list
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        hasMultipleCameras.current = videoDevices.length >= 2;
      } catch (err) {
        console.warn('Could not check for multiple cameras:', err);
      }
    };
    
    checkCameras();
    
    // Add device change listener
    const handleDeviceChange = () => checkCameras();
    
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
  }, []);
  
  // Handle error display
  useEffect(() => {
    if (error) {
      setShowErrorMessage(true);
      // Notify parent if callback provided
      if (onSwitchError) onSwitchError(error);
      
      // Hide error after 3 seconds
      const timer = setTimeout(() => {
        setShowErrorMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, onSwitchError]);
  
  const handleChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (onChange) {
      onChange(enabled);
    }
  };
  
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
  
  // Switch between front and back cameras
  const switchCamera = () => {
    if (!localParticipant || !isEnabled) return;
    
    debouncedAction(async () => {
      try {
        // Get current camera track
        const publications = localParticipant.getTrackPublications();
        const cameraPub = publications.find(
          pub => pub.kind === 'video' && pub.source === 'camera'
        );
        
        if (!cameraPub || !cameraPub.track) {
          throw new Error('No camera track found');
        }
        
        // Get available camera devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length < 2) {
          throw new Error('Multiple cameras not available on this device');
        }
        
        // Get current track info
        // (No need to get mediaStreamTrack since we're using LiveKit's built-in methods)
        
        // Create constraints for next camera
        // Switch facingMode between 'user' (front) and 'environment' (back)
        const nextFacingMode = isFrontCamera.current ? 'environment' : 'user';
        
        // Let LiveKit handle the track switching
        await localParticipant.setCameraEnabled(false);
        
        // Short delay to ensure the track is properly unpublished
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Enable camera with new constraints
        await localParticipant.setCameraEnabled(true, {
          facingMode: nextFacingMode
        });
        
        // Update front camera state
        isFrontCamera.current = !isFrontCamera.current;
        
      } catch (err) {
        console.error('Camera switch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to switch camera');
      }
    });
  };
  
  // Custom switch camera button with enhanced reliability
  const CameraSwitch = () => {
    if (!isMobile || !hasMultipleCameras.current || !isEnabled) return null;
    
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchCamera();
        }}
        disabled={isLoading}
        className="ml-2 relative"
        aria-label={`Switch to ${isFrontCamera.current ? 'back' : 'front'} camera`}
      >
        <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
          <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
            {isLoading ? 
              (switchIcons?.loading || <Icon name="usdt" className="text-primary animate-spin" size={16} />) : 
              (switchIcons?.switchCamera || <Icon name="Poll" className="text-primary" size={16} />)
            }
          </div>
        </div>
      </button>
    );
  };
  
  return (
    <div className={`relative flex items-center ${className}`} style={style}>
      <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
        <Icon name="circle" className="text-[#F5F5F5]" size={12} />
        <TrackToggle
          source={Track.Source.Camera}
          showIcon={false}
          onChange={handleChange}
        >
          {isLoading ? (
            <div className="bg-primary p-2 rounded-xl">
              {switchIcons?.loading || <Icon name="usdt" className="text-white animate-spin" />}
            </div>
          ) : isEnabled ? (
            <div className="bg-primary p-2 rounded-xl">
              {icon?.enabled || <Icon name="video" className="text-white" />}
            </div>
          ) : (
            <div className="bg-[#F5F5F5] p-2 rounded-xl">
              {icon?.disabled || <Icon name="videoOff" className="text-white" />}
            </div>
          )}
        </TrackToggle>
        {showLabel && <span className="text-xs ml-1">{labelText}</span>}
      </div>
      
      {/* Camera switch button */}
      <CameraSwitch />
      
      {/* Error message tooltip */}
      {showErrorMessage && error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-red-500 text-white text-xs rounded whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * ScreenShareControl component for toggling screen sharing
 * Modern UI style (formerly variant='modern')
 */
export const ScreenShareControl: React.FC<MediaControlProps> = ({
  className = "",
  style,
  showLabel = true,
  labelText = "Screen",
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
    <div className={`bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px] ${className}`} style={style}>
      <TrackToggle
        source={Track.Source.ScreenShare}
        showIcon={false}
        onChange={handleChange}
      >
        <div className={`${isEnabled ? 'bg-gradient-to-t from-[#DCCCF6] to-primary' : 'bg-[#DCCCF63D]'} rounded-2xl h-full flex flex-col items-center justify-center`}>
          {isEnabled ? 
            (icon?.enabled || <Icon name="screen" className="text-white" />) : 
            (icon?.disabled || <Icon name="screen" className="text-primary" />)
          }
        </div>
      </TrackToggle>
      {showLabel && <span className="text-xs text-center mt-1 block">{labelText}</span>}
    </div>
  );
};

/**
 * RecordControl component for toggling recording
 */
export const RecordControl: React.FC<MediaControlProps & { isRecording: boolean; toggleRecording: () => void }> = ({
  className = "",
  style,
  showLabel = true,
  labelText = "Record",
  isRecording,
  toggleRecording,
}) => {
  return (
    <div 
      className={`rounded-2xl p-0.5 bg-primary flex flex-row text-white items-center gap-x-2 cursor-pointer ${className}`}
      style={style}
      onClick={toggleRecording}
    >
      <span className="ml-2">{isRecording ? "Stop" : labelText}</span>
      <div className={`rounded-2xl ${isRecording ? "bg-[#FF5555]" : "bg-[#8B55E2]"} p-2`}>
        <Icon name="record" className="text-white" />
      </div>
      {showLabel && <span className="text-xs text-center mt-1 block">{labelText}</span>}
    </div>
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