/* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import React, { useState, useEffect } from 'react';

// /**
//  * A simple debug component to test camera access on iOS Chrome
//  */
// const IOSCameraDebug: React.FC = () => {
//   const [logs, setLogs] = useState<string[]>([]);
//   const [cameraStatus, setCameraStatus] = useState<'untested' | 'success' | 'failed'>('untested');
  
//   const addLog = (message: string) => {
//     setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
//   };
  
//   // Check if we're on iOS
//   const isIOS = 
//     ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
//     (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
//     (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
  
//   useEffect(() => {
//     addLog(`Running on iOS: ${isIOS}`);
//     addLog(`User Agent: ${navigator.userAgent}`);
//     addLog(`MediaDevices API available: ${!!navigator.mediaDevices}`);
//     addLog(`getUserMedia available: ${navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia}`);
//   }, []);
  
//   const testCameraAccess = async () => {
//     addLog('Testing camera access...');
    
//     try {
//       // Make sure mediaDevices exists
//       if (!navigator.mediaDevices) {
//         addLog('MediaDevices API is not available in this browser');
//         throw new Error('MediaDevices API is not supported');
//       }
      
//       // Make sure getUserMedia exists
//       if (!navigator.mediaDevices.getUserMedia) {
//         addLog('getUserMedia not available, adding polyfill');
//         navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
//           const getUserMedia = 
//             (navigator as any).webkitGetUserMedia || 
//             (navigator as any).mozGetUserMedia ||
//             (navigator as any).msGetUserMedia;
          
//           if (!getUserMedia) {
//             addLog('No getUserMedia implementation found');
//             return Promise.reject(new Error('getUserMedia is not implemented'));
//           }
          
//           addLog('Using legacy getUserMedia');
//           return new Promise((resolve, reject) => {
//             getUserMedia.call(navigator, constraints, resolve, reject);
//           });
//         };
//       }
      
//       // Try to access the camera
//       addLog('Requesting camera access...');
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true,
//         audio: false 
//       });
      
//       addLog(`Camera access successful! Got ${stream.getVideoTracks().length} video tracks`);
//       setCameraStatus('success');
      
//       // Stop all tracks 
//       stream.getTracks().forEach(track => {
//         track.stop();
//         addLog(`Stopped track: ${track.kind} (${track.label})`);
//       });
      
//     } catch (err) {
//       const error = err as Error;
//       addLog(`Camera access failed: ${error.name} - ${error.message}`);
//       setCameraStatus('failed');
//     }
//   };
  
//   return (
//     <div className="fixed top-0 left-0 w-full h-full bg-white z-50 overflow-auto p-4">
//       <h2 className="text-xl font-bold mb-4">iOS Camera Debug</h2>
      
//       <div className="mb-4">
//         <button 
//           onClick={testCameraAccess}
//           className={`px-4 py-2 rounded ${
//             cameraStatus === 'untested' ? 'bg-blue-500 text-white' :
//             cameraStatus === 'success' ? 'bg-green-500 text-white' :
//             'bg-red-500 text-white'
//           }`}
//         >
//           {cameraStatus === 'untested' ? 'Test Camera Access' :
//            cameraStatus === 'success' ? 'Camera Test Successful' :
//            'Camera Test Failed (Try Again)'}
//         </button>
//       </div>
      
//       <div className="mb-4">
//         <h3 className="font-bold mb-2">Debug Logs:</h3>
//         <div className="bg-gray-100 p-2 rounded font-mono text-xs h-64 overflow-y-auto">
//           {logs.map((log, index) => (
//             <div key={index} className="mb-1">{log}</div>
//           ))}
//         </div>
//       </div>
      
//       <div className="text-sm">
//         <p>Once camera access is working here, you can try using your app's camera features.</p>
//         <p className="mt-2">
//           <button 
//             onClick={() => window.location.reload()}
//             className="text-blue-500 underline"
//           >
//             Reload Page
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default IOSCameraDebug;

import React, { useState, useEffect } from 'react';

interface IOSCameraDebugProps {
  onCameraInitialized?: () => void; // Callback when camera is initialized
}

/**
 * A debug component to test camera access on iOS Chrome
 */
const IOSCameraDebug: React.FC<IOSCameraDebugProps> = ({ onCameraInitialized }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [cameraStatus, setCameraStatus] = useState<'untested' | 'success' | 'failed'>('untested');
  const [testTriggered, setTestTriggered] = useState(false);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  // Check if we're on iOS
  const isIOS = 
    ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
  
  useEffect(() => {
    addLog(`Running on iOS: ${isIOS}`);
    addLog(`User Agent: ${navigator.userAgent}`);
    addLog(`MediaDevices API available: ${!!navigator.mediaDevices}`);
    addLog(`getUserMedia available: ${navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia}`);
    
    // Auto-test on component mount after a short delay
    const timer = setTimeout(() => {
      if (!testTriggered) {
        testCameraAccess();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const testCameraAccess = async () => {
    setTestTriggered(true);
    addLog('Testing camera access...');
    
    try {
      // Make sure mediaDevices exists
      if (!navigator.mediaDevices) {
        addLog('MediaDevices API is not available in this browser');
        throw new Error('MediaDevices API is not supported');
      }
      
      // Make sure getUserMedia exists
      if (!navigator.mediaDevices.getUserMedia) {
        addLog('getUserMedia not available, adding polyfill');
        navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
          const getUserMedia = 
            (navigator as any).webkitGetUserMedia || 
            (navigator as any).mozGetUserMedia ||
            (navigator as any).msGetUserMedia;
          
          if (!getUserMedia) {
            addLog('No getUserMedia implementation found');
            return Promise.reject(new Error('getUserMedia is not implemented'));
          }
          
          addLog('Using legacy getUserMedia');
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }
      
      // Try to access the camera
      addLog('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      addLog(`Camera access successful! Got ${stream.getVideoTracks().length} video tracks`);
      setCameraStatus('success');
      
      // Stop all tracks 
      stream.getTracks().forEach(track => {
        track.stop();
        addLog(`Stopped track: ${track.kind} (${track.label})`);
      });
      
      // Call the callback if provided
      if (onCameraInitialized) {
        onCameraInitialized();
      }
      
    } catch (err) {
      const error = err as Error;
      addLog(`Camera access failed: ${error.name} - ${error.message}`);
      setCameraStatus('failed');
    }
  };
  
  return (
    <div>
      <h2>iOS Camera Debug</h2>
      
      <div className="mb-4">
        <button 
          onClick={testCameraAccess}
          style={{
            backgroundColor: cameraStatus === 'untested' ? '#1890ff' : 
                           cameraStatus === 'success' ? '#52c41a' : 
                           '#f5222d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {cameraStatus === 'untested' ? 'Test Camera Access' :
           cameraStatus === 'success' ? 'Camera Test Successful' :
           'Camera Test Failed (Try Again)'}
        </button>
      </div>
      
      <div className="mb-4">
        <h3>Debug Logs:</h3>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          height: '200px',
          overflowY: 'auto'
        }}>
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IOSCameraDebug;