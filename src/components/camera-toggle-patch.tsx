import React, { useState, useEffect } from 'react';
import { useCameraSwitch } from '../hooks/reliable-camera-switch';
import { Icon } from './icons';

// Define the props interface
interface CameraToggleButtonProps {
  enabled: boolean;
  toggle: () => void;
}

/**
 * Enhanced camera button with more reliable switching for mobile devices
 */
const CameraToggleButton: React.FC<CameraToggleButtonProps> = ({ enabled, toggle }) => {
  const { 
    switchCamera, 
    isLoading, 
    error, 
    isFrontCamera,
    availableCameras
  } = useCameraSwitch();
  
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [lastToggleTime, setLastToggleTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  
  // Reset error message after timeout
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (error) {
      setShowErrorMessage(true);
      timer = setTimeout(() => setShowErrorMessage(false), 3000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error]);
  
  // Handle camera switching with debounce and retry logic
  const handleCameraSwitch = async () => {
    const now = Date.now();
    
    // Prevent rapid clicks (debounce of 1.5 seconds)
    if (now - lastToggleTime < 1500 || buttonDisabled) {
      return;
    }
    
    setButtonDisabled(true);
    setLastToggleTime(now);
    
    try {
      // Actual camera switching
      await switchCamera();
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      console.error('Error in camera switch button:', err);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // After multiple retries, try toggling camera on/off first
      if (retryCount >= 2 && enabled) {
        try {
          // Toggle off
          toggle();
          
          // Wait a bit, then toggle back on
          setTimeout(() => {
            toggle();
            
            // After toggling back on, try switching again
            setTimeout(() => {
              switchCamera();
            }, 700);
          }, 700);
        } catch (toggleErr) {
          console.error('Error during camera toggle retry:', toggleErr);
        }
      }
    } finally {
      // Re-enable button after a delay
      setTimeout(() => {
        setButtonDisabled(false);
      }, 1500); // Matches debounce time
    }
  };
  
  // Handle main camera toggle
  const handleCameraToggle = async () => {
    // Don't allow toggling while switching
    if (isLoading || buttonDisabled) return;
    
    try {
      // Toggle camera on/off
      toggle();
      
      // On mobile, if turning on camera and multiple cameras available,
      // we can pre-set whether it's front or back
      if (!enabled && availableCameras.length >= 2) {
        // Give time for camera to initialize before switch
        setTimeout(() => {
          // Only trigger if not already the correct camera
          if (isFrontCamera !== true) {
            switchCamera();
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
    }
  };
  
  return (
    <div className="relative">
      <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
        {/* Camera switch button - only show when camera is on */}
        {enabled && (
          <button 
            onClick={handleCameraSwitch}
            disabled={isLoading || buttonDisabled}
            className={`bg-gray-100 p-1.5 rounded-xl ${
              isLoading || buttonDisabled ? 'opacity-50' : 'hover:bg-gray-200'
            }`}
            style={{ 
              minWidth: '28px', 
              minHeight: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title={`Switch to ${isFrontCamera ? 'back' : 'front'} camera`}
          >
            {isLoading ? (
              <Icon name="usdt" className="text-primary animate-spin" size={16} />
            ) : (
              <Icon name="Poll" className="text-primary" size={16} />
            )}
          </button>
        )}
        
        {/* Main camera toggle button */}
        <button 
          onClick={handleCameraToggle}
          disabled={isLoading}
          className={`rounded-xl flex items-center justify-center ${
            isLoading ? 'opacity-50' : ''
          }`}
          style={{
            minWidth: '36px',
            minHeight: '36px',
            backgroundColor: enabled ? '#6366f1' : '#f5f5f5',
            transition: 'all 0.2s'
          }}
        >
          <Icon 
            name={enabled ? "video" : "videoOff"} 
            className={enabled ? "text-white" : "text-gray-500"} 
            size={20}
          />
        </button>
      </div>
      
      {/* Error message tooltip */}
      {showErrorMessage && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs p-2 rounded whitespace-nowrap z-20">
          {error}
        </div>
      )}
    </div>
  );
};

export default CameraToggleButton;