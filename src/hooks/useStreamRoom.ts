// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// import { useTracks, useRoomContext } from "@livekit/components-react";
// import { Track, RoomEvent, Participant } from "livekit-client";
// import { checkParticipantMicEnabled } from "../utils/index";
// import { 
//   EnhancedSDKTrackReference,
//   SDKTrackSource,
//   EnhancedSDKParticipant,
//   ParticipantSortStrategy,
// } from "../types";
// import { mapTrackReferenceEnhanced, mapToEnhancedParticipant } from "../utils/participant-bridge";

// // Sorting strategies that users can choose from or extend
// // export enum ParticipantSortStrategy {
// //   DEFAULT = 'default',                 // Join order
// //   RECENT_SPEAKERS = 'recent_speakers', // Prioritize recent speakers
// //   ACTIVE_SPEAKERS = 'active_speakers', // Currently speaking first
// //   ROLE_BASED = 'role_based',          // Host > Co-host > Guest
// //   CUSTOM = 'custom'                   // User-provided function
// // }

// interface SortOptions {
//   strategy?: ParticipantSortStrategy;
//   customSortFunction?: (participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[];
//   includeRoles?: string[];
//   excludeRoles?: string[];
//   maxCount?: number;
//   prioritizeLocalParticipant?: boolean;
// }

// interface SortContext {
//   activeSpeakers: Set<string>;
//   recentSpeakers: Map<string, number>; // identity -> last spoke timestamp
//   micStates: Map<string, boolean>;
//   localParticipantIdentity?: string;
//   participantRoles: Map<string, string>;
// }

// export interface ParticipantEvent {
//   participant: EnhancedSDKParticipant;
//   timestamp: number;
// }

// export interface UseStreamRoomOptions {
//   defaultSortStrategy?: ParticipantSortStrategy;
//   speakerHistoryDuration?: number; // How long to remember recent speakers (ms)
//   enableSpeakerEvents?: boolean;   // Whether to emit speaker events
// }

// export interface UseStreamRoomReturn {
//   // Room reference
//   room: any;
  
//   // Track collections - pure data, no layout assumptions
//   tracks: {
//     all: EnhancedSDKTrackReference[];
//     camera: EnhancedSDKTrackReference[];
//     microphone: EnhancedSDKTrackReference[];
//     screenShare: EnhancedSDKTrackReference | null;
//     screenShareAudio: EnhancedSDKTrackReference | null;
//   };
  
//   // Participant collections - pure data
//   participants: {
//     all: EnhancedSDKParticipant[];
//     local: EnhancedSDKParticipant | null;
//     remote: EnhancedSDKParticipant[];
//     host: EnhancedSDKParticipant | null;
//     coHosts: EnhancedSDKParticipant[];
//     guests: EnhancedSDKParticipant[];
//     speaking: Set<string>; // Participant identities currently speaking
//     recentSpeakers: Map<string, number>; // identity -> last spoke timestamp
//   };
  
//   // Utility functions - no layout assumptions
//   getSortedParticipants: (options?: SortOptions) => EnhancedSDKParticipant[];
//   getParticipantTracks: (participantIdentity: string) => EnhancedSDKTrackReference[];
//   getParticipantRole: (participantIdentity: string) => string;
//   isParticipantSpeaking: (participantIdentity: string) => boolean;
  
//   // State management
//   setSortStrategy: (strategy: ParticipantSortStrategy) => void;
//   setCustomSortFunction: (fn: (participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[]) => void;
  
//   // Event system
//   on: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft', handler: (data: ParticipantEvent) => void) => void;
//   off: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft', handler: (data: ParticipantEvent) => void) => void;
  
//   // Screen size helper (useful for responsive layouts)
//   screenSize: "xs" | "sm" | "md" | "lg" | "xl";
// }

// /**
//  * Clean useStreamRoom hook focused on state management without layout opinions
//  */
// export function useStreamRoom(config?: UseStreamRoomOptions): UseStreamRoomReturn {
//   const room = useRoomContext();
  
