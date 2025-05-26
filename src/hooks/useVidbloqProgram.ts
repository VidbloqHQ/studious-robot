import { useContext } from "react";
import { VidbloqProgramContext } from "../context";

export const useVidbloqProgram = () => {
  const context = useContext(VidbloqProgramContext);
  if (!context) {
    throw new Error(
      "useVidbloqProgram must be used within VidbloqProgramProvider"
    );
  }
  return context;
};
