import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // If no LiveKit reference, we can't track changes
    if (!('_livekitParticipant' in participant) || !participant._livekitParticipant) {
      return;
    }

    const enhancedParticipant = participant as EnhancedSDKParticipant;

    // Update track states
    const updateTrackStates = () => {
      const newStates = getParticipantTrackStates(enhancedParticipant);
      setTrackStates(newStates);
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

    // Initial update to ensure we have the latest state
    updateTrackStates();

    // Cleanup
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [participant, isLocal]);

  return trackStates;
}

/**
 * Hook to track all participants' track states in a room
 * Useful for components that need to display multiple participants
 */
export function useAllParticipantTrackStates(
  participants: Array<SDKParticipant | EnhancedSDKParticipant>
) {
  const [participantStates, setParticipantStates] = useState<
    Map<string, { micEnabled: boolean; cameraEnabled: boolean }>
  >(new Map());

  useEffect(() => {
    const newStates = new Map<string, { micEnabled: boolean; cameraEnabled: boolean }>();

    participants.forEach(participant => {
      const states = getParticipantTrackStates(participant);
      newStates.set(participant.identity, {
        micEnabled: states.micEnabled,
        cameraEnabled: states.cameraEnabled,
      });
    });

    setParticipantStates(newStates);
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