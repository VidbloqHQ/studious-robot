import React, { useState, useEffect } from 'react';
import { Track } from "livekit-client";
import { TrackToggle } from "@livekit/components-react";
import { useCameraSwitch } from '../hooks/useCameraSwitch'; // Import our enhanced hook
import { Icon } from "./icons";

/**
 * Enhanced Camera Toggle component that works on iOS
 */
const CameraToggleButton = ({ enabled, toggle }) => {
  const { switchCamera, enableCamera, error, isLoading } = useCameraSwitch();
  const [cameraEnabled, setCameraEnabled] = useState(enabled);
  const [showSwitchButton, setShowSwitchButton] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setCameraEnabled(enabled);
    // Only show the switch button when the camera is enabled
    setShowSwitchButton(enabled);
  }, [enabled]);

  // Handle camera toggle with better iOS support
  const handleCameraToggle = async () => {
    try {
      if (!cameraEnabled) {
        // If camera is off, try to enable it
        await enableCamera();
      }
      // Call the original toggle function
      toggle();
      setCameraEnabled(!cameraEnabled);
      // Only show switch button when camera becomes enabled
      setShowSwitchButton(!cameraEnabled);
    } catch (err) {
      console.error('Error toggling camera:', err);
    }
  };

  return (
    <>
      <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
        {showSwitchButton && (
          <button 
            className="bg-[#F5F5F5] p-1 rounded-xl"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering toggle
              switchCamera();
            }}
            disabled={isLoading}
          >
            <Icon name="usdt" className="text-primary" size={12} />
          </button>
        )}
        <Icon name="circle" className="text-[#F5F5F5]" size={12} />
        {cameraEnabled ? (
          <div 
            className="bg-primary p-2 rounded-xl"
            onClick={handleCameraToggle}
          >
            <Icon name="video" className="text-white" />
          </div>
        ) : (
          <div 
            className="bg-[#F5F5F5] p-2 rounded-xl"
            onClick={handleCameraToggle}
          >
            <Icon name="videoOff" className="text-white" />
          </div>
        )}
      </div>
      
      {/* Show any errors */}
      {error && (
        <div className="absolute bottom-16 left-0 right-0 mx-auto bg-red-500 text-white p-2 rounded text-center text-sm">
          {error}
        </div>
      )}
    </>
  );
};

/**
 * Fixed version of track toggle that works on iOS, properly follows React hooks rules
 */
export const IOSCompatibleTrackToggle = ({ source, children }) => {
  // Always initialize all hooks at the top level
  const { enableCamera } = useCameraSwitch();
  const [isEnabled, setIsEnabled] = useState(false);
  
  const handleToggle = async () => {
    if (!isEnabled) {
      await enableCamera();
    }
    setIsEnabled(!isEnabled);
  };
  
  // Render logic based on track source
  if (source === Track.Source.Camera) {
    // For camera track, use our custom component with injected props
    return React.cloneElement(children, { 
      enabled: isEnabled,
      toggle: handleToggle 
    });
  } else {
    // For other track types, use the original TrackToggle
    return (
      <TrackToggle source={source} showIcon={false}>
        {children}
      </TrackToggle>
    );
  }
};

export default CameraToggleButton;