import { TrackToggle } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { usePrejoin, useRequirePublicKey } from '../hooks/index';

/**
 * Pre-join component for stream setup
 * Allows users to configure audio/video and enter a nickname before joining
 */
const PrejoinComponent: React.FC = () => {
  const { publicKey } = useRequirePublicKey();
  

  const {
    nickname,
    setNickname,
    videoRef,
    handleAudioToggle,
    handleVideoToggle,
    canControlMedia,
    isLoading,
    joinStream,
    error,
    previewTracks
  } = usePrejoin({ 
    publicKey
  });

  return (
    <div className="w-full">
      {/* Display any errors */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
          {error.message}
        </div>
      )}
      
      <div>
        <div className="bg-[var(--sdk-primary-bg-color)] h-[200px] w-[88%] lg:h-[355px] lg:w-[650px] mx-auto relative rounded-3xl">
          {/* Video preview */}
          {canControlMedia && previewTracks.videoTrack && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-3xl"
              autoPlay
              playsInline
              muted
            />
          )}
          
          {/* Controls bar */}
          <div className="flex flex-row items-center justify-between w-[92%] lg:w-[92%] absolute bottom-4 lg:bottom-6 text-[var(--sdk-text-color)] left-1/2 transform -translate-x-1/2">
            {/* Nickname input */}
            <input
              type="text"
              className="rounded-full focus:outline-none border border-[var(--sdk-primary-border-color)] bg-[var(--sdk-secondary-btn-color)] w-[55%] lg:w-[50%] p-1.5 lg:p-2 text-sm"
              placeholder="Your Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            
            {/* Media controls */}
            {canControlMedia && (
              <div className="flex flex-row items-center justify-between w-[25%] lg:w-[14%]">
                {/* Audio toggle */}
                <div className="rounded-full w-[35px] h-[35px] p-2 lg:w-[40px] lg:h-[40px] lg:p-2.5 bg-gradient-to-br from-primary to-second-gradient">
                  <TrackToggle
                    source={Track.Source.Microphone}
                    onChange={handleAudioToggle}
                  />
                </div>
                
                {/* Video toggle */}
                <div className="rounded-full w-[35px] h-[35px] p-2 lg:w-[40px] lg:h-[40px] lg:p-2.5 bg-gradient-to-br from-primary to-second-gradient">
                  <TrackToggle
                    source={Track.Source.Camera}
                    onChange={handleVideoToggle}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Join button */}
        <div
          className="w-[52%] lg:w-[15%] mx-auto mt-10 text-[var(--sdk-text-color)]"
        >
          <button 
            className={`bg-primary py-3.5 lg:py-3 rounded-full w-full text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={joinStream}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Start Stream'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrejoinComponent;