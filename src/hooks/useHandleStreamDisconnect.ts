import { useEffect, useCallback, useRef } from "react";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

export const useHandleStreamDisconnect = (publicKey: string) => {
  const { roomName, websocket, identity } = useStreamContext();
  const { apiClient } = useTenantContext();
  const disconnectingRef = useRef(false);
  const disconnectCalledTimeRef = useRef<number | null>(null);

  const leaveStream = useCallback(async () => {
    // Skip if called within last 5 seconds to prevent duplicates
    const now = Date.now();
    if (disconnectingRef.current || 
        (disconnectCalledTimeRef.current && now - disconnectCalledTimeRef.current < 5000)) {
      console.log("Duplicate leave call detected, skipping");
      return;
    }
    
    // Set flags to prevent duplicate calls
    disconnectingRef.current = true;
    disconnectCalledTimeRef.current = now;
    
    try {
      console.log(`Leaving stream ${roomName} with wallet ${publicKey}`);
      
      // Only update DB if we have all required info
      if (roomName && publicKey) {
        try {
          console.log(`Updating leftAt for wallet ${publicKey}`);
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

  // ONLY handle explicit disconnect (End Call button)
  // Don't do anything on component unmount to avoid erroneous disconnect calls
  
  // Handle page close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!publicKey || !roomName) return;
      
      console.log("Page unloading - sending synchronous request");
      
      try {
        // Send synchronous XHR
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${apiClient['baseUrl']}/participant/${roomName}`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('x-api-key', apiClient['apiKey']);
        xhr.setRequestHeader('x-api-secret', apiClient['apiSecret']);
        xhr.send(JSON.stringify({
          wallet: publicKey,
          leftAt: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to send unload request:', e);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [publicKey, roomName, apiClient]);

  // Send periodic activity signals
  useEffect(() => {
    if (!identity || !roomName || !websocket?.isConnected) return;
    
    const intervalId = setInterval(() => {
      if (websocket.isConnected) {
        websocket.sendMessage("participantActive", {
          participantId: identity,
          roomName,
          timestamp: Date.now()
        });
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [websocket, identity, roomName]);

  return { leaveStream };
};