//   // Core state
//   const [screenSize, setScreenSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("xl");
//   const [sortStrategy, setSortStrategy] = useState(config?.defaultSortStrategy || ParticipantSortStrategy.DEFAULT);
//   const [customSortFunction, setCustomSortFunction] = useState<((participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[]) | null>(null);
  
//   // Speaking state
//   const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
//   const [recentSpeakers, setRecentSpeakers] = useState<Map<string, number>>(new Map());
  
//   // Event handlers storage
//   const eventHandlersRef = useRef<{
//     speakingStarted: Set<(data: ParticipantEvent) => void>;
//     speakingStopped: Set<(data: ParticipantEvent) => void>;
//     participantJoined: Set<(data: ParticipantEvent) => void>;
//     participantLeft: Set<(data: ParticipantEvent) => void>;
//   }>({
//     speakingStarted: new Set(),
//     speakingStopped: new Set(),
//     participantJoined: new Set(),
//     participantLeft: new Set(),
//   });
  
//   // Track previous participants for join/leave events
//   const previousParticipantsRef = useRef<Set<string>>(new Set());

//   // Screen size detection
//   useEffect(() => {
//     const handleResize = () => {
//       const width = window.innerWidth;
//       if (width < 640) setScreenSize("xs");
//       else if (width < 768) setScreenSize("sm");
//       else if (width < 1024) setScreenSize("md");
//       else if (width < 1280) setScreenSize("lg");
//       else setScreenSize("xl");
//     };
    
//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   // Clean up old speakers periodically
//   useEffect(() => {
//     const duration = config?.speakerHistoryDuration || 30000; // 30 seconds default
//     const interval = setInterval(() => {
//       const now = Date.now();
//       setRecentSpeakers(prev => {
//         const updated = new Map(prev);
//         for (const [identity, timestamp] of updated) {
//           if (now - timestamp > duration) {
//             updated.delete(identity);
//           }
//         }
//         return updated;
//       });
//     }, 5000);
    
//     return () => clearInterval(interval);
//   }, [config?.speakerHistoryDuration]);

//   // Get all tracks
//   const livekitTracks = useTracks(
//     [
//       { source: Track.Source.Camera, withPlaceholder: true },
//       { source: Track.Source.ScreenShare, withPlaceholder: false },
//       { source: Track.Source.ScreenShareAudio, withPlaceholder: false },
//       { source: Track.Source.Microphone, withPlaceholder: true },
//     ],
//     { onlySubscribed: false }
//   );

//   // Convert to enhanced tracks
//   const allTracks = useMemo(() => {
//     return livekitTracks.map(track => mapTrackReferenceEnhanced(track));
//   }, [livekitTracks]);

//   // Organize tracks by type
//   const tracks = useMemo(() => {
//     const cameraTracks = allTracks.filter(track => 
//       track.source === SDKTrackSource.Camera || track.source === 'camera'
//     );
    
//     const microphoneTracks = allTracks.filter(track => 
//       track.source === SDKTrackSource.Microphone || track.source === 'microphone'
//     );
    
//     const screenShareTrack = allTracks.find(track =>
//       (track.source === SDKTrackSource.ScreenShare || track.source === 'screen_share') &&
//       track.publication?.isSubscribed &&
//       track.publication?.isEnabled
//     ) || null;
    
//     const screenShareAudioTrack = allTracks.find(track =>
//       (track.source === SDKTrackSource.ScreenShareAudio || track.source === 'screen_share_audio') &&
//       track.publication?.isSubscribed &&
//       track.publication?.isEnabled
//     ) || null;

//     return {
//       all: allTracks,
//       camera: cameraTracks,
//       microphone: microphoneTracks,
//       screenShare: screenShareTrack,
//       screenShareAudio: screenShareAudioTrack
//     };
//   }, [allTracks]);

//   // Get unique participants from tracks
//   const participants = useMemo(() => {
//     // Use a Map to ensure unique participants
//     const participantMap = new Map<string, EnhancedSDKParticipant>();
    
//     // Add all participants from tracks
//     tracks.all.forEach(track => {
//       if (track.participant) {
//         participantMap.set(track.participant.identity, track.participant);
//       }
//     });
    
//     // Also add room participants to ensure we don't miss anyone
//     if (room) {
//       room.remoteParticipants.forEach((participant: Participant) => {
//         const enhanced = mapToEnhancedParticipant(participant);
//         participantMap.set(participant.identity, enhanced);
//       });
      
//       if (room.localParticipant) {
//         const enhanced = mapToEnhancedParticipant(room.localParticipant);
//         participantMap.set(room.localParticipant.identity, enhanced);
//       }
//     }
    
//     const allParticipants = Array.from(participantMap.values());
//     const localParticipant = room?.localParticipant 
//       ? allParticipants.find(p => p.identity === room.localParticipant.identity) || null
//       : null;
    
//     const remoteParticipants = allParticipants.filter(p => 
//       !localParticipant || p.identity !== localParticipant.identity
//     );
    
//     // Parse roles from metadata
//     const getRole = (participant: EnhancedSDKParticipant): string => {
//       try {
//         const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
//         return metadata.userType || 'guest';
//       } catch {
//         return 'guest';
//       }
//     };
    
//     const hostParticipant = allParticipants.find(p => getRole(p) === 'host') || null;
//     const coHostParticipants = allParticipants.filter(p => getRole(p) === 'co-host');
//     const guestParticipants = allParticipants.filter(p => getRole(p) === 'guest');

//     return {
//       all: allParticipants,
//       local: localParticipant,
//       remote: remoteParticipants,
//       host: hostParticipant,
//       coHosts: coHostParticipants,
//       guests: guestParticipants,
//       speaking: speakingParticipants,
//       recentSpeakers
//     };
//   }, [tracks.all, room, speakingParticipants, recentSpeakers]);

//   // Handle participant join/leave events
//   useEffect(() => {
//     const currentParticipants = new Set(participants.all.map(p => p.identity));
//     const previousParticipants = previousParticipantsRef.current;
    
//     // Check for new participants
//     currentParticipants.forEach(identity => {
//       if (!previousParticipants.has(identity)) {
//         const participant = participants.all.find(p => p.identity === identity);
//         if (participant && config?.enableSpeakerEvents !== false) {
//           const event: ParticipantEvent = { participant, timestamp: Date.now() };
//           eventHandlersRef.current.participantJoined.forEach(handler => handler(event));
//         }
//       }
//     });
    
//     // Check for left participants
//     previousParticipants.forEach(identity => {
//       if (!currentParticipants.has(identity)) {
//         // We can't get the full participant object for someone who left,
//         // but we can create a minimal one
//         const event: ParticipantEvent = {
//           participant: {
//             sid: '',
//             identity,
//             metadata: '',
//             isLocal: false
//           } as EnhancedSDKParticipant,
//           timestamp: Date.now()
//         };
//         if (config?.enableSpeakerEvents !== false) {
//           eventHandlersRef.current.participantLeft.forEach(handler => handler(event));
//         }
//       }
//     });
    
//     previousParticipantsRef.current = currentParticipants;
//   }, [participants.all, config?.enableSpeakerEvents]);

//   // Handle speaking events
//   useEffect(() => {
//     const handleActiveSpeakerChange = (speakers: Participant[]) => {
//       const newSpeakingSet = new Set(speakers.map(s => s.identity));
//       const previousSpeaking = speakingParticipants;
      
//       // Check for new speakers
//       newSpeakingSet.forEach(identity => {
//         if (!previousSpeaking.has(identity)) {
//           const participant = participants.all.find(p => p.identity === identity);
//           if (participant && config?.enableSpeakerEvents !== false) {
//             const event: ParticipantEvent = { participant, timestamp: Date.now() };
//             eventHandlersRef.current.speakingStarted.forEach(handler => handler(event));
//           }
//           setRecentSpeakers(prev => new Map(prev).set(identity, Date.now()));
//         }
//       });
      
