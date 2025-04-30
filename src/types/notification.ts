export type StandardNotificationType = "success" | "error" | "info" | "warning";
export type NotificationType = StandardNotificationType | "custom";

export interface BaseNotification {
  id: string;
  duration?: number;
}

export interface StandardNotification extends BaseNotification {
  type: StandardNotificationType;
  message: string;
}

export interface CustomNotification extends BaseNotification {
  type: "custom";
  content: React.ReactNode;
}

export type Notification = StandardNotification | CustomNotification;
export type AddStandardNotificationPayload = Omit<StandardNotification, "id">;
export type AddCustomNotificationPayload = Omit<CustomNotification, "id">;
export type AddNotificationPayload = AddStandardNotificationPayload | AddCustomNotificationPayload;