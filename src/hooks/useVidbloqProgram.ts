import { useContext } from "react";
import { VidbloqProgramContext } from "../context/index";

/**
 * Custom hook for interacting with the Vidbloq program
 * This hook provides access to the VidbloqProgramContext
 */
export const useVidbloqProgram = () => {
  const context = useContext(VidbloqProgramContext);

  if (!context) {
    throw new Error(
      "useVidbloqProgram must be used within a VidbloqProgramProvider"
    );
  }

  return context;
};
