import { useState } from "react";
import { Track } from "livekit-client";
import { TrackToggle } from "@livekit/components-react";
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
 * CameraControl component for toggling video
 * Modern UI style (formerly variant='modern')
 */
export const CameraControl: React.FC<MediaControlProps> = ({
  className = "",
  style,
  showLabel = true,
  labelText = "Camera",
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
        source={Track.Source.Camera}
        showIcon={false}
        onChange={handleChange}
      >
        {isEnabled ? (
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

