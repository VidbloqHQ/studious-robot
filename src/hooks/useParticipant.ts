import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Participant, SDKParticipant, EnhancedSDKParticipant, UserType } from "../types/index";
import { getParticipantMetadata } from "../utils/index";
import { useStreamContext } from "./useStreamContext";
import { useTenantContext } from "./useTenantContext";
import { useRequirePublicKey } from "./useRequirePublicKey";
import { useNotification } from "./useNotification";
import { useParticipantTrackStates } from "./useParticipantTrackStates";


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
  batchDelay?: number;
  groupingWindow?: number; // Extended window for grouping notifications
}

export const useParticipantNotifications = (options: NotificationOptions = {}) => {
  const {
    showJoinNotifications = true,
    showLeaveNotifications = true,
    joinNotificationDuration = 4000,
    leaveNotificationDuration = 3000,
    batchDelay = 500,
    groupingWindow = 3000, // Group notifications within 3 seconds
  } = options;

  const { participants, userType, token, isLoadingParticipants } = useStreamContext();
  const { addNotification } = useNotification();

  // Refs for state tracking
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const previousParticipantIdsRef = useRef<Set<string>>(new Set());
  const baselineParticipantsRef = useRef<Set<string> | null>(null);
  const hasBaselineRef = useRef(false);
  const hasSeenFirstLoadRef = useRef(false);
  
  // Batching refs
  const pendingJoinsRef = useRef<Map<string, Participant>>(new Map());
  const pendingLeavesRef = useRef<Map<string, Participant>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);
  const extendedBatchTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        
        lastNotificationTimeRef.current = Date.now();
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
        
        lastNotificationTimeRef.current = Date.now();
      }
      
      pendingLeavesRef.current.clear();
    }

    batchTimerRef.current = null;
    extendedBatchTimerRef.current = null;
  }, [userType, showJoinNotifications, showLeaveNotifications, 
      joinNotificationDuration, leaveNotificationDuration, addNotification]);

  // Schedule batch processing with extended grouping window
  const scheduleBatch = useCallback(() => {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTimeRef.current;
    
    // Clear existing timers
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    if (extendedBatchTimerRef.current) {
      clearTimeout(extendedBatchTimerRef.current);
      extendedBatchTimerRef.current = null;
    }
    
    // If we're within the grouping window of a recent notification, use extended batching
    if (timeSinceLastNotification < groupingWindow) {
      // Wait for the full grouping window to expire before showing notification
      const remainingTime = groupingWindow - timeSinceLastNotification;
      extendedBatchTimerRef.current = setTimeout(() => {
        processBatchedNotifications();
      }, Math.max(remainingTime, batchDelay));
    } else {
      // Otherwise use normal batch delay
      batchTimerRef.current = setTimeout(() => {
        processBatchedNotifications();
      }, batchDelay);
    }
  }, [batchDelay, groupingWindow, processBatchedNotifications]);

  // Establish baseline after first successful load
  useEffect(() => {
    // Wait for token and first load to complete
    if (!isLoadingParticipants && !hasSeenFirstLoadRef.current && token) {
      hasSeenFirstLoadRef.current = true;
    }
    
    if (!hasBaselineRef.current && token && !isLoadingParticipants && hasSeenFirstLoadRef.current) {
      
      // Create baseline with current participants
      const baseline = new Set<string>();
      participants.forEach(p => {
        baseline.add(p.id);
        // Store participant data for future reference
        participantsMapRef.current.set(p.id, p);
        // Also add to previous participants so we don't notify for these
        previousParticipantIdsRef.current.add(p.id);
      });
      
      baselineParticipantsRef.current = baseline;
      hasBaselineRef.current = true;
    }
  }, [token, participants, isLoadingParticipants]);

  // Monitor participant changes after baseline is established
  useEffect(() => {
    // Don't process until we have a baseline
    if (!hasBaselineRef.current || !baselineParticipantsRef.current) {
      return;
    }

    const currentParticipantIds = new Set<string>();
    const currentParticipantsMap = new Map<string, Participant>();
    
    participants.forEach(p => {
      currentParticipantIds.add(p.id);
      currentParticipantsMap.set(p.id, p);
      // Always update our stored participant data
      participantsMapRef.current.set(p.id, p);
    });

    // Detect new participants (joined)
    currentParticipantIds.forEach(id => {
      const isInPrevious = previousParticipantIdsRef.current.has(id);
      const isInBaseline = baselineParticipantsRef.current!.has(id);
      
      // Only notify if:
      // 1. Not in previous state (just appeared)
      // 2. Not in baseline (joined after us)
      if (!isInPrevious && !isInBaseline) {
        const participant = currentParticipantsMap.get(id);
        if (participant) {
          pendingJoinsRef.current.set(id, participant);
          scheduleBatch();
        }
      }
    });

    // Detect removed participants (left)
    previousParticipantIdsRef.current.forEach(id => {
      if (!currentParticipantIds.has(id)) {
        // Get participant info from our stored map (they were there before leaving)
        const participant = participantsMapRef.current.get(id);
        if (participant) {
          pendingLeavesRef.current.set(id, participant);
          scheduleBatch();
        }
      }
    });

    // Update previous state for next comparison
    previousParticipantIdsRef.current = currentParticipantIds;

  }, [participants, scheduleBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      if (extendedBatchTimerRef.current) {
        clearTimeout(extendedBatchTimerRef.current);
      }
      // Process any pending notifications before cleanup
      processBatchedNotifications();
      
      // Reset refs on unmount
      hasBaselineRef.current = false;
      baselineParticipantsRef.current = null;
      hasSeenFirstLoadRef.current = false;
      previousParticipantIdsRef.current.clear();
      participantsMapRef.current.clear();
    };
  }, [processBatchedNotifications]);

  return {
    participantCount: participants.length,
    isMonitoring: hasBaselineRef.current
  };
};

