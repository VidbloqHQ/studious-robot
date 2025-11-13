/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTracks, useRoomContext } from "@livekit/components-react";
import { Track, RoomEvent, Participant, Room } from "livekit-client";
import { checkParticipantMicEnabled } from "../utils/index";
import { 
  EnhancedSDKTrackReference,
  SDKTrackSource,
  EnhancedSDKParticipant,
  ParticipantSortStrategy,
} from "../types";
import { mapTrackReferenceEnhanced, mapToEnhancedParticipant } from "../utils/participant-bridge";

interface SortOptions {
  strategy?: ParticipantSortStrategy;
  customSortFunction?: (participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[];
  includeRoles?: string[];
  excludeRoles?: string[];
  maxCount?: number;
  prioritizeLocalParticipant?: boolean;
  prioritizeActiveSpeakers?: boolean;
  prioritizePinnedParticipants?: boolean; // New option
}

interface SortContext {
  activeSpeakers: Set<string>;
  recentSpeakers: Map<string, number>;
  micStates: Map<string, boolean>;
  localParticipantIdentity?: string;
  participantRoles: Map<string, string>;
  currentActiveSpeaker?: string;
  pinnedParticipants: Set<string>; // New field for pinned participants
}

export interface ParticipantEvent {
  participant: EnhancedSDKParticipant;
  timestamp: number;
}

export interface PinEvent {
  participantIdentity: string;
  isPinned: boolean;
  isGlobal: boolean;
  timestamp: number;
}

export interface UseStreamRoomOptions {
  defaultSortStrategy?: ParticipantSortStrategy;
  speakerHistoryDuration?: number;
  enableSpeakerEvents?: boolean;
  autoPromoteActiveSpeakers?: boolean;
  enablePinning?: boolean; // New option
}

export interface UseStreamRoomReturn {
  // Room reference
  room: any;
  
  // Track collections
  tracks: {
    all: EnhancedSDKTrackReference[];
    camera: EnhancedSDKTrackReference[];
    microphone: EnhancedSDKTrackReference[];
    screenShare: EnhancedSDKTrackReference | null;
    screenShareAudio: EnhancedSDKTrackReference | null;
  };
  
  // Participant collections
  participants: {
    all: EnhancedSDKParticipant[];
    local: EnhancedSDKParticipant | null;
    remote: EnhancedSDKParticipant[];
    host: EnhancedSDKParticipant | null;
    coHosts: EnhancedSDKParticipant[];
    guests: EnhancedSDKParticipant[];
    speaking: Set<string>;
    recentSpeakers: Map<string, number>;
    currentActiveSpeaker: string | undefined;
    pinned: Set<string>; // New: locally pinned participants
    globallyPinned: Set<string>; // New: globally pinned participants (by host)
  };
  
  // Utility functions
  getSortedParticipants: (options?: SortOptions) => EnhancedSDKParticipant[];
  getParticipantTracks: (participantIdentity: string) => EnhancedSDKTrackReference[];
  getParticipantRole: (participantIdentity: string) => string;
  isParticipantSpeaking: (participantIdentity: string) => boolean;
  
  // Pinning functions
  pinParticipant: (participantIdentity: string, isGlobal?: boolean) => void;
  unpinParticipant: (participantIdentity: string, isGlobal?: boolean) => void;
  togglePinParticipant: (participantIdentity: string, isGlobal?: boolean) => void;
  isParticipantPinned: (participantIdentity: string) => boolean;
  isParticipantGloballyPinned: (participantIdentity: string) => boolean;
  canPinGlobally: () => boolean;
  
