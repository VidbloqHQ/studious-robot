import { useState, useCallback, useEffect } from "react";
import { 
  useChat as useLivekitChat, 
  ReceivedChatMessage 
} from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
import { Participant } from "../types";


// Extend the ReceivedChatMessage to create our FormattedChatMessage
export interface FormattedChatMessage extends ReceivedChatMessage {
  participant?: Participant;
  parsedContent?: React.ReactNode;
}

export interface ChatOptions {
  participants: Participant[];
  room?: Room;
  onMessageSent?: (message: string) => void;
  onMessageReceived?: (message: ReceivedChatMessage) => void;
  parsers?: MessageParser[];
}

// Interface for message parsers
export interface MessageParser {
  id: string; // Unique identifier for the parser
  priority: number; // Higher priority parsers run first
  parse: (text: string, participants: Participant[]) => React.ReactNode;
}

// Return type for our custom hook
export interface CustomChatHook {
  // Original LiveKit chat properties and methods
  send: (message: string) => void;
  isSending: boolean;
  chatMessages: ReceivedChatMessage[];
  
  // Custom state and methods
  message: string;
  setMessage: (message: string) => void;
  handleMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  sendMessage: () => boolean;
  findParticipant: (identity?: string) => Participant | undefined;
  getFormattedMessages: (messages?: ReceivedChatMessage[]) => FormattedChatMessage[];
  parseMessageContent: (text: string) => React.ReactNode;
  error: Error | null;
  isReady: boolean;
}

/**
 * Custom chat hook that extends LiveKit's useChat hook
 * 
 * @param options Configuration options for the chat hook
 * @returns Chat methods and state
 */
export const useCustomChat = (options: ChatOptions): CustomChatHook => {
  const { 
    participants = [], 
    room, 
    onMessageSent, 
    onMessageReceived,
    parsers = [] 
  } = options;
  
  // Use LiveKit's chat hook
  const liveKitChat = useLivekitChat();
  
  // Local state
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState<boolean>(!!liveKitChat);
  
  // Effect to check if the hook is properly initialized
  useEffect(() => {
    if (!liveKitChat) {
      setError(new Error("LiveKit chat hook not initialized correctly"));
      setIsReady(false);
    } else {
      setIsReady(true);
      setError(null);
    }
  }, [liveKitChat]);
  
  // Listen for room events if room is provided
  useEffect(() => {
    if (!room) return;
    
    const handleMessageReceived = (message: ReceivedChatMessage) => {
      if (onMessageReceived) {
        onMessageReceived(message);
      }
    };
    
    // You might need to adapt this based on LiveKit's actual event API
    room.on(RoomEvent.DataReceived, handleMessageReceived);
    
    return () => {
      room.off(RoomEvent.DataReceived, handleMessageReceived);
    };
  }, [room, onMessageReceived]);
  
  // Helper function to find participant by identity
  const findParticipant = useCallback((identity?: string): Participant | undefined => {
    if (!identity) return undefined;
    return participants.find(p => p.userName === identity || p.id === identity);
  }, [participants]);
  
  // Parse message content using provided parsers
  const parseMessageContent = useCallback((text: string): React.ReactNode => {
    if (!text) return null;
    
    // Sort parsers by priority (highest first)
    const sortedParsers = [...parsers].sort((a, b) => b.priority - a.priority);
    
    // Apply parsers in order
    let result: React.ReactNode = text;
    for (const parser of sortedParsers) {
      try {
        const parsed = parser.parse(text, participants);
        if (parsed) {
          result = parsed;
          break; // Use the first successful parser
        }
      } catch (err) {
        console.warn(`Parser ${parser.id} failed:`, err);
      }
    }
    
    return result;
  }, [parsers, participants]);
  
  // Handle input change
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);
  
  // Handle enter key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [message]);
  
  // Send a message and clear the input
  const sendMessage = useCallback(() => {
    if (!isReady) {
      setError(new Error("Chat is not ready"));
      return false;
    }
    
    if (message.trim()) {
      try {
        liveKitChat.send(message);
        
        // Call the onMessageSent callback if provided
        if (onMessageSent) {
          onMessageSent(message);
        }
        
        setMessage("");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to send message"));
        return false;
      }
    }
    return false;
  }, [message, liveKitChat, isReady, onMessageSent]);
  
  // Format messages with participant info - explicitly typed for TypeScript
  const getFormattedMessages = useCallback((messages: ReceivedChatMessage[] = liveKitChat.chatMessages): FormattedChatMessage[] => {
    return messages.map(msg => {
      // Create a properly typed FormattedChatMessage
      const formattedMsg: FormattedChatMessage = {
        ...msg,
        participant: findParticipant(msg.from?.identity),
        parsedContent: parseMessageContent(msg.message)
      };
      return formattedMsg;
    });
  }, [liveKitChat.chatMessages, findParticipant, parseMessageContent]);
  
  return {
    // Original LiveKit chat methods and properties
    ...liveKitChat,
    
    // Custom state and methods
    message,
    setMessage,
    handleMessageChange,
    handleKeyDown,
    sendMessage,
    findParticipant,
    getFormattedMessages,
    parseMessageContent,
    error,
    isReady,
  };
};

export default useCustomChat;