import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useStreamContext } from "../hooks";
import StreamContainer from "./stream-container";

type StreamViewProps = {
  children: React.ReactNode;
};

const StreamView = ({ children }: StreamViewProps) => {
  const {
    token,
    userType,
    audioEnabled: preJoinAudioEnabled,
    videoEnabled: preJoinVideoEnabled,
  } = useStreamContext();
  const canPublish = userType === "host" || userType === "co-host";
  const finalAudioEnabled = canPublish && preJoinAudioEnabled;
  const finalVideoEnabled = canPublish && preJoinVideoEnabled;
  return (
    <>
      <LiveKitRoom
        audio={finalAudioEnabled ?? false}
        video={finalVideoEnabled ?? true}
        token={token}
        serverUrl="wss://streamlink-vtdavgse.livekit.cloud"
        className="relative h-full overflow-x-hidden w-screen flex flex-col"
      >
        <StreamContainer>{children}</StreamContainer>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </>
  );
};

export default StreamView;
