// import React, { useRef, useEffect } from "react";
// import { useChat, type Participant } from "@vidbloq/react";
// import Modal from "../ui/v-modal";
// import { Icon } from "../icons";

// // SDK-specific message interface that matches FormattedChatMessage structure
// interface SDKChatMessage {
//   id?: string;
//   message: string;
//   parsedContent?: React.ReactNode;
//   participant?: Participant;
//   timestamp: number;
//   from?: {
//     identity: string;
//     metadata?: string;
//   };
// }

// type ChatModalProps = {
//   participants: Participant[];
//   isOpen: boolean;
//   onClose: () => void;
// };

// const ChatModal = ({ participants, isOpen, onClose }: ChatModalProps) => {
//   // Use the custom chat hook
//   const {
//     message,
//     handleMessageChange,
//     handleKeyDown,
//     sendMessage,
//     getFormattedMessages,
//     chatMessages,
//   } = useChat({
//     participants,
//   });

//   // Reference to the message container for auto-scrolling
//   const messageContainerRef = useRef<HTMLDivElement>(null);

//   // Auto-scroll to bottom when new messages arrive
//   useEffect(() => {
//     if (messageContainerRef.current) {
//       messageContainerRef.current.scrollTop =
//         messageContainerRef.current.scrollHeight;
//     }
//   }, [chatMessages]);

//   // Format messages with proper typing
//   const formattedMessages: SDKChatMessage[] = getFormattedMessages(chatMessages);

//   // Helper function to get participant info from message
//   const getParticipantInfo = (chat: SDKChatMessage) => {
//     // First priority: use participant from message if available
//     if (chat.participant) {
//       return {
//         userName: chat.participant.userName || "Unknown User",
//         avatarUrl: chat.participant.avatarUrl || "",
//         identity: chat.participant.id
//       };
//     }
    
//     // Second priority: try to find participant by identity
//     const identity = chat.from?.identity;
//     if (identity) {
//       const participant = participants.find(p => p.id === identity);
//       if (participant) {
//         return {
//           userName: participant.userName || "Unknown User",
//           avatarUrl: participant.avatarUrl || "",
//           identity: participant.id
//         };
//       }
//     }
    
//     // Third priority: try to parse from metadata
//     if (chat.from?.metadata) {
//       try {
//         const metadata = JSON.parse(chat.from.metadata);
//         return {
//           userName: metadata.userName || chat.from.identity || "Unknown User",
//           avatarUrl: metadata.avatarUrl || "",
//           identity: chat.from.identity
//         };
//       } catch (error) {
//         console.warn("Failed to parse participant metadata:", error);
//       }
//     }
    
//     // Fallback
//     return {
//       userName: chat.from?.identity || "Unknown User",
//       avatarUrl: "",
//       identity: chat.from?.identity
//     };
//   };

//   // Only render if modal is open
//   if (!isOpen) return null;
  
//   return (
//     <Modal
//       onClose={onClose}
//       position="right"
//       childClassName="bg-[var(--sdk-bg-primary-color)] h-full w-[70%] lg:w-1/4 rounded-l-xl"
//     >
//       <div className="flex flex-col h-[calc(100vh-100px)] overflow-y-auto">
//         <div
//           ref={messageContainerRef}
//           className="flex-1 overflow-y-auto p-4 h-full"
//         >
//           {formattedMessages.map((chat, index) => {
//             const { userName, avatarUrl } = getParticipantInfo(chat);

