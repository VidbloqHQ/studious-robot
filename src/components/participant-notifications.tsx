import { useParticipantNotifications } from '../hooks/index';

export const ParticipantNotifications = () => {
  // This component just needs to exist to enable notifications
  useParticipantNotifications({
    showJoinNotifications: true,
    showLeaveNotifications: true,
    joinNotificationDuration: 4000,
    leaveNotificationDuration: 3000,
  });

  return null; // No UI needed
};

