import { useState, useEffect, useRef } from 'react';
import { SDKParticipant, EnhancedSDKParticipant } from '../types';
import {
  getParticipantTrackStates,
  addTrackMutedListener,
  addTrackUnmutedListener,
  addParticipantEventListener,
} from '../utils';

/**
 * Hook to track participant media states (mic/camera) with real-time updates
 * Works for both local and remote participants
 */
export function useParticipantTrackStates(
  participant: SDKParticipant | EnhancedSDKParticipant,
  isLocal: boolean = false
) {
  const [trackStates, setTrackStates] = useState(() => {
    // Initialize with current states if available
    const states = getParticipantTrackStates(participant);
    return {
      micEnabled: states.micEnabled,
      cameraEnabled: states.cameraEnabled,
      hasLivekitReference: states.hasLivekitReference,
    };
  });

  // Use ref to track participant identity for stability check
  const participantIdentityRef = useRef(participant.identity);

  useEffect(() => {
    // If no LiveKit reference, we can't track changes
    if (!('_livekitParticipant' in participant) || !participant._livekitParticipant) {
      return;
    }

    const enhancedParticipant = participant as EnhancedSDKParticipant;

    // Update track states with comparison to prevent unnecessary updates
    const updateTrackStates = () => {
      const newStates = getParticipantTrackStates(enhancedParticipant);
      
      setTrackStates(prevStates => {
        // Only update if states actually changed
        if (
          prevStates.micEnabled === newStates.micEnabled &&
          prevStates.cameraEnabled === newStates.cameraEnabled &&
          prevStates.hasLivekitReference === newStates.hasLivekitReference
        ) {
          return prevStates; // No update needed, return same reference
        }
        return newStates;
      });
    };

    // Set up event listeners
    const cleanupFunctions: Array<() => void> = [];

    // Listen to track muted/unmuted events
    cleanupFunctions.push(
      addTrackMutedListener(enhancedParticipant, updateTrackStates),
      addTrackUnmutedListener(enhancedParticipant, updateTrackStates)
    );

    // For local participants, also listen to publish/unpublish events
    if (isLocal) {
      cleanupFunctions.push(
        addParticipantEventListener(enhancedParticipant, 'trackPublished', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'trackUnpublished', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'localTrackPublished', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'localTrackUnpublished', updateTrackStates)
      );
    } else {
      // For remote participants, listen to subscription events
      cleanupFunctions.push(
        addParticipantEventListener(enhancedParticipant, 'trackSubscribed', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'trackUnsubscribed', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'trackStreamStateChanged', updateTrackStates),
        addParticipantEventListener(enhancedParticipant, 'trackSubscriptionStatusChanged', updateTrackStates)
      );
    }

    // Defer initial update to avoid synchronous state updates during render
    const timeoutId = setTimeout(() => {
      updateTrackStates();
    }, 0);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [participant.identity, participant.sid, isLocal]); // Use stable identity/sid instead of whole object

  // Update ref when participant changes
  useEffect(() => {
    participantIdentityRef.current = participant.identity;
  }, [participant.identity]);

  return trackStates;
}

/**
 * Hook to track all participants' track states in a room
 * Useful for components that need to display multiple participants
 */
export function useAllParticipantTrackStates(
  participants: Array<SDKParticipant | EnhancedSDKParticipant>
) {
  const [participantStates, setParticipantStates] = useState<Map<string, { micEnabled: boolean; cameraEnabled: boolean }>>(() => {
    // Initialize with current states
    const initialStates = new Map<string, { micEnabled: boolean; cameraEnabled: boolean }>();
    participants.forEach(participant => {
      const states = getParticipantTrackStates(participant);
      initialStates.set(participant.identity, {
        micEnabled: states.micEnabled,
        cameraEnabled: states.cameraEnabled,
      });
    });
    return initialStates;
  });

  // Track participant identities to detect changes
  const participantIdentitiesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIdentities = new Set(participants.map(p => p.identity));
    const previousIdentities = participantIdentitiesRef.current;

    // Check if participants have actually changed
    const hasChanged = currentIdentities.size !== previousIdentities.size ||
      [...currentIdentities].some(id => !previousIdentities.has(id));

    if (hasChanged) {
      const newStates = new Map<string, { micEnabled: boolean; cameraEnabled: boolean }>();

      participants.forEach(participant => {
        const states = getParticipantTrackStates(participant);
        newStates.set(participant.identity, {
          micEnabled: states.micEnabled,
          cameraEnabled: states.cameraEnabled,
        });
      });

      setParticipantStates(newStates);
      participantIdentitiesRef.current = currentIdentities;
    }
  }, [participants]);

  // Set up listeners for all participants with LiveKit references
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    participants.forEach(participant => {
      if (!('_livekitParticipant' in participant) || !participant._livekitParticipant) {
        return;
      }

      const enhancedParticipant = participant as EnhancedSDKParticipant;

      const updateParticipantState = () => {
        const states = getParticipantTrackStates(enhancedParticipant);
        
        setParticipantStates(prev => {
          const currentState = prev.get(participant.identity);
          
          // Only update if state actually changed
          if (
            currentState &&
            currentState.micEnabled === states.micEnabled &&
            currentState.cameraEnabled === states.cameraEnabled
          ) {
            return prev; // No change, return same reference
          }
          
          const newMap = new Map(prev);
          newMap.set(participant.identity, {
            micEnabled: states.micEnabled,
            cameraEnabled: states.cameraEnabled,
          });
          return newMap;
        });
      };

      // Add listeners for this participant
      cleanupFunctions.push(
        addTrackMutedListener(enhancedParticipant, updateParticipantState),
        addTrackUnmutedListener(enhancedParticipant, updateParticipantState),
        addParticipantEventListener(enhancedParticipant, 'trackSubscribed', updateParticipantState),
        addParticipantEventListener(enhancedParticipant, 'trackUnsubscribed', updateParticipantState),
        addParticipantEventListener(enhancedParticipant, 'trackStreamStateChanged', updateParticipantState),
        addParticipantEventListener(enhancedParticipant, 'trackSubscriptionStatusChanged', updateParticipantState)
      );
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [participants]);

  return participantStates;
}