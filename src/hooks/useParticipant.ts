import { useState, useEffect, useCallback } from "react";
import { Participant } from "../types/index";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

interface UseParticipantListReturn {
  participants: Participant[];
  count: number;
  isLoading: boolean;
  error: string | null;
}

export const useParticipantList = (): UseParticipantListReturn => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { websocket, identity, roomName } = useStreamContext();
  const { apiClient } = useTenantContext()

  const fetchParticipants = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use apiClient.get with the correct response type
      const data = await apiClient.get<{ participants: Participant[] }>(`/participant/${roomName}`);
      
      const activeParticipants = data.participants.filter(
        (participant) => !participant.leftAt
      );
      
      setParticipants(activeParticipants);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, [roomName, apiClient]); 

  // Automatically refetch participants every 30 seconds
  useEffect(() => {
    fetchParticipants();

    const interval = setInterval(fetchParticipants, 30000); // Refetch every 30 seconds
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  // Handle WebSocket events
  useEffect(() => {
    if (!websocket || !identity || !websocket.isConnected) return;

    // Join the room when the component mounts
    websocket.joinRoom(roomName, identity);

    // Handle participant joined event
    const handleParticipantJoined = (data: { participantId: string }) => {
      console.log("participantJoined event:", data);
      fetchParticipants(); // Refetch to ensure the list is up-to-date
    };

    // Handle participant left event
    const handleParticipantLeft = (data: { participantId: string }) => {
      console.log("participantLeft event:", data.participantId);
      setParticipants((prev) =>
        prev.filter((participant) => participant.id !== data.participantId)
      );
      fetchParticipants(); // Refetch to ensure the list is up-to-date
    };

    // Add event listeners
    websocket.addEventListener("participantJoined", handleParticipantJoined);
    websocket.addEventListener("participantLeft", handleParticipantLeft);

    // Clean up event listeners when component unmounts
    return () => {
      websocket.removeEventListener("participantJoined", handleParticipantJoined);
      websocket.removeEventListener("participantLeft", handleParticipantLeft);
    };
  }, [websocket, roomName, identity, fetchParticipants]);

  // Handle participant leaving (e.g., when the component unmounts or the user leaves)
  useEffect(() => {
    if (!websocket || !identity) return;

    const handleBeforeUnload = () => {
      // Notify server that participant is leaving
      websocket.sendMessage("participantLeft", { participantId: identity, roomName });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      websocket.sendMessage("participantLeft", { participantId: identity, roomName });
    };
  }, [websocket, roomName, identity]);

  return {
    participants,
    count: participants.length,
    isLoading,
    error,
  };
};