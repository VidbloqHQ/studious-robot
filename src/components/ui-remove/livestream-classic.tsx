// import React, { ReactElement, useState, useEffect, useMemo, useCallback } from "react";
// import { VideoTrack, AudioTrack } from "./track-controls";
// import { 
//   EnhancedSDKTrackReference,
//   SDKTrackSource,
//   EnhancedSDKParticipant,
//   ParticipantSortStrategy,
// } from "../types";
// import { useStreamRoom } from "../hooks/useStreamRoom";
// import { useParticipantControls, useParticipantData } from "../hooks/useParticipant";
// import { SendModal } from "./modals";

// interface LivestreamViewProps {
//   hasAgenda?: boolean;
//   className?: string;
//   style?: React.CSSProperties;
// }

// export default function LivestreamView({
//   hasAgenda = false,
//   className = "",
//   style,
// }: LivestreamViewProps) {
//   const meeting = useStreamRoom({
//     defaultSortStrategy: ParticipantSortStrategy.ROLE_BASED,
//     enableSpeakerEvents: true,
//   });

//   // State for mobile menu and active speaker
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
//   const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

//   // Listen for speaking events
//   useEffect(() => {
//     const handleSpeakingStarted = (event: any) => {
//       setActiveSpeaker(event.participant.identity);
//     };

//     const handleSpeakingStopped = (event: any) => {
//       setTimeout(() => {
//         setActiveSpeaker(prev => {
//           if (prev === event.participant.identity) {
//             const nextSpeaker = Array.from(meeting.participants.speaking)[0];
//             return nextSpeaker || null;
//           }
//           return prev;
//         });
//       }, 1000);
//     };

//     meeting.on('speakingStarted', handleSpeakingStarted);
//     meeting.on('speakingStopped', handleSpeakingStopped);

//     return () => {
//       meeting.off('speakingStarted', handleSpeakingStarted);
//       meeting.off('speakingStopped', handleSpeakingStopped);
//     };
//   }, [meeting]);

//   // Track window resize
//   useEffect(() => {
//     const handleResize = () => {
//       setWindowWidth(window.innerWidth);
//       if (window.innerWidth >= 1024) {
//         setIsMobileMenuOpen(false);
//       }
//     };

//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   const isMobile = windowWidth < 640;
//   const isTablet = windowWidth >= 640 && windowWidth < 1024;
//   const isDesktop = windowWidth >= 1024;

//   // Get participants for livestream layout
//   const hostParticipants = useMemo(() => 
//     meeting.getSortedParticipants({ includeRoles: ['host'] }),
//     [meeting]
//   );
  
//   const coHostParticipants = useMemo(() => 
//     meeting.getSortedParticipants({ includeRoles: ['co-host'] }),
//     [meeting]
//   );
  
//   const tempHostParticipants = useMemo(() => 
//     meeting.getSortedParticipants({ includeRoles: ['temp-host'] }),
//     [meeting]
//   );

//   // Determine main content and sidebar content
//   const screenShareTrack = meeting.tracks.screenShare;
//   const screenSharerIdentity = screenShareTrack?.participant?.identity || null;

//   const mainContent = useMemo(() => {
//     if (screenShareTrack) {
//       return screenShareTrack.participant;
//     }
//     return hostParticipants[0] || null;
//   }, [screenShareTrack, hostParticipants]);

//   const sidebarContent = useMemo(() => {
//     const allEligible = [...hostParticipants, ...coHostParticipants, ...tempHostParticipants];
    
//     if (screenShareTrack) {
//       // When screen sharing, show all hosts/co-hosts except the screen sharer
//       return allEligible.filter(p => p.identity !== screenSharerIdentity);
//     } else {
//       // Regular mode - show co-hosts and temp-hosts (up to 3)
//       return [...coHostParticipants, ...tempHostParticipants].slice(0, 3);
//     }
//   }, [hostParticipants, coHostParticipants, tempHostParticipants, screenShareTrack, screenSharerIdentity]);

//   // Get tracks for a participant
//   const getParticipantTrack = useCallback((participant: EnhancedSDKParticipant | null, type: 'camera' | 'screen' = 'camera'): EnhancedSDKTrackReference | null => {
//     if (!participant) return null;
    
//     const tracks = meeting.getParticipantTracks(participant.identity);
    
//     if (type === 'screen') {
//       return tracks.find(t => 
//         t.source === SDKTrackSource.ScreenShare || t.source === 'screen_share'
//       ) || null;
//     }
    
//     return tracks.find(t => 
//       t.source === SDKTrackSource.Camera || t.source === 'camera'
//     ) || null;
//   }, [meeting]);

