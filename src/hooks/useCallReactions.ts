/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from "react";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";
import { useRequirePublicKey } from "./useRequirePublicKey";

interface ReactionData {
  reaction: string;
  sender: string;
  timestamp?: number;
  id?: string;
  roomName?: string;
}

interface PendingReaction {
  data: ReactionData;
  retryCount: number;
  timeoutId?: NodeJS.Timeout;
}

export const useCallReactions = () => {
  const [reactions, setReactions] = useState<ReactionData[]>([]);
  const { websocket, roomName, identity } = useStreamContext();
  const { isConnected } = useTenantContext();
  const reactionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingReactions = useRef<Map<string, PendingReaction>>(new Map());
  const joinedRoom = useRef(false);
  const { publicKey } = useRequirePublicKey();

  // Ensure we're properly joined to the room
  useEffect(() => {
    if (isConnected && roomName && identity && !joinedRoom.current) {
      websocket.joinRoom(roomName, identity, publicKey?.toString());
      joinedRoom.current = true;
    }
  }, [isConnected, roomName, identity, websocket]);

  // Set up WebSocket event listeners for reactions
  useEffect(() => {
    if (!websocket || !roomName) return;

    // Handle incoming reactions
    const handleReceiveReaction = (data: ReactionData) => {
      // Only process reactions for the current room
      if (data.roomName && data.roomName !== roomName) {
        return;
      }
      
      // Add timestamp and ID if not present
      const reactionWithMeta: ReactionData = {
        ...data,
        timestamp: data.timestamp || Date.now(),
        id: data.id || `${data.reaction}-${data.sender}-${Date.now()}-${Math.random()}`,
        roomName: data.roomName || roomName
      };
      
      // Add the new reaction to the array
      setReactions((prev) => {
        // Check if this exact reaction already exists (prevent duplicates)
        const exists = prev.some(r => r.id === reactionWithMeta.id);
        if (exists) {
          return prev;
        }
        
        // Add new reaction and limit array size
        const updated = [...prev, reactionWithMeta];
        return updated.slice(-50); // Keep only last 50 reactions
      });

      // Create a unique timeout key for this specific reaction
      const timeoutKey = reactionWithMeta.id!;
      
      // Clear any existing timeout for this reaction
      if (reactionTimeouts.current.has(timeoutKey)) {
        clearTimeout(reactionTimeouts.current.get(timeoutKey)!);
      }

      // Remove the reaction after a timeout (matching animation duration)
      const timeout = setTimeout(() => {
        setReactions((prev) => {
          const filtered = prev.filter((r) => r.id !== reactionWithMeta.id);
          return filtered;
        });
        reactionTimeouts.current.delete(timeoutKey);
      }, 4500); // Slightly longer than animation to ensure smooth removal
      
      reactionTimeouts.current.set(timeoutKey, timeout);
    };

    // Handle connection events
    const handleConnect = () => {
      joinedRoom.current = false; // Reset join status to rejoin
      
      // Resend any pending reactions
      pendingReactions.current.forEach((pending) => {
        sendReactionInternal(pending.data);
      });
    };

    const handleDisconnect = () => {
      joinedRoom.current = false;
    };

    // Add event listeners
    websocket.addEventListener("receiveReaction", handleReceiveReaction);
    websocket.addEventListener("connected", handleConnect);
    websocket.addEventListener("disconnected", handleDisconnect);

    // Clean up event listeners and timeouts on unmount
    return () => {
      if (websocket) {
        websocket.removeEventListener("receiveReaction", handleReceiveReaction);
        websocket.removeEventListener("connected", handleConnect);
        websocket.removeEventListener("disconnected", handleDisconnect);
      }
      
      // Clear all timeouts
      reactionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reactionTimeouts.current.clear();
      
      // Clear pending reactions
      pendingReactions.current.forEach(pending => {
        if (pending.timeoutId) clearTimeout(pending.timeoutId);
      });
      pendingReactions.current.clear();
    };
  }, [websocket, roomName]);

  // Internal function to send reaction with retry logic
  const sendReactionInternal = useCallback((reactionData: ReactionData) => {
    if (!websocket || !roomName) {
      console.error("Cannot send reaction: WebSocket or roomName not available");
      return;
    }

    const sent = websocket.sendMessage("sendReaction", {
      roomName,
      reaction: reactionData.reaction,
      sender: reactionData.sender
    });

    if (!sent) {
      console.error(`Failed to send reaction: ${reactionData.reaction}`);
      
      // Add to pending reactions for retry
      const pendingId = reactionData.id!;
      const pending = pendingReactions.current.get(pendingId);
      
      if (!pending || pending.retryCount < 3) {
        const retryCount = pending ? pending.retryCount + 1 : 1;
        
        const timeoutId = setTimeout(() => {
          sendReactionInternal(reactionData);
        }, 1000 * retryCount); // Exponential backoff
        
        pendingReactions.current.set(pendingId, {
          data: reactionData,
          retryCount,
          timeoutId
        });
      } else {
        console.error(`Max retries reached for reaction: ${reactionData.reaction}`);
        pendingReactions.current.delete(pendingId);
      }
    } else {
      // Remove from pending if it was there
      const pending = pendingReactions.current.get(reactionData.id!);
      if (pending) {
        if (pending.timeoutId) clearTimeout(pending.timeoutId);
        pendingReactions.current.delete(reactionData.id!);
      }
    }
  }, [websocket, roomName]);

  // Function to send a reaction with retry logic
  const sendReaction = useCallback(
    async (reaction: string, sender: string) => {
      if (!websocket || !roomName) {
        console.error("WebSocket not available or room name not provided");
        return false;
      }

      // Create reaction data with metadata
      const reactionId = `${reaction}-${sender}-${Date.now()}-${Math.random()}`;
      const reactionData: ReactionData = {
        reaction,
        sender,
        timestamp: Date.now(),
        id: reactionId,
        roomName
      };

      // Check connection state
      if (!isConnected) {
        console.warn("WebSocket not connected, queueing reaction for retry");
        
        // Queue the reaction for sending when connected
        pendingReactions.current.set(reactionId, {
          data: reactionData,
          retryCount: 0
        });
        
        // Connection will be handled by singleton
        return true; // Optimistically return true as it will be retried
      }

      // Ensure we're in the room
      if (!joinedRoom.current && identity) {
        websocket.joinRoom(roomName, identity, publicKey?.toString());
        joinedRoom.current = true;
        
        // Wait a bit for join to process
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send the reaction
      sendReactionInternal(reactionData);
      
      return true;
    },
    [websocket, roomName, identity, sendReactionInternal, isConnected]
  );

  // Clear reactions on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setReactions([]);
      reactionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reactionTimeouts.current.clear();
      pendingReactions.current.forEach(pending => {
        if (pending.timeoutId) clearTimeout(pending.timeoutId);
      });
      pendingReactions.current.clear();
    };
  }, []);

  return { 
    reactions, 
    sendReaction,
    isConnected
  };
};