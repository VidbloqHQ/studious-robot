import { createContext, useState, useCallback } from "react";
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
};

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (payload: AddNotificationPayload): string => {
      const id = Date.now().toString();
      const newNotification = { ...payload, id } as Notification;
      setNotifications((prev) => [...prev, newNotification]);
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
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ addNotification, removeNotification, updateNotification }}
    >
      {children}
      <div className="fixed top-4 right-4 w-72 space-y-4 z-50">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
