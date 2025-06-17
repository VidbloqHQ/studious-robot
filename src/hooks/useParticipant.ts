import { useState, useEffect, useRef } from "react";
import { Participant } from "../types/index";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";
import { useNotification } from "./useNotification";


export const useParticipantList = () => {
  const context = useStreamContext();
  
  if (!context) {
    throw new Error("useParticipantList must be used within StreamProvider");
  }

  return {
    participants: context.participants,
    count: context.participantCount,
    isLoading: context.isLoadingParticipants,
    error: null, // For backward compatibility
    refreshParticipants: context.refreshParticipants,
  };
};

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

interface NotificationOptions {
  showJoinNotifications?: boolean;
  showLeaveNotifications?: boolean;
  joinNotificationDuration?: number;
  leaveNotificationDuration?: number;
}

export const useParticipantNotifications = (options: NotificationOptions = {}) => {
  const {
    showJoinNotifications = true,
    showLeaveNotifications = true,
    joinNotificationDuration = 4000,
    leaveNotificationDuration = 3000,
  } = options;

  const { participants, userType } = useStreamContext();
  const { addNotification } = useNotification();

  // Refs for state tracking
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const lastParticipantIdsRef = useRef<Set<string>>(new Set());
  const isFirstRunRef = useRef(true);


  // Update participants map and detect changes
  useEffect(() => {
    const currentParticipantIds = new Set<string>();
    const newParticipantsMap = new Map<string, Participant>();
    
    participants.forEach(p => {
      currentParticipantIds.add(p.id);
      newParticipantsMap.set(p.id, p);
    });

    // Skip notifications on first run (initial load)
    if (isFirstRunRef.current) {
      lastParticipantIdsRef.current = currentParticipantIds;
      participantsMapRef.current = newParticipantsMap;
      isFirstRunRef.current = false;
      return;
    }

    // Detect new participants (joined)
    currentParticipantIds.forEach(id => {
      if (!lastParticipantIdsRef.current.has(id)) {
        const participant = newParticipantsMap.get(id);
        
        if (participant && showJoinNotifications) {
          const displayName = participant.userName || 
            `${participant.walletAddress?.slice(0, 6)}...` || 
            'Anonymous';

          const message = userType === 'host'
            ? `${displayName} joined the ${participant.userType === 'guest' ? 'audience' : 'call'}`
            : `${displayName} joined`;
          
          // Add a small delay to ensure the UI is ready
          setTimeout(() => {
            addNotification({
              type: 'info',
              message,
              duration: joinNotificationDuration,
            });
          }, 100);
        }
      }
    });

    // Detect removed participants (left)
    lastParticipantIdsRef.current.forEach(id => {
      if (!currentParticipantIds.has(id)) {
        const participant = participantsMapRef.current.get(id);
        
        if (showLeaveNotifications) {
          const displayName = participant?.userName || 
            `${participant?.walletAddress?.slice(0, 6)}...` || 
            'User';

          const message = userType === 'host'
            ? `${displayName} left the ${participant?.userType === 'guest' ? 'audience' : 'call'}`
            : `${displayName} left`;

          // Add a small delay to ensure the UI is ready
          setTimeout(() => {
            addNotification({
              type: 'info',
              message,
              duration: leaveNotificationDuration,
            });
          }, 100);
        }
      }
    });

    // Update refs for next comparison
    lastParticipantIdsRef.current = currentParticipantIds;
    participantsMapRef.current = newParticipantsMap;

  }, [participants, userType, showJoinNotifications, showLeaveNotifications, 
      joinNotificationDuration, leaveNotificationDuration, addNotification]);

  return {
    participantCount: participants.length,
    isMonitoring: true
  };
};