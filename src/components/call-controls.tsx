// import React from "react";
// import { Track } from "livekit-client";
// import { TrackToggle } from "@livekit/components-react";
// import BaseCallControls, { CallControlsRenderProps } from './base-call-controls';
// import { Icon } from "./icons";
// import CameraToggle from './camera-toggle';

// export type CallControlsProps = {
//   className?: string;
//   style?: React.CSSProperties;
//   components?: {
//     MicButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
//     CameraButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
//     ScreenShareButton?: React.FC<{ enabled: boolean; toggle: () => void }>;
//     RaiseHandButton?: React.FC<{ requested: boolean; request: () => void }>;
//     ChatButton?: React.FC<{ onClick: () => void }>;
//     EndCallButton?: React.FC<{ onClick: () => void }>;
//     AgendaButton?: React.FC<{ onClick: () => void }>;
//     ReactionsButton?: React.FC<{ onClick: () => void }>;
//     RecordButton?: React.FC<{ isRecording: boolean; toggle: () => void }>;
//   };
//   onRaiseHand?: () => void;
//   onReturnToGuest?: () => void;
//   onDisconnect?: () => void;
//   onAgendaToggle?: () => void;
//   onChatToggle?: () => void;
//   onReactionsToggle?: () => void;
//   onRecordToggle?: () => void;
// };

// /**
//  * CallControls provides a customizable UI for stream call controls
//  * Uses the BaseCallControls headless component for functionality
//  */
// const CallControls: React.FC<CallControlsProps> = ({
//   className = "",
//   style,
//   components,
//   onRaiseHand,
//   onReturnToGuest,
//   onDisconnect,
//   onAgendaToggle,
//   onChatToggle,
//   onReactionsToggle,
//   onRecordToggle,
// }) => {
//   // Create custom icons for the CameraToggleButton to match our design
//   const cameraIcons = {
//     cameraOn: <Icon name="video" className="text-white" />,
//     cameraOff: <Icon name="videoOff" className="text-white" />,
//     switchCamera: <Icon name="Poll" className="text-primary" size={16} />,
//     loading: <Icon name="usdt" className="text-primary animate-spin" size={16} />
//   };

//   // Render the modern UI design
//   const renderCallControls = (props: CallControlsRenderProps) => {
//     const {
//       canAccessMediaControls,
//       isGuest,
//       hasPendingRequest,
//       isCameraEnabled,
//       isMicEnabled,
//       isScreenSharingEnabled,
//       isRecording,
//       handleDisconnectClick,
//       requestToSpeak,
//       userType,
//       toggleMic,
//       toggleScreenShare,
//       toggleRecording
//     } = props;

//     console.log({isMicEnabled, isCameraEnabled, isScreenSharingEnabled, isRecording});
//     return (
//       <div className={`w-full max-6xl mx-auto ${className}`} style={style}>
//         <div className="flex items-center justify-between">
//           {/* Left group - Link and Menu icons */}
//           <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
//             <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
//               <Icon name="circle" className="text-[#F5F5F5]" size={12} />
//               <div className="bg-[#DCCCF63D] p-2 rounded-xl">
//                 <Icon name="link" className="text-primary" />
//               </div>
//             </div>
//             <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
//               <Icon name="circle" className="text-[#F5F5F5]" size={12} />
//               <div className="bg-[#DCCCF63D] p-2 rounded-xl" onClick={onAgendaToggle}>
//                 <Icon name="more" className="text-primary" />
//               </div>
//             </div>
//           </div>

//           {/* Record button */}
//           {userType === "host" && (
//             <div
//               className="rounded-2xl p-0.5 bg-primary flex flex-row text-white items-center gap-x-2 cursor-pointer"
//               onClick={toggleRecording}
//             >
//               {components?.RecordButton ? (
//                 <components.RecordButton isRecording={isRecording} toggle={toggleRecording} />
//               ) : (
//                 <>
//                   <span className="ml-2">{isRecording ? "Stop" : "Record"}</span>
//                   <div className={`rounded-2xl ${isRecording ? "bg-[#FF5555]" : "bg-[#8B55E2]"} p-2`}>
//                     <Icon name="record" className="text-white" />
//                   </div>
//                 </>
//               )}
//             </div>
//           )}