//       // Check for stopped speakers
//       previousSpeaking.forEach(identity => {
//         if (!newSpeakingSet.has(identity)) {
//           const participant = participants.all.find(p => p.identity === identity);
//           if (participant && config?.enableSpeakerEvents !== false) {
//             const event: ParticipantEvent = { participant, timestamp: Date.now() };
//             eventHandlersRef.current.speakingStopped.forEach(handler => handler(event));
//           }
//         }
//       });
      
//       setSpeakingParticipants(newSpeakingSet);
//     };

//     room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
//     return () => {
//       room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange);
//     };
//   }, [room, participants.all, speakingParticipants, config?.enableSpeakerEvents]);

//   // Utility function to get participant role
//   const getParticipantRole = useCallback((participantIdentity: string): string => {
//     const participant = participants.all.find(p => p.identity === participantIdentity);
//     if (!participant) return 'guest';
    
//     try {
//       const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
//       return metadata.userType || 'guest';
//     } catch {
//       return 'guest';
//     }
//   }, [participants.all]);

//   // Create sort context
//   const createSortContext = useCallback((): SortContext => {
//     const participantRoles = new Map<string, string>();
//     const micStates = new Map<string, boolean>();
    
//     participants.all.forEach(participant => {
//       participantRoles.set(participant.identity, getParticipantRole(participant.identity));
//       micStates.set(participant.identity, checkParticipantMicEnabled(participant));
//     });
    
//     return {
//       activeSpeakers: speakingParticipants,
//       recentSpeakers,
//       micStates,
//       localParticipantIdentity: participants.local?.identity,
//       participantRoles
//     };
//   }, [participants, speakingParticipants, recentSpeakers, getParticipantRole]);

//   // Main sorting function
//   const getSortedParticipants = useCallback((options?: SortOptions): EnhancedSDKParticipant[] => {
//     const opts = {
//       strategy: sortStrategy,
//       ...options
//     };
    
//     let filtered = [...participants.all];
    
//     // Apply role filters
//     if (opts.includeRoles && opts.includeRoles.length > 0) {
//       filtered = filtered.filter(p => 
//         opts.includeRoles!.includes(getParticipantRole(p.identity))
//       );
//     }
    
//     if (opts.excludeRoles && opts.excludeRoles.length > 0) {
//       filtered = filtered.filter(p => 
//         !opts.excludeRoles!.includes(getParticipantRole(p.identity))
//       );
//     }
    
//     // Apply sorting
//     const context = createSortContext();
//     let sorted = [...filtered];
    
//     switch (opts.strategy) {
//       case ParticipantSortStrategy.RECENT_SPEAKERS:
//         sorted.sort((a, b) => {
//           const aIsSpeaking = context.activeSpeakers.has(a.identity);
//           const bIsSpeaking = context.activeSpeakers.has(b.identity);
          
//           if (aIsSpeaking && !bIsSpeaking) return -1;
//           if (!aIsSpeaking && bIsSpeaking) return 1;
          
//           const aLastSpoke = context.recentSpeakers.get(a.identity) || 0;
//           const bLastSpoke = context.recentSpeakers.get(b.identity) || 0;
          
//           return bLastSpoke - aLastSpoke;
//         });
//         break;
        
//       case ParticipantSortStrategy.ACTIVE_SPEAKERS:
//         sorted.sort((a, b) => {
//           const aIsSpeaking = context.activeSpeakers.has(a.identity);
//           const bIsSpeaking = context.activeSpeakers.has(b.identity);
          
//           if (aIsSpeaking && !bIsSpeaking) return -1;
//           if (!aIsSpeaking && bIsSpeaking) return 1;
          
//           return 0;
//         });
//         break;
        
