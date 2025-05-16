import { Buffer } from 'buffer';

// Make Buffer available globally for browser environments
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}
import "./index.css";
import {
  StreamRoom,
  WalletAdapterBridge,
  VidbloqProvider,
  BaseCallControls,
  UserView,
  Prejoin,
  MicrophoneControl,
  CameraControl,
  ScreenShareControl,
  CallControls,
  RecordControl,
  MediaControls,
  StreamView,
  // StreamManager
} from "./components/index";
// export * from "./components";


import {
  useTransaction,
  // useVidbloqProgram,
  useParticipantList,
  useStreamContext,
  useWalletContext,
  useRequirePublicKey,
  usePrejoin,
  useCreateStream,
  useTenantContext,
  useWebSocket,
  useLivestream,
  useMeeting,
} from "./hooks/index";

export {
  StreamRoom,
  WalletAdapterBridge,
  VidbloqProvider,
  BaseCallControls,
  UserView,
  Prejoin,
  MicrophoneControl,
  CameraControl,
  ScreenShareControl,
  RecordControl,
  MediaControls,
  CallControls,
  StreamView,
  useTransaction,
  // useVidbloqProgram,
  useParticipantList,
  useStreamContext,
  useWalletContext,
  useRequirePublicKey,
  usePrejoin,
  useCreateStream,
  useTenantContext,
  useWebSocket,
  useLivestream,
  useMeeting,
  // StreamManager
};
