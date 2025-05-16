import React, { useState } from "react";
import BaseCallControls, {
  CallControlsRenderProps,
} from "./base-call-controls";
import { Icon } from "./icons";
import { isMobileDevice } from "../utils";
import { useParticipantList } from "../hooks";
import {
  MicrophoneControl,
  ScreenShareControl,
  RecordControl,
  CameraControl,
} from "./audio-video-controls";
import { Modal } from "./base/index";
import { ChatModal, ParticipantListModal, ShareModal } from "./modals/index";
import Reactions from "./reactions";

export type CallControlsProps = {
  className?: string;
  style?: React.CSSProperties;
  components?: {
    MicButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
    CameraButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
    ScreenShareButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
    RaiseHandButton?: React.FC<{ requested: boolean; request: () => void }>;
    ChatButton?: React.FC<{ onClick: () => void }>;
    EndCallButton?: React.FC<{ onClick: () => void }>;
    AgendaButton?: React.FC<{ onClick: () => void }>;
    ReactionsButton?: React.FC<{ onClick: () => void }>;
    RecordButton?: React.FC<{ isRecording: boolean; toggle: () => void }>;
  };
  onRaiseHand?: () => void;
  onReturnToGuest?: () => void;
  onDisconnect?: () => void;
  onAgendaToggle?: () => void;
  onChatToggle?: () => void;
  onReactionsToggle?: () => void;
  onRecordToggle?: () => void;
};

/**
 * CallControls provides a customizable UI for stream call controls
 * Uses the BaseCallControls headless component for functionality
 */
