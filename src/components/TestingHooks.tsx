import { useState } from 'react';
import { useStreamRecording } from '../hooks/index';

interface YouTubeStreamingComponentProps {
  /**
   * Optional className for the container
   */
  className?: string;
  
  /**
   * Optional default YouTube RTMP URL
   */
  defaultYoutubeUrl?: string;
}

/**
 * Component for controlling YouTube streaming
 */
const YouTubeStreamingComponent: React.FC<YouTubeStreamingComponentProps> = ({
  className = '',
  defaultYoutubeUrl = '',
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState<string>(defaultYoutubeUrl);
  const [isUrlVisible, setIsUrlVisible] = useState<boolean>(false);
  
  const {
    isRecording,
    isLoading,
    startRecording,
    stopRecording,
    error,
  } = useStreamRecording({ youtubeRtmpUrl: defaultYoutubeUrl });

  const handleStartStreaming = async () => {
    await startRecording(youtubeUrl);
  };

  const handleStopStreaming = async () => {
    await stopRecording();
  };

  const toggleUrlVisibility = () => {
    setIsUrlVisible(!isUrlVisible);
  };

  return (
    <div className={`youtube-streaming-container ${className}`}>
      <h3 className="text-lg font-semibold mb-3">YouTube Streaming</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error.message}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          YouTube RTMP URL (with stream key)
        </label>
        <div className="flex items-center">
          <input
            type={isUrlVisible ? 'text' : 'password'}
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx"
            className="flex-grow p-2 border rounded-l"
            disabled={isRecording}
          />
          <button
            type="button"
            onClick={toggleUrlVisibility}
            className="p-2 border border-l-0 rounded-r bg-gray-100"
          >
            {isUrlVisible ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs mt-1 text-gray-500">
          Get this from YouTube Studio &gt; Go Live &gt; Stream &gt; Stream URL and Stream key
        </p>
      </div>
      
      <div className="flex space-x-2">
        {!isRecording ? (
          <button
            onClick={handleStartStreaming}
            disabled={isLoading || !youtubeUrl}
            className={`flex-1 py-2 px-4 rounded ${
              isLoading || !youtubeUrl
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isLoading ? 'Starting...' : 'Start YouTube Stream'}
          </button>
        ) : (
          <button
            onClick={handleStopStreaming}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {isLoading ? 'Stopping...' : 'Stop YouTube Stream'}
          </button>
        )}
      </div>
      
      {isRecording && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded flex items-center">
          <span className="h-3 w-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
          <span className="text-sm text-red-800">Live on YouTube</span>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        <p>Note: Make sure your YouTube account is configured for live streaming and that your stream key is correct.</p>
      </div>
    </div>
  );
};

export default YouTubeStreamingComponent;