import { useEffect, useState, useRef } from "react";
import { Notification } from "../types";

type NotificationItemProps = {
  notification: Notification;
  onClose: () => void;
};

const NotificationItem = ({ notification, onClose }: NotificationItemProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const bgColor = {
    success: "bg-green-100 border-green-500",
    error: "bg-red-100 border-red-500",
    info: "bg-[var(--sdk-bg-primary-color)] border-primary",
    warning: "bg-yellow-100 border-yellow-500",
    custom: "bg-gray-100 border-gray-500",
  }[notification.type];

  // Handle close animation
  const handleClose = () => {
    if (isClosing) return; // Prevent multiple close attempts
    
    setIsClosing(true);
    // Wait for animation to complete before removing
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Set up auto-close timer
  useEffect(() => {
    // Don't auto-close if user is interacting
    if (isInteracting || !notification.duration || notification.duration <= 0) {
      return;
    }

    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    // Set new timeout
    closeTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, notification.duration);

    // Cleanup
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [notification.duration, isInteracting]);

  return (
    <div
      className={`${bgColor} border-l-4 p-4 rounded shadow-md transition-all duration-300 ${
        isClosing ? 'opacity-0 transform translate-x-full' : 'opacity-100 animate-slideIn'
      }`}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      style={{ pointerEvents: isClosing ? 'none' : 'auto' }}
    >
      {notification.type === "custom" ? (
        notification.content
      ) : (
        <div className="flex justify-between items-center gap-2">
          <p className="flex-1 text-sm">{notification.message}</p>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none p-1 focus:outline-none"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;