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

// components/audio-video-controls.tsx
import { useState, useEffect, useCallback } from "react";
import { Track } from "livekit-client";
import { TrackToggle, useLocalParticipant } from "@livekit/components-react";
import { Icon } from "./icons";
import { isMobileDevice } from "../utils/camera-utils";
import { useCameraSwitch } from "../hooks/useCameraSwitch";

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
 * MicrophoneControl component for toggling audio with improved state handling
 * Modern UI style with immediate state updates
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
  const { localParticipant } = useLocalParticipant();
  
  // Check initial mic state on mount
  useEffect(() => {
    if (!localParticipant) return;
    
    const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (micPublication) {
      const initialState = !micPublication.isMuted;
      setIsEnabled(initialState);
    }
  }, [localParticipant]);
  
  // Listen for track mute/unmute events from LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTrackMuted = (pub: any) => {
      if (pub.kind === 'audio' && pub.source === Track.Source.Microphone) {
        console.log('[MicControl] Track muted event');
        setIsEnabled(false);
      }
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTrackUnmuted = (pub: any) => {
      if (pub.kind === 'audio' && pub.source === Track.Source.Microphone) {
        console.log('[MicControl] Track unmuted event');
        setIsEnabled(true);
      }
    };
    
    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);
    
    return () => {
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [localParticipant]);
  
  // Handle direct toggle action to improve responsiveness
  const handleToggle = useCallback(() => {
    if (!localParticipant) return;
    
    const publication = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!publication) return;
    
    // Optimistically update UI state immediately
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Then perform the actual track operation
    if (newState) {
      publication.unmute();
    } else {
      publication.mute();
    }
    
    // Notify parent if callback provided
    if (onChange) {
      onChange(newState);
    }
  }, [localParticipant, isEnabled, onChange]);
  
  // Default icons
  const defaultIcons = {
    enabled: <Icon name="audio" className="text-white" />,
    disabled: <Icon name="audioOff" className="text-white" />,
  };
  
  // Use custom icons if provided, otherwise use defaults
  const micIcons = {
    enabled: icon?.enabled || defaultIcons.enabled,
    disabled: icon?.disabled || defaultIcons.disabled
  };
  
  return (
    <div className={`bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 ${className}`} style={style}>
      <Icon name="circle" className="text-[#F5F5F5]" size={12} />
      <div onClick={handleToggle} className="cursor-pointer">
        {isEnabled ? (
          <div className="bg-primary p-2 rounded-xl">
            {micIcons.enabled}
          </div>
        ) : (
          <div className="bg-[#F5F5F5] p-2 rounded-xl">
            {micIcons.disabled}
          </div>
        )}
      </div>
      {showLabel && <span className="text-xs ml-1">{labelText}</span>}
    </div>
  );
};

/**
 * CameraControl component for toggling video with reliable camera switching
 * Modern UI style with enhanced switching for mobile devices
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
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  
  // Use enhanced camera switch hook
  const {
    isFrontCamera,
    isLoading,
    error,
    hasMultipleCameras,
    switchCamera
  } = useCameraSwitch();
  
  // Handle camera toggle state changes
  const handleChange = (enabled: boolean) => {
    console.log(`[CameraControl] Camera toggled to: ${enabled ? 'enabled' : 'disabled'}`);
    setIsEnabled(enabled);
    if (onChange) {
      onChange(enabled);
    }
  };
  
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
  
  // Default icons
  const defaultIcons = {
    enabled: <Icon name="video" className="text-white" />,
    disabled: <Icon name="videoOff" className="text-white" />,
  };
  
  const defaultSwitchIcons = {
    switchCamera: <Icon name="Poll" className="text-primary" size={16} />,
    loading: <Icon name="usdt" className="text-primary animate-spin" size={16} />
  };
  
  // Use custom icons if provided, otherwise use defaults
  const videoIcons = {
    enabled: icon?.enabled || defaultIcons.enabled,
    disabled: icon?.disabled || defaultIcons.disabled
  };
  
  const camSwitchIcons = {
    switchCamera: switchIcons?.switchCamera || defaultSwitchIcons.switchCamera,
    loading: switchIcons?.loading || defaultSwitchIcons.loading
  };
  
  // Switch camera button component
  const CameraSwitchButton = () => {
    if (!isMobileDevice() || !hasMultipleCameras || !isEnabled) return null;
    
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchCamera();
        }}
        disabled={isLoading}
        className="ml-2 relative"
        aria-label={`Switch to ${isFrontCamera ? 'back' : 'front'} camera`}
      >
        <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
          <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
            {isLoading ? camSwitchIcons.loading : camSwitchIcons.switchCamera}
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
              {camSwitchIcons.loading}
            </div>
          ) : isEnabled ? (
            <div className="bg-primary p-2 rounded-xl">
              {videoIcons.enabled}
            </div>
          ) : (
            <div className="bg-[#F5F5F5] p-2 rounded-xl">
              {videoIcons.disabled}
            </div>
          )}
        </TrackToggle>
        {showLabel && <span className="text-xs ml-1">{labelText}</span>}
      </div>
      
      {/* Camera switch button */}
      <CameraSwitchButton />
      
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