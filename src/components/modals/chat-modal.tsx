/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from "react";
import { ReceivedChatMessage } from "@livekit/components-react";

import { useCustomChat } from "../../hooks/index";
import { Participant } from "../../types/index";
import { Modal } from "../base";
import { Icon } from "../icons";
import { LocalParticipant } from "livekit-client";

// Update the FormattedChatMessage type to include the fields we need
interface FormattedChatMessage extends ReceivedChatMessage {
  participant?: Participant;
  parsedContent?: React.ReactNode;
  from?: LocalParticipant ;
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

  // Helper function to get participant from message
  const getParticipant = (identity?: string): Participant | undefined => {
    if (!identity) return undefined;
    return participants.find(
      (p) => p.id === identity || p.userName === identity
    );
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
            const senderIdentity = chat.from?.identity || "Unknown";
            const senderParticipant = getParticipant(senderIdentity);

            return (
              <div key={index} className="mb-3 flex items-start">
                {/* Participant Avatar */}
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {senderParticipant?.avatarUrl ? (
                      <img
                        src={senderParticipant.avatarUrl}
                        alt={`${senderParticipant.userName}'s avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {(senderParticipant?.userName || senderIdentity)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1">
                  <div className="font-semibold">
                    {senderParticipant?.userName || senderIdentity}
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

        {/* {showChat && (
          <Modal
            onClose={() => setShowChat(false)}
            position="right"
            childClassName="bg-[var(--sdk-bg-primary-color)] h-full w-[70%] lg:w-1/4 rounded-l-xl"
          >
            <div className="flex flex-col h-[calc(100vh-100px)] overflow-y-auto">
              <div className="flex-1 overflow-y-auto p-4 h-full">
                {getFormattedMessages(chatMessages).map((chat, index) => (
                  <div key={index} className="mb-3">
                    <div className="font-semibold">
                      {chat.from?.identity || "Unknown"}
                    </div>
                    <div className="mt-1 break-words">
                      {chat.parsedContent || chat.message}
                    </div>
                  </div>
                ))}
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
        )} */}