//       case ParticipantSortStrategy.ROLE_BASED:
//         { const roleOrder = { 'host': 0, 'co-host': 1, 'guest': 2 };
//         sorted.sort((a, b) => {
//           const aRole = context.participantRoles.get(a.identity) || 'guest';
//           const bRole = context.participantRoles.get(b.identity) || 'guest';
          
//           const aOrder = roleOrder[aRole as keyof typeof roleOrder] ?? 2;
//           const bOrder = roleOrder[bRole as keyof typeof roleOrder] ?? 2;
          
//           return aOrder - bOrder;
//         });
//         break; }
        
//       case ParticipantSortStrategy.CUSTOM:
//         if (opts.customSortFunction || customSortFunction) {
//           const sortFn = opts.customSortFunction || customSortFunction;
//           sorted = sortFn!(sorted, context);
//         }
//         break;
        
//       case ParticipantSortStrategy.DEFAULT:
//       default:
//         // Keep original order
//         break;
//     }
    
//     // Prioritize local participant if requested
//     if (opts.prioritizeLocalParticipant && participants.local) {
//       const localIndex = sorted.findIndex(p => p.identity === participants.local!.identity);
//       if (localIndex > 0) {
//         const [local] = sorted.splice(localIndex, 1);
//         sorted.unshift(local);
//       }
//     }
    
//     // Apply max count
//     if (opts.maxCount && opts.maxCount > 0) {
//       sorted = sorted.slice(0, opts.maxCount);
//     }
    
//     return sorted;
//   }, [participants, sortStrategy, customSortFunction, getParticipantRole, createSortContext]);

//   // Get all tracks for a specific participant
//   const getParticipantTracks = useCallback((participantIdentity: string): EnhancedSDKTrackReference[] => {
//     return tracks.all.filter(track => 
//       track.participant && track.participant.identity === participantIdentity
//     );
//   }, [tracks.all]);

//   // Check if participant is currently speaking
//   const isParticipantSpeaking = useCallback((participantIdentity: string): boolean => {
//     return speakingParticipants.has(participantIdentity);
//   }, [speakingParticipants]);

//   // Event system
//   const on = useCallback((
//     event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft',
//     handler: (data: ParticipantEvent) => void
//   ) => {
//     eventHandlersRef.current[event].add(handler);
//   }, []);

//   const off = useCallback((
//     event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft',
//     handler: (data: ParticipantEvent) => void
//   ) => {
//     eventHandlersRef.current[event].delete(handler);
//   }, []);

//   return {
//     room,
//     tracks,
//     participants,
//     getSortedParticipants,
//     getParticipantTracks,
//     getParticipantRole,
//     isParticipantSpeaking,
//     setSortStrategy,
//     setCustomSortFunction: (fn) => setCustomSortFunction(() => fn),
//     on,
//     off,
//     screenSize
//   };
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTracks, useRoomContext } from "@livekit/components-react";
import { Track, RoomEvent, Participant } from "livekit-client";
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
  prioritizeActiveSpeakers?: boolean; // New option
}

interface SortContext {
  activeSpeakers: Set<string>;
  recentSpeakers: Map<string, number>;
  micStates: Map<string, boolean>;
  localParticipantIdentity?: string;
  participantRoles: Map<string, string>;
  currentActiveSpeaker?: string; // New field
}

export interface ParticipantEvent {
  participant: EnhancedSDKParticipant;
  timestamp: number;
}