//           {/* Icon group - main middle section */}
//           <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
//             {/* Raise hand */}
//             {isGuest && !hasPendingRequest && (
//               <div
//                 className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
//                 onClick={requestToSpeak}
//               >
//                 {components?.RaiseHandButton ? (
//                   <components.RaiseHandButton requested={false} request={requestToSpeak} />
//                 ) : (
//                   <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                     <Icon name="hand" className="text-primary" />
//                   </div>
//                 )}
//               </div>
//             )}

//             {isGuest && hasPendingRequest && (
//               <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
//                 {components?.RaiseHandButton ? (
//                   <components.RaiseHandButton requested={true} request={() => {}} />
//                 ) : (
//                   <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                     <Icon name="hand" className="text-green-500" />
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Screen share */}
//             {canAccessMediaControls && (
//               <TrackToggle
//                 source={Track.Source.ScreenShare}
//                 showIcon={false}
//               >
//                 <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
//                   {components?.ScreenShareButton ? (
//                     <components.ScreenShareButton
//                       enabled={isScreenSharingEnabled}
//                       toggle={toggleScreenShare}
//                     />
//                   ) : (
//                     <div className={`${isScreenSharingEnabled ? 'bg-gradient-to-t from-[#DCCCF6] to-primary' : 'bg-[#DCCCF63D]'} rounded-2xl h-full flex flex-col items-center justify-center`}>
//                       <Icon name="screen" className={`${isScreenSharingEnabled ? 'text-white' : 'text-primary'}`} />
//                     </div>
//                   )}
//                 </div>
//               </TrackToggle>
//             )}

//             {/* Microphone */}
//             {canAccessMediaControls && (
//               <TrackToggle
//                 source={Track.Source.Microphone}
//                 showIcon={false}
//               >
//                 <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
//                   {components?.MicButton ? (
//                     <components.MicButton enabled={isMicEnabled} toggle={toggleMic} />
//                   ) : (
//                     <>
//                       <Icon name="circle" className="text-[#F5F5F5]" size={12} />
//                       {isMicEnabled ? (
//                         <div className="bg-primary p-2 rounded-xl">
//                           <Icon name="audio" className="text-white" />
//                         </div>
//                       ) : (
//                         <div className="bg-[#F5F5F5] p-2 rounded-xl">
//                           <Icon name="audioOff" className="text-white" />
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
//               </TrackToggle>
//             )}

//             {/* Camera - Using our new LiveKit-compatible camera toggle */}
//             {canAccessMediaControls && (
//               components?.CameraButton ? (
//                 <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
//                   <components.CameraButton enabled={isCameraEnabled} toggle={() => {}} />
//                 </div>
//               ) : (
//                 <CameraToggle
//                   customIcons={cameraIcons}
//                   onError={(error) => console.error('Camera error:', error)}
//                 />
//               )
//             )}

//             {/* Reactions */}
//             <div
//               className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
//               onClick={onReactionsToggle}
//             >
//               {components?.ReactionsButton ? (
//                 <components.ReactionsButton onClick={onReactionsToggle || (() => {})} />
//               ) : (
//                 <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                   <Icon name="smiley" className="text-yellow-400" />
//                 </div>
//               )}
//             </div>

//             {/* Chat */}
//             <div
//               className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
//               onClick={onChatToggle}
//             >
//               {components?.ChatButton ? (
//                 <components.ChatButton onClick={onChatToggle || (() => {})} />
//               ) : (
//                 <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                   <Icon name="chat" className="text-primary" />
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* End call button */}
//           <div
//             className="rounded-2xl p-0.5 bg-[#D40000] flex flex-row text-white items-center gap-x-2 cursor-pointer"
//             onClick={handleDisconnectClick}
//           >
//             {components?.EndCallButton ? (
//               <components.EndCallButton onClick={handleDisconnectClick} />
//             ) : (
//               <>
//                 <span className="ml-2">End</span>
//                 <div className="rounded-2xl bg-[#FF5555] p-2">
//                   <Icon name="phone" className="text-white" />
//                 </div>
//               </>
//             )}
//           </div>

//           {/* Right group - statistics and additional controls */}
//           <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
//             <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
//               <span>0</span>
//               <div className="bg-[#DCCCF63D] p-2 rounded-xl">
//                 <Icon name="users" className="text-primary" />
//               </div>
//             </div>
//             <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
//               <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                 <Icon name="caption" className="text-primary" />
//               </div>
//             </div>

