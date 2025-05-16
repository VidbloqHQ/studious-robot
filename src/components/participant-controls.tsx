import React, { useState, useEffect } from "react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";
import { Icon } from "./icons";
import {
  checkParticipantMicEnabled,
  checkParticipantCameraEnabled,
} from "../utils/index";
import { useParticipantList, useNotification } from "../hooks/index";
import { Participant } from "../types/index";
import { SendModal } from "./modals/index";

export type ParticipantControlsProps = {
  participant: LocalParticipant | RemoteParticipant;
  isLocal?: boolean;
  isMicrophoneEnabled?: boolean;
  isCameraEnabled?: boolean;
  className?: string;
  showAudio?: boolean;
  showVideo?: boolean;
  showGift?: boolean;
  onGiftClick?: (participant: LocalParticipant | RemoteParticipant) => void;
};

/**
 * ParticipantControls component - displays control icons on participant tiles
 * Shows audio, video status and gift button
 */
const ParticipantControls: React.FC<ParticipantControlsProps> = ({
  participant,
  isLocal = false,
  isMicrophoneEnabled = false,
  isCameraEnabled = false,
  className = "",
  showAudio = true,
  showVideo = true,
  showGift = true,
  onGiftClick,
}) => {
  // Track local state
  const [localMicEnabled, setLocalMicEnabled] = useState(
    isLocal ? checkParticipantMicEnabled(participant) : isMicrophoneEnabled
  );
  const [localCameraEnabled, setLocalCameraEnabled] = useState(
    isLocal ? checkParticipantCameraEnabled(participant) : isCameraEnabled
  );

  // Add states for the SendModal
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  // Get participants list for method 2 lookup
  const { participants } = useParticipantList();

  // Optional: Get notification service if you want to show errors
  const { addNotification } = useNotification();

  // For local participants, monitor track state changes
  useEffect(() => {
    if (!isLocal) return;

    const handleTrackMuted = () => {
      setLocalMicEnabled(checkParticipantMicEnabled(participant));
      setLocalCameraEnabled(checkParticipantCameraEnabled(participant));
    };

    const handleTrackUnmuted = () => {
      setLocalMicEnabled(checkParticipantMicEnabled(participant));
      setLocalCameraEnabled(checkParticipantCameraEnabled(participant));
    };

    participant.on("trackMuted", handleTrackMuted);
    participant.on("trackUnmuted", handleTrackUnmuted);

    return () => {
      participant.off("trackMuted", handleTrackMuted);
      participant.off("trackUnmuted", handleTrackUnmuted);
    };
  }, [isLocal, participant]);

  // Update from props for remote participants
  useEffect(() => {
    if (!isLocal) {
      setLocalMicEnabled(isMicrophoneEnabled);
      setLocalCameraEnabled(isCameraEnabled);
    }
  }, [isLocal, isMicrophoneEnabled, isCameraEnabled]);

  // Handle gift click with the hybrid approach
  const handleGiftClick = () => {
    if (onGiftClick) {
      onGiftClick(participant);
    }

    // Try method 1: Extract from metadata
    try {
      const metadata = participant.metadata
        ? JSON.parse(participant.metadata)
        : {};

      if (metadata.walletAddress) {
        const participantWithWallet = {
          id: participant.identity,
          userName: metadata.userName || participant.identity,
          walletAddress: metadata.walletAddress,
          userType: metadata.userType || "guest",
        };

        setSelectedParticipant(participantWithWallet as Participant);
        setShowSendModal(true);
        return; // Exit if we found the wallet address
      }
    } catch (error) {
      console.error("Error parsing participant metadata:", error);
    }

    // Method 2: Look up from participant list
    const fullParticipant = participants.find(
      (p) =>
        p.id === participant.identity || p.userName === participant.identity
    );

    if (fullParticipant && fullParticipant.walletAddress) {
      setSelectedParticipant(fullParticipant);
      setShowSendModal(true);
    } else {
      // Both methods failed, show error
      console.warn(
        "Participant wallet address not found for:",
        participant.identity
      );

      // Show notification that wallet address is missing
      addNotification?.({
        type: "error",
        message: "Could not find wallet address for this participant",
        duration: 3000,
      });
    }
  };

   const shouldShowGift = showGift && !isLocal;

  // Handle closing the send modal
  const handleCloseSendModal = (closed: boolean) => {
    console.log(closed);
    setShowSendModal(false);
  };

  return (
    <>
      <div
        className={`absolute top-2 left-2 flex items-center justify-between inset-x-2 z-10 ${className}`}
      >
        {shouldShowGift && (
          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
            onClick={handleGiftClick}
          >
            <Icon name="moneyTransfer" className="text-white" size={16} />
          </div>
        )}
        <div className="flex flex-row items-center gap-x-2">
          {/* Audio status icon */}
          {showAudio && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                localMicEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <Icon
                name={localMicEnabled ? "audio" : "audioOff"}
                className="text-white"
                size={16}
              />
            </div>
          )}

          {/* Video status icon */}
          {showVideo && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                localCameraEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <Icon
                name={localCameraEnabled ? "video" : "videoOff"}
                className="text-white"
                size={16}
              />
            </div>
          )}
        </div>
      </div>
      {/* </div> */}

      {/* Render SendModal when showSendModal is true and selectedParticipant exists */}
      {showSendModal && selectedParticipant && (
        <SendModal
          selectedUser={selectedParticipant}
          closeFunc={handleCloseSendModal}
        />
      )}
    </>
  );
};

export default ParticipantControls;
