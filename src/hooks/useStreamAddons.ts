import { useState, useEffect } from "react";
import { AddonType, AddonState, ActiveAddons } from "../types/index";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

// Type guard to validate addon types
function isValidAddonType(type: string): type is AddonType {
  return ['Custom', 'Q&A', 'Poll', 'Quiz'].includes(type);
}

export const useStreamAddons = () => {
  const { websocket } = useStreamContext();
  const { isConnected } = useTenantContext();
  
  const [activeAddons, setActiveAddons] = useState<ActiveAddons>({
    Custom: { type: "Custom", isActive: false },
    "Q&A": { type: "Q&A", isActive: false },
    Poll: { type: "Poll", isActive: false },
    Quiz: { type: "Quiz", isActive: false },
  });

  useEffect(() => {
    if (!websocket) return;

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
    if (websocket && isConnected) {
      websocket.startAddon(type, data);
    }
  };

  const stopAddon = (type: AddonType) => {
    if (websocket && isConnected) {
      websocket.stopAddon(type);
    }
  };

  return { 
    activeAddons, 
    startAddon,
    stopAddon,
  };
};