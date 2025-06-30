import React from "react";
// import { LocalParticipant, RemoteParticipant } from "livekit-client";
import ParticipantControls from "./participant-controls";
import { EnhancedSDKParticipant, SDKParticipant } from "../types";

export type ParticipantViewProps = {
  // participant: LocalParticipant | RemoteParticipant;
  participant: SDKParticipant | EnhancedSDKParticipant;
  className?: string;
  style?: React.CSSProperties;
  showUserInfo?: boolean;
  blurBackground?: boolean;
  avatarSize?: 'small' | 'medium' | 'large';
  isLocal?: boolean;
  isMicrophoneEnabled?: boolean;
  isCameraEnabled?: boolean;
  showControls?: boolean;
  onGiftClick?: (participant: SDKParticipant) => void;
  components?: {
    AvatarComponent?: React.FC<{
      participant: SDKParticipant;
      avatarUrl: string;
      userName: string;
    }>;
    UserInfoComponent?: React.FC<{
      participant: SDKParticipant;
      avatarUrl: string;
      userName: string;
    }>;
    BackgroundComponent?: React.FC<{
      participant: SDKParticipant;
      avatarUrl: string;
    }>;
    ControlsComponent?: React.FC<{
      participant: SDKParticipant;
      isLocal: boolean;
      isMicrophoneEnabled: boolean;
      isCameraEnabled: boolean;
    }>;
  };
};

/**
 * ParticipantView component displays a participant with their avatar when video is not available
 * It's fully customizable with replaceable sub-components and styling options
 */
const ParticipantView: React.FC<ParticipantViewProps> = ({
  participant,
  className = "",
  style,
  showUserInfo = true,
  blurBackground = true,
  avatarSize = 'medium',
  isLocal = false,
  isMicrophoneEnabled = false,
  isCameraEnabled = false,
  showControls = true,
  onGiftClick,
  components,
}) => {
  // Extract user data from participant metadata
  const { userName, avatarUrl } = participant.metadata
    ? JSON.parse(participant.metadata)
    : { userName: participant.identity, avatarUrl: "" };
  
  // Determine avatar size based on prop
  const avatarSizeClass = {
    small: "w-16 h-16", 
    medium: "w-24 h-24",
    large: "w-32 h-32"
  }[avatarSize];

  // Custom components or default rendering
  const renderBackground = () => {
    if (components?.BackgroundComponent) {
      return <components.BackgroundComponent participant={participant} avatarUrl={avatarUrl} />;
    }
    
    return (
      <>
        {/* Background image - scaled up with lighter blur */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${avatarUrl})`,
            filter: blurBackground ? "blur(8px)" : "none",
            transform: "scale(1.3)", // Slightly scaled to avoid edge artifacts
            opacity: "0.9", // Higher opacity for more visibility
          }}
        />

        {/* Very subtle darkening overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-10" />
      </>
    );
  };

  const renderAvatar = () => {
    if (components?.AvatarComponent) {
      return <components.AvatarComponent 
        participant={participant} 
        avatarUrl={avatarUrl} 
        userName={userName} 
      />;
    }
    
    return (
      <div className={`${avatarSizeClass} rounded-full overflow-hidden`}>
        <img
          src={avatarUrl}
          alt={userName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const renderUserInfo = () => {
    if (!showUserInfo) return null;
    
    if (components?.UserInfoComponent) {
      return <components.UserInfoComponent 
        participant={participant} 
        avatarUrl={avatarUrl} 
        userName={userName} 
      />;
    }
    
    return (
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black bg-opacity-30 px-2 py-1 rounded-md">
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <img
            src={avatarUrl}
            alt={userName}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white text-sm">{userName}</span>
      </div>
    );
  };

  const renderControls = () => {
    if (!showControls) return null;

    if (components?.ControlsComponent) {
      return <components.ControlsComponent 
        participant={participant}
        isLocal={isLocal}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
      />;
    }

    return (
      <ParticipantControls
        participant={participant}
        isLocal={isLocal}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
        onGiftClick={onGiftClick}
      />
    );
  };

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-lg ${className}`} style={style}>
      {renderBackground()}

      {/* Central avatar */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {renderAvatar()}
      </div>

      {/* User info */}
      {renderUserInfo()}

      {/* Media controls */}
      {renderControls()}
    </div>
  );
};

export default ParticipantView;