const CallControls: React.FC<CallControlsProps> = ({
  className = "",
  style,
  components,
  onRaiseHand,
  onReturnToGuest,
  onDisconnect,
  onAgendaToggle,
  onChatToggle,
  onReactionsToggle,
  onRecordToggle,
}) => {
  const { participants, count } = useParticipantList();

  const [showLink, setShowLink] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showParticipantList, setShowParticipantList] =
    useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [showReactions, setShowReactions] = useState<boolean>(false);

  const handleReactionsToggle = () => {
    setShowReactions(!showReactions);
    if (onReactionsToggle) {
      onReactionsToggle();
    }
  };

  const renderCallControls = (props: CallControlsRenderProps) => {
    const {
      canAccessMediaControls,
      isGuest,
      hasPendingRequest,
      isCameraEnabled,
      isMicEnabled,
      isScreenSharingEnabled,
      isRecording,
      handleDisconnectClick,
      requestToSpeak,
      userType,
      toggleMic,
      toggleScreenShare,
      toggleRecording,
    } = props;

    return (
      <>
        <ShareModal isOpen={showLink} onClose={() => setShowLink(false)} />
        <ParticipantListModal
          isOpen={showParticipantList}
          onClose={() => setShowParticipantList(false)}
        />
        {showMobileMenu && (
          <Modal
            onClose={() => setShowMobileMenu(false)}
            position="bottom"
            childClassName="bg-[var(--sdk-bg-primary-color)] h-auto w-full rounded-t-xl"
          >
            <div className="flex flex-row justify-between items-center w-[88%] mx-auto p-2">
              <div
                className="bg-[var(--sdk-bg-primary-color)] border flex flex-row lg:hidden items-center justify-between p-0.5 rounded-2xl gap-x-2 cursor-pointer"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowParticipantList(true);
                }}
              >
                <span>{count}</span>
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="users" className="text-primary" />
                </div>
              </div>
              <div
                className="bg-[var(--sdk-bg-primary-color)] border flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 cursor-pointer"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowLink(true);
                }}
              >
                <Icon name="circle" className="text-[#F5F5F5]" size={12} />
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="link" className="text-primary" />
                </div>
              </div>
              <div
                className="bg-[var(--sdk-bg-primary-color)] p-0.5 rounded-2xl cursor-pointer h-[50px] w-[50px]"
                // onClick={onReactionsToggle}
              >
                {components?.ReactionsButton ? (
                  <components.ReactionsButton
                    onClick={onReactionsToggle || (() => {})}
                  />
                ) : (
                  <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center" onClick={handleReactionsToggle}>
                    <Icon name="smiley" className="text-yellow-400" />
                  </div>
                )}
              </div>
              <div
                className="bg-[var(--sdk-bg-primary-color)]  p-0.5 rounded-2xl cursor-pointer h-[50px] w-[50px]"
                // onClick={onChatToggle}
              >
                {components?.ChatButton ? (
                  <components.ChatButton onClick={onChatToggle || (() => {})} />
                ) : (
                  <div
                    className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowChat(true);
                    }}
                  >
                    <Icon name="chat" className="text-primary" />
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          participants={participants}
        />
        <Reactions showReactions={showReactions} />
        <div className={`w-full max-6xl mx-auto ${className}`} style={style}>
          <div className="flex items-center justify-between">
            {/* Left group - Link and Menu icons */}

            <div className="bg-[#F2EFFE] rounded-full lg:py-2 lg:px-3 flex items-center space-x-2">
              <div
                className="bg-[var(--sdk-bg-primary-color)] hidden lg:flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 cursor-pointer"
                onClick={() => setShowLink(true)}
              >
                <Icon name="circle" className="text-[#F5F5F5]" size={12} />
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="link" className="text-primary" />
                </div>
              </div>
              <div
                className="bg-[var(--sdk-bg-primary-color)] hidden flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2"
                onClick={onAgendaToggle}
              >
                <Icon name="circle" className="text-[#F5F5F5]" size={12} />
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="more" className="text-primary" />
                </div>
              </div>
              <div
                className="bg-[var(--sdk-bg-primary-color)] hidden lg:flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2 cursor-pointer"
                onClick={() => setShowParticipantList(true)}
              >
                <span>{count}</span>
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="users" className="text-primary" />
                </div>
              </div>
            </div>

            {/* Record button */}
            <div className="hidden lg:block">
              {userType === "host" &&
                (components?.RecordButton ? (
                  <components.RecordButton
                    isRecording={isRecording}
                    toggle={toggleRecording}
                  />
                ) : (
                  <RecordControl
                    isRecording={isRecording}
                    toggleRecording={toggleRecording}
                    showLabel={false}
                  />
                ))}
            </div>

            {/* Icon group - main middle section */}
            <div className="bg-secondary-light [#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
              {/* Raise hand */}
              {isGuest && !hasPendingRequest && (
                <div
                  className="bg-[var(--sdk-bg-primary-color)] p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
                  onClick={requestToSpeak}
                >
                  {components?.RaiseHandButton ? (
                    <components.RaiseHandButton
                      requested={false}
                      request={requestToSpeak}
                    />
                  ) : (
                    <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                      <Icon name="hand" className="text-primary" />
                    </div>
                  )}
                </div>
              )}

              {isGuest && hasPendingRequest && (
                <div className="bg-[var(--sdk-bg-primary-color)] p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
                  {components?.RaiseHandButton ? (
                    <components.RaiseHandButton
                      requested={true}
                      request={() => {}}
                    />
                  ) : (
                    <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                      <Icon name="hand" className="text-green-500" />
                    </div>
                  )}
                </div>
              )}

              {/* Screen share isMobileDevice() */}
              {canAccessMediaControls &&
                !isMobileDevice() &&
                (components?.ScreenShareButton ? (
                  <components.ScreenShareButton
                    enabled={isScreenSharingEnabled}
                    toggle={toggleScreenShare}
                  />
                ) : (
                  <ScreenShareControl
                    showLabel={false}
                    onChange={() => toggleScreenShare()}
                  />
                ))}

              {/* Microphone */}

              {canAccessMediaControls &&
                (components?.MicButton ? (
                  <components.MicButton
                    enabled={isMicEnabled}
                    toggle={toggleMic}
                  />
                ) : (
                  <MicrophoneControl showLabel={false} />
                ))}

              {canAccessMediaControls &&
                (components?.CameraButton ? (
                  <div className="bg-[var(--sdk-bg-primary-color)] flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
                    <components.CameraButton
                      enabled={isCameraEnabled}
                      toggle={() => {}}
                    />
                  </div>
                ) : (
                  <CameraControl
                    showLabel={false}
                    onError={(error) => console.error("Camera error:", error)}
                  />
                ))}

              {/* Reactions */}
              <div
                className={`p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px] ${
                  showReactions
                    ? "bg-primary"
                    : "bg-[var(--sdk-bg-primary-color)]"
                } `}
              >
                {components?.ReactionsButton ? (
                  <components.ReactionsButton
                    onClick={onReactionsToggle || (() => {})}
                  />
                ) : (
                  <div
                    className={` rounded-2xl h-full flex flex-col items-center justify-center
                      ${showReactions ? "bg-primary" : "bg-[#DCCCF63D]"}
                      `}
                    onClick={handleReactionsToggle}
                  >
                    <Icon name="smiley" className="text-yellow-400" />
                  </div>
                )}
              </div>

              <div
                className="bg-[var(--sdk-bg-primary-color)] border flex flex-row lg:hidden items-center justify-between p-0.5 rounded-2xl gap-x-2 cursor-pointer"
                onClick={() => setShowMobileMenu(true)}
              >
                <Icon name="circle" className="text-[#F5F5F5] hidden" size={12} />
                <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                  <Icon name="more" className="text-primary" />
                </div>
              </div>
              {/* Chat */}
              <div
                className="bg-[var(--sdk-bg-primary-color)] hidden lg:block p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
                // onClick={onChatToggle}
                onClick={() => setShowChat(true)}
              >
                {components?.ChatButton ? (
                  <components.ChatButton onClick={onChatToggle || (() => {})} />
                ) : (
                  <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                    <Icon name="chat" className="text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* End call button */}
            <div
              className="rounded-2xl p-0.5 bg-[#D40000] flex flex-row text-white items-center gap-x-2 cursor-pointer"
              onClick={handleDisconnectClick}
            >
              {components?.EndCallButton ? (
                <components.EndCallButton onClick={handleDisconnectClick} />
              ) : (
                <>
                  <span className="ml-2 hidden lg:block">End</span>
                  <div className="rounded-2xl bg-[#FF5555] p-2">
                    <Icon name="phone" className="text-white" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <BaseCallControls
      onRaiseHand={onRaiseHand}
      onReturnToGuest={onReturnToGuest}
      onDisconnect={onDisconnect}
      onAgendaToggle={onAgendaToggle}
      onChatToggle={onChatToggle}
      onReactionsToggle={onReactionsToggle}
      onRecordToggle={onRecordToggle}
      render={renderCallControls}
    />
  );
};

export default CallControls;