interface UseParticipantControlsOptions {
  participant: SDKParticipant | EnhancedSDKParticipant;
  isLocal?: boolean;
  isMicrophoneEnabled?: boolean;
  isCameraEnabled?: boolean;
}

interface UseParticipantControlsReturn {
  // States
  isDemoting: boolean;
  isPromoting: boolean;
  
  // Track states
  micEnabled: boolean;
  cameraEnabled: boolean;
  hasLivekitReference: boolean;
  
  // Permissions
  canGift: boolean;
  canDemote: boolean;
  canPromote: boolean;
  
  // Actions
  prepareGiftRecipient: () => Participant | null;
  demoteParticipant: () => Promise<{ success: boolean; error?: string }>;
  promoteParticipant: () => Promise<{ success: boolean; error?: string }>;
  
  // Participant data
  participantMetadata: {
    userName: string;
    avatarUrl: string;
    userType: string;
    walletAddress: string;
  };
}

export const useParticipantControls = ({
  participant,
  isLocal = false,
  isMicrophoneEnabled = false,
  isCameraEnabled = false,
}: UseParticipantControlsOptions): UseParticipantControlsReturn => {
  const [isDemoting, setIsDemoting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Get required hooks
  const { participants } = useParticipantList();
  const { userType, roomName, streamMetadata, websocket } = useStreamContext();
  const { apiClient, isConnected } = useTenantContext();
  const { publicKey } = useRequirePublicKey();

  // Track real-time states
  const trackStates = useParticipantTrackStates(participant, isLocal);

  // Use track states from hook if available, otherwise fall back to props
  const micEnabled = trackStates.hasLivekitReference 
    ? trackStates.micEnabled 
    : isMicrophoneEnabled;
    
  const cameraEnabled = trackStates.hasLivekitReference 
    ? trackStates.cameraEnabled 
    : isCameraEnabled;

  // Get participant metadata - ensure walletAddress is always a string
  const metadata = getParticipantMetadata(participant);
  const participantMetadata = useMemo(() => ({
    userName: metadata.userName || participant.identity,
    avatarUrl: metadata.avatarUrl || "",
    userType: metadata.userType || "guest",
    walletAddress: typeof metadata.walletAddress === 'string' ? metadata.walletAddress : "",
  }), [metadata.userName, metadata.avatarUrl, metadata.userType, metadata.walletAddress, participant.identity]);

  // Determine permissions
  const canGift = !isLocal;
  
  const canDemote = !isLocal && 
    userType === "host" && 
    participantMetadata.userType === "temp-host" &&
    streamMetadata?.streamSessionType === "livestream";
    
  const canPromote = !isLocal && 
    userType === "host" && 
    participantMetadata.userType === "guest" &&
    (streamMetadata?.streamSessionType === "livestream" || 
     streamMetadata?.streamSessionType === "meeting");

  // Prepare gift recipient data
  const prepareGiftRecipient = useCallback((): Participant | null => {
    // Only proceed if we have a valid wallet address
    if (participantMetadata.walletAddress) {
      return {
        id: participant.identity,
        userName: participantMetadata.userName,
        walletAddress: participantMetadata.walletAddress,
        userType: participantMetadata.userType as UserType,
        avatarUrl: participantMetadata.avatarUrl,
      } as Participant;
    }

    // Fallback: Look up from participant list
    const fullParticipant = participants.find(
      (p) => p.id === participant.identity || p.userName === participant.identity
    );

    if (fullParticipant?.walletAddress) {
      return fullParticipant;
    }

    return null;
  }, [participant, participantMetadata, participants]);

  // Promote participant (from guest to temp-host/co-host)
  const promoteParticipant = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!publicKey) {
      return {
        success: false,
        error: "Public key not available"
      };
    }

    if (!participantMetadata.walletAddress) {
      return {
        success: false,
        error: "Participant wallet address not found"
      };
    }

    if (!websocket || !isConnected) {
      return {
        success: false,
        error: "WebSocket not connected"
      };
    }

    setIsPromoting(true);

    try {
      // Call the API to update permissions
      await apiClient.post("/participant/update/permission", {
        participantId: participant.identity,
        streamId: roomName,
        wallet: publicKey.toString(),
        participantWallet: participantMetadata.walletAddress,
        action: "promote"
      });

      // Send WebSocket message to notify the participant
      websocket.inviteGuest(roomName, participant.identity);

      setIsPromoting(false);
      return { 
        success: true,
        error: undefined 
      };
    } catch (error) {
      console.error("Error promoting participant:", error);
      setIsPromoting(false);
      return { 
        success: false, 
        error: "Failed to promote participant" 
      };
    }
  }, [participant, participantMetadata, publicKey, roomName, apiClient, websocket]);

  // Demote participant (from temp-host back to guest)
  const demoteParticipant = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!publicKey) {
      return {
        success: false,
        error: "Public key not available"
      };
    }

    if (!participantMetadata.walletAddress) {
      return {
        success: false,
        error: "Participant wallet address not found"
      };
    }

    setIsDemoting(true);

    try {
      await apiClient.post("/participant/update/permission", {
        participantId: participant.identity,
        streamId: roomName,
        wallet: publicKey.toString(),
        participantWallet: participantMetadata.walletAddress,
        action: "demote"
      });

      setIsDemoting(false);
      return { 
        success: true,
        error: undefined 
      };
    } catch (error) {
      console.error("Error demoting participant:", error);
      setIsDemoting(false);
      return { 
        success: false, 
        error: "Failed to demote participant" 
      };
    }
  }, [participant, participantMetadata, publicKey, roomName, apiClient]);

  return {
    // States
    isDemoting,
    isPromoting,
    
    // Track states
    micEnabled,
    cameraEnabled,
    hasLivekitReference: trackStates.hasLivekitReference,
    
    // Permissions
    canGift,
    canDemote,
    canPromote,
    
    // Actions
    prepareGiftRecipient,
    demoteParticipant,
    promoteParticipant,
    
    // Participant data
    participantMetadata,
  };
};

interface UseParticipantDataOptions {
  participant: SDKParticipant | EnhancedSDKParticipant;
}

interface UseParticipantDataReturn {
  identity: string;
  sid: string;
  userName: string;
  avatarUrl: string;
  userType: string;
  initials: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

export const useParticipantData = ({
  participant,
}: UseParticipantDataOptions): UseParticipantDataReturn => {
  // Get participant metadata
  const metadata = getParticipantMetadata(participant);
  
  const userName = metadata.userName || participant.identity;
  const avatarUrl = metadata.avatarUrl || "";
  
  // Generate initials from username
  const initials = userName
    .split(" ")
    .map((name: string) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    identity: participant.identity,
    sid: participant.sid,
    userName,
    avatarUrl,
    userType: metadata.userType || "guest",
    initials,
    metadata, // Expose raw metadata for custom use cases
  };
};