//             <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
//               <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                 <Icon name="filter" className="text-primary" />
//               </div>
//             </div>
//             <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
//               <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
//                 <Icon name="keypad" className="text-primary" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <BaseCallControls
//       onRaiseHand={onRaiseHand}
//       onReturnToGuest={onReturnToGuest}
//       onDisconnect={onDisconnect}
//       onAgendaToggle={onAgendaToggle}
//       onChatToggle={onChatToggle}
//       onReactionsToggle={onReactionsToggle}
//       onRecordToggle={onRecordToggle}
//       render={renderCallControls}
//     />
//   );
// };

// export default CallControls;

import React from "react";
// import { Track } from "livekit-client";
// import { TrackToggle } from "@livekit/components-react";
import BaseCallControls, {
  CallControlsRenderProps,
} from "./base-call-controls";
import { Icon } from "./icons";
// import CameraToggle from "./camera-toggle";
import {
  MicrophoneControl,
  ScreenShareControl,
  RecordControl,
  CameraToggle
} from "./audio-video-controls";

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
  // Create custom icons for the CameraToggleButton to match our design
  const cameraIcons = {
    cameraOn: <Icon name="video" className="text-white" />,
    cameraOff: <Icon name="videoOff" className="text-white" />,
    switchCamera: <Icon name="Poll" className="text-primary" size={16} />,
    loading: (
      <Icon name="usdt" className="text-primary animate-spin" size={16} />
    ),
  };

  // Render the modern UI design
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

    console.log({
      isMicEnabled,
      isCameraEnabled,
      isScreenSharingEnabled,
      isRecording,
    });
    return (
      <div className={`w-full max-6xl mx-auto ${className}`} style={style}>
        <div className="flex items-center justify-between">
          {/* Left group - Link and Menu icons */}
          <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
            <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
              <Icon name="circle" className="text-[#F5F5F5]" size={12} />
              <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                <Icon name="link" className="text-primary" />
              </div>
            </div>
            <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
              <Icon name="circle" className="text-[#F5F5F5]" size={12} />
              <div
                className="bg-[#DCCCF63D] p-2 rounded-xl"
                onClick={onAgendaToggle}
              >
                <Icon name="more" className="text-primary" />
              </div>
            </div>
          </div>

          {/* Record button */}
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

          {/* Icon group - main middle section */}
          <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
            {/* Raise hand */}
            {isGuest && !hasPendingRequest && (
              <div
                className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
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
              <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
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

            {/* Screen share */}
            {canAccessMediaControls &&
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
                <MicrophoneControl
                  showLabel={false}
                  onChange={() => toggleMic()}
                />
              ))}

            {/* Camera - Using our new LiveKit-compatible camera toggle */}
            {canAccessMediaControls &&
              (components?.CameraButton ? (
                <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
                  <components.CameraButton
                    enabled={isCameraEnabled}
                    toggle={() => {}}
                  />
                </div>
              ) : (
                <CameraToggle
                  customIcons={cameraIcons}
                  onError={(error) => console.error("Camera error:", error)}
                />
              ))}

            {/* Reactions */}
            <div
              className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
              onClick={onReactionsToggle}
            >
              {components?.ReactionsButton ? (
                <components.ReactionsButton
                  onClick={onReactionsToggle || (() => {})}
                />
              ) : (
                <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                  <Icon name="smiley" className="text-yellow-400" />
                </div>
              )}
            </div>

            {/* Chat */}
            <div
              className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]"
              onClick={onChatToggle}
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
                <span className="ml-2">End</span>
                <div className="rounded-2xl bg-[#FF5555] p-2">
                  <Icon name="phone" className="text-white" />
                </div>
              </>
            )}
          </div>

          {/* Right group - statistics and additional controls */}
          <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
            <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
              <span>0</span>
              <div className="bg-[#DCCCF63D] p-2 rounded-xl">
                <Icon name="users" className="text-primary" />
              </div>
            </div>
            <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
              <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                <Icon name="caption" className="text-primary" />
              </div>
            </div>

            <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
              <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                <Icon name="filter" className="text-primary" />
              </div>
            </div>
            <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
              <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
                <Icon name="keypad" className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
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
