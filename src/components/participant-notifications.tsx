import { useParticipantNotifications } from '../hooks/index';
import { useRef, useEffect } from 'react';

// Global flag to ensure only one instance is active
let notificationsInstanceActive = false;

export const ParticipantNotifications = () => {
  const isActiveRef = useRef(false);
  
  useEffect(() => {
    // Check if another instance is already active
    if (notificationsInstanceActive) {
      console.warn('ParticipantNotifications: Another instance is already active. Skipping.');
      return;
    }
    
    // Mark this instance as active
    notificationsInstanceActive = true;
    isActiveRef.current = true;
    
    // Clean up on unmount
    return () => {
      if (isActiveRef.current) {
        notificationsInstanceActive = false;
        isActiveRef.current = false;
      }
    };
  }, []);
  
  // Only enable notifications if this is the active instance
  useParticipantNotifications({
    showJoinNotifications: true,
    showLeaveNotifications: true,
    joinNotificationDuration: 4000,
    leaveNotificationDuration: 3000,
    batchDelay: 500, // Batch notifications within 500ms window
  });

  return null; // No UI needed
};