//   // Get participant metadata helper
//   const getParticipantMetadata = useCallback((participant: EnhancedSDKParticipant) => {
//     const metadata = participant.metadata
//       ? JSON.parse(participant.metadata)
//       : {};

//     return {
//       userName: metadata.userName || participant.identity,
//       avatarUrl: metadata.avatarUrl || "",
//       userType: metadata.userType || meeting.getParticipantRole(participant.identity),
//       initials: (metadata.userName || participant.identity || "")
//         .split(" ")
//         .map((name: string) => name[0])
//         .join("")
//         .slice(0, 2)
//         .toUpperCase(),
//     };
//   }, [meeting]);

//   const renderParticipant = useCallback((
//     participant: EnhancedSDKParticipant | null,
//     track: EnhancedSDKTrackReference | null,
//     size: "large" | "small" | "mobile" = "large"
//   ): ReactElement | null => {
//     if (!participant || !track) return null;

//     const metadata = getParticipantMetadata(participant);
//     const isCameraOn = track.publication && !track.publication.isMuted;
//     const isMicrophoneOn = meeting.getParticipantTracks(participant.identity)
//       .some(t => (t.source === SDKTrackSource.Microphone || t.source === 'microphone') && 
//             t.publication && !t.publication.isMuted);
    
//     const isScreenShare = track.source === SDKTrackSource.ScreenShare || track.source === 'screen_share';
//     const isActive = participant.identity === activeSpeaker;
//     const isLocalParticipant = participant.identity === meeting.participants.local?.identity;
    
//     const uniqueKey = `${participant.sid}-${track.source}-${size}`;

//     // Responsive container classes
//     const containerClasses = `relative rounded-lg overflow-hidden bg-purple-900 h-full w-full ${
//       isActive ? "ring-2 ring-blue-500" : ""
//     }`;

//     // Responsive max-height styles
//     const getMaxHeightStyle = () => {
//       if (size === "mobile") {
//         return { maxHeight: "150px" };
//       } else if (size === "small") {
//         return { maxHeight: isMobile ? "120px" : "200px" };
//       } else {
//         return { 
//           maxHeight: isMobile ? "50vh" : isTablet ? "60vh" : "calc(100vh - 160px)" 
//         };
//       }
//     };

//     return (
//       <div key={uniqueKey} className={containerClasses}>
//         {isScreenShare ? (
//           track.publication && !track.publication.isMuted ? (
//             <div className="relative h-full w-full" style={getMaxHeightStyle()}>
//               <VideoTrack
//                 trackRef={track}
//                 className="h-full w-full object-contain"
//               />
//             </div>
//           ) : null
//         ) : (
//           <div className="h-full w-full flex items-center justify-center">
//             {isCameraOn ? (
//               <div className="relative w-full h-full" style={getMaxHeightStyle()}>
//                 <VideoTrack
//                   trackRef={track}
//                   className="w-full h-full object-cover"
//                 />
                
//                 <LivestreamParticipantContent
//                  participant={participant}
//                  isLocal={isLocalParticipant}
//                  isCameraOn={isCameraOn}
//                  isMicrophoneOn={isMicrophoneOn}
//                  size={size}
//                  isMobile={isMobile}
//                />
//               </div>
//             ) : (
//               <LivestreamParticipantContent
//                participant={participant}
//                isLocal={isLocalParticipant}
//                isCameraOn={isCameraOn ?? false}
//                isMicrophoneOn={isMicrophoneOn}
//                size={size}
//                isMobile={isMobile}
//              />
//             )}
//           </div>
//         )}

//         {track.publication?.track && <AudioTrack trackRef={track} />}

//         {/* User type badge */}
//         <div
//           className={`absolute ${
//             isMobile ? "top-1 right-1 px-1 py-0.5 text-xs" : "top-2 right-2 px-2 py-1 text-xs"
//           } rounded-md text-white ${
//             metadata.userType === "host"
//               ? "bg-purple-700"
//               : metadata.userType === "co-host"
//               ? "bg-purple-700"
//               : metadata.userType === "temp-host"
//               ? "bg-purple-700"
//               : "bg-purple-700"
//           } z-10`}
//         >
//           {metadata.userType === "host"
//             ? "Host"
//             : metadata.userType === "co-host"
//             ? "Co-Host"
//             : metadata.userType === "temp-host"
//             ? "Temp-Host"
//             : "Guest"}
//         </div>

