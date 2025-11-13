/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from "react";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";
import { useNotification } from "./useNotification";
import { useRequirePublicKey } from "./useRequirePublicKey";
import { RecordingStartResponse, RecordingStopResponse, EnhancedSDKTrackReference } from "../types/index";
import { getRequestManager } from "../utils/index";

interface UseStreamRecordingYoutubeOptions {
  /**
   * YouTube RTMP URL
   * Format: rtmp://a.rtmp.youtube.com/live2/[your-stream-key]
   */
  youtubeRtmpUrl?: string;
  
  /**
   * Layout type for the stream
   */
  layout?: 'grid' | 'speaker' | 'single-speaker';
  
  /**
   * Video quality settings
   */
  quality?: {
    width?: number;
    height?: number;
    framerate?: number;
    videoBitrate?: number;
    audioBitrate?: number;
  };
  
  /**
   * Show participants even when camera is off
   */
}

interface UseStreamRecordingYoutubeReturn {
  isRecording: boolean;
  isLoading: boolean;
  recordingId: string | null;
  startRecording: (youtubeUrl?: string) => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
  error: Error | null;
}

export const useStreamRecordingYoutube = (
  options: UseStreamRecordingYoutubeOptions = {}
): UseStreamRecordingYoutubeReturn => {
  const { 
    youtubeRtmpUrl: initialYoutubeUrl,
    layout = 'speaker', // Default to speaker layout for screen share prominence
    quality = {
      width: 1920,
      height: 1080,
      framerate: 30,
      videoBitrate: 6000, // Increased from 4500 for better quality
      audioBitrate: 128, // Proper YouTube audio bitrate
    },
  } = options;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { roomName } = useStreamContext();
  const { apiClient } = useTenantContext();
  const { addNotification } = useNotification();
  const { publicKey } = useRequirePublicKey();
  const requestManager = getRequestManager();

  const startRecording = useCallback(
    async (youtubeUrl?: string): Promise<boolean> => {
      const rtmpUrl = youtubeUrl || initialYoutubeUrl;

      if (!rtmpUrl) {
        const error = new Error(
          "YouTube RTMP URL is required to start streaming"
        );
        setError(error);
        addNotification({
          type: "error",
          message: error.message,
          duration: 5000,
        });
        return false;
      }

      if (isRecording) {
        addNotification({
          type: "warning",
          message: "Recording is already in progress",
          duration: 3000,
        });
        return false;
      }

      if (!publicKey) {
        const error = new Error("Please connect your wallet to start recording");
        setError(error);
        addNotification({
          type: "error",
          message: error.message,
          duration: 5000,
        });
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await requestManager.execute<RecordingStartResponse>(
          `recording:youtube:start:${roomName}:${Date.now()}`,
          async () => apiClient.post<RecordingStartResponse>("/stream/youtube", {
            roomName,
            youtubeRtmpUrl: rtmpUrl,
            wallet: publicKey,
            // Pass layout and quality configuration
            layout,
            quality,
          }),
          {
            skipCache: true,
            rateLimitType: 'default'
          }
        );

        setIsRecording(true);
        setRecordingId(response.recordingId);

        addNotification({
          type: "success",
          message: "Successfully started streaming to YouTube",
          duration: 3000,
        });

        return true;
      } catch (err: any) {
        console.error("Failed to start recording:", err);
        
        if (err.message?.includes('Rate limit exceeded')) {
          const error = new Error("Too many recording requests. Please wait a moment and try again.");
          setError(error);
          addNotification({
            type: "error",
            message: error.message,
            duration: 5000,
          });
        } else {
          const error = err instanceof Error ? err : new Error("Failed to start recording");
          setError(error);
          addNotification({
            type: "error",
            message: `Failed to start streaming: ${error.message}`,
            duration: 5000,
          });
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      roomName,
      initialYoutubeUrl,
      isRecording,
      apiClient,
      addNotification,
      publicKey,
      requestManager,
      layout,
      quality,
    ]
  );

  const stopRecording = useCallback(async (): Promise<boolean> => {
    if (!isRecording || !recordingId) {
      addNotification({
        type: "warning",
        message: "No active recording to stop",
        duration: 3000,
      });
      return false;
    }

    if (!publicKey) {
      const error = new Error("Please connect your wallet to stop recording");
      setError(error);
      addNotification({
        type: "error",
        message: error.message,
        duration: 5000,
      });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await requestManager.execute<RecordingStopResponse>(
        `recording:youtube:stop:${recordingId}:${Date.now()}`,
        async () => apiClient.post<RecordingStopResponse>("/stream/youtube/stop", {
          recordId: recordingId,
          wallet: publicKey,
        }),
        {
          skipCache: true,
          rateLimitType: 'default'
        }
      );

      setIsRecording(false);
      setRecordingId(null);

      addNotification({
        type: "success",
        message: "Successfully stopped streaming",
        duration: 3000,
      });

      return true;
    } catch (err: any) {
      console.error("Failed to stop recording:", err);
      
      if (err.message?.includes('Rate limit exceeded')) {
        const error = new Error("Too many requests. Please wait a moment and try again.");
        setError(error);
        addNotification({
          type: "error",
          message: error.message,
          duration: 5000,
        });
      } else {
        const error = err instanceof Error ? err : new Error("Failed to stop recording");
        setError(error);
        addNotification({
          type: "error",
          message: `Failed to stop streaming: ${error.message}`,
          duration: 5000,
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isRecording, recordingId, apiClient, addNotification, publicKey, requestManager]);

  return {
    isRecording,
    isLoading,
    recordingId,
    startRecording,
    stopRecording,
    error,
  };
};



export interface WatermarkConfig {
  type: 'text' | 'image';
  content: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  x?: number;
  y?: number;
  opacity?: number;
  fontSize?: number;
  color?: string;
  width?: number;
  height?: number;
}

export interface RecordingConfig {
  quality?: 'ultra' | 'high' | 'medium' | 'low';
  watermarks?: WatermarkConfig[];
  maxDuration?: number;
  includeMicrophone?: boolean;
  audioTracks?: EnhancedSDKTrackReference[];
  room?: any;
  onRecordingComplete?: (blob: Blob, metadata: RecordingMetadata) => void | Promise<void>;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingPause?: () => void;
  onRecordingResume?: () => void;
  onError?: (error: Error) => void;
}

export interface RecordingMetadata {
  fileName: string;
  roomName: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  timestamp: number;
}

interface UseStreamRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  startRecording: (config?: RecordingConfig) => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
  pauseRecording: () => boolean;
  resumeRecording: () => boolean;
  error: Error | null;
}

export const useStreamRecording = (): UseStreamRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const connectedAudioTracksRef = useRef<Set<string>>(new Set());
  const audioSourceNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const audioMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const configRef = useRef<RecordingConfig>({});

  const { roomName } = useStreamContext();
  const { addNotification } = useNotification();

  // Quality presets
  const getQualitySettings = (quality: string) => {
    switch (quality) {
      case 'ultra':
        return { 
          videoBitsPerSecond: 20000000,
          width: 1920, 
          height: 1080,
          frameRate: 60 
        };
      case 'high':
        return { 
          videoBitsPerSecond: 10000000,
          width: 1920, 
          height: 1080,
          frameRate: 30 
        };
      case 'medium':
        return { 
          videoBitsPerSecond: 5000000,
          width: 1280, 
          height: 720,
          frameRate: 30 
        };
      case 'low':
        return { 
          videoBitsPerSecond: 2000000,
          width: 854, 
          height: 480,
          frameRate: 30 
        };
      default:
        return getQualitySettings('medium');
    }
  };

  // Helper to calculate positions
  const getPosition = (
    position: string,
    customX: number | undefined,
    customY: number | undefined,
    elementWidth: number,
    elementHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const padding = 20;
    
    if (position === 'custom' && customX !== undefined && customY !== undefined) {
      return { x: customX, y: customY };
    }
    
    const positions: Record<string, { x: number; y: number }> = {
      'top-left': { 
        x: padding, 
        y: padding + elementHeight 
      },
      'top-right': { 
        x: canvasWidth - elementWidth - padding, 
        y: padding + elementHeight 
      },
      'bottom-left': { 
        x: padding, 
        y: canvasHeight - padding 
      },
      'bottom-right': { 
        x: canvasWidth - elementWidth - padding, 
        y: canvasHeight - padding 
      },
      'center': { 
        x: (canvasWidth - elementWidth) / 2, 
        y: (canvasHeight + elementHeight) / 2 
      },
    };
    
    return positions[position] || positions['bottom-right'];
  };

  // Extract fresh audio tracks directly from LiveKit room
  const extractAudioTracksFromRoom = useCallback((room: any): EnhancedSDKTrackReference[] => {
    if (!room) return [];
    
    const tracks: EnhancedSDKTrackReference[] = [];
    
    try {
      const allParticipants = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values())
      ];
      
      allParticipants.forEach((participant: any) => {
        if (!participant) return;
        
        const micPublication = participant.getTrackPublication?.('microphone') || 
                              participant.audioTrackPublications?.get('microphone');
        
        if (micPublication?.track) {
          tracks.push({
            participant: {
              sid: participant.sid,
              identity: participant.identity,
              metadata: participant.metadata,
              isLocal: participant === room.localParticipant
            },
            publication: micPublication,
            source: 'microphone',
            track: micPublication.track,
          } as EnhancedSDKTrackReference);
        }
      });
    } catch (err) {
      console.error('Error extracting audio tracks:', err);
    }
    
    return tracks;
  }, []);

  // Connect audio tracks to the mixer
  const connectAudioTracks = useCallback((
    tracks: EnhancedSDKTrackReference[],
    audioContext: AudioContext,
    destination: MediaStreamAudioDestinationNode
  ) => {
    tracks.forEach((trackRef) => {
      let mediaStreamTrack: MediaStreamTrack | null = null;
      
      const livekitTrack = trackRef.track || trackRef.publication?.track;
      
      if (!livekitTrack) return;
      
      if ((livekitTrack as any)._mediaStreamTrack) {
        mediaStreamTrack = (livekitTrack as any)._mediaStreamTrack;
      } else if ((livekitTrack as any).mediaStreamTrack) {
        mediaStreamTrack = (livekitTrack as any).mediaStreamTrack;
      } else if (livekitTrack instanceof MediaStreamTrack) {
        mediaStreamTrack = livekitTrack;
      }
      
      if (!mediaStreamTrack || mediaStreamTrack.kind !== 'audio') return;
      
      const trackId = mediaStreamTrack.id;
      const isEnabled = mediaStreamTrack.enabled;
      
      if (connectedAudioTracksRef.current.has(trackId) || !isEnabled) return;
      
      try {
        const tempStream = new MediaStream([mediaStreamTrack]);
        const source = audioContext.createMediaStreamSource(tempStream);
        source.connect(destination);
        
        audioSourceNodesRef.current.set(trackId, source);
        connectedAudioTracksRef.current.add(trackId);
      } catch (err) {
        console.error('Failed to connect audio track:', err);
      }
    });
  }, []);

  // Mix all LiveKit audio tracks into a single stream
  const mixAudioTracks = useCallback((tracks: EnhancedSDKTrackReference[]): MediaStream => {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    
    // Create silent oscillator to ensure stream validity
    const silentOscillator = audioContext.createOscillator();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    silentOscillator.connect(silentGain);
    silentGain.connect(destination);
    silentOscillator.start();
    
    audioContextRef.current = audioContext;
    audioDestinationRef.current = destination;
    connectedAudioTracksRef.current.clear();
    audioSourceNodesRef.current.clear();
    
    connectAudioTracks(tracks, audioContext, destination);
    
    return destination.stream;
  }, [connectAudioTracks]);

  // Monitor for newly enabled audio tracks
  const startAudioTrackMonitoring = useCallback((room: any) => {
    if (!room) {
      console.error('No room provided for audio monitoring');
      return null;
    }
    
    const monitorInterval = setInterval(() => {
      if (!audioContextRef.current || !audioDestinationRef.current) {
        clearInterval(monitorInterval);
        return;
      }
      
      const currentTracks = extractAudioTracksFromRoom(room);
      connectAudioTracks(currentTracks, audioContextRef.current, audioDestinationRef.current);
    }, 500);
    
    return monitorInterval;
  }, [connectAudioTracks, extractAudioTracksFromRoom]);

  // Add watermarks to stream with quality preservation
  const addWatermarksToStream = async (
    stream: MediaStream, 
    watermarks: WatermarkConfig[]
  ): Promise<MediaStream> => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    
    // Wait for video to be fully ready and get actual dimensions
    await new Promise(resolve => {
      if (video.videoWidth > 0) {
        resolve(true);
      } else {
        video.onloadedmetadata = () => resolve(true);
      }
    });
    
    // Use actual video dimensions, not settings
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    })!;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Preload image watermarks
    const watermarkImages = await Promise.all(
      watermarks
        .filter(w => w.type === 'image')
        .map(async (w) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = w.content;
          await new Promise(resolve => img.onload = resolve);
          return { config: w, image: img };
        })
    );
    
    // Draw frame by frame
    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, width, height);
      
      watermarks.forEach(watermark => {
        ctx.save();
        ctx.globalAlpha = watermark.opacity || 0.7;
        
        if (watermark.type === 'text') {
          ctx.fillStyle = watermark.color || 'white';
          ctx.font = `${watermark.fontSize || 20}px Arial`;
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          const textMetrics = ctx.measureText(watermark.content);
          const textHeight = watermark.fontSize || 20;
          
          const position = getPosition(
            watermark.position || 'bottom-right',
            watermark.x,
            watermark.y,
            textMetrics.width,
            textHeight,
            width,
            height
          );
          
          ctx.fillText(watermark.content, position.x, position.y);
        } else if (watermark.type === 'image') {
          const imgData = watermarkImages.find(wi => wi.config === watermark);
          if (imgData) {
            const imgWidth = watermark.width || imgData.image.width;
            const imgHeight = watermark.height || imgData.image.height;
            
            const position = getPosition(
              watermark.position || 'bottom-right',
              watermark.x,
              watermark.y,
              imgWidth,
              imgHeight,
              width,
              height
            );
            
            ctx.drawImage(imgData.image, position.x - imgWidth, position.y - imgHeight, imgWidth, imgHeight);
          }
        }
        
        ctx.restore();
      });
      
      requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
    
    // Get source video track to match frame rate
    const sourceVideoTrack = stream.getVideoTracks()[0];
    const settings = sourceVideoTrack.getSettings();
    const frameRate = settings.frameRate || 30;
    
    // Capture stream at source frame rate for quality
    const canvasStream = canvas.captureStream(frameRate);
    const canvasVideoTrack = canvasStream.getVideoTracks()[0];
    
    // Preserve audio tracks
    const audioTracks = stream.getAudioTracks();
    const combinedStream = new MediaStream([canvasVideoTrack, ...audioTracks]);
    
    return combinedStream;
  };

  // Add microphone audio
  const addMicrophoneAudio = async (stream: MediaStream): Promise<MediaStream> => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      micStreamRef.current = audioStream;
      audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      
      return stream;
    } catch (err) {
      console.warn('Failed to add microphone:', err);
      addNotification({
        type: "warning",
        message: "Could not access microphone",
        duration: 3000,
      });
      return stream;
    }
  };

  // Download blob helper
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pause recording
  const pauseRecording = useCallback((): boolean => {
    if (!isRecording || isPaused || !mediaRecorderRef.current) {
      return false;
    }

    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        pauseStartRef.current = Date.now();
        
        // Pause the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        configRef.current.onRecordingPause?.();
        
        addNotification({
          type: "info",
          message: "Recording paused",
          duration: 2000,
        });
        
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to pause recording:', err);
      setError(err);
      return false;
    }
  }, [isRecording, isPaused, addNotification]);

  // Resume recording
  const resumeRecording = useCallback((): boolean => {
    if (!isRecording || !isPaused || !mediaRecorderRef.current) {
      return false;
    }

    try {
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        // Track total paused time
        pausedTimeRef.current += Date.now() - pauseStartRef.current;
        
        // Resume the timer
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
          setRecordingTime(Math.floor(elapsed / 1000));
        }, 1000);

        configRef.current.onRecordingResume?.();
        
        addNotification({
          type: "success",
          message: "Recording resumed",
          duration: 2000,
        });
        
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to resume recording:', err);
      setError(err);
      return false;
    }
  }, [isRecording, isPaused, addNotification]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<boolean> => {
    if (!isRecording || !mediaRecorderRef.current) {
      return false;
    }

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (audioMonitorIntervalRef.current) {
        clearInterval(audioMonitorIntervalRef.current);
        audioMonitorIntervalRef.current = null;
      }

      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (originalStreamRef.current) {
        originalStreamRef.current.getTracks().forEach(track => track.stop());
        originalStreamRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }

      audioSourceNodesRef.current.forEach((sourceNode) => {
        try {
          sourceNode.disconnect();
        } catch (err) {
          console.warn('Failed to disconnect source node:', err);
        }
      });
      audioSourceNodesRef.current.clear();

      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      audioDestinationRef.current = null;
      connectedAudioTracksRef.current.clear();

      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      configRef.current.onRecordingStop?.();

      return true;
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setError(err);
      return false;
    }
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async (
    config: RecordingConfig = {}
  ): Promise<boolean> => {
    if (isRecording) {
      addNotification({
        type: "warning",
        message: "Recording already in progress",
        duration: 3000,
      });
      return false;
    }

    configRef.current = config;
    setError(null);
    pausedTimeRef.current = 0;
    pauseStartRef.current = 0;

    try {
      config.onRecordingStart?.();
      
      const quality = getQualitySettings(config.quality || 'high');
      
      let stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: quality.width },
          height: { ideal: quality.height },
          frameRate: { ideal: quality.frameRate },
        },
        audio: false,
        // @ts-expect-error preferCurrentTab
        preferCurrentTab: true,
      });

      // Setup LiveKit audio
      if (config.audioTracks && config.audioTracks.length > 0) {
        const audioStream = mixAudioTracks(config.audioTracks);
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        audioMonitorIntervalRef.current = startAudioTrackMonitoring(config.room);
      }

      // Add microphone if requested
      if (config.includeMicrophone) {
        stream = await addMicrophoneAudio(stream);
      }

      originalStreamRef.current = stream;

      // Add watermarks if configured
      if (config.watermarks && config.watermarks.length > 0) {
        stream = await addWatermarksToStream(stream, config.watermarks);
      }

      streamRef.current = stream;

      if (stream.getVideoTracks().length === 0) {
        throw new Error('No video tracks in stream');
      }

      // Select mime type
      let mimeType = '';
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported mime type found');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: quality.videoBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        addNotification({
          type: "error",
          message: "Recording error occurred",
          duration: 5000,
        });
      };

      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          addNotification({
            type: "error",
            message: "Recording failed - no data captured",
            duration: 5000,
          });
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        
        const metadata: RecordingMetadata = {
          fileName: `recording-${roomName}-${Date.now()}.webm`,
          roomName,
          duration,
          fileSize: blob.size,
          mimeType: blob.type,
          timestamp: Date.now(),
        };

        if (configRef.current.onRecordingComplete) {
          try {
            await configRef.current.onRecordingComplete(blob, metadata);
          } catch (error) {
            console.error('Recording handler error:', error);
            downloadBlob(blob, metadata.fileName);
          }
        } else {
          downloadBlob(blob, metadata.fileName);
        }

        chunksRef.current = [];
      };

      // Handle user stopping screen share
      originalStreamRef.current.getTracks().forEach(track => {
        track.onended = () => stopRecording();
      });

      mediaRecorder.start(1000);
      setIsRecording(true);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        setRecordingTime(Math.floor(elapsed / 1000));
      }, 1000);

      // Auto-stop if max duration reached
      if (config.maxDuration) {
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            stopRecording();
            addNotification({
              type: "info",
              message: `Recording stopped (max duration ${config.maxDuration} minutes reached)`,
              duration: 5000,
            });
          }
        }, config.maxDuration * 60 * 1000);
      }

      addNotification({
        type: "success",
        message: "Recording started successfully",
        duration: 3000,
      });

      return true;
    } catch (err: any) {
      console.error('Recording failed:', err);
      
      if (err.name === 'NotAllowedError') {
        setError(new Error("Screen recording permission denied"));
        addNotification({
          type: "error",
          message: "Screen recording permission denied",
          duration: 5000,
        });
      } else {
        setError(err);
        addNotification({
          type: "error",
          message: `Failed to start recording: ${err.message}`,
          duration: 5000,
        });
      }
      
      config.onError?.(err);
      return false;
    }
  }, [isRecording, roomName, addNotification, stopRecording, mixAudioTracks, startAudioTrackMonitoring]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
  };
};