// import { useEffect, useState } from "react";
// import { StreamAgenda } from "../types/index";
// import { useStreamContext } from "./useStreamContext";

// interface InitialSyncData {
//   currentTime: number;
//   executedActions: string[];
//   joinTime: number;
// }

// export const useStreamSync = (handleAction: (item: StreamAgenda) => string) => {
//   const [joinTime, setJoinTime] = useState<number | null>(null);
//   const [executedActions, setExecutedActions] = useState<Set<string>>(new Set());
//   const [initialSyncComplete, setInitialSyncComplete] = useState(false);

//   const {
//     token,
//     websocket,
//     roomName,
//     identity,
//     agendas,
//     currentTime,
//     setCurrentTime,
//   } = useStreamContext();

//   // WebSocket connection and time sync effect
//   useEffect(() => {
//     if (!token || !websocket || !identity || !websocket.isConnected) return;

//     // Join the room
//     websocket.joinRoom(roomName, identity);

//     // Setup event listeners
//     const handleInitialSync = (data: InitialSyncData) => {
//       setCurrentTime(data.currentTime);
//       setExecutedActions(new Set(data.executedActions));
//       setJoinTime(data.joinTime);
//       setInitialSyncComplete(true);
//     };

//     const handleTimeSync = (serverTime: number) => {
//       setCurrentTime(serverTime);
//     };

//     const handleActionSync = (actionId: string) => {
//       setExecutedActions((prev) => new Set([...prev, actionId]));
//     };

//     // Add event listeners
//     websocket.addEventListener("initialSync", handleInitialSync);
//     websocket.addEventListener("timeSync", handleTimeSync);
//     websocket.addEventListener("actionExecutedSync", handleActionSync);

//     // Clean up event listeners when component unmounts
//     return () => {
//       websocket.removeEventListener("initialSync", handleInitialSync);
//       websocket.removeEventListener("timeSync", handleTimeSync);
//       websocket.removeEventListener("actionExecutedSync", handleActionSync);
//     };
//   }, [token, websocket, roomName, identity, setCurrentTime]);

//   // Execute agenda actions based on time
//   useEffect(() => {
//     if (!token || !websocket || !initialSyncComplete || joinTime === null) return;

//     agendas.forEach((item: StreamAgenda) => {
//       const shouldExecute =
//         item.timeStamp <= currentTime &&
//         !executedActions.has(item.id) &&
//         (item.timeStamp > joinTime ||
//           (item === agendas[0] && currentTime - joinTime < 5));

//       if (shouldExecute) {
//         handleAction(item);
//         setExecutedActions((prev) => new Set([...prev, item.id]));
//         websocket.actionExecuted(roomName, item.id);
//       }
//     });
//   }, [
//     currentTime,
//     agendas,
//     executedActions,
//     token,
//     handleAction,
//     websocket,
//     roomName,
//     joinTime,
//     initialSyncComplete,
//   ]);
// };