//         {/* Name display */}
//         {/* <div className={`absolute ${
//           isMobile ? "bottom-1 left-1 px-1 py-0.5 text-xs" : "bottom-2 left-2 px-2 py-1 text-xs"
//         } bg-black/50 rounded text-white z-10`}>
//           {metadata.userName}
//         </div> */}
//       </div>
//     );
//   }, [meeting, activeSpeaker, isMobile, isTablet, getParticipantMetadata]);

//   const renderAgenda = useCallback((): ReactElement => {
//     return (
//       <div className={`flex flex-col h-full bg-white rounded-lg overflow-hidden ${
//         isMobile ? "fixed inset-0 z-50" : ""
//       }`}>
//         <div className="border-b border-gray-200 p-2 flex justify-between items-center">
//           <h3 className="font-medium text-gray-700">Agenda</h3>
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-gray-500">1/4</span>
//             {isMobile && (
//               <button
//                 onClick={() => setIsMobileMenuOpen(false)}
//                 className="p-1 rounded hover:bg-gray-100"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             )}
//           </div>
//         </div>

//         <div className="flex-1 overflow-auto">
//           <div className="p-4 space-y-6">
//             <div className="flex items-start space-x-3">
//               <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
//                 <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
//               </div>
//               <div className="flex-1">
//                 <h4 className="font-medium text-gray-800">POLL</h4>
//                 <p className="text-sm text-gray-600">
//                   Members are expected to participate in a poll
//                 </p>
//               </div>
//               <div className="text-sm text-purple-600 font-medium">12m</div>
//             </div>

//             <div className="flex items-start space-x-3">
//               <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
//                 <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
//               </div>
//               <div className="flex-1">
//                 <h4 className="font-medium text-gray-800">Q&A</h4>
//                 <p className="text-sm text-gray-600">Questions and answers</p>
//               </div>
//               <div className="text-sm text-purple-600 font-medium">19m</div>
//             </div>

//             <div className="flex items-start space-x-3">
//               <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
//                 <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
//               </div>
//               <div className="flex-1">
//                 <h4 className="font-medium text-gray-800">Giveaway</h4>
//                 <p className="text-sm text-gray-600">
//                   Opportunity to be gifted
//                 </p>
//               </div>
//               <div className="text-sm text-purple-600 font-medium">10m</div>
//             </div>

//             <div className="flex items-start space-x-3">
//               <div className="w-5 h-5 bg-purple-100 rounded-full flex-shrink-0 mt-1 flex items-center justify-center">
//                 <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
//               </div>
//               <div className="flex-1">
//                 <h4 className="font-medium text-gray-800">Next steps</h4>
//                 <p className="text-sm text-gray-600">
//                   Opportunity to be gifted
//                 </p>
//               </div>
//               <div className="text-sm text-purple-600 font-medium">20m</div>
//             </div>
//           </div>
//         </div>

//         <div className="p-3 border-t border-gray-200">
//           <p className="text-xs text-gray-500 mb-2">
//             Hover on an "agenda" to remove or edit it.
//           </p>
//           <button className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
//             Add Agenda
//           </button>
//         </div>
//       </div>
//     );
//   }, [isMobile]);

//   const renderMobileAgendaButton = () => {
//     if (!hasAgenda || !isMobile) return null;
    
//     return (
//       <button
//         onClick={() => setIsMobileMenuOpen(true)}
//         className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg z-40"
//       >
//         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//         </svg>
//       </button>
//     );
//   };

//   // Check if this is window share (special handling)
//   const isWindowShare = screenShareTrack && !screenShareTrack.publication?.dimensions?.width;

//   return (
//     <div className={`w-full h-full ${className}`} style={style}>
//       {screenShareTrack ? (
//         // SCREEN SHARING LAYOUT
//         <div className="h-full flex flex-col lg:flex-row">
//           {/* Main content - screen share */}
//           <div
//             className={`h-full relative ${
//               isDesktop && (hasAgenda || (sidebarContent.length > 0 && !isWindowShare))
//                 ? "flex-1"
//                 : "w-full"
//             }`}
//           >
//             <div className="w-full h-full">
//               {mainContent && renderParticipant(
//                 mainContent, 
//                 getParticipantTrack(mainContent, 'screen'), 
//                 "large"
//               )}

