import React from 'react';
import { VideoTrack as LiveKitVideoTrack, AudioTrack as LiveKitAudioTrack } from '@livekit/components-react';
import type { VideoTrackProps, AudioTrackProps } from '@livekit/components-react';
import { SDKTrackReference, EnhancedSDKTrackReference } from '../types';
import { getLivekitTrackReference } from '../utils/participant-bridge';

// Props for SDK VideoTrack - extends LiveKit's actual props but replaces trackRef
export interface SDKVideoTrackProps extends Omit<VideoTrackProps, 'trackRef'> {
  trackRef: SDKTrackReference | EnhancedSDKTrackReference;
}

/**
 * SDK VideoTrack component - comprehensive wrapper for LiveKit's VideoTrack
 */
export const VideoTrack: React.FC<SDKVideoTrackProps> = ({
  trackRef,
  ...rest
}) => {
  // Get the LiveKit track reference
  const livekitTrackRef = getLivekitTrackReference(trackRef);
  
  if (!livekitTrackRef) {
    // Fallback when no LiveKit reference available
    return (
      <div 
        className={`bg-gray-900 flex items-center justify-center text-gray-400 ${rest.className || ''}`}
        style={rest.style}
      >
        No video track
      </div>
    );
  }

  return (
    <LiveKitVideoTrack
      trackRef={livekitTrackRef}
      {...rest}
    />
  );
};

// Props for SDK AudioTrack - extends LiveKit's actual props but replaces trackRef
export interface SDKAudioTrackProps extends Omit<AudioTrackProps, 'trackRef'> {
  trackRef: SDKTrackReference | EnhancedSDKTrackReference;
}

/**
 * SDK AudioTrack component - comprehensive wrapper for LiveKit's AudioTrack
 */
export const AudioTrack: React.FC<SDKAudioTrackProps> = ({
  trackRef,
  ...rest
}) => {
  // Get the LiveKit track reference
  const livekitTrackRef = getLivekitTrackReference(trackRef);
  
  if (!livekitTrackRef) {
    // No LiveKit reference - return null
    return null;
  }

  return (
    <LiveKitAudioTrack
      trackRef={livekitTrackRef}
      {...rest}
    />
  );
};