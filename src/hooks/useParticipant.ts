import { useState, useEffect, useRef, useCallback } from "react";
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
  batchDelay?: number; // New option for batching
}

export const useParticipantNotifications = (options: NotificationOptions = {}) => {
  const {
    showJoinNotifications = true,
    showLeaveNotifications = true,
    joinNotificationDuration = 4000,
    leaveNotificationDuration = 3000,
    batchDelay = 500, // Batch notifications within 500ms
  } = options;

  const { participants, userType } = useStreamContext();
  const { addNotification } = useNotification();

  // Refs for state tracking
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const lastParticipantIdsRef = useRef<Set<string>>(new Set());
  const isFirstRunRef = useRef(true);
  
  // Batching refs - now storing participant data
  const pendingJoinsRef = useRef<Map<string, Participant>>(new Map());
  const pendingLeavesRef = useRef<Map<string, Participant>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Process batched notifications
  const processBatchedNotifications = useCallback(() => {
    // Process joins
    if (pendingJoinsRef.current.size > 0 && showJoinNotifications) {
      const joinedParticipants = Array.from(pendingJoinsRef.current.values());
      
      if (joinedParticipants.length > 0) {
        let message: string;
        const joinedNames = joinedParticipants.map(p => 
          p.userName || `${p.walletAddress?.slice(0, 6)}...` || 'Anonymous'
        );
        
        if (joinedNames.length === 1) {
          const participant = joinedParticipants[0];
          message = userType === 'host'
            ? `${joinedNames[0]} joined the ${participant.userType === 'guest' ? 'audience' : 'call'}`
            : `${joinedNames[0]} joined`;
        } else if (joinedNames.length === 2) {
          message = `${joinedNames[0]} and ${joinedNames[1]} joined`;
        } else {
          message = `${joinedNames.slice(0, -1).join(', ')} and ${joinedNames[joinedNames.length - 1]} joined`;
        }

        addNotification({
          type: 'info',
          message,
          duration: joinNotificationDuration,
        });
      }
      
      pendingJoinsRef.current.clear();
    }

    // Process leaves
    if (pendingLeavesRef.current.size > 0 && showLeaveNotifications) {
      const leftParticipants = Array.from(pendingLeavesRef.current.values());
      
      if (leftParticipants.length > 0) {
        let message: string;
        const leftNames = leftParticipants.map(p => 
          p.userName || `${p.walletAddress?.slice(0, 6)}...` || 'User'
        );
        
        if (leftNames.length === 1) {
          const participant = leftParticipants[0];
          message = userType === 'host'
            ? `${leftNames[0]} left the ${participant.userType === 'guest' ? 'audience' : 'call'}`
            : `${leftNames[0]} left`;
        } else if (leftNames.length === 2) {
          message = `${leftNames[0]} and ${leftNames[1]} left`;
        } else {
          message = `${leftNames.slice(0, -1).join(', ')} and ${leftNames[leftNames.length - 1]} left`;
        }

        addNotification({
          type: 'info',
          message,
          duration: leaveNotificationDuration,
        });
      }
      
      pendingLeavesRef.current.clear();
    }

    batchTimerRef.current = null;
  }, [userType, showJoinNotifications, showLeaveNotifications, 
      joinNotificationDuration, leaveNotificationDuration, addNotification]);

  // Schedule batch processing
  const scheduleBatch = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    
    batchTimerRef.current = setTimeout(() => {
      processBatchedNotifications();
    }, batchDelay);
  }, [batchDelay, processBatchedNotifications]);

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
        if (participant) {
          pendingJoinsRef.current.set(id, participant);
          scheduleBatch();
        }
      }
    });

    // Detect removed participants (left)
    lastParticipantIdsRef.current.forEach(id => {
      if (!currentParticipantIds.has(id)) {
        // Get participant data from our stored map
        const participant = participantsMapRef.current.get(id);
        if (participant) {
          pendingLeavesRef.current.set(id, participant);
          scheduleBatch();
        }
      }
    });

    // Update refs for next comparison
    lastParticipantIdsRef.current = currentParticipantIds;
    participantsMapRef.current = newParticipantsMap;

  }, [participants, scheduleBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        // Process any pending notifications before cleanup
        processBatchedNotifications();
      }
    };
  }, [processBatchedNotifications]);

  return {
    participantCount: participants.length,
    isMonitoring: true
  };
};