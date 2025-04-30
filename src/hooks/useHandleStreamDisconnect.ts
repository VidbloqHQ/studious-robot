import { useEffect, useCallback } from "react";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

export const useHandleStreamDisconnect = (publicKey: string) => {
  const { roomName } = useStreamContext();
  const { apiClient } = useTenantContext()
  const leaveStream = useCallback(async () => {
    try {
      // Use apiClient.put with the correct request body
      await apiClient.put(`/participant/${roomName}`, {
        walletAddress: publicKey,
        liveStreamId: roomName,
        leftAt: new Date(),
      });
    } catch (error) {
      console.error(error);
    }
  }, [publicKey, roomName, apiClient]);

  useEffect(() => {
    const handlePageLeave = async (event: BeforeUnloadEvent | Event) => {
      if (event.type === "beforeunload") {
        event.preventDefault();
      }

      await leaveStream();
    };

    window.addEventListener("beforeunload", handlePageLeave);
    window.addEventListener("unload", handlePageLeave);
    window.addEventListener("load", handlePageLeave);

    return () => {
      window.removeEventListener("beforeunload", handlePageLeave);
      window.removeEventListener("unload", handlePageLeave);
      window.removeEventListener("load", handlePageLeave);
    };
  }, [leaveStream]);

  return { leaveStream };
};
