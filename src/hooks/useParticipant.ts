import { useState, useEffect, useCallback, useRef } from "react";
import { Participant } from "../types/index";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";

/**
 * Debounce function to limit the frequency of function calls
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export const useParticipantList = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastUpdatedRef = useRef(Date.now());
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);
  const roomJoinedRef = useRef(false);
  
  const { websocket, identity, roomName } = useStreamContext();
  const { apiClient } = useTenantContext();

  /**
   * Fetch participants from the API
   */
  const fetchParticipants = useCallback(async () => {
    // Guard against concurrent fetches and infinite loops
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      setIsLoading(true);
      const data = await apiClient.get<{ participants: Participant[] }>(
        `/participant/${roomName}`
      );
  
      // Strictly filter participants to only include those with no leftAt time
      const activeParticipants = data.participants.filter(
        (participant) => participant.leftAt === null
      );
  
      console.log(`Fetched ${data.participants.length} participants, ${activeParticipants.length} active`);
      
      // Set active participants state
      setParticipants(activeParticipants);
      lastUpdatedRef.current = Date.now();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [roomName, apiClient]);

  // Join room once when component mounts and websocket is connected
  useEffect(() => {
    if (!websocket || !identity || !websocket.isConnected || roomJoinedRef.current) return;
    
    console.log(`Joining room ${roomName} with identity ${identity} from useParticipantList`);
    websocket.joinRoom(roomName, identity);
    roomJoinedRef.current = true;
    
    return () => {
      roomJoinedRef.current = false;
    };
  }, [websocket, roomName, identity, websocket?.isConnected]);

  // Handle WebSocket events
  useEffect(() => {
    if (!websocket || !identity || !websocket.isConnected) return;

    // Define event handlers
    const handleParticipantJoined = debounce(() => {
      console.log("Participant joined event received");
      
      // Add debounce to prevent rapid refetches
      if (Date.now() - lastUpdatedRef.current > 5000) { // Increased debounce time
        fetchParticipants();
      }
    }, 1000); // 1 second debounce

    // Handle participant left event - update state directly
    const handleParticipantLeft = (data: { participantId: string }) => {
      console.log("Participant left event received:", data.participantId);
      
      setParticipants((prev) =>
        prev.filter((participant) => participant.id !== data.participantId)
      );
      
      // Update timestamp to avoid triggering an immediate refetch
      lastUpdatedRef.current = Date.now();
    };

    // Add event listeners
    websocket.addEventListener("participantJoined", handleParticipantJoined);
    websocket.addEventListener("participantLeft", handleParticipantLeft);

    // Clean up event listeners when component unmounts
    return () => {
      websocket.removeEventListener(
        "participantJoined",
        handleParticipantJoined
      );
      websocket.removeEventListener("participantLeft", handleParticipantLeft);
    };
  }, [websocket, roomName, identity, fetchParticipants]);

  // Initial fetch and periodic refresh with exponential backoff
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Initial fetch when component mounts
    fetchParticipants();
    
    // Less frequent polling as a fallback - increased to 2 minutes to reduce load
    const interval = setInterval(() => {
      // Only fetch if it's been a while since the last update
      if (Date.now() - lastUpdatedRef.current > 120000) { // 2 minutes
        fetchParticipants();
      }
    }, 120000);
    
    return () => {
      clearInterval(interval);
      initializedRef.current = false;
    };
  }, [fetchParticipants]);

  // Reconnection handler
  useEffect(() => {
    const handleReconnect = () => {
      console.log("WebSocket reconnected - refreshing participants");
      
      // Wait for WebSocket to stabilize before fetching
      setTimeout(() => {
        fetchParticipants();
      }, 2000);
    };
    
    window.addEventListener("connect", handleReconnect);
    
    return () => {
      window.removeEventListener("connect", handleReconnect);
    };
  }, [fetchParticipants]);

  return {
    participants,
    count: participants.length,
    isLoading,
    error,
    refreshParticipants: fetchParticipants,
  };
};

// Other exports from the original file...
export const useDownloadParticipants = () => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { roomName } = useStreamContext();
  const { apiClient } = useTenantContext();

  const downloadParticipants = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const participants = await apiClient.get<{ participants: Participant[] }>(
        `/participant/${roomName}`
      );

      // Ensure participants is an array
      const participantsArray = Array.isArray(participants)
        ? participants
        : participants.participants || [];

      // Verify we have data
      if (participantsArray.length === 0) {
        throw new Error("No participants found");
      }

      const csvContent = convertToCSV(participantsArray);

      // Use more robust download method
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `participants_${roomName}.csv`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const convertToCSV = (data: Participant[]) => {
    if (data.length === 0) return "";

    // Get all unique keys from all objects
    const headers = Array.from(
      new Set(data.flatMap((obj) => Object.keys(obj)))
    );

    // Create CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...data.map((obj) =>
        headers
          .map(
            (header) =>
              `"${String(obj[header as keyof Participant] ?? "").replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  return { downloadParticipants, isDownloading, error };
};