//               {/* Camera view of screen sharer */}
//               {screenSharerIdentity && (
//                 <div className={`absolute z-10 ${
//                   isMobile 
//                     ? "right-2 bottom-2 w-24 h-16" 
//                     : isTablet 
//                     ? "left-3 bottom-3 w-48 h-28"
//                     : "left-4 bottom-4 w-64 h-36"
//                 }`}>
//                   {(() => {
//                     const screenSharer = meeting.participants.all.find(p => p.identity === screenSharerIdentity);
//                     const cameraTrack = screenSharer ? getParticipantTrack(screenSharer, 'camera') : null;
//                     return screenSharer && cameraTrack && renderParticipant(
//                       screenSharer,
//                       cameraTrack,
//                       isMobile ? "mobile" : "small"
//                     );
//                   })()}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Sidebar - Responsive handling */}
//           {(hasAgenda || (sidebarContent.length > 0 && !isWindowShare)) && (
//             <>
//               {/* Desktop sidebar */}
//               {isDesktop && (
//                 <div className="w-80 ml-3 h-full flex flex-col">
//                   {sidebarContent.length > 0 && (
//                     <div className={hasAgenda ? "mb-3" : "h-full"}>
//                       {hasAgenda ? (
//                         // Horizontal layout with agenda
//                         <div className="flex gap-3 overflow-x-auto">
//                           {sidebarContent.map((participant, index) => {
//                             const track = getParticipantTrack(participant, 'camera');
//                             return track && (
//                               <div
//                                 key={`sidebar-${index}`}
//                                 className="w-64 h-36 flex-shrink-0"
//                               >
//                                 {renderParticipant(participant, track, "small")}
//                               </div>
//                             );
//                           })}
//                         </div>
//                       ) : (
//                         // Vertical layout without agenda
//                         <div className="flex flex-col gap-3">
//                           {sidebarContent.map((participant, index) => {
//                             const track = getParticipantTrack(participant, 'camera');
//                             return track && (
//                               <div key={`sidebar-${index}`} className="h-32">
//                                 {renderParticipant(participant, track, "small")}
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   )}
//                   {hasAgenda && <div className="flex-1">{renderAgenda()}</div>}
//                 </div>
//               )}

//               {/* Tablet/Mobile - Horizontal scroll for participants */}
//               {!isDesktop && sidebarContent.length > 0 && (
//                 <div className="w-full px-2 py-2 bg-purple-950/50">
//                   <div className="flex gap-2 overflow-x-auto pb-2">
//                     {sidebarContent.map((participant, index) => {
//                       const track = getParticipantTrack(participant, 'camera');
//                       return track && (
//                         <div
//                           key={`sidebar-${index}`}
//                           className={`flex-shrink-0 ${
//                             isMobile ? "w-20 h-20" : "w-32 h-24"
//                           }`}
//                         >
//                           {renderParticipant(participant, track, isMobile ? "mobile" : "small")}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       ) : (
//         // REGULAR LAYOUT - NO SCREEN SHARING
//         <div className="h-full flex flex-col lg:flex-row">
//           {/* Main content area */}
//           <div className={`h-full relative ${isDesktop && hasAgenda ? "flex-1" : "w-full"}`}>
//             {mainContent ? (
//               <div className="h-full w-full">
//                 {renderParticipant(mainContent, getParticipantTrack(mainContent, 'camera'), "large")}
//               </div>
//             ) : (
//               <div className="flex items-center justify-center h-full bg-purple-900 rounded-lg">
//                 <p className="text-white text-lg">No host present</p>
//               </div>
//             )}

//             {/* Co-hosts overlay */}
//             {sidebarContent.length > 0 && (
//               <>
//                 {/* Desktop - overlay in corner */}
//                 {isDesktop && (
//                   <div className="absolute left-4 top-4 w-80 space-y-3 z-10">
//                     {sidebarContent.map((participant, index) => {
//                       const track = getParticipantTrack(participant, 'camera');
//                       return track && (
//                         <div key={`sidebar-${index}`} className="h-36">
//                           {renderParticipant(participant, track, "small")}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}

//                 {/* Tablet/Mobile - bottom bar */}
//                 {!isDesktop && (
//                   <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
//                     <div className="flex gap-2 overflow-x-auto">
//                       {sidebarContent.map((participant, index) => {
//                         const track = getParticipantTrack(participant, 'camera');
//                         return track && (
//                           <div
//                             key={`sidebar-${index}`}
//                             className={`flex-shrink-0 ${
//                               isMobile ? "w-20 h-20" : "w-32 h-24"
//                             }`}
//                           >
//                             {renderParticipant(participant, track, isMobile ? "mobile" : "small")}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}
//           </div>

//           {/* Agenda sidebar - Desktop only */}
//           {hasAgenda && isDesktop && (
//             <div className="w-80 h-full ml-3">{renderAgenda()}</div>
//           )}
//         </div>
//       )}

//       {/* Mobile agenda overlay */}
//       {isMobile && hasAgenda && isMobileMenuOpen && renderAgenda()}
      
