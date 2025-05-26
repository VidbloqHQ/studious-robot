import { useState, useEffect, useCallback } from "react";
import { useStreamContext } from "./useStreamContext";

interface ReactionData {
  reaction: string;
  sender: string;
}

interface UseCallReactionsProps {
  roomName?: string;
}

export const useCallReactions = (props?: UseCallReactionsProps) => {
  const { websocket, roomName: contextRoomName } = useStreamContext();
  const roomName = props?.roomName || contextRoomName;
  
  const [reactions, setReactions] = useState<ReactionData[]>([]);

  // Set up WebSocket event listeners for reactions
  useEffect(() => {
    if (!websocket || !roomName) return;

    // Handle incoming reactions
    const handleReceiveReaction = (reactionData: ReactionData) => {
      // Add the new reaction to the array
      setReactions((prev) => [...prev, reactionData]);

      // Remove the reaction after a timeout (matching animation duration)
      setTimeout(() => {
        setReactions((prev) => 
          prev.filter((r) => 
            r.reaction !== reactionData.reaction || 
            r.sender !== reactionData.sender
          )
        );
      }, 3000);
    };

    // Add event listener for receiving reactions
    websocket.addEventListener("receiveReaction", handleReceiveReaction);

    // Clean up event listener on unmount
    return () => {
      websocket.removeEventListener("receiveReaction", handleReceiveReaction);
    };
  }, [websocket, roomName]);

  // Function to send a reaction
  const sendReaction = useCallback(
    (reaction: string, sender: string) => {
      if (!websocket || !websocket.isConnected || !roomName) {
        console.error("WebSocket not connected or room name not provided");
        return;
      }

      // Using the sendReaction method from useWebSocket hook
      websocket.sendReaction(roomName, reaction, sender);
    },
    [websocket, roomName]
  );

  return { reactions, sendReaction };
};