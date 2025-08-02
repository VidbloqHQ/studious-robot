/* eslint-disable @typescript-eslint/no-explicit-any */
// import React, { useState } from "react";
// import { Icon } from "./icons";
// import { getParticipantMetadata } from "../utils/index";
// import { useParticipantList, useNotification } from "../hooks/index";
// import { useParticipantTrackStates } from "../hooks/useParticipantTrackStates";
// import { Participant, SDKParticipant, EnhancedSDKParticipant } from "../types/index";
// import { SendModal } from "./modals/index";

// export type ParticipantControlsProps = {
//   participant: SDKParticipant | EnhancedSDKParticipant;
//   isLocal?: boolean;
//   isMicrophoneEnabled?: boolean;
//   isCameraEnabled?: boolean;
//   className?: string;
//   showAudio?: boolean;
//   showVideo?: boolean;
//   showGift?: boolean;
//   onGiftClick?: (participant: SDKParticipant) => void;
// };

// /**
//  * ParticipantControls component - displays control icons on participant tiles
//  * Shows audio, video status and gift button with real-time synchronization
//  */
// const ParticipantControls: React.FC<ParticipantControlsProps> = ({
//   participant,
//   isLocal = false,
//   isMicrophoneEnabled = false,
//   isCameraEnabled = false,
//   className = "",
//   showAudio = true,
//   showVideo = true,
//   showGift = true,
//   onGiftClick,
// }) => {
//   // Use the hook to track real-time track states
//   const trackStates = useParticipantTrackStates(participant, isLocal);

//   // Use track states from hook if we have LiveKit reference, otherwise fall back to props
//   const micEnabled = trackStates.hasLivekitReference 
//     ? trackStates.micEnabled 
//     : isMicrophoneEnabled;
    
//   const cameraEnabled = trackStates.hasLivekitReference 
//     ? trackStates.cameraEnabled 
//     : isCameraEnabled;

//   // Add states for the SendModal
//   const [showSendModal, setShowSendModal] = useState<boolean>(false);
//   const [selectedParticipant, setSelectedParticipant] =
//     useState<Participant | null>(null);

//   // Get participants list for method 2 lookup
//   const { participants } = useParticipantList();

//   // Optional: Get notification service if you want to show errors
//   const { addNotification } = useNotification();

//   // Handle gift click with the hybrid approach
//   const handleGiftClick = () => {
//     if (onGiftClick) {
//       onGiftClick(participant);
//     }

//     // Try method 1: Extract from metadata using utility function
//     try {
//       const metadata = getParticipantMetadata(participant);

//       if (metadata.walletAddress) {
//         const participantWithWallet = {
//           id: participant.identity,
//           userName: metadata.userName || participant.identity,
//           walletAddress: metadata.walletAddress,
//           userType: metadata.userType || "guest",
//           avatarUrl: metadata.avatarUrl || "",
//         };

//         setSelectedParticipant(participantWithWallet as Participant);
//         setShowSendModal(true);
//         return; // Exit if we found the wallet address
//       }
//     } catch (error) {
//       console.error("Error parsing participant metadata:", error);
//     }

//     // Method 2: Look up from participant list
//     const fullParticipant = participants.find(
//       (p) =>
//         p.id === participant.identity || p.userName === participant.identity
//     );

//     if (fullParticipant && fullParticipant.walletAddress) {
//       setSelectedParticipant(fullParticipant);
//       setShowSendModal(true);
//     } else {
//       // Both methods failed, show error
//       console.warn(
//         "Participant wallet address not found for:",
//         participant.identity
//       );

//       // Show notification that wallet address is missing
//       addNotification?.({
//         type: "error",
//         message: "Could not find wallet address for this participant",
//         duration: 3000,
//       });
//     }
//   };

//   const shouldShowGift = showGift && !isLocal;

//   // Handle closing the send modal
//   const handleCloseSendModal = (closed: boolean) => {
//     console.log(closed);
//     setShowSendModal(false);
//   };

//   return (
//     <>
//       <div
//         className={`absolute top-2 left-2 flex items-center justify-between inset-x-2 z-10 ${className}`}
//       >
//         {shouldShowGift && (
//           <div
//             className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
//             onClick={handleGiftClick}
//           >
//             <Icon name="moneyTransfer" className="text-white" size={16} />
//           </div>
//         )}
//         <div className="flex flex-row items-center gap-x-2">
//           {/* Audio status icon */}
//           {showAudio && (
//             <div
//               className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                 micEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
//               }`}
//             >
//               <Icon
//                 name={micEnabled ? "audio" : "audioOff"}
//                 className="text-white"
//                 size={16}
//               />
//             </div>
//           )}

//           {/* Video status icon */}
//           {showVideo && (
//             <div
//               className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                 cameraEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
//               }`}
//             >
//               <Icon
//                 name={cameraEnabled ? "video" : "videoOff"}
//                 className="text-white"
//                 size={16}
//               />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Render SendModal when showSendModal is true and selectedParticipant exists */}
//       {showSendModal && selectedParticipant && (
//         <SendModal
//           selectedUser={selectedParticipant}
//           closeFunc={handleCloseSendModal}
//         />
//       )}
//     </>
//   );
// };

// export default ParticipantControls;

import React, { useState } from "react";
import { Icon } from "../icons";
import { getParticipantMetadata } from "../../utils/index";
import { useParticipantList, useNotification, useStreamContext, useTenantContext, useRequirePublicKey } from "../../hooks/index";
import { useParticipantTrackStates } from "../../hooks/useParticipantTrackStates";
import { Participant, SDKParticipant, EnhancedSDKParticipant } from "../../types/index";
import { SendModal } from "./modals/index";

export type ParticipantControlsProps = {
  participant: SDKParticipant | EnhancedSDKParticipant;
  isLocal?: boolean;
  isMicrophoneEnabled?: boolean;
  isCameraEnabled?: boolean;
  className?: string;
  showAudio?: boolean;
  showVideo?: boolean;
  showGift?: boolean;
  showDemote?: boolean;
  onGiftClick?: (participant: SDKParticipant) => void;
  onDemoteClick?: (participant: SDKParticipant) => void;
};

/**
 * ParticipantControls component - displays control icons on participant tiles
 * Shows audio, video status, gift button, and demote button with real-time synchronization
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
  showDemote = true,
  onGiftClick,
  onDemoteClick,
}) => {
  // Use the hook to track real-time track states
  const trackStates = useParticipantTrackStates(participant, isLocal);

  // Use track states from hook if we have LiveKit reference, otherwise fall back to props
  const micEnabled = trackStates.hasLivekitReference 
    ? trackStates.micEnabled 
    : isMicrophoneEnabled;
    
  const cameraEnabled = trackStates.hasLivekitReference 
    ? trackStates.cameraEnabled 
    : isCameraEnabled;

  // Add states for the SendModal
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDemoting, setIsDemoting] = useState<boolean>(false);

  // Get required hooks for demote functionality
  const { participants } = useParticipantList();
  const { addNotification } = useNotification();
  const { userType, roomName, streamMetadata } = useStreamContext();
  const { apiClient } = useTenantContext();
  const { publicKey } = useRequirePublicKey();

  // Get participant metadata to check if they're temp-host
  let participantUserType = "guest";
  let participantWalletAddress = "";
   const metadata = getParticipantMetadata(participant);
  try {
    // const metadata = getParticipantMetadata(participant);
    participantUserType = metadata.userType || "guest";
    
    // Ensure walletAddress is a string
    if (typeof metadata.walletAddress === 'string' && metadata.walletAddress) {
      participantWalletAddress = metadata.walletAddress;
    } else if (metadata.walletAddress && typeof metadata.walletAddress === 'object') {
      // Handle case where walletAddress might be an object
      console.warn("Wallet address is an object, not a string:", metadata.walletAddress);
    }
  } catch (error) {
    console.error("Error getting participant metadata:", error);
  }

  // Determine if we should show the demote button
  const shouldShowDemote = showDemote && 
    !isLocal && 
    userType === "host" && 
    participantUserType === "temp-host" &&
    streamMetadata?.streamSessionType === "livestream";

  // Handle demoting a temp-host back to guest
  const handleDemoteClick = async () => {
    if (onDemoteClick) {
      onDemoteClick(participant);
    }

    if (!publicKey) {
      addNotification?.({
        type: "error",
        message: "Public key not available",
        duration: 3000,
      });
      return;
    }

    if (!participantWalletAddress) {
      addNotification?.({
        type: "error",
        message: "Participant wallet address not found",
        duration: 3000,
      });
      return;
    }

    setIsDemoting(true);

    try {
      console.log(`Demoting participant ${participant.identity} back to guest`);
      
      await apiClient.post("/participant/update/permission", {
        participantId: participant.identity,
        streamId: roomName,
        wallet: publicKey.toString(), // Host's wallet
        participantWallet: participantWalletAddress, // Participant's wallet
        action: "demote"
      });

      console.log("Demote successful for", participant.identity);
      
      // Get the display name from metadata or use identity as fallback
      const displayName = metadata.userName || metadata.name || participant.identity;
      
      addNotification?.({
        type: "success",
        message: `${displayName} returned to guest`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error demoting participant:", error);
      
      addNotification?.({
        type: "error",
        message: "Failed to demote participant",
        duration: 3000,
      });
    } finally {
      setIsDemoting(false);
    }
  };

  // Handle gift click with the hybrid approach
  const handleGiftClick = () => {
    if (onGiftClick) {
      onGiftClick(participant);
    }

    // Try method 1: Extract from metadata using utility function
    try {
      const metadata = getParticipantMetadata(participant);

      if (metadata.walletAddress) {
        const participantWithWallet = {
          id: participant.identity,
          userName: metadata.userName || participant.identity,
          walletAddress: metadata.walletAddress,
          userType: metadata.userType || "guest",
          avatarUrl: metadata.avatarUrl || "",
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
      (p: any) =>
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
        <div className="flex items-center gap-x-2">
          {shouldShowGift && (
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
              onClick={handleGiftClick}
            >
              <Icon name="moneyTransfer" className="text-white" size={16} />
            </div>
          )}
          
          {shouldShowDemote && (
            <div
              className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 ${
                isDemoting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={isDemoting ? undefined : handleDemoteClick}
              title="Return to guest"
            >
              <Icon name="userMinus" className="text-white" size={16} />
            </div>
          )}
        </div>
        
        <div className="flex flex-row items-center gap-x-2">
          {/* Audio status icon */}
          {showAudio && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                micEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <Icon
                name={micEnabled ? "audio" : "audioOff"}
                className="text-white"
                size={16}
              />
            </div>
          )}

          {/* Video status icon */}
          {showVideo && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                cameraEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <Icon
                name={cameraEnabled ? "video" : "videoOff"}
                className="text-white"
                size={16}
              />
            </div>
          )}
        </div>
      </div>

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