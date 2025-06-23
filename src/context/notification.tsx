import { createContext, useState, useCallback, useRef, useEffect } from "react";
import {
  AddNotificationPayload,
  Notification,
  CustomNotification,
  StandardNotification,
} from "../types";
import NotificationItem from "../components/notification-item";

export interface NotificationContextType {
  addNotification: (notification: AddNotificationPayload) => string;
  updateNotification: (
    id: string,
    updatedNotification: Partial<
      Omit<StandardNotification, "id" | "type"> &
        Omit<CustomNotification, "id" | "type">
    >
  ) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

// Generate truly unique IDs
let notificationCounter = 0;
const generateNotificationId = (): string => {
  return `notification-${Date.now()}-${notificationCounter++}-${Math.random().toString(36).substr(2, 9)}`;
};

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Track active timeouts for cleanup
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Track notification deduplication
  const recentNotifications = useRef<Map<string, number>>(new Map());
  const DEDUP_WINDOW = 500; // milliseconds
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const addNotification = useCallback(
    (payload: AddNotificationPayload): string => {
      // Create a deduplication key based on type and message/content
      const dedupKey = payload.type === 'custom' 
        ? `custom-${Date.now()}` // Custom notifications are always unique
        : `${payload.type}-${payload.message}`;
      const now = Date.now();
      
      // Check if we've recently shown this notification
      const lastShown = recentNotifications.current.get(dedupKey);
      if (lastShown && now - lastShown < DEDUP_WINDOW) {
        console.log('Skipping duplicate notification:', dedupKey);
        return ''; // Return empty string for duplicate
      }
      
      // Update recent notifications tracker
      recentNotifications.current.set(dedupKey, now);
      
      // Clean up old entries after 1 second
      setTimeout(() => {
        recentNotifications.current.delete(dedupKey);
      }, 1000);
      
      const id = generateNotificationId();
      const newNotification = { ...payload, id } as Notification;
      
      setNotifications((prev) => {
        // Limit total notifications to prevent overflow
        const MAX_NOTIFICATIONS = 10;
        const updated = [...prev, newNotification];
        if (updated.length > MAX_NOTIFICATIONS) {
          // Remove oldest notifications and their timeouts
          const removed = updated.slice(0, updated.length - MAX_NOTIFICATIONS);
          removed.forEach(notification => {
            const timeout = timeoutRefs.current.get(notification.id);
            if (timeout) {
              clearTimeout(timeout);
              timeoutRefs.current.delete(notification.id);
            }
          });
          return updated.slice(-MAX_NOTIFICATIONS);
        }
        return updated;
      });
      
      // Set up auto-removal timeout if duration is specified
      if (payload.duration && payload.duration > 0) {
        const timeout = setTimeout(() => {
          removeNotification(id);
        }, payload.duration);
        timeoutRefs.current.set(id, timeout);
      }
      
      return id;
    },
    []
  );

  const updateNotification = useCallback(
    (
      id: string,
      updatedNotification: Partial<
        Omit<StandardNotification, "id" | "type"> &
          Omit<CustomNotification, "id" | "type">
      >
    ) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, ...updatedNotification }
            : notification
        )
      );
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    // Clear any associated timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ addNotification, removeNotification, updateNotification }}
    >
      {children}
      <div className="fixed top-4 right-4 w-72 space-y-2 z-50 max-h-[80vh] overflow-hidden">
        <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-1rem)] pr-2 custom-scrollbar">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};