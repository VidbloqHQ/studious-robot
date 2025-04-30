import { useContext } from "react";
import { StreamContext } from "../context";

export const useStreamContext = () => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};
