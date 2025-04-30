import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Track,
  createLocalTracks,
  LocalAudioTrack,
  LocalVideoTrack,
} from 'livekit-client';
import { useStreamContext } from './useStreamContext';
import { useNotification } from './useNotification';

// Define return type for preview tracks
interface PreviewTrackState {
  audioTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
  error?: Error;
}

interface UsePrejoinOptions {
  /**
   * Optional initial nickname value
   */
  initialNickname?: string;
  
  /**
   * Optional public key from wallet connection
   */
  publicKey?: { toString: () => string; toBase58: () => string } | null;
}

interface UsePrejoinReturn {
  /**
   * Current nickname value
   */
  nickname: string;
  
  /**
   * Function to update nickname
   */
  setNickname: React.Dispatch<React.SetStateAction<string>>;
  
  /**
   * Current preview tracks state
   */
  previewTracks: PreviewTrackState;
  
  /**
   * Ref to attach to video element for preview
   */
  videoRef: React.RefObject<HTMLVideoElement>;
  
  /**
   * Function to toggle audio track
   */
  handleAudioToggle: (enabled: boolean) => void;
  
  /**
   * Function to toggle video track
   */
  handleVideoToggle: (enabled: boolean) => void;
  
  /**
   * Whether user has permission to control media
   */
  canControlMedia: boolean;
  
  /**
   * Whether token generation is in progress
   */
  isLoading: boolean;
  
  /**
   * Function to join the stream with the current nickname
   */
  joinStream: () => Promise<void>;
  
  /**
   * Any error that occurred during media initialization
   */
  error: Error | null;
}

/**
 * Hook for handling pre-join functionality for streams
 * 
 * @param options - Configuration options
 * @returns Object containing pre-join state and functions
 */
export const usePrejoin = (options: UsePrejoinOptions = {}): UsePrejoinReturn => {
  const { initialNickname = '', publicKey } = options;
  
  // State
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [previewTracks, setPreviewTracks] = useState<PreviewTrackState>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMounted = useRef<boolean>(true);

  // Hooks
  const { 
    streamMetadata, 
    setAudioEnabled, 
    setVideoEnabled,
    generateToken 
  } = useStreamContext();
  const { addNotification } = useNotification();

  // Initialize video track
  const initializeVideoTrack = useCallback(async () => {
    try {
      const tracks = await createLocalTracks({
        video: true,
        audio: false,
      });

      const videoTrack = tracks.find(
        (track) => track.kind === Track.Kind.Video
      ) as LocalVideoTrack;

      if (videoTrack && videoRef.current) {
        await videoTrack.unmute();
        videoTrack.attach(videoRef.current);
        setPreviewTracks((prev) => ({ ...prev, videoTrack }));
      }
    } catch (e) {
      console.error('Error initializing video track:', e);
      const error = e instanceof Error ? e : new Error('Failed to initialize video track');
      setError(error);
    }
  }, []);

  // Handle audio toggle
  const handleAudioToggle = useCallback(
    (enabled: boolean) => {
      setAudioEnabled(enabled);
      if (previewTracks.audioTrack) {
        if (enabled) {
          previewTracks.audioTrack.unmute();
        } else {
          previewTracks.audioTrack.mute();
        }
      }
    },
    [previewTracks.audioTrack, setAudioEnabled]
  );

  // Handle video toggle
  const handleVideoToggle = useCallback(
    async (enabled: boolean) => {
      console.log('Video toggle:', {
        enabled,
        track: previewTracks.videoTrack,
        videoRef: videoRef.current,
      });
      setVideoEnabled(enabled);

      if (enabled && !previewTracks.videoTrack) {
        // If enabled but no track exists, initialize it
        await initializeVideoTrack();
      } else if (previewTracks.videoTrack) {
        if (enabled) {
          await previewTracks.videoTrack.unmute();
          if (videoRef.current) {
            previewTracks.videoTrack.attach(videoRef.current);
          }
        } else {
          previewTracks.videoTrack.mute();
          if (videoRef.current) {
            previewTracks.videoTrack.detach(videoRef.current);
          }
        }
      }
    },
    [previewTracks.videoTrack, setVideoEnabled, initializeVideoTrack]
  );

  // Join stream function
  const joinStream = useCallback(async () => {
    if (!nickname.trim()) {
      addNotification({
        type: "error",
        message: "Please add nickname",
        duration: 3000,
      });
      return;
    }
    
    if (!publicKey) {
      addNotification({
        type: "error",
        message: "Please connect your wallet",
        duration: 3000,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await generateToken(nickname);
    } catch (e) {
      console.error('Error joining stream:', e);
      const error = e instanceof Error ? e : new Error('Failed to join stream');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [nickname, publicKey, generateToken, addNotification]);

  // Determine if user can control media based on roles
  const determineInitialPermissions = useCallback(() => {
    if (!publicKey || !streamMetadata?.creatorWallet) {
      return false;
    }

    const currentWalletAddress = publicKey.toString();
    const isCreator = streamMetadata.creatorWallet === currentWalletAddress;
    const willBeCoHost = streamMetadata.streamSessionType === 'meeting' && !isCreator;

    return isCreator || willBeCoHost;
  }, [publicKey, streamMetadata]);

  const canControlMedia = determineInitialPermissions();

  // Initialize tracks when component mounts or dependencies change
  useEffect(() => {
    isMounted.current = true;

    const initializeTracks = async () => {
      try {
        const tracks = await createLocalTracks({
          audio: canControlMedia,
          video: canControlMedia && streamMetadata.callType === 'video',
        });

        if (!isMounted.current) return;

        const audioTrack = tracks.find(
          (track) => track.kind === Track.Kind.Audio
        ) as LocalAudioTrack;
        const videoTrack = tracks.find(
          (track) => track.kind === Track.Kind.Video
        ) as LocalVideoTrack;

        if (videoTrack && videoRef.current) {
          await videoTrack.unmute();
          videoTrack.attach(videoRef.current);
        }

        setPreviewTracks({ audioTrack, videoTrack });
      } catch (e) {
        console.error('Error initializing tracks:', e);
        if (isMounted.current) {
          const error = e instanceof Error ? e : new Error('Failed to initialize tracks');
          setPreviewTracks((prev) => ({ ...prev, error }));
          setError(error);
        }
      }
    };

    if (canControlMedia) {
      // Stop any existing tracks before initializing new ones
      const audioTrack = previewTracks.audioTrack;
      const videoTrack = previewTracks.videoTrack;
      
      if (audioTrack) {
        audioTrack.stop();
      }
      if (videoTrack) {
        videoTrack.stop();
      }

      initializeTracks();
    }

    return () => {
      isMounted.current = false;
      // Cleanup tracks when component unmounts or dependencies change
      const audioTrack = previewTracks.audioTrack;
      const videoTrack = previewTracks.videoTrack;
      
      if (audioTrack) {
        audioTrack.stop();
      }
      if (videoTrack) {
        videoTrack.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canControlMedia, streamMetadata?.callType]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    nickname,
    setNickname,
    previewTracks,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    handleAudioToggle,
    handleVideoToggle,
    canControlMedia,
    isLoading,
    joinStream,
    error,
  };
};