//       {/* Mobile agenda button */}
//       {renderMobileAgendaButton()}
//     </div>
//   );
// }


// // LivestreamParticipantContent component
// const LivestreamParticipantContent: React.FC<{
//   participant: EnhancedSDKParticipant;
//   isLocal: boolean;
//   isCameraOn: boolean;
//   isMicrophoneOn: boolean;
//   size: "large" | "small" | "mobile";
//   isMobile: boolean;
// }> = ({ participant, isLocal, isCameraOn, isMicrophoneOn, size, isMobile }) => {
//   const [showSendModal, setShowSendModal] = useState(false);
//   const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

//   const controls = useParticipantControls({
//     participant,
//     isLocal,
//     isMicrophoneEnabled: isMicrophoneOn,
//     isCameraEnabled: isCameraOn,
//   });

//   const participantData = useParticipantData({
//     participant,
//   });

//   const handleGiftClick = () => {
//     const recipient = controls.prepareGiftRecipient();
//     if (recipient) {
//       setSelectedRecipient(recipient);
//       setShowSendModal(true);
//     } else {
//       console.error("Could not find wallet address for this participant");
//     }
//   };

//   const handleDemoteClick = async () => {
//     const result = await controls.demoteParticipant();
//     if (result.success) {
//       console.log(`${controls.participantMetadata.userName} returned to guest`);
//     } else {
//       console.error(result.error || "Failed to demote participant");
//     }
//   };

//   const getAvatarSize = () => {
//     if (size === "mobile" || size === "small" || isMobile) {
//       return "w-16 h-16";
//     }
//     return "w-24 h-24";
//   };

//   const getControlsScale = () => {
//     if (size === "mobile") return "scale-50 origin-top-left";
//     if (size === "small") return "scale-75 origin-top-left";
//     if (isMobile) return "scale-75 origin-top-left";
//     return "";
//   };

//   return (
//     <>
//       {!isCameraOn && (
//         // Camera off - show avatar view
//         <div className="relative w-full h-full overflow-hidden rounded-lg">
//           {/* Background with avatar */}
//           <div
//             className="absolute inset-0 w-full h-full bg-cover bg-center"
//             style={{
//               backgroundImage: `url(${participantData.avatarUrl})`,
//               filter: "blur(8px)",
//               transform: "scale(1.3)",
//               opacity: "0.9",
//             }}
//           />
//           <div className="absolute inset-0 bg-black bg-opacity-10" />

//           {/* Central avatar */}
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
//             <div className={`${getAvatarSize()} rounded-full overflow-hidden`}>
//               {participantData.avatarUrl ? (
//                 <img
//                   src={participantData.avatarUrl}
//                   alt={participantData.userName}
//                   className="w-full h-full object-cover"
//                 />
//               ) : (
//                 <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
//                   {participantData.initials}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* User info - shown on both camera on/off states */}
//       <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black bg-opacity-30 px-2 py-1 rounded-md z-10">
//         <div className="w-6 h-6 rounded-full overflow-hidden">
//           {participantData.avatarUrl ? (
//             <img
//               src={participantData.avatarUrl}
//               alt={participantData.userName}
//               className="w-full h-full object-cover"
//             />
//           ) : (
//             <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs">
//               {participantData.initials}
//             </div>
//           )}
//         </div>
//         <span className="text-white text-sm">{participantData.userName}</span>
//       </div>

//       {/* Controls overlay */}
//       <div className={`absolute top-2 left-2 flex items-center justify-between inset-x-2 z-10 ${getControlsScale()}`}>
//         <div className="flex items-center gap-x-2">
//           {controls.canGift && (
//             <button
//               className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
//               onClick={handleGiftClick}
//             >
//               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </button>
//           )}
          
//           {controls.canDemote && (
//             <button
//               className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 ${
//                 controls.isDemoting ? 'opacity-50 cursor-not-allowed' : ''
//               }`}
//               onClick={controls.isDemoting ? undefined : handleDemoteClick}
//               disabled={controls.isDemoting}
//             >
//               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
//               </svg>
//             </button>
//           )}
//         </div>
        
//         <div className="flex flex-row items-center gap-x-2">
//           <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
//             controls.micEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
//           }`}>
//             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               {controls.micEnabled ? (
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//               ) : (
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
//               )}
//             </svg>
//           </div>

//           <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
//             controls.cameraEnabled ? "bg-primary" : "bg-gray-500 bg-opacity-60"
//           }`}>
//             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               {controls.cameraEnabled ? (
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//               ) : (
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
//               )}
//             </svg>
//           </div>
//         </div>
//       </div>

