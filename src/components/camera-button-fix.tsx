import React, { useState, useEffect } from 'react';
import { initializeIOSCamera, isIOSBrowser } from '../utils/ios-direct-fix';
import { Icon } from './icons';

interface CameraButtonProps {
  enabled: boolean;
  toggle: () => void;
}

/**
 * Camera button specifically designed for iOS Chrome
 */
const CameraButton: React.FC<CameraButtonProps> = ({ enabled, toggle }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  
  // Clear error after timeout
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (error) {
      setShowError(true);
      timer = setTimeout(() => setShowError(false), 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error]);
  
  // Handle camera toggle with iOS fix
  const handleCameraToggle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For iOS Chrome/Safari, make sure camera is initialized first
      if (isIOSBrowser() && !initialized) {
        console.log('Initializing camera for iOS Chrome/Safari...');
        const success = await initializeIOSCamera();
        if (success) {
          setInitialized(true);
        } else {
          throw new Error('Failed to initialize camera. Please check permissions.');
        }
      }
      
      // Call the original toggle
      toggle();
    } catch (err) {
      console.error('Camera error:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <div 
        className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2"
        onClick={handleCameraToggle}
      >
        <Icon name="circle" className="text-[#F5F5F5]" size={12} />
        {loading ? (
          // Loading state
          <div className="bg-gray-300 p-2 rounded-xl">
            <Icon name="usdt" className="text-white animate-spin" />
          </div>
        ) : enabled ? (
          // Camera enabled state
          <div className="bg-primary p-2 rounded-xl">
            <Icon name="video" className="text-white" />
          </div>
        ) : (
          // Camera disabled state
          <div className="bg-[#F5F5F5] p-2 rounded-xl">
            <Icon name="videoOff" className="text-white" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {showError && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs p-2 rounded whitespace-nowrap z-20">
          {error}
        </div>
      )}
    </div>
  );
};

export default CameraButton;