import { useMemo } from 'react';
import { useParticipantList } from './useParticipant';
import { useStreamContext } from './useStreamContext';
import { Participant } from '../types';

/**
 * Hook to get the local participant from the participant list
 * 
 * @returns The local participant or undefined if not found
 * 
 * @example
 * ```tsx
 * const localParticipant = useLocalParticipant();
 * 
 * if (localParticipant) {
 *   console.log('Local user:', localParticipant.userName);
 * }
 * ```
 */
export function useLocalParticipant(): Participant | undefined {
  const { participants } = useParticipantList();
  const { identity } = useStreamContext();
  
  // Memoize the lookup to avoid unnecessary recalculations
  const localParticipant = useMemo(() => {
    if (!identity) return undefined;
    
    // Find participant by matching identity with id
    return participants.find(p => p.id === identity);
  }, [participants, identity]);
  
  return localParticipant;
}

/**
 * Hook to check if a given participant is the local participant
 * 
 * @param participantId - The ID of the participant to check
 * @returns true if the participant is the local participant
 * 
 * @example
 * ```tsx
 * const isLocal = useIsLocalParticipant(participant.id);
 * ```
 */
export function useIsLocalParticipant(participantId: string): boolean {
  const { identity } = useStreamContext();
  
  return useMemo(
    () => identity === participantId,
    [identity, participantId]
  );
}