  // State management
  setSortStrategy: (strategy: ParticipantSortStrategy) => void;
  setCustomSortFunction: (fn: (participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[]) => void;
  
  // Event system
  on: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft' | 'participantPinned' | 'participantUnpinned', handler: (data: ParticipantEvent | PinEvent) => void) => void;
  off: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft' | 'participantPinned' | 'participantUnpinned', handler: (data: ParticipantEvent | PinEvent) => void) => void;
  
  // Screen size helper
  screenSize: "xs" | "sm" | "md" | "lg" | "xl";
}

// Data packet types for global pinning
const PIN_DATA_PACKET_TYPE = 'PIN_PARTICIPANT';
const UNPIN_DATA_PACKET_TYPE = 'UNPIN_PARTICIPANT';

export function useStreamRoom(config?: UseStreamRoomOptions): UseStreamRoomReturn {
  const room = useRoomContext();
  
  // Core state
  const [screenSize, setScreenSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("xl");
  const [sortStrategy, setSortStrategy] = useState(config?.defaultSortStrategy || ParticipantSortStrategy.DEFAULT);
  const [customSortFunction, setCustomSortFunction] = useState<((participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[]) | null>(null);
  
  // Speaking state
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [recentSpeakers, setRecentSpeakers] = useState<Map<string, number>>(new Map());
  const [currentActiveSpeaker, setCurrentActiveSpeaker] = useState<string | undefined>(undefined);
  
  // Pinning state
  const [locallyPinnedParticipants, setLocallyPinnedParticipants] = useState<Set<string>>(new Set());
  const [globallyPinnedParticipants, setGloballyPinnedParticipants] = useState<Set<string>>(new Set());
  
  // Track active speaker duration
  const activeSpeakerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakerStartTimeRef = useRef<Map<string, number>>(new Map());
  
  // Event handlers storage
  const eventHandlersRef = useRef<{
    speakingStarted: Set<(data: ParticipantEvent) => void>;
    speakingStopped: Set<(data: ParticipantEvent) => void>;
    participantJoined: Set<(data: ParticipantEvent) => void>;
    participantLeft: Set<(data: ParticipantEvent) => void>;
    participantPinned: Set<(data: PinEvent) => void>;
    participantUnpinned: Set<(data: PinEvent) => void>;
  }>({
    speakingStarted: new Set(),
    speakingStopped: new Set(),
    participantJoined: new Set(),
    participantLeft: new Set(),
    participantPinned: new Set(),
    participantUnpinned: new Set(),
  });
  
  // Track previous participants for join/leave events
  const previousParticipantsRef = useRef<Set<string>>(new Set());

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize("xs");
      else if (width < 768) setScreenSize("sm");
      else if (width < 1024) setScreenSize("md");
      else if (width < 1280) setScreenSize("lg");
      else setScreenSize("xl");
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clean up old speakers periodically
  useEffect(() => {
    const duration = config?.speakerHistoryDuration || 30000;
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentSpeakers(prev => {
        const updated = new Map(prev);
        let hasChanges = false;
        for (const [identity, timestamp] of updated) {
          if (now - timestamp > duration) {
            updated.delete(identity);
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [config?.speakerHistoryDuration]);

  // Get all tracks
  const livekitTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.ScreenShareAudio, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  // Convert to enhanced tracks
  const allTracks = useMemo(() => {
    return livekitTracks.map(track => mapTrackReferenceEnhanced(track));
  }, [livekitTracks]);

  // Organize tracks by type
  const tracks = useMemo(() => {
    const cameraTracks = allTracks.filter(track => 
      track.source === SDKTrackSource.Camera || track.source === 'camera'
    );
    
    const microphoneTracks = allTracks.filter(track => 
      track.source === SDKTrackSource.Microphone || track.source === 'microphone'
    );
    
    const screenShareTrack = allTracks.find(track =>
      (track.source === SDKTrackSource.ScreenShare || track.source === 'screen_share') &&
      track.publication?.isSubscribed &&
      track.publication?.isEnabled
    ) || null;
    
    const screenShareAudioTrack = allTracks.find(track =>
      (track.source === SDKTrackSource.ScreenShareAudio || track.source === 'screen_share_audio') &&
      track.publication?.isSubscribed &&
      track.publication?.isEnabled
    ) || null;

    return {
      all: allTracks,
      camera: cameraTracks,
      microphone: microphoneTracks,
      screenShare: screenShareTrack,
      screenShareAudio: screenShareAudioTrack
    };
  }, [allTracks]);

  // Get unique participants from tracks
  const participants = useMemo(() => {
    // Use a Map to ensure unique participants
    const participantMap = new Map<string, EnhancedSDKParticipant>();
    
    // Add all participants from tracks
    tracks.all.forEach(track => {
      if (track.participant) {
        participantMap.set(track.participant.identity, track.participant);
      }
    });
    
    // Also add room participants to ensure we don't miss anyone
    if (room) {
      room.remoteParticipants.forEach((participant: Participant) => {
        const enhanced = mapToEnhancedParticipant(participant);
        participantMap.set(participant.identity, enhanced);
      });
      
      if (room.localParticipant) {
        const enhanced = mapToEnhancedParticipant(room.localParticipant);
        participantMap.set(room.localParticipant.identity, enhanced);
      }
    }
    
    const allParticipants = Array.from(participantMap.values());
    const localParticipant = room?.localParticipant 
      ? allParticipants.find(p => p.identity === room.localParticipant.identity) || null
      : null;
    
    const remoteParticipants = allParticipants.filter(p => 
      !localParticipant || p.identity !== localParticipant.identity
    );
    
    // Parse roles from metadata
    const getRole = (participant: EnhancedSDKParticipant): string => {
      try {
        const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
        return metadata.userType || 'guest';
      } catch {
        return 'guest';
      }
    };
    
    const hostParticipant = allParticipants.find(p => getRole(p) === 'host') || null;
    const coHostParticipants = allParticipants.filter(p => getRole(p) === 'co-host');
    const guestParticipants = allParticipants.filter(p => getRole(p) === 'guest');

    return {
      all: allParticipants,
      local: localParticipant,
      remote: remoteParticipants,
      host: hostParticipant,
      coHosts: coHostParticipants,
      guests: guestParticipants,
      speaking: speakingParticipants,
      recentSpeakers,
      currentActiveSpeaker,
      pinned: locallyPinnedParticipants,
      globallyPinned: globallyPinnedParticipants
    };
  }, [tracks.all, room, speakingParticipants, recentSpeakers, currentActiveSpeaker, locallyPinnedParticipants, globallyPinnedParticipants]);

  // Handle participant join/leave events
  useEffect(() => {
    const currentParticipants = new Set(participants.all.map(p => p.identity));
    const previousParticipants = previousParticipantsRef.current;
    
    // Check for new participants
    currentParticipants.forEach(identity => {
      if (!previousParticipants.has(identity)) {
        const participant = participants.all.find(p => p.identity === identity);
        if (participant && config?.enableSpeakerEvents !== false) {
          const event: ParticipantEvent = { participant, timestamp: Date.now() };
          eventHandlersRef.current.participantJoined.forEach(handler => handler(event));
        }
      }
    });
    
    // Check for left participants
    previousParticipants.forEach(identity => {
      if (!currentParticipants.has(identity)) {
        // Remove from pinned lists if they left
        setLocallyPinnedParticipants(prev => {
          const updated = new Set(prev);
          updated.delete(identity);
          return updated;
        });
        setGloballyPinnedParticipants(prev => {
          const updated = new Set(prev);
          updated.delete(identity);
          return updated;
        });
        
        const event: ParticipantEvent = {
          participant: {
            sid: '',
            identity,
            metadata: '',
            isLocal: false
          } as EnhancedSDKParticipant,
          timestamp: Date.now()
        };
        if (config?.enableSpeakerEvents !== false) {
          eventHandlersRef.current.participantLeft.forEach(handler => handler(event));
        }
      }
    });
    
    previousParticipantsRef.current = currentParticipants;
  }, [participants.all, config?.enableSpeakerEvents]);

  // Handle speaking events with improved active speaker detection
  useEffect(() => {
    const handleActiveSpeakerChange = (speakers: Participant[]) => {
      const newSpeakingSet = new Set(speakers.map(s => s.identity));
      const previousSpeaking = speakingParticipants;
      
      // Update current active speaker based on most recent speaker
      if (speakers.length > 0) {
        const mostRecentSpeaker = speakers[0].identity; // LiveKit typically orders by volume/activity
        setCurrentActiveSpeaker(mostRecentSpeaker);
        
        // Clear any existing timer
        if (activeSpeakerTimerRef.current) {
          clearTimeout(activeSpeakerTimerRef.current);
        }
        
        // Set timer to clear active speaker after inactivity
        activeSpeakerTimerRef.current = setTimeout(() => {
          setCurrentActiveSpeaker(undefined);
        }, 3000); // Clear after 3 seconds of no activity
      }
      
      // Check for new speakers
      newSpeakingSet.forEach(identity => {
        if (!previousSpeaking.has(identity)) {
          const participant = participants.all.find(p => p.identity === identity);
          if (participant && config?.enableSpeakerEvents !== false) {
            const event: ParticipantEvent = { participant, timestamp: Date.now() };
            eventHandlersRef.current.speakingStarted.forEach(handler => handler(event));
          }
          setRecentSpeakers(prev => new Map(prev).set(identity, Date.now()));
          speakerStartTimeRef.current.set(identity, Date.now());
        }
      });
      
      // Check for stopped speakers
      previousSpeaking.forEach(identity => {
        if (!newSpeakingSet.has(identity)) {
          const participant = participants.all.find(p => p.identity === identity);
          if (participant && config?.enableSpeakerEvents !== false) {
            const event: ParticipantEvent = { participant, timestamp: Date.now() };
            eventHandlersRef.current.speakingStopped.forEach(handler => handler(event));
          }
          speakerStartTimeRef.current.delete(identity);
        }
      });
      
      setSpeakingParticipants(newSpeakingSet);
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
      if (activeSpeakerTimerRef.current) {
        clearTimeout(activeSpeakerTimerRef.current);
      }
    };
  }, [room, participants.all, speakingParticipants, config?.enableSpeakerEvents]);

  // Handle data messages for global pinning
  useEffect(() => {
    if (!config?.enablePinning) return;
    
    const handleDataReceived = (payload: Uint8Array, participant?: Participant) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));
        
        // Only process pin messages from the host
        if (participant) {
          const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
          const isFromHost = metadata.userType === 'host';
          
          if (!isFromHost) return;
        }
        
        if (message.type === PIN_DATA_PACKET_TYPE) {
          setGloballyPinnedParticipants(prev => {
            const updated = new Set(prev);
            updated.add(message.participantIdentity);
            return updated;
          });
          
          const event: PinEvent = {
            participantIdentity: message.participantIdentity,
            isPinned: true,
            isGlobal: true,
            timestamp: Date.now()
          };
          eventHandlersRef.current.participantPinned.forEach(handler => handler(event));
        } else if (message.type === UNPIN_DATA_PACKET_TYPE) {
          setGloballyPinnedParticipants(prev => {
            const updated = new Set(prev);
            updated.delete(message.participantIdentity);
            return updated;
          });
          
          const event: PinEvent = {
            participantIdentity: message.participantIdentity,
            isPinned: false,
            isGlobal: true,
            timestamp: Date.now()
          };
          eventHandlersRef.current.participantUnpinned.forEach(handler => handler(event));
        }
      } catch (error) {
        console.error('Error processing data message:', error);
      }
    };
    
    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, config?.enablePinning]);

  // Utility function to get participant role
  const getParticipantRole = useCallback((participantIdentity: string): string => {
    const participant = participants.all.find(p => p.identity === participantIdentity);
    if (!participant) return 'guest';
    
    try {
      const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
      return metadata.userType || 'guest';
    } catch {
      return 'guest';
    }
  }, [participants.all]);

  // Check if current user can pin globally (is host)
  const canPinGlobally = useCallback((): boolean => {
    if (!participants.local) return false;
    return getParticipantRole(participants.local.identity) === 'host';
  }, [participants.local, getParticipantRole]);

  // Pin a participant
  const pinParticipant = useCallback((participantIdentity: string, isGlobal: boolean = false) => {
    if (!config?.enablePinning) return;
    
    if (isGlobal && canPinGlobally()) {
      // Send data message to all participants
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: PIN_DATA_PACKET_TYPE,
        participantIdentity
      }));
      
      (room as Room).localParticipant?.publishData(data, { reliable: true });
      
      // Also update local state
      setGloballyPinnedParticipants(prev => {
        const updated = new Set(prev);
        updated.add(participantIdentity);
        return updated;
      });
      
      const event: PinEvent = {
        participantIdentity,
        isPinned: true,
        isGlobal: true,
        timestamp: Date.now()
      };
      eventHandlersRef.current.participantPinned.forEach(handler => handler(event));
    } else {
      // Local pin only
      setLocallyPinnedParticipants(prev => {
        const updated = new Set(prev);
        updated.add(participantIdentity);
        return updated;
      });
      
      const event: PinEvent = {
        participantIdentity,
        isPinned: true,
        isGlobal: false,
        timestamp: Date.now()
      };
      eventHandlersRef.current.participantPinned.forEach(handler => handler(event));
    }
  }, [room, canPinGlobally, config?.enablePinning]);

  // Unpin a participant
  const unpinParticipant = useCallback((participantIdentity: string, isGlobal: boolean = false) => {
    if (!config?.enablePinning) return;
    
    if (isGlobal && canPinGlobally()) {
      // Send data message to all participants
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: UNPIN_DATA_PACKET_TYPE,
        participantIdentity
      }));
      
      (room as Room).localParticipant?.publishData(data, { reliable: true });
      
      // Also update local state
      setGloballyPinnedParticipants(prev => {
        const updated = new Set(prev);
        updated.delete(participantIdentity);
        return updated;
      });
      
      const event: PinEvent = {
        participantIdentity,
        isPinned: false,
        isGlobal: true,
        timestamp: Date.now()
      };
      eventHandlersRef.current.participantUnpinned.forEach(handler => handler(event));
    } else {
      // Local unpin only
      setLocallyPinnedParticipants(prev => {
        const updated = new Set(prev);
        updated.delete(participantIdentity);
        return updated;
      });
      
      const event: PinEvent = {
        participantIdentity,
        isPinned: false,
        isGlobal: false,
        timestamp: Date.now()
      };
      eventHandlersRef.current.participantUnpinned.forEach(handler => handler(event));
    }
  }, [room, canPinGlobally, config?.enablePinning]);

  // Toggle pin state
  const togglePinParticipant = useCallback((participantIdentity: string, isGlobal: boolean = false) => {
    const isPinned = isGlobal 
      ? globallyPinnedParticipants.has(participantIdentity)
      : locallyPinnedParticipants.has(participantIdentity);
    
    if (isPinned) {
      unpinParticipant(participantIdentity, isGlobal);
    } else {
      pinParticipant(participantIdentity, isGlobal);
    }
  }, [locallyPinnedParticipants, globallyPinnedParticipants, pinParticipant, unpinParticipant]);

  // Check if participant is pinned
  const isParticipantPinned = useCallback((participantIdentity: string): boolean => {
    return locallyPinnedParticipants.has(participantIdentity) || globallyPinnedParticipants.has(participantIdentity);
  }, [locallyPinnedParticipants, globallyPinnedParticipants]);

  // Check if participant is globally pinned
  const isParticipantGloballyPinned = useCallback((participantIdentity: string): boolean => {
    return globallyPinnedParticipants.has(participantIdentity);
  }, [globallyPinnedParticipants]);

  // Create sort context with current active speaker and pinned participants
  const createSortContext = useCallback((): SortContext => {
    const participantRoles = new Map<string, string>();
    const micStates = new Map<string, boolean>();
    
    participants.all.forEach(participant => {
      participantRoles.set(participant.identity, getParticipantRole(participant.identity));
      micStates.set(participant.identity, checkParticipantMicEnabled(participant));
    });
    
    // Combine local and global pins for sorting
    const allPinnedParticipants = new Set([...locallyPinnedParticipants, ...globallyPinnedParticipants]);
    
    return {
      activeSpeakers: speakingParticipants,
      recentSpeakers,
      micStates,
      localParticipantIdentity: participants.local?.identity,
      participantRoles,
      currentActiveSpeaker,
      pinnedParticipants: allPinnedParticipants
    };
  }, [participants, speakingParticipants, recentSpeakers, currentActiveSpeaker, getParticipantRole, locallyPinnedParticipants, globallyPinnedParticipants]);

  // Enhanced sorting function with pinned participants priority
  const getSortedParticipants = useCallback((options?: SortOptions): EnhancedSDKParticipant[] => {
    const opts = {
      strategy: sortStrategy,
      prioritizeActiveSpeakers: config?.autoPromoteActiveSpeakers !== false,
      prioritizePinnedParticipants: true, // Default to prioritizing pinned participants
      ...options
    };
    
    let filtered = [...participants.all];
    
    // Apply role filters
    if (opts.includeRoles && opts.includeRoles.length > 0) {
      filtered = filtered.filter(p => 
        opts.includeRoles!.includes(getParticipantRole(p.identity))
      );
    }
    
    if (opts.excludeRoles && opts.excludeRoles.length > 0) {
      filtered = filtered.filter(p => 
        !opts.excludeRoles!.includes(getParticipantRole(p.identity))
      );
    }
    
    // Apply sorting
    const context = createSortContext();
    let sorted = [...filtered];
    
    // Apply strategy-based sorting first
    switch (opts.strategy) {
      case ParticipantSortStrategy.RECENT_SPEAKERS:
        sorted.sort((a, b) => {
          const aIsSpeaking = context.activeSpeakers.has(a.identity);
          const bIsSpeaking = context.activeSpeakers.has(b.identity);
          
          if (aIsSpeaking && !bIsSpeaking) return -1;
          if (!aIsSpeaking && bIsSpeaking) return 1;
          
          const aLastSpoke = context.recentSpeakers.get(a.identity) || 0;
          const bLastSpoke = context.recentSpeakers.get(b.identity) || 0;
          
          return bLastSpoke - aLastSpoke;
        });
        break;
        
      case ParticipantSortStrategy.ACTIVE_SPEAKERS:
        sorted.sort((a, b) => {
          const aIsSpeaking = context.activeSpeakers.has(a.identity);
          const bIsSpeaking = context.activeSpeakers.has(b.identity);
          
          if (aIsSpeaking && !bIsSpeaking) return -1;
          if (!aIsSpeaking && bIsSpeaking) return 1;
          
          return 0;
        });
        break;
        
      case ParticipantSortStrategy.ROLE_BASED:
        { const roleOrder = { 'host': 0, 'co-host': 1, 'guest': 2 };
        sorted.sort((a, b) => {
          const aRole = context.participantRoles.get(a.identity) || 'guest';
          const bRole = context.participantRoles.get(b.identity) || 'guest';
          
          const aOrder = roleOrder[aRole as keyof typeof roleOrder] ?? 2;
          const bOrder = roleOrder[bRole as keyof typeof roleOrder] ?? 2;
          
          return aOrder - bOrder;
        });
        break; }
        
      case ParticipantSortStrategy.CUSTOM:
        if (opts.customSortFunction || customSortFunction) {
          const sortFn = opts.customSortFunction || customSortFunction;
          sorted = sortFn!(sorted, context);
        }
        break;
        
      case ParticipantSortStrategy.DEFAULT:
      default:
        // Keep original order
        break;
    }
    
    // Always prioritize pinned participants if enabled
    if (opts.prioritizePinnedParticipants) {
      sorted.sort((a, b) => {
        const aIsPinned = context.pinnedParticipants.has(a.identity);
        const bIsPinned = context.pinnedParticipants.has(b.identity);
        
        // Globally pinned participants first
        const aIsGloballyPinned = globallyPinnedParticipants.has(a.identity);
        const bIsGloballyPinned = globallyPinnedParticipants.has(b.identity);
        
        if (aIsGloballyPinned && !bIsGloballyPinned) return -1;
        if (!aIsGloballyPinned && bIsGloballyPinned) return 1;
        
        // Then locally pinned
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        
        return 0;
      });
    }
    
    // Then prioritize active speakers if enabled
    if (opts.prioritizeActiveSpeakers) {
      sorted.sort((a, b) => {
        // Skip if either is pinned (already sorted)
        if (context.pinnedParticipants.has(a.identity) || context.pinnedParticipants.has(b.identity)) {
          return 0;
        }
        
        // Current active speaker
        if (a.identity === context.currentActiveSpeaker) return -1;
        if (b.identity === context.currentActiveSpeaker) return 1;
        
        // Then other speaking participants
        const aIsSpeaking = context.activeSpeakers.has(a.identity);
        const bIsSpeaking = context.activeSpeakers.has(b.identity);
        
        if (aIsSpeaking && !bIsSpeaking) return -1;
        if (!aIsSpeaking && bIsSpeaking) return 1;
        
        // Then by speaking duration
        const aSpeakingDuration = speakerStartTimeRef.current.has(a.identity) 
          ? Date.now() - speakerStartTimeRef.current.get(a.identity)! 
          : 0;
        const bSpeakingDuration = speakerStartTimeRef.current.has(b.identity)
          ? Date.now() - speakerStartTimeRef.current.get(b.identity)!
          : 0;
          
        if (aSpeakingDuration !== bSpeakingDuration) {
          return bSpeakingDuration - aSpeakingDuration;
        }
        
        return 0;
      });
    }
    
    // Prioritize local participant if requested
    if (opts.prioritizeLocalParticipant && participants.local) {
      const localIndex = sorted.findIndex(p => p.identity === participants.local!.identity);
      if (localIndex > 0) {
        const [local] = sorted.splice(localIndex, 1);
        sorted.unshift(local);
      }
    }
    
    // Apply max count
    if (opts.maxCount && opts.maxCount > 0) {
      sorted = sorted.slice(0, opts.maxCount);
    }
    
    return sorted;
  }, [participants, sortStrategy, customSortFunction, getParticipantRole, createSortContext, config?.autoPromoteActiveSpeakers, globallyPinnedParticipants]);

  // Get all tracks for a specific participant
  const getParticipantTracks = useCallback((participantIdentity: string): EnhancedSDKTrackReference[] => {
    return tracks.all.filter(track => 
      track.participant && track.participant.identity === participantIdentity
    );
  }, [tracks.all]);

  // Check if participant is currently speaking
  const isParticipantSpeaking = useCallback((participantIdentity: string): boolean => {
    return speakingParticipants.has(participantIdentity);
  }, [speakingParticipants]);

  // Event system
  const on = useCallback((
    event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft' | 'participantPinned' | 'participantUnpinned',
    handler: (data: ParticipantEvent | PinEvent) => void
  ) => {
    (eventHandlersRef.current as any)[event].add(handler);
  }, []);

  const off = useCallback((
    event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft' | 'participantPinned' | 'participantUnpinned',
    handler: (data: ParticipantEvent | PinEvent) => void
  ) => {
    (eventHandlersRef.current as any)[event].delete(handler);
  }, []);

  return {
    room,
    tracks,
    participants,
    getSortedParticipants,
    getParticipantTracks,
    getParticipantRole,
    isParticipantSpeaking,
    pinParticipant,
    unpinParticipant,
    togglePinParticipant,
    isParticipantPinned,
    isParticipantGloballyPinned,
    canPinGlobally,
    setSortStrategy,
    setCustomSortFunction: (fn) => setCustomSortFunction(() => fn),
    on,
    off,
    screenSize
  };
}