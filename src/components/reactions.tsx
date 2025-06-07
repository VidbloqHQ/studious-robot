import { useState, useEffect, useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useCallReactions } from "../hooks/index";

type ReactionProps = {
  showReactions: boolean;
};

interface AnimatedReaction {
  id: string;
  reaction: string;
  sender: string;
  position: number;
  opacity: number;
}

const Reactions = ({ showReactions }: ReactionProps) => {
  const { reactions, sendReaction } = useCallReactions();
  const p = useLocalParticipant();
  const [animatedReactions, setAnimatedReactions] = useState<
    AnimatedReaction[]
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const sender = p.localParticipant.identity;
  const processedReactionIds = useRef<Set<string>>(new Set());

  const getRandomPosition = (): number => {
    if (!containerRef.current) return Math.random() * 100;
    const containerWidth = containerRef.current.offsetWidth;
    return Math.random() * (containerWidth - 80);
  };

  // Handle incoming reactions and create animated versions
  useEffect(() => {
    if (reactions.length > 0) {
      const latestReaction = reactions[reactions.length - 1];

      // Create a unique ID for this reaction
      const reactionId = `${
        latestReaction.reaction
      }-${Date.now()}-${Math.random()}`;

      // Check if we've already processed this reaction to prevent duplicates
      if (processedReactionIds.current.has(reactionId)) {
        return;
      }

      processedReactionIds.current.add(reactionId);

      // Create an animated version of the reaction
      const animatedReaction: AnimatedReaction = {
        id: reactionId,
        reaction: latestReaction.reaction,
        sender: latestReaction.sender,
        position: getRandomPosition(),
        opacity: 1,
      };

      // Add to animated reactions
      setAnimatedReactions((prev) => [...prev, animatedReaction]);

      // Remove the animated reaction after animation completes
      setTimeout(() => {
        setAnimatedReactions((prev) =>
          prev.filter((r) => r.id !== animatedReaction.id)
        );

        // Keep the processed IDs set from growing too large by removing old entries
        if (processedReactionIds.current.size > 100) {
          processedReactionIds.current.delete(reactionId);
        }
      }, 4000); // Slightly longer than animation duration to ensure complete removal
    }
  }, [reactions]);

  // Handle sending a reaction
  const handleSendReaction = (emoji: string) => {
    sendReaction(emoji, sender);
  };

  // Available reactions
  const reactionEmojis = ["👍", "❤️", "🎉", "👏", "🔥", "😂", "🙌", "😮"];

  return (
    <>
      {/* Floating reactions container - increased height for more animation space */}
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 overflow-hidden h-[80vh] pointer-events-none"
        style={{ zIndex: 50 }} // Ensure reactions appear above other content
      >
        {animatedReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute"
            style={{
              left: `${reaction.position}px`,
              bottom: "80px", // Start above the controls
              opacity: reaction.opacity,
              transform: "translateY(0)",
              animation: "reaction-float 4s ease-out forwards", // Apply custom animation
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl reaction-scale-bounce">
                {reaction.reaction}
              </span>
              <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded-full mt-1">
                {sender === reaction.sender ? " (You)" : reaction.sender}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Reaction panel - only visible when activated */}
      {showReactions && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-full p-2 flex space-x-2 z-20">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              className="w-10 h-10 rounded-full hover:bg-gray-700 flex items-center justify-center text-xl transition-colors"
              onClick={() => handleSendReaction(emoji)}
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
