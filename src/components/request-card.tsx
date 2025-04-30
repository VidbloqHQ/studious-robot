// import { useState } from "react";
// import {
//   useStreamContext,
//   useTenantContext,
//   useRequirePublicKey,
// } from "../hooks/index";
// import { GuestRequest } from "../types";

// type RequestCardProps = {
//   request: GuestRequest;
// };

// const RequestCard = ({ request }: RequestCardProps) => {
//   const { websocket, roomName, userType } = useStreamContext();
//   const { participantId, name } = request;
//   const [isProcessing, setIsProcessing] = useState(false);
//   const { publicKey } = useRequirePublicKey();
//   const { apiClient } = useTenantContext();

//   // Handle accepting a guest's request to speak
//   const handleAccept = async () => {
//     if (!websocket || !websocket.isConnected) {
//       console.warn("WebSocket not connected - cannot accept request");
//       return;
//     }

//     if (!publicKey) {
//       console.warn("Public key not available");
//       return;
//     }

//     setIsProcessing(true);

//     try {
//       console.log(
//         `Accepting speaking request for ${participantId} in ${roomName}`
//       );

//       // Call your API endpoint through the apiClient
//       const data = {
//         participantId,
//         streamId:roomName,
//         wallet: publicKey.toString(),
//         action: "promote",
//       };
//       const permissionRes = await apiClient.post(
//         "/participant/update-permission",
//         data
//       );

//       console.log("Permission update successful:", permissionRes);

//       // After API call succeeds, the WebSocket notifications will be sent by the server

//       // Clear processing state after completion
//       setTimeout(() => {
//         setIsProcessing(false);
//       }, 1000);
//     } catch (error) {
//       console.error("Error accepting guest request:", error);
//       setIsProcessing(false);
//     }
//   };

//   // Handle rejecting a guest's request to speak
//   const handleReject = async () => {
//     if (!websocket || !websocket.isConnected) {
//       console.warn("WebSocket not connected - cannot reject request");
//       return;
//     }

//     setIsProcessing(true);

//     try {
//       console.log(
//         `Rejecting speaking request for ${participantId} in ${roomName}`
//       );

//       // For rejection, we can simply use the WebSocket method to remove the request
//       // No need to change permissions since they're staying as a guest
//       websocket.returnToGuest(roomName, participantId);

//       setTimeout(() => {
//         setIsProcessing(false);
//       }, 1000);
//     } catch (error) {
//       console.error("Error rejecting guest request:", error);
//       setIsProcessing(false);
//     }
//   };

//   // Only show the request card if the current user is a host
//   if (userType !== "host") return null;

//   return (
//     <div className="bg-green-800 rounded-lg shadow-lg p-4 mb-2 w-60">
//       <h3 className="text-md font-semibold">{name || participantId}</h3>
//       <p className="text-xs text-gray-500 mb-4">Wants to speak</p>
//       <div className="flex justify-between">
//         <button
//           onClick={handleReject}
//           disabled={isProcessing}
//           className={`bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs hover:bg-red-200 transition-colors ${
//             isProcessing ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//         >
//           Decline
//         </button>
//         <button
//           onClick={handleAccept}
//           disabled={isProcessing}
//           className={`bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs hover:bg-green-200 transition-colors ${
//             isProcessing ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//         >
//           Accept
//         </button>
//       </div>
//     </div>
//   );
// };

// export default RequestCard;

import { useState } from "react";
import { useStreamContext, useRequirePublicKey, useTenantContext } from "../hooks/index";
import { GuestRequest } from "../types/index";

interface RequestCardProps {
  request: GuestRequest;
}

const RequestCard = ({ request }: RequestCardProps) => {
  const { websocket, roomName, userType } = useStreamContext();
  const { participantId, name, walletAddress } = request;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useRequirePublicKey();
  const { apiClient } = useTenantContext();

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
      
      // Use the API client to make the request
      const response = await apiClient.post("/participant/update-permission", {
        participantId,
        streamId: roomName,
        wallet: publicKey.toString(), // Host's wallet
        participantWallet: walletAddress, // Guest's wallet
        action: "promote"
      });

      console.log("Permission update successful:", response);
      
      // The server will send WebSocket events
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error("Error accepting guest request:", error);
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
      
      // Simply use WebSocket to remove the request
      websocket.returnToGuest(roomName, participantId);
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error("Error rejecting guest request:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsProcessing(false);
    }
  };

  // Only show the request card if the current user is a host
  if (userType !== "host") return null;

  return (
    <div className="bg-green-800 rounded-lg shadow-lg p-4 mb-2 w-60">
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