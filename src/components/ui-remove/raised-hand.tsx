import { RaisedHand } from "../../types";
import { Icon } from "../icons";

interface RaisedHandCardProps {
  raisedHand: RaisedHand;
  // onAcknowledge: (participantId: string) => void;
}

const RaisedHandCard = ({ raisedHand }: RaisedHandCardProps) => {
  console.log({ raisedHand });
  const { participantId, name, userType, timestamp } = raisedHand;
  // const [isProcessing, setIsProcessing] = useState(false);
  // const { userType: currentUserType } = useStreamContext();

  // Calculate time elapsed since hand was raised
  const getTimeElapsed = () => {
    const elapsed = Date.now() - timestamp;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  };

  // const handleCallOn = async () => {
  //   setIsProcessing(true);
  //   try {
  //     await onAcknowledge(participantId);
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  return (
    <div className="bg-[var(--sdk-bg-primary-color)] rounded-lg shadow-lg p-4 mb-2 w-60">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-md font-semibold text-text-secondary">{name || participantId}</h3>
          <p className="text-xs text-text-secondary">
            {userType === "host" ? "Host" : "Co-host"} • {getTimeElapsed()}
          </p>
        </div>
        <div className="ml-2">
          <Icon name="hand" className="text-primary animate-pulse" size={20} />
        </div>
      </div>
      
      <p className="text-xs text-text-secondary mt-2 mb-3">Has raised their hand</p>
      
      {/* Only show the call on button for hosts */}
      {/* {currentUserType === "host" && (
        <button
          onClick={handleCallOn}
          disabled={isProcessing}
          className={`w-full bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Call On
        </button>
      )} */}
    </div>
  );
};

export default RaisedHandCard;