import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useCallReactions, useStreamContext } from "../hooks/index";

type ReactionProps = {
  showReactions: boolean;
};

interface AnimatedReaction {
  id: string;
  reaction: string;
  sender: string;
  position: number;
  opacity: number;
  timestamp: number;
}

interface ReactionData {
  reaction: string;
  sender: string;
  timestamp?: number;
  id?: string;
}

const Reactions = ({ showReactions }: ReactionProps) => {
  const { reactions, sendReaction, isConnected } = useCallReactions();
  const p = useLocalParticipant();
  const [animatedReactions, setAnimatedReactions] = useState<AnimatedReaction[]>([]);
  const { nickname } = useStreamContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const sender = nickname || p.localParticipant.identity;
  const processedReactionIds = useRef<Set<string>>(new Set());
  
  // Available reactions
  const reactionEmojis = ["👍", "❤️", "🎉", "👏", "🔥", "😂", "🙌", "😮"];

  // Debug mode - set to true to see connection status
  const DEBUG_MODE = false;

  const getRandomPosition = (): number => {
    if (!containerRef.current) {
      // Default safe position if container not ready
      return window.innerWidth / 2 - 40;
    }
    
    const containerWidth = containerRef.current.offsetWidth;
    const reactionWidth = 80; // Approximate width of reaction element
    const margin = 20; // Safety margin from edges
    
    // Ensure position is within visible bounds
    const minPosition = margin;
    const maxPosition = containerWidth - reactionWidth - margin;
    
    // Clamp the random position within bounds
    const randomPosition = minPosition + Math.random() * (maxPosition - minPosition);
    
    // Extra safety check
    return Math.max(minPosition, Math.min(randomPosition, maxPosition));
  };

  // Track the last processed reaction to handle only new ones
  const lastReactionRef = useRef<string | null>(null);

  // Handle incoming reactions and create animated versions
  useEffect(() => {
    if (reactions.length === 0) return;

    // Get only the latest reaction
    const latestReaction = reactions[reactions.length - 1] as ReactionData;
    
    // Create a consistent ID for the reaction
    const reactionId = latestReaction.id || 
      `${latestReaction.reaction}-${latestReaction.sender}-${latestReaction.timestamp || Date.now()}`;

    // Skip if this is the same as the last processed reaction
    if (lastReactionRef.current === reactionId) {
      return;
    }

    // Skip if we've already processed this reaction
    if (processedReactionIds.current.has(reactionId)) {
      return;
    }

    // Update last processed reaction
    lastReactionRef.current = reactionId;

    // Mark as processed
    processedReactionIds.current.add(reactionId);

    // Create animated reaction
    const animatedReaction: AnimatedReaction = {
      id: reactionId,
      reaction: latestReaction.reaction,
      sender: latestReaction.sender,
      position: getRandomPosition(),
      opacity: 1,
      timestamp: latestReaction.timestamp || Date.now(),
    };

    // Add to animated reactions
    setAnimatedReactions((prev) => [...prev, animatedReaction]);

    // Remove after animation
    const timeoutId = setTimeout(() => {
      setAnimatedReactions((prev) =>
        prev.filter((r) => r.id !== reactionId)
      );
      
      // Clean up processed IDs after a delay
      setTimeout(() => {
        processedReactionIds.current.delete(reactionId);
      }, 1000);
    }, 4000);

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [reactions]);

  // Track last click time to prevent rapid clicks
  const lastClickTime = useRef<number>(0);

  // Handle sending a reaction (without optimistic updates to avoid duplicates)
  const handleSendReaction = useCallback((emoji: string) => {
    const now = Date.now();
    
    // Prevent rapid clicks (debounce)
    if (now - lastClickTime.current < 300) {
      return;
    }
    
    lastClickTime.current = now;
    
    sendReaction(emoji, sender);
  }, [sender, sendReaction]);

  // Clean up old reactions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAnimatedReactions(prev => 
        prev.filter(r => now - r.timestamp < 5000)
      );
      
      // Clean up old processed IDs
      if (processedReactionIds.current.size > 100) {
        processedReactionIds.current.clear();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      processedReactionIds.current.clear();
      setAnimatedReactions([]);
      lastReactionRef.current = null;
      lastClickTime.current = 0;
    };
  }, []);

  return (
    <>
      {/* Debug info - only visible when DEBUG_MODE is true */}
      {DEBUG_MODE && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          <div>WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
          <div>Identity: {sender || 'Unknown'}</div>
          <div>Reactions in queue: {reactions.length}</div>
          <div>Animated reactions: {animatedReactions.length}</div>
        </div>
      )}
      
      {/* Floating reactions container */}
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
        style={{ 
          height: "calc(100vh - 200px)", // Leave space for controls
          maxHeight: "600px", // Reasonable max height
          zIndex: 50 
        }}
      >
        {animatedReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute reaction-wrapper"
            style={{
              left: `${reaction.position}px`,
              bottom: "20px", // Start position
              opacity: reaction.opacity,
              transform: "translateY(0)",
              animation: "reaction-float 4s ease-out forwards",
              willChange: "transform, opacity",
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl reaction-emoji" style={{ animation: "scale-bounce 0.5s ease-out" }}>
                {reaction.reaction}
              </span>
              <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded-full mt-1 whitespace-nowrap">
                {sender === reaction.sender ? "You" : reaction.sender}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Reaction panel - only visible when activated */}
      {showReactions && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-full p-2 flex space-x-2 z-20 shadow-lg">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              className="w-10 h-10 rounded-full hover:bg-gray-700 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
              onClick={() => handleSendReaction(emoji)}
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default Reactions;