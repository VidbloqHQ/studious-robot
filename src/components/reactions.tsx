import React, { useState, useEffect, useRef } from "react";
import { useCallReactions } from "../hooks/useCallReactions";

type ReactionProps = {
  setShowReactions: (show: boolean) => void;
  showReactions: boolean;
}

interface AnimatedReaction {
  id: string;
  reaction: string;
  sender: string;
  position: number;
  opacity: number;
}

const Reactions: React.FC<ReactionProps> = ({ setShowReactions, showReactions }) => {
  const { reactions, sendReaction } = useCallReactions();
  const [animatedReactions, setAnimatedReactions] = useState<AnimatedReaction[]>([]);
  // const [showReactionPanel, setShowReactionPanel] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate a random horizontal position within the container width
  const getRandomPosition = (): number => {
    if (!containerRef.current) return Math.random() * 100;
    return Math.random() * (containerRef.current.offsetWidth - 50);
  };

  // Handle incoming reactions and create animated versions
  useEffect(() => {
    if (reactions.length > 0) {
      const latestReaction = reactions[reactions.length - 1];
      
      // Create an animated version of the reaction
      const animatedReaction: AnimatedReaction = {
        id: `${latestReaction.reaction}-${Date.now()}-${Math.random()}`,
        reaction: latestReaction.reaction,
        sender: latestReaction.sender,
        position: getRandomPosition(),
        opacity: 1
      };

      // Add to animated reactions
      setAnimatedReactions((prev) => [...prev, animatedReaction]);

      // Remove the animated reaction after animation completes
      setTimeout(() => {
        setAnimatedReactions((prev) => 
          prev.filter((r) => r.id !== animatedReaction.id)
        );
      }, 3000); // Match the duration of the CSS animation
    }
  }, [reactions]);

  // Handle sending a reaction
  const handleSendReaction = (emoji: string) => {
    const sender = localStorage.getItem("userName") || "Anonymous";
    sendReaction(emoji, sender);
    setShowReactions(false);
  };

  // Available reactions
  const reactionEmojis = ["👍", "❤️", "🎉", "👏", "🔥", "😂", "🙌", "😮"];

  return (
    <>
      {/* Floating reactions container */}
      <div 
        ref={containerRef}
        className={`absolute bottom-20 left-0 right-0 overflo h-[50vh] pointer-events-none`}
      >
        {animatedReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-float-up"
            style={{
              left: `${reaction.position}px`,
              fontSize: "2rem",
              animation: "floatUp 3s ease-out forwards",
              opacity: reaction.opacity,
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl">{reaction.reaction}</span>
              <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded-full mt-1">
                {reaction.sender}
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