//       {/* Send Modal */}
//       {showSendModal && selectedRecipient && (
//         <SendModal
//           selectedUser={selectedRecipient}
//           closeFunc={() => {
//             setShowSendModal(false);
//             setSelectedRecipient(null);
//           }}
//         />
//       )}
//     </>
//   );
// };

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  type ReactElement,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  VideoTrack,
  AudioTrack,
  type SDKTrackReference,
  SDKTrackSource,
  useStreamRoom,
  ParticipantSortStrategy,
  useParticipantControls,
  useParticipantData,
  type SDKParticipant,
} from "../../index";

import { SendModal } from "./modals";


export default function LivestreamView() {
  const meeting = useStreamRoom({
    defaultSortStrategy: ParticipantSortStrategy.ROLE_BASED,
    enableSpeakerEvents: true,
  });

  // State for active speaker
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  // Listen for speaking events
  useEffect(() => {
    const handleSpeakingStarted = (event: any) => {
      setActiveSpeaker(event.participant.identity);
    };

    const handleSpeakingStopped = (event: any) => {
      setTimeout(() => {
        setActiveSpeaker((prev) => {
          if (prev === event.participant.identity) {
            const nextSpeaker = Array.from(meeting.participants.speaking)[0];
            return nextSpeaker || null;
          }
          return prev;
        });
      }, 1000);
    };

    meeting.on("speakingStarted", handleSpeakingStarted);
    meeting.on("speakingStopped", handleSpeakingStopped);

    return () => {
      meeting.off("speakingStarted", handleSpeakingStarted);
      meeting.off("speakingStopped", handleSpeakingStopped);
    };
  }, [meeting]);

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Get participants for livestream layout
  const hostParticipants = useMemo(
    () => meeting.getSortedParticipants({ includeRoles: ["host"] }),
    [meeting]
  );

  const coHostParticipants = useMemo(
    () => meeting.getSortedParticipants({ includeRoles: ["co-host"] }),
    [meeting]
  );

  const tempHostParticipants = useMemo(
    () => meeting.getSortedParticipants({ includeRoles: ["temp-host"] }),
    [meeting]
  );

  // Determine main content and sidebar content
  const screenShareTrack = meeting.tracks.screenShare;
  const screenSharerIdentity = screenShareTrack?.participant?.identity || null;

  const mainContent = useMemo(() => {
    if (screenShareTrack) {
      return screenShareTrack.participant;
    }
    return hostParticipants[0] || null;
  }, [screenShareTrack, hostParticipants]);

  const sidebarContent = useMemo(() => {
    const allEligible = [
      ...hostParticipants,
      ...coHostParticipants,
      ...tempHostParticipants,
    ];

    if (screenShareTrack) {
      // When screen sharing, show all hosts/co-hosts except the screen sharer
      return allEligible.filter((p) => p.identity !== screenSharerIdentity);
    } else {
      // Regular mode - show co-hosts and temp-hosts (up to 3)
      return [...coHostParticipants, ...tempHostParticipants].slice(0, 3);
    }
  }, [
    hostParticipants,
    coHostParticipants,
    tempHostParticipants,
    screenShareTrack,
    screenSharerIdentity,
  ]);

  // Get tracks for a participant
  const getParticipantTrack = useCallback(
    (
      participant: SDKParticipant | null,
      type: "camera" | "screen" = "camera"
    ): SDKTrackReference | null => {
      if (!participant) return null;

      const tracks = meeting.getParticipantTracks(participant.identity);

      if (type === "screen") {
        return (
          tracks.find(
            (t) =>
              t.source === SDKTrackSource.ScreenShare ||
              t.source === "screen_share"
          ) || null
        );
      }

      return (
        tracks.find(
          (t) => t.source === SDKTrackSource.Camera || t.source === "camera"
        ) || null
      );
    },
    [meeting]
  );

  // Get participant metadata helper
  const getParticipantMetadata = useCallback(
    (participant: SDKParticipant) => {
      const metadata = participant.metadata
        ? JSON.parse(participant.metadata)
        : {};

      return {
        userName: metadata.userName || participant.identity,
        avatarUrl: metadata.avatarUrl || "",
        userType:
          metadata.userType || meeting.getParticipantRole(participant.identity),
        initials: (metadata.userName || participant.identity || "")
          .split(" ")
          .map((name: string) => name[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      };
    },
    [meeting]
  );

  const renderParticipant = useCallback(
    (
      participant: SDKParticipant | null,
      track: SDKTrackReference | null,
      size: "large" | "small" | "mobile" = "large"
    ): ReactElement | null => {
      if (!participant || !track) return null;

      const metadata = getParticipantMetadata(participant);
      const isCameraOn = track.publication && !track.publication.isMuted;
      const isMicrophoneOn = meeting
        .getParticipantTracks(participant.identity)
        .some(
          (t) =>
            (t.source === SDKTrackSource.Microphone ||
              t.source === "microphone") &&
            t.publication &&
            !t.publication.isMuted
        );

      const isScreenShare =
        track.source === SDKTrackSource.ScreenShare ||
        track.source === "screen_share";
      const isActive = participant.identity === activeSpeaker;
      const isLocalParticipant =
        participant.identity === meeting.participants.local?.identity;

      const uniqueKey = `${participant.sid}-${track.source}-${size}`;

      // Responsive container classes
      const containerClasses = `relative rounded-lg overflow-hidden bg-purple-900 h-full w-full ${
        isActive ? "ring-2 ring-blue-500" : ""
      }`;

      // Responsive max-height styles
      const getMaxHeightStyle = () => {
        if (size === "mobile") {
          return { maxHeight: "150px" };
        } else if (size === "small") {
          return { maxHeight: isMobile ? "120px" : "200px" };
        } else {
          return {
            maxHeight: isMobile
              ? "50vh"
              : isTablet
              ? "60vh"
              : "calc(100vh - 160px)",
          };
        }
      };

      return (
        <div key={uniqueKey} className={containerClasses}>
          {isScreenShare ? (
            track.publication && !track.publication.isMuted ? (
              <div
                className="relative h-full w-full"
                style={getMaxHeightStyle()}
              >
                <VideoTrack
                  trackRef={track}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {isCameraOn ? (
                <div
                  className="relative w-full h-full"
                  style={getMaxHeightStyle()}
                >
                  <VideoTrack
                    trackRef={track}
                    className="w-full h-full object-cover"
                  />

                  <LivestreamParticipantContent
                    participant={participant}
                    isLocal={isLocalParticipant}
                    isCameraOn={isCameraOn}
                    isMicrophoneOn={isMicrophoneOn}
                    size={size}
                    isMobile={isMobile}
                  />
                </div>
              ) : (
                <LivestreamParticipantContent
                  participant={participant}
                  isLocal={isLocalParticipant}
                  isCameraOn={isCameraOn ?? false}
                  isMicrophoneOn={isMicrophoneOn}
                  size={size}
                  isMobile={isMobile}
                />
              )}
            </div>
          )}

          {track.publication?.track && <AudioTrack trackRef={track} />}

          {/* User type badge */}
          <div
            className={`absolute ${
              isMobile
                ? "top-1 right-1 px-1 py-0.5 text-xs"
                : "top-2 right-2 px-2 py-1 text-xs"
            } rounded-md text-white ${
              metadata.userType === "host"
                ? "bg-purple-700"
                : metadata.userType === "co-host"
                ? "bg-purple-700"
                : metadata.userType === "temp-host"
                ? "bg-purple-700"
                : "bg-purple-700"
            } z-10`}
          >
            {metadata.userType === "host"
              ? "Host"
              : metadata.userType === "co-host"
              ? "Co-Host"
              : metadata.userType === "temp-host"
              ? "Temp-Host"
              : "Guest"}
          </div>
        </div>
      );
    },
    [meeting, activeSpeaker, isMobile, isTablet, getParticipantMetadata]
  );

  // Check if this is window share (special handling)
  const isWindowShare =
    screenShareTrack && !screenShareTrack.publication;

  return (
    <div className={`w-full h-full`}>
      {screenShareTrack ? (
        // SCREEN SHARING LAYOUT
        <div className="h-full flex flex-col lg:flex-row">
          {/* Main content - screen share */}
          <div
            className={`h-full relative ${
              isDesktop && sidebarContent.length > 0 && !isWindowShare
                ? "flex-1"
                : "w-full"
            }`}
          >
            <div className="w-full h-full">
              {mainContent &&
                renderParticipant(
                  mainContent,
                  getParticipantTrack(mainContent, "screen"),
                  "large"
                )}

              {/* Camera view of screen sharer */}
              {screenSharerIdentity && (
                <div
                  className={`absolute z-10 ${
                    isMobile
                      ? "right-2 bottom-2 w-24 h-16"
                      : isTablet
                      ? "left-3 bottom-3 w-48 h-28"
                      : "left-4 bottom-4 w-64 h-36"
                  }`}
                >
                  {(() => {
                    const screenSharer = meeting.participants.all.find(
                      (p) => p.identity === screenSharerIdentity
                    );
                    const cameraTrack = screenSharer
                      ? getParticipantTrack(screenSharer, "camera")
                      : null;
                    return (
                      screenSharer &&
                      cameraTrack &&
                      renderParticipant(
                        screenSharer,
                        cameraTrack,
                        isMobile ? "mobile" : "small"
                      )
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Responsive handling */}
          {sidebarContent.length > 0 && !isWindowShare && (
            <>
              {/* Desktop sidebar */}
              {isDesktop && (
                <div className="w-80 ml-3 h-full">
                  <div className="flex flex-col gap-3 h-full">
                    {sidebarContent.map((participant, index) => {
                      const track = getParticipantTrack(participant, "camera");
                      return (
                        track && (
                          <div key={`sidebar-${index}`} className="h-32">
                            {renderParticipant(participant, track, "small")}
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tablet/Mobile - Horizontal scroll for participants */}
              {!isDesktop && (
                <div className="w-full px-2 py-2 bg-purple-950/50">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {sidebarContent.map((participant, index) => {
                      const track = getParticipantTrack(participant, "camera");
                      return (
                        track && (
                          <div
                            key={`sidebar-${index}`}
                            className={`flex-shrink-0 ${
                              isMobile ? "w-20 h-20" : "w-32 h-24"
                            }`}
                          >
                            {renderParticipant(
                              participant,
                              track,
                              isMobile ? "mobile" : "small"
                            )}
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // REGULAR LAYOUT - NO SCREEN SHARING
        <div className="h-full">
          {/* Main content area */}
          <div className="h-full relative">
            {mainContent ? (
              <div className="h-full w-full">
                {renderParticipant(
                  mainContent,
                  getParticipantTrack(mainContent, "camera"),
                  "large"
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-purple-900 rounded-lg">
                <p className="text-white text-lg">No host present</p>
              </div>
            )}

            {/* Co-hosts overlay */}
            {sidebarContent.length > 0 && (
              <>
                {/* Desktop - overlay in corner */}
                {isDesktop && (
                  <div className="absolute left-4 top-4 w-80 space-y-3 z-10">
                    {sidebarContent.map((participant, index) => {
                      const track = getParticipantTrack(participant, "camera");
                      return (
                        track && (
                          <div key={`sidebar-${index}`} className="h-36">
                            {renderParticipant(participant, track, "small")}
                          </div>
                        )
                      );
                    })}
                  </div>
                )}

                {/* Tablet/Mobile - bottom bar */}
                {!isDesktop && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <div className="flex gap-2 overflow-x-auto">
                      {sidebarContent.map((participant, index) => {
                        const track = getParticipantTrack(
                          participant,
                          "camera"
                        );
                        return (
                          track && (
                            <div
                              key={`sidebar-${index}`}
                              className={`flex-shrink-0 ${
                                isMobile ? "w-20 h-20" : "w-32 h-24"
                              }`}
                            >
                              {renderParticipant(
                                participant,
                                track,
                                isMobile ? "mobile" : "small"
                              )}
                            </div>
                          )
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// LivestreamParticipantContent component
const LivestreamParticipantContent: React.FC<{
  participant: SDKParticipant;
  isLocal: boolean;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  size: "large" | "small" | "mobile";
  isMobile: boolean;
}> = ({ participant, isLocal, isCameraOn, isMicrophoneOn, size, isMobile }) => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

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

  const getAvatarSize = () => {
    if (size === "mobile" || size === "small" || isMobile) {
      return "w-16 h-16";
    }
    return "w-24 h-24";
  };

  const getControlsScale = () => {
    if (size === "mobile") return "scale-50 origin-top-left";
    if (size === "small") return "scale-75 origin-top-left";
    if (isMobile) return "scale-75 origin-top-left";
    return "";
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

          {/* Central avatar */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className={`${getAvatarSize()} rounded-full overflow-hidden`}>
              {participantData.avatarUrl ? (
                <img
                  src={participantData.avatarUrl}
                  alt={participantData.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                  {participantData.initials}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User info - shown on both camera on/off states */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black bg-opacity-30 px-2 py-1 rounded-md z-10">
        <div className="w-6 h-6 rounded-full overflow-hidden">
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
        <span className="text-white text-sm">{participantData.userName}</span>
      </div>

      {/* Controls overlay */}
      <div
        className={`absolute top-2 left-2 flex items-center justify-between inset-x-2 z-10 ${getControlsScale()}`}
      >
        <div className="flex items-center gap-x-2">
          {controls.canGift && (
            <button
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-light"
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
              className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 ${
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

        <div className="flex flex-row items-center gap-x-2">
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