//             return (
//               <div key={chat.id || index} className="mb-3 flex items-start">
//                 {/* Participant Avatar */}
//                 <div className="flex-shrink-0 mr-2">
//                   <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
//                     {avatarUrl ? (
//                       <img
//                         src={avatarUrl}
//                         alt={`${userName}'s avatar`}
//                         className="w-full h-full object-cover"
//                       />
//                     ) : (
//                       <span className="text-sm font-medium text-gray-600">
//                         {userName ? userName.charAt(0).toUpperCase() : '?'}
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* Message Content */}
//                 <div className="flex-1">
//                   <div className="font-semibold text-gray-900">
//                     {userName}
//                   </div>
//                   <div className="mt-1 break-words text-gray-700">
//                     {chat.parsedContent || chat.message}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         <div className="p-4 absolute bottom-0 left-0 right-0 bg-[var(--sdk-bg-primary-color)]">
//           <div className="flex items-center border border-primary rounded-xl p-1">
//             <input
//               type="text"
//               className="flex-1 focus:outline-none px-3 py-2 bg-transparent"
//               placeholder="Say something..."
//               value={message}
//               onChange={handleMessageChange}
//               onKeyDown={handleKeyDown}
//             />
//             <div
//               onClick={sendMessage}
//               className="bg-primary p-2 rounded-xl flex flex-col items-center cursor-pointer hover:opacity-90 transition-opacity"
//             >
//               <Icon name="send" size={20} className="text-text-primary" />
//             </div>
//           </div>
//         </div>
//       </div>
//     </Modal>
//   );
// };

// export default ChatModal;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from "react";
import { ReceivedChatMessage } from "@livekit/components-react";
import { LocalParticipant } from "livekit-client";

import { useCustomChat } from "../../../hooks/index";
import { Participant } from "../../../types/index";
import { Modal } from "../../base";
import { Icon } from "../../icons";

// Update the FormattedChatMessage type to include the fields we need
interface FormattedChatMessage extends ReceivedChatMessage {
  participant?: Participant;
  parsedContent?: React.ReactNode;
  from?: LocalParticipant;
}

type ChatModalProps = {
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
};

const ChatModal = ({ participants, isOpen, onClose }: ChatModalProps) => {
  // Use the custom chat hook
  const {
    message,
    handleMessageChange,
    handleKeyDown,
    sendMessage,
    getFormattedMessages,
    chatMessages,
  } = useCustomChat({
    participants,
  });

  // Reference to the message container for auto-scrolling
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Format messages with proper typing
  const formattedMessages: FormattedChatMessage[] =
    getFormattedMessages(chatMessages);

  // Helper function to get participant info from message
  const getParticipantInfo = (chat: FormattedChatMessage) => {
    const identity = chat.from?.identity;
    
    // First try to find participant by ID (since identity is now participant.id)
    const participant = participants.find(p => p.id === identity);
    
    // If found in participants array, use that data
    let userName = participant?.userName;
    let avatarUrl = participant?.avatarUrl;
    
    // Try to extract from LiveKit participant metadata if participant not found in our list
    if (!participant && chat.from?.metadata) {
      try {
        const metadata = JSON.parse(chat.from.metadata);
        userName = metadata.userName || "Unknown User";
        avatarUrl = metadata.avatarUrl;
      } catch (error) {
        console.warn("Failed to parse participant metadata:", error);
        userName = "Unknown User";
      }
    }
    
    // Fallback if we still don't have a username
    if (!userName) {
      userName = "Unknown User";
    }
    
    return {
      userName,
      avatarUrl,
      identity
    };
  };

  // Only render if modal is open
  if (!isOpen) return null;
  
  return (
    <Modal
      onClose={onClose}
      position="right"
      childClassName="bg-[var(--sdk-bg-primary-color)] h-full w-[70%] lg:w-1/4 rounded-l-xl"
    >
      <div className="flex flex-col h-[calc(100vh-100px)] overflow-y-auto">
        <div
          ref={messageContainerRef}
          className="flex-1 overflow-y-auto p-4 h-full"
        >
          {formattedMessages.map((chat, index) => {
            const { userName, avatarUrl } = getParticipantInfo(chat);

            return (
              <div key={index} className="mb-3 flex items-start">
                {/* Participant Avatar */}
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${userName}'s avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1">
                  <div className="font-semibold">
                    {userName}
                  </div>
                  <div className="mt-1 break-words">
                    {(chat as any).parsedContent || (chat as any).message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 absolute bottom-0 left-0 right-0 bg-[var(--sdk-bg-primary-color)]">
          <div className="flex items-center border border-primary rounded-xl p-1">
            <input
              type="text"
              className="flex-1 focus:outline-none"
              placeholder="Say something..."
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
            />
            <div
              onClick={sendMessage}
              className="bg-primary p-2 rounded-xl flex flex-col items-center cursor-pointer"
            >
              <Icon name="send" size={20} className="text-text-primary" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChatModal;