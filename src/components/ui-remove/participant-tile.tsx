import { useState } from "react";
import {
  useParticipantControls,
  useParticipantData,
  type SDKParticipant,
  type Participant,
} from "../../../src/index"; // Adjust the import path as necessary
import { SendModal } from "./modals";

type ParticipantTileContentProps = {
  participant: SDKParticipant;
  isLocal: boolean;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  onGiftSuccess?: (participant: SDKParticipant) => void;
};

const ParticipantTileContent = ({
  participant,
  isLocal,
  isCameraOn,
  isMicrophoneOn,
}: ParticipantTileContentProps) => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedRecipient, setSelectedRecipient] =
    useState<Participant | null>(null);

  const controls = useParticipantControls({
    participant,
    isLocal,
    isMicrophoneEnabled: isMicrophoneOn,
    isCameraEnabled: isCameraOn,
  });

  const participantData = useParticipantData({
    participant,
  });

  const handleGiftClick = () => {
    const recipient = controls.prepareGiftRecipient();
    if (recipient) {
      setSelectedRecipient(recipient);
      setShowSendModal(true);
    } else {
      console.error("Could not find wallet address for this participant");
    }
  };

  const handleDemoteClick = async () => {
    const result = await controls.demoteParticipant();
    if (result.success) {
      console.log(`${controls.participantMetadata.userName} returned to guest`);
    } else {
      console.error(result.error || "Failed to demote participant");
    }
  };

  return (
    <>
      {!isCameraOn && (
        // Camera off - show avatar view
        <div className="relative w-full h-full overflow-hidden rounded-lg">
          {/* Background with avatar */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${participantData.avatarUrl})`,
              filter: "blur(8px)",
              transform: "scale(1.3)",
              opacity: "0.9",
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-10" />

          {/* Central avatar - responsive sizing */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden">
              {participantData.avatarUrl ? (
                <img
                  src={participantData.avatarUrl}
                  alt={participantData.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-semibold">
                  {participantData.initials}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User info - compact width based on content */}
      <div className="absolute bottom-1 left-1 z-10">
        <div className="bg-black bg-opacity-50 rounded px-2 py-1 inline-flex items-center space-x-2 max-w-max">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0">
            {participantData.avatarUrl ? (
              <img
                src={participantData.avatarUrl}
                alt={participantData.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs">
                {participantData.initials}
              </div>
            )}
          </div>
          <span
            className="text-white text-xs sm:text-sm whitespace-nowrap max-w-[120px] sm:max-w-[160px] truncate"
            title={participantData.userName}
          >
            {participantData.userName}
          </span>
        </div>
      </div>

      {/* Side controls for desktop */}
      <div className="hidden sm:!block absolute top-1 right-1 z-10">
        <div className="flex flex-col items-end gap-y-1">
          {/* Gift and demote controls */}
          {(controls.canGift || controls.canDemote) && (
            <div className="flex flex-col gap-y-1">
              {controls.canGift && (
                <button
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light transition-colors"
                  onClick={handleGiftClick}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              )}

              {controls.canDemote && (
                <button
                  className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors ${
                    controls.isDemoting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={controls.isDemoting ? undefined : handleDemoteClick}
                  disabled={controls.isDemoting}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Audio/Video status indicators */}
          <div className="flex flex-col gap-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                controls.micEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {controls.micEnabled ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                )}
              </svg>
            </div>

            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                controls.cameraEnabled
                  ? "bg-primary"
                  : "bg-gray-500 bg-opacity-60"
              }`}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {controls.cameraEnabled ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile controls with hamburger menu */}
      <div className="sm:hidden absolute top-1 right-1 z-10">
        <div className="relative">
          {/* Hamburger menu button */}
          <button
            className="w-8 h-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMobileMenu && (
            <div className="absolute top-full right-0 mt-1 bg-black bg-opacity-80 rounded-lg p-2 min-w-max">
              <div className="flex flex-col gap-2">
                {/* Gift and demote controls */}
                {controls.canGift && (
                  <button
                    className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
                    onClick={() => {
                      handleGiftClick();
                      setShowMobileMenu(false);
                    }}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                )}

                {controls.canDemote && (
                  <button
                    className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 ${
                      controls.isDemoting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      if (!controls.isDemoting) {
                        handleDemoteClick();
                        setShowMobileMenu(false);
                      }
                    }}
                    disabled={controls.isDemoting}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                      />
                    </svg>
                  </button>
                )}

                {/* Audio/Video status indicators */}
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex flex-col gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        controls.micEnabled
                          ? "bg-primary"
                          : "bg-gray-500 bg-opacity-60"
                      }`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {controls.micEnabled ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          />
                        )}
                      </svg>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        controls.cameraEnabled
                          ? "bg-primary"
                          : "bg-gray-500 bg-opacity-60"
                      }`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {controls.cameraEnabled ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && selectedRecipient && (
        <SendModal
          selectedUser={selectedRecipient}
          closeFunc={() => {
            setShowSendModal(false);
            setSelectedRecipient(null);
          }}
        />
      )}
    </>
  );
};
export default ParticipantTileContent;
