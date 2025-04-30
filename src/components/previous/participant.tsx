import { LocalParticipant, RemoteParticipant } from "livekit-client";

type ParticipantViewProps = {
  participant: LocalParticipant | RemoteParticipant;
};

const ParticipantView = ({ participant }: ParticipantViewProps) => {
  const { userName, avatarUrl } = participant.metadata
    ? JSON.parse(participant.metadata)
    : { userName: participant.identity };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Background image - scaled up with lighter blur */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${avatarUrl})`,
          filter: "blur(8px)", // Reduced blur amount
          transform: "scale(1.3)", // Slightly scaled to avoid edge artifacts
          opacity: "0.9", // Higher opacity for more visibility
        }}
      />

      {/* Very subtle darkening overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-10" />

      {/* User info in bottom left */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black bg-opacity-30 px-2 py-1 rounded-md">
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <img
            src={avatarUrl}
            alt={userName}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white text-sm">{userName}</span>
      </div>

      {/* Central avatar - smaller size to match your screenshot */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-24 h-24 rounded-full overflow-hidden">
          <img
            src={avatarUrl}
            alt={userName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Muted indicator if needed */}
      {/* {isMuted && (
        <div className="absolute top-3 right-3 bg-black bg-opacity-50 p-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )} */}
    </div>
  );
};

export default ParticipantView;
