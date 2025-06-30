import { useState, useEffect } from "react";
import { useStreamContext } from "../hooks";
import { GuestRequest } from "../types";
import { useRequirePublicKey } from "../hooks";
import { useTenantContext } from "../hooks";

interface RequestCardProps {
  request: GuestRequest;
  onRemove: (participantId: string) => void;
}

const RequestCard = ({ request, onRemove }: RequestCardProps) => {
  const { websocket, roomName, userType } = useStreamContext();
  const { participantId, name, walletAddress } = request;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useRequirePublicKey();
  const { apiClient } = useTenantContext();

  // Prevent rendering if card is already removed
  useEffect(() => {
    return () => {
      console.log(`RequestCard for ${participantId} unmounted`);
    };
  }, [participantId]);
  
  // If the card is marked as removed, don't render it
  if (isRemoved) {
    return null;
  }

  // Handle accepting a guest's request to speak
  const handleAccept = async () => {
    if (!websocket || !websocket.isConnected) {
      setError("WebSocket not connected");
      return;
    }

    if (!publicKey) {
      setError("Public key not available");
      return;
    }

    if (!walletAddress) {
      setError("Guest wallet address is missing");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log(`Accepting speaking request for ${participantId} in ${roomName}`);
      console.log(`Guest wallet address: ${walletAddress}`);
      
      // Immediately mark as removed to prevent UI flicker
      setIsRemoved(true);
      onRemove(participantId);
      
       await apiClient.post("/participant/update/permission", {
        participantId,
        streamId: roomName,
        wallet: publicKey.toString(), // Host's wallet
        participantWallet: walletAddress, // Guest's wallet
        action: "promote"
      });

      console.log("Permission update successful for", participantId);
      
      // No need to update state as the component is already not rendering
      setIsProcessing(false);
    } catch (error) {
      console.error("Error accepting guest request:", error);
      
      // If there was an error, we should re-show the card
      setIsRemoved(false);
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsProcessing(false);
    }
  };

  // Handle rejecting a guest's request to speak
  const handleReject = async () => {
    if (!websocket || !websocket.isConnected) {
      setError("WebSocket not connected");
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      console.log(`Rejecting speaking request for ${participantId} in ${roomName}`);
      
      // Immediately mark as removed to prevent UI flicker
      setIsRemoved(true);
      onRemove(participantId);
      
      // Use WebSocket to remove the request
      websocket.returnToGuest(roomName, participantId);
      
      // No need to update state as the component is already not rendering
      setIsProcessing(false);
    } catch (error) {
      console.error("Error rejecting guest request:", error);
      
      // If there was an error, we should re-show the card
      setIsRemoved(false);
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsProcessing(false);
    }
  };

  // Only show the request card if the current user is a host
  if (userType !== "host") return null;
  
  return (
    <div className="bg-white border rounded-lg shadow-lg p-4 mb-2 w-60">
      <h3 className="text-md font-semibold">{name || participantId}</h3>
      <p className="text-xs text-gray-500 mb-4">Wants to speak</p>
      
      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}
      
      <div className="flex justify-between">
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className={`bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs hover:bg-red-200 transition-colors ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className={`bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs hover:bg-green-200 transition-colors ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default RequestCard;