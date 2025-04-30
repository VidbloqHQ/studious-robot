import { useEffect } from "react";
import { Notification } from "../types";

type NotificationItemProps = {
  notification: Notification;
  onClose: () => void;
};

const NotificationItem = ({ notification, onClose }: NotificationItemProps) => {
  const bgColor = {
    success: "bg-green-100 border-green-500",
    error: "bg-red-100 border-red-500",
    info: "bg-blue-100 border-blue-500",
    warning: "bg-yellow-100 border-yellow-500",
    custom: "bg-gray-100 border-gray-500",
  }[notification.type];

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  return (
    <div
      className={`${bgColor} border-l-4 p-4 mb-4 rounded shadow-md animate-slideIn`}
    >
      {notification.type === "custom" ? (
        notification.content
      ) : (
        <div className="flex justify-between items-center">
          <p>{notification.message}</p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