export interface UseStreamRoomOptions {
  defaultSortStrategy?: ParticipantSortStrategy;
  speakerHistoryDuration?: number;
  enableSpeakerEvents?: boolean;
  autoPromoteActiveSpeakers?: boolean; // New option
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
    currentActiveSpeaker: string | undefined; // New field
  };
  
  // Utility functions
  getSortedParticipants: (options?: SortOptions) => EnhancedSDKParticipant[];
  getParticipantTracks: (participantIdentity: string) => EnhancedSDKTrackReference[];
  getParticipantRole: (participantIdentity: string) => string;
  isParticipantSpeaking: (participantIdentity: string) => boolean;
  
  // State management
  setSortStrategy: (strategy: ParticipantSortStrategy) => void;
  setCustomSortFunction: (fn: (participants: EnhancedSDKParticipant[], context: SortContext) => EnhancedSDKParticipant[]) => void;
  
  // Event system
  on: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft', handler: (data: ParticipantEvent) => void) => void;
  off: (event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft', handler: (data: ParticipantEvent) => void) => void;
  
  // Screen size helper
  screenSize: "xs" | "sm" | "md" | "lg" | "xl";
}

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
  
  // Track active speaker duration
  const activeSpeakerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakerStartTimeRef = useRef<Map<string, number>>(new Map());
  
  // Event handlers storage
  const eventHandlersRef = useRef<{
    speakingStarted: Set<(data: ParticipantEvent) => void>;
    speakingStopped: Set<(data: ParticipantEvent) => void>;
    participantJoined: Set<(data: ParticipantEvent) => void>;
    participantLeft: Set<(data: ParticipantEvent) => void>;
  }>({
    speakingStarted: new Set(),
    speakingStopped: new Set(),
    participantJoined: new Set(),
    participantLeft: new Set(),
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
        for (const [identity, timestamp] of updated) {
          if (now - timestamp > duration) {
            updated.delete(identity);
          }
        }
        return updated;
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
      currentActiveSpeaker
    };
  }, [tracks.all, room, speakingParticipants, recentSpeakers, currentActiveSpeaker]);

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

  // Create sort context with current active speaker
  const createSortContext = useCallback((): SortContext => {
    const participantRoles = new Map<string, string>();
    const micStates = new Map<string, boolean>();
    
    participants.all.forEach(participant => {
      participantRoles.set(participant.identity, getParticipantRole(participant.identity));
      micStates.set(participant.identity, checkParticipantMicEnabled(participant));
    });
    
    return {
      activeSpeakers: speakingParticipants,
      recentSpeakers,
      micStates,
      localParticipantIdentity: participants.local?.identity,
      participantRoles,
      currentActiveSpeaker
    };
  }, [participants, speakingParticipants, recentSpeakers, currentActiveSpeaker, getParticipantRole]);

  // Enhanced sorting function with active speaker priority
  const getSortedParticipants = useCallback((options?: SortOptions): EnhancedSDKParticipant[] => {
    const opts = {
      strategy: sortStrategy,
      prioritizeActiveSpeakers: config?.autoPromoteActiveSpeakers !== false,
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
    
    // Always prioritize active speakers if enabled
    if (opts.prioritizeActiveSpeakers) {
      sorted.sort((a, b) => {
        // Current active speaker always first
        if (a.identity === context.currentActiveSpeaker) return -1;
        if (b.identity === context.currentActiveSpeaker) return 1;
        
        // Then other speaking participants
        const aIsSpeaking = context.activeSpeakers.has(a.identity);
        const bIsSpeaking = context.activeSpeakers.has(b.identity);
        
        if (aIsSpeaking && !bIsSpeaking) return -1;
        if (!aIsSpeaking && bIsSpeaking) return 1;
        
        // Then by speaking duration (longer speakers first)
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
  }, [participants, sortStrategy, customSortFunction, getParticipantRole, createSortContext, config?.autoPromoteActiveSpeakers]);

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
    event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft',
    handler: (data: ParticipantEvent) => void
  ) => {
    eventHandlersRef.current[event].add(handler);
  }, []);

  const off = useCallback((
    event: 'speakingStarted' | 'speakingStopped' | 'participantJoined' | 'participantLeft',
    handler: (data: ParticipantEvent) => void
  ) => {
    eventHandlersRef.current[event].delete(handler);
  }, []);

  return {
    room,
    tracks,
    participants,
    getSortedParticipants,
    getParticipantTracks,
    getParticipantRole,
    isParticipantSpeaking,
    setSortStrategy,
    setCustomSortFunction: (fn) => setCustomSortFunction(() => fn),
    on,
    off,
    screenSize
  };
}