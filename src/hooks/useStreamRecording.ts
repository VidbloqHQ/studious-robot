import { useState, useCallback } from 'react';
import { useStreamContext } from './useStreamContext';
import { useTenantContext } from './useTenantContext';
import { useNotification } from './useNotification';

interface RecordingStartResponse {
  message: string;
  recordingId: string;
  streamId: string;
}

interface RecordingStopResponse {
  message: string;
  streamId: string;
  recordId: string;
}

interface UseStreamRecordingOptions {
  /**
   * YouTube RTMP URL
   * Format: rtmp://a.rtmp.youtube.com/live2/[your-stream-key]
   */
  youtubeRtmpUrl?: string;
}

interface UseStreamRecordingReturn {
  /**
   * Whether recording is currently active
   */
  isRecording: boolean;
  
  /**
   * Whether a recording operation is in progress
   */
  isLoading: boolean;
  
  /**
   * Current recording ID (if recording is active)
   */
  recordingId: string | null;
  
  /**
   * Start recording/streaming to YouTube
   */
  startRecording: (youtubeUrl?: string) => Promise<boolean>;
  
  /**
   * Stop current recording/streaming
   */
  stopRecording: () => Promise<boolean>;
  
  /**
   * Any error that occurred during recording operations
   */
  error: Error | null;
}

/**
 * Hook for controlling stream recording and YouTube streaming
 * 
 * @param options - Configuration options
 * @returns Object containing recording state and functions
 */
export const useStreamRecording = (
  options: UseStreamRecordingOptions = {}
): UseStreamRecordingReturn => {
  const { youtubeRtmpUrl: initialYoutubeUrl } = options;
  
  // State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Hooks
  const { roomName } = useStreamContext();
  const { apiClient } = useTenantContext();
  const { addNotification } = useNotification();
  
  // Function to start recording and streaming to YouTube
  const startRecording = useCallback(
    async (youtubeUrl?: string): Promise<boolean> => {
      const rtmpUrl = youtubeUrl || initialYoutubeUrl;
      
      if (!rtmpUrl) {
        const error = new Error('YouTube RTMP URL is required to start streaming');
        setError(error);
        addNotification({
          type: 'error',
          message: error.message,
          duration: 5000,
        });
        return false;
      }
      
      if (isRecording) {
        addNotification({
          type: 'warning',
          message: 'Recording is already in progress',
          duration: 3000,
        });
        return false;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Call your API to start recording with YouTube RTMP URL
        const response = await apiClient.post<RecordingStartResponse>(
          '/stream/youtube',
          {
            roomName,
            youtubeRtmpUrl: rtmpUrl,
          }
        );
        
        setIsRecording(true);
        setRecordingId(response.recordingId);
        
        addNotification({
          type: 'success',
          message: 'Successfully started streaming to YouTube',
          duration: 3000,
        });
        
        return true;
      } catch (err) {
        console.error('Failed to start recording:', err);
        const error = err instanceof Error ? err : new Error('Failed to start recording');
        setError(error);
        
        addNotification({
          type: 'error',
          message: `Failed to start streaming: ${error.message}`,
          duration: 5000,
        });
        
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [roomName, initialYoutubeUrl, isRecording, apiClient, addNotification]
  );
  
  // Function to stop recording
  const stopRecording = useCallback(
    async (): Promise<boolean> => {
      if (!isRecording || !recordingId) {
        addNotification({
          type: 'warning',
          message: 'No active recording to stop',
          duration: 3000,
        });
        return false;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Call your API to stop recording
        await apiClient.post<RecordingStopResponse>(
          '/stream/youtube/stop',
          {
            recordId: recordingId,
          }
        );
        
        setIsRecording(false);
        setRecordingId(null);
        
        addNotification({
          type: 'success',
          message: 'Successfully stopped streaming',
          duration: 3000,
        });
        
        return true;
      } catch (err) {
        console.error('Failed to stop recording:', err);
        const error = err instanceof Error ? err : new Error('Failed to stop recording');
        setError(error);
        
        addNotification({
          type: 'error',
          message: `Failed to stop streaming: ${error.message}`,
          duration: 5000,
        });
        
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isRecording, recordingId, apiClient, addNotification]
  );
  
  return {
    isRecording,
    isLoading,
    recordingId,
    startRecording,
    stopRecording,
    error,
  };
};