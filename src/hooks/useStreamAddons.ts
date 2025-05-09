import { useState, useEffect } from "react";
import { AddonType, AddonState, ActiveAddons } from "../types/index"
import { useStreamContext } from "./useStreamContext";


// Type guard to validate addon types
function isValidAddonType(type: string): type is AddonType {
  return ['Custom', 'Q&A', 'Poll', 'Quiz'].includes(type);
}

export const useStreamAddons = () => {
  const { websocket } = useStreamContext();
  
  const [activeAddons, setActiveAddons] = useState<ActiveAddons>({
    Custom: { type: "Custom", isActive: false },
    "Q&A": { type: "Q&A", isActive: false },
    Poll: { type: "Poll", isActive: false },
    Quiz: { type: "Quiz", isActive: false }, // Added Quiz addon
  });

  useEffect(() => {
    if (!websocket || !websocket.isConnected) return;

    // Handle initial addon state
    const handleAddonState = (addons: ActiveAddons) => {
      setActiveAddons(addons);
    };

    // Handle addon state updates
    const handleAddonStateUpdate = (update: AddonState) => {
      // Ensure the update has the correct type before updating the state
      if (isValidAddonType(update.type)) {
        setActiveAddons((prev) => ({
          ...prev,
          [update.type]: update,
        }));
      }
    };

    // Add event listeners
    websocket.addEventListener("addonState", handleAddonState);
    websocket.addEventListener("addonStateUpdate", handleAddonStateUpdate);

    // Clean up event listeners when component unmounts
    return () => {
      websocket.removeEventListener("addonState", handleAddonState);
      websocket.removeEventListener("addonStateUpdate", handleAddonStateUpdate);
    };
  }, [websocket]);

  // Functions to control addons
  const startAddon = <T>(type: AddonType, data?: T) => {
    if (websocket && websocket.isConnected) {
      websocket.startAddon(type, data);
    }
  };

  const stopAddon = (type: AddonType) => {
    if (websocket && websocket.isConnected) {
      websocket.stopAddon(type);
    }
  };

  // Quiz-specific functions
  // const startQuiz = <T>(roomName: string, quiz: T) => {
  //   if (websocket && websocket.isConnected) {
  //     websocket.sendMessage('startQuiz', { roomName, quiz });
  //     startAddon('Quiz', quiz);
  //   }
  // };

  // const endQuiz = <T>(roomName: string, results: T) => {
  //   if (websocket && websocket.isConnected) {
  //     websocket.sendMessage('endQuiz', { roomName, results });
  //     stopAddon('Quiz');
  //   }
  // };

  // const submitQuizAnswer = (roomName: string, questionId: string, participantId: string, answer: string) => {
  //   if (websocket && websocket.isConnected) {
  //     websocket.sendMessage('submitQuizAnswer', {
  //       roomName,
  //       questionId,
  //       participantId,
  //       answer
  //     });
  //   }
  // };

  return { 
    activeAddons, 
    startAddon,
    stopAddon,
    // startQuiz,
    // endQuiz,
    // submitQuizAnswer
  };
};