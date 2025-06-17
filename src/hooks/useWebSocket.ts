import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketHookOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
}

type EventListener<T = unknown> = (data: T) => void;

/**
 * React hook for managing a WebSocket connection
 */
export const useWebSocket = ({
  url,
  reconnectAttempts = 3,
  reconnectInterval = 5000,
  onOpen,
  onClose,
  onError,
}: WebSocketHookOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const listenersByEvent = useRef<Record<string, Set<EventListener>>>({});
  const lastConnectedTime = useRef<number>(0);
  const connectionAttemptInProgress = useRef<boolean>(false);
  const isUnmounting = useRef<boolean>(false);
  
  // Rate limiting for high-frequency events
  const lastEventTimes = useRef<Record<string, number>>({});
  const pendingMessagesCount = useRef<number>(0);
  const MAX_PENDING_MESSAGES = 50;

  /**
   * Send a message to the WebSocket server
   * @param event Event type
   * @param data Event data
   * @returns True if message was sent successfully, false otherwise
   */
  const sendMessage = useCallback(<T>(event: string, data: T): boolean => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    // Rate limiting for non-critical messages
    if (['ping', 'pong', 'timeSync'].includes(event) && 
        lastEventTimes.current[event] && 
        Date.now() - lastEventTimes.current[event] < 3000) {
      return false; // Skip non-critical messages if sent too frequently
    }
    
    // Update rate limit timestamp
    lastEventTimes.current[event] = Date.now();

    try {
      const message: WebSocketMessage<T> = { event, data };
      ws.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);

  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(() => {
    if (isUnmounting.current) {
      // console.log('Not connecting - component is unmounting');
      return;
    }
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      // console.log('WebSocket already connected');
      return;
    }
    
    if (connectionAttemptInProgress.current) {
      // console.log('Connection attempt already in progress');
      return;
    }

    if (reconnectCount.current >= reconnectAttempts) {
      // console.log(`Max reconnection attempts (${reconnectAttempts}) reached`);
      return;
    }

    connectionAttemptInProgress.current = true;
    // console.log(`Connecting to WebSocket at: ${url}`);
    // console.log(`Attempting to connect to WebSocket (attempt ${reconnectCount.current + 1}/${reconnectAttempts})...`);

    // Create new WebSocket connection
    ws.current = new WebSocket(url);

    // Setup event handlers
    ws.current.onopen = (event) => {
      // console.log('WebSocket connection established');
      setIsConnected(true);
      reconnectCount.current = 0;
      lastConnectedTime.current = Date.now();
      connectionAttemptInProgress.current = false;
      pendingMessagesCount.current = 0;
      
      // Trigger custom onOpen handler
      onOpen?.(event);
      
      // Dispatch a custom connect event that other components can listen for
      const connectEvent = new Event('connect');
      window.dispatchEvent(connectEvent);
    };

    ws.current.onclose = (event) => {
      // console.log('WebSocket connection closed');
      setIsConnected(false);
      connectionAttemptInProgress.current = false;
      
      // Trigger custom onClose handler
      onClose?.(event);

      // Only attempt to reconnect if not closing cleanly, within reconnect attempts,
      // and not during a component teardown (preventing reconnects during unmounts)
      const shouldReconnect = 
        !isUnmounting.current &&
        !event.wasClean && 
        reconnectCount.current < reconnectAttempts && 
        Date.now() - lastConnectedTime.current > 1000; // Don't reconnect if we just connected
        
      if (shouldReconnect) {
        reconnectCount.current++;
        // console.log(`Attempting to reconnect (${reconnectCount.current}/${reconnectAttempts})...`);
        setTimeout(connect, reconnectInterval);
      }
    };

    ws.current.onerror = (event) => {
      console.error('WebSocket error:', event);
      connectionAttemptInProgress.current = false;
      
      // Trigger custom onError handler
      onError?.(event);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        const { event: eventName, data } = message;
        
        // Skip processing high-frequency events that aren't critical 
        // and have been processed recently
        if (['ping', 'pong', 'timeSync'].includes(eventName)) {
          const now = Date.now();
          if (lastEventTimes.current[eventName] && 
              (now - lastEventTimes.current[eventName] < 1000)) {
            return; // Skip this message to avoid overwhelming the system
          }
          lastEventTimes.current[eventName] = now;
        }

        // Avoid processing too many messages at once
        if (pendingMessagesCount.current > MAX_PENDING_MESSAGES) {
          console.warn(`Too many pending messages (${pendingMessagesCount.current}), skipping`);
          return;
        }
        
        pendingMessagesCount.current++;
        
        // IMPORTANT: Use a functional update to avoid infinite loops
        setLastMessage(prevMessage => {
          // Only update if the message is different to avoid re-renders
          if (prevMessage && 
              prevMessage.event === message.event && 
              JSON.stringify(prevMessage.data) === JSON.stringify(message.data)) {
            pendingMessagesCount.current--;
            return prevMessage; // Return previous state to avoid re-render
          }
          pendingMessagesCount.current--;
          return message; // Only update if different
        });
        
        // Use a functional update for message history too
        // Only store important messages, not heartbeats
        if (!['ping', 'pong', 'timeSync'].includes(eventName)) {
          setMessageHistory(prev => {
            // Limit history size to avoid memory issues
            const newHistory = [...prev, message].slice(-50);
            return newHistory;
          });
        }
        
        // Trigger event listeners with safeguards
        // Don't process empty listener lists
        const listeners = listenersByEvent.current[eventName];
        if (!listeners || listeners.size === 0) return;
        
        // Use Array.from to avoid mutation issues during iteration
        Array.from(listeners).forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`Error in listener for event '${eventName}':`, error);
          }
        });
        
        // Handle ping messages automatically
        if (eventName === 'ping') {
          sendMessage('pong', {});
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, [url, reconnectAttempts, reconnectInterval, onOpen, onClose, onError, sendMessage]);

  /**
   * Disconnect from the WebSocket server
   */
  const disconnect = useCallback(() => {
    // Only disconnect if connection has been established for a longer time
    // Increase from 30 seconds to 60 seconds to reduce unnecessary disconnections
    if (ws.current && Date.now() - lastConnectedTime.current > 60000) {
      // console.log('Disconnecting WebSocket...');
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
    } else {
      // console.log('Skipping disconnect - connection too recent');
    }
  }, []);

  // Initialize connection with delay
  useEffect(() => {
    // Add debugging for mounting/unmounting
    // console.log("WebSocket hook mounted");
    isUnmounting.current = false;
    
    const timer = setTimeout(() => {
      connect();
    }, 1000); // 1-second delay before first connection attempt
      
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      // console.log("WebSocket hook unmounted");
      isUnmounting.current = true;
      clearTimeout(timer);
      
      // Significantly reduce disconnects during development cycles
      // Only disconnect if connection has been established for a long time
      if (ws.current && Date.now() - lastConnectedTime.current > 30000) {
        // console.log('Disconnecting WebSocket on unmount...');
        ws.current.close();
        ws.current = null;
      } else {
        // console.log('Skipping disconnect on unmount - connection too recent');
      }
    };
  }, [connect]);

  /**
   * Add an event listener for a specific event type
   * @param event Event type
   * @param listener Callback function
   */
  const addEventListener = useCallback(<T>(event: string, listener: EventListener<T>) => {
    if (!listenersByEvent.current[event]) {
      listenersByEvent.current[event] = new Set();
    }
    // Type assertion needed since we're storing listeners for various event types
    listenersByEvent.current[event].add(listener as EventListener);
    
    // console.log(`Added listener for event '${event}', total listeners: ${listenersByEvent.current[event].size}`);
  }, []);

  /**
   * Remove an event listener for a specific event type
   * @param event Event type
   * @param listener Callback function
   */
  const removeEventListener = useCallback(<T>(event: string, listener: EventListener<T>) => {
    const listeners = listenersByEvent.current[event];
    if (listeners) {
      // Type assertion needed since we're storing listeners for various event types
      listeners.delete(listener as EventListener);
      // console.log(`Removed listener for event '${event}', remaining listeners: ${listeners.size}`);
      
      if (listeners.size === 0) {
        delete listenersByEvent.current[event];
      }
    }
  }, []);

  /**
   * Join a room in the WebSocket server
   * @param roomName Room name
   * @param participantId Participant ID
   */
  const joinRoom = useCallback((roomName: string, participantId: string) => {
    // console.log(`Joining room ${roomName} with identity ${participantId}`);
    return sendMessage('joinRoom', { roomName, participantId });
  }, [sendMessage]);

  /**
   * Request to speak in a room
   * @param roomName Room name
   * @param participantId Participant ID
   * @param name Participant display name
   * @param walletAddress Participant wallet address
   */
  const requestToSpeak = useCallback((
    roomName: string, 
    participantId: string, 
    name: string, 
    walletAddress: string
  ) => {
    // console.log(`Requesting to speak in room ${roomName} with identity ${participantId}`);
    return sendMessage('requestToSpeak', {
      roomName,
      participantId,
      name,
      walletAddress
    });
  }, [sendMessage]);

  /**
   * Raise hand in a meeting
   * @param roomName Room name
   * @param participantId Participant ID
   * @param name Participant display name
   * @param walletAddress Participant wallet address
   */
  const raiseHand = useCallback((
    roomName: string, 
    participantId: string, 
    name: string, 
    walletAddress: string
  ) => {
    // console.log(`Raising hand in room ${roomName} for participant ${participantId}`);
    return sendMessage('raiseHand', {
      roomName,
      participantId,
      name,
      walletAddress
    });
  }, [sendMessage]);

  /**
   * Lower hand in a meeting
   * @param roomName Room name
   * @param participantId Participant ID
   */
  const lowerHand = useCallback((
    roomName: string, 
    participantId: string
  ) => {
    // console.log(`Lowering hand in room ${roomName} for participant ${participantId}`);
    return sendMessage('lowerHand', {
      roomName,
      participantId
    });
  }, [sendMessage]);

  /**
   * Acknowledge a raised hand (for hosts)
   * @param roomName Room name
   * @param participantId Participant ID to acknowledge
   */
  const acknowledgeHand = useCallback((
    roomName: string, 
    participantId: string
  ) => {
    // console.log(`Acknowledging raised hand for ${participantId} in room ${roomName}`);
    return sendMessage('acknowledgeHand', {
      roomName,
      participantId
    });
  }, [sendMessage]);

  /**
   * Invite a guest to speak
   * @param roomName Room name
   * @param participantId Participant ID to invite
   */
  const inviteGuest = useCallback((roomName: string, participantId: string) => {
    return sendMessage('inviteGuest', { roomName, participantId });
  }, [sendMessage]);

  /**
   * Return a temp-host to guest
   * @param roomName Room name
   * @param participantId Participant ID to demote
   */
  const returnToGuest = useCallback((roomName: string, participantId: string) => {
    return sendMessage('returnToGuest', { roomName, participantId });
  }, [sendMessage]);

  /**
   * Mark an action as executed
   * @param roomName Room name
   * @param actionId Action ID
   */
  const actionExecuted = useCallback((roomName: string, actionId: string) => {
    return sendMessage('actionExecuted', { roomName, actionId });
  }, [sendMessage]);

  /**
   * Send a reaction to the room
   * @param roomName Room name
   * @param reaction Reaction type
   * @param sender Sender information
   */
  const sendReaction = useCallback(<T>(roomName: string, reaction: string, sender: T) => {
    return sendMessage('sendReaction', { roomName, reaction, sender });
  }, [sendMessage]);

  /**
   * Start an addon
   * @param type Addon type
   * @param data Addon data
   */
  const startAddon = useCallback(<T>(type: "Custom" | "Q&A" | "Poll" | "Quiz", data?: T) => {
    return sendMessage('startAddon', { type, data });
  }, [sendMessage]);

  /**
   * Stop an addon
   * @param type Addon type
   */
  const stopAddon = useCallback((type: "Custom" | "Q&A" | "Poll" | "Quiz") => {
    return sendMessage('stopAddon', type);
  }, [sendMessage]);

  return {
    isConnected,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sendMessage,
    addEventListener,
    removeEventListener,
    joinRoom,
    requestToSpeak,
    raiseHand,
    lowerHand,
    acknowledgeHand,
    inviteGuest,
    returnToGuest,
    actionExecuted,
    sendReaction,
    startAddon,
    stopAddon,
  };
};