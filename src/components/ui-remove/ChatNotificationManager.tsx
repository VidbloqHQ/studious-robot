import React, { useState, useEffect, useRef } from 'react';
import { ReceivedChatMessage } from "@livekit/components-react";
import { LocalParticipant } from "livekit-client";
import { Participant } from "../../types/index";
import ChatNotification from './ChatNotification';

interface FormattedChatMessage extends ReceivedChatMessage {
  participant?: Participant;
  parsedContent?: React.ReactNode;
  from?: LocalParticipant;
}

interface NotificationData {
  id: string;
  message: FormattedChatMessage;
  participant?: Participant;
  timestamp: number;
}

interface ChatNotificationManagerProps {
  messages: FormattedChatMessage[];
  participants: Participant[];
  isChatOpen: boolean;
  onOpenChat: () => void; // Add this prop to open chat modal
}

const ChatNotificationManager: React.FC<ChatNotificationManagerProps> = ({
  messages,
  participants,
  isChatOpen,
  onOpenChat, // Add this
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const lastMessageCountRef = useRef(0);
  const processedMessagesRef = useRef(new Set<string>());

  // Helper function to get participant from message (improved matching)
  const getParticipant = (identity?: string): Participant | undefined => {
    if (!identity) return undefined;
    
    // Since identity is now participant.id, match by id first
    return participants.find(p => p.id === identity);
  };

  // Generate a unique ID for each message
  const generateMessageId = (message: FormattedChatMessage): string => {
    const identity = message.from?.identity || 'unknown';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (message as any).message || (message as any).parsedContent || '';
    const timestamp = Date.now();
    return `${identity}-${content.slice(0, 20)}-${timestamp}`;
  };

  useEffect(() => {
    // Only show notifications if chat is closed
    if (isChatOpen) {
      setNotifications([]);
      return;
    }

    // Check for new messages
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      
      newMessages.forEach((message) => {
        const messageId = generateMessageId(message);
        
        // Skip if we've already processed this message
        if (processedMessagesRef.current.has(messageId)) {
          return;
        }
        
        processedMessagesRef.current.add(messageId);
        
        const senderIdentity = message.from?.identity;
        const participant = getParticipant(senderIdentity);
        
        const notification: NotificationData = {
          id: messageId,
          message,
          participant,
          timestamp: Date.now(),
        };

        setNotifications((prev) => {
          // Limit to 3 notifications at once
          const updated = [...prev, notification];
          return updated.slice(-3);
        });
      });
    }

    lastMessageCountRef.current = messages.length;
  }, [messages, isChatOpen, participants]);

  const handleDismissNotification = (notificationId: string) => {
    setNotifications((prev) => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index,
          }}
        >
          <ChatNotification
            message={notification.message}
            participant={notification.participant}
            onDismiss={() => handleDismissNotification(notification.id)}
            onOpenChat={onOpenChat} // Pass the onOpenChat prop
          />
        </div>
      ))}
    </div>
  );
};

export default ChatNotificationManager;