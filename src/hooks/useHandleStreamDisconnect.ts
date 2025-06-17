import { useEffect, useCallback, useRef } from "react";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

export const useHandleStreamDisconnect = (publicKey: string) => {
  const { roomName, websocket, identity } = useStreamContext();
  const { apiClient } = useTenantContext();
  const disconnectingRef = useRef(false);
  const disconnectCalledTimeRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const leaveStream = useCallback(async () => {
    // Skip if called within last 5 seconds to prevent duplicates
    const now = Date.now();
    if (disconnectingRef.current || 
        (disconnectCalledTimeRef.current && now - disconnectCalledTimeRef.current < 5000)) {
      // console.log("Duplicate leave call detected, skipping");
      return;
    }
    
    // Set flags to prevent duplicate calls
    disconnectingRef.current = true;
    disconnectCalledTimeRef.current = now;
    
    try {
      // console.log(`Leaving stream ${roomName} with wallet ${publicKey}`);
      
      // Only update DB if we have all required info
      if (roomName && publicKey) {
        try {
          // console.log(`Updating leftAt for wallet ${publicKey}`);
          await apiClient.put(`/participant/${roomName}`, {
            wallet: publicKey,
            leftAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Failed to update leftAt time:", error);
        }
      }
    } catch (error) {
      console.error("Error in leaveStream:", error);
    } finally {
      // Reset flag after a delay
      setTimeout(() => {
        disconnectingRef.current = false;
      }, 5000);
    }
  }, [publicKey, roomName, apiClient]);

  // Handle page close/refresh with sendBeacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!publicKey || !roomName) return;
      
      // console.log("Page unloading - sending beacon");
      
      // Use sendBeacon for reliability
      const formData = new FormData();
      formData.append('wallet', publicKey);
      formData.append('leftAt', new Date().toISOString());
      
      // Construct the full URL with query parameter to handle method override
      const url = `${apiClient['baseUrl']}/participant/${roomName}?method=PUT`;
      
      // Add headers as query parameters since sendBeacon doesn't support custom headers well
      const beaconUrl = `${url}&x-api-key=${apiClient['apiKey']}&x-api-secret=${apiClient['apiSecret']}`;
      
      try {
        const sent = navigator.sendBeacon(beaconUrl, formData);
        console.log('Beacon sent:', sent);
      } catch (e) {
        console.error('Failed to send beacon:', e);
        
        // Fallback to synchronous XHR as last resort
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `${apiClient['baseUrl']}/participant/${roomName}`, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('x-api-key', apiClient['apiKey']);
          xhr.setRequestHeader('x-api-secret', apiClient['apiSecret']);
          xhr.send(JSON.stringify({
            wallet: publicKey,
            leftAt: new Date().toISOString()
          }));
        } catch (xhrError) {
          console.error('XHR fallback also failed:', xhrError);
        }
      }
    };

    // Also handle visibility change for mobile/tab switching
    const handleVisibilityChange = () => {
      if (document.hidden && roomName && publicKey) {
        // User switched tabs or minimized - update last activity
        lastActivityRef.current = Date.now();
        
        // Send activity update through WebSocket
        if (websocket?.isConnected && identity) {
          websocket.sendMessage("participantActive", {
            participantId: identity,
            roomName,
            timestamp: Date.now()
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload); // Better for mobile
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [publicKey, roomName, apiClient, websocket, identity]);

  // Send periodic activity signals with better error handling
  useEffect(() => {
    if (!identity || !roomName || !websocket?.isConnected) return;
    
    const sendActivity = () => {
      if (websocket.isConnected) {
        try {
          websocket.sendMessage("participantActive", {
            participantId: identity,
            roomName,
            timestamp: Date.now()
          });
          lastActivityRef.current = Date.now();
          // Remove verbose logging
          // console.log(`Activity signal sent for ${identity} in ${roomName}`);
        } catch (error) {
          console.error("Failed to send activity signal:", error);
        }
      }
    };
    
    // Send initial activity signal after a delay to avoid duplicate with joinRoom
    const initialTimer = setTimeout(sendActivity, 2000);
    
    // Send activity every 30 seconds
    const intervalId = setInterval(sendActivity, 30000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [websocket, identity, roomName]);

  return { leaveStream };
};